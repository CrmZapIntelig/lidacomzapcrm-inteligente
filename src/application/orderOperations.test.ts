import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectOperationalOrder, reviewSyntheticOrder, MemoryOrderWritePort, decideNota, changePayment } from './orderOperations';
import { summarizeFinance, closeByMethod, renderPrintSnapshot } from './operationsFinance';
import type { DeliveryOrder, Order } from '../types';

const input = () => ({ tenantId: 'demo-tenant', contact: { id: 'demo-contact', tenantId: 'demo-tenant' }, conversation: { id: 'demo-conversation', tenantId: 'demo-tenant', contactId: 'demo-contact', channel: 'WHATSAPP' as const }, id: 'demo-order', items: [{ id: 'demo-product', name: 'Prato Demo', unitCents: 2050, quantity: 2 }], method: 'PIX' as const, fulfillment: 'PICKUP' as const, at: new Date('2026-10-03T12:00:00Z') });
const options = { tenantId: 'demo-tenant', contactId: 'demo-contact', conversationId: 'demo-conversation', creationMode: 'HUMAN_OPERATOR' as const, entryPoint: 'POS' as const };
const crm: Order = { id: 'demo-legacy', clientId: 'demo-client', clientName: 'Ana Exemplo', items: [{ id: 'demo-product', productName: 'Prato Demo', price: 20, quantity: 2 }], total: 40, paymentMethod: 'Pix', status: 'Pago', createdAt: '2026-10-03T12:00:00Z', channel: 'balcao' };
const delivery = { ...crm, items: [], status: 'FECHADO', paymentMethod: 'Pix', subtotal: 35, deliveryFee: 5, clientPhone: 'TEST', deliveryTime: 'TEST', address: { street: 'Rua Demo' } } as unknown as DeliveryOrder;

test('order, finance and registration preparation have no persistence/provider/network runtime', () => {
  for (const file of ['orderOperations', 'operationsFinance', 'operationalRegistrations']) {
    const source = readFileSync(`src/application/${file}.ts`, 'utf8');
    assert.doesNotMatch(source, /\b(fetch|axios|localStorage|sessionStorage|indexedDB|setDoc|addDoc|deleteDoc|sendText|sendTemplate|setTimeout|setInterval)\b/);
    assert.doesNotMatch(source, /from ['"](?:firebase|@google|https?:|node:)/);
  }
});

test('evidence-aware delivery closure preserves legacy snapshot without inventing receipt or delivery proof', () => {
  const p = projectOperationalOrder(delivery, 'deliveryOrders', options);
  assert.equal(p.order.status, 'CREATED'); assert.equal(p.payment, 'UNKNOWN'); assert.equal(p.delivery, 'LEGACY_CLOSED'); assert.equal(p.production, 'UNKNOWN');
  assert.equal(p.receiptEvidence, 'NOT_PROVIDED'); assert.equal(p.writeEnabled, false);
  assert.deepEqual(p.source.snapshot, delivery); assert.notEqual(p.source.snapshot, delivery);
  assert.equal(projectOperationalOrder(crm, 'orders', options).payment, 'LEGACY_PAID_ASSERTION');
});
test('fulfillment states remain distinct and source/status mismatches fail closed', () => {
  for (const [status, production, transit] of [['PEDIDO GERADO', 'WAITING', 'UNKNOWN'], ['PRODUÇÃO', 'PREPARING', 'UNKNOWN'], ['PRONTO', 'READY', 'UNKNOWN'], ['EM ENTREGA', 'UNKNOWN', 'IN_TRANSIT']]) {
    const p = projectOperationalOrder({ ...delivery, status } as DeliveryOrder, 'deliveryOrders', options);
    assert.equal(p.production, production); assert.equal(p.delivery, transit); assert.equal(p.order.status, 'CREATED');
  }
  assert.throws(() => projectOperationalOrder(crm, 'deliveryOrders', options), /SOURCE_STATUS/);
  assert.throws(() => projectOperationalOrder(crm, 'orders', { ...options, contactId: undefined }), /CONTACT_BINDING/);
  const canceled = projectOperationalOrder({ ...crm, status: 'Cancelado' }, 'orders', options);
  assert.equal(canceled.canceled, true); assert.equal(canceled.order.status, 'CANCELED');
});
test('contextual review does not write; confirmation is scoped, replay-safe and optimistic', () => {
  const port = new MemoryOrderWritePort(), reviewed = reviewSyntheticOrder(input());
  const command = { key: 'demo-confirm', expectedRevision: 0, reviewed };
  assert.equal(port.confirm(command).revision, 1); assert.equal(port.confirm(command).replay, true);
  assert.throws(() => port.confirm({ ...command, reviewed: { ...reviewed, fulfillment: 'TABLE' } }), /IDEMPOTENCY/);
  assert.throws(() => port.confirm({ ...command, key: 'demo-other' }), /REVISION/);
  const result = port.confirm(command); result.order.order.total = 0;
  assert.equal(port.confirm(command).order.order.total, 41);
  assert.throws(() => reviewSyntheticOrder({ ...input(), conversation: { ...input().conversation, contactId: 'demo-other' } }), /BINDING/);
  assert.throws(() => reviewSyntheticOrder({ ...input(), tenantId: 'production' }), /SYNTHETIC/);
});
test('confirmation rejects forged totals and invalid monetary/quantity/context input', () => {
  for (const unitCents of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => reviewSyntheticOrder({ ...input(), items: [{ ...input().items[0], unitCents }] }));
  const port = new MemoryOrderWritePort(), reviewed = reviewSyntheticOrder(input());
  assert.throws(() => port.confirm({ key: 'demo-confirm', expectedRevision: 0, reviewed: { ...reviewed, totalCents: 1 } }), /TOTAL/);
  assert.throws(() => reviewSyntheticOrder({ ...input(), items: [{ ...input().items[0], quantity: 0 }] }), /ITEM/);
});
test('NOTA requires approval; refusal permits method change without canceling the order', () => {
  const reviewed = reviewSyntheticOrder({ ...input(), method: 'NOTA' });
  const port = new MemoryOrderWritePort();
  assert.throws(() => port.confirm({ key: 'demo-confirm', expectedRevision: 0, reviewed }), /PAYMENT_REVIEW/);
  const refused = decideNota(reviewed, 'REFUSED'); assert.equal(refused.order.status, 'CREATED');
  assert.throws(() => port.confirm({ key: 'demo-confirm', expectedRevision: 0, reviewed: refused }), /PAYMENT_REVIEW/);
  assert.equal(port.confirm({ key: 'demo-confirm', expectedRevision: 0, reviewed: changePayment(refused, 'PIX') }).revision, 1);
  const accepted = decideNota(reviewed, 'ACCEPTED'); assert.equal(new MemoryOrderWritePort().confirm({ key: 'demo-confirm', expectedRevision: 0, reviewed: accepted }).order.order.status, 'CREATED');
});
test('NOTA sale is counted once, excludes drawer and future partial receipt is not a second sale', () => {
  const sale = { id: 'demo-sale', orderId: 'demo-order', kind: 'SALE' as const, method: 'NOTA' as const, amountCents: 4100 };
  const receipt = { id: 'demo-receipt', orderId: 'demo-order', kind: 'CREDIT_RECEIPT' as const, method: 'DINHEIRO' as const, amountCents: 1000 };
  assert.equal(summarizeFinance([sale]).drawerCents, 0);
  const result = summarizeFinance([sale, receipt, receipt], 500);
  assert.equal(result.totalSalesCents, 4100); assert.equal(result.drawerCents, 1500); assert.equal(result.openCreditCents, 3100);
  assert.throws(() => summarizeFinance([sale, { ...receipt, amountCents: 4200 }]), /OVERPAYMENT/);
  assert.throws(() => summarizeFinance([receipt]), /REQUIRES_NOTA/);
  assert.throws(() => summarizeFinance([sale, { ...sale, id: 'demo-second' }]), /DUPLICATE_SALE/);
});
test('manual closing requires every method and reports differences independently', () => {
  const informed = { DINHEIRO: 500, PIX: 100, DEBITO: 0, CREDITO: 0, NOTA: 0 };
  const result = closeByMethod([], informed, 500);
  assert.equal(result.rows.find(r => r.method === 'PIX')?.differenceCents, 100);
  assert.equal(result.rows.length, 5);
  assert.throws(() => closeByMethod([], { ...informed, PIX: undefined } as never), /CENTS/);
});
test('central print renderer escapes untrusted text and never mutates its versioned snapshot', () => {
  const snapshot = { version: 1 as const, mode: 'SIMULATION' as const, kind: 'PEDIDO' as const, reference: 'demo-order', lines: ['<script>alert(1)</script>'] };
  const before = structuredClone(snapshot), html = renderPrintSnapshot(snapshot);
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('sem valor fiscal')); assert.deepEqual(snapshot, before);
  assert.throws(() => renderPrintSnapshot({ ...snapshot, mode: 'LIVE' } as never), /UNSUPPORTED/);
});
