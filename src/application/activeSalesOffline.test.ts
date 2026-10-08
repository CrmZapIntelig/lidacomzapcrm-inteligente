import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createActiveSalesState, prepareActiveSalesDrafts, extendActiveSalesAudience, getConversationDraft, cancelActiveSalesEntry } from './activeSalesOffline';
import { createContactChannelIdentity, createProviderCapabilities } from '../domain/offlinePrimitives';
import type { Contact, Conversation } from '../domain/types';
import type { EligibilityEvidence } from '../domain/dispatchPrerequisites';
const at = new Date('2026-09-30T12:00:00Z');
const contacts: Contact[] = ['one', 'two', 'three'].map((id, i) => ({ id, tenantId: 't', name: `Nome${i} Cliente`, phone: `+551199999000${i}`, tags: [], notes: '', createdAt: at, updatedAt: at }));
const conversations: Conversation[] = contacts.flatMap(c => ['WHATSAPP', 'RCS'].map(channel => ({ id: `conv:${c.id}:${channel}`, tenantId: 't', contactId: c.id, channel: channel as 'WHATSAPP' | 'RCS', unreadCount: 0, createdAt: at, updatedAt: at })));
const evidence: EligibilityEvidence[] = contacts.flatMap(c => ['WHATSAPP', 'RCS'].map(channel => {
  const identity = createContactChannelIdentity({ id: `id:${c.id}:${channel}`, tenantId: 't', contactId: c.id, channel: channel as 'WHATSAPP' | 'RCS', provider: channel === 'RCS' ? 'RCS_GOOGLE' : 'WHATSAPP_META_OFFICIAL', address: c.phone, availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: at, updatedAt: at });
  return { tenantId: 't', contactId: c.id, phone: c.phone, blocked: false, optedOut: false, group: false, consent: 'ALLOWED', preferredChannel: 'ANY', alreadyPrepared: false, identity, capability: createProviderCapabilities({ channel: identity.channel, provider: identity.provider!, capabilities: ['TEXT'], source: 'MANUAL', observedAt: at }), templateApprovedForOffline: true };
}));
const audience = { id: 'a', tenantId: 't', campaignId: 'd', sourceAudienceId: 'explicit', revision: '1', contactIds: ['one', 'two'], capturedAt: at.toISOString() };
function state() { return createActiveSalesState({ campaign: { id: 'd', tenantId: 't', name: 'Venda ativa', template: 'Olá {{nome}} / {{nome}}', dailyLimit: 1, createdAt: at, updatedAt: at }, audience, strategy: 'RCS_FIRST_WITH_WHATSAPP_FALLBACK', timeZone: 'America/Sao_Paulo', minimumIntervalMs: 86400000 }); }
const input = { at, contacts, conversations, evidence };
test('explicit audience only; deterministic personalized drafts never sent', () => {
  const s = state(); const before = structuredClone(s); const first = prepareActiveSalesDrafts(s, input);
  assert.deepEqual(s, before); assert.deepEqual(first, prepareActiveSalesDrafts(s, input));
  assert.equal(first.state.drafts.length, 1); assert.equal(first.state.drafts[0].content, 'Olá Nome0 / Nome0');
  assert.equal(first.state.drafts[0].channel, 'RCS'); assert.equal(first.state.drafts[0].state, 'DRAFT');
  assert.equal(first.canSend, false); assert.equal(first.state.executions[0].mode, 'SIMULATION');
  assert.equal('sentAt' in first.state.drafts[0], false); assert.equal(first.state.queue.entries[0].status, 'DRAFT_PREPARED');
  assert.deepEqual(prepareActiveSalesDrafts(first.state, input).state, first.state);
});
test('budget continues remaining recipients next day without shifts, explicit append revision', () => {
  const first = prepareActiveSalesDrafts(state(), input).state;
  const extended = extendActiveSalesAudience(first, { ...audience, revision: '2', contactIds: ['three', 'one'] });
  assert.deepEqual(extended.queue.entries.slice(0, 2), first.queue.entries);
  assert.equal(prepareActiveSalesDrafts(extended, input).state.drafts.length, 1);
  const nextDay = prepareActiveSalesDrafts(extended, { ...input, at: new Date('2026-10-01T12:00:00Z') }).state;
  assert.equal(nextDay.drafts.length, 2); assert.equal(nextDay.drafts[1].contactId, 'two');
  assert.equal(nextDay.queue.entries[2].position, 3);
  assert.throws(() => extendActiveSalesAudience(first, audience));
});
for (const [label, patch] of Object.entries({ blocked: { blocked: true }, optedOut: { optedOut: true }, invalid: { phone: 'bad' }, consent: { consent: 'UNKNOWN' }, duplicate: { alreadyPrepared: true }, template: { templateApprovedForOffline: false } })) {
  test(`audience with ${label} cannot advance or consume budget`, () => {
    const s = createActiveSalesState({ ...state(), audience: { ...audience, contactIds: ['one'] } });
    const result = prepareActiveSalesDrafts(s, { ...input, evidence: evidence.map(e => ({ ...e, ...patch } as EligibilityEvidence)) });
    assert.equal(result.state.drafts.length, 0); assert.equal(result.state.budgets.length, 0);
  });
}
test('UNKNOWN RCS falls back to WhatsApp once; unknown all produces no draft', () => {
  const unknownRcs = evidence.map(e => e.identity.channel === 'RCS' ? { ...e, identity: { ...e.identity, availability: 'UNKNOWN' as const } } : e);
  const result = prepareActiveSalesDrafts(state(), { ...input, evidence: unknownRcs });
  assert.equal(result.state.drafts.length, 1); assert.equal(result.state.drafts[0].channel, 'WHATSAPP');
  assert.equal(prepareActiveSalesDrafts(state(), { ...input, evidence: [] }).state.drafts.length, 0);
});
test('explicit conversation binding rejects ambiguity, tenant/channel/provider mismatch', () => {
  assert.equal(prepareActiveSalesDrafts(state(), { ...input, conversations: [] }).state.drafts.length, 0);
  assert.equal(prepareActiveSalesDrafts(state(), { ...input, conversations: conversations.map(c => ({ ...c, tenantId: 'other' })) }).state.drafts.length, 0);
  const firstRcs = conversations.find(c => c.contactId === 'one' && c.channel === 'RCS')!;
  const result = prepareActiveSalesDrafts(state(), { ...input, conversations: [...conversations, { ...firstRcs, id: 'duplicate' }] });
  assert.equal(result.state.drafts[0]?.contactId, 'two');
});
test('cancelled draft unavailable; cancellation does not reset budget or replay', () => {
  const first = prepareActiveSalesDrafts(state(), input).state;
  assert.equal(getConversationDraft(first, first.drafts[0].id)?.canSend, false);
  const cancelled = cancelActiveSalesEntry(first, first.queue.entries[0].id);
  assert.equal(getConversationDraft(cancelled, first.drafts[0].id), undefined);
  assert.equal(prepareActiveSalesDrafts(cancelled, input).state.drafts.length, 1);
});
test('unresolved templates and invalid configuration fail closed', () => {
  assert.throws(() => createActiveSalesState({ ...state(), campaign: { ...state().campaign, dailyLimit: 0 } }));
  const s = state(); s.campaign.template = 'Olá {{missing}}';
  assert.equal(prepareActiveSalesDrafts(s, input).state.drafts.length, 0);
});
test('application kernel no network/storage/provider runtime', () => {
  const source = readFileSync('src/application/activeSalesOffline.ts', 'utf8');
  assert.doesNotMatch(source, /\b(fetch|axios|localStorage|sessionStorage|firebase|Firestore|setTimeout|setInterval)\b/);
  assert.doesNotMatch(source, /from ['"](?!\.\.\/domain\/)/);
});
test('contact-wide opt-out cannot be bypassed by another channel record', () => {
  const changed = evidence.map(e => e.contactId === 'one' && e.identity.channel === 'RCS' ? { ...e, optedOut: true } : e);
  const result = prepareActiveSalesDrafts(state(), { ...input, evidence: changed });
  assert.equal(result.state.drafts.some(d => d.contactId === 'one'), false);
});
test('two contact IDs sharing one phone cannot duplicate recipient', () => {
  const s = state(); s.campaign.dailyLimit = 10;
  const changedContacts = contacts.map(c => c.id === 'two' ? { ...c, phone: contacts[0].phone } : c);
  const changedEvidence = evidence.map(e => e.contactId === 'two' ? { ...e, phone: contacts[0].phone, identity: { ...e.identity, address: contacts[0].phone } } : e);
  assert.equal(prepareActiveSalesDrafts(s, { ...input, contacts: changedContacts, evidence: changedEvidence }).state.drafts.length, 1);
});
test('recipient snapshot prevents duplication when next call omits earlier contact source', () => {
  const first = prepareActiveSalesDrafts(state(), input).state;
  const changedContacts = [{ ...contacts[1], phone: contacts[0].phone }];
  const changedEvidence = evidence.filter(e => e.contactId === 'two').map(e => ({ ...e, phone: contacts[0].phone, identity: { ...e.identity, address: contacts[0].phone } }));
  const nextDay = prepareActiveSalesDrafts(first, { ...input, at: new Date('2026-10-01T12:00:00Z'), contacts: changedContacts, evidence: changedEvidence });
  assert.equal(nextDay.state.drafts.length, 1);
});
