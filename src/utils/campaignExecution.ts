/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CampaignExecutionItem,
  CampaignExecutionSession,
  CampaignExecutionPreview,
  PreparedCampaignMessage,
} from '../types';

export function isCampaignExecutionRunnable(preview: CampaignExecutionPreview): boolean {
  const hasRunnableStatus = preview.status === 'ready' || preview.status === 'ready-with-snapshot';

  return hasRunnableStatus && preview.preparedMessages.some((message) => message.valid);
}

export function createCampaignExecutionSession(
  preview: CampaignExecutionPreview,
  sessionId: string,
  createdAt: string
): CampaignExecutionSession {
  const items = preview.preparedMessages.map<CampaignExecutionItem>((message, index) => ({
    id: `${sessionId}:${index}:${message.customerId}`,
    customerId: message.customerId,
    customerName: message.customerName,
    phone: message.phone,
    content: message.content,
    valid: message.valid,
    unresolvedVariables: [...message.unresolvedVariables],
    status: message.valid ? 'pending' : 'invalid',
    error: message.valid ? undefined : getInvalidMessageError(message),
  }));
  const firstPendingIndex = findFirstPendingIndex(items);

  return recalculateSessionCounters({
    id: sessionId,
    campaignId: preview.campaign.id,
    campaignName: preview.campaign.name,
    preparationGeneratedAt: preview.generatedAt,
    status: 'ready',
    createdAt,
    currentIndex: firstPendingIndex === -1 ? items.length : firstPendingIndex,
    totalItems: 0,
    validItems: 0,
    invalidItems: 0,
    processedItems: 0,
    successItems: 0,
    skippedItems: 0,
    items,
  });
}

export function startExecutionSession(
  session: CampaignExecutionSession,
  startedAt: string
): CampaignExecutionSession {
  if (session.status !== 'ready') return session;

  const firstPendingIndex = findFirstPendingIndex(session.items);
  if (firstPendingIndex === -1) return session;

  const items = setItemStatus(session.items, firstPendingIndex, 'processing');

  return recalculateSessionCounters({
    ...session,
    status: 'running',
    startedAt,
    currentIndex: firstPendingIndex,
    items,
  });
}

export function processNextExecutionItem(
  session: CampaignExecutionSession,
  processedAt: string
): CampaignExecutionSession {
  if (session.status !== 'running') return session;

  const processingIndex = session.items.findIndex((item) => item.status === 'processing');
  if (processingIndex === -1) return session;

  const processedItems = session.items.map((item, index) =>
    index === processingIndex
      ? { ...item, status: 'simulated-success' as const, processedAt }
      : item
  );
  const nextPendingIndex = findFirstPendingIndex(processedItems);

  if (nextPendingIndex === -1) {
    return recalculateSessionCounters({
      ...session,
      status: 'completed',
      completedAt: processedAt,
      currentIndex: processedItems.length,
      items: processedItems,
    });
  }

  const items = setItemStatus(processedItems, nextPendingIndex, 'processing');

  return recalculateSessionCounters({
    ...session,
    currentIndex: nextPendingIndex,
    items,
  });
}

export function pauseExecutionSession(
  session: CampaignExecutionSession,
  pausedAt: string
): CampaignExecutionSession {
  if (session.status !== 'running') return session;

  const items = session.items.map((item) =>
    item.status === 'processing' ? { ...item, status: 'pending' as const } : item
  );
  const firstPendingIndex = findFirstPendingIndex(items);

  return recalculateSessionCounters({
    ...session,
    status: 'paused',
    pausedAt,
    currentIndex: firstPendingIndex === -1 ? items.length : firstPendingIndex,
    items,
  });
}

export function resumeExecutionSession(
  session: CampaignExecutionSession
): CampaignExecutionSession {
  if (session.status !== 'paused') return session;

  const firstPendingIndex = findFirstPendingIndex(session.items);
  if (firstPendingIndex === -1) return session;

  const items = setItemStatus(session.items, firstPendingIndex, 'processing');

  return recalculateSessionCounters({
    ...session,
    status: 'running',
    pausedAt: undefined,
    currentIndex: firstPendingIndex,
    items,
  });
}

export function cancelExecutionSession(
  session: CampaignExecutionSession,
  cancelledAt: string
): CampaignExecutionSession {
  if (session.status !== 'ready' && session.status !== 'running' && session.status !== 'paused') {
    return session;
  }

  const items = session.items.map((item) =>
    item.status === 'pending' || item.status === 'processing'
      ? { ...item, status: 'skipped' as const, processedAt: cancelledAt }
      : item
  );

  return recalculateSessionCounters({
    ...session,
    status: 'cancelled',
    cancelledAt,
    currentIndex: items.length,
    items,
  });
}

export function getCampaignExecutionProgress(session: CampaignExecutionSession): number {
  if (session.totalItems === 0) return 0;

  return Math.min(100, Math.max(0, (session.processedItems / session.totalItems) * 100));
}

function setItemStatus(
  items: CampaignExecutionItem[],
  itemIndex: number,
  status: CampaignExecutionItem['status']
): CampaignExecutionItem[] {
  return items.map((item, index) => (index === itemIndex ? { ...item, status } : item));
}

function findFirstPendingIndex(items: CampaignExecutionItem[]): number {
  return items.findIndex((item) => item.status === 'pending');
}

function recalculateSessionCounters(session: CampaignExecutionSession): CampaignExecutionSession {
  const validItems = session.items.filter((item) => item.valid).length;
  const invalidItems = session.items.filter((item) => item.status === 'invalid').length;
  const successItems = session.items.filter((item) => item.status === 'simulated-success').length;
  const skippedItems = session.items.filter((item) => item.status === 'skipped').length;

  return {
    ...session,
    totalItems: session.items.length,
    validItems,
    invalidItems,
    processedItems: invalidItems + successItems + skippedItems,
    successItems,
    skippedItems,
  };
}

function getInvalidMessageError(message: PreparedCampaignMessage): string {
  const errors: string[] = [];

  if (!message.phone?.trim()) errors.push('Telefone ausente.');
  if (message.unresolvedVariables.length > 0) {
    errors.push(`Variáveis não resolvidas: ${message.unresolvedVariables.join(', ')}.`);
  }
  if (!message.content.trim()) errors.push('Conteúdo vazio.');

  return errors.join(' ') || 'Mensagem inválida.';
}
