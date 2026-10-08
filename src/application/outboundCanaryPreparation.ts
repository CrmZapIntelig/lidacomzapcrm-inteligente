import { evaluateDispatchEligibility } from '../domain/dispatchPrerequisites';
import type { EligibilityEvidence } from '../domain/dispatchPrerequisites';
import { evaluateMessagingPolicy } from '../domain/messagingPolicy';
import type { MessagingPolicyInput } from '../domain/messagingPolicy';
import { businessKey } from '../domain/offlinePrimitives';

export interface TestRecipient { tenantId: string; contactId: string; identityId: string; address: string; designation: 'TEST'; provider: 'WHATSAPP_META_OFFICIAL'; configuredAt: string }
export interface CanaryPreparationInput {
  tenantId: string; campaignId: string; entryId: string; contactId: string; identityId: string; recipient: string;
  now: string; minimumIntervalMs: number; eligibility: EligibilityEvidence; policy: MessagingPolicyInput;
  allowlist: readonly TestRecipient[]; audience: readonly { contactId: string; designation: 'TEST' | 'CUSTOMER' }[];
  readiness: { stagingVerified: boolean; credentialSecure: boolean; providerConfigured: boolean; webhookValidated: boolean; durableStoreValidated: boolean; protocolVerified: boolean };
  maxRecipients: number; maxMessages: number; previousAttempts: number; sourceMode: 'STAGING' | 'SIMULATION';
}
/** Plan for review only. No SIMULATION draft promotion, reservation or provider call. */
export function prepareOutboundCanary(i: CanaryPreparationInput) {
  const reasons: string[] = [];
  if (i.sourceMode !== 'STAGING' || i.policy.mode !== 'STAGING') reasons.push('SIMULATION_CANNOT_BECOME_LIVE');
  if (!i.tenantId?.trim() || !i.campaignId?.trim() || !i.entryId?.trim() || i.policy.tenantId !== i.tenantId || i.policy.contactId !== i.contactId || i.policy.channel !== 'WHATSAPP' || i.policy.provider !== 'WHATSAPP_META_OFFICIAL' || i.policy.now !== i.now || i.eligibility.tenantId !== i.tenantId || i.eligibility.contactId !== i.contactId || i.eligibility.identity.id !== i.identityId || i.eligibility.phone !== i.recipient || i.eligibility.identity.channel !== 'WHATSAPP' || i.eligibility.identity.provider !== 'WHATSAPP_META_OFFICIAL') reasons.push('CANARY_CONTEXT_MISMATCH');
  const allowed = i.allowlist.filter(r => r.tenantId === i.tenantId && r.contactId === i.contactId && r.identityId === i.identityId && r.address === i.recipient && r.designation === 'TEST' && r.provider === 'WHATSAPP_META_OFFICIAL' && Number.isFinite(Date.parse(r.configuredAt)) && Date.parse(r.configuredAt) <= Date.parse(i.now));
  if (allowed.length !== 1) reasons.push('EXPLICIT_TEST_ALLOWLIST_REQUIRED');
  if (i.audience.length !== 1 || i.audience[0].contactId !== i.contactId || i.audience[0].designation !== 'TEST' || i.maxRecipients !== 1 || i.maxMessages !== 1 || i.previousAttempts !== 0) reasons.push('ONE_TEST_ONE_MESSAGE_REQUIRED');
  for (const key of Object.keys(i.readiness) as (keyof CanaryPreparationInput['readiness'])[]) if (i.readiness[key] !== true) reasons.push(`READINESS_${key.toUpperCase()}`);
  const requiredReadiness: (keyof CanaryPreparationInput['readiness'])[] = ['stagingVerified', 'credentialSecure', 'providerConfigured', 'webhookValidated', 'durableStoreValidated', 'protocolVerified'];
  if (requiredReadiness.some(key => i.readiness[key] !== true) && !reasons.some(r => r.startsWith('READINESS_'))) reasons.push('READINESS_UNKNOWN');
  if (!['WHATSAPP_SYNC', 'PROVIDER_EVENT', 'DELIVERY_RESULT'].includes(i.eligibility.identity.availabilitySource) || !['WHATSAPP_SYNC', 'PROVIDER_EVENT', 'DELIVERY_RESULT'].includes(i.eligibility.capability?.source ?? 'UNKNOWN')) reasons.push('LIVE_CAPABILITY_EVIDENCE_REQUIRED');
  let policy;
  try {
    const eligibility = evaluateDispatchEligibility(i.eligibility, { tenantId: i.tenantId, minimumIntervalMs: i.minimumIntervalMs, evaluatedAt: new Date(i.now) });
    reasons.push(...eligibility.reasons);
    policy = evaluateMessagingPolicy(i.policy);
    if (!policy.allowedByPolicy) reasons.push(`POLICY_${policy.status}`);
  } catch { reasons.push('INVALID_POLICY_EVIDENCE'); }
  return { readyForReview: reasons.length === 0, canSend: false as const, gateId: 'GATE_OUTBOUND_CANARY_REQUIRED' as const, reasons: [...new Set(reasons)], idempotencyKey: reasons.length ? undefined : businessKey(i.tenantId, i.campaignId, i.entryId, i.contactId, i.identityId), policy };
}
