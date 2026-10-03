import test from 'node:test';
import assert from 'node:assert/strict';
import { RcsChannelProvider } from './rcsChannelProvider';
import type { RcsCapabilityEvidence } from './rcsChannelProvider';
import { prepareChannelFallback } from '../../src/domain/channelFallbackPreparation';
const at = '2026-09-30T12:00:00Z';
const evidence: RcsCapabilityEvidence = { tenantId: 'demo', agentId: 'synthetic-agent', recipient: '+12025550100', mode: 'SIMULATION', availability: 'KNOWN_AVAILABLE', features: ['RICHCARD_STANDALONE'], source: 'FIXTURE', observedAt: at };
test('RCS default disabled/missing agent/unknown capability never authorizes network or send', async () => {
  const p = new RcsChannelProvider({ tenantId: 'demo' });
  assert.equal(p.checkCapability(evidence.recipient, at, evidence).availability, 'UNKNOWN'); assert.equal((await p.sendText()).canSend, false);
  const missing = new RcsChannelProvider({ tenantId: 'demo', mode: 'MOCK' }); assert.equal(missing.checkCapability(evidence.recipient, at, evidence).availability, 'UNKNOWN');
});
test('RCS text/rich/suggested reply remain fixture drafts, with bound and fresh capabilities', () => {
  const p = new RcsChannelProvider({ tenantId: 'demo', mode: 'MOCK', agentId: 'synthetic-agent' });
  const input = { recipient: evidence.recipient, at, capability: evidence, content: { kind: 'RICH_CARD' as const, title: 'Demonstração', description: 'Dados sintéticos', suggestedReplies: [{ text: 'Sim', postbackData: 'demo_yes' }] } };
  assert.equal(p.prepareDraft(input).mode, 'SIMULATION'); assert.equal(p.prepareDraft(input).canSend, false);
  assert.throws(() => p.prepareDraft({ ...input, capability: { ...evidence, availability: 'UNKNOWN' } }));
  assert.throws(() => p.prepareDraft({ ...input, capability: { ...evidence, features: [] } }));
  assert.equal(p.checkCapability(evidence.recipient, at, { ...evidence, mode: 'LIVE' }).availability, 'UNKNOWN');
  assert.equal(p.checkCapability(evidence.recipient, at, { ...evidence, tenantId: 'other' }).availability, 'UNKNOWN');
  assert.equal(p.checkCapability(evidence.recipient, '2026-09-30T12:06:00Z', evidence).availability, 'UNKNOWN');
});
test('fallback chooses at most one eligible known channel; never duplicates accepted/uncertain', () => {
  const known = { available: 'KNOWN_AVAILABLE' as const, eligible: true, policyAllowed: true };
  const input = { strategy: 'RCS_FIRST_WITH_WHATSAPP_FALLBACK' as const, bothExplicit: false, whatsapp: known, rcs: { ...known, available: 'UNKNOWN' as const }, previousOutcome: 'NONE' as const };
  assert.equal(prepareChannelFallback(input).channel, 'WHATSAPP');
  assert.equal(prepareChannelFallback({ ...input, previousOutcome: 'UNCERTAIN' }).channel, null);
  assert.equal(prepareChannelFallback({ ...input, previousOutcome: 'ACCEPTED' }).channel, null);
  assert.equal(prepareChannelFallback({ ...input, strategy: 'BOTH' }).channel, null);
  assert.equal(prepareChannelFallback({ ...input, strategy: 'BOTH', bothExplicit: true }).channel, 'WHATSAPP');
  assert.equal(prepareChannelFallback(input).canSend, false);
  assert.equal(prepareChannelFallback({ ...input, rcs: known, previousOutcome: 'FINAL_REJECTED_BEFORE_ACCEPTANCE', previousChannel: 'RCS' }).channel, 'WHATSAPP');
  assert.equal(prepareChannelFallback({ ...input, previousOutcome: 'FINAL_REJECTED_BEFORE_ACCEPTANCE' }).channel, null);
});
