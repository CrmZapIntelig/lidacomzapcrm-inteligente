import assert from 'node:assert/strict';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import type { StagingOperationalOrderStore } from './operationalOrderStore';
import type { OperationalCommand, OrderOperation } from '../../src/application/stagingOperationalOrders';
import { readTestProjection, closeTestCash } from '../../src/application/operationalOrderProjections';

/** Invoked manually on the isolated TEST store; no auth resolver, endpoint or provider here. */
export async function runOperationalOrderProbe(factory: () => StagingOperationalOrderStore, tenantId: string, commandNamespace = 'probe') {
  if (!/^[A-Za-z0-9_-]+$/.test(commandNamespace)) throw new Error('ORDER_PROBE_NAMESPACE_INVALID');
  const a = factory(), b = factory(); let serial = 0;
  const command = (orderId: string, expectedRevision: number, operation: OrderOperation): OperationalCommand => {
    const commandId = `demo-TEST-${commandNamespace}-${++serial}`;
    return { commandId, idempotencyKey: commandId, tenantId, orderId, expectedRevision, actor: 'demo-TEST-probe-operator', at: orderFixtureTime, operation };
  };
  const notaId = 'demo-TEST-probe-nota', deliveryId = 'demo-TEST-probe-delivery';
  const create = command(notaId, 0, { kind: 'CREATE', snapshot: createOrderFixture(tenantId, notaId, 'NOTA') });
  const creates = await Promise.all([a.execute(create), b.execute(create)]); assert.equal(creates.filter(r => r.replay).length, 1);
  const read = (await factory().get(notaId))!; assert.deepEqual(read.items, createOrderFixture().items); assert.equal(read.revision, 1);
  await a.execute(command(notaId, 1, { kind: 'NOTA_APPROVE' }));
  const confirmations = await Promise.allSettled([a.execute(command(notaId, 2, { kind: 'CONFIRM' })), b.execute(command(notaId, 2, { kind: 'CONFIRM' }))]);
  assert.equal(confirmations.filter(r => r.status === 'fulfilled').length, 1);
  const partial = command(notaId, 3, { kind: 'RECEIVE', amountCents: 1000, method: 'DINHEIRO', evidenceId: 'demo-TEST-probe-partial' });
  await a.execute(partial); assert.equal((await b.execute(partial)).replay, true);
  await factory().execute(command(notaId, 4, { kind: 'RECEIVE', amountCents: 3850, method: 'PIX', evidenceId: 'demo-TEST-probe-final' }));
  let state = await b.snapshot(); assert.equal(state.cash.totalSalesCents, 4850); assert.equal(state.cash.openCreditCents, 0); assert.equal(state.cash.drawerCents, 1000); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(state.records[0].notaState, 'PAID');
  assert.deepEqual(readTestProjection(state.projections[0]), state.records[0]);
  await a.execute(command(deliveryId, 0, { kind: 'CREATE', snapshot: createOrderFixture(tenantId, deliveryId) }));
  const reviewed = (await b.get(deliveryId))!;
  const editA = structuredClone(reviewed), editB = structuredClone(reviewed); editA.items[0].observation = 'TEST edit A'; editB.items[0].observation = 'TEST edit B';
  const edits = await Promise.allSettled([a.execute(command(deliveryId, 1, { kind: 'UPDATE', snapshot: editA })), b.execute(command(deliveryId, 1, { kind: 'UPDATE', snapshot: editB }))]); assert.equal(edits.filter(r => r.status === 'fulfilled').length, 1);
  await a.execute(command(deliveryId, 2, { kind: 'CONFIRM' }));
  await a.execute(command(deliveryId, 3, { kind: 'PRODUCTION', state: 'PREPARING' })); await b.execute(command(deliveryId, 4, { kind: 'PRODUCTION', state: 'READY' }));
  for (const [i, status] of ['ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].entries()) await factory().execute(command(deliveryId, 5 + i, { kind: 'DELIVERY', state: status as 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED', courierId: 'demo-TEST-probe-courier' }));
  state = await a.snapshot();
  const delivery = state.projections.find(p => p.orderId === deliveryId)!;
  assert.equal(delivery.kds?.status, 'PRONTO'); assert.equal(delivery.delivery?.legacy?.status, 'FECHADO'); assert.equal(delivery.delivery?.legacy?.address.neighborhood, 'Demo Bairro'); assert.equal(delivery.delivery?.legacy?.address.phone, 'TEST'); assert.equal(delivery.operationalSnapshot.canonical.status, 'CREATED'); assert.deepEqual(readTestProjection(delivery), (await factory().get(deliveryId))!);
  const closing = closeTestCash(state.events, { DINHEIRO: 2200, PIX: 3850, DEBITO: 0, CREDITO: 0, NOTA: 0 }, [{ id: 'demo-TEST-probe-supply', kind: 'CASH_IN', amountCents: 1000 }, { id: 'demo-TEST-probe-withdraw', kind: 'CASH_OUT', amountCents: 300 }], 500); assert.equal(closing.drawerCents, 2200); assert.ok(closing.rows.every(r => r.differenceCents === 0));
  const auditCount = state.audit.length;
  for (const s of state.records) await factory().execute(command(s.canonical.id, s.revision, { kind: 'ROLLBACK_TEST' }));
  const rolled = await factory().snapshot(); assert.equal(rolled.records.length, 0); assert.equal(rolled.projections.length, 0); assert.equal(rolled.cash.totalSalesCents, 0); assert.equal(rolled.audit.length, auditCount + 2);
  await assert.rejects(factory().execute(create), /ROLLED_BACK/);
  // Recreate only the selected synthetic fixture and roll it back again to prove recovery.
  await a.execute(command(deliveryId, 0, { kind: 'CREATE', snapshot: createOrderFixture(tenantId, deliveryId) })); await a.execute(command(deliveryId, 1, { kind: 'ROLLBACK_TEST' }));
  a.disable(); await assert.rejects(a.get(deliveryId), /WRITES_DISABLED/);
  return { projectId: 'lidacomzapcrm-staging', collection: 'stg_operational_orders', fixturesOnly: true, createRead: 'PASS', restartRetry: 'PASS', concurrentConfirm: 'PASS', concurrentUpdate: 'PASS', notaSaleCreditReceipt: 'PASS', roundTrip: 'PASS', kdsDelivery: 'PASS', cashClosing: 'PASS', rollbackRecreate: 'PASS', remainingOrders: 0, outbound: false, productionWrite: false };
}
