import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { ProductionCommandRecovery, ProductionCommandRejected } from './productionCommandRecovery';
import { renderProductionOrderPrint } from './productionOrderPrint';
import { renderPrintSnapshot } from './operationsFinance';
import { renderThermalDocument } from './thermalPrint';
import type { OperationalCommand, OperationalSnapshot } from './productionOrders';

const context = { actor: 'operator-local', tenantId: 'prato-mineiro' };
const command = (id = 'command-1'): OperationalCommand => ({ ...context, commandId: id, idempotencyKey: id, orderId: 'order-local', expectedRevision: 1, at: '2026-10-26T12:00:00.000Z', operation: { kind: 'CONFIRM' } });
const reply = { revision: 2, replay: false };

test('synchronous lock rejects double clicks and retry while awaiting the first response', async () => {
  let complete!: (value: typeof reply) => void;
  let calls = 0;
  const recovery = new ProductionCommandRecovery(() => { calls++; return new Promise(resolve => { complete = resolve; }); }, () => context);
  const first = recovery.submit(command());
  assert.equal(recovery.busy, true);
  await assert.rejects(recovery.submit(command('command-2')), /PRODUCTION_COMMAND_PENDING/);
  await assert.rejects(recovery.retry(), /PRODUCTION_COMMAND_PENDING/);
  complete(reply); await first;
  assert.equal(calls, 1); assert.equal(recovery.blocked, false);
});

test('lost response retains exact cloned command; another order/action cannot replace it', async () => {
  const sent: OperationalCommand[] = [];
  const recovery = new ProductionCommandRecovery(async c => {
    sent.push(structuredClone(c)); c.at = 'mutated-by-transport';
    if (sent.length === 1) throw new Error('response lost');
    return { ...reply, replay: true };
  }, () => context);
  const original = command(); const saved = structuredClone(original);
  await assert.rejects(recovery.submit(original), /response lost/);
  original.operation = { kind: 'CANCEL' };
  const exposed = recovery.pending!; exposed.actor = 'another-actor';
  await assert.rejects(recovery.submit({ ...command('command-2'), orderId: 'other-order' }), /PRODUCTION_COMMAND_PENDING/);
  assert.deepEqual(recovery.pending, saved);
  await recovery.retry(); assert.deepEqual(sent, [saved, saved]); assert.equal(recovery.pending, null);
});

test('only a typed definitive rejection releases pending state, not error text', async () => {
  let definitive = false;
  const recovery = new ProductionCommandRecovery(async () => { throw definitive ? new ProductionCommandRejected('ORDER_REVISION_CONFLICT') : new Error('ORDER_REVISION_CONFLICT'); }, () => context);
  await assert.rejects(recovery.submit(command())); assert.ok(recovery.pending);
  definitive = true; await assert.rejects(recovery.retry()); assert.equal(recovery.pending, null);
  await assert.rejects(recovery.submit(command('command-2')), /ORDER_REVISION_CONFLICT/);
  assert.equal(recovery.pending, null);
});

test('actor or tenant change never reroutes pending work or accepts a late response', async () => {
  let active = { ...context }; let calls = 0;
  const recovery = new ProductionCommandRecovery(async () => { calls++; if (calls === 1) throw new Error('network'); return reply; }, () => active);
  await assert.rejects(recovery.submit(command()));
  active = { ...context, actor: 'other-operator' }; await assert.rejects(recovery.retry(), /CONTEXT_CHANGED/);
  active = { ...context, tenantId: 'other-tenant' }; await assert.rejects(recovery.retry(), /CONTEXT_CHANGED/);
  assert.equal(calls, 1); active = context; await recovery.retry(); assert.equal(calls, 2);
  const late = new ProductionCommandRecovery(async () => { active = { ...context, actor: 'other-operator' }; return reply; }, () => active);
  await assert.rejects(late.submit(command()), /CONTEXT_CHANGED/); assert.ok(late.pending);
});

test('malformed acknowledgement keeps recovery available and malformed commands never execute', async () => {
  let calls = 0;
  const recovery = new ProductionCommandRecovery(async () => { calls++; return { revision: 99, replay: true }; }, () => context);
  await assert.rejects(recovery.submit({ ...command(), at: 'bad' })); assert.equal(calls, 0);
  await assert.rejects(recovery.submit(command()), /REPLY_INVALID/); assert.ok(recovery.pending);
});

test('screen subscriptions may detach and reattach without discarding the original pending work', async () => {
  let complete!: (value: typeof reply) => void;
  const recovery = new ProductionCommandRecovery(() => new Promise(resolve => { complete = resolve; }), () => context);
  let oldCalls = 0, newCalls = 0;
  const detach = recovery.subscribe(() => { oldCalls++; });
  const first = recovery.submit(command()); detach();
  assert.ok(recovery.pending);
  recovery.subscribe(() => { newCalls++; });
  complete(reply); await first;
  assert.equal(oldCalls, 1); assert.equal(newCalls, 1); assert.equal(recovery.blocked, false);
});

function order(): OperationalSnapshot {
  const at = new Date('2026-10-26T12:00:00.000Z');
  return { schema: 1, mode: 'PRODUCTION', revision: 1,
    canonical: { id: 'order-local-complete-id', tenantId: context.tenantId, contactId: 'client-local', entryPoint: 'POS', channel: 'NONE', creationMode: 'HUMAN_OPERATOR', total: 53, paymentMethod: 'PIX', status: 'CREATED', createdAt: at, updatedAt: at },
    customer: { id: 'client-local', name: 'Cliente <script>alert(1)</script>' }, conversation: null, modality: 'DELIVERY',
    items: [{ id: 'line-1', productId: 'product-1', name: 'Refeição', size: 'M', unitCents: 2000, quantity: 2, addons: [{ id: 'addon-1', name: 'Queijo & molho', unitCents: 200 }], utensils: [{ id: 'utensil-1', name: 'Talher', unitCents: 100 }], removed: ['Cebola'], observation: 'Sem sal', subtotalCents: 4600 }],
    subtotalCents: 4600, feeCents: 800, discountCents: 100, totalCents: 5300,
    address: { street: 'Rua das Flores', number: '12', district: 'Centro', city: 'Sacramento', zip: '38190-000', complement: 'Portão azul' }, table: null, legacyRefs: [], method: 'PIX', orderState: 'DRAFT', paymentState: 'PENDING', receivedCents: 0, productionState: 'WAITING', deliveryState: 'NOT_APPLICABLE', courierId: null, notaState: 'NOT_REQUESTED' };
}

test('production document preserves full identity, options, destination, totals and pending states without mutation', () => {
  const source = order(); const before = structuredClone(source);
  const html = renderProductionOrderPrint(source);
  for (const text of ['order-local-complete-id', 'Revisão: 1', 'Queijo &amp; molho', 'Talher', 'Retirar: Cebola', 'Sem sal', 'Rua das Flores, 12', 'Sacramento', 'Portão azul', '38190-000', 'Pagamento: Pendente', 'NÃO PRODUZIR', '53,00', '46,00', '8,00', '1,00']) assert.ok(html.includes(text), text);
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>|DEMO|SIMULAÇÃO/);
  assert.match(html, /@page\{size:80mm/); assert.deepEqual(source, before);
});

test('production paper widths, table and pickup retain their actual fulfillment context', () => {
  const source = order(); source.modality = 'TABLE'; source.address = null; source.table = 'Mesa 7';
  const html = renderProductionOrderPrint(source, 58);
  assert.match(html, /Mesa: Mesa 7/); assert.match(html, /size:58mm/); assert.match(html, /max-width:52mm/); assert.doesNotMatch(html, /Endereço:/);
  source.modality = 'PICKUP'; source.table = null;
  assert.match(renderProductionOrderPrint(source), /Modalidade: Retirada/);
  assert.throws(() => renderProductionOrderPrint(source, 100 as 80));
});

test('reprinting reflects current payment/revision and never infers payment from delivery', () => {
  const source = order(); source.orderState = 'CONFIRMED'; source.productionState = 'READY'; source.deliveryState = 'DELIVERED'; source.courierId = 'courier-1'; source.revision = 7;
  assert.match(renderProductionOrderPrint(source), /Pagamento: Pendente/);
  source.paymentState = 'RECEIVED'; source.receivedCents = source.totalCents; source.canonical.status = 'PAID'; source.revision = 8;
  const before = structuredClone(source); const html = renderProductionOrderPrint(source);
  assert.match(html, /Pagamento: Recebido/); assert.match(html, /Revisão: 8/); assert.deepEqual(source, before);
});

test('shared thermal layout preserves simulation markings and refuses mode/invalid snapshot promotion', () => {
  const html = renderPrintSnapshot({ version: 1, mode: 'SIMULATION', kind: 'PEDIDO', reference: '<test>', lines: ['<img src=x>'] });
  assert.match(html, /DEMO/); assert.match(html, /SIMULAÇÃO/); assert.match(html, /&lt;img src=x&gt;/);
  assert.throws(() => renderPrintSnapshot({ version: 1, mode: 'PRODUCTION', kind: 'PEDIDO', reference: 'id', lines: [] } as never));
  assert.throws(() => renderProductionOrderPrint({ ...order(), mode: 'SIMULATION' } as never));
  assert.throws(() => renderThermalDocument({ mode: 'LIVE', title: 'Pedido', reference: 'id', lines: [] } as never));
});

const source = readFileSync('src/components/ProductionOperations.tsx', 'utf8');
const tree = ts.createSourceFile('ProductionOperations.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ProductionOperations') as ts.FunctionDeclaration;
const transpile = (text: string) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

test('actual screen callbacks keep first retry when another action is attempted, then replay it', async () => {
  let pending: OperationalCommand | null = null, sequence = 0; const sent: OperationalCommand[] = [];
  const recovery = new ProductionCommandRecovery(async c => { sent.push(c); if (sent.length === 1) throw new Error('response lost'); return { ...reply, replay: true }; }, () => context);
  const names = ['setBusy', 'setError', 'setNotice', 'setRetry', 'setSelected', 'setCreating', 'setLines', 'setFinancialAmount', 'setEvidence'];
  const statements = component.body!.statements.filter(n => ts.isFunctionDeclaration(n) && ['run', 'cmd', 'action'].includes(n.name?.text ?? ''));
  const factory = new Function(...names, 'recovery', 'mounted', 'cashInFlight', 'explain', 'uuid', 'operator', 'PRODUCTION_TENANT', 'current', transpile(statements.map(n => n.getText(tree)).join('\n')) + '\nreturn {run,action};');
  const api = factory(...names.map(n => n === 'setRetry' ? (value: OperationalCommand | null) => { pending = value; } : () => {}), { current: recovery }, { current: true }, { current: false }, String, () => `command-${++sequence}`, () => context.actor, context.tenantId, { canonical: { id: 'order-local' }, revision: 1 });
  api.action({ kind: 'CONFIRM' }); await new Promise(resolve => setImmediate(resolve));
  api.action({ kind: 'CANCEL' }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 1); assert.equal((pending as OperationalCommand | null)?.commandId, 'command-1');
  await api.run(pending, true); assert.deepEqual(sent[0], sent[1]); assert.equal(pending, null);
});

test('actual print callback uses complete document and does not execute an order command', () => {
  let handler: ts.ArrowFunction | undefined;
  const visit = (n: ts.Node) => { if (ts.isJsxAttribute(n) && n.name.getText(tree) === 'onClick' && n.initializer && ts.isJsxExpression(n.initializer)) { const e = n.initializer.expression; if (e && ts.isArrowFunction(e) && e.getText(tree).includes('win.print()')) handler = e; } ts.forEachChild(n, visit); };
  visit(component); assert.ok(handler);
  let html = '', calls = 0;
  const fakeWindow = { open: () => ({ document: { write: (value: string) => { html = value; }, close() {} }, focus() {}, print() { calls++; } }) };
  const factory = new Function('window', 'current', 'operator', 'renderProductionOrderPrint', 'setError', 'explain', transpile('const handler = ' + handler.getText(tree) + ';') + '\nreturn handler;');
  factory(fakeWindow, order(), () => context.actor, renderProductionOrderPrint, (error: string) => { throw Error(error); }, String)();
  assert.equal(calls, 1); assert.match(html, /Queijo &amp; molho/); assert.match(html, /Portão azul/); assert.match(html, /size:80mm/);
});
