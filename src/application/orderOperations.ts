import type { Order as LegacyOrder, DeliveryOrder } from '../types';
import type { Order, OrderItem } from '../domain/types';
import { adaptCrmOrderToDomainOrder, adaptDeliveryOrderToDomainOrder } from '../domain/compatAdapters';
import type { OrderAdapterOptions } from '../domain/compatAdapters';

/** Additional evidence around the existing canonical Order; no replacement of legacy storage. */
export interface OrderOperationalProjection {
  order: Order;
  items: OrderItem[];
  source: { collection: 'orders' | 'deliveryOrders'; id: string; snapshot: LegacyOrder | DeliveryOrder };
  payment: 'LEGACY_PAID_ASSERTION' | 'UNKNOWN' | 'PENDING';
  production: 'UNKNOWN' | 'WAITING' | 'PREPARING' | 'READY';
  delivery: 'UNKNOWN' | 'IN_TRANSIT' | 'LEGACY_CLOSED';
  canceled: boolean;
  receiptEvidence: 'NOT_PROVIDED';
  writeEnabled: false;
}

export function projectOperationalOrder(source: LegacyOrder | DeliveryOrder, collection: 'orders' | 'deliveryOrders', options: OrderAdapterOptions): OrderOperationalProjection {
  if (!['CUSTOMER', 'HUMAN_OPERATOR', 'AI_ASSISTED', 'AUTOMATION'].includes(options.creationMode)) throw new Error('INVALID_CREATION_MODE');
  if (!options.contactId?.trim()) throw new Error('EXPLICIT_CONTACT_BINDING_REQUIRED');
  const crm = collection === 'orders';
  const statuses = crm ? ['Pendente', 'Pago', 'Cancelado'] : ['PEDIDO GERADO', 'PRODUÇÃO', 'PRONTO', 'EM ENTREGA', 'FECHADO'];
  if (!statuses.includes(source.status)) throw new Error('SOURCE_STATUS_MISMATCH');
  const copy = structuredClone(source);
  const projection = crm ? adaptCrmOrderToDomainOrder(copy as LegacyOrder, options) : adaptDeliveryOrderToDomainOrder(copy as DeliveryOrder, options);
  const closed = !crm && source.status === 'FECHADO';
  // Retain the old adapter unchanged. This evidence-aware projection does not assert a receipt.
  if (closed) projection.order.status = 'CREATED';
  return {
    order: projection.order, items: projection.items,
    source: { collection, id: source.id, snapshot: copy },
    payment: source.status === 'Pago' ? 'LEGACY_PAID_ASSERTION' : crm ? 'PENDING' : 'UNKNOWN',
    production: crm ? 'UNKNOWN' : source.status === 'PEDIDO GERADO' ? 'WAITING' : source.status === 'PRODUÇÃO' ? 'PREPARING' : source.status === 'PRONTO' ? 'READY' : 'UNKNOWN',
    delivery: source.status === 'EM ENTREGA' ? 'IN_TRANSIT' : closed ? 'LEGACY_CLOSED' : 'UNKNOWN',
    canceled: source.status === 'Cancelado', receiptEvidence: 'NOT_PROVIDED', writeEnabled: false,
  };
}

export const paymentMethods = ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'NOTA'] as const;
export type PaymentMethod = typeof paymentMethods[number];
export interface ReviewedOrder {
  mode: 'SIMULATION'; order: Order; items: OrderItem[];
  totalCents: number; method: PaymentMethod;
  fulfillment: 'DELIVERY' | 'PICKUP' | 'TABLE';
  nota: 'NOT_REQUESTED' | 'AWAITING_APPROVAL' | 'ACCEPTED' | 'REFUSED';
}
export interface OrderWritePort {
  /** Atomic revision and idempotency boundary; no operational implementation is supplied. */
  confirm(command: { key: string; expectedRevision: number; reviewed: ReviewedOrder }): { revision: number; order: ReviewedOrder; replay: boolean };
}
export function cents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_CENTS');
  return value;
}
export function reviewSyntheticOrder(input: {
  tenantId: string; contact: { id: string; tenantId: string }; conversation: { id: string; tenantId: string; contactId: string; channel: 'WHATSAPP' | 'RCS' };
  id: string; items: { id: string; name: string; unitCents: number; quantity: number }[];
  method: PaymentMethod; fulfillment: ReviewedOrder['fulfillment']; at: Date;
}): ReviewedOrder {
  const { contact, conversation } = input;
  if (![input.tenantId, contact.id, conversation.id, input.id].every(id => /^demo-[\w-]+$/.test(id))) throw new Error('SYNTHETIC_SCOPE_REQUIRED');
  if (contact.tenantId !== input.tenantId || conversation.tenantId !== input.tenantId || conversation.contactId !== contact.id) throw new Error('CONTEXT_BINDING_MISMATCH');
  if (!['WHATSAPP', 'RCS'].includes(conversation.channel) || !['DELIVERY', 'PICKUP', 'TABLE'].includes(input.fulfillment) || !paymentMethods.includes(input.method) || !Number.isFinite(input.at.getTime())) throw new Error('INVALID_REVIEW');
  if (!input.items.length || new Set(input.items.map(i => i.id)).size !== input.items.length) throw new Error('INVALID_ITEMS');
  const totalCents = cents(input.items.reduce((sum, i) => {
    if (!/^demo-[\w-]+$/.test(i.id) || !i.name.trim() || !Number.isSafeInteger(i.quantity) || i.quantity <= 0) throw new Error('INVALID_ITEM');
    return cents(sum + cents(i.unitCents) * i.quantity);
  }, 0));
  return {
    mode: 'SIMULATION', totalCents, method: input.method, fulfillment: input.fulfillment,
    nota: input.method === 'NOTA' ? 'AWAITING_APPROVAL' : 'NOT_REQUESTED',
    order: { id: input.id, tenantId: input.tenantId, contactId: contact.id, conversationId: conversation.id, entryPoint: 'CHAT', channel: conversation.channel, creationMode: 'HUMAN_OPERATOR', total: totalCents / 100, paymentMethod: input.method, status: 'CREATED', createdAt: new Date(input.at), updatedAt: new Date(input.at) },
    items: input.items.map(i => ({ id: i.id, orderId: input.id, productId: i.id, productName: i.name, quantity: i.quantity, price: i.unitCents / 100 })),
  };
}

export function decideNota(reviewed: ReviewedOrder, decision: 'ACCEPTED' | 'REFUSED'): ReviewedOrder {
  if (!['ACCEPTED', 'REFUSED'].includes(decision) || reviewed.nota !== 'AWAITING_APPROVAL') throw new Error('NOTA_DECISION_NOT_ALLOWED');
  return { ...structuredClone(reviewed), nota: decision };
}

export function changePayment(reviewed: ReviewedOrder, method: PaymentMethod): ReviewedOrder {
  if (!paymentMethods.includes(method)) throw new Error('INVALID_PAYMENT_METHOD');
  return { ...structuredClone(reviewed), method, nota: method === 'NOTA' ? 'AWAITING_APPROVAL' : 'NOT_REQUESTED', order: { ...structuredClone(reviewed.order), paymentMethod: method } };
}

/** Deliberately volatile simulation. A future real port needs separate authorization. */
export class MemoryOrderWritePort implements OrderWritePort {
  private records = new Map<string, { revision: number; order: ReviewedOrder }>();
  private commands = new Map<string, { payload: string; result: { revision: number; order: ReviewedOrder } }>();
  confirm(command: { key: string; expectedRevision: number; reviewed: ReviewedOrder }) {
    const r = command.reviewed;
    if (r.mode !== 'SIMULATION' || !/^demo-[\w-]+$/.test(command.key) || !/^demo-[\w-]+$/.test(r.order.tenantId) || !/^demo-[\w-]+$/.test(r.order.id)) throw new Error('SIMULATION_REQUIRED');
    if (r.nota === 'AWAITING_APPROVAL' || r.nota === 'REFUSED') throw new Error('PAYMENT_REVIEW_REQUIRED');
    if (!paymentMethods.includes(r.method) || r.order.paymentMethod !== r.method || r.order.status !== 'CREATED' || r.order.entryPoint !== 'CHAT' || r.order.creationMode !== 'HUMAN_OPERATOR' || !['WHATSAPP', 'RCS'].includes(r.order.channel) || !/^demo-[\w-]+$/.test(r.order.contactId) || !/^demo-[\w-]+$/.test(r.order.conversationId ?? '') || !['DELIVERY', 'PICKUP', 'TABLE'].includes(r.fulfillment)) throw new Error('INVALID_CONFIRMATION');
    if ((r.method === 'NOTA' && r.nota !== 'ACCEPTED') || (r.method !== 'NOTA' && r.nota !== 'NOT_REQUESTED')) throw new Error('INVALID_NOTA_STATE');
    if (!r.items.length || new Set(r.items.map(i => i.id)).size !== r.items.length || !Number.isFinite(r.order.createdAt.getTime()) || !Number.isFinite(r.order.updatedAt.getTime())) throw new Error('INVALID_CONFIRMATION');
    const computed = r.items.reduce((sum, i) => {
      if (i.orderId !== r.order.id || !/^demo-[\w-]+$/.test(i.productId) || !/^demo-[\w-]+$/.test(i.id) || !i.productName.trim() || !Number.isSafeInteger(i.quantity) || i.quantity <= 0) throw new Error('INVALID_CONFIRMATION');
      const unit = cents(Math.round(i.price * 100));
      if (Math.abs(i.price * 100 - unit) > 0.000001) throw new Error('INVALID_CONFIRMATION');
      return cents(sum + unit * i.quantity);
    }, 0);
    if (cents(r.totalCents) !== computed || r.order.total !== computed / 100) throw new Error('TOTAL_MISMATCH');
    const scope = JSON.stringify([r.order.tenantId, command.key]);
    const payload = JSON.stringify(command);
    const previous = this.commands.get(scope);
    if (previous) {
      if (previous.payload !== payload) throw new Error('IDEMPOTENCY_CONFLICT');
      return { ...structuredClone(previous.result), replay: true };
    }
    const id = JSON.stringify([r.order.tenantId, r.order.id]);
    const existing = this.records.get(id);
    if (!Number.isSafeInteger(command.expectedRevision) || command.expectedRevision !== (existing?.revision ?? 0)) throw new Error('REVISION_CONFLICT');
    if (existing && JSON.stringify([existing.order.order.contactId, existing.order.order.conversationId]) !== JSON.stringify([r.order.contactId, r.order.conversationId])) throw new Error('IMMUTABLE_CONTEXT');
    const result = { revision: command.expectedRevision + 1, order: structuredClone(r) };
    this.records.set(id, result); this.commands.set(scope, { payload, result: structuredClone(result) });
    return { ...structuredClone(result), replay: false };
  }
}
