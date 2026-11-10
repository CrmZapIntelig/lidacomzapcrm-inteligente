import test from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '../types';
import type { OperationalSnapshot } from './productionOrders';
import { buildSatisfactionOperationalInput, satisfactionBusinessDate } from './dailySatisfactionPresentation';

const client = (id: string, extra: Partial<Client> = {}): Client => ({ id, name: id, phone: '+5531999999999', type: 'salvo', stage: 'Rascunho', tags: [], totalBought: 0, notes: [], dispatched: false, avatarColor: '#000', channel: 'whatsapp', contactPreferences: { operationalStatus: 'allowed', preferredChannel: 'whatsapp' }, ...extra });
const order = (id: string, contactId: string, deliveredAt?: string): OperationalSnapshot => ({ schema: 1, mode: 'PRODUCTION', revision: 8, canonical: { id, tenantId: 'prato-mineiro', contactId, entryPoint: 'POS', channel: 'NONE', creationMode: 'HUMAN_OPERATOR', total: 40, paymentMethod: 'PIX', status: 'CREATED', createdAt: new Date('2026-10-30T10:00:00.000Z'), updatedAt: new Date('2026-10-30T18:00:00.000Z') }, customer: { id: contactId, name: contactId }, conversation: null, modality: 'DELIVERY', items: [{ id: 'item-1', productId: 'product-1', name: 'Prato', size: 'Único', unitCents: 4000, quantity: 1, addons: [], removed: [], utensils: [], observation: '', subtotalCents: 4000 }], subtotalCents: 4000, feeCents: 0, discountCents: 0, totalCents: 4000, address: { street: 'Rua A', number: '1', district: 'Centro', zip: '30000-000' }, table: null, legacyRefs: [], method: 'PIX', orderState: 'CONFIRMED', paymentState: 'PENDING', receivedCents: 0, productionState: 'READY', deliveryState: 'DELIVERED', ...(deliveredAt ? { deliveredAt } : {}), courierId: 'courier-1', notaState: 'NOT_REQUESTED' });

test('delivered evidence and explicit WhatsApp policy become preparation input only', () => {
  const result = buildSatisfactionOperationalInput({ tenantId: 'prato-mineiro', orders: [order('order-1', 'client-1', '2026-10-30T17:00:00.000Z')], clients: [client('client-1')], whatsappProvider: 'WHATSAPP_EVOLUTION_OPTIONAL' });
  assert.equal(result.deliveries[0].deliveredAt, '2026-10-30T17:00:00.000Z');
  assert.equal(result.policies[0].provider, 'WHATSAPP_EVOLUTION_OPTIONAL');
  assert.equal(result.policies[0].channelAvailable, true);
});

test('RCS preference selects Google RCS while blocked and denied contacts remain ineligible', () => {
  const clients = [client('rcs', { channel: 'ambos', contactPreferences: { operationalStatus: 'allowed', preferredChannel: 'rcs' } }), client('blocked', { type: 'bloqueado' }), client('denied', { contactPreferences: { operationalStatus: 'denied', preferredChannel: 'whatsapp' } })];
  const result = buildSatisfactionOperationalInput({ tenantId: 'prato-mineiro', orders: [], clients, whatsappProvider: 'WHATSAPP_META_OFFICIAL' });
  assert.deepEqual(result.policies.map(item => [item.contactId, item.provider, item.blocked, item.operationalConsent]), [['rcs', 'RCS_GOOGLE', false, 'ALLOWED'], ['blocked', 'WHATSAPP_META_OFFICIAL', true, 'ALLOWED'], ['denied', 'WHATSAPP_META_OFFICIAL', false, 'DENIED']]);
});

test('legacy delivered snapshot without terminal evidence is never guessed from updatedAt', () => {
  const result = buildSatisfactionOperationalInput({ tenantId: 'prato-mineiro', orders: [order('legacy-order', 'client-1')], clients: [client('client-1')], whatsappProvider: 'WHATSAPP_META_OFFICIAL' });
  assert.equal(result.deliveries.length, 0);
  assert.deepEqual(result.missingDeliveryEvidence, [{ orderId: 'legacy-order', contactId: 'client-1' }]);
});

test('unknown or unavailable contact channel fails closed', () => {
  const result = buildSatisfactionOperationalInput({ tenantId: 'prato-mineiro', orders: [], clients: [client('unknown', { channel: 'delivery', contactPreferences: { operationalStatus: 'unknown', preferredChannel: 'unknown' } })], whatsappProvider: 'WHATSAPP_META_OFFICIAL' });
  assert.equal(result.policies[0].channelAvailable, false);
  assert.equal(result.policies[0].operationalConsent, 'UNKNOWN');
});

test('business date follows Sao Paulo boundary rather than UTC day', () => {
  assert.equal(satisfactionBusinessDate('2026-10-30T01:30:00.000Z', 'America/Sao_Paulo'), '2026-10-29');
});
