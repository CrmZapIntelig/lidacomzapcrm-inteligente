/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Client,
  CustomerCommercialClassification,
  CustomerCommercialProfile,
  DeliveryOrder,
  Order,
} from '../types';

interface CommercialOrderSnapshot {
  clientId: string;
  clientName: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  products: { name: string; quantity: number }[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface CommercialRulesConfig {
  daysRisk: number;
  daysInactive: number;
  vipMinSpent: number;
  vipMinOrders: number;
}

export const DEFAULT_COMMERCIAL_RULES: CommercialRulesConfig = {
  daysRisk: 30,
  daysInactive: 90,
  vipMinSpent: 1000,
  vipMinOrders: 10,
};

export function generateCustomerCommercialProfiles(
  clients: Client[],
  orders: Order[],
  deliveryOrders: DeliveryOrder[],
  rules: CommercialRulesConfig = DEFAULT_COMMERCIAL_RULES
): CustomerCommercialProfile[] {
  const normalizedOrders = [
    ...orders
      .filter((order) => order.status !== 'Cancelado')
      .map(normalizeCrmOrder),
    ...deliveryOrders
      .filter((order) => order.status !== 'FECHADO' || order.total > 0)
      .map(normalizeDeliveryOrder),
  ];

  return clients
    .map((client) => buildCustomerProfile(
      client,
      normalizedOrders.filter((order) => order.clientId === client.id),
      rules
    ))
    .sort((a, b) => b.score - a.score || b.totalSpent - a.totalSpent);
}

function normalizeCrmOrder(order: Order): CommercialOrderSnapshot {
  return {
    clientId: order.clientId,
    clientName: order.clientName,
    total: order.total || 0,
    paymentMethod: order.paymentMethod || 'Não informado',
    createdAt: order.createdAt,
    products: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
    })),
  };
}

function normalizeDeliveryOrder(order: DeliveryOrder): CommercialOrderSnapshot {
  return {
    clientId: order.clientId,
    clientName: order.clientName,
    total: order.total || 0,
    paymentMethod: order.paymentMethod || 'Não informado',
    createdAt: order.createdAt,
    products: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
    })),
  };
}

function buildCustomerProfile(
  client: Client,
  customerOrders: CommercialOrderSnapshot[],
  rules: CommercialRulesConfig
): CustomerCommercialProfile {
  const sortedOrders = [...customerOrders].sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
  const totalOrders = sortedOrders.length;
  const totalSpent = sortedOrders.reduce((sum, order) => sum + order.total, 0);
  const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const firstPurchase = sortedOrders[0]?.createdAt || null;
  const lastPurchase = sortedOrders[totalOrders - 1]?.createdAt || null;
  const daysWithoutPurchase = lastPurchase ? calculateDaysWithoutPurchase(lastPurchase) : null;
  const favoritePaymentMethod = getMostFrequent(sortedOrders.map((order) => normalizePaymentMethod(order.paymentMethod))) || 'Não informado';
  const favoriteProducts = getFavoriteProducts(sortedOrders);
  const preferredPurchaseTime = getPreferredPurchaseTime(sortedOrders);
  const preferredWeekday = getPreferredWeekday(sortedOrders);
  const purchaseFrequency = calculatePurchaseFrequency(firstPurchase, lastPurchase, totalOrders);
  const score = calculateScore(totalOrders, totalSpent, daysWithoutPurchase);
  const classification = classifyCustomer(totalSpent, totalOrders, daysWithoutPurchase, rules);
  const segments = generateAutomaticSegments({
    totalOrders,
    totalSpent,
    averageTicket,
    daysWithoutPurchase,
    favoritePaymentMethod,
    preferredPurchaseTime,
    preferredWeekday,
    score,
    classification,
  }, rules);

  return {
    customerId: client.id,
    customerName: client.name,
    totalOrders,
    totalSpent,
    averageTicket,
    lastPurchase,
    daysWithoutPurchase,
    firstPurchase,
    favoritePaymentMethod,
    favoriteProducts,
    preferredPurchaseTime,
    preferredWeekday,
    purchaseFrequency,
    score,
    classification,
    segments,
  };
}

function calculateScore(totalOrders: number, totalSpent: number, daysWithoutPurchase: number | null) {
  const recencyScore = daysWithoutPurchase === null
    ? 0
    : daysWithoutPurchase <= 7
      ? 30
      : daysWithoutPurchase <= 15
        ? 24
        : daysWithoutPurchase <= 30
          ? 16
          : daysWithoutPurchase <= 60
            ? 8
            : 0;

  const frequencyScore = Math.min(30, totalOrders * 3);
  const valueScore = Math.min(20, Math.floor(totalSpent / 50));
  const quantityScore = Math.min(20, totalOrders * 2);

  return Math.max(0, Math.min(100, recencyScore + frequencyScore + valueScore + quantityScore));
}

function classifyCustomer(
  totalSpent: number,
  totalOrders: number,
  daysWithoutPurchase: number | null,
  rules: CommercialRulesConfig
): CustomerCommercialClassification {
  if (daysWithoutPurchase !== null && daysWithoutPurchase > rules.daysInactive) return 'PERDIDO';
  if (daysWithoutPurchase !== null && daysWithoutPurchase > rules.daysRisk) return 'EM RISCO';
  if (totalSpent >= rules.vipMinSpent && totalOrders >= rules.vipMinOrders) return 'VIP';
  if (totalOrders > rules.vipMinOrders) return 'RECORRENTE';
  if (totalOrders <= 1) return 'NOVO';
  return 'ATIVO';
}

function generateAutomaticSegments(profile: {
  totalOrders: number;
  totalSpent: number;
  averageTicket: number;
  daysWithoutPurchase: number | null;
  favoritePaymentMethod: string;
  preferredPurchaseTime: string;
  preferredWeekday: string;
  score: number;
  classification: CustomerCommercialClassification;
}, rules: CommercialRulesConfig) {
  const segments = new Set<string>();

  if (
    profile.classification === 'VIP'
    || (profile.totalSpent >= rules.vipMinSpent && profile.totalOrders >= rules.vipMinOrders)
  ) {
    segments.add('VIP');
  }
  if (profile.totalOrders > 5) segments.add('Clientes Frequentes');
  if (profile.totalOrders <= 1) segments.add('Clientes Novos');
  if ((profile.daysWithoutPurchase ?? 0) > rules.daysRisk) segments.add('Clientes Inativos');
  if ((profile.daysWithoutPurchase ?? 0) > rules.daysInactive) segments.add('Clientes Perdidos');
  if (profile.averageTicket >= 80) segments.add('Clientes Alto Ticket');
  if (profile.favoritePaymentMethod === 'Pix') segments.add('Clientes PIX');
  if (profile.favoritePaymentMethod.includes('Cartão')) segments.add('Clientes Cartão');
  if (profile.favoritePaymentMethod === 'Dinheiro') segments.add('Clientes Dinheiro');
  if (profile.preferredPurchaseTime === 'Almoço') segments.add('Almoço');
  if (profile.preferredPurchaseTime === 'Jantar') segments.add('Jantar');
  if (profile.preferredWeekday === 'sábado' || profile.preferredWeekday === 'domingo') segments.add('Fim de Semana');

  return Array.from(segments);
}

function calculateDaysWithoutPurchase(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / MS_PER_DAY));
}

function calculatePurchaseFrequency(firstPurchase: string | null, lastPurchase: string | null, totalOrders: number) {
  if (!firstPurchase || !lastPurchase || totalOrders <= 1) return 0;
  const daysBetween = Math.max(1, Math.ceil((getTime(lastPurchase) - getTime(firstPurchase)) / MS_PER_DAY));
  return Number((totalOrders / daysBetween).toFixed(2));
}

function getFavoriteProducts(orders: CommercialOrderSnapshot[]) {
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    order.products.forEach((product) => {
      counts.set(product.name, (counts.get(product.name) || 0) + product.quantity);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

function getPreferredPurchaseTime(orders: CommercialOrderSnapshot[]) {
  const labels = orders.map((order) => {
    const hour = new Date(order.createdAt).getHours();
    if (hour >= 11 && hour < 15) return 'Almoço';
    if (hour >= 18 && hour < 23) return 'Jantar';
    if (hour >= 6 && hour < 11) return 'Manhã';
    if (hour >= 15 && hour < 18) return 'Tarde';
    return 'Noite';
  });

  return getMostFrequent(labels) || 'Não identificado';
}

function getPreferredWeekday(orders: CommercialOrderSnapshot[]) {
  const weekdays = orders.map((order) =>
    new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'long' })
  );

  return getMostFrequent(weekdays) || 'Não identificado';
}

function getMostFrequent(values: string[]) {
  const counts = new Map<string, number>();

  values
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function normalizePaymentMethod(method: string) {
  if (method.includes('Cartão') || method === 'Cartão') return 'Cartão';
  return method;
}

function getTime(dateValue: string) {
  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}
