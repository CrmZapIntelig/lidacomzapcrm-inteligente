import {
  adaptClientToContact, adaptClientToConversation,
  adaptCampaignToMarketingCampaign, adaptCrmMessageToDomainMessage,
  adaptCrmOrderToDomainOrder, adaptDeliveryOrderToDomainOrder,
  adaptHistoryToTimelineEvent,
} from '../domain/compatAdapters';
import type { CompatibilityAdapterContext, OrderAdapterOptions } from '../domain/compatAdapters';
import type { Client, Campaign, Message, Order, DeliveryOrder, HistoryEvent, Channel } from '../types';
import type { MarketingCampaign, DispatchCampaign, DispatchQueueEntry } from '../domain/types';
import type { RoutingMode, ProviderCapabilities } from '../domain/omnichannel';
import type { Opportunity, OutboundMessagingPolicyInput } from '../domain/integrationBoundaries';

export type ProjectionResult<T> =
  | { status: 'PROJECTED'; value: T }
  | { status: 'INVALID_INPUT'; reason: string };

function project<T>(operation: () => T): ProjectionResult<T> {
  try { return { status: 'PROJECTED', value: operation() }; }
  catch (error) {
    return { status: 'INVALID_INPUT', reason: error instanceof Error ? error.message : 'Invalid projection input.' };
  }
}

export function getUnifiedContact(client: Client, context: CompatibilityAdapterContext) {
  return project(() => adaptClientToContact(client, context));
}

export interface ConversationContext extends CompatibilityAdapterContext {
  conversationId: string;
  unreadCount: number;
  /** Explicit channel of this conversation; Client.channel is only an origin hint. */
  channel?: Channel;
}

export function getUnifiedConversation(client: Client, messages: readonly Message[], context: ConversationContext) {
  return project(() => {
    const channel = context.channel;
    const known = channel === 'whatsapp' || channel === 'rcs';
    // Reject mixed histories instead of attributing RCS messages to WhatsApp.
    for (const message of messages) {
      if (message.channel && (!known || message.channel !== channel)) {
        throw new Error('Message channel does not match the explicit conversation channel.');
      }
    }
    const projection = adaptClientToConversation({ ...client, channel }, context);
    return {
      conversation: projection.conversation,
      channelStatus: known ? 'KNOWN' as const : 'UNKNOWN' as const,
      messages: messages.map(message => adaptCrmMessageToDomainMessage(message, context)),
      source: client,
    };
  });
}

export function getMarketingCampaign(campaign: Campaign, context: CompatibilityAdapterContext) {
  return project(() => adaptCampaignToMarketingCampaign(campaign, context));
}

/** Application draft contracts, not persisted domain entities or executable queues. */
export interface DispatchAudience {
  id: string;
  tenantId: string;
  marketingCampaignId: string;
  contactIds: readonly string[];
}
export interface DispatchQueue {
  campaignId: string;
  entries: readonly DispatchQueueEntry[];
}
export interface DispatchExecution {
  campaignId: string;
  status: 'NOT_STARTED';
}
export interface DispatchCampaignDraft {
  status: 'DRAFT';
  marketingCampaignId: string;
  campaign: DispatchCampaign;
  audience: DispatchAudience;
  queue: { status: 'NOT_CREATED' };
  execution: DispatchExecution;
}
export interface DispatchDraftOptions {
  dispatchCampaignId: string;
  template: string;
  dailyLimit: number;
  routingMode: RoutingMode;
  preparedAt: Date;
}

export function prepareDispatchCampaignDraft(marketing: MarketingCampaign, audience: DispatchAudience, options: DispatchDraftOptions): ProjectionResult<DispatchCampaignDraft> {
  return project(() => {
    for (const value of [marketing.id, marketing.tenantId, marketing.name, audience.id, options.dispatchCampaignId, options.template]) {
      if (!value?.trim()) throw new Error('Draft identifiers, name and template are required.');
    }
    if (options.dispatchCampaignId === marketing.id) throw new Error('Marketing and dispatch IDs must be distinct.');
    if (audience.tenantId !== marketing.tenantId || audience.marketingCampaignId !== marketing.id) throw new Error('Audience must belong to this marketing campaign and tenant.');
    if (!Number.isInteger(options.dailyLimit) || options.dailyLimit <= 0) throw new Error('dailyLimit must be a positive integer.');
    if (!['WHATSAPP', 'RCS', 'BOTH_SMART'].includes(options.routingMode)) throw new Error('Explicit routing mode is required.');
    if (!(options.preparedAt instanceof Date) || !Number.isFinite(options.preparedAt.getTime())) throw new Error('Valid preparedAt is required.');
    if (audience.contactIds.some(id => !id?.trim()) || new Set(audience.contactIds).size !== audience.contactIds.length) throw new Error('Audience contact IDs must be nonempty and unique.');
    return {
      status: 'DRAFT', marketingCampaignId: marketing.id,
      campaign: {
        id: options.dispatchCampaignId, tenantId: marketing.tenantId,
        name: marketing.name, template: options.template, dailyLimit: options.dailyLimit,
        routingMode: options.routingMode,
        createdAt: new Date(options.preparedAt.getTime()), updatedAt: new Date(options.preparedAt.getTime()),
      },
      audience: { ...audience, contactIds: [...audience.contactIds] },
      queue: { status: 'NOT_CREATED' },
      execution: { campaignId: options.dispatchCampaignId, status: 'NOT_STARTED' },
    };
  });
}

/** Query an explicitly supplied in-memory draft. No storage or execution lookup. */
export function getDispatchCampaignDraft(draft: DispatchCampaignDraft): DispatchCampaignDraft {
  return {
    ...draft, campaign: { ...draft.campaign, createdAt: new Date(draft.campaign.createdAt), updatedAt: new Date(draft.campaign.updatedAt) },
    audience: { ...draft.audience, contactIds: [...draft.audience.contactIds] },
    queue: { ...draft.queue }, execution: { ...draft.execution },
  };
}

export function getUnifiedOrder(order: Order, options: OrderAdapterOptions) {
  return project(() => adaptCrmOrderToDomainOrder(order, options));
}
export function getUnifiedDeliveryOrder(order: DeliveryOrder, options: OrderAdapterOptions) {
  return project(() => {
    if (!['CUSTOMER', 'HUMAN_OPERATOR', 'AI_ASSISTED', 'AUTOMATION'].includes(options.creationMode)) throw new Error('Explicit creation mode is required.');
    return adaptDeliveryOrderToDomainOrder(order, options);
  });
}
export function getUnifiedTimeline(history: readonly HistoryEvent[], context: CompatibilityAdapterContext) {
  return project(() => history.map(event => adaptHistoryToTimelineEvent(event, context)));
}

const stages = ['RASCUNHO', 'LEAD', 'EM_ATENDIMENTO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'PRODUCAO', 'ENTREGUE', 'FECHADO', 'POS_VENDA'];
export function getOpportunity(contactId: string, evidence?: Opportunity):
  | { status: 'ABSENT'; reason: string }
  | ProjectionResult<Opportunity> {
  if (!evidence) return { status: 'ABSENT', reason: 'No explicit opportunity evidence; Client.stage is not an opportunity.' };
  return project(() => {
    if (!evidence.id?.trim() || !contactId?.trim() || evidence.contactId !== contactId || !stages.includes(evidence.stage)) throw new Error('Invalid opportunity evidence.');
    return { ...evidence };
  });
}

export function getFunnelBoundary(opportunity?: Opportunity) {
  return { status: 'NOT_ACTIVATED' as const, stage: opportunity?.stage, effects: 'NONE' as const };
}

export interface MessagingPolicyQuery extends OutboundMessagingPolicyInput {
  currentCapability?: ProviderCapabilities;
}
export function queryMessagingWindowPolicy(_input: MessagingPolicyQuery) {
  // No policy implementation or provider verification exists in UNI-04.
  return { status: 'NOT_EVALUATED' as const, canSend: false as const, reason: 'Provider rules and capability have not been verified.' };
}

/** Stateless opt-in bridge. Importing it does not replace any legacy consumer. */
export const unifiedDomainFacade = {
  getUnifiedContact, getUnifiedConversation, getMarketingCampaign,
  prepareDispatchCampaignDraft, getDispatchCampaignDraft,
  getUnifiedOrder, getUnifiedDeliveryOrder, getUnifiedTimeline,
  getOpportunity, getFunnelBoundary, queryMessagingWindowPolicy,
};
