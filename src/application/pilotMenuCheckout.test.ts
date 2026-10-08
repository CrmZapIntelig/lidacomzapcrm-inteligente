import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPilotCatalog, reviewPilotCheckout, pilotOrderPrint } from './pilotMenuCheckout';
import type { PilotCatalog, PilotCheckoutCommand } from './pilotMenuCheckout';
import { renderPrintSnapshot } from './operationsFinance';

export function pilotCatalogFixture(): PilotCatalog {
  return { revision: 'demo-TEST-revision1', deliveryFeeCents: 700, menu: { id: 'demo-TEST-menu', name: 'TEST Cardapio', description: 'TEST', imageBanner: '', availableHours: 'TEST', active: true, productIds: ['demo-TEST-product'], createdAt: '2026-10-06T00:00:00.000Z' }, products: [{ id: 'demo-TEST-product', name: 'TEST Refeicao', description: 'TEST', image: '', category: 'TEST', price: 10, tamanhos: [{ label: 'TEST M', price: 20 }, { label: 'TEST zero', price: 0 }], adicionais: [{ id: 'demo-TEST-addon', name: 'TEST Adicional', price: 2 }], naoMandar: ['TEST Retirar'], utensilios: [{ id: 'demo-TEST-utensil', name: 'TEST Talher', price: 1 }] }] };
}
export function pilotCommandFixture(): PilotCheckoutCommand {
  return { commandId: 'demo-TEST-command', idempotencyKey: 'demo-TEST-checkout', menuId: 'demo-TEST-menu', catalogRevision: 'demo-TEST-revision1', origin: 'PUBLIC_MENU', conversationId: null, customer: { name: 'Cliente TEST Exemplo', identity: 'TEST-customer' }, modality: 'DELIVERY', paymentMethod: 'Pix', address: { street: 'TEST Rua', number: 'TEST', neighborhood: 'TEST Bairro', complement: 'TEST', zipCode: 'TEST' }, lines: [{ productId: 'demo-TEST-product', size: 'TEST M', addonIds: ['demo-TEST-addon'], removed: ['TEST Retirar'], utensilIds: ['demo-TEST-utensil'], quantity: 2, observation: 'TEST Obs' }] };
}
export const pilotTime = '2026-10-06T00:00:00.000Z';
const context = { at: pilotTime, orderId: 'demo-TEST-order', clientId: 'demo-TEST-contact', restaurant: 'Restaurante TEST Exemplo' };
test('pilot public catalog is scoped, whitelisted and hides unrelated catalog records', () => {
  const c = pilotCatalogFixture(); c.products.push({ ...c.products[0], id: 'demo-TEST-private', name: 'TEST Private' });
  (c.products[0] as unknown as Record<string, unknown>).secret = 'TEST-not-secret';
  const p = publicPilotCatalog(c); assert.equal(p.products.length, 1); assert.ok(!JSON.stringify(p).includes('secret')); assert.ok(!JSON.stringify(p).includes('Private'));
  assert.throws(() => publicPilotCatalog({ ...c, menu: { ...c.menu, active: false } }), /UNAVAILABLE/);
});
test('restaurant checkout recomputes prices, options and fee from trusted catalog', () => {
  const snapshot = reviewPilotCheckout(pilotCommandFixture(), pilotCatalogFixture(), context);
  assert.equal(snapshot.legacy.subtotal, 46); assert.equal(snapshot.legacy.total, 53); assert.equal(snapshot.legacy.items[0].selectedSizePrice, 20);
  assert.equal(snapshot.legacy.items[0].selectedUtensils[0].price, 1); assert.equal(snapshot.legacy.status, 'PEDIDO GERADO'); assert.equal(snapshot.paymentState, 'PENDING'); assert.equal(snapshot.receivedCents, 0);
});
test('public and conversation orders share catalog and pricing, pickup has no delivery fee', () => {
  const c = pilotCommandFixture(); c.origin = 'CONVERSATION'; c.conversationId = 'demo-TEST-conversation'; c.modality = 'PICKUP'; c.address = null;
  const s = reviewPilotCheckout(c, pilotCatalogFixture(), context); assert.equal(s.legacy.total, 46); assert.equal(s.legacy.channel, 'whatsapp'); assert.equal(s.conversationId, c.conversationId); assert.equal(s.legacy.address.street, '');
});
test('zero priced size remains zero rather than falling back to base price', () => {
  const c = pilotCommandFixture(); c.lines[0].size = 'TEST zero'; c.lines[0].addonIds = []; c.lines[0].utensilIds = [];
  assert.equal(reviewPilotCheckout(c, pilotCatalogFixture(), context).legacy.subtotal, 0);
});
test('server rejects prices, status, client IDs and NOTA supplied in checkout', () => {
  const base = pilotCommandFixture();
  for (const field of ['total', 'status', 'clientId', 'receivedCents']) assert.throws(() => reviewPilotCheckout({ ...base, [field]: 0 } as never, pilotCatalogFixture(), context), /UNSUPPORTED/);
  assert.throws(() => reviewPilotCheckout({ ...base, paymentMethod: 'NOTA' } as never, pilotCatalogFixture(), context), /PAYMENT/);
  assert.throws(() => reviewPilotCheckout({ ...base, lines: [{ ...base.lines[0], price: 0 }] } as never, pilotCatalogFixture(), context), /UNSUPPORTED/);
});
test('stale menu, unknown products/options, duplicate options and invalid quantities fail closed', () => {
  const base = pilotCommandFixture(); const bad = [
    { ...base, catalogRevision: 'demo-TEST-stale' }, { ...base, lines: [{ ...base.lines[0], productId: 'demo-TEST-other' }] },
    { ...base, lines: [{ ...base.lines[0], addonIds: ['demo-TEST-other'] }] }, { ...base, lines: [{ ...base.lines[0], addonIds: ['demo-TEST-addon', 'demo-TEST-addon'] }] },
    { ...base, lines: [{ ...base.lines[0], removed: ['unknown'] }] }, { ...base, lines: [{ ...base.lines[0], quantity: 0 }] }, { ...base, lines: [{ ...base.lines[0], quantity: 1.2 }] },
  ]; for (const c of bad) assert.throws(() => reviewPilotCheckout(c, pilotCatalogFixture(), context));
  assert.throws(() => reviewPilotCheckout({ ...base, origin: 'CONVERSATION' }, pilotCatalogFixture(), context), /CONTEXT/);
  assert.throws(() => reviewPilotCheckout({ ...base, address: null }, pilotCatalogFixture(), context), /ADDRESS/);
});
test('one central escaped thermal renderer prints confirmed order/comanda without mutation', () => {
  const s = reviewPilotCheckout(pilotCommandFixture(), pilotCatalogFixture(), context); s.legacy.items[0].observation = '<script>TEST</script>';
  const before = structuredClone(s);
  for (const kind of ['PEDIDO', 'COMANDA'] as const) {
    const html = renderPrintSnapshot(pilotOrderPrint(s, kind)); assert.match(html, /80mm/); assert.match(html, /PENDENTE/); assert.match(html, /53.00/); assert.match(html, /&lt;script&gt;/); assert.ok(!html.includes('<script>'));
    for (const value of ['Restaurante TEST', 'TEST Adicional', 'TEST Retirar', 'TEST Talher', 'TEST Rua']) assert.ok(html.includes(value));
  }
  assert.deepEqual(s, before); assert.throws(() => pilotOrderPrint({ ...s, mode: 'LIVE' } as never, 'PEDIDO'), /CONFIRMED_TEST/);
});
