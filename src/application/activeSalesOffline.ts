import type { Contact, Conversation, DispatchCampaign, PendingOutboundMessage } from '../domain/types';
import type { CommunicationChannel } from '../domain/omnichannel';
import { businessKey, required, timestamp } from '../domain/offlinePrimitives';
import { decideRouting } from '../domain/routing';
import { appendAudience, captureDispatchAudience, consumeBudget, evaluateDispatchEligibility, snapshotQueue, cancelEntry } from '../domain/dispatchPrerequisites';
import type { DispatchAudienceSnapshot, OfflineDispatchQueue, DailyDispatchBudget, EligibilityEvidence } from '../domain/dispatchPrerequisites';

export type DispatchChannelStrategy = 'WHATSAPP' | 'GOOGLE_RCS' | 'RCS_FIRST_WITH_WHATSAPP_FALLBACK' | 'WHATSAPP_FIRST_WITH_RCS_FALLBACK' | 'BOTH';
export interface ConversationDraft extends PendingOutboundMessage {
  tenantId: string;
  channel: CommunicationChannel;
  idempotencyKey: string;
  mode: 'SIMULATION';
  state: 'DRAFT';
  canSend: false;
}
export interface DispatchExecution {
  id: string; campaignId: string; mode: 'SIMULATION'; status: 'PREPARED_ONLY';
  preparedDraftIds: readonly string[]; evaluatedAt: string;
}
export interface ActiveSalesState {
  version: 1; mode: 'SIMULATION';
  campaign: DispatchCampaign;
  strategy: DispatchChannelStrategy;
  timeZone: string;
  minimumIntervalMs: number;
  audience: DispatchAudienceSnapshot;
  queue: OfflineDispatchQueue;
  budgets: readonly DailyDispatchBudget[];
  drafts: readonly ConversationDraft[];
  executions: readonly DispatchExecution[];
}
function copyState(state: ActiveSalesState): ActiveSalesState {
  return { ...state, campaign: { ...state.campaign, createdAt: new Date(state.campaign.createdAt), updatedAt: new Date(state.campaign.updatedAt) }, audience: captureDispatchAudience(state.audience), queue: snapshotQueue(state.queue), budgets: state.budgets.map(b => ({ ...b, entryKeys: [...b.entryKeys] })), drafts: state.drafts.map(d => ({ ...d, createdAt: new Date(d.createdAt) })), executions: state.executions.map(e => ({ ...e, preparedDraftIds: [...e.preparedDraftIds] })) };
}
export function createActiveSalesState(input: { campaign: DispatchCampaign; audience: DispatchAudienceSnapshot; strategy: DispatchChannelStrategy; timeZone: string; minimumIntervalMs: number }): ActiveSalesState {
  const { campaign, audience } = input;
  [campaign.id, campaign.tenantId, campaign.name, campaign.template].forEach(required);
  timestamp(campaign.createdAt); timestamp(campaign.updatedAt);
  if (!Number.isInteger(campaign.dailyLimit) || campaign.dailyLimit < 1 || !Number.isFinite(input.minimumIntervalMs) || input.minimumIntervalMs < 0 || !['WHATSAPP', 'GOOGLE_RCS', 'RCS_FIRST_WITH_WHATSAPP_FALLBACK', 'WHATSAPP_FIRST_WITH_RCS_FALLBACK', 'BOTH'].includes(input.strategy)) throw new Error('INVALID_DISPATCH_CONFIGURATION');
  new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(campaign.createdAt);
  const queue = appendAudience({ tenantId: campaign.tenantId, campaignId: campaign.id, entries: [] }, audience);
  return copyState({ ...input, version: 1, mode: 'SIMULATION', queue, budgets: [], drafts: [], executions: [] });
}
export function extendActiveSalesAudience(state: ActiveSalesState, audience: DispatchAudienceSnapshot): ActiveSalesState {
  if (audience.sourceAudienceId !== state.audience.sourceAudienceId || audience.marketingCampaignId !== state.audience.marketingCampaignId || audience.id !== state.audience.id || audience.revision === state.audience.revision) throw new Error('EXPLICIT_NEW_AUDIENCE_REVISION_REQUIRED');
  const queue = appendAudience(state.queue, audience);
  const cumulative = captureDispatchAudience({ ...audience, contactIds: queue.entries.map(e => e.contactId) });
  return copyState({ ...state, audience: cumulative, queue });
}
export interface PreparationInput {
  at: Date;
  contacts: readonly Contact[];
  conversations: readonly Conversation[];
  evidence: readonly EligibilityEvidence[];
}
function channels(strategy: DispatchChannelStrategy): readonly CommunicationChannel[] {
  if (strategy === 'WHATSAPP') return ['WHATSAPP'];
  if (strategy === 'GOOGLE_RCS') return ['RCS'];
  return strategy === 'RCS_FIRST_WITH_WHATSAPP_FALLBACK' ? ['RCS', 'WHATSAPP'] : ['WHATSAPP', 'RCS'];
}
/** Pure preparation. No message-send operation exists, even for SIMULATION. */
export function prepareActiveSalesDrafts(state: ActiveSalesState, input: PreparationInput) {
  timestamp(input.at);
  const next = copyState(state);
  const decisions: { entryId: string; status: 'DRAFT_PREPARED' | 'WAITING'; reasons: readonly string[] }[] = [];
  const preparedDraftIds: string[] = [];
  for (const entry of [...next.queue.entries].sort((a, b) => a.position - b.position)) {
    if (entry.status !== 'QUEUED') continue;
    const waiting = (reason: string) => decisions.push({ entryId: entry.id, status: 'WAITING', reasons: [reason] });
    if (entry.ownerId || (entry.nextAttemptAt && Date.parse(entry.nextAttemptAt) > input.at.getTime())) { waiting('LEASE_OR_RETRY_PENDING'); continue; }
    const contacts = input.contacts.filter(c => c.id === entry.contactId && c.tenantId === state.campaign.tenantId);
    if (contacts.length !== 1) { waiting('CONTACT_MISSING_OR_AMBIGUOUS'); continue; }
    const contact = contacts[0];
    const evidence = input.evidence.filter(e => e.contactId === contact.id && e.tenantId === contact.tenantId);
    if (evidence.some(e => e.blocked || e.optedOut || e.group || e.consent !== 'ALLOWED')) { waiting('CONTACT_BLOCKED_OR_CONSENT_NOT_ALLOWED'); continue; }
    if (next.drafts.some(d => input.contacts.some(c => c.id === d.contactId && c.tenantId === contact.tenantId && c.phone === contact.phone))) { waiting('DUPLICATE_RECIPIENT_ADDRESS'); continue; }
    // Eligibility is central and current; snapshot membership never authorizes preparation.
    const eligible = evidence.filter(e => e.phone === contact.phone && evaluateDispatchEligibility({ ...e, alreadyPrepared: e.alreadyPrepared || next.drafts.some(d => d.contactId === contact.id) }, { tenantId: contact.tenantId, minimumIntervalMs: next.minimumIntervalMs, evaluatedAt: input.at }).eligibleForPreparation);
    let selected: CommunicationChannel | null = null;
    for (const channel of channels(next.strategy)) {
      const decision = decideRouting({ tenantId: contact.tenantId, contactId: contact.id, requestedMode: channel, identities: eligible.map(e => e.identity), evaluatedAt: input.at });
      if (decision.selectedChannel) { selected = decision.selectedChannel; break; }
    }
    if (!selected) { waiting('NOT_ELIGIBLE_OR_CAPABILITY_UNKNOWN'); continue; }
    const conversations = input.conversations.filter(c => c.tenantId === contact.tenantId && c.contactId === contact.id && c.channel === selected);
    if (conversations.length !== 1 || !conversations[0].id?.trim()) { waiting('CONVERSATION_MISSING_OR_AMBIGUOUS'); continue; }
    const selectedIdentity = eligible.find(e => e.identity.channel === selected)!.identity;
    if (conversations[0].provider && conversations[0].provider !== selectedIdentity.provider) { waiting('CONVERSATION_PROVIDER_MISMATCH'); continue; }
    const content = next.campaign.template.replace(/\{\{nome\}\}/g, contact.name.trim().split(/\s+/)[0]);
    if (!contact.name.trim() || !content.trim() || /\{\{[^}]+\}\}/.test(content)) { waiting('UNRESOLVED_TEMPLATE'); continue; }
    const budget = consumeBudget(next.budgets, { tenantId: contact.tenantId, campaignId: next.campaign.id, dailyLimit: next.campaign.dailyLimit, timeZone: next.timeZone }, input.at, entry.idempotencyKey);
    if (!budget.allowed) { waiting('DAILY_BUDGET_EXHAUSTED'); continue; }
    next.budgets = budget.budgets;
    const draftId = `draft:${entry.idempotencyKey}`;
    next.drafts = [...next.drafts, { id: draftId, tenantId: contact.tenantId, contactId: contact.id, campaignId: next.campaign.id, queueEntryId: entry.id, conversationId: conversations[0].id, channel: selected, content, createdAt: new Date(input.at), idempotencyKey: entry.idempotencyKey, mode: 'SIMULATION', state: 'DRAFT', canSend: false }];
    next.queue = { ...next.queue, entries: next.queue.entries.map(e => e.id === entry.id ? { ...e, status: 'DRAFT_PREPARED', ownerId: undefined, leaseExpiresAt: undefined } : e) };
    preparedDraftIds.push(draftId);
    decisions.push({ entryId: entry.id, status: 'DRAFT_PREPARED', reasons: [] });
  }
  // No-op replay leaves execution history unchanged; stable business identity, no request ID.
  if (preparedDraftIds.length) next.executions = [...next.executions, { id: `execution:${businessKey(next.campaign.tenantId, next.campaign.id, ...preparedDraftIds)}`, campaignId: next.campaign.id, mode: 'SIMULATION', status: 'PREPARED_ONLY', preparedDraftIds, evaluatedAt: input.at.toISOString() }];
  return { state: next, decisions, mode: 'SIMULATION' as const, canSend: false as const, window: 'NOT_EVALUATED' as const };
}
/** Operator-facing payload for a later explicit UI action, not creation of a real chat. */
export function getConversationDraft(state: ActiveSalesState, draftId: string): ConversationDraft | undefined {
  const draft = state.drafts.find(d => d.id === draftId && state.queue.entries.some(e => e.id === d.queueEntryId && e.status === 'DRAFT_PREPARED'));
  return draft && { ...draft, createdAt: new Date(draft.createdAt) };
}
export function cancelActiveSalesEntry(state: ActiveSalesState, entryId: string): ActiveSalesState {
  return copyState({ ...state, queue: cancelEntry(state.queue, entryId) });
}
