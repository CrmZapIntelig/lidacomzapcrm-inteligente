import { required, timestamp } from './offlinePrimitives';

export type ExecutionMode = 'SIMULATION' | 'STAGING' | 'LIVE';
export interface ProviderTemplate {
  templateId: string; tenantId: string; channel: 'WHATSAPP'; provider: 'WHATSAPP_META_OFFICIAL';
  providerTemplateName: string; language: string; category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'UNKNOWN';
  variables: readonly string[]; evidence: 'SIMULATION' | 'PROVIDER'; observedAt: string;
}
export interface MessagingPolicyInput {
  tenantId: string; contactId: string; channel: 'WHATSAPP' | 'RCS'; provider: string;
  mode: ExecutionMode; purpose: 'SERVICE_REPLY' | 'BUSINESS_INITIATED'; messageType: 'TEXT' | 'TEMPLATE';
  blocked: boolean; optedOut: boolean; consent: 'ALLOWED' | 'DENIED' | 'UNKNOWN';
  lastInboundAt?: string; lastOutboundAt?: string; inboundEvidence: 'PROVIDER' | 'SIMULATION' | 'UNKNOWN';
  now: string; template?: ProviderTemplate; variables?: readonly string[];
}
export interface MessagingPolicyDecision {
  status: 'FREE_FORM_ALLOWED' | 'TEMPLATE_ALLOWED' | 'TEMPLATE_REQUIRED' | 'BLOCKED' | 'UNKNOWN';
  window: 'OPEN' | 'CLOSED' | 'UNKNOWN'; allowedByPolicy: boolean; canSend: false;
  reason: string; evaluatedAt: string; mode: ExecutionMode; ruleVersion: 'WA-BUSINESS-POLICY-2026-09-23';
}
/** Pure policy decision, never a transport authorization. Outbound never opens a window. */
export function evaluateMessagingPolicy(i: MessagingPolicyInput): MessagingPolicyDecision {
  const base = { canSend: false as const, evaluatedAt: i.now, mode: i.mode, ruleVersion: 'WA-BUSINESS-POLICY-2026-09-23' as const };
  const result = (status: MessagingPolicyDecision['status'], window: MessagingPolicyDecision['window'], reason: string): MessagingPolicyDecision => ({ ...base, status, window, reason, allowedByPolicy: ['FREE_FORM_ALLOWED', 'TEMPLATE_ALLOWED'].includes(status) });
  required(i.tenantId); required(i.contactId); timestamp(new Date(i.now));
  if (i.blocked || i.optedOut || i.consent !== 'ALLOWED') return result('BLOCKED', 'UNKNOWN', 'RECIPIENT_NOT_ALLOWED');
  if (i.channel !== 'WHATSAPP' || i.provider !== 'WHATSAPP_META_OFFICIAL') return result('UNKNOWN', 'UNKNOWN', 'PROVIDER_RULE_NOT_CONFIGURED');
  if (!['SIMULATION', 'STAGING', 'LIVE'].includes(i.mode) || !['TEXT', 'TEMPLATE'].includes(i.messageType) || !['SERVICE_REPLY', 'BUSINESS_INITIATED'].includes(i.purpose)) return result('UNKNOWN', 'UNKNOWN', 'INVALID_POLICY_CONTEXT');
  const evidence = i.mode === 'SIMULATION' ? i.inboundEvidence === 'SIMULATION' : i.inboundEvidence === 'PROVIDER';
  let window: MessagingPolicyDecision['window'] = 'CLOSED';
  if (i.lastInboundAt) {
    const age = Date.parse(i.now) - Date.parse(i.lastInboundAt);
    if (!evidence || !Number.isFinite(age) || age < 0) return result('UNKNOWN', 'UNKNOWN', 'INBOUND_EVIDENCE_NOT_VALID');
    window = age < 24 * 60 * 60 * 1000 ? 'OPEN' : 'CLOSED';
  }
  if (i.lastOutboundAt && (!Number.isFinite(Date.parse(i.lastOutboundAt)) || Date.parse(i.lastOutboundAt) > Date.parse(i.now))) return result('UNKNOWN', window, 'OUTBOUND_TIMESTAMP_INVALID');
  if (i.messageType === 'TEXT') return result(window === 'OPEN' && i.purpose === 'SERVICE_REPLY' ? 'FREE_FORM_ALLOWED' : 'TEMPLATE_REQUIRED', window, 'SERVICE_WINDOW_POLICY');
  const t = i.template;
  if (!t) return result('TEMPLATE_REQUIRED', window, 'TEMPLATE_MISSING');
  if (t.tenantId !== i.tenantId || t.channel !== i.channel || t.provider !== i.provider || t.status !== 'APPROVED') return result('BLOCKED', window, 'TEMPLATE_NOT_APPROVED_OR_CONTEXT_MISMATCH');
  if (t.evidence !== (i.mode === 'SIMULATION' ? 'SIMULATION' : 'PROVIDER') || !Number.isFinite(Date.parse(t.observedAt)) || Date.parse(t.observedAt) > Date.parse(i.now)) return result('UNKNOWN', window, 'TEMPLATE_EVIDENCE_INVALID');
  if (!t.templateId?.trim() || !/^[a-z0-9_]+$/.test(t.providerTemplateName) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(t.language) || !['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(t.category) || new Set(t.variables).size !== t.variables.length || t.variables.length !== (i.variables?.length ?? 0) || (i.variables ?? []).some(v => !v.trim())) return result('BLOCKED', window, 'TEMPLATE_PARAMETERS_INVALID');
  return result('TEMPLATE_ALLOWED', window, 'APPROVED_TEMPLATE');
}
