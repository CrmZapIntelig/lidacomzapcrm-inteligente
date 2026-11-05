import { validateSnapshot, type OperationalSnapshot } from './productionOrders';
import { renderThermalDocument } from './thermalPrint';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const orderLabels = { DRAFT: 'Aguardando confirmação', CONFIRMED: 'Confirmado', CANCELED: 'Cancelado' };
const paymentLabels = { PENDING: 'Pendente', RECEIVED: 'Recebido', REFUNDED: 'Estornado' };
const productionLabels = { WAITING: 'Aguardando preparo', PREPARING: 'Em preparo', READY: 'Pronto' };
const deliveryLabels = { NOT_APPLICABLE: 'Não iniciada / não aplicável', READY: 'Pronta para entrega', ASSIGNED: 'Entregador atribuído', IN_TRANSIT: 'Em entrega', DELIVERED: 'Entregue' };

export function renderProductionOrderPrint(order: OperationalSnapshot, paperWidth: 58 | 80 = 80): string {
  validateSnapshot(order, order.canonical.tenantId);
  const lines = [
    `Revisão: ${order.revision}`,
    `Criado em: ${order.canonical.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)`,
    `Cliente: ${order.customer.name}`,
    `Modalidade: ${{ DELIVERY: 'Entrega', PICKUP: 'Retirada', TABLE: 'Mesa' }[order.modality]}`,
    `Pedido: ${orderLabels[order.orderState]}`,
    `Produção: ${productionLabels[order.productionState]}`,
    `Entrega: ${deliveryLabels[order.deliveryState]}`,
    `Pagamento: ${paymentLabels[order.paymentState]} (${order.method})`,
  ];
  if (order.orderState === 'DRAFT') lines.push('AGUARDANDO CONFIRMAÇÃO — NÃO PRODUZIR');
  if (order.orderState === 'CANCELED') lines.push('PEDIDO CANCELADO — NÃO PRODUZIR');
  if (order.checkout?.restaurant) lines.unshift(order.checkout.restaurant);
  if (order.table) lines.push(`Mesa: ${order.table}`);
  if (order.address) {
    const a = order.address;
    lines.push(`Endereço: ${a.street}, ${a.number}`, `Bairro: ${a.district}`);
    if (a.city) lines.push(`Cidade: ${a.city}`);
    if (a.zip) lines.push(`CEP: ${a.zip}`);
    if (a.complement) lines.push(`Complemento: ${a.complement}`);
  }
  if (order.courierId) lines.push(`Entregador (ID): ${order.courierId}`);
  for (const item of order.items) {
    lines.push(`${item.quantity} × ${item.name} (${item.size})`, `Unitário base: ${money(item.unitCents)} · Subtotal: ${money(item.subtotalCents)}`);
    for (const addon of item.addons) lines.push(`Adicional por unidade: ${addon.name} (${money(addon.unitCents)})`);
    for (const removed of item.removed) lines.push(`Retirar: ${removed}`);
    for (const utensil of item.utensils) lines.push(`Utensílio por unidade: ${utensil.name} (${money(utensil.unitCents)})`);
    if (item.observation) lines.push(`Observação: ${item.observation}`);
  }
  lines.push(`Itens: ${money(order.subtotalCents)}`, `Taxa: ${money(order.feeCents)}`, `Desconto: ${money(order.discountCents)}`,
    `Total: ${money(order.totalCents)}`, `Recebido: ${money(order.receivedCents)}`);
  return renderThermalDocument({ mode: 'PRODUCTION', title: 'Pedido', reference: order.canonical.id, lines, paperWidth });
}
