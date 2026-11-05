import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailySatisfactionJob, type SatisfactionJobPort } from './dailySatisfactionJob';
import { prepareDailySatisfactionAudience, validSatisfactionDay } from './dailySatisfactionAudience';
import { planLegacyDeliveryReconciliation, type DeliveryAuditEvidence } from './legacyDeliveryReconciliation';
import type { OperationalSnapshot } from './productionOrders';

const scope = { tenantId: 'prato-mineiro', businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', now: '2026-10-30T03:01:00.000Z', enabled: true };
const delivery = { tenantId: scope.tenantId, orderId: 'o1', contactId: 'c1', deliveredAt: '2026-10-30T01:00:00.000Z', state: 'DELIVERED' as const };
const policy = { tenantId: scope.tenantId, contactId: 'c1', blocked: false, operationalConsent: 'ALLOWED' as const, channel: 'RCS' as const, provider: 'RCS_GOOGLE' as const, channelAvailable: true };
function fixture() {
  const stored = new Set<string>();
  let reads = 0;
  const port: SatisfactionJobPort = { tenantId: scope.tenantId,
    async load() { reads++; return { deliveries: [delivery], policies: [policy] }; },
    async persist(entries) {
      let created = 0;
      for (const entry of entries) {
        assert.equal(entry.canSend, false); assert.equal(entry.status, 'DRAFT_ONLY');
        if (!stored.has(entry.idempotencyKey)) { stored.add(entry.idempotencyKey); created++; }
      }
      return { created, replayed: entries.length - created };
    },
  };
  return { port, stored, reads: () => reads };
}
test('daily job disabled by default performs no I/O', async () => {
  const f = fixture();
  assert.equal((await runDailySatisfactionJob({ ...scope, enabled: undefined }, f.port)).status, 'DISABLED');
  assert.equal(f.reads(), 0); assert.equal(f.stored.size, 0);
});
test('daily job rejects open day in restaurant timezone and foreign tenant before I/O', async () => {
  const f = fixture();
  await assert.rejects(runDailySatisfactionJob({ ...scope, now: '2026-10-30T02:59:59Z' }, f.port), /DAY_NOT_CLOSED/);
  await assert.rejects(runDailySatisfactionJob({ ...scope, tenantId: 'other' }, f.port), /SCOPE_INVALID/);
  assert.equal(f.reads(), 0);
});
test('overlapping retries create one review-only RCS audience with an atomic port', async () => {
  const f = fixture();
  const results = await Promise.all([runDailySatisfactionJob(scope, f.port), runDailySatisfactionJob(scope, f.port)]);
  assert.equal(results.reduce((n, r) => n + r.created, 0), 1);
  assert.equal(results.reduce((n, r) => n + r.replayed, 0), 1);
  assert.equal(f.stored.size, 1);
});
test('persistence failure remains retryable, never reports success', async () => {
  const f = fixture(); const persist = f.port.persist;
  f.port.persist = async () => { throw new Error('offline'); };
  await assert.rejects(runDailySatisfactionJob(scope, f.port), /offline/);
  f.port.persist = persist;
  assert.equal((await runDailySatisfactionJob(scope, f.port)).created, 1);
});
test('blocked contacts do not reach persistence and malformed persistence counters fail', async () => {
  const f = fixture();
  f.port.load = async () => ({ deliveries: [delivery], policies: [{ ...policy, blocked: true }] });
  f.port.persist = async () => { throw new Error('must not persist'); };
  assert.equal((await runDailySatisfactionJob(scope, f.port)).created, 0);
  f.port.load = async () => ({ deliveries: [delivery], policies: [policy] });
  f.port.persist = async () => ({ created: 0, replayed: 0 });
  await assert.rejects(runDailySatisfactionJob(scope, f.port), /PERSISTENCE_RESULT_INVALID/);
});
test('impossible calendar dates and contradictory duplicate deliveries are rejected', () => {
  assert.equal(validSatisfactionDay('2026-02-30'), false);
  assert.equal(validSatisfactionDay('2024-02-29'), true);
  assert.throws(() => prepareDailySatisfactionAudience({ ...scope, deliveries: [delivery, { ...delivery, deliveredAt: '2026-10-29T01:00:00Z' }], policies: [policy] }), /EVIDENCE_CONFLICT/);
});
const order: Pick<OperationalSnapshot, 'canonical' | 'revision' | 'deliveryState'> = {
  canonical: { id: 'o1', tenantId: scope.tenantId, contactId: 'c1', entryPoint: 'POS', channel: 'NONE', creationMode: 'HUMAN_OPERATOR', total: 40, paymentMethod: 'PIX', status: 'CREATED', createdAt: new Date('2026-10-29T10:00:00Z'), updatedAt: new Date('2026-10-30T02:00:00Z') },
  revision: 5, deliveryState: 'DELIVERED',
};
const evidence: DeliveryAuditEvidence = { id: 'e1', commandId: 'cmd1', actor: 'operator', orderId: 'o1', tenantId: scope.tenantId, revision: 4, previousVersion: 3, newVersion: 4, at: delivery.deliveredAt, operation: 'DELIVERY', result: 'APPLIED', fact: 'STATE', amountCents: 0, method: 'PIX', deliveryState: 'DELIVERED' };
test('legacy operation name alone never proves final delivery', () => {
  const result = planLegacyDeliveryReconciliation(scope.tenantId, [order], [{ ...evidence, deliveryState: undefined }]);
  assert.equal(result[0].status, 'MISSING_TERMINAL_EVIDENCE');
});
test('explicit evidence proposes review with expected revision without modifying snapshot', () => {
  const before = structuredClone(order);
  const result = planLegacyDeliveryReconciliation(scope.tenantId, [order], [evidence, evidence]);
  assert.equal(result[0].status, 'REVIEW_REQUIRED'); assert.equal(result[0].expectedRevision, 5);
  assert.deepEqual(order, before);
});
test('reconciliation rejects conflicts, invalid event revision and cross-tenant evidence', () => {
  assert.equal(planLegacyDeliveryReconciliation(scope.tenantId, [order], [evidence, { ...evidence, id: 'e2' }])[0].status, 'CONFLICTING_EVIDENCE');
  assert.equal(planLegacyDeliveryReconciliation(scope.tenantId, [order], [{ ...evidence, revision: 6 }])[0].status, 'INVALID_EVIDENCE');
  assert.throws(() => planLegacyDeliveryReconciliation(scope.tenantId, [order], [{ ...evidence, tenantId: 'other' }]), /TENANT_INVALID/);
});
