import test from 'node:test';
import assert from 'node:assert/strict';
import { TestOrderSession, requireTestOrderWebConfiguration } from './testOrderSession';
import type { TestOrderSessionAuth, TestOrderSessionUser } from './testOrderSession';
import type { TestOrderHttpClientOptions } from './testOrderHttpClient';
import type { TestOrderClient } from './testOrderAccess';

const origin = 'https://lidacomzapcrm-staging.web.app';
const configuration = () => ({ schema: 1, mode: 'TEST', enabled: true, origin, tenantId: 'demo-TEST-session', actorId: 'demo-TEST-operator',
  firebase: { projectId: 'lidacomzapcrm-staging', authDomain: 'lidacomzapcrm-staging.firebaseapp.com', apiKey: 'TEST_PUBLIC_WEB_CONFIG_ONLY', appId: '1:123:web:abcdef' } });
const user = (uid = 'test-user'): TestOrderSessionUser => ({ uid, emailVerified: true, providerIds: ['google.com'] });
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
function setup(config: unknown = configuration()) {
  const state = { uid: null as string | null, connected: 0, signIns: 0, signOuts: 0, disposed: 0, unsubscribed: 0, lists: 0,
    tokenWait: null as Promise<string> | null, listWait: null as Promise<void> | null, failList: false, failSignOut: false, failSignIn: false,
    listeners: { user: (_: TestOrderSessionUser | null) => {}, error: () => {} }, options: [] as TestOrderHttpClientOptions[] };
  const auth: TestOrderSessionAuth = {
    subscribe(onUser, error) { state.listeners = { user: onUser, error }; onUser(null); return () => { state.unsubscribed++; }; },
    currentUid: () => state.uid,
    async getIdToken() { return state.tokenWait ? state.tokenWait : 'TEST.token.signature'; },
    async signIn() { state.signIns++; if (state.failSignIn) throw new Error('PRIVATE_POPUP_DETAILS'); },
    async signOut() { state.signOuts++; if (state.failSignOut) throw new Error('PRIVATE_LOGOUT_DETAILS'); state.uid = null; state.listeners.user(null); },
    async dispose() { state.disposed++; },
  };
  const createClient = (options: TestOrderHttpClientOptions): TestOrderClient => {
    state.options.push(options);
    return { contextKey: options.contextKey, tenantId: options.tenantId, actorId: options.actorId,
      async list() { state.lists++; await state.listWait; if (state.failList) throw new Error('PRIVATE_ACCESS_ERROR'); return { mode: 'TEST', tenantId: options.tenantId, actorId: options.actorId, orders: [] }; },
      async execute() { throw new Error('unused'); }, async print() { throw new Error('unused'); },
    };
  };
  const session = new TestOrderSession(config, { origin, connect: async () => { state.connected++; return auth; }, createClient });
  const emit = (next: TestOrderSessionUser | null) => { state.uid = next?.uid ?? null; state.listeners.user(next); };
  return { state, auth, session, emit, createClient };
}

test('private entry remains disabled without initializing Auth or reading orders', async () => {
  const s = setup({ schema: 1, mode: 'TEST', enabled: false }); await s.session.start(); await s.session.signIn();
  assert.equal(s.session.snapshot.phase, 'disabled'); assert.equal(s.state.connected, 0); assert.equal(s.state.lists, 0);
});

test('foreign project/domain, unknown config fields and unsafe origin are rejected before SDK initialization', async () => {
  const c = configuration();
  for (const value of [null, {}, { ...c, enabled: false }, { ...c, schema: 2 }, { ...c, mode: 'LIVE' }, { ...c, credentials: 'secret' },
    { ...c, tenantId: 'real-company' }, { ...c, actorId: 'real-user' }, { ...c, origin: 'http://127.0.0.1:1234' },
    ...[{ projectId: 'project-1300957a-ea82-4645-845' }, { authDomain: 'example.com' }, { apiKey: '' }, { appId: 'wrong' }, { databaseURL: 'https://example.com' }].map(patch => ({ ...c, firebase: { ...c.firebase, ...patch } })),
  ]) { const s = setup(value); await s.session.start(); assert.equal(s.session.snapshot.phase, 'error'); assert.equal(s.state.connected, 0); }
  assert.throws(() => requireTestOrderWebConfiguration(c, 'https://example.com'), /CONFIGURATION_INVALID/);
});

test('session starts once and does not automatically open a Google popup or query orders', async () => {
  const s = setup(); await Promise.all([s.session.start(), s.session.start()]);
  assert.equal(s.state.connected, 1); assert.equal(s.state.signIns, 0); assert.equal(s.state.lists, 0);
  assert.equal(s.session.snapshot.canSignIn, true); await s.session.signIn(); await s.session.signIn();
  assert.equal(s.state.signIns, 1); assert.equal(s.session.snapshot.phase, 'signingIn');
});

test('verified Google session checks server access before mounting the existing orders client', async () => {
  const s = setup(); await s.session.start(); const gate = deferred<void>(); s.state.listWait = gate.promise;
  s.emit(user()); assert.equal(s.session.snapshot.phase, 'checking'); assert.equal(Boolean(s.session.snapshot.client), false);
  gate.resolve(); await flush(); assert.equal(s.session.snapshot.phase, 'ready'); assert.equal(s.session.snapshot.client?.actorId, 'demo-TEST-operator');
  assert.equal(s.state.options[0].currentContextKey(), s.session.snapshot.client?.contextKey);
  assert.equal(await s.state.options[0].getIdToken(), 'TEST.token.signature');
});

test('unverified email, anonymous identity or wrong provider never reaches orders', async () => {
  for (const next of [{ ...user(), emailVerified: false }, { ...user(), providerIds: ['anonymous'] }, { ...user(), uid: '' }]) {
    const s = setup(); await s.session.start(); s.emit(next); await flush();
    assert.equal(s.session.snapshot.phase, 'error'); assert.equal(s.state.lists, 0); assert.equal(s.session.snapshot.client, null);
  }
});

test('server rejection clears context and never shows raw error details or a usable client', async () => {
  const s = setup(); s.state.failList = true; await s.session.start(); s.emit(user()); await flush();
  assert.equal(s.session.snapshot.phase, 'error'); assert.equal(s.session.snapshot.client, null);
  assert.equal(s.state.options[0].currentContextKey(), null); assert.ok(!s.session.snapshot.message.includes('PRIVATE'));
});

test('account switch invalidates old requests before a delayed list can re-open the previous user', async () => {
  const s = setup(); await s.session.start(); const gate = deferred<void>(); s.state.listWait = gate.promise;
  s.emit(user('first')); const first = s.state.options[0]; s.state.listWait = null; s.emit(user('second')); await flush();
  assert.equal(first.currentContextKey(), null); assert.equal(await first.getIdToken(), null);
  const current = s.session.snapshot.client; gate.resolve(); await flush(); assert.equal(s.session.snapshot.client, current);
  assert.ok(current?.contextKey.startsWith('second:'));
});

test('UID changes also invalidate context before the Auth observer callback arrives', async () => {
  const s = setup(); await s.session.start(); s.emit(user()); await flush(); s.state.uid = 'different-user';
  assert.equal(s.state.options[0].currentContextKey(), null); assert.equal(await s.state.options[0].getIdToken(), null);
});

test('logout clears orders immediately and rejects late tokens, lists and user callbacks', async () => {
  const s = setup(); await s.session.start(); s.emit(user()); await flush(); const options = s.state.options[0];
  const token = deferred<string>(); s.state.tokenWait = token.promise; const pending = options.getIdToken();
  const exit = s.session.signOut(); assert.equal(s.session.snapshot.client, null); await exit;
  token.resolve('TEST.old.signature'); assert.equal(await pending, null); assert.equal(options.currentContextKey(), null);
  s.emit(user()); await flush(); assert.equal(s.session.snapshot.phase, 'signedOut'); assert.equal(s.session.snapshot.client, null);
});

test('logout failure still removes access and offers another logout without exposing details', async () => {
  const s = setup(); await s.session.start(); s.emit(user()); await flush(); s.state.failSignOut = true; await s.session.signOut();
  assert.equal(s.session.snapshot.phase, 'error'); assert.equal(s.session.snapshot.client, null); assert.equal(s.session.snapshot.canSignOut, true);
  assert.equal(s.session.snapshot.canSignIn, false); assert.ok(!s.session.snapshot.message.includes('PRIVATE'));
});

test('popup rejection can be retried explicitly and observer error invalidates the active session', async () => {
  const s = setup(); await s.session.start(); s.state.failSignIn = true; await s.session.signIn();
  assert.equal(s.session.snapshot.canSignIn, true); assert.ok(!s.session.snapshot.message.includes('PRIVATE'));
  s.state.failSignIn = false; await s.session.signIn(); s.emit(user()); await flush(); s.state.listeners.error();
  assert.equal(s.session.snapshot.client, null); assert.equal(s.state.options[0].currentContextKey(), null);
});

test('dispose unsubscribes, clears clients and invalidates pending authentication setup', async () => {
  const s = setup(); await s.session.start(); s.emit(user()); await flush(); await s.session.dispose(); await s.session.dispose();
  assert.equal(s.state.disposed, 1); assert.equal(s.state.unsubscribed, 1); assert.equal(s.session.snapshot.client, null); assert.equal(s.state.options[0].currentContextKey(), null);
  const gate = deferred<TestOrderSessionAuth>(); const late = new TestOrderSession(configuration(), { origin, connect: () => gate.promise });
  const started = late.start(); await late.dispose(); gate.resolve(s.auth); await started; assert.equal(s.state.disposed, 2);
});

test('configuration snapshot cannot be changed to another actor or project after construction', async () => {
  const c = configuration(), s = setup(c); c.actorId = 'demo-TEST-forged'; c.firebase.projectId = 'operational';
  await s.session.start(); s.emit(user()); await flush(); assert.equal(s.session.snapshot.client?.actorId, 'demo-TEST-operator');
});
