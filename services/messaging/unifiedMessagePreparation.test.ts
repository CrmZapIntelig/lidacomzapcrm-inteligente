import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareUnifiedMessage } from './unifiedMessagePreparation';
import type { UnifiedMessagePreparationInput } from './unifiedMessagePreparation';
import { MetaWhatsAppCloudProvider } from './metaWhatsAppCloudProvider';
import { EvolutionWhatsAppProvider } from './evolutionWhatsAppProvider';
import { RcsChannelProvider } from './rcsChannelProvider';
import { createContactChannelIdentity, createProviderCapabilities } from '../../src/domain/offlinePrimitives';
import type { ChannelProvider } from '../../src/domain/omnichannel';
const at = '2026-10-09T12:00:00Z', tenantId = 'demo-TEST', contactId = 'contact-TEST', recipient = '+12025550100';
const kinds: ChannelProvider[] = ['WHATSAPP_META_OFFICIAL', 'WHATSAPP_EVOLUTION_OPTIONAL', 'RCS_GOOGLE'];
function fixture(provider: ChannelProvider): UnifiedMessagePreparationInput {
  const channel = provider === 'RCS_GOOGLE' ? 'RCS' : 'WHATSAPP';
  return { provider, previousOutcome: 'NONE', eligibilityPolicy: { tenantId, minimumIntervalMs: 0, evaluatedAt: new Date(at) },
    request: { tenantId, contactId, recipient, entryId: 'entry-TEST', idempotencyKey: 'key-TEST', text: 'TEST local',
      policy: { tenantId, contactId, provider, channel, mode: 'SIMULATION', purpose: 'SERVICE_REPLY', messageType: 'TEXT', blocked: false, optedOut: false, consent: 'ALLOWED', lastInboundAt: at, inboundEvidence: 'SIMULATION', now: at } },
    eligibility: { tenantId, contactId, phone: recipient, blocked: false, optedOut: false, group: false, consent: 'ALLOWED', preferredChannel: 'ANY', alreadyPrepared: false, templateApprovedForOffline: true,
      identity: createContactChannelIdentity({ id: 'identity-TEST', tenantId, contactId, channel, provider, address: recipient, availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: new Date(at), updatedAt: new Date(at) }),
      capability: createProviderCapabilities({ channel, provider, capabilities: ['TEXT'], source: 'MANUAL', observedAt: new Date(at) }) },
    rcsCapability: { tenantId, agentId: 'TEST-agent', recipient, mode: 'SIMULATION', availability: 'KNOWN_AVAILABLE', features: [], source: 'FIXTURE', observedAt: at } };
}
function providers() { return {
  meta: new MetaWhatsAppCloudProvider({ tenantId, wabaId: '100', phoneNumberId: '200', mode: 'MOCK' }),
  evolution: new EvolutionWhatsAppProvider({ tenantId, instanceName: 'TEST-instance', mode: 'MOCK' }),
  rcs: new RcsChannelProvider({ tenantId, agentId: 'TEST-agent', mode: 'MOCK' }),
}; }
test('one CRM preparation produces one local draft for each explicitly selected provider', () => {
  for (const kind of kinds) {
    const result = prepareUnifiedMessage(fixture(kind), providers());
    assert.equal(result.state, 'DRAFT'); assert.equal(result.provider, kind); assert.equal(result.canSend, false);
    assert.equal(result.mode, 'SIMULATION'); assert.ok('payload' in result);
  }
});
test('accepted, uncertain and previous failures never trigger a duplicate or automatic fallback', () => {
  for (const kind of kinds) for (const previousOutcome of ['ACCEPTED', 'UNCERTAIN', 'FINAL_FAILURE'] as const) {
    const result = prepareUnifiedMessage({ ...fixture(kind), previousOutcome }, providers());
    assert.equal(result.state, 'BLOCKED'); assert.equal('payload' in result, false);
  }
});
test('all three providers enforce both policy and eligibility consent, opt-out and tenant', () => {
  for (const kind of kinds) {
    const f = fixture(kind);
    for (const patch of [{ optedOut: true }, { blocked: true }, { consent: 'UNKNOWN' as const }, { tenantId: 'other' }]) {
      assert.equal(prepareUnifiedMessage({ ...f, eligibility: { ...f.eligibility, ...patch } }, providers()).state, 'BLOCKED');
      assert.equal(prepareUnifiedMessage({ ...f, request: { ...f.request, policy: { ...f.request.policy, ...patch } } }, providers()).state, 'BLOCKED');
    }
  }
});
test('RCS requires fresh capability for the exact agent/recipient/mode and does not fall back', () => {
  const f = fixture('RCS_GOOGLE');
  for (const patch of [{ agentId: 'other' }, { recipient: '+12025550101' }, { tenantId: 'other' }, { availability: 'UNKNOWN' as const }, { mode: 'LIVE' as const }, { observedAt: '2026-10-09T11:54:00Z' }]) {
    const result = prepareUnifiedMessage({ ...f, rcsCapability: { ...f.rcsCapability!, ...patch } }, providers());
    assert.equal(result.state, 'BLOCKED'); assert.equal('payload' in result, false);
  }
  assert.equal(prepareUnifiedMessage({ ...f, rcsCapability: undefined }, providers()).state, 'BLOCKED');
});
test('Meta service window remains enforced; Meta templates are not assumed for Evolution/RCS', () => {
  for (const kind of kinds) {
    const f = fixture(kind);
    const policy = { ...f.request.policy, lastInboundAt: undefined };
    assert.equal(prepareUnifiedMessage({ ...f, request: { ...f.request, policy } }, providers()).state, kind === 'WHATSAPP_META_OFFICIAL' ? 'BLOCKED' : 'DRAFT');
    if (kind !== 'WHATSAPP_META_OFFICIAL') assert.equal(prepareUnifiedMessage({ ...f, request: { ...f.request, policy: { ...policy, messageType: 'TEMPLATE' } } }, providers()).state, 'BLOCKED');
  }
});
test('provider/identity substitution and cross-account instances cannot prepare a draft', () => {
  for (const kind of kinds) {
    const f = fixture(kind);
    const p = providers();
    assert.equal(prepareUnifiedMessage({ ...f, request: { ...f.request, recipient: '+12025550101' } }, p).state, 'BLOCKED');
    assert.equal(prepareUnifiedMessage({ ...f, eligibility: { ...f.eligibility, identity: { ...f.eligibility.identity, provider: undefined } } }, p).state, 'BLOCKED');
    assert.equal(prepareUnifiedMessage(f, {}).state, 'BLOCKED');
    p.meta = new MetaWhatsAppCloudProvider({ tenantId: 'other', wabaId: '100', phoneNumberId: '200', mode: 'MOCK' });
    p.evolution = new EvolutionWhatsAppProvider({ tenantId: 'other', instanceName: 'TEST-instance', mode: 'MOCK' });
    p.rcs = new RcsChannelProvider({ tenantId: 'other', agentId: 'TEST-agent', mode: 'MOCK' });
    assert.equal(prepareUnifiedMessage(f, p).state, 'BLOCKED');
  }
});
test('LIVE/STAGING inputs never become a simulated success', () => {
  for (const kind of kinds) for (const mode of ['LIVE', 'STAGING'] as const) {
    const f = fixture(kind);
    assert.equal(prepareUnifiedMessage({ ...f, request: { ...f.request, policy: { ...f.request.policy, mode } } }, providers()).state, 'BLOCKED');
  }
});
