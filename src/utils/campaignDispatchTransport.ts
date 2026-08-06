import type {
  CampaignDispatchRequestPreview,
  CampaignDispatchTransportBody,
  CampaignDispatchTransportEnvelopePreview,
  CampaignDispatchTransportItem,
  CampaignDispatchTransportValidation,
  CampaignDispatchTransportValidationIssue,
  CampaignDispatchTransportValidationIssueCode,
} from '../types';
import { createStableDispatchFingerprint } from './campaignDispatchContract';

const ISSUE_LABELS: Record<CampaignDispatchTransportValidationIssueCode, string> = {
  'invalid-source-request-status': 'Status da solicitação de origem inválido',
  'invalid-source-request-schema': 'Versão do esquema da solicitação de origem inválida',
  'source-request-invalid': 'A solicitação de origem possui problemas estruturais',
  'missing-source-request-id': 'ID da solicitação de origem ausente',
  'missing-endpoint-path': 'Caminho proposto do endpoint ausente',
  'invalid-endpoint-path': 'Caminho proposto do endpoint inválido',
  'invalid-http-method': 'Método HTTP proposto inválido',
  'invalid-content-type': 'Tipo de conteúdo proposto inválido',
  'missing-idempotency-header': 'Cabeçalho idempotente proposto ausente',
  'idempotency-key-mismatch': 'Cabeçalho idempotente diverge da solicitação de origem',
  'missing-body-fingerprint': 'Fingerprint do corpo ausente',
  'body-fingerprint-mismatch': 'Fingerprint do corpo diverge do conteúdo canônico',
  'body-item-count-mismatch': 'Contagem de itens do envelope divergente',
  'no-items-to-transport': 'Não há itens candidatos no corpo do envelope',
  'missing-normalized-phone': 'Telefone normalizado ausente',
  'empty-content': 'Conteúdo vazio',
  'missing-source-item-fingerprint': 'Fingerprint do item de origem ausente',
  'duplicate-normalized-phone': 'Telefone normalizado duplicado no corpo',
  'body-size-exceeded': 'O corpo excede o limite local proposto de 256 KiB',
};

const MAXIMUM_BODY_SIZE_BYTES = 262144;

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)] as const);

    return Object.fromEntries(entries);
  }

  return value;
}

function getUtf8ByteLength(value: string): number {
  let size = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (codePoint <= 0x7f) {
      size += 1;
    } else if (codePoint <= 0x7ff) {
      size += 2;
    } else if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      size += 4;
      index += 1;
    } else {
      size += 3;
    }
  }

  return size;
}

function addIssue(issues: CampaignDispatchTransportValidationIssue[], code: CampaignDispatchTransportValidationIssueCode): void {
  issues.push({
    code,
    message: ISSUE_LABELS[code],
  });
}

export function canonicalizeCampaignDispatchTransportBody(body: CampaignDispatchTransportBody): string {
  const sortedBody = sortObjectKeys(body) as CampaignDispatchTransportBody;
  return JSON.stringify(sortedBody);
}

export function createCampaignDispatchTransportBodyFingerprint(canonicalBody: string): string {
  const stable = createStableDispatchFingerprint([
    'campaign-dispatch-transport-body.v1',
    canonicalBody,
  ]);

  return `body_${stable.replace(/^fp_/, '')}`;
}

export function getCampaignDispatchTransportBodySizeBytes(canonicalBody: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(canonicalBody).length;
  }

  return Math.max(0, getUtf8ByteLength(canonicalBody));
}

export function validateCampaignDispatchTransportEnvelopePreview(
  envelope: Omit<CampaignDispatchTransportEnvelopePreview, 'validation'>,
  sourceRequest: CampaignDispatchRequestPreview
): CampaignDispatchTransportValidation {
  const issues: CampaignDispatchTransportValidationIssue[] = [];

  if (sourceRequest.status !== 'preview-only-not-submitted') {
    addIssue(issues, 'invalid-source-request-status');
  }

  if (sourceRequest.schemaVersion !== 'campaign-dispatch-request.v1') {
    addIssue(issues, 'invalid-source-request-schema');
  }

  if (sourceRequest.validation.structurallyValid !== true) {
    addIssue(issues, 'source-request-invalid');
  }

  if (!envelope.sourceRequestId || envelope.sourceRequestId.trim() === '') {
    addIssue(issues, 'missing-source-request-id');
  }

  if (!envelope.proposedEndpointPath || envelope.proposedEndpointPath.trim() === '') {
    addIssue(issues, 'missing-endpoint-path');
  } else if (!envelope.proposedEndpointPath.startsWith('/')) {
    addIssue(issues, 'invalid-endpoint-path');
  }

  if (envelope.proposedMethod !== 'POST') {
    addIssue(issues, 'invalid-http-method');
  }

  if (envelope.proposedContentType !== 'application/json') {
    addIssue(issues, 'invalid-content-type');
  }

  if (!envelope.proposedIdempotencyHeaderValue || envelope.proposedIdempotencyHeaderValue.trim() === '') {
    addIssue(issues, 'missing-idempotency-header');
  } else if (envelope.proposedIdempotencyHeaderValue !== sourceRequest.idempotencyKey) {
    addIssue(issues, 'idempotency-key-mismatch');
  }

  if (!envelope.bodyFingerprint || envelope.bodyFingerprint.trim() === '') {
    addIssue(issues, 'missing-body-fingerprint');
  } else if (envelope.bodyFingerprint !== createCampaignDispatchTransportBodyFingerprint(envelope.canonicalBody)) {
    addIssue(issues, 'body-fingerprint-mismatch');
  }

  let itemCountMismatchFound = false;
  if (envelope.transportItems !== envelope.body.items.length) {
    itemCountMismatchFound = true;
  }
  if (envelope.totalSourceItems !== sourceRequest.includedItems) {
    itemCountMismatchFound = true;
  }
  if (envelope.body.items.length !== sourceRequest.items.length) {
    itemCountMismatchFound = true;
  }

  if (itemCountMismatchFound) {
    addIssue(issues, 'body-item-count-mismatch');
  }

  if (envelope.body.items.length === 0) {
    addIssue(issues, 'no-items-to-transport');
  }

  const seenNormalizedPhones = new Set<string>();
  envelope.body.items.forEach((item: CampaignDispatchTransportItem) => {
    if (!item.normalizedPhone || item.normalizedPhone.trim() === '') {
      addIssue(issues, 'missing-normalized-phone');
    }

    if (!item.content || item.content.trim() === '') {
      addIssue(issues, 'empty-content');
    }

    if (!item.sourceItemFingerprint || item.sourceItemFingerprint.trim() === '') {
      addIssue(issues, 'missing-source-item-fingerprint');
    }

    if (item.normalizedPhone && item.normalizedPhone.trim() !== '') {
      const normalizedPhone = item.normalizedPhone.trim();
      if (seenNormalizedPhones.has(normalizedPhone)) {
        addIssue(issues, 'duplicate-normalized-phone');
      } else {
        seenNormalizedPhones.add(normalizedPhone);
      }
    }
  });

  if (envelope.bodySizeBytes > envelope.maximumBodySizeBytes) {
    addIssue(issues, 'body-size-exceeded');
  }

  return {
    structurallyValid: issues.length === 0,
    futureTransmissionEligible: issues.length === 0 && sourceRequest.validation.structurallyValid === true && envelope.body.items.length > 0,
    issueCount: issues.length,
    issues,
  };
}

export function createCampaignDispatchTransportEnvelopePreview(
  request: CampaignDispatchRequestPreview,
  createdAt: string
): CampaignDispatchTransportEnvelopePreview {
  const body: CampaignDispatchTransportBody = {
    schemaVersion: request.schemaVersion,
    requestId: request.requestId,
    createdAt: request.createdAt,
    campaignId: request.campaignId,
    channel: request.channel,
    purpose: request.purpose,
    sourceDraftId: request.sourceDraftId,
    sourceBatchFingerprint: request.sourceBatchFingerprint,
    items: request.items.map((item) => ({
      id: item.id,
      customerId: item.customerId,
      channel: item.channel,
      purpose: item.purpose,
      normalizedPhone: item.normalizedPhone,
      content: item.content,
      sourceDraftItemId: item.sourceDraftItemId,
      sourceItemFingerprint: item.sourceItemFingerprint,
    })),
  };

  const canonicalBody = canonicalizeCampaignDispatchTransportBody(body);
  const bodyFingerprint = createCampaignDispatchTransportBodyFingerprint(canonicalBody);
  const bodySizeBytes = getCampaignDispatchTransportBodySizeBytes(canonicalBody);

  const envelopeBase: Omit<CampaignDispatchTransportEnvelopePreview, 'validation'> = {
    schemaVersion: 'campaign-dispatch-transport.v1',
    status: 'preview-only-not-transmitted',
    createdAt,
    sourceRequestId: request.requestId,
    sourceRequestSchemaVersion: request.schemaVersion,
    proposedMethod: 'POST',
    proposedEndpointPath: '/internal/campaign-dispatch-requests',
    proposedContentType: 'application/json',
    proposedIdempotencyHeaderName: 'Idempotency-Key',
    proposedIdempotencyHeaderValue: request.idempotencyKey,
    backendAvailable: false,
    authenticationConfigured: false,
    requestTransmitted: false,
    responseReceived: false,
    transportPersisted: false,
    idempotencyEnforced: false,
    body,
    canonicalBody,
    bodyFingerprint,
    bodySizeBytes,
    maximumBodySizeBytes: MAXIMUM_BODY_SIZE_BYTES,
    totalSourceItems: request.includedItems,
    transportItems: body.items.length,
  };

  const validation = validateCampaignDispatchTransportEnvelopePreview(envelopeBase, request);

  return {
    ...envelopeBase,
    validation,
  };
}

export function getCampaignDispatchTransportWarnings(envelope: CampaignDispatchTransportEnvelopePreview): string[] {
  const warnings = [
    'Este é apenas um envelope local de transporte.',
    'Nenhuma requisição foi transmitida.',
    'O endpoint exibido é apenas uma proposta de contrato.',
    'Os cabeçalhos exibidos não foram enviados.',
    'O fingerprint do corpo não é uma assinatura criptográfica.',
    'A autenticação e a idempotência autoritativa dependem de backend seguro.',
  ];

  if (!envelope.validation.futureTransmissionEligible) {
    warnings.push('O envelope não está apto para uma futura transmissão.');
  }

  if (envelope.body.items.length === 0) {
    warnings.push('Não há itens candidatos para transportar.');
  }

  if (envelope.bodySizeBytes > envelope.maximumBodySizeBytes) {
    warnings.push('O corpo excede o limite local proposto.');
  }

  if (envelope.validation.issues.some((issue) => issue.code === 'source-request-invalid')) {
    warnings.push('A solicitação de origem precisa ser corrigida antes de uma futura integração.');
  }

  return warnings;
}
