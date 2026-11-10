import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createTestOrderHttpHandler } from './testOrderHttp';
import type { TestOrderHttpRequest } from './testOrderHttp';
import { createTestOrderHttpClient } from '../../src/application/testOrderHttpClient';
import { TestOrderScreen } from '../../src/application/testOrderScreen';
import { testOrderApiPath } from '../../src/application/testOrderProtocol';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import { StagingOperationalOrderStore } from './operationalOrderStore';
import type { AtomicJsonPort } from './durableInboundJournal';
import type { VerifiedTestOrderPrincipal } from './testOrderAccessService';
import type { TestOrderRequest } from '../../src/application/testOrderAccess';

const environment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', operationalOrderWrites: 'TEST_ONLY' as const };
const origin = 'https://lidacomzapcrm-staging.web.app', tenantId = 'demo-TEST-http', actorId = 'demo-TEST-operator', orderId = 'demo-TEST-order';
const time = Date.parse(orderFixtureTime) + 1000, token = 'TEST.header.signature';
class MemoryPort implements AtomicJsonPort {
  value?: string; calls = 0; loseAck = false;
  async transaction<T>(update: (raw: string | undefined) => { value: string; result: T }): Promise<T> {
    this.calls++; const next = update(this.value); this.value = next.value;
    if (this.loseAck) { this.loseAck = false; throw new Error('PRIVATE_DATABASE_INFORMATION'); }
    return structuredClone(next.result);
  }
}
const command = (): TestOrderRequest => ({ commandId: 'demo-TEST-confirm', idempotencyKey: 'demo-TEST-confirm', orderId, expectedRevision: 1, at: new Date(time).toISOString(), operation: { kind: 'CONFIRM' } });
const request = (body: unknown): TestOrderHttpRequest => ({ method: 'POST', path: testOrderApiPath, origin, authorization: 'Bearer ' + token, contentType: 'application/json', raw: new TextEncoder().encode(JSON.stringify(body)) });
async function setup() {
  const port = new MemoryPort(), store = new StagingOperationalOrderStore(port, environment, tenantId);
  await store.execute({ ...command(), commandId: 'demo-TEST-seed', idempotencyKey: 'demo-TEST-seed', expectedRevision: 0, tenantId, actor: actorId, operation: { kind: 'CREATE', snapshot: createOrderFixture(tenantId, orderId) } }); port.calls = 0;
  const state = { key: 'session-1', resolutions: 0, requests: [] as RequestInit[], tokenWait: undefined as (() => Promise<string | null>) | undefined,
    principal: { mode: 'TEST', tenantId, actorId, expiresAt: time + 60000, capabilities: ['orders.read', 'orders.confirm', 'orders.production', 'orders.print'] } as VerifiedTestOrderPrincipal | null };
  const options = { environment, tenantId, origin, port, now: () => time, resolvePrincipal: async (value: string | undefined) => { state.resolutions++; if (value !== 'Bearer ' + token) throw new Error('ORDER_ACCESS_UNAUTHENTICATED'); return state.principal; } };
  const handler = createTestOrderHttpHandler(options);
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(String(url), origin + testOrderApiPath); state.requests.push(structuredClone({ ...init, signal: undefined }));
    const headers = new Headers(init?.headers);
    const result = await handler.handle({ ...request({}), authorization: headers.get('authorization') ?? undefined, contentType: headers.get('content-type') ?? undefined, raw: new TextEncoder().encode(String(init?.body)) });
    return new Response(result.body, { status: result.status, headers: result.headers });
  };
  const clientOptions = { origin, contextKey: 'session-1', tenantId, actorId, currentContextKey: () => state.key, getIdToken: () => state.tokenWait ? state.tokenWait() : Promise.resolve(token), fetch: fetcher };
  const client = createTestOrderHttpClient(clientOptions);
  return { port, store, state, options, handler, fetcher, clientOptions, client };
}

test('HTTP round trip preserves current context, canonical order and independent payment state', async () => {
  const s = await setup(); assert.equal((await s.client.list()).orders[0].id, orderId);
  const result = await s.client.execute(command()); assert.equal(result.current.orderState, 'CONFIRMED'); assert.equal(result.current.paymentState, 'PENDING');
  const print = await s.client.print(orderId, 2); assert.equal(print.reference, orderId);
  assert.equal(s.state.resolutions, 3); assert.equal((await s.store.snapshot()).records.length, 1);
  for (const sent of s.state.requests) {
    assert.equal(sent.credentials, 'omit'); assert.equal(sent.redirect, 'error'); assert.equal(sent.cache, 'no-store'); assert.equal(sent.mode, 'same-origin'); assert.equal(sent.referrerPolicy, 'no-referrer');
    assert.ok(!String(sent.body).includes(actorId)); assert.ok(!String(sent.body).includes(tenantId)); assert.ok(!String(sent.body).includes(token));
  }
});

test('screen retries a lost acknowledgement over HTTP without a duplicate sale or a replacement command', async () => {
  const s = await setup(), screen = new TestOrderScreen(s.client, () => 'demo-TEST-screen', () => new Date(time).toISOString());
  await screen.load(); s.port.loseAck = true; await screen.execute(orderId, { kind: 'CONFIRM' });
  assert.equal(screen.snapshot.retryAvailable, true); assert.ok(!screen.snapshot.message.includes('PRIVATE'));
  await screen.retry(); assert.equal(screen.snapshot.retryAvailable, false); assert.equal(screen.snapshot.orders[0].orderState, 'CONFIRMED');
  assert.equal(s.state.requests[1].body, s.state.requests[2].body);
  assert.equal((await s.store.snapshot()).events.filter(e => e.fact === 'SALE').length, 1); screen.dispose();
});

test('wrong origin, cookies, methods, routes, queries, types, payload size and malformed envelopes fail before identity or storage', async () => {
  const s = await setup();
  const invalid = [
    { origin: 'https://project-1300957a-ea82-4645-845.web.app' }, { origin: undefined }, { cookie: 'session=TEST' }, { method: 'GET' }, { method: 'OPTIONS' }, { path: '/orders' }, { query: { access_token: token } }, { contentType: 'text/plain' },
    { raw: new Uint8Array(16385) }, { raw: new Uint8Array([255]) }, { raw: new TextEncoder().encode('null') },
    ...[{ action: 'list', request: {} }, { action: 'list', actor: actorId }, { action: 'DELETE' }, { action: 'execute' }].map(body => ({ raw: request(body).raw })),
  ];
  for (const patch of invalid) { const reply = await s.handler.handle({ ...request({ action: 'list' }), ...patch }); assert.ok(reply.status >= 400); assert.equal(reply.headers['Cache-Control'], 'no-store'); assert.equal(reply.headers['Access-Control-Allow-Origin'], undefined); }
  assert.equal(s.state.resolutions, 0); assert.equal(s.port.calls, 0);
});

test('missing identity and denied permissions never reach storage; response never echoes credentials', async () => {
  const s = await setup(); const unauthorized = await s.handler.handle({ ...request({ action: 'list' }), authorization: 'PRIVATE_TOKEN' });
  assert.equal(unauthorized.status, 401); assert.ok(!unauthorized.body.includes('PRIVATE_TOKEN')); assert.equal(s.port.calls, 0);
  s.state.principal!.capabilities = ['orders.read']; await assert.rejects(s.client.execute(command()), /ACCESS_DENIED/); assert.equal(s.port.calls, 0);
  s.state.principal = null; await assert.rejects(s.client.list(), /ACCESS_DENIED/); assert.equal(s.port.calls, 0);
});

test('unknown errors stay retryable and domain conflicts retain their typed HTTP meaning', async () => {
  const s = await setup(); await s.client.execute(command());
  await assert.rejects(s.client.execute({ ...command(), commandId: 'demo-TEST-other', idempotencyKey: 'demo-TEST-other' }), /ORDER_REVISION_CONFLICT/);
  const reply = await s.handler.handle(request({ action: 'importCheckout', request: { checkoutCommandId: 'demo-TEST-receipt' } }));
  assert.equal(reply.status, 503); assert.equal(JSON.parse(reply.body).error, 'ORDER_ACCESS_DISABLED');
  const bad = await s.handler.handle(request({ action: 'print', request: { orderId, expectedRevision: 2, actor: actorId } })); assert.equal(bad.status, 400);
});

test('disabled handler cancels authorization in progress before any aggregate access', async () => {
  const s = await setup(); let release!: (p: VerifiedTestOrderPrincipal | null) => void;
  const handler = createTestOrderHttpHandler({ ...s.options, resolvePrincipal: () => new Promise(r => { release = r; }) });
  const pending = handler.handle(request({ action: 'list' }));
  while (!release) await new Promise(r => setImmediate(r));
  handler.disable(); release(s.state.principal); assert.equal((await pending).status, 503); assert.equal(s.port.calls, 0);
  assert.equal((await handler.handle(request({ action: 'list' }))).status, 503);
});

test('client refuses production, arbitrary hosts, credentials, URL paths and unapproved loopback', async () => {
  const s = await setup();
  for (const bad of ['https://project-1300957a-ea82-4645-845.web.app', 'https://lidacomzapcrm-staging.web.app.evil.test', 'https://x@lidacomzapcrm-staging.web.app', origin + '/', origin + '/api', origin + '?token=x', 'http://127.0.0.1:3000']) assert.throws(() => createTestOrderHttpClient({ ...s.clientOptions, origin: bad }), /ENDPOINT_INVALID/);
  assert.equal(s.state.requests.length, 0);
});

test('session changes while fetching a token prevent sending; changes during response discard data', async () => {
  const s = await setup(); let release!: (value: string) => void;
  s.state.tokenWait = () => new Promise(r => { release = r; }); const pending = s.client.list();
  s.state.key = 'session-2'; release(token); await assert.rejects(pending, /SESSION_CHANGED/); assert.equal(s.state.requests.length, 0);
  const other = await setup();
  const client = createTestOrderHttpClient({ ...other.clientOptions, fetch: async (url, init) => { const result = await other.fetcher(url, init); other.state.key = 'session-2'; return result; } });
  await assert.rejects(client.list(), /SESSION_CHANGED/);
});

test('HTTP timeout bounds token acquisition and cannot send a late token or trigger an automatic retry', async () => {
  const s = await setup(); let release!: (value: string) => void;
  s.state.tokenWait = () => new Promise(r => { release = r; });
  const client = createTestOrderHttpClient({ ...s.clientOptions, timeoutMs: 20 });
  await assert.rejects(client.list(), /TEST_ORDER_TRANSPORT_UNAVAILABLE/); release(token);
  await new Promise(r => setImmediate(r)); assert.equal(s.state.requests.length, 0);
});

test('unexpected response context, oversized payload, malformed JSON and unknown errors are never displayed as trusted data', async () => {
  const s = await setup();
  for (const [body, status, expected] of [
    [JSON.stringify({ mode: 'TEST', tenantId: 'demo-TEST-other', actorId, data: {} }), 200, /CONTEXT_MISMATCH/],
    [JSON.stringify({ mode: 'TEST', tenantId, actorId: 'demo-TEST-other', data: {} }), 200, /CONTEXT_MISMATCH/],
    ['x'.repeat(524289), 200, /CONTEXT_MISMATCH/], ['{', 200, /TRANSPORT_UNAVAILABLE/],
    [JSON.stringify({ mode: 'TEST', error: 'PRIVATE_ERROR' }), 503, /TRANSPORT_UNAVAILABLE/],
  ] as const) {
    const client = createTestOrderHttpClient({ ...s.clientOptions, fetch: async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } }) });
    await assert.rejects(client.list(), expected);
  }
});

test('client snapshots the command before token acquisition and does not accept a missing token', async () => {
  const s = await setup(); let release!: (value: string | null) => void;
  s.state.tokenWait = () => new Promise(r => { release = r; }); const input = command(), pending = s.client.execute(input);
  input.operation = { kind: 'CANCEL' }; release(token); assert.equal((await pending).current.orderState, 'CONFIRMED');
  const denied = s.client.list(); release(null); await assert.rejects(denied, /UNAUTHENTICATED/);
  assert.equal(s.state.requests.length, 1);
});

test('real loopback HTTP connects the existing screen controller to service and store without cloud calls', async () => {
  const s = await setup(); let handler: ReturnType<typeof createTestOrderHttpHandler>;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const result = await handler.handle({ method: req.method!, path: req.url!, origin: req.headers.origin, authorization: req.headers.authorization, contentType: req.headers['content-type'], raw: Buffer.concat(chunks) });
    res.writeHead(result.status, result.headers); res.end(result.body);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const local = `http://127.0.0.1:${address.port}`;
  handler = createTestOrderHttpHandler({ ...s.options, origin: local, allowLoopback: true });
  const client = createTestOrderHttpClient({ ...s.clientOptions, origin: local, allowLoopback: true, fetch: (url, init) => { const headers = new Headers(init?.headers); headers.set('Origin', local); return fetch(url, { ...init, headers }); } });
  const screen = new TestOrderScreen(client, () => 'demo-TEST-loopback', () => new Date(time).toISOString());
  try {
    await screen.load(); assert.equal(screen.snapshot.orders.length, 1);
    await screen.execute(orderId, { kind: 'CONFIRM' }); assert.equal(screen.snapshot.orders[0].orderState, 'CONFIRMED');
    await screen.print(orderId); assert.equal(screen.snapshot.document?.reference, orderId);
    assert.equal(screen.snapshot.orders[0].receivedCents, 0);
  } finally { screen.dispose(); handler.disable(); server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
