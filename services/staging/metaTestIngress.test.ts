import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MetaWhatsAppCloudProvider } from '../messaging/metaWhatsAppCloudProvider';
import { LocalInboundJournal } from '../messaging/localInboundJournal';
import { StagingMetaTestJournal, createMetaTestReceiver, runMetaTestWorker, metaVerificationAudit, metaVerificationQuery, metaTestBinding as b } from './metaTestIngress';
import type { AtomicJsonPort } from './durableInboundJournal';
const at = '2026-10-07T20:00:00.000Z';
const publicFixtureSecret = 'TEST-public-fixture-HMAC';
class MemoryAtomic implements AtomicJsonPort {
  value?: string; calls = 0; failure = false;
  async transaction<T>(fn: (v: string | undefined) => { value: string; result: T }) { this.calls++; if (this.failure) throw Error('provider raw secret data'); const next = fn(this.value); this.value = next.value; return next.result; }
}
function setup() {
  const port = new MemoryAtomic(), journal = new StagingMetaTestJournal(port, { appEnv: 'staging', projectId: b.projectId, metaMode: 'TEST' });
  const validation = new MetaWhatsAppCloudProvider({ mode: 'STAGING', tenantId: b.tenantId, wabaId: b.wabaId, phoneNumberId: b.phoneNumberId, appSecretRef: 'TEST-hmac', verifyTokenRef: 'TEST-verify' }, { async resolve(_, ref) { return ref === 'TEST-hmac' ? publicFixtureSecret : 'TEST-public-fixture-challenge'; } });
  return { port, journal, validation, receiver: createMetaTestReceiver(validation, journal, () => at) };
}
function payload(from = '12025550100', id = 'wamid.TEST-example') { return { object: 'whatsapp_business_account', entry: [{ id: String(b.wabaId), changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: String(b.phoneNumberId) }, messages: [{ from, id, timestamp: String(Date.parse(at) / 1000), type: 'text', text: { body: 'TEST inbound staging' } }] } }] }] }; }
function post(value: unknown) { const raw = Buffer.from(JSON.stringify(value)); return { method: 'POST', path: '/webhooks/meta', contentType: 'application/json', raw, signature: 'sha256=' + createHmac('sha256', publicFixtureSecret).update(raw).digest('hex') }; }

test('staging TEST signature admission, replay, restart projection and draft reuse the original journal engine', async () => {
  const { journal, receiver, port } = setup(), request = post(payload());
  assert.equal((await receiver(request)).status, 200); assert.equal((await receiver(request)).status, 200);
  const restarted = new StagingMetaTestJournal(port, { appEnv: 'staging', projectId: b.projectId, metaMode: 'TEST' });
  assert.equal((await runMetaTestWorker(restarted, at)).canSend, false);
  const snapshot = await restarted.snapshot();
  assert.equal(snapshot.work.length, 1); assert.equal(snapshot.projection.mode, 'STAGING'); assert.equal(snapshot.projection.messages.length, 1);
  assert.equal(snapshot.projection.timeline.length, 1); assert.equal(snapshot.drafts.length, 1); assert.equal(snapshot.drafts[0].canSend, false); assert.equal(snapshot.drafts[0].state, 'DRAFT');
  assert.equal((await runMetaTestWorker(journal, at)).state, 'NO_WORK');
  assert.ok(!JSON.stringify(snapshot.audit).includes('12025550100')); assert.ok(!JSON.stringify(snapshot.audit).includes('TEST inbound staging'));
});
test('verification challenge never admits work; wrong token rejected and worker path is absent', async () => {
  const { receiver, port } = setup(); const request = { method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query: { 'hub.mode': 'subscribe', 'hub.challenge': '1234', 'hub.verify_token': 'TEST-public-fixture-challenge' } };
  assert.deepEqual(await receiver(request), { status: 200, body: '1234' });
  request.query['hub.verify_token'] = 'TEST-wrong'; assert.equal((await receiver(request)).status, 403);
  assert.equal((await receiver({ ...request, path: '/worker' })).status, 404); assert.equal(port.calls, 0);
});
test('HTTP verification ignores unrelated query fields while preserving the exact challenge and token checks', async () => {
  const { receiver, port } = setup();
  const input = { 'hub.mode': 'subscribe', 'hub.challenge': '0001234', 'hub.verify_token': 'TEST-public-fixture-challenge', unrelated: ['TEST-ignored'], another: { secret: 'TEST-ignored' } };
  const query = metaVerificationQuery(input); assert.ok(query);
  assert.deepEqual(Object.keys(query), ['hub.mode', 'hub.verify_token', 'hub.challenge']);
  assert.deepEqual(await receiver({ method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query }), { status: 200, body: '0001234' });
  query['hub.verify_token'] = 'TEST-wrong';
  assert.equal((await receiver({ method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query })).status, 403);
  assert.equal(port.calls, 0);
});
test('HTTP verification rejects ambiguous contract fields and never invents missing verification inputs', async () => {
  for (const key of ['hub.mode', 'hub.verify_token', 'hub.challenge']) {
    for (const value of [['TEST-duplicate', 'TEST-duplicate'], { nested: 'TEST' }, null]) assert.equal(metaVerificationQuery({ [key]: value }), undefined);
  }
  const { receiver, port } = setup();
  assert.equal((await receiver({ method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query: metaVerificationQuery({ unrelated: 'TEST' }) })).status, 403);
  assert.equal(port.calls, 0);
});
test('verification diagnostics cannot include request values, secret material, challenge, URLs or injected fields', () => {
  const request = { method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query: { 'hub.mode': 'subscribe', 'hub.challenge': '987654321', 'hub.verify_token': 'TEST-sensitive-placeholder', 'injected-secret-key': 'TEST-sensitive-placeholder' } };
  const audit = metaVerificationAudit(request, 400, true, false);
  assert.equal(audit.reason, 'QUERY_REJECTED');
  assert.deepEqual(Object.keys(audit).sort(), ['httpStatus', 'reason', 'pathAllowed', 'queryAllowed', 'modeValid', 'challengeValid', 'tokenPresent', 'tokenAvailable', 'tokenMatches'].sort());
  for (const value of ['987654321', 'TEST-sensitive-placeholder', 'injected-secret-key', '/webhooks/meta']) assert.ok(!JSON.stringify(audit).includes(value));
});
test('verification diagnostics distinguish unavailable binding, mismatch and successful verification without changing admission', () => {
  const request = { method: 'GET', path: '/webhooks/meta', raw: new Uint8Array(), query: { 'hub.mode': 'subscribe', 'hub.challenge': '1', 'hub.verify_token': 'TEST-placeholder' } };
  assert.equal(metaVerificationAudit(request, 403, false, false).reason, 'TOKEN_UNAVAILABLE');
  assert.equal(metaVerificationAudit(request, 403, true, false).reason, 'TOKEN_MISMATCH');
  assert.equal(metaVerificationAudit(request, 200, true, true).reason, 'VERIFIED');
  assert.equal(metaVerificationAudit({ ...request, query: { ...request.query, 'hub.challenge': 'invalid' } }, 403, true, true).reason, 'CHALLENGE_REJECTED');
});
for (const variant of ['missing-signature', 'wrong-signature', 'malformed', 'oversized', 'wrong-waba', 'wrong-phone', 'unsupported-event', 'unlisted-sender', 'wrong-text', 'mixed-batch', 'too-many', 'wrong-content-type'] as const) {
  test(`Meta TEST rejects ${variant} without partial persistence`, async () => {
    const { receiver, port } = setup(), body = payload(); let request = post(body), expected = 400;
    if (variant === 'missing-signature') { request.signature = ''; expected = 403; }
    if (variant === 'wrong-signature') { request.signature = 'sha256=' + '0'.repeat(64); expected = 403; }
    if (variant === 'malformed') { request.raw = Buffer.from('{'); request.signature = 'sha256=' + createHmac('sha256', publicFixtureSecret).update(request.raw).digest('hex'); }
    if (variant === 'oversized') { request.raw = Buffer.alloc(65537); expected = 413; }
    if (variant === 'wrong-waba') { body.entry[0].id = '999'; request = post(body); }
    if (variant === 'wrong-phone') { body.entry[0].changes[0].value.metadata.phone_number_id = '999'; request = post(body); }
    if (variant === 'unsupported-event') { body.entry[0].changes[0].field = 'other'; request = post(body); }
    if (variant === 'unlisted-sender') request = post(payload('12025550109', 'wamid.other'));
    if (variant === 'wrong-text') { body.entry[0].changes[0].value.messages[0].text.body = 'other'; request = post(body); }
    if (variant === 'mixed-batch') { body.entry[0].changes[0].value.messages.push(payload('12025550109', 'wamid.other').entry[0].changes[0].value.messages[0]); request = post(body); }
    if (variant === 'too-many') { body.entry[0].changes[0].value.messages = Array.from({ length: 11 }, (_, i) => payload('12025550100', `wamid.TEST-${i}`).entry[0].changes[0].value.messages[0]); request = post(body); expected = 413; }
    if (variant === 'wrong-content-type') { request.contentType = 'text/plain'; expected = 415; }
    assert.equal((await receiver(request)).status, expected); assert.equal(port.value, undefined);
  });
}
test('ACK requires durable commit; failure sanitised, then crash recovery/lease fencing and retry remain shared', async () => {
  const { receiver, journal, port } = setup(); port.failure = true;
  assert.deepEqual(await receiver(post(payload())), { status: 503, body: '' }); port.failure = false;
  await receiver(post(payload())); const old = await journal.reserve('TEST-old', at, 1); assert.ok(old);
  const later = '2026-10-07T20:00:00.002Z', current = await journal.reserve('TEST-new', later); assert.ok(current);
  await assert.rejects(journal.process(old.token, later), /STALE_LEASE/);
  await journal.fail(current.token, later, true); assert.equal(await journal.reserve('TEST-early', later), undefined);
  const last = await journal.reserve('TEST-last', '2026-10-07T20:00:03.000Z'); assert.ok(last);
  await journal.fail(last.token, '2026-10-07T20:00:03.000Z', true); assert.equal((await journal.snapshot()).work[0].state, 'FAILED_FINAL');
});
test('environment and modes fail closed; local journal never accepts STAGING or real Meta envelope', async () => {
  const { port, validation, journal } = setup();
  for (const env of [{ appEnv: 'production', projectId: b.projectId, metaMode: 'TEST' }, { appEnv: 'staging', projectId: 'project-1300957a-ea82-4645-845', metaMode: 'TEST' }, { appEnv: 'staging', projectId: 'lidacomzapcrm', metaMode: 'TEST' }, { appEnv: 'staging', projectId: b.projectId, metaMode: 'LIVE' }]) assert.throws(() => new StagingMetaTestJournal(port, env));
  const event = validation.parseWebhook(post(payload()).raw, b.tenantId, 'STAGING')[0];
  await assert.rejects(new LocalInboundJournal('.', b.tenantId, b.wabaId).admitBatch([event], at), /SYNTHETIC_EVENT_REQUIRED/);
  await assert.rejects(journal.admitBatch([{ ...event, mode: 'LIVE' }], at), /META_TEST_EVENT_REQUIRED/); assert.equal(port.value, undefined);
});
