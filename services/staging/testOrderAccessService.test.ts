import test from 'node:test';
import assert from 'node:assert/strict';
import { TestOrderAccessService } from './testOrderAccessService';
import type { VerifiedTestOrderPrincipal } from './testOrderAccessService';
import { StagingOperationalOrderStore } from './operationalOrderStore';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import type { AtomicJsonPort } from './durableInboundJournal';
import { testOrderCapabilities } from '../../src/application/testOrderAccess';
import type { TestOrderCapability, TestOrderRequest } from '../../src/application/testOrderAccess';

const environment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', operationalOrderWrites: 'TEST_ONLY' as const };
const tenant = 'demo-TEST-access', orderId = 'demo-TEST-order';
const time = Date.parse(orderFixtureTime) + 1000;
class MemoryPort implements AtomicJsonPort {
  value?: string; calls = 0; before?: () => Promise<void>; loseAck = false;
  async transaction<T>(update: (raw: string | undefined) => { value: string; result: T }): Promise<T> {
    this.calls++; await this.before?.(); const next = update(this.value); this.value = next.value;
    if (this.loseAck) { this.loseAck = false; throw new Error('connection lost after commit'); }
    return structuredClone(next.result);
  }
}
const request = (name: string, revision: number, operation: TestOrderRequest['operation']): TestOrderRequest => ({ commandId: `demo-TEST-${name}`, idempotencyKey: `demo-TEST-${name}`, orderId, expectedRevision: revision, at: new Date(time).toISOString(), operation });
const principal = (capabilities: readonly TestOrderCapability[] = testOrderCapabilities): VerifiedTestOrderPrincipal => ({ mode: 'TEST', tenantId: tenant, actorId: 'demo-TEST-operator', expiresAt: time + 60000, capabilities });
async function setup(grant: VerifiedTestOrderPrincipal | null = principal(), clock = () => time) {
  const port = new MemoryPort(), store = new StagingOperationalOrderStore(port, environment, tenant);
  await store.execute({ ...request('seed', 0, { kind: 'CONFIRM' }), tenantId: tenant, actor: 'demo-TEST-fixture', at: orderFixtureTime, operation: { kind: 'CREATE', snapshot: createOrderFixture(tenant, orderId) } });
  port.calls = 0;
  const state = { grant, resolutions: 0 };
  const service = new TestOrderAccessService(port, environment, tenant, async () => { state.resolutions++; return state.grant; }, clock);
  return { port, store, service, state };
}

test('access rejects missing, cross-tenant, expired, role-only and malformed principals before storage', async () => {
  for (const grant of [null, { ...principal(), tenantId: 'demo-TEST-another' }, { ...principal(), expiresAt: time }, { role: 'administrador' }, { ...principal(), capabilities: ['orders.read', 'admin'] }, { ...principal(), capabilities: ['orders.read', 'orders.read'] }, { ...principal(), actorId: 'real-operator' }, { ...principal(), mode: 'LIVE' }]) {
    const { service, port } = await setup(grant as VerifiedTestOrderPrincipal);
    await assert.rejects(service.list(), /ORDER_ACCESS_(DENIED|EXPIRED)/); assert.equal(port.calls, 0);
  }
});

test('environment and disabled access fail before identity resolution or storage', async () => {
  const port = new MemoryPort(); let resolutions = 0;
  for (const env of [{ ...environment, projectId: 'project-1300957a-ea82-4645-845' }, { ...environment, appEnv: 'production' }, { ...environment, operationalOrderWrites: 'DISABLED' as const }]) {
    assert.throws(() => new TestOrderAccessService(port, env, tenant, async () => { resolutions++; return principal(); }), /ORDER_STAGING_WRITES_DISABLED/);
  }
  const service = new TestOrderAccessService(port, environment, tenant, async () => { resolutions++; return principal(); });
  service.disable(); await assert.rejects(service.list(), /ORDER_ACCESS_DISABLED/); assert.equal(resolutions, 0); assert.equal(port.calls, 0);
});

test('read and operation grants are separate; a visual administrator has no automatic authority', async () => {
  const { service, port, state } = await setup(principal(['orders.read']));
  const page = await service.list(); assert.equal(page.orders[0].actions.length, 0); assert.equal(page.orders[0].canPrint, false);
  const calls = port.calls;
  for (const operation of [{ kind: 'CONFIRM' }, { kind: 'CANCEL' }, { kind: 'PRODUCTION', state: 'PREPARING' }, { kind: 'DELIVERY', state: 'ASSIGNED', courierId: 'demo-TEST-courier' }, { kind: 'RECEIVE', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-evidence' }, { kind: 'REFUND', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-refund' }, { kind: 'CHANGE_PAYMENT', method: 'PIX' }, { kind: 'NOTA_APPROVE' }, { kind: 'NOTA_REJECT' }]) await assert.rejects(service.execute(request('denied', 1, operation as TestOrderRequest['operation'])), /ORDER_ACCESS_DENIED/);
  await assert.rejects(service.print(orderId, 1), /ORDER_ACCESS_DENIED/); assert.equal(port.calls, calls);
  state.grant = principal(['orders.confirm']); await assert.rejects(service.execute(request('no-read', 1, { kind: 'CONFIRM' })), /ORDER_ACCESS_DENIED/); assert.equal(port.calls, calls);
});

test('request cannot choose tenant, actor, grants, create, edit snapshot, link identity or rollback', async () => {
  const { service, port } = await setup();
  const valid = request('confirm', 1, { kind: 'CONFIRM' });
  for (const input of [{ ...valid, actor: 'demo-TEST-other' }, { ...valid, tenantId: tenant }, { ...valid, capabilities: testOrderCapabilities }, ...['CREATE', 'UPDATE', 'LINK_EXTERNAL_REFERENCE', 'ROLLBACK_TEST', 'toString'].map(kind => ({ ...valid, operation: { kind } }))]) {
    await assert.rejects(service.execute(input as TestOrderRequest), /ORDER_ACCESS_REQUEST_INVALID/);
  }
  await assert.rejects(service.execute({ ...valid, operation: { kind: 'CONFIRM', status: 'PAID' } } as TestOrderRequest), /ORDER_UNSUPPORTED_FIELD/);
  assert.equal(port.calls, 0);
});

test('trusted actor is recorded; concurrent duplicates produce exactly one sale and preserve identity', async () => {
  const { service, store } = await setup(principal(['orders.read', 'orders.confirm']));
  const command = request('confirm', 1, { kind: 'CONFIRM' });
  const results = await Promise.all([service.execute(command), service.execute(command)]);
  assert.equal(results.filter(r => r.replay).length, 1);
  const state = await store.snapshot(); assert.equal(state.records.length, 1); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1);
  assert.equal(state.events[1].actor, 'demo-TEST-operator'); assert.equal(state.events[1].tenantId, tenant);
  assert.equal(state.cash.expected.PIX, 0); assert.equal(results[0].current.id, orderId);
});

test('revoked grants are resolved again on reads, replay and printing without leaking an old response', async () => {
  const { service, state, port } = await setup(); const command = request('confirm', 1, { kind: 'CONFIRM' });
  await service.execute(command); const before = port.value, calls = port.calls;
  state.grant = null;
  await assert.rejects(service.execute(command), /ORDER_ACCESS_DENIED/);
  await assert.rejects(service.list(), /ORDER_ACCESS_DENIED/);
  await assert.rejects(service.print(orderId, 2), /ORDER_ACCESS_DENIED/);
  assert.equal(port.calls, calls); assert.equal(port.value, before); assert.equal(state.resolutions, 4);
});

test('lost acknowledgement retries the original action and returns current state after later changes', async () => {
  const { service, port, store } = await setup(); const command = request('confirm', 1, { kind: 'CONFIRM' });
  port.loseAck = true; await assert.rejects(service.execute(command), /connection lost/);
  await service.execute(request('start', 2, { kind: 'PRODUCTION', state: 'PREPARING' }));
  const replay = await service.execute(command);
  assert.equal(replay.replay, true); assert.equal(replay.appliedRevision, 2); assert.equal(replay.current.revision, 3); assert.equal(replay.current.productionState, 'PREPARING');
  assert.equal((await store.snapshot()).events.filter(e => e.fact === 'SALE').length, 1);
});

test('another actor cannot replay the first actors command or overwrite a newer revision', async () => {
  const { service, state } = await setup(); const command = request('confirm', 1, { kind: 'CONFIRM' }); await service.execute(command);
  state.grant = { ...principal(), actorId: 'demo-TEST-other' };
  await assert.rejects(service.execute(command), /ORDER_IDEMPOTENCY_CONFLICT/);
  await assert.rejects(service.execute(request('other', 1, { kind: 'CONFIRM' })), /ORDER_REVISION_CONFLICT/);
});

test('expiration or disable while awaiting the atomic callback prevents mutation', async () => {
  for (const reason of ['expire', 'disable']) {
    let now = time; const { service, port } = await setup(principal(), () => now); const before = port.value;
    let release!: () => void; port.before = () => new Promise<void>(resolve => { release = resolve; });
    const pending = service.execute(request('confirm', 1, { kind: 'CONFIRM' }));
    while (!release) await new Promise(resolve => setImmediate(resolve));
    if (reason === 'expire') now += 60000; else service.disable();
    release(); await assert.rejects(pending, /ORDER_ACCESS_(EXPIRED|DISABLED)/); assert.equal(port.value, before);
  }
});

test('command and verified context are snapshotted across asynchronous boundaries', async () => {
  const { port, store } = await setup(); let resolve!: (value: VerifiedTestOrderPrincipal) => void;
  const grant = principal(); const service = new TestOrderAccessService(port, environment, tenant, () => new Promise(r => { resolve = r; }), () => time);
  const command = request('confirm', 1, { kind: 'CONFIRM' }); const pending = service.execute(command);
  command.operation = { kind: 'CANCEL' }; resolve(grant);
  let release!: () => void; port.before = () => new Promise<void>(r => { release = r; });
  while (!release) await new Promise(r => setImmediate(r));
  grant.actorId = 'demo-TEST-impostor'; grant.capabilities = []; release();
  // The service performs a second read after commit; release that callback immediately.
  port.before = undefined;
  const result = await pending; assert.equal(result.actorId, 'demo-TEST-operator'); assert.equal(result.current.orderState, 'CONFIRMED');
  assert.equal((await store.snapshot()).events[1].actor, 'demo-TEST-operator');
});

test('one canonical order crosses production and delivery without receiving money implicitly', async () => {
  const { service, store } = await setup();
  let reply = await service.execute(request('confirm', 1, { kind: 'CONFIRM' }));
  for (const [name, operation] of [
    ['start', { kind: 'PRODUCTION', state: 'PREPARING' }], ['ready', { kind: 'PRODUCTION', state: 'READY' }],
    ['assign', { kind: 'DELIVERY', state: 'ASSIGNED', courierId: 'demo-TEST-courier' }], ['route', { kind: 'DELIVERY', state: 'IN_TRANSIT', courierId: 'demo-TEST-courier' }], ['deliver', { kind: 'DELIVERY', state: 'DELIVERED', courierId: 'demo-TEST-courier' }],
  ] as const) reply = await service.execute(request(name, reply.current.revision, operation));
  assert.equal(reply.current.id, orderId); assert.equal(reply.current.paymentState, 'PENDING'); assert.equal(reply.current.receivedCents, 0); assert.equal(reply.current.deliveryState, 'DELIVERED');
  assert.equal((await store.snapshot()).cash.expected.PIX, 0);
  const print = await service.print(orderId, reply.current.revision); assert.ok(print.lines.includes('Pagamento: Pix - PENDENTE'));
  reply = await service.execute(request('receive', reply.current.revision, { kind: 'RECEIVE', method: 'PIX', amountCents: 4850, evidenceId: 'demo-TEST-receipt' }));
  assert.equal(reply.current.paymentState, 'RECEIVED'); assert.equal((await store.snapshot()).cash.expected.PIX, 4850);
  assert.equal((await store.snapshot()).records.length, 1);
});

test('print requires the displayed revision and never creates money, events or a new order', async () => {
  const { service, port } = await setup(); const before = port.value;
  const print = await service.print(orderId, 1); assert.equal(print.reference, orderId); assert.equal(print.mode, 'SIMULATION'); assert.equal(port.value, before);
  await service.execute(request('confirm', 1, { kind: 'CONFIRM' }));
  await assert.rejects(service.print(orderId, 1), /ORDER_REVISION_CONFLICT/);
  await assert.rejects(service.print('demo-TEST-missing', 1), /ORDER_ACCESS_NOT_FOUND/);
});

test('an invalid domain transition is denied even with all grants', async () => {
  const { service, port } = await setup(); const before = port.value;
  await assert.rejects(service.execute(request('early', 1, { kind: 'PRODUCTION', state: 'PREPARING' })), /ORDER_PRODUCTION_TRANSITION_INVALID/);
  assert.equal(port.value, before);
});
