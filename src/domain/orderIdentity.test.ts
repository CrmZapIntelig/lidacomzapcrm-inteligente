import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExternalOrderReference } from './omnichannel';
import { externalOrderReferenceKey, validateExternalOrderReferences } from './orderIdentity';

const reference: ExternalOrderReference = {
  provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', providerAccountId: 'account-one', externalOrderId: 'order-one',
};

test('external order identity includes tenant, provider, account, channel and opaque order ID', () => {
  const key = externalOrderReferenceKey('tenant-one', reference);
  assert.deepEqual(JSON.parse(key), ['tenant-one', 'WHATSAPP_META_OFFICIAL', 'account-one', 'WHATSAPP', 'order-one']);
  for (const candidate of [
    externalOrderReferenceKey('tenant-two', reference),
    externalOrderReferenceKey('tenant-one', { ...reference, provider: 'WHATSAPP_EVOLUTION_OPTIONAL' }),
    externalOrderReferenceKey('tenant-one', { ...reference, providerAccountId: 'account-two' }),
    externalOrderReferenceKey('tenant-one', { ...reference, externalOrderId: 'order-two' }),
    externalOrderReferenceKey('tenant-one', { ...reference, provider: 'RCS_GOOGLE', channel: 'RCS' }),
  ]) assert.notEqual(candidate, key);
});

test('external order keys are case sensitive and cannot collide through separators', () => {
  assert.notEqual(externalOrderReferenceKey('tenant', reference), externalOrderReferenceKey('tenant', { ...reference, externalOrderId: 'ORDER-one' }));
  assert.notEqual(externalOrderReferenceKey('tenant', { ...reference, providerAccountId: 'a|b', externalOrderId: 'c' }), externalOrderReferenceKey('tenant', { ...reference, providerAccountId: 'a', externalOrderId: 'b|c' }));
  assert.notEqual(externalOrderReferenceKey('tenant', { ...reference, providerAccountId: 'a", "b', externalOrderId: 'c' }), externalOrderReferenceKey('tenant', { ...reference, providerAccountId: 'a', externalOrderId: 'b", "c' }));
});

test('unknown providers, mismatched channels and extra reference fields fail closed', () => {
  for (const invalid of [null, [], {}, { ...reference, provider: 'UNKNOWN' }, { ...reference, channel: 'RCS' }, { ...reference, provider: 'RCS_GOOGLE' }, { ...reference, providerMessageId: 'message-is-not-an-order' }, { ...reference, token: 'not-allowed' }]) {
    assert.throws(() => externalOrderReferenceKey('tenant', invalid as ExternalOrderReference), /ORDER_EXTERNAL_REFERENCE_INVALID/);
  }
});

test('identity validates opaque IDs without trimming or rewriting them', () => {
  for (const value of ['', ' padded', 'padded ', 'line\nbreak', '\u0000', '\u007f', 42, 'a'.repeat(257)]) {
    for (const field of ['providerAccountId', 'externalOrderId'] as const) assert.throws(() => externalOrderReferenceKey('tenant', { ...reference, [field]: value } as ExternalOrderReference), /ORDER_EXTERNAL_REFERENCE_INVALID/);
    assert.throws(() => externalOrderReferenceKey(value as string, reference), /ORDER_EXTERNAL_TENANT_INVALID/);
  }
  assert.equal(JSON.parse(externalOrderReferenceKey('tenant', { ...reference, externalOrderId: 'a'.repeat(256) }))[4].length, 256);
});

test('optional references keep old orders compatible and reject repeated identities', () => {
  validateExternalOrderReferences('tenant', undefined);
  validateExternalOrderReferences('tenant', []);
  validateExternalOrderReferences('tenant', [reference, { ...reference, providerAccountId: 'account-two' }]);
  assert.throws(() => validateExternalOrderReferences('tenant', [reference, { ...reference }]), /ORDER_EXTERNAL_REFERENCE_DUPLICATE/);
  for (const invalid of [null, {}, 'reference']) assert.throws(() => validateExternalOrderReferences('tenant', invalid as never), /ORDER_EXTERNAL_REFERENCE_INVALID/);
});
