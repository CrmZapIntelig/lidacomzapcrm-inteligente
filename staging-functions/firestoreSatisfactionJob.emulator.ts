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

test('server reads delivered orders and current consent from the dedicated database', async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^127\.0\.0\.1:\d+$/);
  const app = initializeApp({ projectId: 'project-1300957a-ea82-4645-845' }, randomUUID());
  const db = getFirestore(app, 'lidacomzapcrm-work-20261021');
  const tenantId = 'prato-mineiro';
  const contactId = randomUUID();
  const orderId = randomUUID();
  const at = '2026-11-06T01:00:00.000Z';
  const input = { enabled: true, businessDate: '2026-11-05', now: '2026-11-06T12:00:00Z' };
  const order = {
    schema: 1, mode: 'PRODUCTION', revision: 3, canonical: { id: orderId, tenantId, contactId, entryPoint: 'POS',
      channel: 'NONE', creationMode: 'HUMAN_OPERATOR', total: 1, paymentMethod: 'PIX', status: 'CREATED', createdAt: at, updatedAt: at },
    customer: { id: contactId, name: 'Teste' }, conversation: null, modality: 'DELIVERY',
    items: [{ id: 'line', productId: 'food', name: 'Refeicao', size: 'M', unitCents: 100, quantity: 1, addons: [],
      removed: [], utensils: [], observation: '', subtotalCents: 100 }], subtotalCents: 100, feeCents: 0, discountCents: 0,
    totalCents: 100, address: { street: 'Rua', number: '1', district: 'Centro', zip: '30110-001' },
    table: null, legacyRefs: [], method: 'PIX', orderState: 'CONFIRMED', paymentState: 'PENDING', receivedCents: 0,
    productionState: 'READY', deliveryState: 'DELIVERED', deliveredAt: at, courierId: 'courier', notaState: 'NOT_REQUESTED',
  };
  try {
    await db.collection('unified_orders').doc(orderId).create({ tenantId, mode: 'PRODUCTION', revision: 3, payload: JSON.stringify(order) });
    const ref = db.collection('clients').doc(contactId);
    await ref.create({ type: 'salvo', phone: 'fixture', channel: 'rcs', contactPreferences: { operationalStatus: 'denied' } });
    assert.equal((await runFirestoreSatisfactionJob(app, input)).created, 0);
    await ref.update({ 'contactPreferences.operationalStatus': 'allowed' });
    assert.equal((await runFirestoreSatisfactionJob(app, input)).created, 1);
    assert.equal((await runFirestoreSatisfactionJob(app, input)).replayed, 1);
  } finally {
    await deleteApp(app);
  }
});
