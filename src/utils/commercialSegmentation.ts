import { Client, CustomerCommercialProfile, DeliveryOrder, Order } from '../types';

export const generateCustomerCommercialProfiles = (
  clients: Client[],
  orders: Order[],
  deliveryOrders: DeliveryOrder[] = []
): CustomerCommercialProfile[] => {
  const allOrders = [...orders, ...deliveryOrders];

  return clients.map((client) => {
    const customerOrders = allOrders.filter((order) => order.clientId === client.id);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastPurchase = customerOrders.length > 0
      ? customerOrders.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]?.createdAt ?? null
      : null;
    const daysWithoutPurchase = lastPurchase
      ? Math.max(0, Math.round((Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      customerId: client.id,
      customerName: client.name,
      totalOrders,
      totalSpent,
      averageTicket,
      lastPurchase,
      daysWithoutPurchase,
      firstPurchase: client.lastPurchaseDate ?? null,
      favoritePaymentMethod: client.tags.includes('Pix') ? 'Pix' : 'Dinheiro',
      favoriteProducts: client.tags.length > 0 ? client.tags : ['Sem histórico'],
      preferredPurchaseTime: '14:00',
      preferredWeekday: 'Segunda',
      purchaseFrequency: totalOrders,
      score: Math.max(0, Math.min(100, Math.round(totalSpent / 10))),
      classification: totalSpent > 1000 ? 'VIP' : totalOrders > 0 ? 'ATIVO' : 'NOVO',
      segments: client.tags,
    };
  });
};
