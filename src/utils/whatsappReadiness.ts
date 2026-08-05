/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, PreparedCampaignMessage, WhatsAppRecipientReadiness, WhatsAppRecipientReadinessStatus, WhatsAppCampaignReadiness } from '../types';

export function normalizeBrazilianPhoneForWhatsApp(phone?: string): string | undefined {
  if (!phone) {
    return undefined;
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`;
  }

  return undefined;
}

export function evaluateWhatsAppRecipientReadiness(
  message: PreparedCampaignMessage,
  client?: Client
): WhatsAppRecipientReadiness {
  const originalPhone = message.phone?.trim();
  const normalizedPhone = normalizeBrazilianPhoneForWhatsApp(originalPhone);
  const preparedMessageValid = message.valid;

  const status: WhatsAppRecipientReadinessStatus = client?.type === 'bloqueado'
    ? 'blocked-contact'
    : client?.type === 'grupo'
      ? 'group-contact'
      : !originalPhone
        ? 'missing-phone'
        : normalizedPhone === undefined
          ? 'invalid-phone'
          : !preparedMessageValid
            ? 'invalid-prepared-message'
            : 'phone-ready';

  return {
    customerId: message.customerId,
    customerName: message.customerName,
    originalPhone: originalPhone || undefined,
    normalizedPhone,
    readiness: status,
    preparedMessageValid,
  };
}

export function buildWhatsAppCampaignReadiness(
  preparedMessages: PreparedCampaignMessage[],
  clients: Client[]
): WhatsAppCampaignReadiness {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const items = preparedMessages.map((message) => evaluateWhatsAppRecipientReadiness(message, clientsById.get(message.customerId)));

  const counts = items.reduce<Record<WhatsAppRecipientReadinessStatus, number>>(
    (acc, item) => {
      acc[item.readiness] = (acc[item.readiness] || 0) + 1;
      return acc;
    },
    {
      'phone-ready': 0,
      'missing-phone': 0,
      'invalid-phone': 0,
      'blocked-contact': 0,
      'group-contact': 0,
      'invalid-prepared-message': 0,
    }
  );

  return {
    status: 'not-ready-for-real-send',
    backendAvailable: false,
    providerConfigured: false,
    consentModelAvailable: false,
    counts,
    items,
  };
}
