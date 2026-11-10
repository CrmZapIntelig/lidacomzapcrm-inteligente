import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignDispatchDraft } from './campaignDispatchContract';
import type { Campaign, CampaignExecutionPreview, WhatsAppCampaignReadiness, CampaignContactEligibilitySummary, CampaignDispatchDraft } from '../types';

function fixture() {
  const at = '2026-10-17T12:00:00.000Z';
  const campaign: Campaign = { id: 'demo-marketing', name: 'Demo', messageTemplate: 'Demo offer', sentCount: 0, responseCount: 0, status: 'rascunho', createdAt: at };
  const ids = ['missing-tech', 'bad-phone', 'missing-consent', 'denied', 'empty', 'ready', 'duplicate'];
  const preparation: CampaignExecutionPreview = { campaign, status: 'ready', generatedAt: at, totalRecipients: ids.length, validMessagesCount: ids.length - 1, invalidMessagesCount: 1, unresolvedVariables: [], usedSnapshot: false,
    preparedMessages: ids.map(customerId => ({ customerId, customerName: 'Demo', phone: '+15555550100', content: customerId === 'empty' ? '  ' : 'Demo offer', unresolvedVariables: [], valid: customerId !== 'empty' })) };
  const technical: WhatsAppCampaignReadiness = { status: 'not-ready-for-real-send', backendAvailable: false, providerConfigured: false, consentModelAvailable: true,
    counts: { 'phone-ready': 5, 'missing-phone': 0, 'invalid-phone': 1, 'blocked-contact': 0, 'group-contact': 0, 'invalid-prepared-message': 0 },
    items: ids.filter(id => id !== 'missing-tech').map(customerId => ({ customerId, customerName: 'Demo', normalizedPhone: '+15555550100', readiness: customerId === 'bad-phone' ? 'invalid-phone' : 'phone-ready', preparedMessageValid: true })) };
  const eligibility: CampaignContactEligibilitySummary = { generatedAt: at, totalRecipients: 6, eligibleRecipients: 5, unknownRecipients: 0, blockedRecipients: 0, deniedRecipients: 1, revokedRecipients: 0, groupRecipients: 0, channelNotPreferredRecipients: 0,
    recipients: ids.filter(id => id !== 'missing-consent').map(customerId => ({ customerId, customerName: 'Demo', status: customerId === 'denied' ? 'marketing-denied' : 'eligible', eligibleForMarketing: customerId !== 'denied', reason: 'Fixture' })) };
  return { campaign, preparation, technical, eligibility, at };
}
test('legacy marketing draft preserves classification precedence and deduplicates only eligible recipients', () => {
  const f = fixture(), before = structuredClone(f);
  const draft: CampaignDispatchDraft = createCampaignDispatchDraft(f.campaign, f.preparation, f.technical, f.eligibility, 'demo-draft', f.at);
  assert.deepEqual(draft.items.map(i => i.status), ['blocked-technical', 'blocked-technical', 'blocked-eligibility', 'blocked-eligibility', 'blocked-content', 'candidate', 'duplicate-recipient']);
  assert.deepEqual(draft.items.map(i => i.blockReasons), [['technical-readiness-missing'], ['phone-not-ready'], ['contact-eligibility-missing'], ['contact-not-eligible'], ['empty-content'], [], ['duplicate-normalized-phone']]);
  assert.equal(draft.candidateItems, 1); assert.equal(draft.blockedItems, 6);
  assert.deepEqual([draft.technicalBlockedItems, draft.eligibilityBlockedItems, draft.contentBlockedItems, draft.duplicateItems], [2, 2, 1, 1]);
  assert.deepEqual(f, before);
  assert.deepEqual(createCampaignDispatchDraft(f.campaign, f.preparation, f.technical, f.eligibility, 'demo-draft', f.at), draft);
  assert.ok(draft.items.every(i => i.purpose === 'marketing'));
  assert.equal(draft.status, 'draft-only-not-queued');
  for (const flag of ['backendAvailable', 'providerConfigured', 'queuePersisted', 'idempotencyEnforced'] as const) assert.equal(draft[flag], false);
});

test('missing readiness or eligibility never becomes a marketing candidate', () => {
  const f = fixture(); f.technical.items = [];
  assert.equal(createCampaignDispatchDraft(f.campaign, f.preparation, f.technical, f.eligibility, 'demo-draft', f.at).candidateItems, 0);
  const other = fixture(); other.eligibility.recipients = [];
  assert.equal(createCampaignDispatchDraft(other.campaign, other.preparation, other.technical, other.eligibility, 'demo-draft', other.at).candidateItems, 0);
});
