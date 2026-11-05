import test from 'node:test';
import assert from 'node:assert/strict';
import { TestOrderScreen } from './testOrderScreen';
import { testOrderRow, testOrderCapabilities } from './testOrderAccess';
import type { TestOrderClient, TestOrderRequest, TestOrderPage, TestOrderReply } from './testOrderAccess';
import { createOrderFixture } from '../../services/staging/operationalOrderFixture';

const tenant = 'demo-TEST-ui', actor = 'demo-TEST-operator';
function setup() {
  const snapshot = createOrderFixture(tenant); snapshot.revision = 1;
  const page: TestOrderPage = { mode: 'TEST', tenantId: tenant, actorId: actor, orders: [testOrderRow(snapshot, testOrderCapabilities)] };
  const requests: TestOrderRequest[] = [];
  const client: TestOrderClient = { contextKey: 'session-1', tenantId: tenant, actorId: actor,
    list: async () => structuredClone(page), execute: async request => {
      requests.push(structuredClone(request)); const current = structuredClone(page.orders[0]);
      current.revision++; current.orderState = 'CONFIRMED'; current.actions = ['PRODUCTION']; page.orders[0] = current;
      return { mode: 'TEST', tenantId: tenant, actorId: actor, appliedRevision: request.expectedRevision + 1, replay: false, current };
    }, print: async id => ({ version: 1, mode: 'SIMULATION', kind: 'PEDIDO', reference: id, lines: ['TEST'] }),
  };
  let serial = 0;
  return { page, client, requests, screen: new TestOrderScreen(client, () => `demo-TEST-ui-${++serial}`, () => '2026-10-17T12:00:00.000Z'), snapshot };
}
test('double click shares one pending command and does not submit a second confirmation', async () => {
  const { screen, client, requests } = setup(); await screen.load();
  let release!: () => void; const original = client.execute;
  client.execute = async input => { await new Promise<void>(r => { release = r; }); return original(input); };
  const pending = screen.execute('demo-TEST-order', { kind: 'CONFIRM' });
  await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); release(); await pending;
  assert.equal(requests.length, 1); assert.equal(screen.snapshot.orders[0].revision, 2);
  assert.equal(screen.snapshot.busy, false); assert.equal(screen.snapshot.retryAvailable, false);
});
test('lost response retains exact request for retry, even if a transport mutates its input', async () => {
  const { screen, client, requests } = setup(); await screen.load(); let saved!: TestOrderReply;
  const original = client.execute; let attempts = 0;
  client.execute = async input => { attempts++; if (attempts === 1) { saved = await original(input); input.commandId = 'demo-TEST-corrupt'; throw new Error('network'); } requests.push(structuredClone(input)); return { ...saved, replay: true }; };
  await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); assert.equal(screen.snapshot.retryAvailable, true);
  await screen.execute('demo-TEST-order', { kind: 'CANCEL' }); assert.equal(attempts, 1);
  await screen.retry(); assert.equal(attempts, 2); assert.deepEqual(requests[0], requests[1]);
  assert.equal(screen.snapshot.orders[0].revision, 2); assert.match(screen.snapshot.message, /já registrada/);
});
test('revision conflict refreshes the order and requires a new deliberate action', async () => {
  const { screen, client, page } = setup(); await screen.load(); let calls = 0;
  client.execute = async () => { calls++; page.orders[0].revision = 3; page.orders[0].orderState = 'CONFIRMED'; page.orders[0].actions = ['PRODUCTION']; throw new Error('ORDER_REVISION_CONFLICT'); };
  await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); await screen.retry();
  assert.equal(calls, 1); assert.equal(screen.snapshot.orders[0].revision, 3); assert.equal(screen.snapshot.retryAvailable, false); assert.match(screen.snapshot.message, /outra tela/);
});
test('access loss removes old data and pending document or command', async () => {
  const { screen, client } = setup(); await screen.load(); await screen.print('demo-TEST-order'); assert.ok(screen.snapshot.document);
  client.execute = async () => { throw new Error('ORDER_ACCESS_EXPIRED'); };
  await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); assert.deepEqual(screen.snapshot.orders, []); assert.equal(screen.snapshot.document, null); assert.equal(screen.snapshot.retryAvailable, false);
});
test('disposed screen never accepts a late load or action from the previous session', async () => {
  const { screen, client, page } = setup(); let resolve!: (page: TestOrderPage) => void;
  client.list = () => new Promise(r => { resolve = r; }); const load = screen.load(); screen.dispose(); resolve(page); await load;
  assert.deepEqual(screen.snapshot.orders, []);
  const next = setup(); await next.screen.load(); const original = next.client.execute; let finish!: () => void;
  next.client.execute = async request => { await new Promise<void>(r => { finish = r; }); return original(request); };
  const action = next.screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); next.screen.dispose(); finish(); await action;
  assert.deepEqual(next.screen.snapshot.orders, []);
});
test('response for a different tenant or operator is not shown', async () => {
  for (const field of ['tenantId', 'actorId'] as const) {
    const { screen, page } = setup(); page[field] = 'demo-TEST-other'; await screen.load(); assert.deepEqual(screen.snapshot.orders, []);
  }
  const { screen, client } = setup(); await screen.load(); const original = client.execute;
  client.execute = async request => ({ ...await original(request), actorId: 'demo-TEST-other' });
  await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); assert.deepEqual(screen.snapshot.orders, []);
});
test('read-only screen cannot call mutation or document endpoints', async () => {
  const { screen, page, client } = setup(); page.orders[0].actions = []; page.orders[0].canPrint = false;
  let calls = 0; client.execute = async () => { calls++; throw new Error('unexpected'); }; client.print = async () => { calls++; throw new Error('unexpected'); };
  await screen.load(); await screen.execute('demo-TEST-order', { kind: 'CONFIRM' }); await screen.print('demo-TEST-order'); assert.equal(calls, 0);
});
test('stale document refreshes order and requires a new open; document never mutates order', async () => {
  const { screen, client, page, requests } = setup(); await screen.load(); const before = screen.snapshot.orders;
  await screen.print('demo-TEST-order'); assert.deepEqual(screen.snapshot.orders, before); assert.equal(requests.length, 0);
  screen.closeDocument(); assert.equal(screen.snapshot.document, null);
  client.print = async () => { page.orders[0].revision = 2; throw new Error('ORDER_REVISION_CONFLICT'); };
  await screen.print('demo-TEST-order'); assert.equal(screen.snapshot.document, null); assert.equal(screen.snapshot.orders[0].revision, 2);
});
