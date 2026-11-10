import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseTestOrderResolver } from '../../staging-functions/testOrderIdentity';
import type { TestOrderMembership } from '../../staging-functions/testOrderIdentity';
import { TestOrderAccessService } from './testOrderAccessService';
import type { AtomicJsonPort } from './durableInboundJournal';

const projectId = 'lidacomzapcrm-staging', tenantId = 'demo-TEST-auth', time = Date.parse('2026-10-18T00:00:00.000Z');
const environment = { appEnv: 'staging', projectId, operationalOrderWrites: 'TEST_ONLY' as const };
const header = 'Bearer TEST.header.signature';
function setup() {
  const state = {
    now: time, verified: [] as { token: string; revoked: boolean }[], lookups: [] as string[], failure: false,
    claims: { uid: 'firebase-uid-test', sub: 'firebase-uid-test', aud: projectId, iss: `https://securetoken.google.com/${projectId}`, exp: time / 1000 + 3600, iat: time / 1000 - 60, auth_time: time / 1000 - 60, firebase: { sign_in_provider: 'password' } } as Record<string, unknown>,
    member: { tenantId, actorId: 'demo-TEST-operator', capabilities: ['orders.read'], expiresAt: time + 60000 } as TestOrderMembership | null,
    beforeLookup: undefined as (() => Promise<void>) | undefined,
  };
  const app = { options: { projectId } };
  const auth = { app, async verifyIdToken(token: string, revoked: boolean) {
    state.verified.push({ token, revoked }); if (state.failure) throw new Error('PRIVATE Firebase token details'); return structuredClone(state.claims);
  } } as unknown as Parameters<typeof createFirebaseTestOrderResolver>[0];
  const resolve = createFirebaseTestOrderResolver(auth, environment, tenantId, async uid => { state.lookups.push(uid); await state.beforeLookup?.(); return state.member; }, () => state.now);
  return { state, app, auth, resolve };
}

test('Firebase identity verifies revocation each time and only trusted server membership grants access', async () => {
  const s = setup(); s.state.claims.role = 'administrador'; s.state.claims.tenantId = 'demo-TEST-forged';
  const principal = await s.resolve(header);
  assert.deepEqual(principal, { mode: 'TEST', tenantId, actorId: 'demo-TEST-operator', capabilities: ['orders.read'], expiresAt: time + 60000 });
  assert.deepEqual(s.state.verified, [{ token: 'TEST.header.signature', revoked: true }]);
  assert.deepEqual(s.state.lookups, ['firebase-uid-test']);
  s.state.member = null; assert.equal(await s.resolve(header), null); assert.equal(s.state.verified.length, 2);
});

test('missing, multiple, cookie-shaped or oversized bearer credentials never invoke Firebase or membership', async () => {
  const s = setup();
  for (const value of [undefined, '', 'cookie=session', 'Bearer a.b', 'Bearer a.b.c, Bearer d.e.f', 'Bearer a.b.c\n', 'Bearer ' + 'a'.repeat(8200) + '.b.c']) await assert.rejects(s.resolve(value), /UNAUTHENTICATED/);
  assert.equal(s.state.verified.length, 0); assert.equal(s.state.lookups.length, 0);
});

test('Firebase rejection is sanitized and prevents all membership/storage access', async () => {
  const s = setup(); s.state.failure = true;
  await assert.rejects(s.resolve(header), { message: 'ORDER_ACCESS_UNAUTHENTICATED' }); assert.equal(s.state.lookups.length, 0);
});

test('foreign project, expired, anonymous, auth-tenant and malformed decoded tokens cannot select a membership', async () => {
  for (const patch of [
    { aud: 'project-1300957a-ea82-4645-845' }, { iss: 'https://example.test' }, { uid: '' }, { sub: 'different-user' },
    { exp: time / 1000 }, { exp: NaN }, { iat: time / 1000 + 1 }, { auth_time: time / 1000 + 1 },
    { firebase: { sign_in_provider: 'anonymous' } }, { firebase: { sign_in_provider: 'password', tenant: 'another-auth-tenant' } }, { firebase: undefined },
  ]) {
    const s = setup(); Object.assign(s.state.claims, patch);
    await assert.rejects(s.resolve(header), /UNAUTHENTICATED/); assert.equal(s.state.lookups.length, 0);
  }
});

test('membership cannot inject foreign tenant, real actor, unknown grants, duplicate grants or additional fields', async () => {
  for (const patch of [{ tenantId: 'demo-TEST-other' }, { actorId: 'real-operator' }, { capabilities: ['admin'] }, { capabilities: ['orders.read', 'orders.read'] }, { expiresAt: Infinity }, { role: 'administrador' }]) {
    const s = setup(); Object.assign(s.state.member!, patch);
    await assert.rejects(s.resolve(header), /ACCESS_DENIED/);
  }
});

test('principal expiration is bounded by token and membership and rechecked after slow membership lookup', async () => {
  const s = setup(); s.state.member!.expiresAt = time + 7200000;
  assert.equal((await s.resolve(header))!.expiresAt, time + 3600000);
  let release!: () => void; s.state.beforeLookup = () => new Promise<void>(r => { release = r; });
  const pending = s.resolve(header);
  while (!release) await new Promise(r => setImmediate(r));
  s.state.now += 3600000; release(); await assert.rejects(pending, /ACCESS_EXPIRED/);
});

test('staging Admin project and environment are guarded on creation and every request; emulator is refused', async () => {
  const s = setup(); s.app.options.projectId = 'project-1300957a-ea82-4645-845';
  await assert.rejects(s.resolve(header), /CONFIGURATION_INVALID/); assert.equal(s.state.verified.length, 0);
  assert.throws(() => createFirebaseTestOrderResolver(s.auth, environment, tenantId, async () => null), /CONFIGURATION_INVALID/);
  s.app.options.projectId = projectId;
  assert.throws(() => createFirebaseTestOrderResolver(s.auth, { ...environment, appEnv: 'production' }, tenantId, async () => null), /WRITES_DISABLED/);
  const previous = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  try { process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; await assert.rejects(s.resolve(header), /CONFIGURATION_INVALID/); }
  finally { if (previous === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST; else process.env.FIREBASE_AUTH_EMULATOR_HOST = previous; }
});

test('order service consumes the verified resolver and never reaches storage after revocation or membership removal', async () => {
  const s = setup(); let calls = 0, value: string | undefined;
  const port: AtomicJsonPort = { async transaction(update) { calls++; const next = update(value); value = next.value; return next.result; } };
  const service = new TestOrderAccessService(port, environment, tenantId, () => s.resolve(header), () => s.state.now);
  const page = await service.list(); assert.equal(page.actorId, 'demo-TEST-operator'); assert.deepEqual(page.orders, []); assert.equal(calls, 1);
  s.state.failure = true; await assert.rejects(service.list(), /UNAUTHENTICATED/); assert.equal(calls, 1);
  s.state.failure = false; s.state.member = null; await assert.rejects(service.list(), /ACCESS_DENIED/); assert.equal(calls, 1);
});
