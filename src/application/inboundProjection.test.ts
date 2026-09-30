import test from 'node:test';
import assert from 'node:assert/strict';
import { createInboundState, projectInbound } from './inboundProjection';
import type { NormalizedProviderEvent } from './messagingReadiness';
const event: NormalizedProviderEvent = { tenantId: 'demo', accountId: 'account', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', mode: 'SIMULATION', eventId: 'event1', messageId: 'message1', occurredAt: '2026-09-30T12:00:00Z', kind: 'INBOUND', address: '+12025550100', text: 'Olá' };
let n = 0; const allocate = () => `id-${++n}`;
test('duplicate webhook/message projects once before identity allocation', () => {
  const first = projectInbound(createInboundState('demo', 'account', 'SIMULATION'), event, allocate);
  const again = projectInbound(first.state, { ...event, eventId: 'replayed' }, () => { throw new Error('must not resolve duplicate'); });
  assert.equal(again.duplicate, true); assert.equal(again.state.messages.length, 1); assert.equal(again.state.timeline.length, 1);
});
test('new contact/conversation idempotent, same address across channels shares contact only', () => {
  const first = projectInbound(createInboundState('demo', 'account', 'SIMULATION'), event, allocate);
  const next = projectInbound(first.state, { ...event, messageId: 'message2', channel: 'RCS', provider: 'RCS_GOOGLE' }, allocate);
  assert.equal(next.state.contacts.length, 1); assert.equal(next.state.identities.length, 2); assert.equal(next.state.conversations.length, 2);
  assert.equal(next.state.contacts[0].tags.length, 0);
});
test('tenant/account/mode and ambiguous identities/conversations fail atomically', () => {
  const state = projectInbound(createInboundState('demo', 'account', 'SIMULATION'), event, allocate).state;
  for (const patch of [{ tenantId: 'other' }, { accountId: 'other' }, { mode: 'LIVE' }, { address: 'invalid' }] as Partial<NormalizedProviderEvent>[]) assert.throws(() => projectInbound(state, { ...event, messageId: 'next', ...patch }, allocate));
  assert.throws(() => projectInbound({ ...state, contacts: [...state.contacts, { ...state.contacts[0], id: 'second' }] }, { ...event, messageId: 'next' }, allocate), /IDENTITY_AMBIGUOUS/);
  assert.throws(() => projectInbound({ ...state, conversations: [...state.conversations, { ...state.conversations[0], id: 'second' }] }, { ...event, messageId: 'next' }, allocate), /CONVERSATION_AMBIGUOUS/);
  assert.equal(state.messages.length, 1);
});
