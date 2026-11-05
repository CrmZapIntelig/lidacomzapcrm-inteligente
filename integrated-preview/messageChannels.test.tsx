import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductPreview } from './ProductPreview';
import { prepareChannelDemo } from './MessageChannelsDemo';
test('all five preview workflows expose the common channel selector and unconfigured statuses', () => {
  for (const initialModule of ['conversas', 'marketing', 'venda', 'dispatch', 'automacoes'] as const) {
    const html = renderToStaticMarkup(<ProductPreview initialModule={initialModule}/>);
    for (const label of ['WhatsApp · Meta oficial', 'WhatsApp · Evolution', 'RCS', 'Novas conexões', 'SEM ENVIO', 'Instância ainda não contratada', 'Agente ainda não contratado']) assert.ok(html.includes(label), `${initialModule}: ${label}`);
  }
});
test('preview selection exercises actual preparation for each provider without enqueue/send', () => {
  for (const provider of ['WHATSAPP_META_OFFICIAL', 'WHATSAPP_EVOLUTION_OPTIONAL', 'RCS_GOOGLE'] as const) {
    const result = prepareChannelDemo(provider);
    assert.equal(result.selectedProvider, provider); assert.equal(result.preparedContactIds.length, 1);
    assert.equal(result.canSend, false); assert.equal(result.canEnqueue, false);
  }
});
