/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppSettings,
  Campaign,
  CampaignExecutionPreview,
  CampaignExecutionPreviewStatus,
  CampaignTemplate,
  Client,
  CommercialAudienceOption,
  CustomerCommercialProfile,
  PreparedCampaignMessage,
} from '../types';

interface ResolvedTemplate {
  status: CampaignExecutionPreviewStatus;
  template?: CampaignTemplate;
  content: string;
  usedSnapshot: boolean;
  message?: string;
}

interface ResolvedRecipient {
  profile: CustomerCommercialProfile;
  phone?: string;
}

const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
let lastGeneratedAtTime = 0;

export function prepareCampaignExecutionPreview(
  campaign: Campaign,
  templates: CampaignTemplate[],
  audiences: CommercialAudienceOption[],
  profiles: CustomerCommercialProfile[],
  clients: Client[],
  settings?: AppSettings
): CampaignExecutionPreview {
  const generatedAt = getGeneratedAt();
  const audience = audiences.find((item) => item.id === campaign.segmentId);
  const templateResult = resolveTemplate(campaign, templates);

  const basePreview = (
    status: CampaignExecutionPreviewStatus,
    message: string,
    template = templateResult.template,
    usedSnapshot = templateResult.usedSnapshot
  ): CampaignExecutionPreview => ({
    status,
    campaign,
    template,
    audience,
    generatedAt,
    totalRecipients: 0,
    validMessagesCount: 0,
    invalidMessagesCount: 0,
    preparedMessages: [],
    unresolvedVariables: [],
    message,
    usedSnapshot,
  });

  if (!audience) {
    return basePreview('audience-not-found', 'Público da campanha não encontrado.');
  }

  if (audience.source === 'manual') {
    return basePreview(
      'manual-audience-unresolved',
      'Este segmento manual ainda não possui uma regra ou lista de clientes associada.'
    );
  }

  const recipients = resolveRecipients(audience, profiles, clients);

  if (recipients.length === 0) {
    return basePreview('no-recipients', 'Nenhum cliente pertence a este público no momento.');
  }

  if (templateResult.status !== 'ready' && templateResult.status !== 'ready-with-snapshot') {
    return basePreview(
      templateResult.status,
      templateResult.message || 'Não foi possível preparar a campanha.',
      templateResult.template,
      templateResult.usedSnapshot
    );
  }

  const preparedMessages = recipients.map((recipient) => buildPreparedMessage({
    campaign,
    audience,
    recipient,
    content: templateResult.content,
    settings,
  }));
  const unresolvedVariables = unique(preparedMessages.flatMap((message) => message.unresolvedVariables));
  const validMessagesCount = preparedMessages.filter((message) => message.valid).length;
  const invalidMessagesCount = preparedMessages.length - validMessagesCount;

  return {
    status: templateResult.status,
    campaign,
    template: templateResult.template,
    audience,
    generatedAt,
    totalRecipients: preparedMessages.length,
    validMessagesCount,
    invalidMessagesCount,
    preparedMessages,
    unresolvedVariables,
    usedSnapshot: templateResult.usedSnapshot,
    message: templateResult.usedSnapshot ? 'Conteúdo carregado do snapshot textual da campanha.' : undefined,
  };
}

function resolveTemplate(campaign: Campaign, templates: CampaignTemplate[]): ResolvedTemplate {
  const snapshotContent = campaign.messageTemplate.trim();

  if (campaign.templateId) {
    const template = templates.find((item) => item.id === campaign.templateId);

    if (template) {
      if (template.active === false) {
        return {
          status: 'template-inactive',
          template,
          content: '',
          usedSnapshot: false,
          message: 'O template selecionado está inativo.',
        };
      }

      if (!template.message.trim()) {
        return {
          status: 'template-empty',
          template,
          content: '',
          usedSnapshot: false,
          message: 'O template selecionado não possui conteúdo.',
        };
      }

      return {
        status: 'ready',
        template,
        content: template.message,
        usedSnapshot: false,
      };
    }

    if (snapshotContent) {
      return {
        status: 'ready-with-snapshot',
        content: campaign.messageTemplate,
        usedSnapshot: true,
      };
    }

    return {
      status: 'template-not-found',
      content: '',
      usedSnapshot: false,
      message: 'Template da campanha não encontrado.',
    };
  }

  if (snapshotContent) {
    return {
      status: 'ready-with-snapshot',
      content: campaign.messageTemplate,
      usedSnapshot: true,
    };
  }

  return {
    status: 'template-empty',
    content: '',
    usedSnapshot: false,
    message: 'A campanha não possui conteúdo de mensagem.',
  };
}

function resolveRecipients(
  audience: CommercialAudienceOption,
  profiles: CustomerCommercialProfile[],
  clients: Client[]
): ResolvedRecipient[] {
  const customerIds = new Set(audience.customerIds || []);
  const clientsById = new Map(clients.map((client) => [client.id, client]));

  return profiles
    .filter((profile) => customerIds.has(profile.customerId))
    .map((profile) => ({
      profile,
      phone: clientsById.get(profile.customerId)?.phone,
    }))
    .sort((a, b) => b.profile.score - a.profile.score || a.profile.customerName.localeCompare(b.profile.customerName, 'pt-BR'));
}

function buildPreparedMessage({
  campaign,
  audience,
  recipient,
  content,
  settings,
}: {
  campaign: Campaign;
  audience: CommercialAudienceOption;
  recipient: ResolvedRecipient;
  content: string;
  settings?: AppSettings;
}): PreparedCampaignMessage {
  const values = buildVariableValues(campaign, audience, recipient, settings);
  const unresolvedVariables = new Set<string>();
  const renderedContent = content.replace(VARIABLE_PATTERN, (match, rawName: string) => {
    const variableName = normalizeVariableName(rawName);

    if (!values.has(variableName)) {
      unresolvedVariables.add(variableName);
      return match;
    }

    return values.get(variableName) || '-';
  });
  const uniqueUnresolved = Array.from(unresolvedVariables);

  return {
    customerId: recipient.profile.customerId,
    customerName: recipient.profile.customerName,
    phone: recipient.phone,
    content: renderedContent,
    unresolvedVariables: uniqueUnresolved,
    valid: Boolean(recipient.phone?.trim()) && Boolean(renderedContent.trim()) && uniqueUnresolved.length === 0,
  };
}

function buildVariableValues(
  campaign: Campaign,
  audience: CommercialAudienceOption,
  recipient: ResolvedRecipient,
  settings?: AppSettings
) {
  const { profile, phone } = recipient;
  const restaurant = settings?.restaurant;

  return new Map<string, string>([
    ['nome', formatText(profile.customerName)],
    ['primeiro_nome', formatText(profile.customerName.split(' ')[0])],
    ['telefone', formatText(phone)],
    ['classificacao', formatText(profile.classification)],
    ['score', String(Math.round(profile.score))],
    ['total_gasto', formatCurrency(profile.totalSpent)],
    ['ticket_medio', formatCurrency(profile.averageTicket)],
    ['ultima_compra', profile.lastPurchase ? formatDate(profile.lastPurchase) : 'Nunca'],
    ['dias_sem_comprar', profile.daysWithoutPurchase === null ? '-' : String(profile.daysWithoutPurchase)],
    ['produto_favorito', formatText(profile.favoriteProducts[0])],
    ['forma_pagamento', formatText(profile.favoritePaymentMethod)],
    ['segmentos', formatText(profile.segments.join(', '))],
    ['nome_campanha', formatText(campaign.name)],
    ['nome_publico', formatText(audience.name)],
    ['origem_publico', audience.source === 'automatic' ? 'Automático' : 'Manual'],
    ['quantidade_publico', String(audience.customerCount)],
    ['nome_restaurante', formatText(restaurant?.name)],
    ['marca_restaurante', formatText(restaurant?.brandName)],
    ['telefone_restaurante', formatText(restaurant?.phone)],
    ['whatsapp_restaurante', formatText(restaurant?.whatsapp)],
    ['email_restaurante', formatText(restaurant?.email)],
    ['instagram', formatText(restaurant?.social.instagram)],
    ['site', formatText(restaurant?.social.website)],
  ]);
}

function normalizeVariableName(value: string) {
  return value.trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function formatText(value: string | null | undefined) {
  const text = value?.trim();
  return text || '-';
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getGeneratedAt() {
  const now = Date.now();
  lastGeneratedAtTime = now <= lastGeneratedAtTime ? lastGeneratedAtTime + 1 : now;
  return new Date(lastGeneratedAtTime).toISOString();
}
