import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { businessKey, createContactChannelIdentity, createProviderCapabilities } from './offlinePrimitives';
import { decideRouting } from './routing';
import { captureDispatchAudience, evaluateDispatchEligibility, consumeBudget, appendAudience, reserveEntry, releaseEntry, cancelEntry, snapshotQueue, transitionOutboundState, calculateRetryDecision } from './dispatchPrerequisites';
import type { DispatchAudienceSnapshot, EligibilityEvidence, DailyDispatchBudget } from './dispatchPrerequisites';
const at = new Date('2026-09-30T12:00:00Z');
const identity = createContactChannelIdentity({ id: 'i', tenantId: 't', contactId: 'c', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', address: '+5511999990000', availability: 'KNOWN_AVAILABLE', eligibility: 'ELIGIBLE', createdAt: at, updatedAt: at });
const capability = createProviderCapabilities({ channel: identity.channel, provider: identity.provider!, capabilities: ['TEXT'], source: 'MANUAL', observedAt: at });
const evidence: EligibilityEvidence = { tenantId: 't', contactId: 'c', phone: identity.address, blocked: false, optedOut: false, group: false, consent: 'ALLOWED', preferredChannel: 'ANY', alreadyPrepared: false, identity, capability, templateApprovedForOffline: true };
const policy = { tenantId: 't', minimumIntervalMs: 86400000, evaluatedAt: at };
const audience: DispatchAudienceSnapshot = { id: 'a', tenantId: 't', campaignId: 'd', sourceAudienceId: 'm-a', revision: '1', contactIds: ['c', 'c2', 'c'], capturedAt: at.toISOString() };
const empty = { tenantId: 't', campaignId: 'd', entries: [] };
const budgetPolicy = { tenantId: 't', campaignId: 'd', dailyLimit: 1, timeZone: 'America/Sao_Paulo' };
test('audience snapshot is deduplicated, copied and confers no eligibility', () => {
  const snapshot = captureDispatchAudience(Object.freeze({ ...audience, contactIds: Object.freeze([...audience.contactIds]) }));
  assert.deepEqual(snapshot.contactIds, ['c', 'c2']); assert.equal('eligibleForPreparation' in snapshot, false);
  assert.equal(evaluateDispatchEligibility({ ...evidence, consent: 'UNKNOWN' }, policy).eligibleForPreparation, false);
});
for (const [name, patch] of Object.entries({ blocked: { blocked: true }, optedOut: { optedOut: true }, invalid: { phone: '123' }, denied: { consent: 'DENIED' }, group: { group: true }, duplicate: { alreadyPrepared: true }, tenant: { tenantId: 'other' }, preference: { preferredChannel: 'RCS' }, template: { templateApprovedForOffline: false }, frequency: { lastCommercialAt: at.toISOString() }, capability: { capability: undefined } })) {
  test(`eligibility rejects ${name}`, () => { assert.equal(evaluateDispatchEligibility({ ...evidence, ...patch } as EligibilityEvidence, policy).eligibleForPreparation, false); });
}
test('preparation eligibility never authorizes send or a messaging window', () => {
  assert.deepEqual(evaluateDispatchEligibility(evidence, policy), { eligibleForPreparation: true, canSend: false, window: 'NOT_EVALUATED', reasons: [] });
});
test('UNKNOWN identities/capabilities stay unavailable and provider mismatch rejected', () => {
  const unknown = createContactChannelIdentity({ ...identity, availability: undefined, eligibility: undefined });
  assert.equal(unknown.availability, 'UNKNOWN'); assert.equal(unknown.eligibility, 'UNKNOWN');
  assert.equal(createProviderCapabilities({ channel: 'RCS', provider: 'RCS_GOOGLE', observedAt: at }).capabilities.length, 0);
  assert.throws(() => createProviderCapabilities({ channel: 'RCS', provider: 'WHATSAPP_META_OFFICIAL', observedAt: at }));
});
test('routing retains historical WhatsApp first, explicit fallback and tenant isolation', () => {
  const rcs = { ...identity, id: 'rcs', channel: 'RCS' as const, provider: 'RCS_GOOGLE' as const };
  const request = { tenantId: 't', contactId: 'c', requestedMode: 'BOTH_SMART' as const, identities: [identity, rcs], evaluatedAt: at };
  assert.equal(decideRouting(request).selectedChannel, 'WHATSAPP');
  assert.equal(decideRouting({ ...request, identities: [{ ...identity, eligibility: 'INELIGIBLE' }, rcs] }).selectedChannel, 'RCS');
  assert.equal(decideRouting({ ...request, identities: [{ ...rcs, availability: 'UNKNOWN' }] }).selectedChannel, null);
  assert.equal(decideRouting({ ...request, tenantId: 'other' }).selectedChannel, null);
  assert.equal(decideRouting({ ...request, requestedMode: 'WHATSAPP', identities: [identity, { ...identity, id: 'second' }] }).selectedChannel, null);
});
test('daily budget accumulates across calls and remaining entries continue next local day', () => {
  let budgets: readonly DailyDispatchBudget[] = [];
  const first = consumeBudget(budgets, budgetPolicy, at, 'one'); budgets = first.budgets;
  assert.equal(first.allowed, true); assert.equal(consumeBudget(budgets, budgetPolicy, at, 'two').allowed, false);
  assert.equal(consumeBudget(budgets, budgetPolicy, at, 'one').duplicate, true);
  assert.equal(consumeBudget(budgets, budgetPolicy, new Date('2026-10-01T02:59:59Z'), 'two').allowed, false);
  assert.equal(consumeBudget(budgets, budgetPolicy, new Date('2026-10-01T03:00:00Z'), 'two').allowed, true);
  assert.equal(consumeBudget(budgets, { ...budgetPolicy, campaignId: 'other' }, at, 'two').allowed, true);
  assert.throws(() => consumeBudget(budgets, { ...budgetPolicy, timeZone: 'UTC' }, at, 'two'));
});
test('queue is stable under append/replay, with deterministic unambiguous business identity', () => {
  const queue = appendAudience(empty, audience);
  assert.deepEqual(appendAudience(queue, audience), queue);
  const appended = appendAudience(queue, { ...audience, revision: '2', contactIds: ['new', 'c'] });
  assert.deepEqual(appended.entries.slice(0, 2), queue.entries); assert.equal(appended.entries[2].position, 3);
  assert.notEqual(businessKey('a|b', 'c'), businessKey('a', 'b|c'));
  assert.equal(queue.entries[0].idempotencyKey, businessKey('t', 'd', 'c'));
  assert.deepEqual(snapshotQueue(JSON.parse(JSON.stringify(appended))), appended);
  assert.throws(() => snapshotQueue({ ...queue, entries: [...queue.entries, queue.entries[0]] }));
});
test('lease protects owner, expires, and bounded retries never manufacture delivery', () => {
  const queue = appendAudience(empty, audience); const id = queue.entries[0].id;
  const reserved = reserveEntry(queue, id, 'owner', at, 1000);
  assert.equal(reserved.reserved, true); assert.equal(reserveEntry(reserved.queue, id, 'other', at, 1000).reserved, false);
  const retry = { maxAttempts: 2, baseDelayMs: 2000, maxDelayMs: 5000, retryable: true };
  assert.throws(() => releaseEntry(reserved.queue, id, 'other', at, retry));
  assert.throws(() => releaseEntry(reserved.queue, id, 'owner', new Date(at.getTime() + 1000), retry));
  const released = releaseEntry(reserved.queue, id, 'owner', at, retry);
  assert.equal(reserveEntry(released, id, 'owner', at, 1000).reserved, false);
  const second = reserveEntry(released, id, 'owner', new Date(at.getTime() + 2000), 1000);
  assert.equal(releaseEntry(second.queue, id, 'owner', new Date(at.getTime() + 2000), retry).entries[0].status, 'FAILED');
  assert.equal(cancelEntry(queue, id).entries[0].status, 'SKIPPED');
  assert.equal(reserved.queue.entries[0].status, 'QUEUED');
});
test('historical transport graph separate from commercial status and finite retry math', () => {
  assert.equal(transitionOutboundState('PREPARED', 'QUEUED'), 'QUEUED');
  assert.throws(() => transitionOutboundState('QUEUED', 'DELIVERED'));
  assert.throws(() => transitionOutboundState('READ', 'QUEUED'));
  assert.equal(calculateRetryDecision({ attempt: 3, maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 2000, retryable: true }).delayMs, 2000);
  assert.throws(() => calculateRetryDecision({ attempt: 1, maxAttempts: 2, baseDelayMs: NaN, maxDelayMs: 10, retryable: true }));
});
test('frozen inputs preserved and resulting dates/capability arrays independently copied', () => {
  const original = structuredClone({ evidence, audience }); Object.freeze(evidence); Object.freeze(audience);
  evaluateDispatchEligibility(evidence, policy); appendAudience(empty, audience);
  assert.deepEqual({ evidence, audience }, original);
  const copy = createContactChannelIdentity(identity); copy.createdAt.setTime(0); assert.notEqual(identity.createdAt.getTime(), 0);
});
test('offline modules have no external runtime dependency or I/O primitives', () => {
  for (const path of ['src/domain/offlinePrimitives.ts', 'src/domain/routing.ts', 'src/domain/dispatchPrerequisites.ts']) {
    const content = readFileSync(path, 'utf8');
    const ast = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements) if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) assert.match((node.moduleSpecifier as ts.StringLiteral).text, /^\.\/(offlinePrimitives|dispatchPrerequisites|routing)$/);
    assert.doesNotMatch(content, /\b(fetch|axios|localStorage|sessionStorage|setTimeout|setInterval|process\.env|firebase|Firestore)\b/);
  }
});
