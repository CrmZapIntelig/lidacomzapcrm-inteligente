import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestOrderRuntime } from '../../staging-functions/testOrderRuntime';
import type { TestOrderRuntimeDependencies, TestOrderRuntimeRequest, TestOrderRuntimeResponse } from '../../staging-functions/testOrderRuntime';
import { StagingOperationalOrderStore } from './operationalOrderStore';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import type { AtomicJsonPort } from './durableInboundJournal';

const projectId = 'lidacomzapcrm-staging', tenantId = 'demo-TEST-runtime', actorId = 'demo-TEST-operator';
const origin = 'https://lidacomzapcrm-staging.web.app', orderId = 'demo-TEST-runtime-order';
const time = Date.parse(orderFixtureTime) + 1000;
const environment = { appEnv: 'staging', projectId, operationalOrderWrites: 'TEST_ONLY' as const };
function config() {
  return { schema: 1, mode: 'TEST', enabled: true, environment: { ...environment }, tenantId, origin,
    memberships: [{ uid: 'verified-firebase-test-uid', tenantId, actorId, capabilities: ['orders.read'], expiresAt: time + 60000 }] };
}
class MemoryPort implements AtomicJsonPort {
  value?: string; calls = 0; loseAck = false; wait?: () => Promise<void>;
  async transaction<T>(update: (raw: string | undefined) => { value: string; result: T }): Promise<T> {
    this.calls++; await this.wait?.(); const next = update(this.value); this.value = next.value;
    if (this.loseAck) { this.loseAck = false; throw new Error('PRIVATE_DATABASE_DETAILS'); }
    return structuredClone(next.result);
  }
}
function request(body: unknown = { action: 'list' }): TestOrderRuntimeRequest {
  return { method: 'POST', originalUrl: '/api/test/orders',
    headers: { authorization: 'Bearer TEST.header.signature', origin, 'content-type': 'application/json' },
    rawHeaders: ['Authorization', 'Bearer TEST.header.signature', 'Origin', origin, 'Content-Type', 'application/json'],
    rawBody: Buffer.from(JSON.stringify(body)) };
}
async function call(runtime: ReturnType<typeof createTestOrderRuntime>, req = request()) {
  const result = { status: 0, headers: {} as Record<string, string>, body: '' };
  const response: TestOrderRuntimeResponse = { status(code) { result.status = code; }, set(headers) { result.headers = headers; }, send(body) { result.body = body; } };
  await runtime.handleHttp(req, response);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.ok(!result.body.includes('PRIVATE')); assert.ok(!result.body.includes('TEST.header.signature'));
  return { ...result, json: JSON.parse(result.body) };
}
function setup(configuration = config()) {
  const state = { now: time, uid: configuration.memberships[0].uid, verified: 0, revoked: false, wait: undefined as (() => Promise<void>) | undefined };
  const app = { options: { projectId } }, port = new MemoryPort();
  const auth = { app, async verifyIdToken(token: string, checkRevoked: boolean) {
    assert.equal(token, 'TEST.header.signature'); assert.equal(checkRevoked, true); state.verified++;
    await state.wait?.(); if (state.revoked) throw new Error('PRIVATE_AUTH_DETAILS');
    return { uid: state.uid, sub: state.uid, aud: projectId, iss: `https://securetoken.google.com/${projectId}`,
      exp: time / 1000 + 3600, iat: time / 1000 - 60, auth_time: time / 1000 - 60,
      firebase: { sign_in_provider: 'password' }, role: 'administrador', actorId: 'demo-TEST-forged', capabilities: ['orders.confirm'] };
  } } as unknown as TestOrderRuntimeDependencies['auth'];
  const runtime = createTestOrderRuntime(JSON.stringify(configuration), binding => {
    assert.deepEqual(binding, { environment, tenantId }); return { auth, port };
  }, () => state.now);
  return { runtime, auth, app, state, port };
}

test('runtime is closed by default and disabled config never initializes Auth or storage', async () => {
  for (const raw of [undefined, JSON.stringify({ schema: 1, mode: 'TEST', enabled: false })]) {
    const runtime = createTestOrderRuntime(raw, () => { throw new Error('must not connect'); });
    const result = await call(runtime); assert.equal(result.status, 503); assert.equal(result.json.error, 'ORDER_ACCESS_DISABLED');
    runtime.disable(); assert.equal((await call(runtime)).status, 503);
  }
});

test('invalid, foreign, ambiguous and expired configuration fails before connecting', () => {
  const c = config(), member = c.memberships[0]; let connected = 0;
  const configs: unknown[] = [null, [], {}, { ...c, schema: 2 }, { ...c, mode: 'LIVE' }, { ...c, enabled: 'true' },
    { ...c, enabled: false }, { ...c, credentials: 'PRIVATE' }, { ...c, environment: { ...environment, projectId: 'project-1300957a-ea82-4645-845' } },
    { ...c, environment: { ...environment, operationalOrderWrites: 'DISABLED' } }, { ...c, environment: { ...environment, unknown: true } },
    { ...c, tenantId: 'real-tenant' }, { ...c, origin: 'http://127.0.0.1:1234' }, { ...c, origin: 'https://example.com' }, { ...c, memberships: [] },
    { ...c, memberships: [member, member] }, { ...c, memberships: [member, { ...member, uid: 'second-uid' }] },
    ...[{ uid: '' }, { uid: ' uid ' }, { uid: 'a\nb' }, { uid: 'a'.repeat(129) }, { actorId: 'real-actor' },
      { tenantId: 'demo-TEST-other' }, { capabilities: ['orders.confirm'] }, { capabilities: ['orders.read', 'admin'] },
      { capabilities: ['orders.read', 'orders.read'] }, { expiresAt: time }, { expiresAt: time + .5 }, { email: 'not-a-uid' }]
      .map(patch => ({ ...c, memberships: [{ ...member, ...patch }] })),
  ];
  const connect = () => { connected++; throw new Error('must not connect'); };
  for (const value of configs) assert.throws(() => createTestOrderRuntime(JSON.stringify(value), connect, () => time), { message: 'ORDER_RUNTIME_CONFIGURATION_INVALID' });
  for (const raw of ['', '{', ' '.repeat(65537), JSON.stringify({ ...c, memberships: Array(129).fill(member) })])
    assert.throws(() => createTestOrderRuntime(raw, connect, () => time), /CONFIGURATION_INVALID/);
  assert.throws(() => createTestOrderRuntime(JSON.stringify(c), connect, () => NaN), /CONFIGURATION_INVALID/);
  assert.equal(connected, 0);
});

test('runtime composes verified Firebase identity with explicit server membership and current orders', async () => {
  const s = setup(); const result = await call(s.runtime);
  assert.equal(result.status, 200); assert.equal(result.json.actorId, actorId); assert.equal(result.json.tenantId, tenantId);
  assert.deepEqual(result.json.data.orders, []); assert.equal(s.port.calls, 1); assert.equal(s.state.verified, 1);
  await call(s.runtime); assert.equal(s.state.verified, 2);
});

test('unlisted UID and revoked user cannot inherit browser roles or read the store', async () => {
  const s = setup(); s.state.uid = '__proto__';
  assert.equal((await call(s.runtime)).status, 403); assert.equal(s.port.calls, 0);
  s.state.uid = config().memberships[0].uid; s.state.revoked = true;
  assert.equal((await call(s.runtime)).status, 401); assert.equal(s.port.calls, 0);
});

test('membership is immutable and expires on subsequent requests without restarting the runtime', async () => {
  const c = config(), s = setup(c); c.memberships[0].capabilities.push('orders.confirm'); c.memberships[0].expiresAt = time + 3600000;
  s.state.now = time + 60000; const result = await call(s.runtime);
  assert.equal(result.status, 401); assert.equal(result.json.error, 'ORDER_ACCESS_EXPIRED'); assert.equal(s.port.calls, 0);
});

test('raw header ambiguity and framework header disagreement are rejected before verification', async () => {
  const s = setup();
  for (const key of ['Authorization', 'Origin', 'Content-Type', 'Cookie', 'Content-Length', 'Transfer-Encoding']) {
    const req = request(); req.rawHeaders.push(key, 'first', key.toLowerCase(), 'second');
    assert.equal((await call(s.runtime, req)).status, 400);
  }
  for (const mutate of [
    // Deliberately violate Node's normalized header type to exercise rejection of a malformed wrapper.
    (r: TestOrderRuntimeRequest) => { r.headers.authorization = ['Bearer TEST.header.signature'] as unknown as string; },
    (r: TestOrderRuntimeRequest) => { r.rawHeaders.pop(); },
    (r: TestOrderRuntimeRequest) => { r.headers.authorization = 'Bearer forged.header.signature'; },
    (r: TestOrderRuntimeRequest) => { r.rawHeaders = []; },
  ]) { const req = request(); mutate(req); assert.equal((await call(s.runtime, req)).status, 400); }
  assert.equal(s.state.verified, 0); assert.equal(s.port.calls, 0);
});

test('wrapper uses the original raw body and exact route; parsed or forwarded data cannot override authority', async () => {
  const s = setup();
  const req = Object.assign(request(), { body: { action: 'execute', actorId: 'demo-TEST-forged' } });
  req.headers['x-forwarded-user'] = 'administrator'; req.headers['x-forwarded-origin'] = 'https://example.com';
  assert.equal((await call(s.runtime, req)).status, 200);
  for (const path of ['/api/test/orders?tenantId=demo-TEST-other', '/other', '/api/test/%6frders', 'https://example.com/api/test/orders']) {
    assert.equal((await call(s.runtime, { ...request(), originalUrl: path })).status, 404);
  }
  assert.equal((await call(s.runtime, { ...request(), rawBody: Buffer.from('{') })).status, 400);
  assert.equal((await call(s.runtime, { ...request(), rawBody: Buffer.alloc(16385) })).status, 413);
  assert.equal(s.state.verified, 1); assert.equal(s.port.calls, 1);
});

test('disable during identity verification prevents storage and remains irreversible for that runtime', async () => {
  const s = setup(); let release!: () => void; s.state.wait = () => new Promise<void>(r => { release = r; });
  const pending = call(s.runtime); while (!release) await new Promise(r => setImmediate(r));
  s.runtime.disable(); release(); assert.equal((await pending).status, 503); assert.equal(s.port.calls, 0);
  assert.equal((await call(s.runtime)).status, 503); assert.equal(s.state.verified, 1);
});

test('membership expiry while storage waits prevents the transaction update', async () => {
  const s = setup(); let release!: () => void; s.port.wait = () => new Promise<void>(r => { release = r; });
  const pending = call(s.runtime); while (!release) await new Promise(r => setImmediate(r));
  s.state.now = time + 60000; release(); assert.equal((await pending).status, 401); assert.equal(s.port.value, undefined);
});

test('invalid connector, Auth project and checkout binding fail at startup with sanitized errors and no store I/O', () => {
  const s = setup(), raw = JSON.stringify(config());
  assert.throws(() => createTestOrderRuntime(raw, undefined, () => time), /CONFIGURATION_INVALID/);
  assert.throws(() => createTestOrderRuntime(raw, () => { throw new Error('PRIVATE_CONNECTOR_DETAILS'); }, () => time), { message: 'ORDER_RUNTIME_CONFIGURATION_INVALID' });
  s.app.options.projectId = 'project-1300957a-ea82-4645-845';
  assert.throws(() => createTestOrderRuntime(raw, () => ({ auth: s.auth, port: s.port }), () => time), /CONFIGURATION_INVALID/);
  s.app.options.projectId = projectId;
  assert.throws(() => createTestOrderRuntime(raw, () => ({ auth: s.auth, port: s.port, checkout: {
    port: s.port, environment: { appEnv: 'staging', projectId, pilotOrderWrites: 'TEST_ONLY' }, creationMode: 'HUMAN_OPERATOR',
  } }), () => time), /CONFIGURATION_INVALID/);
  assert.equal(s.state.verified, 0); assert.equal(s.port.calls, 0);
});

test('read-only membership cannot confirm orders even when token claims suggest administrator', async () => {
  const s = setup();
  const result = await call(s.runtime, request({ action: 'execute', request: {
    commandId: 'demo-TEST-confirm', idempotencyKey: 'demo-TEST-confirm', orderId, expectedRevision: 1,
    at: new Date(time).toISOString(), operation: { kind: 'CONFIRM' },
  } }));
  assert.equal(result.status, 403); assert.equal(s.port.calls, 0);
});

test('composed runtime retries a lost acknowledgement with one canonical order and one sale', async () => {
  const c = config(); c.memberships[0].capabilities.push('orders.confirm', 'orders.print'); const s = setup(c);
  const store = new StagingOperationalOrderStore(s.port, environment, tenantId);
  await store.execute({ commandId: 'demo-TEST-seed', idempotencyKey: 'demo-TEST-seed', orderId, expectedRevision: 0,
    tenantId, actor: actorId, at: new Date(time).toISOString(), operation: { kind: 'CREATE', snapshot: createOrderFixture(tenantId, orderId) } });
  const req = request({ action: 'execute', request: { commandId: 'demo-TEST-confirm', idempotencyKey: 'demo-TEST-confirm', orderId,
    expectedRevision: 1, at: new Date(time).toISOString(), operation: { kind: 'CONFIRM' } } });
  s.port.loseAck = true; assert.equal((await call(s.runtime, req)).status, 503);
  const retry = await call(s.runtime, req); assert.equal(retry.status, 200); assert.equal(retry.json.data.replay, true);
  assert.equal(retry.json.data.current.orderState, 'CONFIRMED'); assert.equal(retry.json.data.current.paymentState, 'PENDING');
  const snapshot = await store.snapshot(); assert.equal(snapshot.records.length, 1); assert.equal(snapshot.events.filter(e => e.fact === 'SALE').length, 1);
  assert.equal(snapshot.events.at(-1)!.actor, actorId);
  const print = await call(s.runtime, request({ action: 'print', request: { orderId, expectedRevision: 2 } }));
  assert.equal(print.status, 200); assert.equal(print.json.data.reference, orderId);
});
