import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { FirestoreRequestPort } from './firestoreAtomicPort';
import { FirestoreAtomicJsonPort, FirestoreRequestError } from './firestoreAtomicPort';
import { StagingFirestoreHttp } from './firestoreHttp';
import { StagingOperationalOrderStore, createFirestoreOrderStore } from './operationalOrderStore';
import { createOrderFixture, orderFixtureTime } from './operationalOrderFixture';
import type { OperationalCommand, OrderOperation, OperationalSnapshot } from '../../src/application/stagingOperationalOrders';
import { validateSnapshot } from '../../src/application/stagingOperationalOrders';
import { closeTestCash, projectTestConsumers, readTestProjection } from '../../src/application/operationalOrderProjections';
import { renderPrintSnapshot } from '../../src/application/operationsFinance';
import { runOperationalOrderProbe } from './operationalOrderProbe';
import type { AtomicJsonPort } from './durableInboundJournal';
import type { ExternalOrderReference } from '../../src/domain/omnichannel';

export const environment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', operationalOrderWrites: 'TEST_ONLY' as const };
class FixtureFirestore implements FirestoreRequestPort {
  value?: string; revision = 0; serial = 0; aborts = 0; paths: string[] = [];
  transactions = new Map<string, { value?: string; revision: number }>();
  async request<T>(path: string, method: string, body?: unknown): Promise<T | undefined> {
    this.paths.push(path);
    const input = body as { transaction: string; writes: { update: { name: string; fields: { payload: { stringValue: string } } } }[] };
    if (path.endsWith(':beginTransaction')) { const transaction = `t${++this.serial}`; this.transactions.set(transaction, { value: this.value, revision: this.revision }); return { transaction } as T; }
    if (method === 'GET') { const tx = this.transactions.get(new URL(`https://fixture.invalid/${path}`).searchParams.get('transaction')!)!; return tx.value === undefined ? undefined : { fields: { payload: { stringValue: tx.value } } } as T; }
    if (path.endsWith(':rollback')) { this.transactions.delete(input.transaction); return {} as T; }
    const tx = this.transactions.get(input.transaction)!;
    if (tx.revision !== this.revision) { this.aborts++; throw new FirestoreRequestError(409); }
    assert.match(input.writes[0].update.name, /\/stg_operational_orders\/[a-f0-9]{64}$/);
    this.value = input.writes[0].update.fields.payload.stringValue; this.revision++; this.transactions.delete(input.transaction); return {} as T;
  }
}
const tenant = 'demo-TEST-order02';
const command = (name: string, expectedRevision: number, operation: OrderOperation, orderId = 'demo-TEST-order'): OperationalCommand => ({ commandId: `demo-TEST-${name}`, idempotencyKey: `demo-TEST-key-${name}`, tenantId: tenant, orderId, expectedRevision, actor: 'demo-TEST-operator', at: orderFixtureTime, operation });
const storeFor = (http: FixtureFirestore) => new StagingOperationalOrderStore(new FirestoreAtomicJsonPort(http, tenant, '200', 'stg_operational_orders'), environment, tenant);
const create = () => command('create', 0, { kind: 'CREATE', snapshot: createOrderFixture() });
async function setup(method: 'PIX' | 'NOTA' | 'DINHEIRO' = 'PIX') {
  const http = new FixtureFirestore(), store = storeFor(http);
  await store.execute(command('create', 0, { kind: 'CREATE', snapshot: createOrderFixture(tenant, 'demo-TEST-order', method) })); return { http, store };
}

test('staging order create/read/restart/retry is lossless and logically idempotent', async () => {
  const { http, store } = await setup(); const other = storeFor(http);
  const original = await store.get('demo-TEST-order'); assert.equal(original?.revision, 1);
  const result = await other.execute(create()); assert.equal(result.replay, true); assert.equal(result.revision, 1);
  const state = await other.snapshot(); assert.equal(state.records.length, 1); assert.equal(state.events.length, 1); assert.equal(state.audit.length, 1);
  assert.deepEqual(state.projections[0].operationalSnapshot, original);
  assert.deepEqual(readTestProjection(projectTestConsumers(original!)), original);
  assert.deepEqual(readTestProjection(JSON.parse(JSON.stringify(projectTestConsumers(original!)))), original);
  assert.deepEqual(original?.items, createOrderFixture().items); assert.deepEqual(original?.legacyRefs, createOrderFixture().legacyRefs);
  assert.equal(original?.discountCents, 150); assert.equal(original?.canonical.entryPoint, 'CHAT'); assert.ok(original?.canonical.createdAt instanceof Date);
  await assert.rejects(other.execute({ ...create(), actor: 'demo-TEST-other' }), /IDEMPOTENCY/);
});
test('double create and confirm retries across independent ports emit exactly one SALE', async () => {
  const http = new FixtureFirestore(), a = storeFor(http), b = storeFor(http);
  const results = await Promise.all([a.execute(create()), b.execute(create())]); assert.equal(results.filter(r => r.replay).length, 1); assert.ok(http.aborts > 0);
  const confirm = command('confirm', 1, { kind: 'CONFIRM' });
  const confirmed = await Promise.all([a.execute(confirm), b.execute(confirm)]); assert.equal(confirmed.filter(r => r.replay).length, 1);
  const state = await b.snapshot(); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(state.cash.totalSalesCents, 4850); assert.equal(state.cash.drawerCents, 0); assert.equal(state.cash.expected.PIX, 0);
});
test('two operators cannot silently overwrite concurrent confirmations', async () => {
  const { http, store } = await setup();
  const outcomes = await Promise.allSettled([store.execute(command('operator-a', 1, { kind: 'CONFIRM' })), storeFor(http).execute({ ...command('operator-b', 1, { kind: 'CONFIRM' }), actor: 'demo-TEST-other' })]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1); assert.equal(outcomes.filter(r => r.status === 'rejected').length, 1);
  assert.equal((await store.snapshot()).events.filter(e => e.fact === 'SALE').length, 1);
});
test('concurrent editing requires a new reviewed revision and preserves immutable context', async () => {
  const { http, store } = await setup(); const s = (await store.get('demo-TEST-order'))!;
  const a = structuredClone(s), b = structuredClone(s); a.items[0].observation = 'TEST edit A'; b.items[0].observation = 'TEST edit B';
  const outcomes = await Promise.allSettled([store.execute(command('edit-a', 1, { kind: 'UPDATE', snapshot: a })), storeFor(http).execute(command('edit-b', 1, { kind: 'UPDATE', snapshot: b }))]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  const current = (await store.get(s.canonical.id))!; const bad = structuredClone(current); bad.canonical.entryPoint = 'POS';
  await assert.rejects(store.execute(command('edit-context', 2, { kind: 'UPDATE', snapshot: bad })), /IMMUTABLE_CONTEXT/);
});
test('concurrent cancel/payment cannot produce canceled order with receipt', async () => {
  const { http, store } = await setup(); await store.execute(command('confirm', 1, { kind: 'CONFIRM' }));
  const outcomes = await Promise.allSettled([store.execute(command('cancel', 2, { kind: 'CANCEL' })), storeFor(http).execute(command('pay', 2, { kind: 'RECEIVE', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-payment' }))]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  const s = (await store.get('demo-TEST-order'))!;
  assert.ok(s.orderState === 'CANCELED' && s.receivedCents === 0 || s.orderState === 'CONFIRMED' && s.receivedCents === 4850);
});
test('concurrent payment and duplicate receipt evidence never double cash', async () => {
  const { http, store } = await setup('DINHEIRO'); await store.execute(command('confirm', 1, { kind: 'CONFIRM' }));
  const op: OrderOperation = { kind: 'RECEIVE', amountCents: 4850, method: 'DINHEIRO', evidenceId: 'demo-TEST-receipt' };
  const outcomes = await Promise.allSettled([store.execute(command('pay-a', 2, op)), storeFor(http).execute(command('pay-b', 2, op))]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1); assert.equal((await store.snapshot()).cash.drawerCents, 4850);
  await assert.rejects(store.execute(command('pay-again', 3, op)), /DUPLICATE_FINANCIAL/);
});
test('NOTA concurrent decisions conflict; rejection does not cancel and payment can change', async () => {
  const { http, store } = await setup('NOTA');
  await assert.rejects(store.execute(command('early-confirm', 1, { kind: 'CONFIRM' })), /PAYMENT_REVIEW/);
  const outcomes = await Promise.allSettled([store.execute(command('reject', 1, { kind: 'NOTA_REJECT' })), storeFor(http).execute(command('approve', 1, { kind: 'NOTA_APPROVE' }))]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1); assert.equal((await store.get('demo-TEST-order'))?.orderState, 'DRAFT');
  await store.execute(command('change', 2, { kind: 'CHANGE_PAYMENT', method: 'PIX' }));
  assert.equal((await store.get('demo-TEST-order'))?.notaState, 'NOT_REQUESTED');
  assert.equal((await store.execute(command('confirm', 3, { kind: 'CONFIRM' }))).snapshot?.orderState, 'CONFIRMED');
});
test('approved NOTA SALE and partial/final CREDIT_RECEIPT remain separate across restart', async () => {
  const { http, store } = await setup('NOTA');
  await store.execute(command('approve', 1, { kind: 'NOTA_APPROVE' })); await store.execute(command('confirm', 2, { kind: 'CONFIRM' }));
  assert.equal((await store.snapshot()).cash.openCreditCents, 4850); assert.equal((await store.snapshot()).cash.drawerCents, 0);
  await store.execute(command('partial', 3, { kind: 'RECEIVE', amountCents: 1000, method: 'DINHEIRO', evidenceId: 'demo-TEST-partial' }));
  assert.equal((await storeFor(http).get('demo-TEST-order'))?.notaState, 'PARTIALLY_PAID');
  await storeFor(http).execute(command('final', 4, { kind: 'RECEIVE', amountCents: 3850, method: 'PIX', evidenceId: 'demo-TEST-final' }));
  const state = await store.snapshot(); assert.equal(state.records[0].notaState, 'PAID'); assert.equal(state.cash.totalSalesCents, 4850); assert.equal(state.cash.drawerCents, 1000); assert.equal(state.cash.openCreditCents, 0); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(state.events.filter(e => e.fact === 'CREDIT_RECEIPT').length, 2);
  assert.equal(state.projections[0].legacyOrder, null); assert.equal(state.projections[0].legacyPaymentGap, 'LEGACY_PAYMENT_UNSUPPORTED');
});
test('KDS/delivery TEST stages retain financial pending even after legacy FECHADO', async () => {
  const { store } = await setup(); await store.execute(command('confirm', 1, { kind: 'CONFIRM' }));
  assert.equal((await store.snapshot()).projections[0].kds?.status, 'PEDIDO GERADO');
  await store.execute(command('production', 2, { kind: 'PRODUCTION', state: 'PREPARING' })); assert.equal((await store.snapshot()).projections[0].kds?.status, 'PRODUÇÃO');
  await store.execute(command('ready', 3, { kind: 'PRODUCTION', state: 'READY' }));
  for (const [i, state] of ['ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].entries()) await store.execute(command(`delivery-${i}`, 4 + i, { kind: 'DELIVERY', state: state as 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED', courierId: 'demo-TEST-courier' }));
  const snapshot = await store.snapshot(); assert.equal(snapshot.projections[0].delivery?.legacy?.status, 'FECHADO'); assert.equal(snapshot.records[0].paymentState, 'PENDING'); assert.equal(snapshot.records[0].canonical.status, 'CREATED');
  assert.deepEqual(readTestProjection(snapshot.projections[0]), snapshot.records[0]); assert.deepEqual(snapshot.records[0].items, createOrderFixture().items);
});
test('cash TEST closing distinguishes opening, receipts, supplies, withdrawals and NOTA', async () => {
  const { store } = await setup('DINHEIRO'); await store.execute(command('confirm', 1, { kind: 'CONFIRM' })); await store.execute(command('pay', 2, { kind: 'RECEIVE', amountCents: 4850, method: 'DINHEIRO', evidenceId: 'demo-TEST-receipt' }));
  const events = (await store.snapshot()).events;
  const movements = [{ id: 'demo-TEST-supply', kind: 'CASH_IN' as const, amountCents: 1000 }, { id: 'demo-TEST-withdraw', kind: 'CASH_OUT' as const, amountCents: 300 }];
  const closing = closeTestCash(events, { DINHEIRO: 6050, PIX: 0, DEBITO: 0, CREDITO: 0, NOTA: 0 }, movements, 500);
  assert.equal(closing.drawerCents, 6050); assert.equal(closing.rows[0].differenceCents, 0); assert.equal(closing.rows.length, 5);
  assert.throws(() => closeTestCash(events, { DINHEIRO: 0 } as never), /CENTS/);
});
test('rollback removes only selected TEST fixture/projections, preserves audit and fences old retries', async () => {
  const { http, store } = await setup();
  await store.execute(command('other-create', 0, { kind: 'CREATE', snapshot: createOrderFixture(tenant, 'demo-TEST-other') }, 'demo-TEST-other'));
  const rollback = command('rollback', 1, { kind: 'ROLLBACK_TEST' }); await store.execute(rollback);
  assert.equal((await store.execute(rollback)).replay, true); assert.equal(await store.get('demo-TEST-order'), undefined);
  assert.equal((await storeFor(http).snapshot()).records.length, 1); assert.equal((await store.snapshot()).projections[0].orderId, 'demo-TEST-other');
  assert.equal((await store.snapshot()).audit.length, 3); await assert.rejects(store.execute(create()), /ROLLED_BACK/);
  await store.execute(command('recreate', 0, { kind: 'CREATE', snapshot: createOrderFixture() })); assert.equal((await store.get('demo-TEST-order'))?.revision, 1);
  store.disable(); await assert.rejects(store.execute(command('blocked', 1, { kind: 'CONFIRM' })), /WRITES_DISABLED/);
});
test('environment/flag/tenant/project/path rejects before credentials or persistence', async () => {
  let resolutions = 0; const resolver = async () => { resolutions++; return 'fixture-token'; };
  for (const env of [{ ...environment, appEnv: 'production' }, { ...environment, projectId: 'project-1300957a-ea82-4645-845' }, { ...environment, operationalOrderWrites: undefined }]) assert.throws(() => createFirestoreOrderStore(env, tenant, resolver), /WRITES_DISABLED/);
  assert.throws(() => createFirestoreOrderStore(environment, 'real-tenant', resolver), /WRITES_DISABLED/);
  const http = new StagingFirestoreHttp(environment, resolver, 'stg_operational_orders');
  await assert.rejects(http.request('projects/lidacomzapcrm-staging/databases/(default)/documents:commit', 'POST', { writes: [{ update: { name: 'projects/lidacomzapcrm-staging/databases/(default)/documents/orders/real' } }] }), /WRITE_FORBIDDEN/);
  const inbound = new StagingFirestoreHttp(environment, resolver);
  await assert.rejects(inbound.request('projects/lidacomzapcrm-staging/databases/(default)/documents:commit', 'POST', { writes: [{ update: { name: 'projects/lidacomzapcrm-staging/databases/(default)/documents/stg_operational_orders/' + 'a'.repeat(64) } }] }), /WRITE_FORBIDDEN/);
  assert.equal(resolutions, 0);
});
test('malformed snapshots/PII/money/unknown fields fail atomically; printing has no mutations', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  for (const bad of [{ ...createOrderFixture(), notes: 'real body' }, { ...createOrderFixture(), totalCents: 1 }, { ...createOrderFixture(), customer: { id: 'real', name: 'Real Customer' } }]) await assert.rejects(store.execute({ ...create(), operation: { kind: 'CREATE', snapshot: bad as OperationalSnapshot } }));
  assert.equal(http.value, undefined);
  await store.execute(create()); const before = await store.snapshot();
  const html = renderPrintSnapshot({ version: 1, mode: 'SIMULATION', kind: 'PEDIDO', reference: before.records[0].canonical.id, lines: before.records[0].items.map(i => i.name) }); assert.match(html, /DEMO/);
  assert.deepEqual(await store.snapshot(), before);
  const raw = JSON.stringify(before.audit); assert.ok(!raw.includes('Demo Ana Exemplo') && !raw.includes('Demo Rua'));
});
test('refund requires explicit evidence and cannot fabricate a second sale', async () => {
  const { store } = await setup(); await store.execute(command('confirm', 1, { kind: 'CONFIRM' })); await store.execute(command('receive', 2, { kind: 'RECEIVE', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-receipt' }));
  await store.execute(command('refund', 3, { kind: 'REFUND', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-refund' }));
  const state = await store.snapshot(); assert.equal(state.records[0].paymentState, 'REFUNDED'); assert.equal(state.cash.totalSalesCents, 0); assert.equal(state.cash.expected.PIX, 0); assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1);
});
test('snapshot context mismatch fails closed without resetting the durable aggregate', async () => {
  const badPort: AtomicJsonPort = { transaction: async fn => fn('{"schema":1,"tenantId":"other"}').result };
  const store = new StagingOperationalOrderStore(badPort, environment, tenant);
  await assert.rejects(store.get('demo-TEST-order'), /STORE_CONTEXT_MISMATCH/);
});

test('complete cloud probe rehearsal covers persisted consumers and fixture rollback without live dependencies', async () => {
  const http = new FixtureFirestore();
  const result = await runOperationalOrderProbe(() => storeFor(http), tenant);
  assert.equal(result.remainingOrders, 0); assert.equal(result.rollbackRecreate, 'PASS'); assert.equal(result.productionWrite, false);
});

test('POS/QR origins can omit conversation but cannot lose tenant/contact or menu customization', async () => {
  for (const origin of ['POS', 'DIGITAL_MENU', 'TABLE_QR'] as const) {
    const fixture = createOrderFixture(); fixture.canonical.entryPoint = origin; fixture.canonical.conversationId = undefined; fixture.conversation = null;
    if (origin === 'TABLE_QR') { fixture.modality = 'TABLE'; fixture.table = 'Demo Mesa'; fixture.address = null; }
    validateSnapshot(fixture, tenant);
    assert.deepEqual(readTestProjection(projectTestConsumers(fixture)), fixture);
  }
});
test('NOTA rejection explicitly keeps draft and permits a new reviewed payment; configuration defaults disabled', async () => {
  const { store } = await setup('NOTA'); await store.execute(command('reject', 1, { kind: 'NOTA_REJECT' }));
  assert.equal((await store.get('demo-TEST-order'))?.notaState, 'REJECTED'); assert.equal((await store.get('demo-TEST-order'))?.orderState, 'DRAFT');
  await store.execute(command('change', 2, { kind: 'CHANGE_PAYMENT', method: 'DINHEIRO' })); assert.equal((await store.get('demo-TEST-order'))?.method, 'DINHEIRO');
  const config = JSON.parse(readFileSync('config/order-staging-environment.example.json', 'utf8'));
  assert.equal(config.OPERATIONAL_ORDER_WRITES, 'DISABLED'); assert.equal(config.PROJECT_ID, 'lidacomzapcrm-staging');
});

test('dispatch attribution survives serialization, replay, projections, events and TEST rollback', async () => {
  const http = new FixtureFirestore(), store = storeFor(http), snapshot = createOrderFixture();
  snapshot.canonical.dispatchCampaignId = 'demo-TEST-dispatch'; snapshot.canonical.queueEntryId = 'demo-TEST-queue';
  const request = command('attributed', 0, { kind: 'CREATE', snapshot });
  await store.execute(request);
  const restarted = storeFor(http);
  assert.equal((await restarted.execute(request)).replay, true);
  await restarted.execute(command('attributed-confirm', 1, { kind: 'CONFIRM' }));
  const current = await restarted.snapshot();
  assert.equal(current.records.length, 1);
  assert.equal(readTestProjection(JSON.parse(JSON.stringify(current.projections[0]))).canonical.queueEntryId, 'demo-TEST-queue');
  for (const event of [...current.events, ...current.audit]) {
    assert.equal(event.orderId, snapshot.canonical.id);
    assert.equal(event.dispatchCampaignId, 'demo-TEST-dispatch'); assert.equal(event.queueEntryId, 'demo-TEST-queue');
  }
  const changed = structuredClone(request);
  if (changed.operation.kind !== 'CREATE') throw new Error('fixture');
  changed.operation.snapshot.canonical.queueEntryId = 'demo-TEST-other-queue';
  await assert.rejects(restarted.execute(changed), /ORDER_IDEMPOTENCY_CONFLICT/);
  await restarted.execute(command('attributed-rollback', 2, { kind: 'ROLLBACK_TEST' }));
  const rolledBack = await storeFor(http).snapshot();
  assert.equal(rolledBack.records.length, 0);
  assert.equal(rolledBack.audit.at(-1)?.queueEntryId, 'demo-TEST-queue');
});

test('order attribution is immutable and only TEST references enter persisted snapshots or audit', async () => {
  const http = new FixtureFirestore(), store = storeFor(http), fixture = createOrderFixture();
  fixture.canonical.dispatchCampaignId = 'demo-TEST-dispatch'; fixture.canonical.queueEntryId = 'demo-TEST-queue';
  for (const field of ['dispatchCampaignId', 'queueEntryId'] as const) {
    const invalid = structuredClone(fixture); invalid.canonical[field] = 'real-reference';
    await assert.rejects(store.execute(command('invalid', 0, { kind: 'CREATE', snapshot: invalid })), /ORDER_DISPATCH_REF_INVALID/);
  }
  assert.equal(http.value, undefined);
  await store.execute(command('create-attribution', 0, { kind: 'CREATE', snapshot: fixture }));
  for (const field of ['dispatchCampaignId', 'queueEntryId'] as const) {
    const current = (await store.get('demo-TEST-order'))!;
    current.canonical[field] = 'demo-TEST-changed';
    await assert.rejects(store.execute(command('change-' + field, 1, { kind: 'UPDATE', snapshot: current })), /ORDER_IMMUTABLE_CONTEXT/);
  }
  const raw = JSON.parse(http.value!); raw.audit[0].dispatchCampaignId = 'real-reference'; http.value = JSON.stringify(raw);
  await assert.rejects(storeFor(http).snapshot(), /ORDER_STORE_AUDIT_INVALID/);
});

test('two orders for one customer stay distinct across WhatsApp and RCS with independent retries', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  for (const [id, channel] of [['demo-TEST-one', 'WHATSAPP'], ['demo-TEST-two', 'RCS']] as const) {
    const snapshot = createOrderFixture(tenant, id); snapshot.canonical.channel = channel;
    const request = command('create-' + channel, 0, { kind: 'CREATE', snapshot }, id);
    await store.execute(request); assert.equal((await storeFor(http).execute(request)).replay, true);
  }
  const current = await storeFor(http).snapshot();
  assert.equal(current.records.length, 2); assert.equal(current.events.length, 2);
  assert.equal(new Set(current.records.map(s => s.canonical.contactId)).size, 1);
  assert.deepEqual(current.projections.map(p => p.orderId).sort(), ['demo-TEST-one', 'demo-TEST-two']);
});

const metaOrderReference: ExternalOrderReference = { provider: 'WHATSAPP_META_OFFICIAL', channel: 'WHATSAPP', providerAccountId: 'demo-TEST-account', externalOrderId: 'demo-TEST-external-order' };
const evolutionOrderReference: ExternalOrderReference = { ...metaOrderReference, provider: 'WHATSAPP_EVOLUTION_OPTIONAL' };
const rcsOrderReference: ExternalOrderReference = { ...metaOrderReference, provider: 'RCS_GOOGLE', channel: 'RCS' };
function createReferenced(name: string, id: string, reference = metaOrderReference) {
  const snapshot = createOrderFixture(tenant, id); snapshot.canonical.externalReferences = [structuredClone(reference)];
  return command(name, 0, { kind: 'CREATE', snapshot }, id);
}

test('one canonical order resolves across Meta, Evolution and RCS after retry and restart', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  const request = createReferenced('external-create', 'demo-TEST-order');
  await store.execute(request); assert.equal((await storeFor(http).execute(request)).replay, true);
  for (const [index, reference] of [evolutionOrderReference, rcsOrderReference].entries()) {
    const link = command('link-' + index, index + 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference });
    await storeFor(http).execute(link); assert.equal((await storeFor(http).execute(link)).replay, true);
  }
  const current = await storeFor(http).snapshot();
  assert.equal(current.records.length, 1); assert.equal(current.events.length, 3); assert.equal(current.audit.length, 3);
  assert.equal(current.records[0].canonical.channel, 'WHATSAPP');
  const references = [metaOrderReference, evolutionOrderReference, rcsOrderReference];
  assert.deepEqual(current.records[0].canonical.externalReferences, references);
  for (const reference of references) assert.deepEqual(await storeFor(http).getByExternalReference(reference), current.records[0]);
  assert.deepEqual(readTestProjection(JSON.parse(JSON.stringify(current.projections[0]))), current.records[0]);
  assert.deepEqual(current.audit.at(-1)?.externalReferences, references);
  assert.equal(current.projections[0].orderId, 'demo-TEST-order');
  assert.equal(current.cash.totalSalesCents, 0); assert.equal(current.cash.drawerCents, 0);
  assert.ok(current.events.every(e => e.fact === 'STATE' && e.amountCents === 0));
});

test('concurrent creates cannot claim one external identity for two canonical orders', async () => {
  const http = new FixtureFirestore();
  const outcomes = await Promise.allSettled([
    storeFor(http).execute(createReferenced('alias-a', 'demo-TEST-a')),
    storeFor(http).execute(createReferenced('alias-b', 'demo-TEST-b')),
  ]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = outcomes.find(r => r.status === 'rejected') as PromiseRejectedResult;
  assert.match(String(rejected.reason), /ORDER_EXTERNAL_REFERENCE_CONFLICT/); assert.ok(http.aborts > 0);
  const state = await storeFor(http).snapshot();
  assert.equal(state.records.length, 1); assert.equal(state.events.length, 1); assert.equal(state.audit.length, 1);
  assert.equal((await storeFor(http).getByExternalReference(metaOrderReference))?.canonical.id, state.records[0].canonical.id);
});

test('concurrent links cannot attach an external identity to different orders', async () => {
  const { http, store } = await setup();
  await store.execute(command('create-other', 0, { kind: 'CREATE', snapshot: createOrderFixture(tenant, 'demo-TEST-other') }, 'demo-TEST-other'));
  const outcomes = await Promise.allSettled([
    store.execute(command('claim-a', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: metaOrderReference })),
    storeFor(http).execute(command('claim-b', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: metaOrderReference }, 'demo-TEST-other')),
  ]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(String((outcomes.find(r => r.status === 'rejected') as PromiseRejectedResult).reason), /ORDER_EXTERNAL_REFERENCE_CONFLICT/);
  const state = await store.snapshot();
  assert.equal(state.records.length, 2); assert.equal(state.events.length, 3);
  assert.equal(state.records.filter(s => s.canonical.externalReferences?.length).length, 1);
});

test('external IDs are scoped by account, provider and tenant, never by customer', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  const references = [metaOrderReference, evolutionOrderReference, rcsOrderReference, { ...metaOrderReference, providerAccountId: 'demo-TEST-account-two' }, { ...metaOrderReference, externalOrderId: 'demo-TEST-second-order' }];
  for (const [i, reference] of references.entries()) {
    const request = createReferenced('scoped-' + i, 'demo-TEST-scoped-' + i, reference);
    await store.execute(request); assert.equal((await store.execute(request)).replay, true);
    assert.equal((await store.getByExternalReference(reference))?.canonical.id, request.orderId);
  }
  const state = await store.snapshot(); assert.equal(state.records.length, 5);
  assert.equal(new Set(state.records.map(s => s.canonical.contactId)).size, 1);
  const otherTenant = 'demo-TEST-other-tenant', otherHttp = new FixtureFirestore();
  const other = new StagingOperationalOrderStore(new FirestoreAtomicJsonPort(otherHttp, otherTenant, '200', 'stg_operational_orders'), environment, otherTenant);
  assert.equal(await other.getByExternalReference(metaOrderReference), undefined);
  const request = createReferenced('other-tenant', 'demo-TEST-other-order'); request.tenantId = otherTenant;
  if (request.operation.kind !== 'CREATE') throw new Error('fixture');
  request.operation.snapshot.canonical.tenantId = otherTenant; request.operation.snapshot.conversation!.tenantId = otherTenant;
  await other.execute(request);
  assert.equal((await other.getByExternalReference(metaOrderReference))?.canonical.id, 'demo-TEST-other-order');
  assert.equal((await store.getByExternalReference(metaOrderReference))?.canonical.id, 'demo-TEST-scoped-0');
  await assert.rejects(store.execute(request), /ORDER_COMMAND_TENANT_MISMATCH/);
});

test('identity linking cannot edit immutable references or reuse a command with different data', async () => {
  const http = new FixtureFirestore(), store = storeFor(http), request = createReferenced('identity-create', 'demo-TEST-order');
  await store.execute(request);
  const changedRequest = structuredClone(request);
  if (changedRequest.operation.kind !== 'CREATE') throw new Error('fixture');
  changedRequest.operation.snapshot.canonical.externalReferences = [evolutionOrderReference];
  await assert.rejects(store.execute(changedRequest), /ORDER_IDEMPOTENCY_CONFLICT/);
  for (const references of [undefined, [], [evolutionOrderReference], [metaOrderReference, evolutionOrderReference]]) {
    const snapshot = (await store.get(request.orderId))!; snapshot.canonical.externalReferences = references;
    await assert.rejects(store.execute(command('rewrite', 1, { kind: 'UPDATE', snapshot })), /ORDER_IMMUTABLE_CONTEXT/);
  }
  const before = http.value;
  await assert.rejects(store.execute(command('duplicate', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: metaOrderReference })), /ORDER_EXTERNAL_REFERENCE_DUPLICATE/);
  assert.equal(http.value, before);
  const link = command('link', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: evolutionOrderReference });
  await store.execute(link);
  await assert.rejects(store.execute({ ...link, operation: { kind: 'LINK_EXTERNAL_REFERENCE', reference: rcsOrderReference } }), /ORDER_IDEMPOTENCY_CONFLICT/);
});

test('invalid or non-TEST external identifiers fail before persistence is reached', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  for (const reference of [
    { ...metaOrderReference, externalOrderId: 'real-order' }, { ...metaOrderReference, providerAccountId: 'real-account' },
    { ...metaOrderReference, provider: 'UNKNOWN' }, { ...metaOrderReference, channel: 'RCS' },
    { ...metaOrderReference, token: 'not-allowed' }, null,
  ] as ExternalOrderReference[]) {
    await assert.rejects(store.execute(createReferenced('bad', 'demo-TEST-order', reference)), /ORDER_EXTERNAL/);
    await assert.rejects(store.execute(command('bad-link', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference })), /ORDER_EXTERNAL/);
    await assert.rejects(store.getByExternalReference(reference), /ORDER_EXTERNAL/);
  }
  assert.equal(http.paths.length, 0); assert.equal(http.value, undefined);
});

test('external references preserve state and financial facts on a paid order', async () => {
  const { store } = await setup();
  await store.execute(command('confirm', 1, { kind: 'CONFIRM' }));
  await store.execute(command('receive', 2, { kind: 'RECEIVE', amountCents: 4850, method: 'PIX', evidenceId: 'demo-TEST-receipt' }));
  const before = await store.snapshot();
  await store.execute(command('link-paid', 3, { kind: 'LINK_EXTERNAL_REFERENCE', reference: rcsOrderReference }));
  const after = await store.snapshot();
  assert.deepEqual(after.cash, before.cash); assert.equal(after.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(after.events.filter(e => e.fact === 'RECEIPT').length, 1);
  assert.equal(after.records[0].canonical.status, 'PAID'); assert.equal(after.records[0].productionState, 'WAITING'); assert.equal(after.records[0].deliveryState, 'NOT_APPLICABLE');
  assert.equal(after.events.at(-1)?.fact, 'STATE'); assert.equal(after.events.at(-1)?.amountCents, 0);
  assert.equal(after.projections[0].legacyOrder?.id, 'demo-TEST-order');
  assert.equal(after.projections[0].kds?.orderId, 'demo-TEST-order');
  assert.equal(after.projections[0].delivery?.legacy?.id, 'demo-TEST-order');
  assert.deepEqual(readTestProjection(JSON.parse(JSON.stringify(after.projections[0]))).canonical.externalReferences, [rcsOrderReference]);
});

test('persisted duplicate ownership and invalid audit references fail closed without resetting data', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  await store.execute(createReferenced('first', 'demo-TEST-first'));
  await store.execute(createReferenced('second', 'demo-TEST-second', evolutionOrderReference));
  const good = http.value!;
  const duplicated = JSON.parse(good); duplicated.records[1].canonical.externalReferences = [metaOrderReference];
  http.value = JSON.stringify(duplicated); const invalid = http.value;
  await assert.rejects(storeFor(http).getByExternalReference(metaOrderReference), /ORDER_EXTERNAL_REFERENCE_CONFLICT/);
  assert.equal(http.value, invalid);
  const badAudit = JSON.parse(good); badAudit.audit[0].externalReferences = [{ ...metaOrderReference, externalOrderId: 'real-order' }];
  http.value = JSON.stringify(badAudit); const auditBefore = http.value;
  await assert.rejects(storeFor(http).snapshot(), /ORDER_EXTERNAL/); assert.equal(http.value, auditBefore);
});

test('TEST rollback removes active references, preserves their audit and rejects old retries', async () => {
  const http = new FixtureFirestore(), store = storeFor(http), request = createReferenced('rollback-create', 'demo-TEST-order');
  await store.execute(request); await store.execute(createReferenced('unrelated', 'demo-TEST-other', evolutionOrderReference));
  await store.execute(command('rollback-identity', 1, { kind: 'ROLLBACK_TEST' }));
  assert.equal(await storeFor(http).getByExternalReference(metaOrderReference), undefined);
  assert.equal((await storeFor(http).getByExternalReference(evolutionOrderReference))?.canonical.id, 'demo-TEST-other');
  assert.deepEqual((await store.snapshot()).audit.at(-1)?.externalReferences, [metaOrderReference]);
  await assert.rejects(store.execute(request), /ORDER_COMMAND_ROLLED_BACK/);
  await store.execute(createReferenced('explicit-recreate', 'demo-TEST-order'));
  assert.equal((await store.getByExternalReference(metaOrderReference))?.canonical.id, request.orderId);
});

test('caller mutations and property ordering cannot change persisted identity or replay results', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  const request = createReferenced('clone-create', 'demo-TEST-order'); await store.execute(request);
  const reference = structuredClone(evolutionOrderReference);
  const pending = store.execute(command('clone-link', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference }));
  reference.externalOrderId = 'demo-TEST-mutated'; await pending;
  const result = (await store.getByExternalReference(evolutionOrderReference))!;
  result.canonical.externalReferences![0].externalOrderId = 'demo-TEST-mutated';
  assert.equal((await store.getByExternalReference(metaOrderReference))?.canonical.externalReferences?.[0].externalOrderId, metaOrderReference.externalOrderId);
  const reordered = { externalOrderId: evolutionOrderReference.externalOrderId, providerAccountId: evolutionOrderReference.providerAccountId, channel: evolutionOrderReference.channel, provider: evolutionOrderReference.provider };
  assert.equal((await store.execute(command('clone-link', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: reordered }))).replay, true);
  const snapshot = (await store.get('demo-TEST-order'))!; snapshot.canonical.externalReferences = [metaOrderReference, reordered];
  await store.execute(command('edit-preserves-reference', 2, { kind: 'UPDATE', snapshot }));
});

test('cancellation keeps external identity reserved and disabling blocks lookup and linking', async () => {
  const http = new FixtureFirestore(), store = storeFor(http);
  await store.execute(createReferenced('cancel-create', 'demo-TEST-order'));
  await store.execute(command('cancel-linked', 1, { kind: 'CANCEL' }));
  assert.equal((await store.getByExternalReference(metaOrderReference))?.canonical.status, 'CANCELED');
  await assert.rejects(store.execute(createReferenced('cancel-duplicate', 'demo-TEST-other')), /ORDER_EXTERNAL_REFERENCE_CONFLICT/);
  await assert.rejects(store.execute(command('link-canceled', 2, { kind: 'LINK_EXTERNAL_REFERENCE', reference: evolutionOrderReference })), /ORDER_NOT_MUTABLE/);
  const before = http.value, requests = http.paths.length; store.disable();
  await assert.rejects(store.getByExternalReference(metaOrderReference), /ORDER_STAGING_WRITES_DISABLED/);
  await assert.rejects(store.execute(command('link-disabled', 2, { kind: 'LINK_EXTERNAL_REFERENCE', reference: evolutionOrderReference })), /ORDER_STAGING_WRITES_DISABLED/);
  assert.equal(http.value, before); assert.equal(http.paths.length, requests);
});

test('TEST reference capacity and nonfinancial link audit are enforced without partial commits', async () => {
  const http = new FixtureFirestore(), store = storeFor(http), snapshot = createOrderFixture();
  const references = Array.from({ length: 17 }, (_, i) => ({ ...metaOrderReference, externalOrderId: 'demo-TEST-capacity-' + i }));
  snapshot.canonical.externalReferences = references;
  await assert.rejects(store.execute(command('too-many', 0, { kind: 'CREATE', snapshot })), /ORDER_EXTERNAL_TEST_REFERENCE_REQUIRED/);
  assert.equal(http.paths.length, 0);
  snapshot.canonical.externalReferences = references.slice(0, 16);
  await store.execute(command('bounded-create', 0, { kind: 'CREATE', snapshot }));
  const before = http.value;
  await assert.rejects(store.execute(command('overflow', 1, { kind: 'LINK_EXTERNAL_REFERENCE', reference: references[16] })), /ORDER_EXTERNAL_TEST_REFERENCE_REQUIRED/);
  assert.equal(http.value, before);
  const corrupt = JSON.parse(before!); corrupt.audit[0].operation = 'LINK_EXTERNAL_REFERENCE'; corrupt.audit[0].fact = 'SALE'; corrupt.audit[0].amountCents = 4850;
  http.value = JSON.stringify(corrupt); const corruptBefore = http.value;
  await assert.rejects(storeFor(http).snapshot(), /ORDER_STORE_AUDIT_INVALID/); assert.equal(http.value, corruptBefore);
});
