import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHmac } from 'node:crypto';
import { request } from 'node:http';
import { LocalInboundJournal } from './localInboundJournal';
import { MetaWhatsAppCloudProvider } from './metaWhatsAppCloudProvider';
import { startSyntheticWebhookRuntime } from './localWebhookRuntime';
import type { NormalizedProviderEvent } from '../../src/application/messagingReadiness';
const at = '2026-09-30T12:00:00.000Z';
const event: NormalizedProviderEvent = { tenantId: 'demo', accountId: '100', provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', mode: 'SIMULATION', eventId: 'synthetic-event', messageId: 'synthetic-message', occurredAt: at, kind: 'INBOUND', address: '+12025550100', text: 'Olá' };
async function fixture(fn: (j: LocalInboundJournal, path: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'lidacomzap-synthetic-'));
  try { await fn(new LocalInboundJournal(root, 'demo', '100'), root); } finally {
    assert.ok(isAbsolute(root) && root.startsWith(join(tmpdir(), 'lidacomzap-synthetic-')));
    await rm(root, { recursive: true, force: true });
  }
}
test('durable batch replay and restart preserve admission, projection and draft atomically', async () => fixture(async (j, path) => {
  assert.equal((await j.admitBatch([event, event], at)).admitted, 1);
  const work = await j.reserve('worker', at); assert.ok(work);
  await j.process(work.token, at, { content: 'Obrigado!', humanEscalation: 'Fale com atendente.', blocked: false, optedOut: false, consent: 'ALLOWED' });
  const restarted = new LocalInboundJournal(path, 'demo', '100');
  assert.equal((await restarted.admitBatch([event], at)).duplicates, 1);
  const s = await restarted.snapshot(); assert.equal(s.projection.contacts.length, 1); assert.equal(s.projection.messages.length, 1); assert.equal(s.drafts.length, 1); assert.equal(s.drafts[0].canSend, false);
  assert.equal(await restarted.reserve('worker2', at), undefined);
}));
test('expired lease cannot commit after re-reservation; retry bounded with backoff', async () => fixture(async j => {
  await j.admitBatch([event], at); const one = await j.reserve('one', at, 1); assert.ok(one);
  const later = '2026-09-30T12:00:00.002Z'; const two = await j.reserve('two', later); assert.ok(two);
  await assert.rejects(j.process(one.token, later), /STALE_LEASE/);
  await j.fail(two.token, later, true); assert.equal(await j.reserve('three', later), undefined);
  const next = '2026-09-30T12:00:03.000Z'; const three = await j.reserve('three', next); assert.ok(three);
  await j.fail(three.token, next, true); assert.equal((await j.snapshot()).work[0].state, 'FAILED_FINAL');
}));
test('reject real identities/live and keep opted-out automatic reply as no draft', async () => fixture(async j => {
  await assert.rejects(j.admitBatch([{ ...event, mode: 'LIVE' }], at));
  await assert.rejects(j.admitBatch([{ ...event, messageId: 'wamid.real' }], at));
  await assert.rejects(j.admitBatch([{ ...event, address: '+5511999999999' }], at));
  assert.equal((await j.snapshot()).work.length, 0);
  await j.admitBatch([event], at); const work = await j.reserve('w', at); assert.ok(work);
  await j.process(work.token, at, { content: 'Obrigado', humanEscalation: 'Atendente', blocked: false, optedOut: true, consent: 'ALLOWED' });
  assert.equal((await j.snapshot()).drafts.length, 0);
}));
test('invalid item rejects entire admission batch and audit excludes address/content', async () => fixture(async j => {
  await assert.rejects(j.admitBatch([event, { ...event, messageId: 'real-id' }], at));
  assert.equal((await j.snapshot()).work.length, 0);
  await j.admitBatch([event], at);
  const audit = JSON.stringify((await j.snapshot()).audit);
  assert.ok(!audit.includes(event.address!) && !audit.includes(event.text!));
}));
test('receipt stays unbound without inventing outbound message or commercial stage', async () => fixture(async j => {
  await j.admitBatch([{ ...event, kind: 'STATUS', eventId: 'synthetic-message:DELIVERED', status: 'DELIVERED', address: undefined, text: undefined }], at);
  const work = await j.reserve('w', at); assert.ok(work); await j.process(work.token, at);
  const s = await j.snapshot(); assert.equal(s.projection.messages.length, 0); assert.equal(s.audit.at(-1)?.reason, 'UNBOUND_RECEIPT_NOT_APPLIED');
}));
test('loopback ingress verifies before durable admission, dedupes and refuses unsafe runtime', async () => fixture(async j => {
  const config = { tenantId: 'demo', wabaId: '100', phoneNumberId: '200', mode: 'MOCK' as const, appSecretRef: 'fake' };
  const p = new MetaWhatsAppCloudProvider(config, { async resolve() { return 'synthetic-app-secret'; } });
  await assert.rejects(startSyntheticWebhookRuntime(new MetaWhatsAppCloudProvider({ ...config, mode: 'STAGING' }), j, 0));
  const server = await startSyntheticWebhookRuntime(p, j, 0);
  try {
    const address = server.address(); assert.ok(address && typeof address === 'object'); assert.equal(address.address, '127.0.0.1');
    const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '100', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '200' }, messages: [{ id: 'synthetic-message', from: '12025550100', timestamp: String(Date.parse(at) / 1000), type: 'text', text: { body: 'Olá' } }] } }] }] });
    const signature = `sha256=${createHmac('sha256', 'synthetic-app-secret').update(raw).digest('hex')}`;
    const post = (sig: string, path = '/webhooks/meta', body = raw) => new Promise<number>((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: address.port, path, method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode!)); }); req.on('error', reject); req.end(body);
    });
    assert.equal(await post('sha256=wrong'), 403); assert.equal((await j.snapshot()).work.length, 0);
    assert.equal(await post(signature), 200); assert.equal(await post(signature), 200); assert.equal((await j.snapshot()).work.length, 1);
    assert.equal(await post(signature, '/api/send'), 404);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}));
