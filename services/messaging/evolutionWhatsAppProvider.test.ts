import test from 'node:test';
import assert from 'node:assert/strict';
import { EvolutionWhatsAppProvider } from './evolutionWhatsAppProvider';
const input = { tenantId: 'demo-TEST', contactId: 'contact-TEST', recipient: '+12025550100', text: 'TEST local', mode: 'SIMULATION' as const, blocked: false, optedOut: false, consent: 'ALLOWED' as const };
const provider = () => new EvolutionWhatsAppProvider({ tenantId: input.tenantId, instanceName: 'TEST-instance', mode: 'MOCK' });
test('Evolution uses v2 text DTO in a local draft; no Meta template or delivery claim', async () => {
  const draft = provider().prepareText(input);
  assert.deepEqual(draft.payload, { number: '12025550100', text: 'TEST local', linkPreview: false });
  assert.equal(draft.canSend, false); assert.equal(draft.state, 'DRAFT');
  assert.equal((await provider().sendText(input)).outcome, 'MOCK');
});
test('Evolution disabled by default and STAGING/LIVE cannot send or promote simulation', async () => {
  for (const mode of [undefined, 'STAGING', 'LIVE'] as const) {
    const p = new EvolutionWhatsAppProvider({ tenantId: input.tenantId, instanceName: 'TEST-instance', mode });
    assert.throws(() => p.prepareText(input));
    const result = await p.sendText(input);
    assert.equal(result.outcome, mode ? 'BLOCKED' : 'DISABLED');
    assert.equal('providerMessageId' in result, false);
  }
  assert.throws(() => provider().prepareText({ ...input, mode: 'LIVE' }));
});
test('Evolution rejects wrong tenant, groups, blank text and unsafe instance names', () => {
  for (const patch of [{ tenantId: 'other' }, { recipient: '123@g.us' }, { recipient: '123@lid' }, { contactId: '' }, { text: ' ' }, { text: 'a'.repeat(4097) }]) assert.throws(() => provider().prepareText({ ...input, ...patch }));
  for (const instanceName of ['', '../other', 'a/b', 'a?apikey=secret']) assert.throws(() => new EvolutionWhatsAppProvider({ tenantId: input.tenantId, instanceName }));
});
test('Evolution consent and opt-out fail closed, including malformed booleans', async () => {
  for (const patch of [{ blocked: true }, { optedOut: true }, { consent: 'UNKNOWN' as const }, { consent: 'DENIED' as const }, { blocked: undefined as unknown as boolean }]) {
    assert.throws(() => provider().prepareText({ ...input, ...patch }));
    const result = await provider().sendText({ ...input, ...patch });
    assert.deepEqual(result, { mode: 'SIMULATION', outcome: 'BLOCKED', reason: 'POLICY_OR_PAYLOAD_INVALID' });
  }
});
