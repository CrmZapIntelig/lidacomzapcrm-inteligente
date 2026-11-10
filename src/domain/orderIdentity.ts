import type { ExternalOrderReference } from './omnichannel';
import { messageProviderChannel } from './messageChannelCatalog';

// Technical identifier bound; IDs stay opaque and case sensitive.
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
const referenceFields = ['provider', 'channel', 'providerAccountId', 'externalOrderId'];

export function validateExternalOrderReference(reference: unknown): asserts reference is ExternalOrderReference {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference) || Object.keys(reference).length !== referenceFields.length || Object.keys(reference).some(k => !referenceFields.includes(k))) throw new Error('ORDER_EXTERNAL_REFERENCE_INVALID');
  const value = reference as ExternalOrderReference;
  if (!identifier(value.providerAccountId) || !identifier(value.externalOrderId)) throw new Error('ORDER_EXTERNAL_REFERENCE_INVALID');
  try {
    if (messageProviderChannel(value.provider) !== value.channel) throw new Error('channel');
  } catch {
    throw new Error('ORDER_EXTERNAL_REFERENCE_INVALID');
  }
}

/** Tuple encoding avoids delimiter collisions. Never infer identity from contact or message data. */
export function externalOrderReferenceKey(tenantId: string, reference: ExternalOrderReference): string {
  if (!identifier(tenantId)) throw new Error('ORDER_EXTERNAL_TENANT_INVALID');
  validateExternalOrderReference(reference);
  return JSON.stringify([tenantId, reference.provider, reference.providerAccountId, reference.channel, reference.externalOrderId]);
}

export function validateExternalOrderReferences(tenantId: string, references: readonly ExternalOrderReference[] | undefined): void {
  if (!identifier(tenantId)) throw new Error('ORDER_EXTERNAL_TENANT_INVALID');
  if (references === undefined) return;
  if (!Array.isArray(references)) throw new Error('ORDER_EXTERNAL_REFERENCE_INVALID');
  const seen = new Set<string>();
  for (const reference of references) {
    const key = externalOrderReferenceKey(tenantId, reference);
    if (seen.has(key)) throw new Error('ORDER_EXTERNAL_REFERENCE_DUPLICATE');
    seen.add(key);
  }
}
