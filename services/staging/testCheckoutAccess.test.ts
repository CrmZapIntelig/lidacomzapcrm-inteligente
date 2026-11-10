import test from 'node:test';
import assert from 'node:assert/strict';
import type { AtomicJsonPort } from './durableInboundJournal';
import { PilotCheckoutTestStore } from './pilotCheckoutStore';
import { StagingOperationalOrderStore } from './operationalOrderStore';
import { TestOrderAccessService } from './testOrderAccessService';
import type { TestCheckoutBinding, VerifiedTestOrderPrincipal } from './testOrderAccessService';
import type { PilotCatalog, PilotCheckoutCommand } from '../../src/application/pilotMenuCheckout';
import type { TestCheckoutImportRequest } from '../../src/application/testOrderAccess';

const tenant = 'demo-TEST-import', at = '2026-10-18T00:00:00.000Z', time = Date.parse(at);
const environment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', operationalOrderWrites: 'TEST_ONLY' as const };
const checkoutEnvironment = { appEnv: 'staging', projectId: 'lidacomzapcrm-staging', pilotOrderWrites: 'TEST_ONLY' as const };
const grant = (): VerifiedTestOrderPrincipal => ({ mode: 'TEST', tenantId: tenant, actorId: 'demo-TEST-importer', expiresAt: time + 60000, capabilities: ['orders.read', 'orders.checkout.import', 'orders.confirm'] });
class MemoryPort implements AtomicJsonPort {
  value?: string; calls = 0; loseAck = false; before?: () => Promise<void>;
  private tail: Promise<unknown> = Promise.resolve();
  transaction<T>(update: (raw: string | undefined) => { value: string; result: T }): Promise<T> {
    const result = this.tail.then(async () => {
      this.calls++; await this.before?.(); const next = update(this.value); this.value = next.value;
      if (this.loseAck) { this.loseAck = false; throw new Error('ACK_LOST'); }
      return structuredClone(next.result);
    });
    this.tail = result.catch(() => undefined); return result;
  }
}
function fixture() {
  const catalog: PilotCatalog = { revision: 'demo-TEST-v1', deliveryFeeCents: 700, menu: { id: 'demo-TEST-menu', name: 'TEST Menu', description: 'TEST', imageBanner: '', availableHours: 'TEST', active: true, productIds: ['demo-TEST-product'], createdAt: at }, products: [{ id: 'demo-TEST-product', name: 'TEST Refeicao', description: 'TEST', image: '', category: 'TEST', price: 10, tamanhos: [{ label: 'TEST M', price: 20 }], adicionais: [], naoMandar: [], utensilios: [] }] };
  const command: PilotCheckoutCommand = { commandId: 'demo-TEST-command', idempotencyKey: 'demo-TEST-checkout', menuId: catalog.menu.id, catalogRevision: catalog.revision, origin: 'PUBLIC_MENU', conversationId: null, customer: { name: 'Cliente TEST Exemplo', identity: 'TEST-customer' }, modality: 'PICKUP', paymentMethod: 'Pix', address: null, lines: [{ productId: 'demo-TEST-product', size: 'TEST M', addonIds: [], removed: [], utensilIds: [], quantity: 1, observation: 'TEST' }] };
  return { catalog, command };
}
async function setup(change?: (command: PilotCheckoutCommand) => void) {
  const source = new MemoryPort(), target = new MemoryPort(), { command, catalog } = fixture(); change?.(command);
  const checkout = new PilotCheckoutTestStore(source, checkoutEnvironment, tenant);
  const receipt = await checkout.create(command, catalog, at); source.calls = 0;
  const state = { principal: grant() as VerifiedTestOrderPrincipal | null, now: time, resolutions: 0 };
  const binding: TestCheckoutBinding = { port: source, environment: { ...checkoutEnvironment }, creationMode: 'CUSTOMER' };
  const service = new TestOrderAccessService(target, environment, tenant, async () => { state.resolutions++; return state.principal; }, () => state.now, binding);
  const store = new StagingOperationalOrderStore(target, environment, tenant);
  const request = { checkoutCommandId: command.commandId };
  return { source, target, checkout, store, service, state, binding, receipt, command, catalog, request };
}

test('checkout import requires explicit read and import grants before either aggregate is accessed', async () => {
  for (const principal of [null, { ...grant(), capabilities: ['orders.read'] }, { ...grant(), capabilities: ['orders.checkout.import'] }, { ...grant(), tenantId: 'demo-TEST-other' }, { ...grant(), expiresAt: time }, { ...grant(), role: 'administrador' }]) {
    const s = await setup(); s.state.principal = principal as VerifiedTestOrderPrincipal;
    await assert.rejects(s.service.importCheckout(s.request), /ORDER_ACCESS_(DENIED|EXPIRED)/);
    assert.equal(s.source.calls, 0); assert.equal(s.target.calls, 0);
  }
});

test('unconfigured, disabled, operational and shared-port checkout bindings fail closed without IO', async () => {
  const source = new MemoryPort(), target = new MemoryPort(); let resolutions = 0;
  const resolver = async () => { resolutions++; return grant(); };
  const service = new TestOrderAccessService(target, environment, tenant, resolver, () => time);
  await assert.rejects(service.importCheckout({ checkoutCommandId: 'demo-TEST-command' }), /CHECKOUT_DISABLED/);
  for (const env of [{ ...checkoutEnvironment, projectId: 'project-1300957a-ea82-4645-845' }, { ...checkoutEnvironment, appEnv: 'production' }, { ...checkoutEnvironment, pilotOrderWrites: 'DISABLED' as const }]) {
    assert.throws(() => new TestOrderAccessService(target, environment, tenant, resolver, () => time, { port: source, environment: env, creationMode: 'CUSTOMER' }), /PILOT_ORDER_WRITES_DISABLED/);
  }
  assert.throws(() => new TestOrderAccessService(target, environment, tenant, resolver, () => time, { port: target, environment: checkoutEnvironment, creationMode: 'CUSTOMER' }), /PORT_INVALID/);
  const s = await setup(); s.service.disable(); await assert.rejects(s.service.importCheckout(s.request), /ACCESS_DISABLED/);
  assert.equal(resolutions, 0); assert.equal(source.calls + target.calls + s.source.calls + s.target.calls, 0);
});

test('browser cannot supply actor, tenant, origin, prices, identity, creation mode or privileges', async () => {
  const s = await setup();
  for (const extra of [{ actor: 'demo-TEST-other' }, { tenantId: tenant }, { creationMode: 'AUTOMATION' }, { snapshot: s.receipt.snapshot }, { orderId: 'demo-TEST-forged' }, { totalCents: 1 }, { origin: 'CONVERSATION' }, { capabilities: ['orders.checkout.import'] }, { cardMethod: 'PIX' }]) {
    await assert.rejects(s.service.importCheckout({ ...s.request, ...extra } as TestCheckoutImportRequest), /REQUEST_INVALID/);
  }
  for (const input of [null, [], {}, { checkoutCommandId: 'real-order' }]) await assert.rejects(s.service.importCheckout(input as TestCheckoutImportRequest), /REQUEST_INVALID/);
  assert.equal(s.source.calls + s.target.calls, 0);
});

test('authorized import preserves receipt identity and price, records trusted actor and keeps independent states', async () => {
  const s = await setup(), sourceBefore = s.source.value;
  const result = await s.service.importCheckout(s.request), state = await s.store.snapshot();
  assert.equal(result.current.id, s.receipt.snapshot.legacy.id); assert.equal(result.current.totalCents, 2000);
  assert.equal(result.current.orderState, 'DRAFT'); assert.equal(result.current.paymentState, 'PENDING');
  assert.equal(result.current.productionState, 'WAITING'); assert.equal(result.current.receivedCents, 0);
  assert.equal(state.records[0].canonical.contactId, s.receipt.snapshot.legacy.clientId);
  assert.equal(state.records[0].canonical.creationMode, 'CUSTOMER'); assert.equal(state.audit[0].actor, grant().actorId);
  assert.equal(state.events.length, 1); assert.equal(state.cash.totalSalesCents, 0); assert.equal(s.source.value, sourceBefore);
  assert.equal(result.current.actions.includes('CONFIRM'), true);
});

test('concurrent imports and lost acknowledgements recover once and replay returns current operational state', async () => {
  const s = await setup(), before = s.source.value;
  s.target.loseAck = true; await assert.rejects(s.service.importCheckout(s.request), /ACK_LOST/);
  const recovered = await Promise.all([s.service.importCheckout(s.request), s.service.importCheckout(s.request)]);
  assert.ok(recovered.every(r => r.replay)); const id = recovered[0].current.id;
  await s.service.execute({ commandId: 'demo-TEST-confirm', idempotencyKey: 'demo-TEST-confirm', orderId: id, expectedRevision: 1, at, operation: { kind: 'CONFIRM' } });
  const replay = await s.service.importCheckout(s.request);
  assert.equal(replay.appliedRevision, 1); assert.equal(replay.current.revision, 2); assert.equal(replay.current.orderState, 'CONFIRMED');
  const state = await s.store.snapshot(); assert.equal(state.records.length, 1); assert.equal(state.audit.length, 2);
  assert.equal(state.events.filter(e => e.fact === 'SALE').length, 1); assert.equal(s.source.value, before);
});

test('expiry or disabling while source or destination waits prevents destination mutation', async () => {
  for (const location of ['source', 'target'] as const) for (const reason of ['expiry', 'disable']) {
    const s = await setup(), before = s.source.value; let release!: () => void;
    s[location].before = () => new Promise<void>(resolve => { release = resolve; });
    const pending = s.service.importCheckout(s.request);
    while (!release) await new Promise(resolve => setImmediate(resolve));
    if (reason === 'expiry') s.state.now += 60000; else s.service.disable();
    release(); await assert.rejects(pending, /ORDER_ACCESS_(EXPIRED|DISABLED)/);
    assert.equal(s.target.value, undefined); assert.equal(s.source.value, before);
  }
});

test('input and trusted workflow configuration are snapshotted before asynchronous IO', async () => {
  const s = await setup(); let release!: () => void;
  s.source.before = () => new Promise<void>(resolve => { release = resolve; });
  const pending = s.service.importCheckout(s.request);
  s.request.checkoutCommandId = 'demo-TEST-mutated'; s.binding.creationMode = 'AUTOMATION'; s.binding.environment.appEnv = 'production';
  while (!release) await new Promise(resolve => setImmediate(resolve));
  s.state.principal!.actorId = 'demo-TEST-impostor'; s.state.principal!.capabilities = [];
  s.source.before = undefined; release(); const result = await pending;
  assert.equal(result.actorId, 'demo-TEST-importer'); assert.equal((await s.store.snapshot()).records[0].canonical.creationMode, 'CUSTOMER');
});

test('revocation and a different actor cannot reuse another actors import command', async () => {
  const s = await setup(); await s.service.importCheckout(s.request); const before = s.target.value;
  s.state.principal = null; const calls = s.source.calls + s.target.calls;
  await assert.rejects(s.service.importCheckout(s.request), /ACCESS_DENIED/); assert.equal(s.source.calls + s.target.calls, calls);
  s.state.principal = { ...grant(), actorId: 'demo-TEST-other' };
  await assert.rejects(s.service.importCheckout(s.request), /IDEMPOTENCY_CONFLICT/); assert.equal(s.target.value, before);
});

test('missing or foreign receipts fail without touching the destination', async () => {
  const s = await setup();
  await assert.rejects(s.service.importCheckout({ checkoutCommandId: 'demo-TEST-missing' }), /NOT_FOUND/);
  const state = JSON.parse(s.source.value!); state.tenant = 'demo-TEST-other'; s.source.value = JSON.stringify(state);
  await assert.rejects(s.service.importCheckout(s.request), /CONTEXT_MISMATCH/); assert.equal(s.target.calls, 0);
});

test('separate checkouts by the same customer stay separate across all channel providers', async () => {
  const s = await setup(); await s.service.importCheckout(s.request);
  for (const [index, context] of [
    { channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL' },
    { channel: 'WHATSAPP', provider: 'WHATSAPP_EVOLUTION_OPTIONAL' },
    { channel: 'RCS', provider: 'RCS_GOOGLE' },
  ].entries()) {
    const command = { ...s.command, commandId: `demo-TEST-channel-${index}`, idempotencyKey: `demo-TEST-channel-${index}`, origin: 'CONVERSATION', conversationId: 'demo-TEST-conversation', conversationContext: context } as PilotCheckoutCommand;
    await s.checkout.create(command, s.catalog, at);
    const result = await s.service.importCheckout({ checkoutCommandId: command.commandId });
    assert.equal(result.current.channel, context.channel); assert.equal(result.current.provider, context.provider);
  }
  const state = await s.store.snapshot(); assert.equal(state.records.length, 4);
  assert.equal(new Set(state.records.map(r => r.canonical.id)).size, 4); assert.equal(new Set(state.records.map(r => r.canonical.contactId)).size, 1);
});

test('card selection is explicit, immutable on retry and cannot imply payment receipt', async () => {
  const s = await setup(command => { command.paymentMethod = 'Cartão'; });
  await assert.rejects(s.service.importCheckout(s.request), /CARD_METHOD_REQUIRED/); assert.equal(s.target.calls, 0);
  const result = await s.service.importCheckout({ ...s.request, cardMethod: 'DEBITO' });
  assert.equal(result.current.method, 'DEBITO'); assert.equal(result.current.paymentState, 'PENDING');
  await assert.rejects(s.service.importCheckout({ ...s.request, cardMethod: 'CREDITO' }), /IDEMPOTENCY_CONFLICT/);
  assert.equal((await s.store.snapshot()).records.length, 1);
});
