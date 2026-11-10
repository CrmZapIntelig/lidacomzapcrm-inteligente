import type { OrderCreationMode } from '../domain/types';
import type { PilotConfirmedSnapshot } from './pilotMenuCheckout';
import { pilotMoneyCents, validatePilotConversation } from './pilotMenuCheckout';
import type { OperationalSnapshot } from './stagingOperationalOrders';
import { fixtureId, validateSnapshot } from './stagingOperationalOrders';

export interface PilotHandoffOptions {
  actor: string;
  creationMode: OrderCreationMode;
  /** The legacy label Cartao does not distinguish debit from credit. */
  cardMethod?: 'DEBITO' | 'CREDITO';
}
function keys(value: object, allowed: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error('PILOT_HANDOFF_UNSUPPORTED_FIELD');
}
export function validatePilotHandoffOptions(options: PilotHandoffOptions) {
  keys(options, ['actor', 'creationMode', 'cardMethod']);
  if (typeof options.actor !== 'string' || !fixtureId(options.actor) || !['CUSTOMER', 'HUMAN_OPERATOR', 'AI_ASSISTED', 'AUTOMATION'].includes(options.creationMode) || options.cardMethod !== undefined && !['DEBITO', 'CREDITO'].includes(options.cardMethod)) throw new Error('PILOT_HANDOFF_OPTIONS_INVALID');
}

/** Pure conversion of a trusted, persisted TEST receipt. Never accepts browser prices or allocates a new order ID. */
export function pilotCheckoutOperationalSnapshot(receipt: PilotConfirmedSnapshot, tenantId: string, commandId: string, options: PilotHandoffOptions): OperationalSnapshot {
  validatePilotHandoffOptions(options);
  keys(receipt, ['schema', 'mode', 'revision', 'restaurant', 'menuId', 'catalogRevision', 'origin', 'conversationId', 'conversationContext', 'modality', 'paymentState', 'receivedCents', 'nota', 'legacy']);
  if (receipt.schema !== 1 || receipt.mode !== 'TEST' || receipt.revision !== 1 || receipt.paymentState !== 'PENDING' || receipt.receivedCents !== 0 || receipt.nota !== 'DISABLED' || !['DELIVERY', 'PICKUP'].includes(receipt.modality)) throw new Error('PILOT_HANDOFF_REVIEW_REQUIRED');
  if (typeof receipt.catalogRevision !== 'string' || !fixtureId(receipt.catalogRevision)) throw new Error('PILOT_HANDOFF_REVIEW_REQUIRED');
  validatePilotConversation(receipt.origin, receipt.conversationId, receipt.conversationContext);
  const order = receipt.legacy;
  keys(order, ['id', 'clientId', 'clientName', 'clientPhone', 'items', 'subtotal', 'deliveryFee', 'total', 'paymentMethod', 'status', 'createdAt', 'deliveryTime', 'channel', 'address', 'notes']);
  const expectedChannel = receipt.origin === 'PUBLIC_MENU' ? 'delivery' : receipt.conversationContext!.channel === 'RCS' ? 'rcs' : 'whatsapp';
  if (order.status !== 'PEDIDO GERADO' || order.channel !== expectedChannel || order.deliveryTime !== 'TEST' || typeof order.clientPhone !== 'string' || !/^TEST-[A-Za-z0-9_-]{1,100}$/.test(order.clientPhone)) throw new Error('PILOT_HANDOFF_REVIEW_REQUIRED');
  keys(order.address, ['name', 'phone', 'street', 'number', 'neighborhood', 'complement', 'zipCode']);
  if (order.address.name !== order.clientName || order.address.phone !== order.clientPhone) throw new Error('PILOT_HANDOFF_CUSTOMER_MISMATCH');
  if (receipt.modality === 'PICKUP' && (order.deliveryFee !== 0 || [order.address.street, order.address.number, order.address.neighborhood, order.address.complement, order.address.zipCode].some(v => v !== ''))) throw new Error('PILOT_HANDOFF_PICKUP_MISMATCH');
  if (order.paymentMethod === 'Cartão' && !options.cardMethod) throw new Error('PILOT_HANDOFF_CARD_METHOD_REQUIRED');
  if (order.paymentMethod !== 'Cartão' && options.cardMethod !== undefined) throw new Error('PILOT_HANDOFF_CARD_METHOD_UNEXPECTED');
  const method = order.paymentMethod === 'Pix' ? 'PIX' : order.paymentMethod === 'Dinheiro' ? 'DINHEIRO' : order.paymentMethod === 'Cartão' ? options.cardMethod! : undefined;
  if (!method) throw new Error('PILOT_HANDOFF_PAYMENT_INVALID');
  const snapshot: OperationalSnapshot = {
    schema: 1, mode: 'SIMULATION', revision: 0,
    canonical: { id: order.id, tenantId, contactId: order.clientId, entryPoint: receipt.origin === 'PUBLIC_MENU' ? 'DIGITAL_MENU' : 'CHAT', channel: receipt.conversationContext?.channel ?? 'NONE', ...(receipt.conversationContext ? { provider: receipt.conversationContext.provider, conversationId: receipt.conversationId! } : {}), creationMode: options.creationMode, total: order.total, status: 'CREATED', paymentMethod: method, createdAt: new Date(order.createdAt), updatedAt: new Date(order.createdAt) },
    customer: { id: order.clientId, name: order.clientName },
    conversation: receipt.conversationId ? { id: receipt.conversationId, contactId: order.clientId, tenantId } : null,
    modality: receipt.modality,
    items: order.items.map((item, index) => {
      keys(item, ['productId', 'productName', 'selectedSize', 'selectedSizePrice', 'selectedAddons', 'removedItems', 'selectedUtensils', 'quantity', 'observation', 'subtotal']);
      const option = (value: { id: string; name: string; price: number }) => { keys(value, ['id', 'name', 'price']); return { id: value.id, name: value.name, unitCents: pilotMoneyCents(value.price) }; };
      return { id: `${order.id}-line-${index + 1}`, productId: item.productId, name: item.productName, size: item.selectedSize, unitCents: pilotMoneyCents(item.selectedSizePrice), quantity: item.quantity, addons: item.selectedAddons.map(option), removed: [...item.removedItems], utensils: item.selectedUtensils.map(option), observation: item.observation!, subtotalCents: pilotMoneyCents(item.subtotal) };
    }),
    subtotalCents: pilotMoneyCents(order.subtotal), feeCents: pilotMoneyCents(order.deliveryFee), discountCents: 0, totalCents: pilotMoneyCents(order.total),
    address: receipt.modality === 'DELIVERY' ? { street: order.address.street, number: order.address.number, district: order.address.neighborhood, zip: order.address.zipCode, ...(order.address.complement !== undefined ? { complement: order.address.complement } : {}) } : null,
    table: null, legacyRefs: [{ collection: 'deliveryOrders', id: order.id }],
    checkout: { commandId, menuId: receipt.menuId, catalogRevision: receipt.catalogRevision, restaurant: receipt.restaurant },
    method, orderState: 'DRAFT', paymentState: 'PENDING', receivedCents: 0, productionState: 'WAITING', deliveryState: 'NOT_APPLICABLE', courierId: null, notaState: 'NOT_REQUESTED',
  };
  validateSnapshot(snapshot, tenantId);
  return snapshot;
}
