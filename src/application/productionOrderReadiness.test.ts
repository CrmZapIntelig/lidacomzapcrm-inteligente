import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planProductionOrderCanary, planCanaryRollback, productionOrderDefault } from './productionOrderReadiness';
import type { CanaryPlanInput } from './productionOrderReadiness';
const input = (): CanaryPlanInput => ({ mode: 'DRY_RUN', appEnv: 'production', projectId: 'project-1300957a-ea82-4645-845', operationalOrderWrites: 'DISABLED', proposedFlag: 'CANARY_TEST_ONLY', tenantId: 'TEST-production-canary', actorId: 'TEST-authorized-operator', canaryId: 'TEST-canary-001', commandId: 'TEST-command-001', revision: 0, at: '2026-10-04T12:00:00.000Z' });
test('minimum legacy-first dry run keeps writes disabled and excludes financial/delivery/NOTA effects', () => {
  const before = input(); const plan = planProductionOrderCanary(Object.freeze(before));
  assert.equal(productionOrderDefault.operationalOrderWrites, 'DISABLED');
  assert.equal(plan.canWrite, false); assert.equal(plan.authorization, 'CANARY NOT AUTHORIZED');
  assert.equal(plan.candidate.collection, 'orders'); assert.equal(plan.candidate.operation, 'CREATE_IF_ABSENT');
  assert.equal(plan.candidate.order.status, 'Pendente'); assert.equal(plan.candidate.order.total, 0);
  assert.equal(plan.candidate.order.items[0].price, 0); assert.equal(plan.candidate.order.paymentMethod, 'Pix');
  assert.equal(plan.projection.order.status, 'CREATED'); assert.equal(plan.projection.order.entryPoint, 'POS');
  assert.deepEqual(plan.effects, { sale: 0, receipt: 0, cashDelta: 0, nota: false, kds: false, delivery: false, clientWrite: false, messageWrite: false, outbound: false });
  assert.deepEqual(before, input()); assert.ok(plan.prerequisites.includes('WRITERS_QUIESCED'));
});
test('production dry run rejects wrong environment, active flags, real identities, unsupported fields and revision', () => {
  for (const patch of [{ mode: 'LIVE' }, { appEnv: 'staging' }, { projectId: 'lidacomzapcrm-staging' }, { operationalOrderWrites: 'CANARY_TEST_ONLY' }, { proposedFlag: 'ENABLED' }, { tenantId: 'real-tenant' }, { actorId: 'real-user' }, { canaryId: '../orders/real' }, { commandId: 'real' }, { revision: 1 }, { at: '2026-02-30T12:00:00.000Z' }, { phone: '+5511999999999' }, { order: { status: 'Pago' } }, { paymentMethod: 'NOTA' }]) assert.throws(() => planProductionOrderCanary({ ...input(), ...patch } as CanaryPlanInput), /READINESS_REJECTED/);
});
test('replay is a deterministic independent plan and audit contains metadata only', () => {
  const a = planProductionOrderCanary(input()); const b = planProductionOrderCanary(input());
  assert.deepEqual(a, b); a.candidate.order.items[0].productName = 'changed'; assert.notEqual(a.candidate.order.items[0].productName, b.candidate.order.items[0].productName);
  assert.equal('clientName' in b.audit, false); assert.equal('phone' in b.audit, false); assert.equal(b.audit.rollbackStatus, 'NOT_NEEDED');
});
test('readiness implementation exposes no write, transport, credential, backend or activation port', () => {
  const source = readFileSync(new URL('./productionOrderReadiness.ts', import.meta.url), 'utf8');
  assert.ok(!/firebase|fetch\s*\(|axios|setDoc|updateDoc|deleteDoc|process\.env|localStorage|accessToken|execute\s*\(/.test(source));
  assert.match(source, /canWrite: false/); assert.match(source, /operationalOrderWrites: 'DISABLED'/);
});

test('rollback plan targets only the exact unchanged canary, halts on changes or financial evidence', () => {
  const plan = planProductionOrderCanary(input());
  assert.equal(planCanaryRollback(plan, plan.candidate.order, false).action, 'PROPOSE_DELETE_EXACT_CANARY_WITH_UPDATE_TIME_PRECONDITION');
  assert.equal(planCanaryRollback(plan, null, false).action, 'ALREADY_ABSENT');
  for (const modified of [{ ...plan.candidate.order, id: 'real-order' }, { ...plan.candidate.order, status: 'Pago' as const }, { ...plan.candidate.order, total: 1 }]) assert.equal(planCanaryRollback(plan, modified, false).action, 'HALT_CONFLICT');
  assert.equal(planCanaryRollback(plan, plan.candidate.order, true).action, 'HALT_CONFLICT');
  assert.equal(planCanaryRollback(plan, plan.candidate.order, false).canWrite, false);
});
