import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MetaWhatsAppCloudProvider, classifyMetaResponse, classifyTransportFailure } from './metaWhatsAppCloudProvider';
import type { MetaConfiguration } from './metaWhatsAppCloudProvider';
import type { OutboundRequest } from '../../src/application/messagingReadiness';
export const configuration: MetaConfiguration = { tenantId: 'demo', wabaId: '100', phoneNumberId: '200', mode: 'MOCK', appSecretRef: 'fake-app', verifyTokenRef: 'fake-verify' };
export const fakeSecrets = { async resolve(_tenant: string, ref: string) { return ref === 'fake-app' ? 'synthetic-app-secret' : ref === 'fake-verify' ? 'synthetic-verify-token' : undefined; } };
export function rawFixture(messages = true) {
  return Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '100', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '200' }, ...(messages ? { messages: [{ id: 'synthetic-message', from: '12025550100', timestamp: '1790769600', type: 'text', text: { body: 'Olá' } }] } : { statuses: [{ id: 'synthetic-message', timestamp: '1790769600', status: 'delivered' }] }) } }] }] }));
}
const request: OutboundRequest = { tenantId: 'demo', contactId: 'c1', entryId: 'e1', idempotencyKey: 'k1', recipient: '+12025550100', text: 'Olá', policy: { tenantId: 'demo', contactId: 'c1', mode: 'SIMULATION', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', purpose: 'SERVICE_REPLY', messageType: 'TEXT', blocked: false, optedOut: false, consent: 'ALLOWED', now: '2026-09-30T12:00:00Z', lastInboundAt: '2026-09-30T11:00:00Z', inboundEvidence: 'SIMULATION' } };
test('default disabled never resolves credentials; mock has no transport and cannot fabricate live', async () => {
  const disabled = new MetaWhatsAppCloudProvider({ ...configuration, mode: undefined }, { async resolve() { throw new Error('must not resolve'); } });
  assert.equal((await disabled.sendText(request)).outcome, 'DISABLED');
  const mock = new MetaWhatsAppCloudProvider(configuration);
  assert.equal((await mock.sendText(request)).outcome, 'MOCK'); assert.equal((await mock.sendText(request)).providerMessageId, undefined);
  assert.equal((await mock.sendText({ ...request, policy: { ...request.policy, mode: 'LIVE' } })).outcome, 'BLOCKED');
});
test('missing credential and first-send gate block staging even with valid policy', async () => {
  const req = { ...request, policy: { ...request.policy, mode: 'STAGING' as const, inboundEvidence: 'PROVIDER' as const } };
  assert.equal((await new MetaWhatsAppCloudProvider({ ...configuration, mode: 'STAGING' }).sendText(req)).reason, 'MISSING_CREDENTIAL');
  const configured = new MetaWhatsAppCloudProvider({ ...configuration, mode: 'STAGING', credentialRef: 'fake' }, { async resolve() { return 'synthetic-token'; } });
  assert.equal((await configured.sendText(req)).reason, 'GATE_OUTBOUND_CANARY_REQUIRED');
});
test('text and template serialize only scoped approved payloads', () => {
  const provider = new MetaWhatsAppCloudProvider(configuration);
  assert.deepEqual(provider.serializeText(request), { messaging_product: 'whatsapp', recipient_type: 'individual', to: '12025550100', type: 'text', text: { preview_url: false, body: 'Olá' } });
  const req = { ...request, policy: { ...request.policy, messageType: 'TEMPLATE' as const, template: { tenantId: 'demo', templateId: 't1', channel: 'WHATSAPP' as const, provider: 'WHATSAPP_META_OFFICIAL' as const, providerTemplateName: 'example_offer', language: 'pt_BR', category: 'MARKETING' as const, status: 'APPROVED' as const, variables: ['name'], evidence: 'SIMULATION' as const, observedAt: request.policy.now }, variables: ['Ana'] } };
  assert.equal(provider.serializeTemplate(req).template.components[0].parameters[0].text, 'Ana');
  assert.throws(() => provider.serializeText({ ...request, policy: { ...request.policy, optedOut: true } }));
  assert.throws(() => provider.serializeTemplate({ ...req, policy: { ...req.policy, template: { ...req.policy.template, status: 'PAUSED' } } }));
});
test('raw signature and challenge reject wrong bytes, tenant, malformed signature and missing secrets', async () => {
  const p = new MetaWhatsAppCloudProvider(configuration, fakeSecrets), raw = rawFixture();
  const signature = `sha256=${createHmac('sha256', 'synthetic-app-secret').update(raw).digest('hex')}`;
  assert.equal(await p.verifyWebhook(raw, signature, 'demo'), true);
  assert.equal(await p.verifyWebhook(Buffer.concat([raw, Buffer.from(' ')]), signature, 'demo'), false);
  assert.equal(await p.verifyWebhook(raw, signature, 'other'), false);
  assert.equal(await p.verifyWebhook(raw, 'sha256=wrong', 'demo'), false);
  assert.equal(await new MetaWhatsAppCloudProvider(configuration).verifyWebhook(raw, signature, 'demo'), false);
  assert.equal(await p.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'synthetic-verify-token', 'hub.challenge': '123' }, 'demo'), '123');
  assert.equal(await p.verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '123' }, 'demo'), undefined);
});
test('normalize inbound and real status fields without manufacturing delivery or tenant binding', () => {
  const p = new MetaWhatsAppCloudProvider(configuration);
  assert.equal(p.parseWebhook(rawFixture(), 'demo', 'SIMULATION')[0].address, '+12025550100');
  assert.equal(p.parseWebhook(rawFixture(false), 'demo', 'SIMULATION')[0].status, 'DELIVERED');
  assert.throws(() => p.parseWebhook(Buffer.from('{bad'), 'demo', 'SIMULATION'));
  assert.throws(() => p.parseWebhook(Buffer.from(rawFixture().toString().replace('"200"', '"999"')), 'demo', 'SIMULATION'));
  assert.throws(() => p.parseWebhook(rawFixture(), 'demo', 'LIVE'));
  assert.throws(() => p.normalizeStatus('unknown'));
});
test('safe error results distinguish rate limit, final and uncertain/timeout without provider bodies', () => {
  assert.equal(classifyMetaResponse(429, { token: 'synthetic' }, 'STAGING').outcome, 'RETRYABLE_FAILURE');
  assert.equal(classifyMetaResponse(401, {}, 'STAGING').outcome, 'FINAL_FAILURE');
  assert.equal(classifyMetaResponse(500, {}, 'STAGING').outcome, 'UNCERTAIN');
  assert.equal(classifyTransportFailure('STAGING').outcome, 'UNCERTAIN');
  assert.equal(classifyMetaResponse(200, {}, 'STAGING').outcome, 'UNCERTAIN');
  assert.equal(classifyMetaResponse(200, { messages: [{ id: 'synthetic-id' }] }, 'STAGING').reason, 'API_ACCEPTED_NOT_DELIVERED');
});
