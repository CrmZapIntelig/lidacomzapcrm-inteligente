import test from 'node:test';
import assert from 'node:assert/strict';
import type { AtomicJsonPort } from './durableInboundJournal';
import { PilotCheckoutTestStore } from './pilotCheckoutStore';
import { pilotOrderPrint } from '../../src/application/pilotMenuCheckout';
import { renderPrintSnapshot } from '../../src/application/operationsFinance';
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
