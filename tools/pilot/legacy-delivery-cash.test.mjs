import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual App callbacks with in-memory ports. Importing App would start Firebase.
const source = ts.createSourceFile('App.tsx', readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, bindings) {
  const matches = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) matches.push(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(matches.length, 1, `Expected one App callback: ${name}`);
  const javascript = ts.transpileModule(`globalThis.subject = ${matches[0].getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const context = createContext({ ...bindings, console: { log() {}, error() {}, warn() {} } });
  new Script(javascript, { filename: `App.${name}.js` }).runInContext(context);
  return context.subject;
}
function harness(initial = []) {
  let deliveryOrders = structuredClone(initial), orders = [], histories = [];
  const writes = [], cashier = [];
  const bindings = {
    db: {}, clients: [],
    doc(_db, collection, id) { return { collection, id }; },
    async setDoc(target, value) { writes.push({ ...target, value: structuredClone(value) }); },
    setDeliveryOrders(updater) { deliveryOrders = typeof updater === 'function' ? updater(deliveryOrders) : updater; },
    setOrders(updater) { orders = updater(orders); },
    setDeliveryHistories(updater) { histories = updater(histories); },
    handleRegisterPaidOrderInCashier(order) { cashier.push(structuredClone(order)); },
  };
  return { update: callback('handleUpdateDeliveryOrders', bindings), bill: callback('handleSaveOrderCreated', bindings), writes, cashier,
    get deliveryOrders() { return deliveryOrders; }, get histories() { return histories; }, get orders() { return orders; } };
}
const delivery = (paymentMethod, status = 'EM ENTREGA') => ({ id: 'demo-TEST-delivery', clientId: 'demo-TEST-client', clientName: 'Cliente TEST', total: 48.5, paymentMethod, status });

for (const method of ['Pix', 'Cartão', 'Dinheiro']) test(`closing ${method} delivery preserves status/history without treating payment method as receipt`, async () => {
  const h = harness([delivery(method)]);
  await h.update(previous => previous.map(order => ({ ...order, status: 'FECHADO' })));
  assert.equal(h.deliveryOrders[0].status, 'FECHADO');
  assert.ok(h.writes.some(w => w.collection === 'deliveryOrders' && w.id === 'demo-TEST-delivery' && w.value.status === 'FECHADO'));
  assert.equal(h.histories.length, 1); assert.equal(h.histories[0].newStatus, 'FECHADO');
  assert.equal(h.cashier.length, 0, 'Delivery completion has no payment evidence');
  await h.update(previous => previous.map(order => ({ ...order })));
  assert.equal(h.cashier.length, 0); assert.equal(h.histories.length, 1);
});

test('loading an already closed delivery cannot manufacture a receipt', async () => {
  const h = harness(); await h.update([delivery('Pix', 'FECHADO')]);
  assert.equal(h.deliveryOrders.length, 1); assert.equal(h.cashier.length, 0); assert.equal(h.histories.length, 0);
});

test('production transition still persists and records history without a receipt', async () => {
  const h = harness([delivery('Pix', 'PEDIDO GERADO')]);
  await h.update(previous => previous.map(order => ({ ...order, status: 'PRODUÇÃO' })));
  assert.equal(h.deliveryOrders[0].status, 'PRODUÇÃO'); assert.equal(h.histories[0].previousStatus, 'PEDIDO GERADO'); assert.equal(h.cashier.length, 0);
});

test('explicitly paid billing order keeps its existing cashier registration; pending order does not', async () => {
  const h = harness();
  await h.bill({ id: 'demo-TEST-pending', clientId: 'demo-TEST-client', total: 48.5, status: 'Pendente', paymentMethod: 'Pix' });
  assert.equal(h.cashier.length, 0);
  await h.bill({ id: 'demo-TEST-paid', clientId: 'demo-TEST-client', total: 48.5, status: 'Pago', paymentMethod: 'Pix' });
  assert.equal(h.cashier.length, 1); assert.equal(h.cashier[0].id, 'demo-TEST-paid'); assert.equal(h.cashier[0].source, 'order');
  assert.equal(h.orders.length, 2); assert.equal(h.writes.filter(w => w.collection === 'orders').length, 2);
});
