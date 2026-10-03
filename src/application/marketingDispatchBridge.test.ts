import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMarketingDispatchHandoff } from './marketingDispatchBridge';
import { prepareActiveSalesDrafts } from './activeSalesOffline';
import type { MarketingAudience } from '../domain/dispatchPrerequisites';
import type { MarketingDispatchOptions } from './marketingDispatchBridge';
const at = new Date('2026-09-30T12:00:00Z');
const marketing = { id: 'marketing', tenantId: 'tenant', name: 'Retorno', createdAt: at, updatedAt: at };
const audience: MarketingAudience = { id: 'selected', tenantId: marketing.tenantId, marketingCampaignId: marketing.id, rationale: 'Clientes escolhidos explicitamente para retorno', contactIds: ['one', 'two', 'one'] };
const options: MarketingDispatchOptions = { dispatchCampaignId: 'dispatch', dispatchAudienceId: 'dispatch-audience', audienceRevision: 'v1', template: 'Olá {{nome}}', dailyLimit: 2, strategy: 'BOTH', minimumIntervalMs: 86400000, timeZone: 'America/Sao_Paulo', preparedAt: at };
test('marketing determines who/why, dispatch retains separate how/when', () => {
  const handoff = prepareMarketingDispatchHandoff(marketing, audience, options);
  assert.notEqual(handoff.dispatch.campaign.id, marketing.id);
  assert.equal(handoff.rationale, audience.rationale);
  assert.equal(handoff.dispatch.audience.marketingCampaignId, marketing.id);
  assert.deepEqual(handoff.dispatch.audience.contactIds, ['one', 'two']);
  assert.equal(handoff.dispatch.campaign.dailyLimit, 2); assert.equal('dailyLimit' in marketing, false);
  assert.equal(handoff.dispatch.drafts.length, 0); assert.equal(handoff.dispatch.executions.length, 0);
});
test('handoff deterministic idempotency, copied inputs and stable snapshot', () => {
  const before = structuredClone({ marketing, audience, options });
  const first = prepareMarketingDispatchHandoff(marketing, audience, options);
  assert.deepEqual(first, prepareMarketingDispatchHandoff(marketing, audience, options));
  assert.deepEqual({ marketing, audience, options }, before);
  first.dispatch.campaign.createdAt.setTime(0); assert.equal(marketing.createdAt.getTime(), at.getTime());
  assert.notEqual(first.dispatch.audience.contactIds, audience.contactIds);
  assert.notEqual(first.idempotencyKey, prepareMarketingDispatchHandoff(marketing, audience, { ...options, audienceRevision: 'v2' }).idempotencyKey);
});
test('wrong tenant/campaign, empty rationale, shared ID rejected', () => {
  assert.throws(() => prepareMarketingDispatchHandoff(marketing, { ...audience, tenantId: 'other' }, options));
  assert.throws(() => prepareMarketingDispatchHandoff(marketing, { ...audience, marketingCampaignId: 'other' }, options));
  assert.throws(() => prepareMarketingDispatchHandoff(marketing, { ...audience, rationale: '' }, options));
  assert.throws(() => prepareMarketingDispatchHandoff(marketing, audience, { ...options, dispatchCampaignId: marketing.id }));
});
test('selected audience remains non-eligible without current evidence', () => {
  const handoff = prepareMarketingDispatchHandoff(marketing, audience, options);
  const result = prepareActiveSalesDrafts(handoff.dispatch, { at, contacts: [], conversations: [], evidence: [] });
  assert.equal(result.canSend, false); assert.equal(result.state.drafts.length, 0);
  assert.equal(result.state.queue.entries.length, 2);
});
