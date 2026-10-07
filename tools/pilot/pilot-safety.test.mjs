import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPilotRulesCases } from './pilot-rules-cases.mjs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
test('pilot readiness defaults cannot activate order, credit, outbound or live providers', () => {
  const config = JSON.parse(read('config/pilot-readiness.json'));
  for (const field of ['PILOT_WHATSAPP_ACTIVE_SALES', 'PILOT_ORDER_WRITES', 'PILOT_NOTA', 'metaProvider', 'rcsProvider']) assert.equal(config[field], 'DISABLED');
  assert.equal(config.canSend, false); assert.equal(config.productionRulesDeployed, false); assert.equal(config.realInboundTested, false); assert.equal(config.realTestOutboundTested, false);
  assert.equal(config.approvedMenuOrigin, null); assert.equal(config.approvedMenuId, null);
});
test('simulator evidence is complete, reproducible and tied to exact candidate source', () => {
  const proof = JSON.parse(read('docs/pilot/evidence/SEC-PILOT-01-rules-simulator.json')), source = read('docs/pilot/security/firestore.pilot.candidate.rules');
  const suite = buildPilotRulesCases(); assert.equal(suite.cases.length, 511); assert.deepEqual(suite.groups, proof.groups);
  assert.equal(proof.total, suite.cases.length); assert.equal(proof.sourceSha256, createHash('sha256').update(source).digest('hex'));
  assert.equal(proof.rulesPublished, false); assert.equal(proof.operationalWrites, 0); assert.equal(proof.firestoreDataLookups, 0);
  assert.equal(proof.results.reduce((sum, r) => sum + r.states.SUCCESS, 0), 511);
  for (const r of proof.results) { assert.deepEqual(Object.keys(r.states), ['SUCCESS']); assert.equal(r.issues.length, 0); }
});
test('candidate rules are not deployment configuration and exclude protected recursive overlap', () => {
  for (const file of ['firebase.json', 'firebase.staging.json', '.github/workflows/unification-offline.yml']) assert.ok(!read(file).includes('firestore.pilot.candidate.rules'));
  const rules = read('docs/pilot/security/firestore.pilot.candidate.rules'); assert.ok(!/(?<!\.)\b(get|exists|getAfter)\s*\(/.test(rules));
  assert.ok(rules.includes("request.auth.token.get('pilotOrganizationId', '') == 'prato-mineiro'"));
  assert.ok(rules.includes("'pilotPublicMenus', 'operationalCanaryAudit'"));
});
test('new pilot cores and TEST store have no transport, credentials or operational UI binding', () => {
  for (const file of ['src/application/pilotPreparation.ts', 'src/application/pilotMenuCheckout.ts', 'services/staging/pilotCheckoutStore.ts']) {
    const source = read(file); assert.ok(!/\bfetch\s*\(|\baxios\b|firebase\/|console\.|localStorage|process\.env|\.sendText\(|\.sendTemplate\(/.test(source), file);
  }
  for (const file of ['src/App.tsx', 'src/components/PublicCardapioView.tsx', 'src/components/CardapioView.tsx']) assert.ok(!read(file).includes('pilotCheckoutStore'));
});
