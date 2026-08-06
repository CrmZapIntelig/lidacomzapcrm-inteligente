import type {
  CampaignDispatchDraft,
  CampaignDispatchRequestItem,
  CampaignDispatchRequestPreview,
  CampaignDispatchRequestValidation,
  CampaignDispatchRequestValidationIssue,
  CampaignDispatchRequestValidationIssueCode,
} from '../types';
import { createStableDispatchFingerprint } from './campaignDispatchContract';

const ISSUE_LABELS: Record<CampaignDispatchRequestValidationIssueCode, string> = {
  'invalid-draft-status': 'Status do rascunho de origem inválido',
  'missing-request-id': 'ID da solicitação ausente',
  'missing-idempotency-key': 'Chave idempotente ausente',
  'missing-batch-fingerprint': 'Fingerprint do lote ausente',
  'candidate-count-mismatch': 'Contagem de itens incluídos divergente',
  'missing-normalized-phone': 'Telefone normalizado ausente',
  'empty-content': 'Conteúdo vazio',
  'missing-item-fingerprint': 'Fingerprint do item ausente',
  'duplicate-normalized-phone': 'Telefone normalizado duplicado no payload',
};

export function createCampaignDispatchRequestIdempotencyKey(
  schemaVersion: string,
  batchFingerprint: string
): string {
  const fingerprint = createStableDispatchFingerprint([schemaVersion, batchFingerprint]);
  return `idem_fp_${fingerprint.replace(/^fp_/, '')}`;
}

export function createCampaignDispatchRequestPreview(
  draft: CampaignDispatchDraft,
  requestId: string,
  createdAt: string
): CampaignDispatchRequestPreview {
  const schemaVersion = 'campaign-dispatch-request.v1' as const;
  const sourceDraftItems = draft.items.filter((item) => item.status === 'candidate');

  const items: CampaignDispatchRequestItem[] = sourceDraftItems.map((draftItem) => ({
    id: `requestItem:${requestId}:${draftItem.id}`,
    customerId: draftItem.customerId,
    customerName: draftItem.customerName,
    channel: 'whatsapp',
    purpose: 'marketing',
    normalizedPhone: draftItem.normalizedPhone || '',
    content: draftItem.content,
    sourceDraftItemId: draftItem.id,
    sourceItemFingerprint: draftItem.deduplicationFingerprint,
  }));

  const idempotencyKey = createCampaignDispatchRequestIdempotencyKey(schemaVersion, draft.batchFingerprint);

  const request = {
    schemaVersion,
    requestId,
    idempotencyKey,
    status: 'preview-only-not-submitted' as const,
    createdAt,
    sourceDraftId: draft.id,
    campaignId: draft.campaignId,
    campaignName: draft.campaignName,
    channel: 'whatsapp' as const,
    purpose: 'marketing' as const,
    sourceBatchFingerprint: draft.batchFingerprint,
    backendAvailable: false as const,
    requestSubmitted: false as const,
    requestPersisted: false as const,
    idempotencyEnforced: false as const,
    totalDraftItems: draft.totalItems,
    includedItems: items.length,
    excludedItems: draft.totalItems - items.length,
    items,
  };

  const requestForValidation = request as typeof request & { sourceDraftStatus?: string };
  requestForValidation.sourceDraftStatus = draft.status;

  return {
    ...request,
    validation: validateCampaignDispatchRequestPreview(requestForValidation as Omit<CampaignDispatchRequestPreview, 'validation'> & { sourceDraftStatus?: string }),
  };
}

export function validateCampaignDispatchRequestPreview(
  request: Omit<CampaignDispatchRequestPreview, 'validation'> & { sourceDraftStatus?: string }
): CampaignDispatchRequestValidation {
  const issues: CampaignDispatchRequestValidationIssue[] = [];

  const requestDraftStatus = request.sourceDraftStatus;
  if (requestDraftStatus !== 'draft-only-not-queued') {
    issues.push({
      code: 'invalid-draft-status',
      message: ISSUE_LABELS['invalid-draft-status'],
    });
  }

  if (!request.requestId || request.requestId.trim() === '') {
    issues.push({
      code: 'missing-request-id',
      message: ISSUE_LABELS['missing-request-id'],
    });
  }

  if (!request.idempotencyKey || request.idempotencyKey.trim() === '') {
    issues.push({
      code: 'missing-idempotency-key',
      message: ISSUE_LABELS['missing-idempotency-key'],
    });
  }

  if (!request.sourceBatchFingerprint || request.sourceBatchFingerprint.trim() === '') {
    issues.push({
      code: 'missing-batch-fingerprint',
      message: ISSUE_LABELS['missing-batch-fingerprint'],
    });
  }

  if (request.includedItems !== request.items.length) {
    issues.push({
      code: 'candidate-count-mismatch',
      message: ISSUE_LABELS['candidate-count-mismatch'],
    });
  }

  const seenNormalizedPhones = new Set<string>();

  request.items.forEach((item) => {
    if (!item.normalizedPhone || item.normalizedPhone.trim() === '') {
      issues.push({
        code: 'missing-normalized-phone',
        message: ISSUE_LABELS['missing-normalized-phone'],
        itemId: item.id,
      });
    }

    if (!item.content || item.content.trim() === '') {
      issues.push({
        code: 'empty-content',
        message: ISSUE_LABELS['empty-content'],
        itemId: item.id,
      });
    }

    if (!item.sourceItemFingerprint || item.sourceItemFingerprint.trim() === '') {
      issues.push({
        code: 'missing-item-fingerprint',
        message: ISSUE_LABELS['missing-item-fingerprint'],
        itemId: item.id,
      });
    }

    if (item.normalizedPhone && item.normalizedPhone.trim() !== '') {
      const normalizedPhone = item.normalizedPhone.trim();
      if (seenNormalizedPhones.has(normalizedPhone)) {
        issues.push({
          code: 'duplicate-normalized-phone',
          message: ISSUE_LABELS['duplicate-normalized-phone'],
          itemId: item.id,
        });
      } else {
        seenNormalizedPhones.add(normalizedPhone);
      }
    }
  });

  return {
    structurallyValid: issues.length === 0,
    issueCount: issues.length,
    issues,
  };
}

export function getCampaignDispatchRequestWarnings(request: CampaignDispatchRequestPreview): string[] {
  const warnings = [
    'Esta é apenas uma prévia local de solicitação.',
    'Nenhuma requisição foi enviada ao backend.',
    'Nenhuma mensagem foi enfileirada ou enviada.',
    'A chave idempotente exibida ainda não é aplicada por um backend.',
  ];

  if (!request.validation.structurallyValid) {
    warnings.push('A prévia possui problemas estruturais que impediriam uma submissão futura.');
  }

  if (request.includedItems === 0) {
    warnings.push('Não há itens candidatos incluídos no payload.');
  }

  if (request.excludedItems > 0) {
    warnings.push('Existem itens excluídos do payload; consulte o contrato de lote para ver os motivos.');
  }

  return warnings;
}
