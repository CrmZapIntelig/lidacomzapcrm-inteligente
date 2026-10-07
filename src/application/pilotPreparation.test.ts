import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPilotOptOut, buildPilotMenuLink, isPilotOptOut, preparePilotBatch } from './pilotPreparation';
import type { EligibilityEvidence } from '../domain/dispatchPrerequisites';
import { createContactChannelIdentity, createProviderCapabilities } from '../domain/offlinePrimitives';

const at = new Date('2026-10-06T12:00:00Z');
function evidence(id: string): EligibilityEvidence {
  const phone = id === 'two' ? '+15555550101' : '+15555550100';
  return { tenantId: 'demo-TEST', contactId: id, phone, blocked: false, optedOut: false, group: false,
    consent: 'ALLOWED', preferredChannel: 'WHATSAPP', alreadyPrepared: false, templateApprovedForOffline: true,
    identity: createContactChannelIdentity({ id: `identity-${id}`, tenantId: 'demo-TEST', contactId: id, channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', address: phone, availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: at, updatedAt: at }),
    capability: createProviderCapabilities({ channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', capabilities: ['TEXT'], source: 'MANUAL', observedAt: at }) };
}
const policy = { tenantId: 'demo-TEST', minimumIntervalMs: 0, evaluatedAt: at };
const batch = (patch: Partial<Parameters<typeof preparePilotBatch>[0]> = {}) => preparePilotBatch({ selectedIds: ['one', 'two'], evidence: [evidence('one'), evidence('two')], policy, requestedCount: 100, commercialRemaining: 100, providerRemaining: 100, riskLimit: 1, operatorStarted: true, ...patch });

test('Portuguese opt-out recognizes explicit commands without blocking negations or quoted phrases', () => {
  for (const text of ['PARAR', ' sair! ', 'NÃO  QUERO.']) assert.equal(isPilotOptOut(text), true);
  for (const text of ['não quero cancelar meu pedido', 'quero sair às 18h', 'o botão diz PARAR', '', 'PARAR'.repeat(40)]) assert.equal(isPilotOptOut(text), false);
});
test('opt-out blocks existing eligibility and ordinary replies never restore consent', () => {
  const source = evidence('one'); const blocked = applyPilotOptOut(source, 'PARAR');
  assert.equal(source.optedOut, false); assert.equal(blocked.optedOut, true); assert.equal(blocked.consent, 'DENIED');
  assert.equal(applyPilotOptOut(blocked, 'Olá').optedOut, true);
  assert.equal(batch({ evidence: [blocked, evidence('two')] }).decisions[0].reasons.includes('OPTED_OUT'), true);
});
test('100 selected never overrides provider, commercial or risk limits; operator required', () => {
  assert.deepEqual(batch().previewContactIds, ['one']);
  assert.deepEqual(batch({ providerRemaining: 0 }).previewContactIds, []);
  assert.deepEqual(batch({ commercialRemaining: 0 }).previewContactIds, []);
  assert.deepEqual(batch({ operatorStarted: false }).previewContactIds, ['one']);
  assert.deepEqual(batch({ operatorStarted: false }).preparedContactIds, []);
  assert.deepEqual(batch().preparedContactIds, ['one']);
  assert.equal(batch().canEnqueue, false); assert.equal(batch().canSend, false);
});
test('unknown provider limit and unsafe numeric inputs fail closed', () => {
  assert.deepEqual(batch({ providerRemaining: null }).previewContactIds, []);
  for (const riskLimit of [-1, 1.5, NaN, Infinity]) assert.throws(() => batch({ riskLimit }));
});
test('selection dedupe, missing evidence and cross-tenant evidence cannot create drafts', () => {
  assert.equal(batch({ selectedIds: ['one', 'one'] }).selectedCount, 1);
  assert.deepEqual(batch({ evidence: [evidence('one'), evidence('one')] }).previewContactIds, []);
  assert.deepEqual(batch({ evidence: [{ ...evidence('one'), tenantId: 'other-TEST' }] }).previewContactIds, []);
});
test('consent, opt-out and unavailable channel reject selection through canonical eligibility', () => {
  for (const patch of [{ consent: 'UNKNOWN' as const }, { optedOut: true }, { blocked: true }, { alreadyPrepared: true }]) {
    assert.deepEqual(batch({ evidence: [{ ...evidence('one'), ...patch }] }).previewContactIds, []);
  }
});
test('two contacts sharing an address and optional providers are rejected in the official Meta pilot', () => {
  const one = evidence('one'), two = evidence('two');
  assert.deepEqual(batch({ riskLimit: 100, evidence: [one, { ...two, phone: one.phone, identity: { ...two.identity, address: one.phone } }] }).previewContactIds, []);
  const optional = { ...one, identity: { ...one.identity, provider: 'WHATSAPP_EVOLUTION_OPTIONAL' as const }, capability: { ...one.capability!, provider: 'WHATSAPP_EVOLUTION_OPTIONAL' as const } };
  assert.deepEqual(batch({ selectedIds: ['one'], evidence: [optional] }).previewContactIds, []);
});
test('menu link binds exact approved HTTPS origin and menu ID', () => {
  assert.equal(buildPilotMenuLink({ approvedOrigin: 'https://menu.example.invalid', approvedMenuId: 'TEST-menu', requestedMenuId: 'TEST-menu' }), 'https://menu.example.invalid/cardapio/TEST-menu');
  for (const approvedOrigin of [null, 'http://menu.example.invalid', 'https://user:secret@menu.example.invalid', 'https://menu.example.invalid/path', 'https://menu.example.invalid?x=1', 'https://127.0.0.1']) {
    assert.throws(() => buildPilotMenuLink({ approvedOrigin, approvedMenuId: 'TEST-menu', requestedMenuId: 'TEST-menu' }));
  }
});
test('menu link rejects unapproved IDs and path/query injection', () => {
  for (const requestedMenuId of ['other-menu', '../TEST-menu', 'TEST-menu?tenant=other', 'TEST-menu/other']) assert.throws(() => buildPilotMenuLink({ approvedOrigin: 'https://menu.example.invalid', approvedMenuId: 'TEST-menu', requestedMenuId }));
});
