import { evaluateMessagingPolicy } from '../domain/messagingPolicy';
import type { MessagingPolicyInput, MessagingPolicyDecision } from '../domain/messagingPolicy';
import type { ExecutionMode } from '../domain/messagingPolicy';

export interface ProviderCredentialResolver { resolve(tenantId: string, reference: string): Promise<string | undefined> }
export interface NormalizedProviderEvent {
  tenantId: string; accountId: string; channel: 'WHATSAPP' | 'RCS'; provider: string;
  mode: ExecutionMode; eventId: string; messageId: string; occurredAt: string;
  kind: 'INBOUND' | 'STATUS'; address?: string; text?: string;
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  inReplyToMessageId?: string;
}
export interface SendResult { mode: ExecutionMode; outcome: 'DISABLED' | 'BLOCKED' | 'MOCK' | 'ACCEPTED' | 'RETRYABLE_FAILURE' | 'FINAL_FAILURE' | 'UNCERTAIN'; providerMessageId?: string; reason: string }
export interface OutboundRequest { tenantId: string; contactId: string; entryId: string; idempotencyKey: string; recipient: string; text?: string; policy: MessagingPolicyInput }
export interface MessagingProvider {
  readonly provider: string;
  sendText(input: OutboundRequest): Promise<SendResult>;
  sendTemplate(input: OutboundRequest): Promise<SendResult>;
  parseWebhook(raw: Uint8Array, tenantId: string, mode: ExecutionMode): readonly NormalizedProviderEvent[];
  verifyWebhook(raw: Uint8Array, signature: string | undefined, tenantId: string): Promise<boolean>;
}
/** Must atomically persist dedupe + work before ACK; adapters must fence leases. */
export interface InboundAdmissionPort {
  admit(event: NormalizedProviderEvent, at: string): Promise<'ADMITTED' | 'DUPLICATE'>;
  reserve(owner: string, at: string, leaseMs: number): Promise<{ event: NormalizedProviderEvent; leaseToken: string; attempt: number } | undefined>;
  complete(leaseToken: string): Promise<void>;
  fail(leaseToken: string, retryAt?: string): Promise<void>;
}
export interface MessagingAudit { tenantId: string; entryId: string; action: 'ADMISSION' | 'DRAFT' | 'SEND_ATTEMPT' | 'PROVIDER_RESULT'; mode: ExecutionMode; occurredAt: string; reason: string; providerMessageId?: string }
export interface MessagingAuditPort { append(record: MessagingAudit): Promise<void> }
export function evaluateProviderReadiness(i: { enabled: boolean; available: boolean; credentialConfigured: boolean; stagingVerified: boolean }) {
  const reason = !i.enabled ? 'PROVIDER_DISABLED' : !i.available ? 'PROVIDER_UNAVAILABLE' : !i.credentialConfigured ? 'MISSING_CREDENTIAL' : !i.stagingVerified ? 'STAGING_NOT_VERIFIED' : 'FIRST_SEND_GATE_REQUIRED';
  return { canSend: false as const, reason };
}
export interface AutoReplyDraft { tenantId: string; contactId: string; conversationId: string; sourceMessageId: string; content: string; reason: string; createdAt: string; mode: ExecutionMode; policy: MessagingPolicyDecision; state: 'DRAFT'; canSend: false }
export function prepareAutoReplyDraft(input: { contactId: string; conversationId: string; source: NormalizedProviderEvent; policy: MessagingPolicyInput; content: string; humanEscalation: string }): AutoReplyDraft | undefined {
  const { source: s, policy: p } = input;
  if (s.kind !== 'INBOUND' || s.tenantId !== p.tenantId || s.mode !== p.mode || s.provider !== p.provider || s.channel !== p.channel || input.contactId !== p.contactId || !s.messageId || !input.conversationId || !input.content.trim() || !input.humanEscalation.trim() || p.lastInboundAt !== s.occurredAt) return undefined;
  const policy = evaluateMessagingPolicy(p);
  if (!policy.allowedByPolicy) return undefined;
  return { tenantId: s.tenantId, contactId: input.contactId, conversationId: input.conversationId, sourceMessageId: s.messageId, content: `${input.content}\n${input.humanEscalation}`, reason: 'INBOUND_SERVICE_REPLY', createdAt: p.now, mode: s.mode, policy, state: 'DRAFT', canSend: false };
}
