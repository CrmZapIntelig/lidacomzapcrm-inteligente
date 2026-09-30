import type {
  Campaign as CrmCampaign,
  Channel as CrmChannel,
  Client as CrmClient,
  DeliveryOrder as CrmDeliveryOrder,
  DeliveryOrderItem as CrmDeliveryOrderItem,
  HistoryEvent,
  Message as CrmMessage,
  Order as CrmOrder,
  OrderItem as CrmOrderItem,
} from '../types';
import type {
  Contact,
  ContactChannelIdentity,
  Conversation,
  DispatchCampaign,
  MarketingCampaign,
  Message,
  MessageContentType,
  MessageSender,
  Order,
  OrderChannel,
  OrderCreationMode,
  OrderEntryPoint,
  OrderItem,
  OrderStatus,
} from './types';
import type {
  ChannelEligibility,
  CommunicationChannel,
  EligibilitySource,
  RoutingMode,
} from './omnichannel';
import type { TimelineEvent } from './integrationBoundaries';

export interface CompatibilityAdapterContext {
  tenantId: string;
  observedAt?: Date | string;
}

export interface ClientContactProjection {
  contact: Contact;
  identities: ContactChannelIdentity[];
  source: CrmClient;
}

export interface CampaignProjection {
  marketingCampaign: MarketingCampaign;
  source: CrmCampaign;
}

export interface DispatchCampaignProjection {
  dispatchCampaign: DispatchCampaign;
  source: CrmCampaign;
}

export interface MessageProjection {
  message: Message;
  source: CrmMessage;
}

export interface OrderProjection<TSource extends CrmOrder | CrmDeliveryOrder = CrmOrder | CrmDeliveryOrder> {
  order: Order;
  items: OrderItem[];
  source: TSource;
}

export interface ConversationProjection {
  conversation: Conversation;
  source: CrmClient;
}

export interface DispatchAdapterOptions extends CompatibilityAdapterContext {
  dailyLimit: number;
}

export interface MessageAdapterOptions extends CompatibilityAdapterContext {
  conversationId: string;
}

export interface OrderAdapterOptions extends CompatibilityAdapterContext {
  contactId?: string;
  conversationId?: string;
  dispatchCampaignId?: string;
  queueEntryId?: string;
  creationMode: OrderCreationMode;
  entryPoint?: OrderEntryPoint;
}

export function adaptClientToContact(
  client: CrmClient,
  context: CompatibilityAdapterContext
): ClientContactProjection {
  const tenantId = requireTenantId(context.tenantId);
  const observedAt = requireDate(context.observedAt, 'context.observedAt');
  const contact: Contact = {
    id: client.id,
    tenantId,
    name: requireText(client.name, 'client.name'),
    phone: normalizeLegacyPhone(client.phone),
    avatar: client.avatar,
    tags: [...(client.tags ?? [])],
    notes: (client.notes ?? []).join('\n'),
    createdAt: observedAt,
    updatedAt: observedAt,
  };

  return {
    contact,
    identities: buildContactChannelIdentities(client, tenantId, observedAt),
    source: client,
  };
}

export function adaptClientToConversation(
  client: CrmClient,
  context: CompatibilityAdapterContext & { conversationId: string; unreadCount: number }
): ConversationProjection {
  const tenantId = requireTenantId(context.tenantId);
  const observedAt = requireDate(context.observedAt, 'context.observedAt');
  const channel = mapCrmChannelToCommunicationChannel(client.channel);
  if (!Number.isInteger(context.unreadCount) || context.unreadCount < 0) throw new Error('unreadCount must be a non-negative integer.');

  return {
    conversation: {
      id: requireText(context.conversationId, 'conversationId'),
      tenantId,
      contactId: client.id,
      channel,
      provider: undefined,
      unreadCount: context.unreadCount,
      createdAt: observedAt,
      updatedAt: observedAt,
    },
    source: client,
  };
}

export function adaptCampaignToMarketingCampaign(
  campaign: CrmCampaign,
  context: CompatibilityAdapterContext
): CampaignProjection {
  const createdAt = requireDate(campaign.createdAt, 'campaign.createdAt');
  const updatedAt = parseOptionalDate(campaign.updatedAt, 'campaign.updatedAt') ?? createdAt;

  return {
    marketingCampaign: {
      id: campaign.id,
      tenantId: requireTenantId(context.tenantId),
      name: requireText(campaign.name, 'campaign.name'),
      createdAt,
      updatedAt,
    },
    source: campaign,
  };
}

export function adaptCampaignToDispatchCampaign(
  campaign: CrmCampaign,
  options: DispatchAdapterOptions
): DispatchCampaignProjection {
  if (!Number.isFinite(options.dailyLimit) || options.dailyLimit <= 0) {
    throw new Error('dailyLimit must be a positive number.');
  }

  const createdAt = requireDate(campaign.createdAt, 'campaign.createdAt');
  const updatedAt = parseOptionalDate(campaign.updatedAt, 'campaign.updatedAt') ?? createdAt;

  return {
    dispatchCampaign: {
      id: `dispatch:${campaign.id}`,
      tenantId: requireTenantId(options.tenantId),
      name: campaign.name,
      template: campaign.messageTemplate,
      dailyLimit: options.dailyLimit,
      routingMode: mapCrmChannelToRoutingMode(campaign.channel),
      createdAt,
      updatedAt,
    },
    source: campaign,
  };
}

export function adaptCrmMessageToDomainMessage(
  message: CrmMessage,
  options: MessageAdapterOptions
): MessageProjection {
  return {
    message: {
      id: message.id,
      conversationId: requireText(options.conversationId, 'conversationId'),
      sender: mapCrmMessageSender(message.sender),
      content: message.text,
      channel: mapCrmChannelToCommunicationChannel(message.channel),
      contentType: mapCrmMessageContentType(message.type),
      createdAt: requireDate(message.timestamp, 'message.timestamp'),
    },
    source: message,
  };
}

export function adaptCrmOrderToDomainOrder(
  order: CrmOrder,
  options: OrderAdapterOptions
): OrderProjection<CrmOrder> {
  if (!['CUSTOMER', 'HUMAN_OPERATOR', 'AI_ASSISTED', 'AUTOMATION'].includes(options.creationMode)) throw new Error('creationMode is required.');
  const createdAt = requireDate(order.createdAt, 'order.createdAt');
  const channel = mapCrmChannelToOrderChannel(order.channel);

  return {
    order: {
      id: order.id,
      tenantId: requireTenantId(options.tenantId),
      contactId: options.contactId ?? order.clientId,
      entryPoint: mapCrmChannelToOrderEntryPoint(order.channel, options.entryPoint),
      channel,
      creationMode: options.creationMode,
      total: order.total,
      status: mapCrmOrderStatus(order.status),
      paymentMethod: order.paymentMethod,
      createdAt,
      updatedAt: createdAt,
      conversationId: options.conversationId,
      dispatchCampaignId: options.dispatchCampaignId,
      queueEntryId: options.queueEntryId,
    },
    items: order.items.map((item) => adaptCrmOrderItem(item, order.id)),
    source: order,
  };
}

export function adaptDeliveryOrderToDomainOrder(
  order: CrmDeliveryOrder,
  options: OrderAdapterOptions
): OrderProjection<CrmDeliveryOrder> {
  const createdAt = requireDate(order.createdAt, 'deliveryOrder.createdAt');
  const channel = mapCrmChannelToOrderChannel(order.channel);

  return {
    order: {
      id: order.id,
      tenantId: requireTenantId(options.tenantId),
      contactId: options.contactId ?? order.clientId,
      entryPoint: mapCrmChannelToOrderEntryPoint(order.channel, options.entryPoint),
      channel,
      creationMode: options.creationMode,
      total: order.total,
      status: mapDeliveryOrderStatus(order.status),
      paymentMethod: order.paymentMethod,
      createdAt,
      updatedAt: createdAt,
      conversationId: options.conversationId,
      dispatchCampaignId: options.dispatchCampaignId,
      queueEntryId: options.queueEntryId,
    },
    items: order.items.map((item, index) => adaptDeliveryOrderItem(item, order.id, index)),
    source: order,
  };
}

export function mapCrmChannelToCommunicationChannel(
  channel?: CrmChannel
): CommunicationChannel | undefined {
  if (channel === 'whatsapp') return 'WHATSAPP';
  if (channel === 'rcs') return 'RCS';
  return undefined;
}

export function mapCrmChannelToRoutingMode(channel?: CrmChannel): RoutingMode | undefined {
  if (channel === 'whatsapp') return 'WHATSAPP';
  if (channel === 'rcs') return 'RCS';
  if (channel === 'ambos') return 'BOTH_SMART';
  return undefined;
}

function buildContactChannelIdentities(
  client: CrmClient,
  tenantId: string,
  observedAt: Date
): ContactChannelIdentity[] {
  const address = normalizeLegacyPhone(client.phone);
  if (!address) return [];

  const channels = getIdentityChannels(client.channel);
  return channels.map((channel) => ({
    id: `identity:${client.id}:${channel.toLowerCase()}`,
    tenantId,
    contactId: client.id,
    channel,
    provider: undefined,
    address,
    availability: 'UNKNOWN',
    availabilitySource: 'IMPORT',
    eligibility: mapClientEligibility(client),
    eligibilitySource: mapClientEligibilitySource(client),
    createdAt: observedAt,
    updatedAt: observedAt,
  }));
}

function getIdentityChannels(channel?: CrmChannel): CommunicationChannel[] {
  if (channel === 'whatsapp') return ['WHATSAPP'];
  if (channel === 'rcs') return ['RCS'];
  if (channel === 'ambos') return ['WHATSAPP', 'RCS'];
  return [];
}

function mapClientEligibility(client: CrmClient): ChannelEligibility {
  if (client.type === 'bloqueado' || client.type === 'grupo') return 'INELIGIBLE';

  const preferences = client.contactPreferences;
  if (preferences?.globalStatus === 'blocked') return 'INELIGIBLE';
  if (preferences?.marketingStatus === 'denied' || preferences?.marketingStatus === 'revoked') {
    return 'INELIGIBLE';
  }
  if (preferences?.marketingStatus === 'allowed') {
    return 'ELIGIBLE';
  }

  return 'UNKNOWN';
}

function mapClientEligibilitySource(client: CrmClient): EligibilitySource | undefined {
  if (!client.contactPreferences) return undefined;
  if (client.contactPreferences.source === 'customer-request') return 'CONSENT';
  if (client.contactPreferences.source === 'operator-entry') return 'MANUAL';
  if (client.contactPreferences.source === 'existing-record') return 'CONFIGURATION';
  return 'UNKNOWN';
}

function mapCrmChannelToOrderChannel(channel?: CrmChannel): OrderChannel {
  const communicationChannel = mapCrmChannelToCommunicationChannel(channel);
  return communicationChannel ?? 'NONE';
}

function mapCrmChannelToOrderEntryPoint(
  channel: CrmChannel | undefined,
  fallback: OrderEntryPoint | undefined
): OrderEntryPoint {
  if (channel === 'delivery') return 'DIGITAL_MENU';
  if (channel === 'balcao') return 'POS';
  if (channel === 'mesa_qr') return 'TABLE_QR';
  if (channel === 'whatsapp' || channel === 'rcs' || channel === 'ambos') return 'CHAT';
  if (!fallback) throw new Error("entryPoint is required for unknown order channel.");
  return fallback;
}

function mapCrmOrderStatus(status: CrmOrder['status']): OrderStatus {
  if (status === 'Pago') return 'PAID';
  if (status === 'Cancelado') return 'CANCELED';
  return 'CREATED';
}

function mapDeliveryOrderStatus(status: CrmDeliveryOrder['status']): OrderStatus {
  if (status === 'FECHADO') return 'PAID';
  return 'CREATED';
}

function mapCrmMessageSender(sender: CrmMessage['sender']): MessageSender {
  if (sender === 'cliente') return 'CONTACT';
  if (sender === 'operador') return 'USER';
  return 'SYSTEM';
}

function mapCrmMessageContentType(type: CrmMessage['type']): MessageContentType {
  if (type === 'image') return 'IMAGE';
  if (type === 'audio') return 'AUDIO';
  if (type === 'file') return 'DOCUMENT';
  return 'TEXT';
}

function adaptCrmOrderItem(item: CrmOrderItem, orderId: string): OrderItem {
  return {
    id: item.id,
    orderId,
    productId: item.id,
    productName: item.productName,
    quantity: item.quantity,
    price: item.price,
  };
}

function adaptDeliveryOrderItem(item: CrmDeliveryOrderItem, orderId: string, index: number): OrderItem {
  return {
    id: `${orderId}:item:${index + 1}`,
    orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    price: item.quantity > 0 ? item.subtotal / item.quantity : invalidQuantity(),
    observation: item.observation,
  };
}

function requireTenantId(tenantId: string): string {
  return requireText(tenantId, 'tenantId');
}

function requireText(value: string | undefined, field: string): string {
  const text = value?.trim();
  if (!text) throw new Error(`${field} is required.`);
  return text;
}

function requireDate(value: Date | string | undefined, field: string): Date {
  if (!value) throw new Error(`${field} is required.`);

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date.`);
  }

  return date;
}

function parseOptionalDate(value: Date | string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  return requireDate(value, field);
}

function invalidQuantity(): never { throw new Error('delivery item quantity must be positive.'); }

/** Only explicit international numbers are normalized; no country code is inferred. */
export function normalizeLegacyPhone(phone?: string): string {
  if (!phone?.trim()) return '';
  const normalized = phone.trim().replace(/[ ()-]/g, '').replace(/^00/, '+');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error('phone requires an explicit international country code.');
  return normalized;
}

export function adaptHistoryToTimelineEvent(history: HistoryEvent, context: CompatibilityAdapterContext): { event: TimelineEvent; source: HistoryEvent } {
  return { event: { id: requireText(history.id, 'history.id'), tenantId: requireTenantId(context.tenantId), contactId: requireText(history.clientId, 'history.clientId'), type: history.type, title: history.title, description: history.description, occurredAt: requireDate(history.timestamp, 'history.timestamp'), operatorName: history.operatorName }, source: history };
}
