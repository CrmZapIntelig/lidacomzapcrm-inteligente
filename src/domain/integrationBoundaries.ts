import type { CommunicationChannel, MessageContentType, ChannelProvider } from './omnichannel';

/** Local integration boundaries; no event bus or policy execution in UNI-03. */
export interface TimelineEvent {
  id: string;
  tenantId: string;
  contactId: string;
  type: string;
  title: string;
  description: string;
  occurredAt: Date;
  operatorName?: string;
}

export type OpportunityStage = 'RASCUNHO' | 'LEAD' | 'EM_ATENDIMENTO' | 'PEDIDO_GERADO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'PRODUCAO' | 'ENTREGUE' | 'FECHADO' | 'POS_VENDA';
export interface Opportunity {
  id: string;
  contactId: string;
  orderId?: string;
  stage: OpportunityStage;
}

/** Evidence must be supplied by the future policy service, never inferred by UI. */
export interface OutboundMessagingPolicyInput {
  channel: CommunicationChannel;
  provider?: ChannelProvider;
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
  messageType: MessageContentType;
  templateId?: string;
  providerRuleVersion?: string;
  evaluatedAt: Date;
}

// GOOGLE_RCS maps to channel RCS and provider RCS_GOOGLE in the imported contracts.
// DispatchAudience, DispatchQueue and DispatchExecution require evidence and
// explicit design in UNI-05; no queue is constructed from MarketingCampaign here.
