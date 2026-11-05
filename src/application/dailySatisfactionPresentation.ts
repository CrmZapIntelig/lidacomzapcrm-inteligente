import type { Client } from '../types';
import type { ChannelProvider } from '../domain/omnichannel';
import type { OperationalSnapshot } from './productionOrders';
import type { DeliveredOrderFact, SatisfactionContactPolicy } from './dailySatisfactionAudience';

export type SatisfactionWhatsAppProvider = Extract<ChannelProvider, 'WHATSAPP_META_OFFICIAL' | 'WHATSAPP_EVOLUTION_OPTIONAL'>;

export interface SatisfactionOperationalInput {
  deliveries: DeliveredOrderFact[];
  policies: SatisfactionContactPolicy[];
  missingDeliveryEvidence: { orderId: string; contactId: string }[];
}

export function satisfactionBusinessDate(value: string, timeZone: string) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) throw new Error('SATISFACTION_TIME_ZONE_INVALID');
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0)); } catch { throw new Error('SATISFACTION_TIME_ZONE_INVALID'); }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('SATISFACTION_DELIVERY_DATE_INVALID');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function policyForClient(tenantId: string, client: Client, whatsappProvider: SatisfactionWhatsAppProvider): SatisfactionContactPolicy {
  const preferences = client.contactPreferences;
  const supportsWhatsApp = client.channel === 'whatsapp' || client.channel === 'ambos';
  const supportsRcs = client.channel === 'rcs' || client.channel === 'ambos';
  const preferred = preferences?.preferredChannel;
  const channel = preferred === 'rcs' && supportsRcs ? 'RCS'
    : preferred === 'whatsapp' && supportsWhatsApp ? 'WHATSAPP'
      : supportsRcs && !supportsWhatsApp ? 'RCS' : 'WHATSAPP';
  const preferenceDenied = preferred === 'none';
  const channelAvailable = !preferenceDenied
    && client.phone.trim().length > 0
    && (channel === 'RCS' ? supportsRcs : supportsWhatsApp);
  const blocked = client.type === 'bloqueado' || client.type === 'grupo' || preferences?.globalStatus === 'blocked';
  const operationalConsent = preferences?.operationalStatus === 'allowed' ? 'ALLOWED'
    : preferences?.operationalStatus === 'denied' ? 'DENIED' : 'UNKNOWN';
  return {
    tenantId,
    contactId: client.id,
    blocked,
    operationalConsent,
    channel,
    provider: channel === 'RCS' ? 'RCS_GOOGLE' : whatsappProvider,
    channelAvailable,
  };
}

/** Converts current CRM/order state into review-only satisfaction inputs. It never grants dispatch authority. */
export function buildSatisfactionOperationalInput(input: {
  tenantId: string;
  orders: readonly OperationalSnapshot[];
  clients: readonly Client[];
  whatsappProvider: SatisfactionWhatsAppProvider;
}): SatisfactionOperationalInput {
  const deliveries: DeliveredOrderFact[] = [];
  const missingDeliveryEvidence: SatisfactionOperationalInput['missingDeliveryEvidence'] = [];
  for (const order of input.orders) {
    if (order.canonical.tenantId !== input.tenantId) throw new Error('SATISFACTION_ORDER_TENANT_INVALID');
    if (order.deliveryState !== 'DELIVERED') continue;
    if (!order.deliveredAt) {
      missingDeliveryEvidence.push({ orderId: order.canonical.id, contactId: order.canonical.contactId });
      continue;
    }
    deliveries.push({ tenantId: input.tenantId, orderId: order.canonical.id, contactId: order.canonical.contactId, deliveredAt: order.deliveredAt, state: 'DELIVERED' });
  }
  return {
    deliveries,
    policies: input.clients.map(client => policyForClient(input.tenantId, client, input.whatsappProvider)),
    missingDeliveryEvidence,
  };
}
