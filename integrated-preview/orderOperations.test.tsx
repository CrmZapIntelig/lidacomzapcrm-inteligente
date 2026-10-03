import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderOperationsDemo, demoReview } from './OrderOperationsDemo';
test('contextual order preview exposes synthetic review and all manual cash methods without live actions', () => {
  const html = renderToStaticMarkup(<OrderOperationsDemo/>);
  for (const text of ['OFFLINE IMPLEMENTADO', 'Ana Exemplo', '+ Novo Pedido Demo', 'NOTA', 'DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'Comparar fechamento Demo']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('iframe')); assert.ok(!html.includes('Enviar'));
  const review = demoReview('NOTA');
  assert.equal(review.order.conversationId, 'demo-conversation-ana'); assert.equal(review.nota, 'AWAITING_APPROVAL'); assert.equal(review.totalCents, 4000);
});
