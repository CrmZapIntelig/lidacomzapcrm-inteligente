import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareOutboundCanary } from './outboundCanaryPreparation';
import type { CanaryPreparationInput } from './outboundCanaryPreparation';
import { createContactChannelIdentity, createProviderCapabilities } from '../domain/offlinePrimitives';
import { projectProviderReceipt } from './providerReceiptProjection';
import type { ProviderReceiptState } from './providerReceiptProjection';
import type { NormalizedProviderEvent } from './messagingReadiness';
const now = '2026-09-30T12:00:00Z';
const base: CanaryPreparationInput = {
  tenantId: 'demo', campaignId: 'd1', entryId: 'e1', contactId: 'c1', identityId: 'i1', recipient: '+12025550100', now, minimumIntervalMs: 0,
  eligibility: { tenantId: 'demo', contactId: 'c1', phone: '+12025550100', blocked: false, optedOut: false, group: false, consent: 'ALLOWED', preferredChannel: 'ANY', alreadyPrepared: false, templateApprovedForOffline: true, identity: createContactChannelIdentity({ id: 'i1', tenantId: 'demo', contactId: 'c1', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', address: '+12025550100', availability: 'KNOWN_AVAILABLE', availabilitySource: 'PROVIDER_EVENT', eligibility: 'ELIGIBLE', eligibilitySource: 'PROVIDER', createdAt: new Date(now), updatedAt: new Date(now) }), capability: createProviderCapabilities({ channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', capabilities: ['TEXT'], source: 'PROVIDER_EVENT', observedAt: new Date(now) }) },
  policy: { tenantId: 'demo', contactId: 'c1', mode: 'STAGING', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', purpose: 'SERVICE_REPLY', messageType: 'TEXT', blocked: false, optedOut: false, consent: 'ALLOWED', inboundEvidence: 'PROVIDER', lastInboundAt: now, now },
  allowlist: [{ tenantId: 'demo', contactId: 'c1', identityId: 'i1', address: '+12025550100', designation: 'TEST', provider: 'WHATSAPP_META_OFFICIAL', configuredAt: now }], audience: [{ contactId: 'c1', designation: 'TEST' }], readiness: { stagingVerified: true, credentialSecure: true, providerConfigured: true, webhookValidated: true, durableStoreValidated: true, protocolVerified: true }, maxRecipients: 1, maxMessages: 1, previousAttempts: 0, sourceMode: 'STAGING',
};
test('canary plan never sends even with all evidence; missing readiness blocks review', () => {
  assert.equal(prepareOutboundCanary(base).readyForReview, true); assert.equal(prepareOutboundCanary(base).canSend, false);
  for (const key of Object.keys(base.readiness) as (keyof typeof base.readiness)[]) assert.equal(prepareOutboundCanary({ ...base, readiness: { ...base.readiness, [key]: false } }).readyForReview, false);
});
test('no allowlist, real audience, replay, simulation promotion, opt-out and fake capability block', () => {
  const variants: Partial<CanaryPreparationInput>[] = [{ allowlist: [] }, { audience: [{ contactId: 'c1', designation: 'CUSTOMER' }] }, { maxMessages: 2 }, { previousAttempts: 1 }, { sourceMode: 'SIMULATION' }, { eligibility: { ...base.eligibility, optedOut: true } }, { eligibility: { ...base.eligibility, capability: { ...base.eligibility.capability!, source: 'MANUAL' } } }];
  variants.forEach(p => assert.equal(prepareOutboundCanary({ ...base, ...p }).readyForReview, false));
});
const receipt: ProviderReceiptState = { binding: { tenantId: 'demo', accountId: '100', provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', mode: 'SIMULATION', providerMessageId: 'synthetic-outbound', dispatchEntryId: 'e1', contactId: 'c1', conversationId: 'v1', recipient: '+12025550100', acceptedAt: now }, events: [] };
const event: NormalizedProviderEvent = { tenantId: 'demo', accountId: '100', provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', mode: 'SIMULATION', eventId: 'synthetic-read', messageId: 'synthetic-outbound', kind: 'STATUS', status: 'READ', occurredAt: now };
test('receipt facts preserve out-of-order events, replay once and never infer sent/delivery', () => {
  const read = projectProviderReceipt(receipt, event); assert.equal(read.events.length, 1); assert.equal(read.events[0].kind, 'READ');
  assert.equal(projectProviderReceipt(read, event).events.length, 1);
  const sent = projectProviderReceipt(read, { ...event, eventId: 'synthetic-sent', status: 'SENT' }); assert.equal(sent.events.length, 2); assert.equal(sent.events.some(v => v.kind === 'DELIVERED'), false);
  assert.throws(() => projectProviderReceipt(read, { ...event, status: 'DELIVERED' }), /COLLISION/);
  assert.throws(() => projectProviderReceipt(read, { ...event, mode: 'LIVE' }), /CONTEXT/);
});
test('reply requires explicit provider context and identity, never inferred by contact alone', () => {
  const reply = { ...event, kind: 'INBOUND' as const, status: undefined, eventId: 'synthetic-reply', messageId: 'synthetic-inbound', text: 'Sim', address: '+12025550100', inReplyToMessageId: 'synthetic-outbound' };
  assert.equal(projectProviderReceipt(receipt, reply).events[0].kind, 'REPLIED');
  assert.throws(() => projectProviderReceipt(receipt, { ...reply, inReplyToMessageId: undefined }), /CORRELATED/);
});
