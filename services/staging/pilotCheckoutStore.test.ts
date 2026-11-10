import test from 'node:test';
import assert from 'node:assert/strict';
import type { AtomicJsonPort } from './durableInboundJournal';
import { PilotCheckoutTestStore } from './pilotCheckoutStore';
import { pilotOrderPrint } from '../../src/application/pilotMenuCheckout';
import { renderPrintSnapshot } from '../../src/application/operationsFinance';
import { StagingOperationalOrderStore } from './operationalOrderStore';
import { operationalOrderPrint, readTestProjection } from '../../src/application/operationalOrderProjections';
import type { OperationalCommand, OrderOperation, OperationalOrderPersistencePort } from '../../src/application/stagingOperationalOrders';
// Importing factories from a test file would register its tests twice in a combined suite.
import type { PilotCatalog, PilotCheckoutCommand } from '../../src/application/pilotMenuCheckout';
const at = '2026-10-06T00:00:00.000Z';
function fixtures() {
  const catalog: PilotCatalog = { revision: 'demo-TEST-v1', deliveryFeeCents: 700, menu: { id: 'demo-TEST-menu', name: 'TEST Menu', description: 'TEST', imageBanner: '', availableHours: 'TEST', active: true, productIds: ['demo-TEST-product'], createdAt: at }, products: [{ id: 'demo-TEST-product', name: 'TEST Refeicao', description: 'TEST', image: '', category: 'TEST', price: 10, tamanhos: [{ label: 'TEST M', price: 20 }], adicionais: [], naoMandar: [], utensilios: [] }] };
  const command: PilotCheckoutCommand = { commandId: 'demo-TEST-command', idempotencyKey: 'demo-TEST-checkout', menuId: catalog.menu.id, catalogRevision: catalog.revision, origin: 'PUBLIC_MENU', conversationId: null, customer: { name: 'Cliente TEST Exemplo', identity: 'TEST-customer' }, modality: 'PICKUP', paymentMethod: 'Pix', address: null, lines: [{ productId: 'demo-TEST-product', size: 'TEST M', addonIds: [], removed: [], utensilIds: [], quantity: 1, observation: 'TEST' }] };
  return { catalog, command };
}
/** Shared serialized fixture implements atomic callback semantics; no network or DB. */
class FixtureAtomic implements AtomicJsonPort {
  value?: string; calls = 0; tail: Promise<unknown> = Promise.resolve();
  transaction<T>(fn: (current: string | undefined) => { value: string; result: T }): Promise<T> {
    const result = this.tail.then(() => { this.calls++; const next = fn(this.value); this.value = next.value; return next.result; }); this.tail = result.catch(() => undefined); return result;
  }
}
const env = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', pilotOrderWrites: 'TEST_ONLY' as const };
const store = (port: AtomicJsonPort) => new PilotCheckoutTestStore(port, env, 'demo-TEST-pilot');
test('pilot confirmation/retry/restart preserves one order, one client and one audit', async () => {
  const port = new FixtureAtomic(), { catalog, command } = fixtures();
  const a = await store(port).create(command, catalog, at), b = await store(port).create(command, { ...catalog, revision: 'demo-TEST-next' }, '2026-10-07T00:00:00.000Z');
  assert.equal(b.replay, true); assert.deepEqual(b.snapshot, a.snapshot);
  const state = JSON.parse(port.value!); assert.equal(state.commands.length, 1); assert.equal(state.customers.length, 1); assert.equal(state.audit.length, 1); assert.equal(state.commands[0].snapshot.paymentState, 'PENDING');
  const print = renderPrintSnapshot(pilotOrderPrint(b.snapshot, 'COMANDA')); assert.ok(print.includes(b.snapshot.legacy.id));
  assert.ok(!['totalBought', 'lastPurchaseDate', 'messages', 'SALE', 'RECEIPT', 'currentBalance'].some(v => Object.prototype.hasOwnProperty.call(state, v)));
});
test('simultaneous independent TEST ports dedupe order and customer atomically', async () => {
  const port = new FixtureAtomic(), { catalog, command } = fixtures();
  const results = await Promise.all([store(port).create(command, catalog, at), store(port).create(command, catalog, at)]);
  assert.equal(results.filter(r => r.replay).length, 1);
  await store(port).create({ ...command, commandId: 'demo-TEST-second', idempotencyKey: 'demo-TEST-second' }, catalog, at);
  const state = JSON.parse(port.value!); assert.equal(state.commands.length, 2); assert.equal(state.customers.length, 1);
  assert.equal(state.commands[0].snapshot.legacy.clientId, state.commands[1].snapshot.legacy.clientId);
});
test('conflicting retry cannot overwrite original command or price', async () => {
  const port = new FixtureAtomic(), { catalog, command } = fixtures(); await store(port).create(command, catalog, at); const before = port.value;
  await assert.rejects(store(port).create({ ...command, paymentMethod: 'Dinheiro' }, catalog, at), /IDEMPOTENCY/); assert.equal(port.value, before);
  await assert.rejects(store(port).create({ ...command, idempotencyKey: 'demo-TEST-other' }, catalog, at), /IDEMPOTENCY/); assert.equal(port.value, before);
});
test('production/default flag/wrong tenant/real data reject before any port access', async () => {
  const port = new FixtureAtomic(), { catalog, command } = fixtures();
  for (const e of [{ ...env, appEnv: 'production' }, { ...env, projectId: 'project-1300957a-ea82-4645-845' }, { ...env, pilotOrderWrites: undefined }]) assert.throws(() => new PilotCheckoutTestStore(port, e, 'demo-TEST-pilot'), /DISABLED/);
  assert.throws(() => new PilotCheckoutTestStore(port, env, 'prato-mineiro'), /DISABLED/);
  await assert.rejects(store(port).create({ ...command, customer: { ...command.customer, identity: '+5500000000000' } }, catalog, at), /TEST_DATA/);
  const disabled = store(port); disabled.disable(); await assert.rejects(disabled.create(command, catalog, at), /DISABLED/);
  assert.equal(port.calls, 0); assert.equal(port.value, undefined);
});
test('invalid prices/options and mismatched journal never persist a checkout', async () => {
  const port = new FixtureAtomic(), { catalog, command } = fixtures();
  const bad = structuredClone(catalog); bad.products[0].tamanhos[0].price = -1;
  await assert.rejects(store(port).create(command, bad, at)); assert.equal(port.value, undefined);
  port.value = JSON.stringify({ schema: 'OTHER', tenant: 'demo-TEST-pilot' }); const before = port.value;
  await assert.rejects(store(port).create(command, catalog, at), /CONTEXT/); assert.equal(port.value, before);
});

const tenant = 'demo-TEST-pilot';
const operationalEnvironment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', operationalOrderWrites: 'TEST_ONLY' as const };
const handoffOptions = { actor: 'demo-TEST-operator', creationMode: 'CUSTOMER' as const };
const operational = (port: AtomicJsonPort) => new StagingOperationalOrderStore(port, operationalEnvironment, tenant);
const operation = (orderId: string, expectedRevision: number, op: OrderOperation, name: string): OperationalCommand => ({ commandId: 'demo-TEST-op-' + name, idempotencyKey: 'demo-TEST-op-key-' + name, tenantId: tenant, orderId, expectedRevision, actor: handoffOptions.actor, at, operation: op });
function detailedFixtures() {
  const { command, catalog } = fixtures();
  catalog.products[0].adicionais = [{ id: 'demo-TEST-addon', name: 'TEST Adicional', price: 2 }];
  catalog.products[0].utensilios = [{ id: 'demo-TEST-utensil', name: 'TEST Talher', price: 1 }];
  catalog.products[0].naoMandar = ['TEST Retirar'];
  command.lines[0] = { ...command.lines[0], addonIds: ['demo-TEST-addon'], utensilIds: ['demo-TEST-utensil'], removed: ['TEST Retirar'], quantity: 2, observation: 'TEST Observacao' };
  command.modality = 'DELIVERY'; command.address = { street: 'TEST Rua', number: 'TEST 10', neighborhood: 'TEST Bairro', complement: 'TEST Fundos', zipCode: 'TEST CEP' };
  return { command, catalog };
}

test('checkout handoff preserves canonical ID, complete items, address and provenance without releasing production', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = detailedFixtures();
  const reviewed = await store(source).create(command, catalog, at), savedSource = source.value;
  const imported = await store(source).handoff(command.commandId, operational(target), handoffOptions);
  assert.equal(imported.snapshot?.canonical.id, reviewed.snapshot.legacy.id); assert.equal(imported.snapshot?.canonical.contactId, reviewed.snapshot.legacy.clientId);
  assert.equal(imported.snapshot?.canonical.entryPoint, 'DIGITAL_MENU'); assert.equal(imported.snapshot?.canonical.channel, 'NONE'); assert.equal(imported.snapshot?.canonical.provider, undefined);
  assert.equal(imported.snapshot?.canonical.creationMode, 'CUSTOMER'); assert.equal(imported.snapshot?.totalCents, 5300);
  assert.equal(imported.snapshot?.address?.complement, 'TEST Fundos'); assert.equal(imported.snapshot?.address?.number, 'TEST 10'); assert.equal(imported.snapshot?.address?.zip, 'TEST CEP'); assert.equal(imported.snapshot?.address?.city, undefined);
  assert.equal(imported.snapshot?.customer.name, command.customer.name);
  assert.deepEqual(imported.snapshot?.checkout, { commandId: command.commandId, menuId: command.menuId, catalogRevision: command.catalogRevision, restaurant: reviewed.snapshot.restaurant });
  const state = await operational(target).snapshot(); assert.equal(state.records.length, 1); assert.equal(state.events.length, 1); assert.equal(state.events[0].fact, 'STATE');
  assert.equal(state.records[0].orderState, 'DRAFT'); assert.equal(state.records[0].paymentState, 'PENDING'); assert.equal(state.projections[0].kds, null); assert.equal(state.projections[0].delivery, null); assert.equal(state.cash.totalSalesCents, 0);
  assert.deepEqual(readTestProjection(JSON.parse(JSON.stringify(state.projections[0]))), state.records[0]);
  const line = state.records[0].items[0]; assert.equal(line.unitCents, 2000); assert.equal(line.subtotalCents, 4600); assert.equal(line.addons[0].unitCents, 200); assert.equal(line.utensils[0].unitCents, 100); assert.deepEqual(line.removed, ['TEST Retirar']); assert.equal(line.observation, 'TEST Observacao');
  assert.equal(source.value, savedSource);
});

test('the same checkout traverses kitchen, delivery, cash and printing with separate payment evidence', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = detailedFixtures();
  const reviewed = await store(source).create(command, catalog, at), id = reviewed.snapshot.legacy.id;
  const orders = operational(target); await store(source).handoff(command.commandId, orders, handoffOptions);
  const steps: OrderOperation[] = [{ kind: 'CONFIRM' }, { kind: 'PRODUCTION', state: 'PREPARING' }, { kind: 'PRODUCTION', state: 'READY' }, { kind: 'DELIVERY', state: 'ASSIGNED', courierId: 'demo-TEST-courier' }, { kind: 'DELIVERY', state: 'IN_TRANSIT', courierId: 'demo-TEST-courier' }, { kind: 'DELIVERY', state: 'DELIVERED', courierId: 'demo-TEST-courier' }];
  for (const [i, step] of steps.entries()) await orders.execute(operation(id, i + 1, step, 'step-' + i));
  let state = await orders.snapshot(); assert.equal(state.projections[0].delivery?.legacy?.status, 'FECHADO'); assert.equal(state.records[0].canonical.status, 'CREATED'); assert.equal(state.records[0].paymentState, 'PENDING');
  for (const projectedId of [state.projections[0].legacyOrder?.id, state.projections[0].kds?.orderId, state.projections[0].delivery?.legacy?.id]) assert.equal(projectedId, id);
  assert.equal(state.projections[0].delivery?.legacy?.address.complement, 'TEST Fundos');
  assert.equal(state.cash.totalSalesCents, 5300); assert.equal(state.cash.expected.PIX, 0);
  const beforePrint = target.value;
  for (const kind of ['PEDIDO', 'COMANDA', 'COZINHA'] as const) {
    const html = renderPrintSnapshot(operationalOrderPrint(state.records[0], kind));
    for (const text of [id, 'PENDENTE', '53.00', 'TEST Fundos', 'TEST Adicional', 'TEST Talher', 'TEST Retirar', 'TEST Observacao', 'SIMULAÇÃO']) assert.ok(html.includes(text), text);
  }
  assert.equal(target.value, beforePrint);
  const receive = operation(id, 7, { kind: 'RECEIVE', amountCents: 5300, method: 'PIX', evidenceId: 'demo-TEST-receipt' }, 'receive');
  await orders.execute(receive); assert.equal((await orders.execute(receive)).replay, true);
  assert.equal((await store(source).handoff(command.commandId, orders, handoffOptions)).replay, true);
  state = await operational(target).snapshot(); assert.equal(state.records[0].revision, 8); assert.equal(state.records[0].canonical.status, 'PAID'); assert.equal(state.cash.expected.PIX, 5300);
  assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(state.events.filter(e => e.fact === 'RECEIPT').length, 1);
  assert.match(renderPrintSnapshot(operationalOrderPrint(state.records[0], 'COMANDA')), /RECEBIDO/);
});

test('Meta, Evolution and RCS checkout retain explicit origin provider after restart', async () => {
  for (const conversationContext of [{ channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL' }, { channel: 'WHATSAPP', provider: 'WHATSAPP_EVOLUTION_OPTIONAL' }, { channel: 'RCS', provider: 'RCS_GOOGLE' }] as const) {
    const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures();
    command.origin = 'CONVERSATION'; command.conversationId = 'demo-TEST-conversation'; command.conversationContext = conversationContext;
    const reviewed = await store(source).create(command, catalog, at);
    await store(source).handoff(command.commandId, operational(target), { ...handoffOptions, creationMode: 'HUMAN_OPERATOR' });
    const snapshot = (await operational(target).get(reviewed.snapshot.legacy.id))!;
    assert.equal(snapshot.canonical.provider, conversationContext.provider); assert.equal(snapshot.canonical.channel, conversationContext.channel); assert.equal(snapshot.canonical.entryPoint, 'CHAT'); assert.equal(snapshot.canonical.conversationId, command.conversationId);
    assert.equal(snapshot.conversation?.contactId, snapshot.customer.id); assert.equal(snapshot.canonical.externalReferences, undefined);
  }
});

test('concurrent handoffs and a lost acknowledgement recover without creating another order', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures(); await store(source).create(command, catalog, at);
  const results = await Promise.all([store(source).handoff(command.commandId, operational(target), handoffOptions), store(source).handoff(command.commandId, operational(target), handoffOptions)]);
  assert.equal(results.filter(r => r.replay).length, 1); assert.equal((await operational(target).snapshot()).records.length, 1);
  const second = { ...command, commandId: 'demo-TEST-second', idempotencyKey: 'demo-TEST-second' }; await store(source).create(second, catalog, at);
  const orders = operational(target);
  const unreliable: OperationalOrderPersistencePort = { tenantId: tenant, get: id => orders.get(id), getByExternalReference: ref => orders.getByExternalReference(ref), execute: async c => { await orders.execute(c); throw new Error('ACK_LOST'); } };
  await assert.rejects(store(source).handoff(second.commandId, unreliable, handoffOptions), /ACK_LOST/);
  assert.equal((await store(source).handoff(second.commandId, operational(target), handoffOptions)).replay, true);
  const state = await orders.snapshot(); assert.equal(state.records.length, 2); assert.equal(new Set(state.records.map(s => s.canonical.contactId)).size, 1); assert.equal(state.events.length, 2);
});

test('a rejected destination leaves checkout reusable and never creates a second identity', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures();
  const reviewed = await store(source).create(command, catalog, at), saved = source.value;
  const disabled = operational(target); disabled.disable();
  await assert.rejects(store(source).handoff(command.commandId, disabled, handoffOptions), /DISABLED/); assert.equal(target.value, undefined); assert.equal(source.value, saved);
  const imported = await store(source).handoff(command.commandId, operational(target), handoffOptions);
  assert.equal(imported.snapshot?.canonical.id, reviewed.snapshot.legacy.id); assert.equal(source.value, saved);
});

test('handoff rejects other tenants, missing receipts and disabled source before destination access', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures();
  await store(source).create(command, catalog, at); const calls = source.calls;
  const other = new StagingOperationalOrderStore(target, operationalEnvironment, 'demo-TEST-other');
  await assert.rejects(store(source).handoff(command.commandId, other, handoffOptions), /TENANT/); assert.equal(source.calls, calls); assert.equal(target.calls, 0);
  await assert.rejects(store(source).handoff('demo-TEST-missing', operational(target), handoffOptions), /NOT_FOUND/); assert.equal(target.calls, 0);
  const disabled = store(source); disabled.disable();
  await assert.rejects(disabled.handoff(command.commandId, operational(target), handoffOptions), /DISABLED/); assert.equal(target.calls, 0);
  await assert.rejects(store(source).handoff(command.commandId, operational(target), { ...handoffOptions, actor: 'real-actor' }), /HANDOFF/); assert.equal(target.calls, 0);
});

test('ambiguous card payment requires an explicit debit or credit choice without changing the reviewed price', async () => {
  for (const cardMethod of ['DEBITO', 'CREDITO'] as const) {
    const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures(); command.paymentMethod = 'Cartão';
    await store(source).create(command, catalog, at);
    await assert.rejects(store(source).handoff(command.commandId, operational(target), handoffOptions), /CARD_METHOD_REQUIRED/); assert.equal(target.calls, 0);
    const result = await store(source).handoff(command.commandId, operational(target), { ...handoffOptions, cardMethod });
    assert.equal(result.snapshot?.method, cardMethod); assert.equal(result.snapshot?.totalCents, 2000); assert.equal(result.snapshot?.paymentState, 'PENDING');
    await assert.rejects(store(source).handoff(command.commandId, operational(target), { ...handoffOptions, cardMethod: cardMethod === 'DEBITO' ? 'CREDITO' : 'DEBITO' }), /IDEMPOTENCY/);
  }
});

test('provider and checkout provenance cannot be silently rewritten in an operational draft', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures();
  command.origin = 'CONVERSATION'; command.conversationId = 'demo-TEST-conversation'; command.conversationContext = { channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL' };
  await store(source).create(command, catalog, at); const result = await store(source).handoff(command.commandId, operational(target), handoffOptions), id = result.snapshot!.canonical.id;
  for (const field of ['provider', 'checkout'] as const) {
    const snapshot = (await operational(target).get(id))!;
    if (field === 'provider') snapshot.canonical.provider = 'WHATSAPP_EVOLUTION_OPTIONAL'; else snapshot.checkout!.catalogRevision = 'demo-TEST-other';
    await assert.rejects(operational(target).execute(operation(id, 1, { kind: 'UPDATE', snapshot }, 'rewrite-' + field)), /IMMUTABLE_CONTEXT/);
  }
  const snapshot = (await operational(target).get(id))!, receipt = snapshot.checkout!;
  snapshot.checkout = { restaurant: receipt.restaurant, catalogRevision: receipt.catalogRevision, menuId: receipt.menuId, commandId: receipt.commandId };
  await operational(target).execute(operation(id, 1, { kind: 'UPDATE', snapshot }, 'reordered-fields'));
});

test('corrupted or incomplete checkout receipts fail closed without overwriting destination data', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = detailedFixtures(); await store(source).create(command, catalog, at); const good = source.value!;
  for (const mutate of [
    (state: any) => { state.commands[0].snapshot.legacy.total = 1; },
    (state: any) => { state.commands[0].snapshot.legacy.id = 'demo-TEST-injected'; },
    (state: any) => { delete state.commands[0].snapshot.catalogRevision; },
    (state: any) => { state.commands[0].snapshot.legacy.clientId = 'demo-TEST-injected'; },
    (state: any) => { state.commands.push(structuredClone(state.commands[0])); },
  ]) {
    const state = JSON.parse(good); mutate(state); source.value = JSON.stringify(state); const before = source.value;
    await assert.rejects(store(source).handoff(command.commandId, operational(target), handoffOptions));
    assert.equal(source.value, before); assert.equal(target.calls, 0); assert.equal(target.value, undefined);
  }
});

test('rollback fences old handoff retries and a different origin never merges orders of one client', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures(); await store(source).create(command, catalog, at);
  const first = await store(source).handoff(command.commandId, operational(target), handoffOptions), id = first.snapshot!.canonical.id;
  const other: PilotCheckoutCommand = { ...command, commandId: 'demo-TEST-rcs', idempotencyKey: 'demo-TEST-rcs', origin: 'CONVERSATION', conversationId: 'demo-TEST-conversation', conversationContext: { channel: 'RCS', provider: 'RCS_GOOGLE' } };
  await store(source).create(other, catalog, at); await store(source).handoff(other.commandId, operational(target), handoffOptions);
  const both = await operational(target).snapshot(); assert.equal(both.records.length, 2); assert.equal(new Set(both.records.map(s => s.canonical.contactId)).size, 1);
  await operational(target).execute(operation(id, 1, { kind: 'ROLLBACK_TEST' }, 'rollback'));
  await assert.rejects(store(source).handoff(command.commandId, operational(target), handoffOptions), /ROLLED_BACK/);
  assert.equal((await operational(target).snapshot()).records.length, 1);
});

test('repeated products keep separate line identities and a zero-priced option is never replaced by base price', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures();
  catalog.products[0].tamanhos.push({ label: 'TEST zero', price: 0 });
  command.lines.push({ ...command.lines[0], size: 'TEST zero', quantity: 2, observation: 'TEST Second line' });
  await store(source).create(command, catalog, at);
  const result = await store(source).handoff(command.commandId, operational(target), handoffOptions), items = result.snapshot!.items;
  assert.equal(items.length, 2); assert.equal(new Set(items.map(i => i.id)).size, 2); assert.equal(new Set(items.map(i => i.productId)).size, 1);
  assert.equal(items[1].unitCents, 0); assert.equal(items[1].subtotalCents, 0); assert.equal(items[1].quantity, 2); assert.equal(result.snapshot!.totalCents, 2000);
});

test('zero-total checkout remains blocked by the existing order rule without inventing a charge', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures(); catalog.products[0].tamanhos[0].price = 0;
  const reviewed = await store(source).create(command, catalog, at); assert.equal(reviewed.snapshot.legacy.total, 0);
  const before = source.value;
  await assert.rejects(store(source).handoff(command.commandId, operational(target), handoffOptions), /ORDER_RECEIPT_INVALID/);
  assert.equal(target.calls, 0); assert.equal(target.value, undefined); assert.equal(source.value, before);
});

test('handoff snapshots caller options and observes disabling while awaiting the receipt', async () => {
  const source = new FixtureAtomic(), target = new FixtureAtomic(), { command, catalog } = fixtures(); await store(source).create(command, catalog, at);
  const options = { ...handoffOptions };
  const pending = store(source).handoff(command.commandId, operational(target), options); options.actor = 'demo-TEST-mutated'; await pending;
  assert.equal((await operational(target).snapshot()).audit[0].actor, handoffOptions.actor);
  const instance = store(source), calls = target.calls;
  const blocked = instance.handoff(command.commandId, operational(target), handoffOptions); instance.disable();
  await assert.rejects(blocked, /DISABLED/); assert.equal(target.calls, calls);
});
