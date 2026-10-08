/** Domain contracts from Gestao Inteligente. No SDK or persistence dependency. */
export type CommunicationChannel = 'WHATSAPP' | 'RCS';
export type OrderChannel = CommunicationChannel | 'NONE';

export type ChannelProvider =
  | 'WHATSAPP_META_OFFICIAL'
  | 'WHATSAPP_EVOLUTION_OPTIONAL'
  | 'RCS_GOOGLE';

export type ChannelAvailability = 'UNKNOWN' | 'KNOWN_AVAILABLE' | 'KNOWN_UNAVAILABLE';
export type ChannelEligibility = 'UNKNOWN' | 'ELIGIBLE' | 'INELIGIBLE';

export type CapabilitySource =
  | 'WHATSAPP_SYNC'
  | 'RCS_CAPABILITY_CHECK'
  | 'PROVIDER_EVENT'
  | 'DELIVERY_RESULT'
  | 'IMPORT'
  | 'MANUAL'
  | 'UNKNOWN';

export type EligibilitySource =
  | 'POLICY'
  | 'PROVIDER'
  | 'CONSENT'
  | 'CONFIGURATION'
  | 'MANUAL'
  | 'UNKNOWN';

export interface ContactChannelIdentity {
  /** Opaque internal ID, not a phone number or provider address. */
  id: string;
  tenantId: string;
  contactId: string;
  channel: CommunicationChannel;
  provider?: ChannelProvider;
  address: string;
  availability: ChannelAvailability;
  availabilitySource: CapabilitySource;
  eligibility: ChannelEligibility;
  eligibilitySource?: EligibilitySource;
  providerIdentityId?: string;
  lastCapabilityCheckAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelCapability =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'TEMPLATE'
  | 'RICH_MEDIA'
  | 'DELIVERY_RECEIPT'
  | 'READ_RECEIPT'
  | 'MESSAGE_ECHO'
  | 'CONTACT_SYNC'
  | 'PRESENCE'
  | 'CATALOG';

export interface ProviderCapabilities {
  channel: CommunicationChannel;
  provider: ChannelProvider;
  capabilities: readonly ChannelCapability[];
  observedAt: Date;
  source: CapabilitySource;
}

export type MessageOriginSurface =
  | 'PLATFORM'
  | 'WHATSAPP_BUSINESS_APP'
  | 'PROVIDER'
  | 'CUSTOMER';

export type MessageContentType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM' | 'RICH_CONTENT';

export interface ExternalMessageReference {
  provider: ChannelProvider;
  providerMessageId: string;
}

export type ContactImportSource = 'WHATSAPP_COEXISTENCE' | 'EXCEL' | 'CSV' | 'GOOGLE_CONTACTS';

export type ContactImportTechnicalReasonCode =
  | 'INVALID_RECORD'
  | 'DUPLICATE_CONTACT'
  | 'INVALID_CHANNEL_IDENTITY'
  | 'UNSUPPORTED_SOURCE_DATA';

export interface ContactImportTechnicalReason {
  code: ContactImportTechnicalReasonCode;
  count: number;
}

export interface ContactImportReport {
  operationId: string;
  importId: string;
  source: ContactImportSource;
  found: number;
  valid: number;
  rejected: number;
  duplicate: number;
  technicalReasons: readonly ContactImportTechnicalReason[];
  startedAt: Date;
  completedAt: Date;
}

export type RoutingMode = 'WHATSAPP' | 'RCS' | 'BOTH_SMART';

export type RoutingReason =
  | 'WHATSAPP_SELECTED'
  | 'RCS_SELECTED'
  | 'WHATSAPP_UNAVAILABLE_FALLBACK_RCS'
  | 'WHATSAPP_INELIGIBLE_FALLBACK_RCS'
  | 'NO_ELIGIBLE_CHANNEL'
  | 'REQUESTED_CHANNEL_UNAVAILABLE'
  | 'REQUESTED_CHANNEL_INELIGIBLE';

export interface RoutingDecision {
  contactId: string;
  requestedMode: RoutingMode;
  selectedChannel: CommunicationChannel | null;
  selectedProvider?: ChannelProvider;
  reason: RoutingReason;
  evaluatedAt: Date;
}
