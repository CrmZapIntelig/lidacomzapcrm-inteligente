import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMessagingPolicy } from './messagingPolicy';
import type { MessagingPolicyInput, ProviderTemplate } from './messagingPolicy';
import { prepareAutoReplyDraft } from '../application/messagingReadiness';
const base: MessagingPolicyInput = { tenantId: 'demo', contactId: 'c1', mode: 'SIMULATION', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', purpose: 'SERVICE_REPLY', messageType: 'TEXT', blocked: false, optedOut: false, consent: 'ALLOWED', now: '2026-09-30T12:00:00Z', lastInboundAt: '2026-09-30T11:00:00Z', inboundEvidence: 'SIMULATION' };
test('window opens only from verified inbound, expires at exactly 24h, outbound cannot reset it', () => {
  assert.equal(evaluateMessagingPolicy(base).status, 'FREE_FORM_ALLOWED');
  assert.equal(evaluateMessagingPolicy({ ...base, lastInboundAt: '2026-09-29T12:00:00Z', lastOutboundAt: base.now }).status, 'TEMPLATE_REQUIRED');
  assert.equal(evaluateMessagingPolicy({ ...base, lastInboundAt: undefined }).window, 'CLOSED');
  assert.equal(evaluateMessagingPolicy({ ...base, purpose: 'BUSINESS_INITIATED' }).status, 'TEMPLATE_REQUIRED');
});
test('unknown evidence, future dates and unsupported provider fail closed', () => {
  for (const patch of [{ inboundEvidence: 'UNKNOWN' }, { mode: 'LIVE' }, { lastInboundAt: '2026-10-01T12:00:00Z' }, { channel: 'RCS', provider: 'RCS_GOOGLE' }] as Partial<MessagingPolicyInput>[]) assert.equal(evaluateMessagingPolicy({ ...base, ...patch }).allowedByPolicy, false);
});
test('opt-out, blocked and unknown consent override open window', () => {
  for (const patch of [{ optedOut: true }, { blocked: true }, { consent: 'UNKNOWN' }] as Partial<MessagingPolicyInput>[]) assert.equal(evaluateMessagingPolicy({ ...base, ...patch }).status, 'BLOCKED');
});
const template: ProviderTemplate = { tenantId: 'demo', templateId: 't1', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', providerTemplateName: 'demo_offer', language: 'pt_BR', category: 'MARKETING', status: 'APPROVED', variables: ['name'], evidence: 'SIMULATION', observedAt: base.now };
test('template requires approval, binding, parameters and evidence in the same mode', () => {
  const i = { ...base, messageType: 'TEMPLATE' as const, template, variables: ['Ana'] };
  assert.equal(evaluateMessagingPolicy(i).status, 'TEMPLATE_ALLOWED');
  for (const patch of [{ status: 'PAUSED' }, { tenantId: 'other' }, { evidence: 'PROVIDER' }, { language: '' }] as Partial<ProviderTemplate>[]) assert.equal(evaluateMessagingPolicy({ ...i, template: { ...template, ...patch } }).allowedByPolicy, false);
  assert.equal(evaluateMessagingPolicy({ ...i, variables: [] }).allowedByPolicy, false);
  assert.equal(evaluateMessagingPolicy(i).canSend, false);
});
test('auto-reply creates only a scoped draft, with human escalation, never upgrades simulation', () => {
  const input = { contactId: 'c1', conversationId: 'v1', source: { tenantId: 'demo', accountId: 'a1', channel: 'WHATSAPP' as const, provider: base.provider, mode: 'SIMULATION' as const, eventId: 'e1', messageId: 'm1', occurredAt: base.lastInboundAt!, kind: 'INBOUND' as const }, policy: base, content: 'Olá!', humanEscalation: 'Fale com um atendente.' };
  assert.equal(prepareAutoReplyDraft(input)?.state, 'DRAFT');
  assert.equal(prepareAutoReplyDraft(input)?.canSend, false);
  assert.equal(prepareAutoReplyDraft({ ...input, policy: { ...base, mode: 'LIVE' } }), undefined);
  assert.equal(prepareAutoReplyDraft({ ...input, policy: { ...base, optedOut: true } }), undefined);
});
