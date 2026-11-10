import type { Cardapio, ProductDigitalMenu, DeliveryOrder, DeliveryOrderItem } from '../types';
import { cents } from './orderOperations';
import type { PrintSnapshot } from './operationsFinance';
import type { ChannelProvider, CommunicationChannel } from '../domain/omnichannel';
import { messageProviderChannel } from '../domain/messageChannelCatalog';

/** Restaurant catalog boundary shared by public and assisted checkout. No browser prices. */
export interface PilotCatalog { menu: Cardapio; products: ProductDigitalMenu[]; revision: string; deliveryFeeCents: number }
export interface PilotConversationContext { channel: CommunicationChannel; provider: ChannelProvider }
export interface PilotCheckoutCommand {
  commandId: string; idempotencyKey: string; menuId: string; catalogRevision: string;
  origin: 'PUBLIC_MENU' | 'CONVERSATION'; conversationId: string | null;
  conversationContext?: PilotConversationContext;
  customer: { name: string; identity: string };
  modality: 'DELIVERY' | 'PICKUP'; paymentMethod: DeliveryOrder['paymentMethod'];
  address: { street: string; number: string; neighborhood: string; complement: string; zipCode: string } | null;
  lines: { productId: string; size: string; addonIds: string[]; removed: string[]; utensilIds: string[]; quantity: number; observation: string }[];
}
export interface PilotConfirmedSnapshot {
  schema: 1; mode: 'TEST'; revision: 1; restaurant: string; menuId: string;
  /** Historical receipts may lack this field and require review before operational handoff. */
  catalogRevision?: string;
  origin: PilotCheckoutCommand['origin']; conversationId: string | null;
  conversationContext?: PilotConversationContext;
  modality: PilotCheckoutCommand['modality']; paymentState: 'PENDING'; receivedCents: 0;
  nota: 'DISABLED'; legacy: DeliveryOrder;
}
function keys(value: object, allowed: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error('PILOT_UNSUPPORTED_FIELD');
}
function text(value: string, max = 160, empty = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value) || !empty && !value.trim()) throw new Error('PILOT_INVALID_TEXT');
  return value.trim();
}
export function validatePilotConversation(origin: PilotCheckoutCommand['origin'], conversationId: string | null, context: PilotConversationContext | undefined) {
  if (origin === 'PUBLIC_MENU') {
    if (conversationId !== null || context !== undefined) throw new Error('PILOT_CONVERSATION_CONTEXT_INVALID');
    return;
  }
  if (origin !== 'CONVERSATION' || !conversationId) throw new Error('PILOT_CONTEXT_REQUIRED');
  try {
    text(conversationId, 128);
    if (!context) throw new Error('missing');
    keys(context, ['channel', 'provider']);
    if (messageProviderChannel(context.provider) !== context.channel) throw new Error('channel');
  } catch { throw new Error('PILOT_CONVERSATION_CONTEXT_INVALID'); }
}
export function validatePilotCheckout(c: PilotCheckoutCommand) {
  keys(c, ['commandId', 'idempotencyKey', 'menuId', 'catalogRevision', 'origin', 'conversationId', 'conversationContext', 'customer', 'modality', 'paymentMethod', 'address', 'lines']);
  for (const id of [c.commandId, c.idempotencyKey, c.menuId, c.catalogRevision]) if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('PILOT_INVALID_ID');
  keys(c.customer, ['name', 'identity']); text(c.customer.name); text(c.customer.identity, 128);
  validatePilotConversation(c.origin, c.conversationId, c.conversationContext);
  if (c.conversationId) text(c.conversationId, 128);
  if (!['DELIVERY', 'PICKUP'].includes(c.modality) || !['Pix', 'Cartão', 'Dinheiro'].includes(c.paymentMethod)) throw new Error('PILOT_PAYMENT_OR_MODALITY_INVALID');
  if (c.modality === 'DELIVERY' ? !c.address : c.address !== null) throw new Error('PILOT_ADDRESS_REQUIRED');
  if (c.address) { keys(c.address, ['street', 'number', 'neighborhood', 'complement', 'zipCode']); for (const k of ['street', 'number', 'neighborhood'] as const) text(c.address[k]); text(c.address.complement, 160, true); text(c.address.zipCode, 20, true); }
  if (!Array.isArray(c.lines) || !c.lines.length || c.lines.length > 20) throw new Error('PILOT_LINES_LIMIT');
  for (const line of c.lines) {
    keys(line, ['productId', 'size', 'addonIds', 'removed', 'utensilIds', 'quantity', 'observation']); text(line.productId, 128); text(line.size, 80);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new Error('PILOT_QUANTITY_LIMIT');
    for (const values of [line.addonIds, line.removed, line.utensilIds]) {
      if (!Array.isArray(values) || values.length > 10 || new Set(values).size !== values.length) throw new Error('PILOT_OPTIONS_INVALID');
      for (const value of values) text(value, 160);
    }
    text(line.observation, 300, true);
  }
}
export const pilotMoneyCents = (v: number) => { const result = Math.round(v * 100); if (!Number.isFinite(v) || Math.abs(v * 100 - result) > 0.000001) throw new Error('PILOT_CATALOG_PRICE_INVALID'); return cents(result); };
/** Public projection carries only explicitly selected menu/catalog fields, never clients/settings. */
export function publicPilotCatalog(catalog: PilotCatalog) {
  if (!catalog.menu.active) throw new Error('PILOT_MENU_UNAVAILABLE');
  return { id: catalog.menu.id, name: catalog.menu.name, description: catalog.menu.description, imageBanner: catalog.menu.imageBanner, availableHours: catalog.menu.availableHours, revision: catalog.revision, deliveryFeeCents: cents(catalog.deliveryFeeCents), products: catalog.menu.productIds.map(id => {
    const p = catalog.products.find(p => p.id === id); if (!p) throw new Error('PILOT_CATALOG_INCOMPLETE');
    return { id: p.id, name: p.name, description: p.description, image: p.image, category: p.category, price: p.price,
      tamanhos: p.tamanhos.map(s => ({ label: s.label, price: s.price })), adicionais: p.adicionais.map(a => ({ id: a.id, name: a.name, price: a.price })), naoMandar: [...p.naoMandar], utensilios: p.utensilios.map(a => ({ id: a.id, name: a.name, price: a.price })) };
  }) };
}
/** IDs and clock are authoritative server inputs. This produces a TEST snapshot, never a write. */
export function reviewPilotCheckout(c: PilotCheckoutCommand, catalog: PilotCatalog, context: { orderId: string; clientId: string; restaurant: string; at: string }): PilotConfirmedSnapshot {
  validatePilotCheckout(c);
  if (!catalog.menu.active || c.menuId !== catalog.menu.id || c.catalogRevision !== catalog.revision) throw new Error('PILOT_CATALOG_REVIEW_REQUIRED');
  if (!Number.isFinite(Date.parse(context.at))) throw new Error('PILOT_CLOCK_INVALID');
  const items: DeliveryOrderItem[] = c.lines.map(line => {
    const matches = catalog.products.filter(p => p.id === line.productId);
    if (!catalog.menu.productIds.includes(line.productId) || matches.length !== 1) throw new Error('PILOT_PRODUCT_UNAVAILABLE');
    const p = matches[0], sizes = p.tamanhos.length ? p.tamanhos : [{ label: 'Único', price: p.price }];
    const size = sizes.filter(s => s.label === line.size); if (size.length !== 1) throw new Error('PILOT_SIZE_INVALID');
    function options<T extends { id: string; name: string; price: number }>(ids: string[], available: T[]) {
      return ids.map(id => { const found = available.filter(a => a.id === id); if (found.length !== 1) throw new Error('PILOT_OPTION_UNAVAILABLE'); return { id, name: found[0].name, price: pilotMoneyCents(found[0].price) / 100 }; });
    }
    if (line.removed.some(r => !p.naoMandar.includes(r))) throw new Error('PILOT_REMOVAL_INVALID');
    const addons = options(line.addonIds, p.adicionais), utensils = options(line.utensilIds, p.utensilios);
    const unitCents = cents(pilotMoneyCents(size[0].price) + [...addons, ...utensils].reduce((sum, a) => sum + pilotMoneyCents(a.price), 0));
    return { productId: p.id, productName: p.name, selectedSize: size[0].label, selectedSizePrice: pilotMoneyCents(size[0].price) / 100, selectedAddons: addons, removedItems: [...line.removed], selectedUtensils: utensils, quantity: line.quantity, observation: line.observation, subtotal: cents(unitCents * line.quantity) / 100 };
  });
  const subtotalCents = cents(items.reduce((sum, i) => sum + pilotMoneyCents(i.subtotal), 0)), fee = c.modality === 'DELIVERY' ? cents(catalog.deliveryFeeCents) : 0;
  return { schema: 1, mode: 'TEST', revision: 1, restaurant: context.restaurant, menuId: c.menuId, catalogRevision: c.catalogRevision, origin: c.origin, conversationId: c.conversationId, ...(c.conversationContext ? { conversationContext: { ...c.conversationContext } } : {}), modality: c.modality, paymentState: 'PENDING', receivedCents: 0, nota: 'DISABLED', legacy: {
    id: context.orderId, clientId: context.clientId, clientName: c.customer.name, clientPhone: c.customer.identity,
    items, subtotal: subtotalCents / 100, deliveryFee: fee / 100, total: cents(subtotalCents + fee) / 100, paymentMethod: c.paymentMethod,
    status: 'PEDIDO GERADO', createdAt: context.at, deliveryTime: 'TEST', channel: c.origin === 'CONVERSATION' ? c.conversationContext!.channel === 'RCS' ? 'rcs' : 'whatsapp' : 'delivery',
    address: { name: c.customer.name, phone: c.customer.identity, street: c.address?.street ?? '', number: c.address?.number ?? '', neighborhood: c.address?.neighborhood ?? '', complement: c.address?.complement ?? '', zipCode: c.address?.zipCode ?? '' }, notes: 'TEST ONLY — pagamento pendente; não produzir nem cobrar',
  } };
}
/** Reuses the central renderer. Printing does not change any domain or financial state. */
export function pilotOrderPrint(snapshot: PilotConfirmedSnapshot, kind: 'PEDIDO' | 'COMANDA'): PrintSnapshot {
  if (snapshot.mode !== 'TEST' || snapshot.schema !== 1 || snapshot.revision !== 1 || !['PEDIDO', 'COMANDA'].includes(kind)) throw new Error('PILOT_CONFIRMED_TEST_REQUIRED');
  const o = snapshot.legacy;
  return { version: 1, mode: 'SIMULATION', kind, reference: o.id, lines: [snapshot.restaurant, o.createdAt, `Cliente: ${o.clientName}`, `Modalidade: ${snapshot.modality}`, ...o.items.flatMap(i => [
    `${i.quantity}x ${i.productName} (${i.selectedSize}) — R$ ${i.subtotal.toFixed(2)}`, `Adicionais: ${i.selectedAddons.map(a => a.name).join(', ') || 'nenhum'}`, `Retirar: ${i.removedItems.join(', ') || 'nenhum'}`, `Utensílios: ${i.selectedUtensils.map(a => a.name).join(', ') || 'nenhum'}`, `Obs: ${i.observation || 'nenhuma'}`,
  ]), `Pagamento: ${o.paymentMethod} — PENDENTE`, `Subtotal: R$ ${o.subtotal.toFixed(2)}`, `Taxa: R$ ${o.deliveryFee.toFixed(2)}`, `Total: R$ ${o.total.toFixed(2)}`, ...(snapshot.modality === 'DELIVERY' ? [`Endereço: ${o.address.street}, ${o.address.number}; ${o.address.neighborhood}; ${o.address.complement ?? ''}; ${o.address.zipCode}`] : []), o.notes ?? '', 'TEST — NÃO PRODUZIR / NÃO COBRAR'] };
}
