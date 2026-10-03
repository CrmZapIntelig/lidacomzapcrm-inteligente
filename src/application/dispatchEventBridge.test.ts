import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createOfflineEventState, applyOfflineDomainEvents, funnelStageForEvent } from '../domain/offlineEvents';
import type { UnificationDomainEvent, ScopedOpportunity } from '../domain/offlineEvents';
import { collectDispatchDraftEvents, synchronizeDispatchDraftEvents } from './dispatchEventBridge';
import { prepareMarketingDispatchHandoff } from './marketingDispatchBridge';
import { prepareActiveSalesDrafts, cancelActiveSalesEntry } from './activeSalesOffline';
import { createContactChannelIdentity, createProviderCapabilities } from '../domain/offlinePrimitives';
const at = new Date('2026-09-30T12:00:00Z');
function dispatch() {
  const contact = { id: 'c', tenantId: 't', name: 'Contato Sintético', phone: '+5511999990000', tags: [], notes: '', createdAt: at, updatedAt: at };
  const conversation = { id: 'conv', tenantId: 't', contactId: 'c', channel: 'WHATSAPP' as const, unreadCount: 0, createdAt: at, updatedAt: at };
  const identity = createContactChannelIdentity({ id: 'i', tenantId: 't', contactId: 'c', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', address: contact.phone, availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: at, updatedAt: at });
  const handoff = prepareMarketingDispatchHandoff({ id: 'm', tenantId: 't', name: 'Marketing', createdAt: at, updatedAt: at }, { id: 'a', tenantId: 't', marketingCampaignId: 'm', rationale: 'Público sintético escolhido', contactIds: ['c'] }, { dispatchCampaignId: 'd', dispatchAudienceId: 'da', audienceRevision: '1', template: 'Olá {{nome}}', dailyLimit: 1, strategy: 'WHATSAPP', timeZone: 'America/Sao_Paulo', minimumIntervalMs: 0, preparedAt: at });
  return prepareActiveSalesDrafts(handoff.dispatch, { at, contacts: [contact], conversations: [conversation], evidence: [{ tenantId: 't', contactId: 'c', phone: contact.phone, blocked: false, optedOut: false, group: false, consent: 'ALLOWED', preferredChannel: 'WHATSAPP', alreadyPrepared: false, identity, capability: createProviderCapabilities({ channel: identity.channel, provider: identity.provider!, capabilities: ['TEXT'], source: 'MANUAL', observedAt: at }), templateApprovedForOffline: true }] }).state;
}
test('end-to-end Marketing→Dispatch→draft event→timeline→RASCUNHO only offline', () => {
  const d = dispatch(), before = structuredClone(d);
  const result = synchronizeDispatchDraftEvents(d, createOfflineEventState('t'));
  assert.equal(result.opportunities.length, 1); assert.equal(result.opportunities[0].stage, 'RASCUNHO');
  assert.equal(result.opportunities[0].tenantId, 't'); assert.equal(result.opportunities[0].mode, 'SIMULATION');
  assert.equal(result.timeline[0].type, 'MESSAGE_DRAFT_CREATED');
  assert.match(result.timeline[0].description, /nenhuma mensagem enviada/);
  assert.deepEqual(d, before); assert.equal(d.drafts[0].state, 'DRAFT');
});
test('event replay is idempotent and preserves history, source and dates', () => {
  const d = dispatch(); const empty = createOfflineEventState('t');
  const legacy = { id: 'historical', tenantId: 't', contactId: 'c', type: 'note_added', title: 'Nota', description: 'Histórico preservado', occurredAt: at };
  const first = synchronizeDispatchDraftEvents(d, { ...empty, timeline: [legacy] });
  const before = structuredClone(first);
  assert.deepEqual(synchronizeDispatchDraftEvents(d, first), first); assert.deepEqual(first, before);
  assert.equal(first.timeline[0].id, 'historical'); first.timeline[0].occurredAt.setTime(0);
  assert.equal(legacy.occurredAt.getTime(), at.getTime());
});
test('draft never regresses established scoped opportunity or converts order/client', () => {
  const d = dispatch();
  const opportunity: ScopedOpportunity = { id: 'explicit', tenantId: 't', contactId: 'c', orderId: 'order', stage: 'PAGO', mode: 'SIMULATION', createdAt: at, updatedAt: at };
  const result = synchronizeDispatchDraftEvents(d, { ...createOfflineEventState('t'), opportunities: [opportunity] });
  assert.equal(result.opportunities[0].stage, 'PAGO'); assert.equal(result.opportunities[0].orderId, 'order');
  assert.equal('clients' in result, false); assert.equal('orders' in result, false);
});
test('live first-outbound fact maps LEAD conceptually but blocked without effects', () => {
  assert.equal(funnelStageForEvent('FIRST_OUTBOUND_MESSAGE_SENT'), 'LEAD');
  const state = createOfflineEventState('t');
  const event: UnificationDomainEvent = { id: 'real-fact', tenantId: 't', contactId: 'c', conversationId: 'conv', type: 'FIRST_OUTBOUND_MESSAGE_SENT', mode: 'LIVE_EVIDENCE', messageId: 'message', occurredAt: at };
  assert.throws(() => applyOfflineDomainEvents(state, [event]), /GATE_LIVE_INTEGRATION_REQUIRED/);
  assert.equal(state.timeline.length, 0); assert.equal(state.opportunities.length, 0);
});
test('tenant/binding/id collision rejected atomically without mutating inputs', () => {
  const d = dispatch(); assert.throws(() => synchronizeDispatchDraftEvents(d, createOfflineEventState('other')));
  assert.throws(() => collectDispatchDraftEvents({ ...d, drafts: d.drafts.map(x => ({ ...x, contactId: 'other' })) }));
  const events = collectDispatchDraftEvents(d); const first = applyOfflineDomainEvents(createOfflineEventState('t'), events);
  const conflict = { ...events[0], contactId: 'other' };
  assert.throws(() => applyOfflineDomainEvents(first, [conflict]), /COLLISION/);
  assert.equal(first.timeline.length, 1);
});
test('cancelled drafts produce no new event, prior timeline remains intact', () => {
  const d = dispatch(); const first = synchronizeDispatchDraftEvents(d, createOfflineEventState('t'));
  const cancelled = cancelActiveSalesEntry(d, d.queue.entries[0].id);
  assert.equal(collectDispatchDraftEvents(cancelled).length, 0);
  assert.deepEqual(synchronizeDispatchDraftEvents(cancelled, first), first);
});
test('events and bridge have no legacy writes, provider or network runtime', () => {
  for (const path of ['src/domain/offlineEvents.ts', 'src/application/dispatchEventBridge.ts']) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /\b(fetch|axios|localStorage|firebase|Firestore|setDoc|deleteDoc|setTimeout|setInterval|console\.log)\b/);
    assert.doesNotMatch(source, /from ['"](?!\.\/|\.\.\/domain\/)/);
  }
});
