import type { NormalizedProviderEvent } from './messagingReadiness';
import type { ExecutionMode } from '../domain/messagingPolicy';

export interface OutboundProviderBinding { tenantId: string; accountId: string; provider: string; channel: 'WHATSAPP' | 'RCS'; mode: ExecutionMode; providerMessageId: string; dispatchEntryId: string; contactId: string; conversationId: string; recipient: string; acceptedAt: string }
export interface ProviderReceiptState { binding: OutboundProviderBinding; events: readonly { eventId: string; kind: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED'; occurredAt: string }[] }
/** Only explicit provider facts, no inferred intermediate timestamps or commercial/order transitions. */
export function projectProviderReceipt(state: ProviderReceiptState, e: NormalizedProviderEvent & { inReplyToMessageId?: string }) {
  if (!['INBOUND', 'STATUS'].includes(e.kind) || !['SIMULATION', 'STAGING', 'LIVE'].includes(e.mode)) throw new Error('RECEIPT_CONTEXT_MISMATCH');
  const b = state.binding;
  if (!b.dispatchEntryId || !b.contactId || !b.conversationId || !b.providerMessageId || b.tenantId !== e.tenantId || b.accountId !== e.accountId || b.provider !== e.provider || b.channel !== e.channel || b.mode !== e.mode || !Number.isFinite(Date.parse(b.acceptedAt)) || !Number.isFinite(Date.parse(e.occurredAt)) || Date.parse(e.occurredAt) < Date.parse(b.acceptedAt)) throw new Error('RECEIPT_CONTEXT_MISMATCH');
  let kind: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REPLIED';
  if (e.kind === 'STATUS') {
    if (e.messageId !== b.providerMessageId || !e.status || !['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(e.status)) throw new Error('RECEIPT_NOT_BOUND');
    kind = e.status;
  } else {
    if (e.inReplyToMessageId !== b.providerMessageId || e.address !== b.recipient || !e.messageId || !e.text) throw new Error('REPLY_NOT_CORRELATED');
    kind = 'REPLIED';
  }
  if (!e.eventId) throw new Error('EVENT_ID_REQUIRED');
  if (state.events.some(v => v.eventId === e.eventId)) {
    const prior = state.events.find(v => v.eventId === e.eventId)!;
    if (prior.kind !== kind || prior.occurredAt !== e.occurredAt) throw new Error('RECEIPT_ID_COLLISION');
    return state;
  }
  return { binding: { ...b }, events: [...state.events.map(v => ({ ...v })), { eventId: e.eventId, kind, occurredAt: e.occurredAt }] };
}
