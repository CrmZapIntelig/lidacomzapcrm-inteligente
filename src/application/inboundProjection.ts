import type { NormalizedProviderEvent } from './messagingReadiness';
import type { ExecutionMode } from '../domain/messagingPolicy';
import { businessKey, required, timestamp } from '../domain/offlinePrimitives';
import type { Contact, Conversation, Message } from '../domain/types';

export interface InboundState {
  tenantId: string; mode: ExecutionMode; accountId: string; processed: readonly string[];
  contacts: readonly Contact[]; identities: readonly { address: string; contactId: string; channel: 'WHATSAPP' | 'RCS'; provider: string }[];
  conversations: readonly Conversation[]; messages: readonly Message[];
  timeline: readonly { id: string; contactId: string; conversationId: string; messageId: string; at: string; type: 'INBOUND'; mode: ExecutionMode }[];
}
export function createInboundState(tenantId: string, accountId: string, mode: ExecutionMode): InboundState {
  required(tenantId); required(accountId);
  return { tenantId, accountId, mode, processed: [], contacts: [], identities: [], conversations: [], messages: [], timeline: [] };
}
/** Projection after authenticated admission. No network, persistence, outbound or inferred consent. */
export function projectInbound(state: InboundState, e: NormalizedProviderEvent, allocateId: () => string) {
  if (e.tenantId !== state.tenantId || e.mode !== state.mode || e.accountId !== state.accountId || e.kind !== 'INBOUND') throw new Error('INBOUND_CONTEXT_MISMATCH');
  required(e.eventId); required(e.messageId); timestamp(new Date(e.occurredAt));
  if (!/^\+[1-9]\d{7,14}$/.test(e.address ?? '') || typeof e.text !== 'string' || !e.text.trim() || e.text.length > 4096 || !((e.channel === 'WHATSAPP' && e.provider === 'WHATSAPP_META_OFFICIAL') || (e.channel === 'RCS' && e.provider === 'RCS_GOOGLE'))) throw new Error('INBOUND_INVALID');
  const key = businessKey(e.tenantId, e.accountId, e.provider, e.channel, e.messageId);
  if (state.processed.includes(key)) return { duplicate: true, state };
  const at = new Date(e.occurredAt);
  const ids = new Set([...state.contacts, ...state.conversations, ...state.messages].map(v => v.id));
  const nextId = () => { const id = required(allocateId()); if (ids.has(id)) throw new Error('INTERNAL_ID_COLLISION'); ids.add(id); return id; };
  // Reuse one contact by normalized address across channels, rejecting ambiguity.
  const contactIds = new Set([...state.identities.filter(i => i.address === e.address).map(i => i.contactId), ...state.contacts.filter(c => c.phone === e.address).map(c => c.id)]);
  if (contactIds.size > 1) throw new Error('IDENTITY_AMBIGUOUS');
  let contact = state.contacts.find(c => contactIds.has(c.id));
  if (contactIds.size && !contact) throw new Error('IDENTITY_ORPHAN');
  const contacts = state.contacts.map(c => ({ ...c }));
  if (!contact) {
    contact = { id: nextId(), tenantId: e.tenantId, name: 'Contato inbound', phone: e.address!, notes: 'Origem: inbound autenticado; consentimento comercial não inferido', tags: [], createdAt: at, updatedAt: at };
    contacts.push(contact);
  }
  const identities = state.identities.map(i => ({ ...i }));
  if (!identities.some(i => i.contactId === contact!.id && i.channel === e.channel && i.provider === e.provider && i.address === e.address)) identities.push({ contactId: contact.id, channel: e.channel, provider: e.provider, address: e.address! });
  const matches = state.conversations.filter(c => c.contactId === contact!.id && c.channel === e.channel && c.provider === e.provider);
  if (matches.length > 1) throw new Error('CONVERSATION_AMBIGUOUS');
  let conversation = matches[0];
  const conversations = state.conversations.map(c => ({ ...c }));
  if (!conversation) { conversation = { id: nextId(), tenantId: e.tenantId, contactId: contact.id, channel: e.channel, provider: e.provider, unreadCount: 0, createdAt: at, updatedAt: at }; conversations.push(conversation); }
  const message: Message = { id: nextId(), conversationId: conversation.id, sender: 'CONTACT', content: e.text!, channel: e.channel, provider: e.provider, providerMessageId: e.messageId, contentType: 'TEXT', createdAt: at };
  const timeline = { id: nextId(), contactId: contact.id, conversationId: conversation.id, messageId: message.id, at: e.occurredAt, type: 'INBOUND' as const, mode: e.mode };
  return { duplicate: false, state: { ...state, processed: [...state.processed, key], contacts, identities, conversations, messages: [...state.messages, message], timeline: [...state.timeline, timeline] }, contactId: contact.id, conversationId: conversation.id, messageId: message.id };
}
