import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { testOrderRow, testOrderCapabilities } from '../application/testOrderAccess';
import { createOrderFixture } from '../../services/staging/operationalOrderFixture';
import { TestOrderTable } from '../components/TestOrdersView';
import OrdersView from '../components/OrdersView';
import { projectTestConsumers } from '../application/operationalOrderProjections';
test('TEST table displays independent states and escapes customer/item text', () => {
  const row = testOrderRow(createOrderFixture('demo-TEST-ui'), testOrderCapabilities); row.deliveryState = 'DELIVERED'; row.orderState = 'CONFIRMED'; row.customerName = '<script>alert(1)</script>'; row.items[0].name = '<img src=x>'; row.actions = []; row.canPrint = false;
  const html = renderToStaticMarkup(React.createElement(TestOrderTable, { orders: [row], locked: false, onConfirm() {}, onProduction() {}, onPrint() {} }));
  assert.match(html, /Entregue/); assert.match(html, /Pendente/); assert.match(html, /Somente consulta/); assert.doesNotMatch(html, /<script>|<img|Confirmar pedido TEST|Ver documento/);
  assert.match(html, /&lt;script&gt;/);
});
test('actual CRM keeps its legacy table when no TEST transport is explicitly injected', () => {
  const snapshot = createOrderFixture('demo-TEST-ui'); const order = projectTestConsumers(snapshot).legacyOrder!;
  const html = renderToStaticMarkup(React.createElement(OrdersView, { orders: [order] }));
  assert.match(html, /Relatório Geral de Pedidos/); assert.match(html, /demo-TEST-order/); assert.match(html, /PENDENTE/); assert.doesNotMatch(html, /Confirmar pedido TEST|Pedidos de teste/);
});
