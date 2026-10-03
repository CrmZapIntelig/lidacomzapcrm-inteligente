import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProviderReadiness } from './messagingReadiness';
test('readiness fails closed for disabled, unavailable, missing credentials and staging', () => {
  const base = { enabled: true, available: true, credentialConfigured: true, stagingVerified: true };
  const fields = ['enabled', 'available', 'credentialConfigured', 'stagingVerified'] as const;
  const reasons = ['PROVIDER_DISABLED', 'PROVIDER_UNAVAILABLE', 'MISSING_CREDENTIAL', 'STAGING_NOT_VERIFIED'];
  fields.forEach((field, index) => assert.equal(evaluateProviderReadiness({ ...base, [field]: false }).reason, reasons[index]));
  assert.equal(evaluateProviderReadiness(base).canSend, false);
});
