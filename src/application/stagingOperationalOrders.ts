import type { Order } from '../domain/types';
import type { PaymentMethod } from './orderOperations';
import { cents, paymentMethods } from './orderOperations';

export interface OperationalLine {
  id: string; productId: string; name: string; size: string; unitCents: number; quantity: number;
  addons: { id: string; name: string; unitCents: number }[];
  removed: string[]; utensils: { id: string; name: string; unitCents: number }[];
  observation: string; subtotalCents: number;
}
export interface OperationalSnapshot {
  schema: 1; mode: 'SIMULATION'; canonical: Order; revision: number;
  customer: { id: string; name: string }; conversation: { id: string; contactId: string; tenantId: string } | null;
  modality: 'DELIVERY' | 'PICKUP' | 'TABLE'; items: OperationalLine[];
  subtotalCents: number; feeCents: number; discountCents: number; totalCents: number;
  address: { street: string; number: string; district: string; city: string; zip: string } | null;
  table: string | null; legacyRefs: { collection: 'orders' | 'deliveryOrders'; id: string }[];
  method: PaymentMethod; orderState: 'DRAFT' | 'CONFIRMED' | 'CANCELED';
  paymentState: 'PENDING' | 'RECEIVED' | 'REFUNDED'; receivedCents: number;
  productionState: 'WAITING' | 'PREPARING' | 'READY';
  deliveryState: 'NOT_APPLICABLE' | 'READY' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  courierId: string | null;
  notaState: 'NOT_REQUESTED' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';
}
export type OrderOperation =
  | { kind: 'CREATE'; snapshot: OperationalSnapshot }
  | { kind: 'UPDATE'; snapshot: OperationalSnapshot }
  | { kind: 'CONFIRM' | 'CANCEL' | 'NOTA_APPROVE' | 'NOTA_REJECT' }
  | { kind: 'CHANGE_PAYMENT'; method: PaymentMethod }
  | { kind: 'RECEIVE' | 'REFUND'; amountCents: number; method: Exclude<PaymentMethod, 'NOTA'>; evidenceId: string }
  | { kind: 'PRODUCTION'; state: 'PREPARING' | 'READY' }
  | { kind: 'DELIVERY'; state: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED'; courierId: string }
  | { kind: 'ROLLBACK_TEST' };
export interface OperationalCommand {
  commandId: string; idempotencyKey: string; tenantId: string; orderId: string;
  expectedRevision: number; actor: string; at: string; operation: OrderOperation;
}
export interface OperationalCommandResult { revision: number; snapshot: OperationalSnapshot | null; replay: boolean }
export interface OperationalOrderPersistencePort {
  execute(command: OperationalCommand): Promise<OperationalCommandResult>;
  get(orderId: string): Promise<OperationalSnapshot | undefined>;
}
export interface OperationalEvent {
  id: string; commandId: string; actor: string; orderId: string; tenantId: string; revision: number;
  previousVersion: number; newVersion: number; at: string; operation: OrderOperation['kind']; result: 'APPLIED';
  fact: 'STATE' | 'SALE' | 'SALE_VOID' | 'RECEIPT' | 'CREDIT_RECEIPT' | 'REFUND'; amountCents: number; method: PaymentMethod;
  evidenceId?: string;
}
export const fixtureId = (id: string) => /^demo-TEST-[A-Za-z0-9_-]+$/.test(id);
const demoText = (value: string) => typeof value === 'string' && /^(?:Demo|TEST|Exemplo)(?:[ A-Za-z0-9_-]*)$/.test(value) && value.length <= 100;
function keys(value: object, allowed: readonly string[]) {
  if (!value || typeof value !== 'object' || Object.keys(value).some(k => !allowed.includes(k))) throw new Error('ORDER_UNSUPPORTED_FIELD');
}
export function validateSnapshot(s: OperationalSnapshot, tenantId: string) {
  keys(s, ['schema', 'mode', 'canonical', 'revision', 'customer', 'conversation', 'modality', 'items', 'subtotalCents', 'feeCents', 'discountCents', 'totalCents', 'address', 'table', 'legacyRefs', 'method', 'orderState', 'paymentState', 'receivedCents', 'productionState', 'deliveryState', 'courierId', 'notaState']);
  keys(s.canonical, ['id', 'tenantId', 'contactId', 'conversationId', 'entryPoint', 'channel', 'creationMode', 'total', 'status', 'paymentMethod', 'createdAt', 'updatedAt']);
  keys(s.customer, ['id', 'name']); if (s.conversation) keys(s.conversation, ['id', 'contactId', 'tenantId']);
  if (!s || s.schema !== 1 || s.mode !== 'SIMULATION' || !fixtureId(tenantId) || s.canonical.tenantId !== tenantId || !fixtureId(s.canonical.id) || !fixtureId(s.customer.id) || !demoText(s.customer.name)) throw new Error('ORDER_TEST_SNAPSHOT_REQUIRED');
  if (s.canonical.contactId !== s.customer.id || (s.conversation ? s.conversation.contactId !== s.customer.id || s.conversation.tenantId !== tenantId || !fixtureId(s.conversation.id) || s.canonical.conversationId !== s.conversation.id : s.canonical.conversationId !== undefined || s.canonical.entryPoint === 'CHAT')) throw new Error('ORDER_CONTEXT_MISMATCH');
  if (!['CHAT', 'POS', 'DIGITAL_MENU', 'TABLE_QR'].includes(s.canonical.entryPoint) || !['NONE', 'WHATSAPP', 'RCS'].includes(s.canonical.channel) || !['HUMAN_OPERATOR', 'CUSTOMER', 'AI_ASSISTED', 'AUTOMATION'].includes(s.canonical.creationMode)) throw new Error('ORDER_ORIGIN_INVALID');
  if (!['CREATED', 'PAID', 'CANCELED'].includes(s.canonical.status) || !['DRAFT', 'CONFIRMED', 'CANCELED'].includes(s.orderState) || !['PENDING', 'RECEIVED', 'REFUNDED'].includes(s.paymentState) || !['WAITING', 'PREPARING', 'READY'].includes(s.productionState) || !['NOT_APPLICABLE', 'READY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].includes(s.deliveryState) || !['NOT_REQUESTED', 'REQUESTED', 'APPROVED', 'REJECTED', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOIDED'].includes(s.notaState)) throw new Error('ORDER_STATE_INVALID');
  if (!paymentMethods.includes(s.method) || s.canonical.paymentMethod !== s.method || !['DELIVERY', 'PICKUP', 'TABLE'].includes(s.modality) || !Number.isSafeInteger(s.revision) || s.revision < 0) throw new Error('ORDER_METADATA_INVALID');
  if (!(s.canonical.createdAt instanceof Date) || !Number.isFinite(s.canonical.createdAt.getTime()) || !(s.canonical.updatedAt instanceof Date) || !Number.isFinite(s.canonical.updatedAt.getTime()) || s.canonical.updatedAt < s.canonical.createdAt) throw new Error('ORDER_TIMESTAMP_INVALID');
  if (!s.items.length || s.items.length > 20 || new Set(s.items.map(i => i.id)).size !== s.items.length) throw new Error('ORDER_ITEMS_INVALID');
  let subtotal = 0;
  for (const i of s.items) {
    keys(i, ['id', 'productId', 'name', 'size', 'unitCents', 'quantity', 'addons', 'removed', 'utensils', 'observation', 'subtotalCents']);
    if (!fixtureId(i.id) || !fixtureId(i.productId) || !demoText(i.name) || !demoText(i.size) || !demoText(i.observation) || !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || i.quantity > 100 || i.addons.length > 10 || i.utensils.length > 10 || i.removed.length > 10 || i.removed.some(v => !demoText(v))) throw new Error('ORDER_ITEM_INVALID');
    let unit = cents(i.unitCents);
    for (const a of [...i.addons, ...i.utensils]) { keys(a, ['id', 'name', 'unitCents']); if (!fixtureId(a.id) || !demoText(a.name)) throw new Error('ORDER_OPTION_INVALID'); unit = cents(unit + cents(a.unitCents)); }
    if (cents(i.subtotalCents) !== cents(unit * i.quantity)) throw new Error('ORDER_ITEM_TOTAL_MISMATCH');
    subtotal = cents(subtotal + i.subtotalCents);
  }
  if (cents(s.subtotalCents) !== subtotal || cents(s.totalCents) !== cents(subtotal + cents(s.feeCents) - cents(s.discountCents)) || s.canonical.total !== s.totalCents / 100) throw new Error('ORDER_TOTAL_MISMATCH');
  if (cents(s.receivedCents) > s.totalCents || s.totalCents <= 0) throw new Error('ORDER_RECEIPT_INVALID');
  const expectedCanonical = s.orderState === 'CANCELED' ? 'CANCELED' : s.paymentState === 'RECEIVED' ? 'PAID' : 'CREATED';
  if (s.canonical.status !== expectedCanonical || s.paymentState === 'RECEIVED' && s.receivedCents !== s.totalCents || s.paymentState === 'PENDING' && s.receivedCents === s.totalCents || s.paymentState === 'REFUNDED' && s.receivedCents !== 0 || s.method !== 'NOTA' && s.notaState !== 'NOT_REQUESTED') throw new Error('ORDER_STATE_EVIDENCE_MISMATCH');
  if (s.method === 'NOTA') {
    const allowedCredit = s.orderState === 'CANCELED' ? ['VOIDED'] : s.orderState === 'DRAFT' ? ['REQUESTED', 'APPROVED', 'REJECTED'] : s.receivedCents === 0 ? ['OPEN'] : s.receivedCents === s.totalCents ? ['PAID'] : ['PARTIALLY_PAID'];
    if (!allowedCredit.includes(s.notaState)) throw new Error('ORDER_CREDIT_EVIDENCE_MISMATCH');
  }
  if (s.modality === 'DELIVERY' && !s.address || s.modality !== 'DELIVERY' && s.address !== null || s.modality === 'TABLE' && !demoText(s.table ?? '') || s.modality !== 'TABLE' && s.table !== null) throw new Error('ORDER_FULFILLMENT_INVALID');
  if (s.address && (!demoText(s.address.street) || s.address.number !== 'TEST' || !demoText(s.address.district) || !demoText(s.address.city) || s.address.zip !== 'TEST')) throw new Error('ORDER_ADDRESS_TEST_REQUIRED');
  if (s.address) keys(s.address, ['street', 'number', 'district', 'city', 'zip']);
  for (const r of s.legacyRefs) keys(r, ['collection', 'id']);
  if (s.courierId !== null && !fixtureId(s.courierId) || s.legacyRefs.length > 5 || s.legacyRefs.some(r => !['orders', 'deliveryOrders'].includes(r.collection) || !fixtureId(r.id))) throw new Error('ORDER_SOURCE_REF_INVALID');
}
export function validateCommand(c: OperationalCommand) {
  keys(c, ['commandId', 'idempotencyKey', 'tenantId', 'orderId', 'expectedRevision', 'actor', 'at', 'operation']);
  if (![c.commandId, c.idempotencyKey, c.tenantId, c.orderId, c.actor].every(fixtureId) || !Number.isSafeInteger(c.expectedRevision) || c.expectedRevision < 0 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(c.at) || !Number.isFinite(Date.parse(c.at))) throw new Error('ORDER_TEST_COMMAND_REQUIRED');
  if (!['CREATE', 'UPDATE', 'CONFIRM', 'CANCEL', 'NOTA_APPROVE', 'NOTA_REJECT', 'CHANGE_PAYMENT', 'RECEIVE', 'REFUND', 'PRODUCTION', 'DELIVERY', 'ROLLBACK_TEST'].includes(c.operation.kind)) throw new Error('ORDER_OPERATION_INVALID');
  const allowed = c.operation.kind === 'CREATE' || c.operation.kind === 'UPDATE' ? ['kind', 'snapshot'] : c.operation.kind === 'CHANGE_PAYMENT' ? ['kind', 'method'] : c.operation.kind === 'RECEIVE' || c.operation.kind === 'REFUND' ? ['kind', 'amountCents', 'method', 'evidenceId'] : c.operation.kind === 'DELIVERY' ? ['kind', 'state', 'courierId'] : c.operation.kind === 'PRODUCTION' ? ['kind', 'state'] : ['kind'];
  keys(c.operation, allowed);
}
export function applyOrderCommand(current: OperationalSnapshot | undefined, c: OperationalCommand): { snapshot: OperationalSnapshot; event: OperationalEvent } {
  validateCommand(c);
  const op = c.operation;
  if (c.expectedRevision !== (current?.revision ?? 0)) throw new Error('ORDER_REVISION_CONFLICT');
  if (current && Date.parse(c.at) < current.canonical.updatedAt.getTime()) throw new Error('ORDER_TIMESTAMP_REGRESSION');
  if (op.kind === 'ROLLBACK_TEST') throw new Error('ORDER_ROLLBACK_REQUIRES_STORE');
  let next: OperationalSnapshot;
  let fact: OperationalEvent['fact'] = 'STATE', amountCents = 0;
  let evidenceId: string | undefined;
  if (op.kind === 'CREATE' || op.kind === 'UPDATE') {
    validateSnapshot(op.snapshot, c.tenantId);
    if (op.snapshot.canonical.id !== c.orderId || op.snapshot.revision !== c.expectedRevision || (op.kind === 'CREATE' ? !!current : !current || current.orderState !== 'DRAFT')) throw new Error('ORDER_REVIEW_CONFLICT');
    if (op.snapshot.orderState !== 'DRAFT' || op.snapshot.receivedCents !== 0 || op.snapshot.paymentState !== 'PENDING' || op.snapshot.productionState !== 'WAITING' || op.snapshot.courierId !== null || op.snapshot.deliveryState !== 'NOT_APPLICABLE' || op.snapshot.canonical.status !== 'CREATED' || op.snapshot.notaState !== (op.snapshot.method === 'NOTA' ? 'REQUESTED' : 'NOT_REQUESTED')) throw new Error('ORDER_INITIAL_STATE_REQUIRED');
    if (current && JSON.stringify([current.customer, current.conversation, current.canonical.entryPoint, current.canonical.channel, current.canonical.creationMode, current.canonical.createdAt, current.legacyRefs]) !== JSON.stringify([op.snapshot.customer, op.snapshot.conversation, op.snapshot.canonical.entryPoint, op.snapshot.canonical.channel, op.snapshot.canonical.creationMode, op.snapshot.canonical.createdAt, op.snapshot.legacyRefs])) throw new Error('ORDER_IMMUTABLE_CONTEXT');
    next = structuredClone(op.snapshot);
  } else {
    if (!current || current.orderState === 'CANCELED') throw new Error('ORDER_NOT_MUTABLE');
    next = structuredClone(current);
    if (op.kind === 'CONFIRM') {
      if (next.orderState !== 'DRAFT' || next.method === 'NOTA' && next.notaState !== 'APPROVED') throw new Error('ORDER_PAYMENT_REVIEW_REQUIRED');
      next.orderState = 'CONFIRMED'; if (next.method === 'NOTA') next.notaState = 'OPEN';
      fact = 'SALE'; amountCents = next.totalCents;
    } else if (op.kind === 'NOTA_APPROVE' || op.kind === 'NOTA_REJECT') {
      if (next.orderState !== 'DRAFT' || next.notaState !== 'REQUESTED') throw new Error('ORDER_NOTA_DECISION_INVALID');
      next.notaState = op.kind === 'NOTA_APPROVE' ? 'APPROVED' : 'REJECTED';
    } else if (op.kind === 'CHANGE_PAYMENT') {
      if (next.orderState !== 'DRAFT' || !paymentMethods.includes(op.method)) throw new Error('ORDER_PAYMENT_CHANGE_INVALID');
      next.method = op.method; next.canonical.paymentMethod = op.method; next.notaState = op.method === 'NOTA' ? 'REQUESTED' : 'NOT_REQUESTED';
    } else if (op.kind === 'CANCEL') {
      if (next.receivedCents !== 0 || next.paymentState === 'REFUNDED' || next.productionState !== 'WAITING' || next.deliveryState !== 'NOT_APPLICABLE') throw new Error('ORDER_CANCEL_REQUIRES_RECONCILIATION');
      if (next.orderState === 'CONFIRMED') { fact = 'SALE_VOID'; amountCents = next.totalCents; }
      next.orderState = 'CANCELED'; next.canonical.status = 'CANCELED'; if (next.method === 'NOTA') next.notaState = 'VOIDED';
    } else if (op.kind === 'RECEIVE' || op.kind === 'REFUND') {
      if (next.orderState !== 'CONFIRMED' || !fixtureId(op.evidenceId) || !paymentMethods.includes(op.method) || op.method === ('NOTA' as string) || cents(op.amountCents) <= 0) throw new Error('ORDER_RECEIPT_EVIDENCE_REQUIRED');
      evidenceId = op.evidenceId; amountCents = op.amountCents;
      if (op.kind === 'REFUND') {
        if (next.method === 'NOTA' || next.receivedCents !== next.totalCents || op.amountCents !== next.totalCents || op.method !== next.method) throw new Error('ORDER_REFUND_RECONCILIATION_REQUIRED');
        next.receivedCents = 0; next.paymentState = 'REFUNDED'; next.canonical.status = 'CREATED'; fact = 'REFUND';
      } else {
        if (next.paymentState === 'REFUNDED' || next.method !== 'NOTA' && op.method !== next.method || next.receivedCents + op.amountCents > next.totalCents) throw new Error('ORDER_RECEIPT_CONFLICT');
        next.receivedCents = cents(next.receivedCents + op.amountCents);
        next.paymentState = next.receivedCents === next.totalCents ? 'RECEIVED' : 'PENDING';
        next.canonical.status = next.paymentState === 'RECEIVED' ? 'PAID' : 'CREATED';
        if (next.method === 'NOTA') { next.notaState = next.paymentState === 'RECEIVED' ? 'PAID' : 'PARTIALLY_PAID'; fact = 'CREDIT_RECEIPT'; } else fact = 'RECEIPT';
      }
    } else if (op.kind === 'PRODUCTION') {
      if (next.orderState !== 'CONFIRMED' || !(next.productionState === 'WAITING' && op.state === 'PREPARING' || next.productionState === 'PREPARING' && op.state === 'READY')) throw new Error('ORDER_PRODUCTION_TRANSITION_INVALID');
      next.productionState = op.state; if (op.state === 'READY' && next.modality === 'DELIVERY') next.deliveryState = 'READY';
    } else if (op.kind === 'DELIVERY') {
      if (next.orderState !== 'CONFIRMED' || next.modality !== 'DELIVERY' || next.productionState !== 'READY' || !fixtureId(op.courierId) || !(next.deliveryState === 'READY' && op.state === 'ASSIGNED' || next.deliveryState === 'ASSIGNED' && op.state === 'IN_TRANSIT' || next.deliveryState === 'IN_TRANSIT' && op.state === 'DELIVERED')) throw new Error('ORDER_DELIVERY_TRANSITION_INVALID');
      if (next.courierId && next.courierId !== op.courierId) throw new Error('ORDER_COURIER_MISMATCH');
      next.courierId = op.courierId; next.deliveryState = op.state;
    }
  }
  next.revision = c.expectedRevision + 1; next.canonical.updatedAt = new Date(c.at);
  validateSnapshot(next, c.tenantId);
  const receipt = op.kind === 'RECEIVE' || op.kind === 'REFUND';
  return { snapshot: next, event: { id: c.commandId, commandId: c.commandId, actor: c.actor, orderId: c.orderId, tenantId: c.tenantId, revision: next.revision, previousVersion: c.expectedRevision, newVersion: next.revision, at: c.at, operation: op.kind, result: 'APPLIED', fact, amountCents, method: receipt ? op.method : next.method, ...(evidenceId ? { evidenceId } : {}) } };
}
