import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { unifiedDomainFacade as facade } from './unifiedDomainFacade';
import type { ProjectionResult, DispatchAudience, DispatchDraftOptions } from './unifiedDomainFacade';
import type { Client, Campaign, Message, Order, DeliveryOrder, HistoryEvent } from '../types';

const at = '2026-09-30T12:00:00.000Z';
const context = { tenantId: 'prato-mineiro', observedAt: at };
const client: Client = {
  id: 'c1', name: 'Maria', phone: '+55 (34) 99999-0000', type: 'salvo', stage: 'Lead',
  tags: ['vip'], totalBought: 0, notes: ['nota'], dispatched: false, avatarColor: '#fff', channel: 'whatsapp',
};
const campaign: Campaign = { id: 'm1', name: 'Retorno', messageTemplate: 'Olá', sentCount: 3, responseCount: 1, status: 'rascunho', createdAt: at, segmentId: 'segment-1' };
const message: Message = { id: 'msg1', sender: 'cliente', text: 'Olá', timestamp: at, channel: 'whatsapp' };
const order: Order = { id: 'o1', clientId: 'c1', clientName: 'Maria', items: [{ id: 'p1', productName: 'Marmita', price: 20, quantity: 2 }], total: 40, paymentMethod: 'Pix', status: 'Pago', createdAt: at, channel: 'whatsapp' };
const delivery: DeliveryOrder = {
  id: 'd1', clientId: 'c1', clientName: 'Maria', clientPhone: client.phone, items: [{
    productId: 'p1', productName: 'Marmita', selectedSize: 'M', selectedSizePrice: 20,
    selectedAddons: [], removedItems: [], selectedUtensils: [], quantity: 2, subtotal: 40,
  }], subtotal: 40, deliveryFee: 5, total: 45, paymentMethod: 'Pix', status: 'FECHADO',
  createdAt: at, deliveryTime: '12:30', channel: 'delivery', address: {
    name: 'Maria', phone: client.phone, street: 'Rua A', number: '1', neighborhood: 'Centro', zipCode: '38000-000',
  },
};
const history: HistoryEvent = { id: 'h1', clientId: 'c1', type: 'note_added', title: 'Nota', description: 'Texto', timestamp: at };
const audience: DispatchAudience = { id: 'a1', tenantId: context.tenantId, marketingCampaignId: campaign.id, contactIds: ['c1'] };
const options: DispatchDraftOptions = { dispatchCampaignId: 'dispatch-1', template: 'Olá', dailyLimit: 10, routingMode: 'WHATSAPP', preparedAt: new Date(at) };

function value<T>(result: ProjectionResult<T>): T {
  if (result.status !== 'PROJECTED') throw new Error(result.reason);
  assert.equal(result.status, 'PROJECTED');
  return result.value;
}
function freeze<T>(input: T): T {
  if (input && typeof input === 'object') {
    for (const nested of Object.values(input)) freeze(nested);
    Object.freeze(input);
  }
  return input;
}
function marketing() { return value(facade.getMarketingCampaign(campaign, context)).marketingCampaign; }

test('Client via facade preserva ID e normaliza telefone', () => {
  const result = value(facade.getUnifiedContact(client, context));
  assert.equal(result.contact.id, client.id);
  assert.equal(result.contact.phone, '+5534999990000');
  assert.equal(result.source, client);
});
test('objeto legado congelado permanece intacto', () => {
  const input = freeze(structuredClone(client)); const before = JSON.stringify(input);
  const result = value(facade.getUnifiedContact(input, context));
  result.contact.tags.push('novo'); assert.equal(JSON.stringify(input), before);
});
test('telefone ausente produz ausência explícita de identidades', () => {
  const result = value(facade.getUnifiedContact({ ...client, phone: '' }, context));
  assert.equal(result.contact.phone, ''); assert.deepEqual(result.identities, []);
});
test('telefone nacional sem DDI retorna INVALID_INPUT controlado', () => {
  const result = facade.getUnifiedContact({ ...client, phone: '34999990000' }, context);
  assert.equal(result.status, 'INVALID_INPUT');
  if (result.status === 'INVALID_INPUT') assert.match(result.reason, /country code/);
});
test('ambos explícito permite duas identidades com disponibilidade desconhecida', () => {
  const result = value(facade.getUnifiedContact({ ...client, channel: 'ambos' }, context));
  assert.deepEqual(result.identities.map(i => i.channel), ['WHATSAPP', 'RCS']);
  assert.ok(result.identities.every(i => i.contactId === client.id && i.availability === 'UNKNOWN'));
});
test('WhatsApp isolado não inventa RCS', () => {
  assert.deepEqual(value(facade.getUnifiedContact(client, context)).identities.map(i => i.channel), ['WHATSAPP']);
  assert.deepEqual(value(facade.getUnifiedContact({ ...client, channel: undefined }, context)).identities, []);
});
test('bloqueios e preferências são preservados na projeção e na fonte', () => {
  const input = { ...client, contactPreferences: { globalStatus: 'blocked' as const, marketingStatus: 'allowed' as const } };
  const result = value(facade.getUnifiedContact(input, context));
  assert.equal(result.identities[0].eligibility, 'INELIGIBLE');
  assert.equal(result.source.contactPreferences, input.contactPreferences);
});
test('conversa WhatsApp preserva ID e mensagens por adapter', () => {
  const result = value(facade.getUnifiedConversation(client, [message], { ...context, conversationId: 'conv1', unreadCount: 1, channel: 'whatsapp' }));
  assert.equal(result.conversation.id, 'conv1'); assert.equal(result.conversation.channel, 'WHATSAPP');
  assert.equal(result.messages[0].message.id, message.id); assert.equal(result.messages[0].message.conversationId, 'conv1');
});
test('conversas RCS e WhatsApp pertencem ao mesmo contato', () => {
  const result = value(facade.getUnifiedConversation(client, [{ ...message, channel: 'rcs' }], { ...context, conversationId: 'rcs-conv', unreadCount: 0, channel: 'rcs' }));
  assert.equal(result.conversation.contactId, client.id); assert.equal(result.conversation.channel, 'RCS');
  assert.equal(result.conversation.provider, undefined);
});
test('canal desconhecido permanece UNKNOWN sem inferir canal do cliente', () => {
  const result = value(facade.getUnifiedConversation(client, [{ ...message, channel: undefined }], { ...context, conversationId: 'conv1', unreadCount: 0 }));
  assert.equal(result.channelStatus, 'UNKNOWN'); assert.equal(result.conversation.channel, undefined);
});
test('histórico misto é rejeitado sem atribuir mensagens ao canal errado', () => {
  assert.equal(facade.getUnifiedConversation(client, [message, { ...message, id: 'm2', channel: 'rcs' }], { ...context, conversationId: 'conv1', unreadCount: 0, channel: 'whatsapp' }).status, 'INVALID_INPUT');
});
test('Campaign projeta MarketingCampaign e preserva segmento na fonte', () => {
  const result = value(facade.getMarketingCampaign(campaign, context));
  assert.equal(result.marketingCampaign.id, campaign.id); assert.equal(result.source.segmentId, 'segment-1');
});
test('consulta marketing não cria dispatch, fila ou execução', () => {
  const result = value(facade.getMarketingCampaign(campaign, context));
  assert.deepEqual(Object.keys(result).sort(), ['marketingCampaign', 'source']);
  assert.equal(campaign.sentCount, 3);
});
test('draft depende de chamada explícita com audience e configuração', () => {
  const draft = value(facade.prepareDispatchCampaignDraft(marketing(), audience, options));
  assert.equal(draft.status, 'DRAFT'); assert.equal(draft.marketingCampaignId, campaign.id);
  assert.equal(draft.campaign.id, options.dispatchCampaignId); assert.equal(draft.queue.status, 'NOT_CREATED');
  assert.equal(draft.execution.status, 'NOT_STARTED');
});
test('draft rejeita tenant divergente, ID igual ao marketing e limite inválido', () => {
  assert.equal(facade.prepareDispatchCampaignDraft(marketing(), { ...audience, tenantId: 'outro' }, options).status, 'INVALID_INPUT');
  assert.equal(facade.prepareDispatchCampaignDraft(marketing(), audience, { ...options, dispatchCampaignId: campaign.id }).status, 'INVALID_INPUT');
  assert.equal(facade.prepareDispatchCampaignDraft(marketing(), audience, { ...options, dailyLimit: 0 }).status, 'INVALID_INPUT');
});
test('draft não altera marketing, audience, configuração ou contadores', () => {
  const inputs = freeze({ marketing: marketing(), audience: structuredClone(audience), options: structuredClone(options) });
  const before = JSON.stringify(inputs);
  const draft = value(facade.prepareDispatchCampaignDraft(inputs.marketing, inputs.audience, inputs.options));
  (draft.audience.contactIds as string[]).push('c2'); draft.campaign.createdAt.setFullYear(2000);
  assert.equal(JSON.stringify(inputs), before); assert.equal(campaign.sentCount, 3);
});
test('consulta draft copia arrays e datas sem armazenamento', () => {
  const draft = value(facade.prepareDispatchCampaignDraft(marketing(), audience, options));
  const copy = facade.getDispatchCampaignDraft(draft); copy.campaign.createdAt.setFullYear(2000);
  assert.equal(draft.campaign.createdAt.toISOString(), at);
  assert.notEqual(copy.audience.contactIds, draft.audience.contactIds);
});
test('Order legado usa novo Order mantendo ID, itens e total', () => {
  const result = value(facade.getUnifiedOrder(freeze(structuredClone(order)), { ...context, creationMode: 'HUMAN_OPERATOR' }));
  assert.equal(result.order.id, order.id); assert.equal(result.order.status, 'PAID');
  assert.equal(result.items[0].id, order.items[0].id); assert.equal(result.order.total, 40);
});
test('DeliveryOrder projeta preço unitário e origem sem mutação', () => {
  const input = freeze(structuredClone(delivery)); const before = JSON.stringify(input);
  const result = value(facade.getUnifiedDeliveryOrder(input, { ...context, creationMode: 'CUSTOMER' }));
  assert.equal(result.order.id, delivery.id); assert.equal(result.order.entryPoint, 'DIGITAL_MENU');
  assert.equal(result.items[0].price, 20); assert.equal(JSON.stringify(input), before);
});
test('History projeta Timeline sem perder ID ou apagar fonte', () => {
  const input = freeze([structuredClone(history)]);
  const result = value(facade.getUnifiedTimeline(input, context));
  assert.equal(result[0].event.id, history.id); assert.equal(result[0].event.contactId, client.id);
  assert.equal(result[0].source, input[0]); assert.equal(input.length, 1);
});
test('Opportunity ausente não é inventada a partir de Client.stage', () => {
  assert.equal(facade.getOpportunity(client.id).status, 'ABSENT');
  assert.equal(facade.getFunnelBoundary().status, 'NOT_ACTIVATED');
});
test('Opportunity explícita é validada e copiada', () => {
  const evidence = freeze({ id: 'opp1', contactId: client.id, stage: 'LEAD' as const });
  assert.deepEqual(value(facade.getOpportunity(client.id, evidence) as ProjectionResult<typeof evidence>), evidence);
  assert.equal(facade.getOpportunity('outro', evidence).status, 'INVALID_INPUT');
});
test('MessagingWindowPolicy sem provider não autoriza envio', () => {
  const result = facade.queryMessagingWindowPolicy({ channel: 'WHATSAPP', messageType: 'TEXT', evaluatedAt: new Date(at) });
  assert.equal(result.status, 'NOT_EVALUATED'); assert.equal(result.canSend, false);
});
test('provider e capability declarados não equivalem a política verificada', () => {
  const input = freeze({ channel: 'RCS' as const, provider: 'RCS_GOOGLE' as const, messageType: 'TEXT' as const, evaluatedAt: new Date(at), currentCapability: { channel: 'RCS' as const, provider: 'RCS_GOOGLE' as const, capabilities: ['TEXT' as const], observedAt: new Date(at), source: 'MANUAL' as const } });
  const before = JSON.stringify(input); assert.equal(facade.queryMessagingWindowPolicy(input).canSend, false);
  assert.equal(JSON.stringify(input), before);
});
test('camada e adapters sem chamadas externas ou dependências de I/O', () => {
  for (const path of ['./unifiedDomainFacade.ts', '../domain/compatAdapters.ts']) {
    const code = readFileSync(new URL(path, import.meta.url), 'utf8');
    const ast = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) {
      assert.equal((statement.moduleSpecifier as ts.StringLiteral).text, '../domain/compatAdapters');
    }
    assert.doesNotMatch(code, /\b(fetch|axios|setDoc|addDoc|updateDoc|deleteDoc|localStorage|XMLHttpRequest|require|Date\.now)\s*[.(]/);
  }
});
