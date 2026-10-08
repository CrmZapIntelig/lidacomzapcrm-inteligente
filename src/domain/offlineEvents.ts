import type { Opportunity, OpportunityStage, TimelineEvent } from './integrationBoundaries';
import { businessKey, required, timestamp } from './offlinePrimitives';

/** Scoped extension; reduced UNI-03 contract and legacy Client remain unchanged. */
export interface ScopedOpportunity extends Opportunity { tenantId: string; createdAt: Date; updatedAt: Date; mode: 'SIMULATION' }
interface EventContext { id: string; tenantId: string; contactId: string; conversationId: string; occurredAt: Date }
export type UnificationDomainEvent =
  | (EventContext & { type: 'MESSAGE_DRAFT_CREATED'; mode: 'SIMULATION'; campaignId: string; draftId: string })
  | (EventContext & { type: 'FIRST_OUTBOUND_MESSAGE_SENT'; mode: 'LIVE_EVIDENCE'; messageId: string });
export interface OfflineEventState { tenantId: string; opportunities: readonly ScopedOpportunity[]; timeline: readonly TimelineEvent[]; journal: readonly { eventId: string; signature: string }[] }
const stages: readonly OpportunityStage[] = ['RASCUNHO', 'LEAD', 'EM_ATENDIMENTO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'PRODUCAO', 'ENTREGUE', 'FECHADO', 'POS_VENDA'];
/** Historical EventEngine semantics, explicit fact boundary; send fact cannot be applied offline. */
export function funnelStageForEvent(type: UnificationDomainEvent['type']): OpportunityStage {
  if (type === 'MESSAGE_DRAFT_CREATED') return 'RASCUNHO';
  if (type === 'FIRST_OUTBOUND_MESSAGE_SENT') return 'LEAD';
  throw new Error('UNSUPPORTED_DOMAIN_EVENT');
}
export function createOfflineEventState(tenantId: string): OfflineEventState {
  required(tenantId); return { tenantId, opportunities: [], timeline: [], journal: [] };
}
function copyState(state: OfflineEventState): OfflineEventState {
  required(state.tenantId);
  const contacts = new Set<string>(), ids = new Set<string>();
  for (const o of state.opportunities) {
    [o.id, o.contactId].forEach(required); timestamp(o.createdAt); timestamp(o.updatedAt);
    if (o.tenantId !== state.tenantId || o.mode !== 'SIMULATION' || !stages.includes(o.stage) || contacts.has(o.contactId) || ids.has(o.id) || o.updatedAt.getTime() < o.createdAt.getTime()) throw new Error('INVALID_OPPORTUNITY_CONTEXT');
    contacts.add(o.contactId); ids.add(o.id);
  }
  for (const e of state.timeline) if (e.tenantId !== state.tenantId) throw new Error('INVALID_TIMELINE_CONTEXT');
  if (new Set(state.journal.map(e => e.eventId)).size !== state.journal.length) throw new Error('INVALID_EVENT_JOURNAL');
  return { ...state, opportunities: state.opportunities.map(o => ({ ...o, createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt) })), timeline: state.timeline.map(e => ({ ...e, occurredAt: new Date(e.occurredAt) })), journal: state.journal.map(j => ({ ...j })) };
}
/** Atomic pure reducer + idempotent journal, no bus singleton/subscription or writes. */
export function applyOfflineDomainEvents(state: OfflineEventState, events: readonly UnificationDomainEvent[]): OfflineEventState {
  const next = copyState(state);
  for (const event of events) {
    [event.id, event.tenantId, event.contactId, event.conversationId].forEach(required); timestamp(event.occurredAt);
    if (event.tenantId !== next.tenantId) throw new Error('EVENT_TENANT_MISMATCH');
    if (event.type !== 'MESSAGE_DRAFT_CREATED' || event.mode !== 'SIMULATION') throw new Error('GATE_LIVE_INTEGRATION_REQUIRED');
    [event.campaignId, event.draftId].forEach(required);
    const signature = JSON.stringify([event.type, event.mode, event.tenantId, event.contactId, event.conversationId, event.campaignId, event.draftId, event.occurredAt.toISOString()]);
    const previous = next.journal.find(e => e.eventId === event.id);
    if (previous) {
      if (previous.signature !== signature) throw new Error('EVENT_IDEMPOTENCY_COLLISION');
      continue;
    }
    const existing = next.opportunities.find(o => o.contactId === event.contactId);
    // A draft never regresses an established opportunity, nor transforms Order/Client.
    if (!existing) next.opportunities = [...next.opportunities, { id: `opportunity:${businessKey(event.tenantId, event.contactId)}`, tenantId: event.tenantId, contactId: event.contactId, stage: funnelStageForEvent(event.type), mode: 'SIMULATION', createdAt: new Date(event.occurredAt), updatedAt: new Date(event.occurredAt) }];
    const timelineId = `timeline:${event.id}`;
    if (next.timeline.some(e => e.id === timelineId)) throw new Error('TIMELINE_ID_COLLISION');
    next.timeline = [...next.timeline, { id: timelineId, tenantId: event.tenantId, contactId: event.contactId, type: event.type, title: 'Rascunho de venda ativa (simulação)', description: 'Texto preparado offline; nenhuma mensagem enviada.', occurredAt: new Date(event.occurredAt) }];
    next.journal = [...next.journal, { eventId: event.id, signature }];
  }
  return next;
}
