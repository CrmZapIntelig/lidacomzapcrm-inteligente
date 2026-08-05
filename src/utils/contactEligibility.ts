import { Client, CampaignContactEligibility, CampaignContactEligibilitySummary, ContactPreferences, PreparedCampaignMessage } from '../types';

function getEffectiveContactPreferences(client?: Client): Required<Pick<ContactPreferences, 'globalStatus' | 'marketingStatus' | 'operationalStatus' | 'preferredChannel' | 'source'>> {
  const preferences = client?.contactPreferences;

  return {
    globalStatus: preferences?.globalStatus ?? 'unknown',
    marketingStatus: preferences?.marketingStatus ?? 'unknown',
    operationalStatus: preferences?.operationalStatus ?? 'unknown',
    preferredChannel: preferences?.preferredChannel ?? 'unknown',
    source: preferences?.source ?? 'unknown',
  };
}

function evaluateCampaignContactEligibility(
  client?: Client,
  customerId?: string,
  customerName?: string
): CampaignContactEligibility {
  const fallbackId = customerId || 'unknown';
  const fallbackName = customerName || 'Cliente sem nome';

  if (!client) {
    return {
      customerId: fallbackId,
      customerName: fallbackName,
      status: 'unknown',
      eligibleForMarketing: false,
      reason: 'Cliente não encontrado para avaliar a preferência de contato.',
    };
  }

  if (client.type === 'grupo') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'group-contact',
      eligibleForMarketing: false,
      reason: 'Grupos não participam de campanhas individuais.',
    };
  }

  if (client.type === 'bloqueado') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'blocked',
      eligibleForMarketing: false,
      reason: 'Contato bloqueado no cadastro legado do CRM.',
    };
  }

  const preferences = getEffectiveContactPreferences(client);

  if (preferences.globalStatus === 'blocked') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'blocked',
      eligibleForMarketing: false,
      reason: 'Contato bloqueado nas preferências de contato.',
    };
  }

  if (preferences.marketingStatus === 'denied') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'marketing-denied',
      eligibleForMarketing: false,
      reason: 'Cliente não permite contatos de marketing.',
    };
  }

  if (preferences.marketingStatus === 'revoked') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'marketing-revoked',
      eligibleForMarketing: false,
      reason: 'Permissão de marketing registrada como revogada.',
    };
  }

  if (preferences.marketingStatus === 'unknown') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'unknown',
      eligibleForMarketing: false,
      reason: 'Preferência para contatos de marketing ainda não informada.',
    };
  }

  if (preferences.preferredChannel === 'phone' || preferences.preferredChannel === 'rcs' || preferences.preferredChannel === 'none') {
    return {
      customerId: client.id,
      customerName: client.name,
      status: 'channel-not-preferred',
      eligibleForMarketing: false,
      reason: 'WhatsApp não é o canal preferido registrado para marketing.',
    };
  }

  return {
    customerId: client.id,
    customerName: client.name,
    status: 'eligible',
    eligibleForMarketing: true,
    reason: 'Cliente elegível internamente para campanha de marketing.',
  };
}

function buildCampaignContactEligibilitySummary(
  messages: PreparedCampaignMessage[],
  clients: Client[],
  generatedAt: string
): CampaignContactEligibilitySummary {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const recipients = messages.map((message) => {
    const client = clientsById.get(message.customerId);
    return evaluateCampaignContactEligibility(client, message.customerId, message.customerName);
  });

  const counts = recipients.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt,
    totalRecipients: recipients.length,
    eligibleRecipients: counts.eligible || 0,
    unknownRecipients: counts.unknown || 0,
    blockedRecipients: counts.blocked || 0,
    deniedRecipients: counts['marketing-denied'] || 0,
    revokedRecipients: counts['marketing-revoked'] || 0,
    groupRecipients: counts['group-contact'] || 0,
    channelNotPreferredRecipients: counts['channel-not-preferred'] || 0,
    recipients,
  };
}

export { getEffectiveContactPreferences, evaluateCampaignContactEligibility, buildCampaignContactEligibilitySummary };
export default {
  getEffectiveContactPreferences,
  evaluateCampaignContactEligibility,
  buildCampaignContactEligibilitySummary,
};
