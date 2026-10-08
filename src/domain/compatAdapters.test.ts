import { readFileSync } from 'node:fs';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptCampaignToDispatchCampaign,
  adaptCampaignToMarketingCampaign,
  adaptClientToContact,
  adaptClientToConversation,
  adaptHistoryToTimelineEvent,
  normalizeLegacyPhone,
  adaptCrmMessageToDomainMessage,
  adaptCrmOrderToDomainOrder,
  adaptDeliveryOrderToDomainOrder,
} from './compatAdapters';
import type {
  Campaign,
  Client,
  DeliveryOrder,
  Message,
  Order,
} from '../types';

const observedAt = '2026-09-30T12:00:00.000Z';
const tenantContext = { tenantId: 't-pratomineiro', observedAt };

test('adapta cliente CRM para contato e identidades omnichannel sem duplicar cliente', () => {
  const client: Client = {
    id: 'cli-1',
    name: 'Maria Silva',
    phone: '+5534999990000',
    type: 'salvo',
    stage: 'Lead',
    tags: ['vip'],
    totalBought: 100,
    notes: ['prefere marmita'],
    dispatched: false,
    avatarColor: '#123456',
    channel: 'ambos',
    contactPreferences: {
      marketingStatus: 'allowed',
      source: 'customer-request',
    },
  };

  const projection = adaptClientToContact(client, tenantContext);

  assert.equal(projection.contact.id, 'cli-1');
  assert.equal(projection.contact.tenantId, 't-pratomineiro');
  assert.equal(projection.identities.length, 2);
  assert.deepEqual(
    projection.identities.map((identity) => identity.channel),
    ['WHATSAPP', 'RCS']
  );
  assert.ok(projection.identities.every((identity) => identity.eligibility === 'ELIGIBLE'));
  assert.equal(projection.source, client);
});

test('exige tenantId e observedAt para projetar clientes sem inventar contexto', () => {
  const client = buildClient();

  assert.throws(
    () => adaptClientToContact(client, { tenantId: '', observedAt }),
    /tenantId is required/
  );
  assert.throws(
    () => adaptClientToContact(client, { tenantId: 't-pratomineiro' }),
    /context\.observedAt is required/
  );
});

test('separa MarketingCampaign de DispatchCampaign a partir da campanha legada', () => {
  const campaign: Campaign = {
    id: 'camp-1',
    name: 'Volta do tropeiro',
    messageTemplate: 'Oi {{nome}}',
    sentCount: 0,
    responseCount: 0,
    status: 'rascunho',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    channel: 'ambos',
  };

  const marketing = adaptCampaignToMarketingCampaign(campaign, tenantContext);
  const dispatch = adaptCampaignToDispatchCampaign(campaign, {
    ...tenantContext,
    dailyLimit: 120,
  });

  assert.equal(marketing.marketingCampaign.id, 'camp-1');
  assert.equal(dispatch.dispatchCampaign.id, 'dispatch:camp-1');
  assert.equal(dispatch.dispatchCampaign.routingMode, 'BOTH_SMART');
  assert.equal(dispatch.dispatchCampaign.dailyLimit, 120);
  assert.equal(marketing.source, campaign);
  assert.equal(dispatch.source, campaign);
});

test('adapta mensagens legadas para conversa do dominio', () => {
  const message: Message = {
    id: 'msg-1',
    sender: 'cliente',
    text: 'Quero fazer um pedido',
    timestamp: '2026-09-30T11:00:00.000Z',
    type: 'text',
    channel: 'whatsapp',
  };

  const projection = adaptCrmMessageToDomainMessage(message, {
    tenantId: 't-pratomineiro',
    conversationId: 'conversation:cli-1:WHATSAPP',
  });

  assert.equal(projection.message.sender, 'CONTACT');
  assert.equal(projection.message.channel, 'WHATSAPP');
  assert.equal(projection.message.contentType, 'TEXT');
});

test('adapta pedido CRM para Order canonico preservando origem de chat', () => {
  const order: Order = {
    id: 'ped-1',
    clientId: 'cli-1',
    clientName: 'Maria Silva',
    items: [
      {
        id: 'item-1',
        productName: 'Marmita P',
        price: 20,
        quantity: 2,
      },
    ],
    total: 40,
    paymentMethod: 'Pix',
    status: 'Pago',
    createdAt: '2026-09-30T11:10:00.000Z',
    channel: 'whatsapp',
  };

  const projection = adaptCrmOrderToDomainOrder(order, { ...tenantContext, creationMode: 'HUMAN_OPERATOR' });

  assert.equal(projection.order.contactId, 'cli-1');
  assert.equal(projection.order.entryPoint, 'CHAT');
  assert.equal(projection.order.channel, 'WHATSAPP');
  assert.equal(projection.order.creationMode, 'HUMAN_OPERATOR');
  assert.equal(projection.order.status, 'PAID');
  assert.equal(projection.items[0].orderId, 'ped-1');
});

test('adapta pedido delivery para Order canonico preservando fluxo operacional', () => {
  const deliveryOrder: DeliveryOrder = {
    id: 'del-1',
    clientId: 'cli-1',
    clientName: 'Maria Silva',
    clientPhone: '+5534999990000',
    items: [
      {
        productId: 'prod-1',
        productName: 'Marmita G',
        selectedSize: 'G',
        selectedSizePrice: 28,
        selectedAddons: [],
        removedItems: [],
        selectedUtensils: [],
        quantity: 1,
        subtotal: 28,
      },
    ],
    subtotal: 28,
    deliveryFee: 5,
    total: 33,
    paymentMethod: 'Pix',
    status: 'FECHADO',
    createdAt: '2026-09-30T11:20:00.000Z',
    deliveryTime: '20:30',
    address: {
      name: 'Maria Silva',
      phone: '+5534999990000',
      street: 'Rua A',
      number: '10',
      neighborhood: 'Centro',
      zipCode: '38190-000',
    },
    channel: 'delivery',
  };

  const projection = adaptDeliveryOrderToDomainOrder(deliveryOrder, { ...tenantContext, creationMode: 'CUSTOMER' });

  assert.equal(projection.order.entryPoint, 'DIGITAL_MENU');
  assert.equal(projection.order.channel, 'NONE');
  assert.equal(projection.order.creationMode, 'CUSTOMER');
  assert.equal(projection.order.status, 'PAID');
  assert.equal(projection.items[0].productId, 'prod-1');
});

test('rejeita datas invalidas em registros legados', () => {
  const campaign = {
    id: 'camp-1',
    name: 'Campanha invalida',
    messageTemplate: 'Oi',
    sentCount: 0,
    responseCount: 0,
    status: 'rascunho',
    createdAt: 'data-invalida',
  } satisfies Campaign;

  assert.throws(
    () => adaptCampaignToMarketingCampaign(campaign, tenantContext),
    /campaign\.createdAt must be a valid date/
  );
});

function buildClient(): Client {
  return {
    id: 'cli-1',
    name: 'Maria Silva',
    phone: '+5534999990000',
    type: 'salvo',
    stage: 'Lead',
    tags: [],
    totalBought: 0,
    notes: [],
    dispatched: false,
    avatarColor: '#123456',
  };
}

test('telefone internacional normalizado sem inferir pais', () => {
 assert.equal(normalizeLegacyPhone('+55 (34) 99999-0000'), '+5534999990000');
 assert.equal(normalizeLegacyPhone(undefined), '');
 assert.throws(() => normalizeLegacyPhone('34999990000'), /country code/);
});
test('bloqueio prevalece e consentimento operacional nao autoriza marketing', () => {
 for (const client of [{ ...buildClient(), channel: 'whatsapp' as const, type: 'bloqueado' as const }, { ...buildClient(), channel: 'rcs' as const, contactPreferences: { globalStatus: 'blocked' as const, marketingStatus: 'allowed' as const } }]) assert.equal(adaptClientToContact(client, tenantContext).identities[0].eligibility, 'INELIGIBLE');
 const client = { ...buildClient(), channel: 'whatsapp' as const, contactPreferences: { operationalStatus: 'allowed' as const } };
 assert.equal(adaptClientToContact(client, tenantContext).identities[0].eligibility, 'UNKNOWN');
});
test('canal ausente nao cria identidade nem provider', () => {
 const client = buildClient();
 assert.deepEqual(adaptClientToContact(client, tenantContext).identities, []);
 const result = adaptClientToConversation(client, { ...tenantContext, conversationId: 'existing-1', unreadCount: 2 });
 assert.equal(result.conversation.id, 'existing-1');
 assert.equal(result.conversation.channel, undefined);
 assert.equal(result.conversation.provider, undefined);
 for (const [legacy, expected] of [['whatsapp', 'WHATSAPP'], ['rcs', 'RCS']] as const) assert.equal(adaptClientToConversation({ ...client, channel: legacy }, { ...tenantContext, conversationId: 'existing-1', unreadCount: 0 }).conversation.channel, expected);
});
test('nao muta fonte congelada e declara ausencia de telefone', () => {
 const client = buildClient(); client.phone = '';
 Object.freeze(client.tags); Object.freeze(client.notes); Object.freeze(client);
 const before = JSON.stringify(client); const result = adaptClientToContact(client, tenantContext);
 result.contact.tags.push('new'); assert.equal(JSON.stringify(client), before);
 assert.equal(result.contact.phone, ''); assert.deepEqual(result.identities, []);
});
test('historico preserva ID e data sem efeitos', () => {
 const history = Object.freeze({ id: 'h1', clientId: 'cli-1', type: 'note_added' as const, title: 'Nota', description: 'Texto', timestamp: observedAt });
 const result = adaptHistoryToTimelineEvent(history, tenantContext);
 assert.equal(result.event.id, history.id); assert.equal(result.event.contactId, history.clientId); assert.equal(result.event.occurredAt.toISOString(), observedAt); assert.equal(result.source, history);
});

test('adapters sem imports de runtime nem chamadas de I/O', () => {
 const code = readFileSync(new URL('./compatAdapters.ts', import.meta.url), 'utf8');
 const ast = ts.createSourceFile('compatAdapters.ts', code, ts.ScriptTarget.Latest, true);
 for (const statement of ast.statements) if (ts.isImportDeclaration(statement)) assert.equal(statement.importClause?.isTypeOnly, true);
 assert.doesNotMatch(code, /\b(fetch|setDoc|addDoc|deleteDoc|onSnapshot|XMLHttpRequest|require|Date\.now)\s*\(/);
});
