import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDurableTestOrderRuntime } from '../../staging-functions/testOrderDurableRuntime';
import type { TestOrderRuntimeDependencies, TestOrderRuntimeRequest, TestOrderRuntimeResponse } from '../../staging-functions/testOrderRuntime';
import { createFirestoreOrderStore } from './operationalOrderStore';
import { createFirestoreCheckoutPort, PilotCheckoutTestStore } from './pilotCheckoutStore';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import { StagingFirestoreHttp } from './firestoreHttp';
import { privateOrdersReleasePlan } from '../../tools/pilot/privateOrdersReleasePlan';
import type { PilotCatalog, PilotCheckoutCommand } from '../../src/application/pilotMenuCheckout';

const projectId = 'lidacomzapcrm-staging', tenantId = 'demo-TEST-durable', actorId = 'demo-TEST-operator';
const origin = 'https://lidacomzapcrm-staging.web.app', orderId = 'demo-TEST-durable-order';
const time = Date.parse(orderFixtureTime) + 1000;
const environment = { appEnv: 'staging', projectId, operationalOrderWrites: 'TEST_ONLY' as const };
const checkoutEnvironment = { appEnv: 'staging', projectId, pilotOrderWrites: 'TEST_ONLY' as const };
const root = `projects/${projectId}/databases/(default)/documents`;
function config(tenant = tenantId, capabilities = ['orders.read', 'orders.print', 'orders.confirm', 'orders.checkout.import']) {
  return { schema: 1, mode: 'TEST', enabled: true, environment, tenantId: tenant, origin,
    memberships: [{ uid: 'verified-firebase-test-uid', tenantId: tenant, actorId, capabilities, expiresAt: time + 60000 }] };
}
function request(body: unknown = { action: 'list' }): TestOrderRuntimeRequest {
  return { method: 'POST', originalUrl: '/api/test/orders',
    headers: { authorization: 'Bearer TEST.header.signature', origin, 'content-type': 'application/json' },
    rawHeaders: ['Authorization', 'Bearer TEST.header.signature', 'Origin', origin, 'Content-Type', 'application/json'],
    rawBody: Buffer.from(JSON.stringify(body)) };
}
async function call(runtime: ReturnType<typeof createDurableTestOrderRuntime>, req = request()) {
  const result = { status: 0, body: '' };
  const response: TestOrderRuntimeResponse = { status(code) { result.status = code; }, set() {}, send(body) { result.body = body; } };
  await runtime.handleHttp(req, response);
  assert.ok(!result.body.includes('PRIVATE')); assert.ok(!result.body.includes('TEST.header.signature'));
  return { ...result, json: JSON.parse(result.body) };
}

/** REST-shaped in-memory substitute. Every fetch is intercepted; no emulator/cloud credentials. */
class FirestoreFixture {
  docs = new Map<string, string>(); commits: string[] = []; begins: boolean[] = []; requests = 0;
  revision = 0; loseAck = false; conflictOnce = false; beforeRead?: () => Promise<void>; beforeRollback?: () => Promise<void>;
  transactions = new Map<string, { docs: Map<string, string>; revision: number; readOnly: boolean }>();
  sequence = 0;
  fetch: typeof fetch = async (input, init) => {
    this.requests++;
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer TEST-cloud-token');
    const url = new URL(String(input)); assert.equal(url.origin, 'https://firestore.googleapis.com');
    const resource = url.pathname.slice('/v1/'.length);
    assert.ok(resource.startsWith(root));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (resource.endsWith(':beginTransaction')) {
      const id = `tx${++this.sequence}`, readOnly = !!body.options.readOnly; this.begins.push(readOnly);
      this.transactions.set(id, { docs: new Map(this.docs), revision: this.revision, readOnly }); return json({ transaction: id });
    }
    if (init?.method === 'GET') {
      await this.beforeRead?.();
      const tx = this.transactions.get(url.searchParams.get('transaction')!); assert.ok(tx);
      const value = tx.docs.get(resource);
      return value === undefined ? json({}, 404) : json({ fields: { payload: { stringValue: value } } });
    }
    if (resource.endsWith(':rollback')) { await this.beforeRollback?.(); this.transactions.delete(body.transaction); return json({}); }
    if (resource.endsWith(':commit')) {
      const tx = this.transactions.get(body.transaction); assert.ok(tx); assert.equal(tx.readOnly, false);
      if (this.conflictOnce) { this.conflictOnce = false; return json({}, 409); }
      if (tx.revision !== this.revision) return json({}, 409);
      assert.equal(body.writes.length, 1);
      const write = body.writes[0]; assert.equal(write.currentDocument.exists, this.docs.has(write.update.name));
      this.docs.set(write.update.name, write.update.fields.payload.stringValue); this.revision++; this.commits.push(write.update.name);
      this.transactions.delete(body.transaction);
      if (this.loseAck) { this.loseAck = false; throw new Error('PRIVATE_ACK_LOST'); }
      return json({});
    }
    throw new Error('Unexpected request');
  };
}
async function isolated(run: (db: FirestoreFixture) => Promise<void>) {
  const prior = globalThis.fetch, db = new FirestoreFixture(); globalThis.fetch = db.fetch;
  try { await run(db); } finally { globalThis.fetch = prior; }
}
function setup(tenant = tenantId, capabilities?: string[], checkout = false) {
  const state = { now: time, credentials: 0, auth: 0, uid: 'verified-firebase-test-uid' };
  const auth = { app: { options: { projectId } }, async verifyIdToken(token: string, checkRevoked: boolean) {
    assert.equal(token, 'TEST.header.signature'); assert.equal(checkRevoked, true);
    return { uid: state.uid, sub: state.uid, aud: projectId, iss: `https://securetoken.google.com/${projectId}`,
      exp: time / 1000 + 3600, iat: time / 1000 - 60, auth_time: time / 1000 - 60, firebase: { sign_in_provider: 'google.com' } };
  } } as unknown as TestOrderRuntimeDependencies['auth'];
  const token = async () => { state.credentials++; return 'TEST-cloud-token'; };
  const runtime = createDurableTestOrderRuntime(JSON.stringify(config(tenant, capabilities)), {
    auth: () => { state.auth++; return auth; }, freshAccessToken: token, ...(checkout ? { checkout: { creationMode: 'CUSTOMER' as const } } : {}),
  }, () => state.now);
  const store = createFirestoreOrderStore(environment, tenant, token);
  return { state, runtime, store, token };
}
async function seed(s: ReturnType<typeof setup>) {
  return s.store.execute({ commandId: 'demo-TEST-seed', idempotencyKey: 'demo-TEST-seed', orderId, expectedRevision: 0,
    tenantId, actor: actorId, at: new Date(time).toISOString(), operation: { kind: 'CREATE', snapshot: createOrderFixture(tenantId, orderId) } });
}
const confirm = () => request({ action: 'execute', request: { commandId: 'demo-TEST-confirm', idempotencyKey: 'demo-TEST-confirm', orderId,
  expectedRevision: 1, at: new Date(time).toISOString(), operation: { kind: 'CONFIRM' } } });

test('durable disabled and invalid runtimes never initialize Auth, credentials or network', async () => isolated(async db => {
  const fail = () => { throw new Error('must not initialize'); };
  for (const raw of [undefined, JSON.stringify({ schema: 1, mode: 'TEST', enabled: false })]) {
    const runtime = createDurableTestOrderRuntime(raw, { auth: fail, freshAccessToken: fail }, () => time);
    assert.equal((await call(runtime)).status, 503);
  }
  assert.throws(() => createDurableTestOrderRuntime(JSON.stringify({ ...config(), environment: { ...environment, projectId: 'operational' } }), { auth: fail, freshAccessToken: fail }, () => time), /CONFIGURATION_INVALID/);
  assert.equal(db.requests, 0);
}));

test('authorized empty list reads a missing aggregate without creating it', async () => isolated(async db => {
  const s = setup(); assert.equal(s.state.credentials, 0);
  const result = await call(s.runtime); assert.equal(result.status, 200); assert.deepEqual(result.json.data.orders, []);
  assert.deepEqual(db.begins, [true]); assert.equal(db.commits.length, 0); assert.equal(db.docs.size, 0); assert.equal(db.transactions.size, 0);
}));

test('durable list, snapshot and print reuse partition 200 without committing or changing stored bytes', async () => isolated(async db => {
  const s = setup(); await seed(s); const before = new Map(db.docs), commits = db.commits.length;
  // Explicit separator avoids accidentally hashing a decimal/account/channel concatenation.
  const expected = createHash('sha256').update(tenantId + String.fromCharCode(0) + '200').digest('hex');
  assert.ok(db.docs.has(`${root}/stg_operational_orders/${expected}`));
  const list = await call(s.runtime); assert.equal(list.status, 200); assert.equal(list.json.data.orders[0].id, orderId);
  assert.equal((await s.store.snapshot()).records.length, 1);
  assert.ok(await s.store.get(orderId));
  const print = await call(s.runtime, request({ action: 'print', request: { orderId, expectedRevision: 1 } }));
  assert.equal(print.status, 200); assert.equal(print.json.data.reference, orderId);
  assert.equal(db.commits.length, commits); assert.deepEqual(db.docs, before); assert.ok(db.begins.slice(1).every(Boolean));
}));

test('durable retry after lost commit acknowledgement survives runtime restart with one canonical sale', async () => isolated(async db => {
  const s = setup(); await seed(s); db.loseAck = true;
  assert.equal((await call(s.runtime, confirm())).status, 503);
  const resumed = setup(); const retry = await call(resumed.runtime, confirm());
  assert.equal(retry.status, 200); assert.equal(retry.json.data.replay, true); assert.equal(retry.json.data.current.paymentState, 'PENDING');
  const state = await resumed.store.snapshot(); assert.equal(state.records.length, 1); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1);
  assert.equal(state.events.at(-1)!.actor, actorId); assert.equal(db.docs.size, 1);
}));

test('a Firestore conflict retries a command without duplicate facts', async () => isolated(async db => {
  const s = setup(); await seed(s); db.conflictOnce = true;
  assert.equal((await call(s.runtime, confirm())).status, 200);
  const state = await s.store.snapshot(); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(db.commits.length, 2);
}));

test('tenant separation and read-only or unknown memberships prevent writes before storage credentials', async () => isolated(async db => {
  const s = setup(); await seed(s); const other = setup('demo-TEST-other');
  assert.deepEqual((await call(other.runtime)).json.data.orders, []); assert.equal(db.docs.size, 1);
  const viewer = setup(tenantId, ['orders.read']);
  assert.equal((await call(viewer.runtime, confirm())).status, 403); assert.equal(viewer.state.credentials, 0);
  viewer.state.uid = 'unknown'; assert.equal((await call(viewer.runtime)).status, 403); assert.equal(viewer.state.credentials, 0);
  assert.equal(db.commits.length, 1);
}));

test('expiry or disabling during a durable read prevents disclosure before or after inspection', async () => {
  for (const stage of ['beforeRead', 'beforeRollback'] as const) for (const reason of ['expiry', 'disable']) await isolated(async db => {
    const s = setup(); await seed(s); const before = new Map(db.docs); let release!: () => void;
    db[stage] = () => new Promise<void>(resolve => { release = resolve; });
    const pending = call(s.runtime); while (!release) await new Promise(resolve => setImmediate(resolve));
    if (reason === 'expiry') s.state.now += 60000; else s.runtime.disable();
    db[stage] = undefined; release(); const result = await pending;
    assert.equal(result.status, reason === 'expiry' ? 401 : 503); assert.ok(!result.body.includes(orderId));
    assert.equal(db.commits.length, 1); assert.deepEqual(db.docs, before);
  });
});

test('checkout durable import preserves its separate receipt and retries to the same canonical order', async () => isolated(async db => {
  const s = setup(tenantId, undefined, true);
  const catalog: PilotCatalog = { revision: 'demo-TEST-v1', deliveryFeeCents: 700, menu: { id: 'demo-TEST-menu', name: 'TEST Menu', description: 'TEST', imageBanner: '', availableHours: 'TEST', active: true, productIds: ['demo-TEST-product'], createdAt: orderFixtureTime }, products: [{ id: 'demo-TEST-product', name: 'TEST Refeicao', description: 'TEST', image: '', category: 'TEST', price: 10, tamanhos: [{ label: 'TEST M', price: 20 }], adicionais: [], naoMandar: [], utensilios: [] }] };
  const command: PilotCheckoutCommand = { commandId: 'demo-TEST-command', idempotencyKey: 'demo-TEST-checkout', menuId: catalog.menu.id, catalogRevision: catalog.revision, origin: 'PUBLIC_MENU', conversationId: null, customer: { name: 'Cliente TEST Exemplo', identity: 'TEST-customer' }, modality: 'PICKUP', paymentMethod: 'Pix', address: null, lines: [{ productId: 'demo-TEST-product', size: 'TEST M', addonIds: [], removed: [], utensilIds: [], quantity: 1, observation: 'TEST' }] };
  const checkout = new PilotCheckoutTestStore(createFirestoreCheckoutPort(checkoutEnvironment, tenantId, s.token), checkoutEnvironment, tenantId);
  const receipt = await checkout.create(command, catalog, orderFixtureTime);
  const sourceName = db.commits[0], sourceValue = db.docs.get(sourceName); assert.ok(sourceName.includes('/stg_pilot_checkout/'));
  const req = request({ action: 'importCheckout', request: { checkoutCommandId: command.commandId } });
  db.loseAck = true; assert.equal((await call(s.runtime, req)).status, 503);
  const retry = await call(setup(tenantId, undefined, true).runtime, req);
  assert.equal(retry.status, 200); assert.equal(retry.json.data.replay, true); assert.equal(retry.json.data.current.id, receipt.snapshot.legacy.id);
  assert.equal(retry.json.data.current.orderState, 'DRAFT'); assert.equal(retry.json.data.current.paymentState, 'PENDING');
  assert.equal(db.docs.get(sourceName), sourceValue); assert.equal(db.commits.filter(n => n === sourceName).length, 1);
  assert.equal(db.docs.size, 2); assert.equal((await s.store.snapshot()).records.length, 1);
}));

test('checkout HTTP boundary denies other collection reads and writes before credentials', async () => isolated(async db => {
  let tokens = 0; const http = new StagingFirestoreHttp(environment, async () => { tokens++; return 'TEST-cloud-token'; }, 'stg_pilot_checkout');
  for (const collection of ['stg_inbound_synthetic', 'stg_operational_orders', 'orders']) {
    const name = `${root}/${collection}/${'a'.repeat(64)}`;
    await assert.rejects(http.request(`${name}?transaction=tx1`, 'GET'), /PATH_FORBIDDEN/);
    await assert.rejects(http.request(`${root}:commit`, 'POST', { writes: [{ update: { name } }] }), /WRITE_FORBIDDEN/);
  }
  assert.equal(tokens, 0); assert.equal(db.requests, 0);
}));

test('release proposal preserves default closure, dedicated preview scope and explicit rollback', () => {
  const p = privateOrdersReleasePlan(); assert.equal(p.readyToDeploy, false); assert.equal(p.functionCandidate.defaultRuntimeEnabled, false);
  assert.equal(p.functionCandidate.existingEntryMustRemain, 'staging-functions/lib/index.js');
  assert.equal(p.hostingCandidate.hosting.rewrites[0].source, '/api/test/orders');
  assert.equal(p.hostingCandidate.hosting.rewrites[0].function.pinTag, false);
  assert.equal(p.hostingCandidate.hosting.rewrites[1].destination, '/index.html');
  assert.equal(p.channelId, 'private-orders'); assert.equal(p.rollback.dataDeletion, false);
  assert.ok(p.gates.includes('VERIFIED_OPERATOR_UID_REQUIRED')); assert.ok(p.gates.includes('FUNCTION_COST_APPROVAL_REQUIRED'));
});
