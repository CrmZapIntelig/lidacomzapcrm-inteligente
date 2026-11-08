import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { runFirestoreSatisfactionJob } from './firestoreSatisfactionJob';

test('overlapping preparations create one immutable draft in the local Firestore emulator', async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^127\.0\.0\.1:\d+$/);
  const app = initializeApp({ projectId: 'project-1300957a-ea82-4645-845' }, randomUUID());
  const contactId = randomUUID();
  const tenantId = 'prato-mineiro';
  const delivery = { tenantId, contactId, orderId: 'one', deliveredAt: '2026-11-04T12:00:00Z', state: 'DELIVERED' as const };
  const policy = { tenantId, contactId, blocked: false, operationalConsent: 'ALLOWED' as const, channel: 'RCS' as const, provider: 'RCS_GOOGLE' as const, channelAvailable: true };
  const input = { enabled: true, businessDate: '2026-11-04', now: '2026-11-05T12:00:00Z' };
  const run = (orderId: string) => runFirestoreSatisfactionJob(app, input, async () => ({
    deliveries: [{ ...delivery, orderId }], policies: [policy],
  }));
  try {
    const results = await Promise.all([run('one'), run('one')]);
    assert.deepEqual(results.map(result => result.created).sort(), [0, 1]);
    assert.equal(results.reduce((total, result) => total + result.replayed, 0), 1);
    const db = getFirestore(app, 'lidacomzapcrm-work-20261021');
    const key = ['SATISFACTION', tenantId, input.businessDate, contactId].join(':');
    const id = createHash('sha256').update(JSON.stringify(key)).digest('hex');
    const ref = db.collection('unified_satisfaction_audiences').doc(id);
    const stored = (await ref.get()).data()!;
    assert.equal(stored.id, id);
    assert.equal(stored.schema, 1);
    assert.equal(stored.canSend, false);
    assert.ok(stored.preparedAt instanceof Timestamp);
    await ref.update({ actor: 'emulator-operator' });
    assert.equal((await run('one')).replayed, 1);
    assert.equal((await ref.get()).get('actor'), 'emulator-operator');
    await assert.rejects(run('two'), /SATISFACTION_DRAFT_CONFLICT/);
    assert.equal((await run('one')).replayed, 1);
  } finally {
    await deleteApp(app);
  }
});
