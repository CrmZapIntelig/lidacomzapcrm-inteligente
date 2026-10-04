import type { OperationalSnapshot, OperationalEvent } from './stagingOperationalOrders';
import { validateSnapshot } from './stagingOperationalOrders';
import { cents } from './orderOperations';
import type { PaymentMethod } from './orderOperations';
import type { DeliveryOrder, Order as LegacyOrder } from '../types';

/** Consumer TEST envelopes. Unsupported legacy payment modes are explicit, never coerced. */
export function projectTestConsumers(snapshot: OperationalSnapshot) {
  const s = structuredClone(snapshot);
  const crmMethods: Partial<Record<PaymentMethod, LegacyOrder['paymentMethod']>> = { DINHEIRO: 'Dinheiro', PIX: 'Pix', CREDITO: 'Cartão de Crédito' };
  const deliveryMethods: Partial<Record<PaymentMethod, DeliveryOrder['paymentMethod']>> = { DINHEIRO: 'Dinheiro', PIX: 'Pix', DEBITO: 'Cartão', CREDITO: 'Cartão' };
  const financialStatus: LegacyOrder['status'] = s.orderState === 'CANCELED' ? 'Cancelado' : s.paymentState === 'RECEIVED' ? 'Pago' : 'Pendente';
  const channel = s.canonical.entryPoint === 'POS' ? 'balcao' as const : s.canonical.entryPoint === 'DIGITAL_MENU' ? 'delivery' as const : s.canonical.entryPoint === 'TABLE_QR' ? 'mesa_qr' as const : s.canonical.channel === 'WHATSAPP' ? 'whatsapp' as const : s.canonical.channel === 'RCS' ? 'rcs' as const : undefined;
  const kds = s.orderState !== 'CONFIRMED' ? null : { orderId: s.canonical.id, mode: 'TEST' as const, status: s.productionState === 'WAITING' ? 'PEDIDO GERADO' : s.productionState === 'PREPARING' ? 'PRODUÇÃO' : 'PRONTO', items: structuredClone(s.items) };
  const deliveryStatus: DeliveryOrder['status'] = s.deliveryState === 'DELIVERED' ? 'FECHADO' : s.deliveryState === 'IN_TRANSIT' ? 'EM ENTREGA' : s.productionState === 'READY' ? 'PRONTO' : s.productionState === 'PREPARING' ? 'PRODUÇÃO' : 'PEDIDO GERADO';
  const items = s.items.map(i => ({ productId: i.productId, productName: i.name, selectedSize: i.size, selectedSizePrice: i.unitCents / 100, selectedAddons: i.addons.map(a => ({ id: a.id, name: a.name, price: a.unitCents / 100 })), removedItems: i.removed, selectedUtensils: i.utensils.map(a => ({ id: a.id, name: a.name, price: a.unitCents / 100 })), quantity: i.quantity, observation: i.observation, subtotal: i.subtotalCents / 100 }));
  return {
    mode: 'TEST' as const, schema: 1 as const, orderId: s.canonical.id, revision: s.revision,
    // Lossless round-trip sidecar is mandatory: legacy contracts lack NOTA/payment evidence/discount axes.
    operationalSnapshot: s,
    legacyGaps: [...(s.discountCents ? ['DISCOUNT_SIDECAR_REQUIRED'] : []), 'CONTEXT_AND_STATE_SIDECAR_REQUIRED'],
    legacyOrder: crmMethods[s.method] ? { id: s.canonical.id, clientId: s.customer.id, clientName: s.customer.name, items: s.items.map(i => ({ id: i.id, productName: i.name, price: i.subtotalCents / i.quantity / 100, quantity: i.quantity })), total: s.totalCents / 100, paymentMethod: crmMethods[s.method]!, status: financialStatus, createdAt: s.canonical.createdAt.toISOString(), channel } satisfies LegacyOrder : null,
    legacyPaymentGap: crmMethods[s.method] ? null : 'LEGACY_PAYMENT_UNSUPPORTED',
    kds,
    delivery: s.modality !== 'DELIVERY' || s.orderState !== 'CONFIRMED' ? null : {
      orderId: s.canonical.id, status: s.deliveryState, courierId: s.courierId,
      legacy: deliveryMethods[s.method] ? { id: s.canonical.id, clientId: s.customer.id, clientName: s.customer.name, clientPhone: 'TEST', items, subtotal: s.subtotalCents / 100, deliveryFee: s.feeCents / 100, total: s.totalCents / 100, paymentMethod: deliveryMethods[s.method]!, status: deliveryStatus, createdAt: s.canonical.createdAt.toISOString(), deliveryTime: 'TEST', address: { name: s.customer.name, phone: 'TEST', street: s.address!.street, number: s.address!.number, neighborhood: s.address!.district, zipCode: s.address!.zip, complement: 'TEST' }, channel } satisfies DeliveryOrder : null,
      paymentGap: deliveryMethods[s.method] ? null : 'LEGACY_PAYMENT_UNSUPPORTED',
      financialState: s.paymentState, legacyClosedIsNotPaymentEvidence: true,
    },
  };
}
export function readTestProjection(projection: ReturnType<typeof projectTestConsumers>): OperationalSnapshot {
  if (projection.schema !== 1 || projection.mode !== 'TEST' || projection.orderId !== projection.operationalSnapshot.canonical.id || projection.revision !== projection.operationalSnapshot.revision) throw new Error('ORDER_PROJECTION_CONTEXT_MISMATCH');
  const snapshot = structuredClone(projection.operationalSnapshot);
  snapshot.canonical.createdAt = new Date(snapshot.canonical.createdAt); snapshot.canonical.updatedAt = new Date(snapshot.canonical.updatedAt);
  validateSnapshot(snapshot, snapshot.canonical.tenantId);
  return snapshot;
}
export interface TestCashMovement { id: string; kind: 'CASH_IN' | 'CASH_OUT'; amountCents: number }
export function projectTestCash(events: readonly OperationalEvent[], movements: readonly TestCashMovement[] = [], openingCashCents = 0) {
  const expected: Record<PaymentMethod, number> = { DINHEIRO: cents(openingCashCents), PIX: 0, DEBITO: 0, CREDITO: 0, NOTA: 0 };
  let totalSalesCents = 0;
  for (const e of events) {
    if (e.fact === 'SALE') { totalSalesCents += e.amountCents; if (e.method === 'NOTA') expected.NOTA += e.amountCents; }
    if (e.fact === 'SALE_VOID') { totalSalesCents -= e.amountCents; if (e.method === 'NOTA') expected.NOTA -= e.amountCents; }
    if (e.fact === 'RECEIPT' || e.fact === 'CREDIT_RECEIPT') { expected[e.method] = cents(expected[e.method] + e.amountCents); if (e.fact === 'CREDIT_RECEIPT') expected.NOTA -= e.amountCents; }
    if (e.fact === 'REFUND') { expected[e.method] -= e.amountCents; totalSalesCents -= e.amountCents; }
  }
  const seen = new Map<string, TestCashMovement>();
  for (const m of movements) {
    if (!/^demo-TEST-[\w-]+$/.test(m.id) || !['CASH_IN', 'CASH_OUT'].includes(m.kind)) throw new Error('ORDER_TEST_CASH_MOVEMENT_REQUIRED');
    cents(m.amountCents);
    const old = seen.get(m.id); if (old) { if (JSON.stringify(old) !== JSON.stringify(m)) throw new Error('ORDER_CASH_MOVEMENT_CONFLICT'); continue; }
    seen.set(m.id, m); expected.DINHEIRO += m.kind === 'CASH_IN' ? m.amountCents : -m.amountCents;
  }
  if (!Number.isSafeInteger(expected.DINHEIRO)) throw new Error('ORDER_CASH_BALANCE_INVALID');
  return { mode: 'TEST' as const, expected, drawerCents: expected.DINHEIRO, totalSalesCents: cents(totalSalesCents), openCreditCents: cents(expected.NOTA) };
}
export function closeTestCash(events: readonly OperationalEvent[], informed: Record<PaymentMethod, number>, movements: readonly TestCashMovement[] = [], openingCashCents = 0) {
  const cash = projectTestCash(events, movements, openingCashCents);
  return { ...cash, rows: (['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'NOTA'] as const).map(method => ({ method, expectedCents: cash.expected[method], informedCents: cents(informed[method]), differenceCents: informed[method] - cash.expected[method] })) };
}
