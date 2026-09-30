import type {
  ChannelProvider,
  CommunicationChannel,
  ContactChannelIdentity,
  ContactImportReport,
  ContactImportSource,
  MessageContentType,
  MessageOriginSurface,
  OrderChannel,
  RoutingMode,
} from './omnichannel';

export type * from './omnichannel';

export type ID = string;

export interface Contact {
  id: ID;
  tenantId: ID;
  name: string;
  phone: string;
  avatar?: string;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactImportCandidate {
  contact: Pick<Contact, 'tenantId' | 'name' | 'phone' | 'avatar' | 'tags' | 'notes'>;
  identities: ContactChannelIdentity[];
}

export interface ContactImportPreview {
  candidates: ContactImportCandidate[];
  report: ContactImportReport;
}

export interface ContactImporter {
  readonly source: ContactImportSource;
  preview(input: unknown): ContactImportPreview;
}

export interface Conversation {
  id: ID;
  tenantId: ID;
  contactId: ID;
  channel?: CommunicationChannel;
  provider?: ChannelProvider;
  externalConversationId?: string;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageSender = 'USER' | 'CONTACT' | 'SYSTEM';

export interface Message {
  id: ID;
  conversationId: ID;
  sender: MessageSender;
  content: string;
  channel?: CommunicationChannel;
  provider?: ChannelProvider;
  providerMessageId?: string;
  originSurface?: MessageOriginSurface;
  contentType?: MessageContentType;
  createdAt: Date;
}

export interface PendingOutboundMessage {
  id: ID;
  conversationId: ID;
  contactId: ID;
  /** References DispatchCampaign, not MarketingCampaign. */
  campaignId: ID;
  queueEntryId: ID;
  content: string;
  createdAt: Date;
}

/** Commercial planning. It does not create a dispatch queue by itself. */
export interface MarketingCampaign {
  id: ID;
  tenantId: ID;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatchCampaign {
  id: ID;
  tenantId: ID;
  name: string;
  template: string;
  dailyLimit: number;
  /** Missing policy does not imply permission to send. */
  routingMode?: RoutingMode;
  createdAt: Date;
  updatedAt: Date;
}

export type DispatchQueueStatus = 'QUEUED' | 'DRAFT_PREPARED' | 'SENT' | 'REPLIED' | 'FAILED' | 'SKIPPED';

export interface DispatchQueueIdentity {
  id: ID;
  campaignId: ID;
  contactId: ID;
}

export interface DispatchQueueEntry {
  id: ID;
  /** References DispatchCampaign, not MarketingCampaign. */
  campaignId: ID;
  contactId: ID;
  position: number;
  status: DispatchQueueStatus;
  attempts: number;
  createdAt: Date;
  preparedAt?: Date;
  sentAt?: Date;
  repliedAt?: Date;
}

export type OrderEntryPoint = 'DIGITAL_MENU' | 'CHAT' | 'POS' | 'TABLE_QR';
export type OrderCreationMode = 'CUSTOMER' | 'HUMAN_OPERATOR' | 'AI_ASSISTED' | 'AUTOMATION';
export type OrderStatus = 'CREATED' | 'PAID' | 'CANCELED';

export interface Order {
  id: ID;
  tenantId: ID;
  contactId: ID;
  entryPoint: OrderEntryPoint;
  channel: OrderChannel;
  creationMode: OrderCreationMode;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
  conversationId?: ID;
  dispatchCampaignId?: ID;
  queueEntryId?: ID;
}

export interface OrderItem {
  id: ID;
  orderId: ID;
  productId: ID;
  productName: string;
  quantity: number;
  price: number;
  observation?: string;
}
