import type { PaymentMethod } from '../../src/application/orderOperations';
import type { OperationalSnapshot } from '../../src/application/stagingOperationalOrders';
export const orderFixtureTime = '2026-10-03T12:00:00.000Z';
/** Closed synthetic fixture for tests/probe, never copied from operational data. */
export function createOrderFixture(tenantId = 'demo-TEST-order02', id = 'demo-TEST-order', method: PaymentMethod = 'PIX'): OperationalSnapshot {
  return {
    schema: 1, mode: 'SIMULATION', revision: 0,
    canonical: { id, tenantId, contactId: 'demo-TEST-contact', conversationId: 'demo-TEST-conversation', entryPoint: 'CHAT', channel: 'WHATSAPP', creationMode: 'HUMAN_OPERATOR', total: 48.5, status: 'CREATED', paymentMethod: method, createdAt: new Date(orderFixtureTime), updatedAt: new Date(orderFixtureTime) },
    customer: { id: 'demo-TEST-contact', name: 'Demo Ana Exemplo' }, conversation: { id: 'demo-TEST-conversation', contactId: 'demo-TEST-contact', tenantId },
    modality: 'DELIVERY', items: [{ id: 'demo-TEST-item', productId: 'demo-TEST-product', name: 'Demo Prato', size: 'Demo Grande', unitCents: 2000, quantity: 2, addons: [{ id: 'demo-TEST-addon', name: 'Demo Queijo', unitCents: 200 }], utensils: [{ id: 'demo-TEST-utensil', name: 'Demo Talher', unitCents: 50 }], removed: ['Demo Cebola'], observation: 'TEST observacao', subtotalCents: 4500 }],
    subtotalCents: 4500, feeCents: 500, discountCents: 150, totalCents: 4850,
    address: { street: 'Demo Rua', number: 'TEST', district: 'Demo Bairro', city: 'Demo Cidade', zip: 'TEST' }, table: null,
    legacyRefs: [{ collection: 'orders', id: 'demo-TEST-legacy-order' }, { collection: 'deliveryOrders', id: 'demo-TEST-legacy-delivery' }],
    method, orderState: 'DRAFT', paymentState: 'PENDING', receivedCents: 0, productionState: 'WAITING', deliveryState: 'NOT_APPLICABLE', courierId: null, notaState: method === 'NOTA' ? 'REQUESTED' : 'NOT_REQUESTED',
  };
}
