import type { ActiveSalesState } from './activeSalesOffline';
import type { OfflineEventState, UnificationDomainEvent } from '../domain/offlineEvents';
import { applyOfflineDomainEvents } from '../domain/offlineEvents';
import { businessKey, timestamp } from '../domain/offlinePrimitives';
import { validateQueue } from '../domain/dispatchPrerequisites';

export function collectDispatchDraftEvents(dispatch: ActiveSalesState): readonly UnificationDomainEvent[] {
  validateQueue(dispatch.queue);
  if (dispatch.mode !== 'SIMULATION' || dispatch.queue.tenantId !== dispatch.campaign.tenantId || dispatch.queue.campaignId !== dispatch.campaign.id) throw new Error('INVALID_DISPATCH_EVENT_CONTEXT');
  const events: UnificationDomainEvent[] = [];
  for (const draft of dispatch.drafts) {
    const entry = dispatch.queue.entries.find(e => e.id === draft.queueEntryId);
    if (!entry || draft.tenantId !== dispatch.campaign.tenantId || draft.campaignId !== dispatch.campaign.id || entry.contactId !== draft.contactId || draft.idempotencyKey !== entry.idempotencyKey || draft.id !== `draft:${entry.idempotencyKey}` || draft.state !== 'DRAFT' || draft.mode !== 'SIMULATION' || draft.canSend !== false) throw new Error('INVALID_DRAFT_EVENT_BINDING');
    timestamp(draft.createdAt);
    if (entry.status !== 'DRAFT_PREPARED') continue;
    events.push({ id: `event:${businessKey(draft.tenantId, draft.campaignId, draft.id, 'MESSAGE_DRAFT_CREATED')}`, tenantId: draft.tenantId, contactId: draft.contactId, conversationId: draft.conversationId, campaignId: draft.campaignId, draftId: draft.id, type: 'MESSAGE_DRAFT_CREATED', mode: 'SIMULATION', occurredAt: new Date(draft.createdAt) });
  }
  return events;
}
/** Explicit orchestration; never runs on import or alters current UI/history stores. */
export function synchronizeDispatchDraftEvents(dispatch: ActiveSalesState, state: OfflineEventState): OfflineEventState {
  if (state.tenantId !== dispatch.campaign.tenantId) throw new Error('EVENT_TENANT_MISMATCH');
  return applyOfflineDomainEvents(state, collectDispatchDraftEvents(dispatch));
}
