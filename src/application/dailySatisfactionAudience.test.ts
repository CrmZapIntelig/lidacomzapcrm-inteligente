import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDailySatisfactionAudience, type DeliveredOrderFact, type SatisfactionContactPolicy } from './dailySatisfactionAudience';

const tenantId = 'prato-mineiro';
const delivery = (orderId: string, contactId: string, deliveredAt = '2026-10-30T01:30:00.000Z'): DeliveredOrderFact => ({ tenantId, orderId, contactId, deliveredAt, state: 'DELIVERED' });
const policy = (contactId: string, extra: Partial<SatisfactionContactPolicy> = {}): SatisfactionContactPolicy => ({ tenantId, contactId, blocked: false, operationalConsent: 'ALLOWED', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL', channelAvailable: true, ...extra });

test('local business day groups all delivered orders into one draft per contact', () => {
  const result = prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-2', 'contact-1'), delivery('order-1', 'contact-1')], policies: [policy('contact-1')] });
  assert.equal(result.entries.length, 1);
  assert.deepEqual(result.entries[0].orderIds, ['order-1', 'order-2']);
  assert.equal(result.entries[0].canSend, false);
  assert.equal(result.entries[0].status, 'DRAFT_ONLY');
});

test('blocked, unknown consent, unavailable channel and other day never enter audience', () => {
  const result = prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-1', 'blocked'), delivery('order-2', 'unknown'), delivery('order-3', 'offline'), delivery('order-4', 'next-day', '2026-10-31T03:00:00.000Z')], policies: [policy('blocked', { blocked: true }), policy('unknown', { operationalConsent: 'UNKNOWN' }), policy('offline', { channelAvailable: false }), policy('next-day')] });
  assert.equal(result.entries.length, 0);
  assert.deepEqual(new Set(result.skipped.map(item => item.reason)), new Set(['BLOCKED', 'CONSENT_REQUIRED', 'CHANNEL_UNAVAILABLE', 'OUTSIDE_DAY']));
});

test('existing daily preparation is replay-safe and provider/channel must agree', () => {
  const key = 'SATISFACTION:prato-mineiro:2026-10-29:contact-1';
  const replay = prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-1', 'contact-1')], policies: [policy('contact-1')], existingIdempotencyKeys: [key] });
  assert.equal(replay.entries.length, 0); assert.equal(replay.skipped[0].reason, 'ALREADY_PREPARED');
  assert.throws(() => prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-1', 'contact-1')], policies: [policy('contact-1', { channel: 'RCS' })] }), /POLICY_INVALID/);
});

test('same order cannot belong to two contacts and duplicate delivery is prepared once', () => {
  assert.throws(() => prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-1', 'contact-1'), delivery('order-1', 'contact-2')], policies: [policy('contact-1'), policy('contact-2')] }), /IDENTITY_CONFLICT/);
  const result = prepareDailySatisfactionAudience({ tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo', deliveries: [delivery('order-1', 'contact-1'), delivery('order-1', 'contact-1')], policies: [policy('contact-1')] });
  assert.deepEqual(result.entries[0].orderIds, ['order-1']);
});

test('malformed persisted policy flags fail closed before persistence', () => {
  for (const extra of [
    { blocked: undefined }, { blocked: null }, { blocked: 0 },
    { channelAvailable: 'false' }, { channelAvailable: 1 },
    { operationalConsent: 'allowed' },
  ]) {
    const malformed = policy('contact-1', extra as unknown as Partial<SatisfactionContactPolicy>);
    assert.throws(() => prepareDailySatisfactionAudience({
      tenantId, businessDate: '2026-10-29', timeZone: 'America/Sao_Paulo',
      deliveries: [delivery('order-1', 'contact-1')], policies: [malformed],
    }), /SATISFACTION_POLICY_INVALID/);
  }
});