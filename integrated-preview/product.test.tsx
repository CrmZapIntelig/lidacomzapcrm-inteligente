import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductPreview } from './ProductPreview';
import { modules, selectModule, capabilities, safety, contacts, identities, initialSession, prepareSession, sessionBudget, legacyOrder, legacyDelivery, canonicalOrder, canonicalDelivery } from './model';
const render = (id: typeof modules[number][0]) => renderToStaticMarkup(<ProductPreview initialModule={id}/>);
test('all module navigation targets render the safety banner and correct title; unknown route stays put', () => {
  assert.equal(modules.length, 19);
  for (const [id, title] of modules) {
    assert.equal(selectModule('dashboard', id), id);
    const markup = render(id);
    assert.ok(markup.includes(`<h1>${id === 'dashboard' ? 'LidacomZapCRM' : title}</h1>`), id);
    assert.match(markup, /PREVIEW INTEGRADO — DADOS SINTÉTICOS/);
    assert.match(markup, /MODE: OFFLINE PREVIEW/);
    assert.ok(!/<button[^>]*>Enviar/.test(markup));
  }
  assert.equal(selectModule('pedidos', 'invalid'), 'pedidos');
});
test('dashboard and capability map retain canonical gaps without promotion to live/operational', () => {
  const dashboard = render('dashboard');
  for (const c of capabilities.slice(0, 11)) assert.ok(dashboard.includes(c.title));
  for (const c of capabilities) {
    assert.ok(!c.statuses.some(s => ['LIVE READY', 'OPERACIONAL COMPLETO'].includes(s)));
    if (c.statuses.includes('STAGING READY')) {
      assert.ok(['staging', 'fixture-store', 'gateway'].includes(c.id));
      if (c.id === 'gateway') { assert.match(c.phase, /STG-02\/03/); assert.match(c.gap, /privados somente TEST/); assert.match(c.gap, /inbound real pendentes/); }
    }
  }
  assert.match(capabilities.find(c => c.id === 'fixture-store')!.gap, /fixtures.*200 work.*256 KiB/);
  assert.match(render('arquitetura'), /Pedidos unificados operacionalmente ainda incompletos/);
  assert.equal(safety.canSend, false); assert.equal(safety.sentMessages, 0);
});
test('marketing remains WHO/WHY; dispatch prepares two known synthetic drafts and replay has no duplicates', () => {
  assert.match(render('marketing'), /QUEM \+ POR QUÊ/); assert.match(render('marketing'), /DOMÍNIO SEPARADO/);
  const before = initialSession(); const after = prepareSession(before); const replay = prepareSession(after);
  assert.notEqual(before.sales.campaign.id, 'demo-marketing');
  assert.equal(before.sales.drafts.length, 0); assert.equal(after.sales.drafts.length, 2);
  assert.equal(sessionBudget(before).used, 0); assert.equal(sessionBudget(after).used, 2); assert.equal(sessionBudget(after).remaining, 0);
  assert.ok(after.sales.drafts.every(d => d.content.includes('rascunho sintético') && d.canSend === false));
  assert.equal(replay.sales.drafts.length, 2); assert.equal(after.events.timeline.length, replay.events.timeline.length);
  assert.ok(after.sales.drafts.every(d => !d.contactId.includes('contact-2')));
  assert.ok(after.events.opportunities.every(o => o.stage === 'RASCUNHO'));
  assert.match(render('dispatch'), /SIMULATION \/ OFFLINE/);
});
test('legacy orders and canonical projections remain separate with preserved IDs and totals', () => {
  assert.notEqual(legacyOrder, canonicalOrder.order); assert.equal(canonicalOrder.source, legacyOrder);
  assert.equal(canonicalOrder.order.id, legacyOrder.id); assert.equal(canonicalOrder.order.total, 40);
  assert.equal(canonicalOrder.order.entryPoint, 'POS'); assert.equal(canonicalOrder.order.status, 'CREATED');
  assert.equal(canonicalDelivery.order.id, legacyDelivery.id); assert.equal(canonicalDelivery.order.entryPoint, 'DIGITAL_MENU');
  assert.equal(canonicalDelivery.items[0].price, 20); assert.equal(legacyDelivery.status, 'PEDIDO GERADO');
  assert.match(render('pedidos'), /Pedidos unificados operacionalmente ainda incompletos/);
  assert.match(render('pedidos'), /Order legado → Order canônico/); assert.match(render('pedidos'), /DeliveryOrder → Order canônico/);
});
test('WhatsApp and RCS expose disabled transport and pending prerequisites, no send control', () => {
  assert.match(render('whatsapp'), /Transport/); assert.match(render('whatsapp'), /DISABLED/);
  assert.match(render('rcs'), /NÃO CONFIGURADO/); assert.match(render('rcs'), /UNKNOWN \/ fixture/);
  assert.match(render('config'), /PENDENTE · não ativável aqui/);
});
test('fixture names, addresses, tenant and orders are explicitly synthetic; no real input or persistence surface', () => {
  for (const c of contacts) { assert.match(c.name, /Exemplo$/); assert.equal(c.tenantId, 'demo-offline'); assert.match(c.phone, /^\+1202555010[0-6]$/); }
  for (const i of identities) assert.match(i.address!, /^\+1202555010[0-6]$/);
  for (const [id] of modules) {
    const markup = render(id);
    assert.ok(!/<(?:form|textarea)/.test(markup));
    const inputs = markup.match(/<input\b[^>]*>/g) ?? [];
    assert.equal(inputs.length, id === 'pedidos' || id === 'conversas' ? 5 : 0);
    for (const input of inputs) {
      assert.match(input, /type="number"/);
      assert.match(input, /aria-label="Informado (DINHEIRO|PIX|DEBITO|CREDITO|NOTA)"/);
      assert.match(input, /min="0"/);
      assert.match(input, /step="1"/);
    }
  }
  assert.match(legacyDelivery.address.street, /Demonstração/);
});
test('timeline has no fabricated events at initialization; funnel does not claim later-stage facts', () => {
  assert.equal(initialSession().events.timeline.length, 0);
  assert.match(render('timeline'), /Nenhum evento de draft ainda/);
  assert.match(render('funil'), /Nenhum fato registrado/);
  assert.match(render('gateway'), /não inicia listener ou worker/);
});
