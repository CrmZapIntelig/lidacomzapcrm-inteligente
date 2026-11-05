import type { OperationalSnapshot, OrderOperation } from './stagingOperationalOrders';
import { validateSnapshot } from './stagingOperationalOrders';
import type { PrintSnapshot } from './operationsFinance';

/** Explicit grants from a trusted resolver. UI roles never imply any of these grants. */
export const testOrderCapabilities = ['orders.read', 'orders.checkout.import', 'orders.confirm', 'orders.cancel', 'orders.payment.change', 'orders.production', 'orders.delivery', 'orders.receive', 'orders.refund', 'orders.credit.decide', 'orders.print'] as const;
export type TestOrderCapability = typeof testOrderCapabilities[number];
export type TestOrderOperation = Exclude<OrderOperation, { kind: 'CREATE' | 'UPDATE' | 'LINK_EXTERNAL_REFERENCE' | 'ROLLBACK_TEST' }>;
export const testOrderOperationCapabilities: Readonly<Record<TestOrderOperation['kind'], TestOrderCapability>> = Object.freeze({
  CONFIRM: 'orders.confirm', CANCEL: 'orders.cancel', CHANGE_PAYMENT: 'orders.payment.change',
  PRODUCTION: 'orders.production', DELIVERY: 'orders.delivery', RECEIVE: 'orders.receive',
  REFUND: 'orders.refund', NOTA_APPROVE: 'orders.credit.decide', NOTA_REJECT: 'orders.credit.decide',
});
export interface TestOrderRequest {
  commandId: string; idempotencyKey: string; orderId: string; expectedRevision: number;
  /** Stable declared command time, retained on retry; not an authentication claim. */
  at: string; operation: TestOrderOperation;
}
/** Receipt lookup only: identity, prices and origin are never supplied by the importing screen. */
export interface TestCheckoutImportRequest {
  checkoutCommandId: string;
  cardMethod?: 'DEBITO' | 'CREDITO';
}
export interface TestOrderRow {
  mode: 'TEST'; id: string; revision: number; customerName: string; createdAt: string;
  channel: OperationalSnapshot['canonical']['channel']; provider: OperationalSnapshot['canonical']['provider'] | null;
  modality: OperationalSnapshot['modality']; method: OperationalSnapshot['method'];
  orderState: OperationalSnapshot['orderState']; paymentState: OperationalSnapshot['paymentState'];
  productionState: OperationalSnapshot['productionState']; deliveryState: OperationalSnapshot['deliveryState'];
  notaState: OperationalSnapshot['notaState']; totalCents: number; receivedCents: number;
  items: OperationalSnapshot['items']; actions: TestOrderOperation['kind'][]; canPrint: boolean;
}
export interface TestOrderPage { mode: 'TEST'; tenantId: string; actorId: string; orders: TestOrderRow[] }
export interface TestOrderReply { mode: 'TEST'; tenantId: string; actorId: string; appliedRevision: number; replay: boolean; current: TestOrderRow }
/** Injected transport only. No endpoint, credentials, Firebase instance or role mapping here. */
export interface TestOrderClient {
  readonly contextKey: string;
  readonly tenantId: string;
  readonly actorId: string;
  list(): Promise<TestOrderPage>;
  execute(request: TestOrderRequest): Promise<TestOrderReply>;
  print(orderId: string, expectedRevision: number): Promise<PrintSnapshot>;
}
export function testOrderRow(snapshot: OperationalSnapshot, capabilities: readonly TestOrderCapability[]): TestOrderRow {
  validateSnapshot(snapshot, snapshot.canonical.tenantId);
  if (!capabilities.includes('orders.read')) throw new Error('ORDER_ACCESS_DENIED');
  const s = structuredClone(snapshot);
  const allowed: Partial<Record<TestOrderOperation['kind'], boolean>> = {
    CONFIRM: s.orderState === 'DRAFT' && (s.method !== 'NOTA' || s.notaState === 'APPROVED'),
    CANCEL: s.orderState !== 'CANCELED' && s.receivedCents === 0 && s.paymentState !== 'REFUNDED' && s.productionState === 'WAITING' && s.deliveryState === 'NOT_APPLICABLE',
    CHANGE_PAYMENT: s.orderState === 'DRAFT',
    NOTA_APPROVE: s.orderState === 'DRAFT' && s.notaState === 'REQUESTED',
    NOTA_REJECT: s.orderState === 'DRAFT' && s.notaState === 'REQUESTED',
    PRODUCTION: s.orderState === 'CONFIRMED' && s.productionState !== 'READY',
    DELIVERY: s.orderState === 'CONFIRMED' && s.modality === 'DELIVERY' && s.productionState === 'READY' && ['READY', 'ASSIGNED', 'IN_TRANSIT'].includes(s.deliveryState),
    RECEIVE: s.orderState === 'CONFIRMED' && s.paymentState !== 'REFUNDED' && s.receivedCents < s.totalCents,
    REFUND: s.orderState === 'CONFIRMED' && s.method !== 'NOTA' && s.receivedCents === s.totalCents,
  };
  return { mode: 'TEST', id: s.canonical.id, revision: s.revision, customerName: s.customer.name, createdAt: s.canonical.createdAt.toISOString(), channel: s.canonical.channel, provider: s.canonical.provider ?? null,
    modality: s.modality, method: s.method, orderState: s.orderState, paymentState: s.paymentState, productionState: s.productionState, deliveryState: s.deliveryState, notaState: s.notaState,
    totalCents: s.totalCents, receivedCents: s.receivedCents, items: s.items,
    actions: (Object.keys(testOrderOperationCapabilities) as TestOrderOperation['kind'][]).filter(kind => allowed[kind] && capabilities.includes(testOrderOperationCapabilities[kind])), canPrint: capabilities.includes('orders.print') };
}
