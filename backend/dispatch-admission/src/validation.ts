import {
  BackendDispatchAdmissionCommand,
  BackendDispatchAdmissionIssue,
  BackendDispatchAdmissionIssueCode,
  BackendDispatchAdmissionValidation,
  BackendDispatchNormalizedItem,
  BackendDispatchNormalizedRequest,
  BACKEND_DISPATCH_ENDPOINT_PATH,
  BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES,
  BACKEND_DISPATCH_MAX_ITEM_CONTENT_BYTES,
} from './types';
import {
  canonicalizeBackendJson,
  getBackendUtf8Size,
  isBackendJsonSafe,
} from './canonicalJson';
import { createBackendExpectedIdempotencyKey } from './stableFingerprint';

const SCHEMA_VERSION = 'campaign-dispatch-request.v1';
const PHONE_PATTERN = /^\+55\d{10,11}$/;

const ISSUE_MESSAGES: Record<BackendDispatchAdmissionIssueCode, string> = {
  'invalid-method': 'Método HTTP inválido',
  'invalid-endpoint-path': 'Caminho do endpoint inválido',
  'invalid-content-type': 'Tipo de conteúdo inválido',
  'missing-idempotency-key': 'Chave idempotente ausente',
  'invalid-received-at': 'Data de recebimento inválida',
  'invalid-body': 'Corpo da solicitação inválido',
  'invalid-schema-version': 'Versão do esquema inválida',
  'missing-request-id': 'ID da solicitação ausente',
  'invalid-created-at': 'Data de criação da solicitação inválida',
  'missing-campaign-id': 'ID da campanha ausente',
  'invalid-channel': 'Canal inválido',
  'invalid-purpose': 'Finalidade inválida',
  'missing-source-draft-id': 'ID do rascunho de origem ausente',
  'missing-source-batch-fingerprint': 'Fingerprint do lote de origem ausente',
  'no-items': 'Não há itens para admitir',
  'invalid-item': 'Item da solicitação inválido',
  'missing-item-id': 'ID do item ausente',
  'duplicate-item-id': 'ID de item duplicado',
  'missing-customer-id': 'ID do cliente ausente',
  'missing-normalized-phone': 'Telefone normalizado ausente',
  'invalid-normalized-phone': 'Telefone normalizado inválido',
  'duplicate-normalized-phone': 'Telefone normalizado duplicado',
  'empty-content': 'Conteúdo vazio',
  'content-too-large': 'O conteúdo do item excede o limite permitido',
  'missing-source-draft-item-id': 'ID do item do rascunho ausente',
  'missing-source-item-fingerprint': 'Fingerprint do item de origem ausente',
  'idempotency-key-mismatch': 'Chave idempotente diverge do valor esperado',
  'body-size-exceeded': 'O corpo excede o limite máximo permitido',
};

export interface BackendDispatchAdmissionValidationResult {
  validation: BackendDispatchAdmissionValidation;
  expectedIdempotencyKey: string;
  suppliedIdempotencyKey: string;
  normalizedRequest?: BackendDispatchNormalizedRequest;
}

interface IssueAccumulator {
  issues: BackendDispatchAdmissionIssue[];
}

function safeReadStringField(body: unknown, field: string): string {
  if (body === null || typeof body !== 'object') return '';

  try {
    const value = (body as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function addIssue(
  acc: IssueAccumulator,
  code: BackendDispatchAdmissionIssueCode,
  path?: string,
  itemId?: string
): void {
  const issue: BackendDispatchAdmissionIssue = { code, message: ISSUE_MESSAGES[code] };
  if (path !== undefined) {
    issue.path = path;
  }
  if (itemId !== undefined) {
    issue.itemId = itemId;
  }
  acc.issues.push(issue);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  try {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  } catch {
    return false;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isStrictIso8601(value: string): boolean {
  // Pattern: YYYY-MM-DDTHH:mm:ss(.sss)?(Z|±HH:MM)
  const pattern =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  const match = pattern.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const tz = match[7] ?? '';

  if (month < 1 || month > 12) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  const daysInMonth = (y: number, m: number): number => {
    switch (m) {
      case 1: case 3: case 5: case 7: case 8: case 10: case 12:
        return 31;
      case 4: case 6: case 9: case 11:
        return 30;
      case 2: {
        const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        return isLeap ? 29 : 28;
      }
      default:
        return 0;
    }
  };

  if (day < 1 || day > daysInMonth(year, month)) return false;

  if (tz !== 'Z') {
    const tzMatch = /^([+-])(\d{2}):(\d{2})$/.exec(tz);
    if (!tzMatch) return false;
    const tzHour = Number(tzMatch[2] ?? '');
    const tzMinute = Number(tzMatch[3] ?? '');
    if (tzHour > 14) return false;
    if (tzHour === 14 && tzMinute !== 0) return false;
    if (tzMinute > 59) return false;
  }

  return true;
}

function isValidContentType(contentType: string): boolean {
  const mediaType = (contentType.split(';')[0] ?? '').trim().toLowerCase();
  return mediaType === 'application/json';
}

function validateTransport(
  command: BackendDispatchAdmissionCommand,
  acc: IssueAccumulator
): string {
  if (command.method !== 'POST') {
    addIssue(acc, 'invalid-method', 'method');
  }

  if (command.endpointPath !== BACKEND_DISPATCH_ENDPOINT_PATH) {
    addIssue(acc, 'invalid-endpoint-path', 'endpointPath');
  }

  const contentType = command.headers.contentType;
  if (contentType === undefined || contentType.trim() === '') {
    addIssue(acc, 'invalid-content-type', 'headers.contentType');
  } else if (!isValidContentType(contentType)) {
    addIssue(acc, 'invalid-content-type', 'headers.contentType');
  }

  const rawIdempotencyKey = command.headers.idempotencyKey;
  const suppliedIdempotencyKey =
    typeof rawIdempotencyKey === 'string' && rawIdempotencyKey.trim() !== ''
      ? rawIdempotencyKey
      : '';

  if (suppliedIdempotencyKey === '') {
    addIssue(acc, 'missing-idempotency-key', 'headers.idempotencyKey');
  }

  if (!isStrictIso8601(command.receivedAt)) {
    addIssue(acc, 'invalid-received-at', 'receivedAt');
  }

  return suppliedIdempotencyKey;
}

function validateBody(
  body: unknown,
  acc: IssueAccumulator
): Record<string, unknown> | null {
  if (!isBackendJsonSafe(body)) {
    addIssue(acc, 'invalid-body', 'body');
    return null;
  }

  // For every JSON-safe body: canonicalize safely, compute UTF-8 size, check limit.
  let bodySizeBytes = 0;
  try {
    const canonicalBody = canonicalizeBackendJson(body);
    bodySizeBytes = getBackendUtf8Size(canonicalBody);
  } catch {
    addIssue(acc, 'invalid-body', 'body');
    return null;
  }
  if (bodySizeBytes > BACKEND_DISPATCH_MAX_BODY_SIZE_BYTES) {
    addIssue(acc, 'body-size-exceeded', 'body');
  }

  // Then independently require the root body to be a plain object.
  if (!isPlainObject(body)) {
    addIssue(acc, 'invalid-body', 'body');
    return null;
  }

  return body;
}

function validateRootFields(
  body: Record<string, unknown>,
  acc: IssueAccumulator
): void {
  if (body.schemaVersion !== SCHEMA_VERSION) {
    addIssue(acc, 'invalid-schema-version', 'schemaVersion');
  }

  if (!isNonEmptyString(body.requestId)) {
    addIssue(acc, 'missing-request-id', 'requestId');
  }

  if (typeof body.createdAt !== 'string' || !isStrictIso8601(body.createdAt)) {
    addIssue(acc, 'invalid-created-at', 'createdAt');
  }

  if (!isNonEmptyString(body.campaignId)) {
    addIssue(acc, 'missing-campaign-id', 'campaignId');
  }

  if (body.channel !== 'whatsapp') {
    addIssue(acc, 'invalid-channel', 'channel');
  }

  if (body.purpose !== 'marketing') {
    addIssue(acc, 'invalid-purpose', 'purpose');
  }

  if (!isNonEmptyString(body.sourceDraftId)) {
    addIssue(acc, 'missing-source-draft-id', 'sourceDraftId');
  }

  if (!isNonEmptyString(body.sourceBatchFingerprint)) {
    addIssue(acc, 'missing-source-batch-fingerprint', 'sourceBatchFingerprint');
  }
}

function validateItems(
  body: Record<string, unknown>,
  acc: IssueAccumulator
): void {
  if (!('items' in body)) {
    addIssue(acc, 'invalid-body', 'items');
    return;
  }

  if (!Array.isArray(body.items)) {
    addIssue(acc, 'invalid-body', 'items');
    return;
  }

  if (body.items.length === 0) {
    addIssue(acc, 'no-items', 'items');
    return;
  }

  const seenItemIds = new Set<string>();
  const seenPhones = new Set<string>();
  const items = body.items;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const itemPath = `items[${index}]`;

    if (!isPlainObject(item)) {
      addIssue(acc, 'invalid-item', itemPath);
      continue;
    }

    const rawItemId = item.id;
    const itemId = isNonEmptyString(rawItemId) ? rawItemId : undefined;
    const issueItemId = itemId;

    if (!isNonEmptyString(rawItemId)) {
      addIssue(acc, 'missing-item-id', `${itemPath}.id`);
    } else if (seenItemIds.has(rawItemId)) {
      addIssue(acc, 'duplicate-item-id', `${itemPath}.id`, issueItemId);
    } else {
      seenItemIds.add(rawItemId);
    }

    if (!isNonEmptyString(item.customerId)) {
      addIssue(acc, 'missing-customer-id', `${itemPath}.customerId`, issueItemId);
    }

    if (item.channel !== 'whatsapp' || item.purpose !== 'marketing') {
      addIssue(acc, 'invalid-item', itemPath, issueItemId);
    }

    const normalizedPhone = item.normalizedPhone;
    if (!isNonEmptyString(normalizedPhone)) {
      addIssue(acc, 'missing-normalized-phone', `${itemPath}.normalizedPhone`, issueItemId);
    } else if (!PHONE_PATTERN.test(normalizedPhone)) {
      addIssue(acc, 'invalid-normalized-phone', `${itemPath}.normalizedPhone`, issueItemId);
    } else if (seenPhones.has(normalizedPhone)) {
      addIssue(acc, 'duplicate-normalized-phone', `${itemPath}.normalizedPhone`, issueItemId);
    } else {
      seenPhones.add(normalizedPhone);
    }

    const content = item.content;
    if (typeof content !== 'string') {
      addIssue(acc, 'empty-content', `${itemPath}.content`, issueItemId);
    } else {
      if (content.trim().length === 0) {
        addIssue(acc, 'empty-content', `${itemPath}.content`, issueItemId);
      }
      const contentBytes = getBackendUtf8Size(content);
      if (contentBytes > BACKEND_DISPATCH_MAX_ITEM_CONTENT_BYTES) {
        addIssue(acc, 'content-too-large', `${itemPath}.content`, issueItemId);
      }
    }

    if (!isNonEmptyString(item.sourceDraftItemId)) {
      addIssue(acc, 'missing-source-draft-item-id', `${itemPath}.sourceDraftItemId`, issueItemId);
    }

    if (!isNonEmptyString(item.sourceItemFingerprint)) {
      addIssue(acc, 'missing-source-item-fingerprint', `${itemPath}.sourceItemFingerprint`, issueItemId);
    }
  }
}

function validateIdempotency(
  acc: IssueAccumulator,
  suppliedIdempotencyKey: string,
  schemaVersion: string,
  sourceBatchFingerprint: string
): void {
  if (suppliedIdempotencyKey === '') {
    // missing-idempotency-key already reported in validateTransport.
    // Do NOT add idempotency-key-mismatch when the key is missing/empty.
    return;
  }

  const expectedKey = createBackendExpectedIdempotencyKey(
    schemaVersion,
    sourceBatchFingerprint
  );

  if (suppliedIdempotencyKey !== expectedKey) {
    addIssue(acc, 'idempotency-key-mismatch', 'headers.idempotencyKey');
  }
}

function buildNormalizedRequest(
  body: Record<string, unknown>
): BackendDispatchNormalizedRequest {
  const items: BackendDispatchNormalizedItem[] = (body.items as unknown[]).map((rawItem) => {
    const item = rawItem as Record<string, unknown>;
    return {
      id: item.id as string,
      customerId: item.customerId as string,
      channel: 'whatsapp',
      purpose: 'marketing',
      normalizedPhone: item.normalizedPhone as string,
      content: item.content as string,
      sourceDraftItemId: item.sourceDraftItemId as string,
      sourceItemFingerprint: item.sourceItemFingerprint as string,
    };
  });

  return {
    schemaVersion: 'campaign-dispatch-request.v1',
    requestId: body.requestId as string,
    createdAt: body.createdAt as string,
    campaignId: body.campaignId as string,
    channel: 'whatsapp',
    purpose: 'marketing',
    sourceDraftId: body.sourceDraftId as string,
    sourceBatchFingerprint: body.sourceBatchFingerprint as string,
    items,
  };
}

export function validateBackendDispatchAdmissionCommand(
  command: BackendDispatchAdmissionCommand
): BackendDispatchAdmissionValidationResult {
  const acc: IssueAccumulator = { issues: [] };

  // Safe locals populated ONLY inside protected validation logic.
  let validatedBody: Record<string, unknown> | null = null;
  let suppliedIdempotencyKey = '';
  let schemaVersionForIdempotency = '';
  let sourceBatchFingerprintForIdempotency = '';
  let normalizedRequest: BackendDispatchNormalizedRequest | undefined;

  try {
    suppliedIdempotencyKey = validateTransport(command, acc);

    // Idempotency expected key must ALWAYS be deterministically calculated.
    // Read fields directly from command.body safely BEFORE any potentially
    // hostile validateBody operation, so readable values survive a later
    // Proxy trap failure and can still feed expectedIdempotencyKey.
    schemaVersionForIdempotency =
      safeReadStringField(command.body, 'schemaVersion');

    sourceBatchFingerprintForIdempotency =
      safeReadStringField(command.body, 'sourceBatchFingerprint');

    const body = validateBody(command.body, acc);

    if (body !== null) {
      validatedBody = body;
      validateRootFields(body, acc);
      validateItems(body, acc);
    }

    validateIdempotency(
      acc,
      suppliedIdempotencyKey,
      schemaVersionForIdempotency,
      sourceBatchFingerprintForIdempotency
    );

    // Normalize only inside the protected block so any hostile getter during
    // normalization also falls into the catch and generates invalid-body.
    if (acc.issues.length === 0 && validatedBody !== null) {
      normalizedRequest = buildNormalizedRequest(validatedBody);
    }
  } catch {
    // Hostile input safety: never let an uncaught exception escape.
    addIssue(acc, 'invalid-body', 'body');
  }

  const structurallyValid = acc.issues.length === 0;

  const validation: BackendDispatchAdmissionValidation = {
    structurallyValid,
    issueCount: acc.issues.length,
    issues: acc.issues,
  };

  const expectedIdempotencyKey = createBackendExpectedIdempotencyKey(
    schemaVersionForIdempotency,
    sourceBatchFingerprintForIdempotency
  );

  const result: BackendDispatchAdmissionValidationResult = {
    validation,
    expectedIdempotencyKey,
    suppliedIdempotencyKey,
  };

  // exactOptionalPropertyTypes: omit normalizedRequest when it does not exist.
  if (normalizedRequest !== undefined) {
    result.normalizedRequest = normalizedRequest;
  }

  return result;
}
