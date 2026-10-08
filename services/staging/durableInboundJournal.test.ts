import test from 'node:test';
import assert from 'node:assert/strict';
import { StagingDurableInboundJournal } from './durableInboundJournal';
import { FirestoreAtomicJsonPort, FirestoreRequestError } from './firestoreAtomicPort';
import type { FirestoreRequestPort } from './firestoreAtomicPort';
import { StagingFirestoreHttp } from './firestoreHttp';
import type { NormalizedProviderEvent } from '../../src/application/messagingReadiness';
const at = '2026-10-02T12:00:00.000Z';
const event: NormalizedProviderEvent = { tenantId: 'demo-staging-test', accountId: '100', provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', mode: 'SIMULATION', eventId: 'synthetic-TEST-event', messageId: 'synthetic-TEST-message', occurredAt: at, kind: 'INBOUND', address: '+12025550100', text: 'Mensagem TEST sintética' };
class TransactionFixture implements FirestoreRequestPort {
  value?: string; revision = 0; serial = 0; aborts = 0;
  transactions = new Map<string, { value?: string; revision: number }>();
  async request<T>(path: string, method: string, body?: unknown): Promise<T | undefined> {
    const input = body as { transaction: string; writes: { update: { fields: { payload: { stringValue: string } } } }[] };
    if (path.endsWith(':beginTransaction')) { const transaction = `t${++this.serial}`; this.transactions.set(transaction, { value: this.value, revision: this.revision }); return { transaction } as T; }
    if (method === 'GET') { const t = this.transactions.get(new URL(`https://fixture.invalid/${path}`).searchParams.get('transaction')!)!; return t.value === undefined ? undefined : { fields: { payload: { stringValue: t.value } } } as T; }
    if (path.endsWith(':rollback')) { this.transactions.delete(input.transaction); return {} as T; }
    const tx = this.transactions.get(input.transaction)!;
    if (tx.revision !== this.revision) { this.aborts++; throw new FirestoreRequestError(409); }
    this.value = input.writes[0].update.fields.payload.stringValue; this.revision++; this.transactions.delete(input.transaction); return {} as T;
  }
}
const journal = (http: TransactionFixture) => new StagingDurableInboundJournal(new FirestoreAtomicJsonPort(http, event.tenantId, event.accountId), event.tenantId, event.accountId);

test('distributed contention retries admission atomically; restart dedupes without a second projection or draft', async () => {
  const http = new TransactionFixture(), one = journal(http), two = journal(http);
  const admitted = await Promise.all([one.admitBatch([event], at), two.admitBatch([event], at)]);
  assert.equal(admitted.reduce((sum, r) => sum + r.admitted, 0), 1); assert.ok(http.aborts > 0);
  const work = await two.reserve('TEST-worker', at); assert.ok(work);
  await two.process(work.token, at, { content: 'Resposta TEST', humanEscalation: 'Atendente TEST', blocked: false, optedOut: false, consent: 'ALLOWED' });
  const restarted = journal(http); assert.equal((await restarted.admitBatch([event], at)).duplicates, 1);
  const snapshot = await restarted.snapshot(); assert.equal(snapshot.projection.messages.length, 1); assert.equal(snapshot.drafts.length, 1); assert.equal(snapshot.drafts[0].canSend, false);
  assert.ok(snapshot.projection.messages[0].createdAt instanceof Date); assert.equal(await restarted.reserve('TEST-next', at), undefined);
});
test('crash recovery reclaims expired lease and fences former owner; backoff and final failure remain bounded', async () => {
  const http = new TransactionFixture(), first = journal(http); await first.admitBatch([event], at);
  const old = await first.reserve('TEST-crashed', at, 1); assert.ok(old);
  const later = '2026-10-02T12:00:00.002Z', restarted = journal(http), current = await restarted.reserve('TEST-recovered', later); assert.ok(current);
  await assert.rejects(first.process(old.token, later), /STALE_LEASE/);
  await restarted.fail(current.token, later, true); assert.equal(await restarted.reserve('TEST-too-early', later), undefined);
  const retry = await journal(http).reserve('TEST-last', '2026-10-02T12:00:03.000Z'); assert.ok(retry);
  await restarted.fail(retry.token, '2026-10-02T12:00:03.000Z', true);
  assert.equal((await restarted.snapshot()).work[0].state, 'FAILED_FINAL');
});
test('real data/mode/batch mismatch rejected before admission; sanitised audit and unbound receipt do not invent facts', async () => {
  const http = new TransactionFixture(), store = journal(http);
  await assert.rejects(store.admitBatch([event, { ...event, messageId: 'wamid.real' }], at)); assert.equal(http.value, undefined);
  await assert.rejects(store.admitBatch([{ ...event, mode: 'LIVE' }], at));
  await store.admitBatch([event], at); const audit = JSON.stringify((await store.snapshot()).audit); assert.ok(!audit.includes(event.address!) && !audit.includes(event.text!));
  await store.admitBatch([{ ...event, kind: 'STATUS', status: 'READ', eventId: 'synthetic-TEST-read', address: undefined, text: undefined }], at);
  const work = await store.reserve('TEST-worker', at); assert.ok(work); await store.process(work.token, at);
  const receipt = await store.reserve('TEST-worker', at); assert.ok(receipt); await store.process(receipt.token, at);
  const state = await store.snapshot(); assert.equal(state.projection.messages.length, 1); assert.equal(state.drafts.length, 0); assert.ok(state.audit.some(a => a.reason === 'UNBOUND_RECEIPT_NOT_APPLIED'));
});
test('capacity failure rolls back; invalid cloud snapshot cannot silently reset persisted work', async () => {
  const http = new TransactionFixture(), store = journal(http);
  await assert.rejects(store.admitBatch(Array.from({ length: 201 }, (_, i) => ({ ...event, messageId: `synthetic-TEST-${i}`, eventId: `synthetic-TEST-event-${i}` })), at), /STAGING_FIXTURE_CAPACITY/); assert.equal(http.value, undefined);
  http.value = '{}'; await assert.rejects(store.snapshot(), /JOURNAL_CONTEXT_MISMATCH/); assert.equal(http.value, '{}');
});
test('staging HTTP rejects operational project/path/write before resolving credentials; no fallback or backend in React', async () => {
  let resolutions = 0; const resolver = async () => { resolutions++; return 'synthetic-token'; };
  assert.throws(() => new StagingFirestoreHttp({ appEnv: 'staging', projectId: 'project-1300957a-ea82-4645-845' }, resolver), /ISOLATED_STAGING_REQUIRED/);
  const http = new StagingFirestoreHttp({ appEnv: 'staging', projectId: 'lidacomzapcrm-staging' }, resolver);
  await assert.rejects(http.request('projects/operational/databases/(default)/documents:commit', 'POST'), /STAGING_PATH_FORBIDDEN/);
  await assert.rejects(http.request('projects/lidacomzapcrm-staging/databases/(default)/documents:commit', 'POST', { writes: [{ update: { name: 'projects/operational/documents/real' } }] }), /STAGING_WRITE_FORBIDDEN/);
  assert.equal(resolutions, 0);
});
test('HTTP boundary preserves missing document and sanitises provider errors without logging response bodies', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return calls === 1 ? new Response('{}', { status: 404 }) : new Response('secret-provider-error', { status: 403 }); });
  const http = new StagingFirestoreHttp({ appEnv: 'staging', projectId: 'lidacomzapcrm-staging' }, async () => 'synthetic-token');
  const path = `projects/lidacomzapcrm-staging/databases/(default)/documents/stg_inbound_synthetic/${'a'.repeat(64)}?transaction=t1`;
  assert.equal(await http.request(path, 'GET', undefined, true), undefined);
  await assert.rejects(http.request(path, 'GET'), error => error instanceof FirestoreRequestError && error.message === 'STAGING_FIRESTORE_HTTP_403');
});
test('uncertain commit acknowledgement does not retry blindly; replay recovers already committed admission', async t => {
  const http = new TransactionFixture(), original = http.request.bind(http); let uncertain = true;
  t.mock.method(http, 'request', async (path: string, method: string, body?: unknown) => {
    const result = await original(path, method, body);
    if (path.endsWith(':commit') && uncertain) { uncertain = false; throw new FirestoreRequestError(500); }
    return result;
  });
  await assert.rejects(journal(http).admitBatch([event], at), /HTTP_500/);
  assert.equal((await journal(http).admitBatch([event], at)).duplicates, 1);
  assert.equal((await journal(http).snapshot()).work.length, 1);
});
test('two competing workers claim one lease; permanent transaction conflict exhausts bounded retries', async () => {
  const http = new TransactionFixture(); await journal(http).admitBatch([event], at);
  const claims = await Promise.all([journal(http).reserve('TEST-one', at), journal(http).reserve('TEST-two', at)]);
  assert.equal(claims.filter(Boolean).length, 1);
  let attempts = 0;
  const unavailable: FirestoreRequestPort = { async request<T>() { attempts++; throw new FirestoreRequestError(409); } };
  await assert.rejects(new FirestoreAtomicJsonPort(unavailable, event.tenantId, event.accountId).transaction(() => ({ value: '{}', result: false })), /HTTP_409/);
  assert.equal(attempts, 5);
});
