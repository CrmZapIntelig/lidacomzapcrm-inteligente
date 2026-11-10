import type { ChannelProvider, CommunicationChannel } from '../domain/omnichannel';
import { messageProviderChannel } from '../domain/messageChannelCatalog';

export interface DeliveredOrderFact {
  tenantId: string;
  orderId: string;
  contactId: string;
  deliveredAt: string;
  state: 'DELIVERED';
}

export interface SatisfactionContactPolicy {
  tenantId: string;
  contactId: string;
  blocked: boolean;
  operationalConsent: 'ALLOWED' | 'UNKNOWN' | 'DENIED' | 'REVOKED';
  channel: CommunicationChannel;
  provider: ChannelProvider;
  channelAvailable: boolean;
}

export type SatisfactionSkipReason = 'OUTSIDE_DAY' | 'BLOCKED' | 'CONSENT_REQUIRED' | 'CHANNEL_UNAVAILABLE' | 'POLICY_MISSING' | 'ALREADY_PREPARED';

export interface SatisfactionAudienceEntry {
  idempotencyKey: string;
  tenantId: string;
  businessDate: string;
  contactId: string;
  orderIds: readonly string[];
  channel: CommunicationChannel;
  provider: ChannelProvider;
  status: 'DRAFT_ONLY';
  canSend: false;
}

export interface SatisfactionAudienceResult {
  entries: SatisfactionAudienceEntry[];
  skipped: { contactId: string; orderId: string; reason: SatisfactionSkipReason }[];
}

const validId = (value: string) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value);
export const validSatisfactionDay = (value: string) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const dayInZone = (value: string, timeZone: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('SATISFACTION_DELIVERY_DATE_INVALID');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

/** Creates only an operator-reviewable audience. Dispatch remains a separate boundary. */
export function prepareDailySatisfactionAudience(input: {
  tenantId: string;
  businessDate: string;
  timeZone: string;
  deliveries: readonly DeliveredOrderFact[];
  policies: readonly SatisfactionContactPolicy[];
  existingIdempotencyKeys?: readonly string[];
}): SatisfactionAudienceResult {
  if (!validId(input.tenantId) || !validSatisfactionDay(input.businessDate)) throw new Error('SATISFACTION_SCOPE_INVALID');
  if (typeof input.timeZone !== 'string' || !input.timeZone.trim()) throw new Error('SATISFACTION_TIME_ZONE_INVALID');
  try { new Intl.DateTimeFormat('en-US', { timeZone: input.timeZone }).format(new Date(0)); } catch { throw new Error('SATISFACTION_TIME_ZONE_INVALID'); }
  const policies = new Map<string, SatisfactionContactPolicy>();
  for (const policy of input.policies) {
    if (!policy || typeof policy.blocked !== 'boolean' || typeof policy.channelAvailable !== 'boolean' || !['ALLOWED', 'UNKNOWN', 'DENIED', 'REVOKED'].includes(policy.operationalConsent) || !validId(policy.contactId) || policy.tenantId !== input.tenantId || messageProviderChannel(policy.provider) !== policy.channel || policies.has(policy.contactId)) throw new Error('SATISFACTION_POLICY_INVALID');
    policies.set(policy.contactId, structuredClone(policy));
  }
  const existing = new Set(input.existingIdempotencyKeys ?? []);
  const seenOrders = new Map<string, { contactId: string; deliveredAt: number }>();
  const eligible = new Map<string, { policy: SatisfactionContactPolicy; orderIds: string[] }>();
  const skipped: SatisfactionAudienceResult['skipped'] = [];
  for (const delivery of input.deliveries) {
    if (delivery.tenantId !== input.tenantId || delivery.state !== 'DELIVERED' || !validId(delivery.orderId) || !validId(delivery.contactId)) throw new Error('SATISFACTION_DELIVERY_INVALID');
    const owner = seenOrders.get(delivery.orderId);
    const deliveredAt = Date.parse(delivery.deliveredAt);
    if (!Number.isFinite(deliveredAt)) throw new Error('SATISFACTION_DELIVERY_DATE_INVALID');
    if (owner && owner.contactId !== delivery.contactId) throw new Error('SATISFACTION_ORDER_IDENTITY_CONFLICT');
    if (owner && owner.deliveredAt !== deliveredAt) throw new Error('SATISFACTION_DELIVERY_EVIDENCE_CONFLICT');
    if (owner) continue;
    seenOrders.set(delivery.orderId, { contactId: delivery.contactId, deliveredAt });
    if (dayInZone(delivery.deliveredAt, input.timeZone) !== input.businessDate) { skipped.push({ contactId: delivery.contactId, orderId: delivery.orderId, reason: 'OUTSIDE_DAY' }); continue; }
    const policy = policies.get(delivery.contactId);
    if (!policy) { skipped.push({ contactId: delivery.contactId, orderId: delivery.orderId, reason: 'POLICY_MISSING' }); continue; }
    if (policy.blocked) { skipped.push({ contactId: delivery.contactId, orderId: delivery.orderId, reason: 'BLOCKED' }); continue; }
    if (policy.operationalConsent !== 'ALLOWED') { skipped.push({ contactId: delivery.contactId, orderId: delivery.orderId, reason: 'CONSENT_REQUIRED' }); continue; }
    if (!policy.channelAvailable) { skipped.push({ contactId: delivery.contactId, orderId: delivery.orderId, reason: 'CHANNEL_UNAVAILABLE' }); continue; }
    const group = eligible.get(delivery.contactId) ?? { policy, orderIds: [] };
    group.orderIds.push(delivery.orderId); eligible.set(delivery.contactId, group);
  }
  const entries: SatisfactionAudienceEntry[] = [];
  for (const [contactId, group] of [...eligible.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const idempotencyKey = `SATISFACTION:${input.tenantId}:${input.businessDate}:${contactId}`;
    if (existing.has(idempotencyKey)) { for (const orderId of group.orderIds) skipped.push({ contactId, orderId, reason: 'ALREADY_PREPARED' }); continue; }
    entries.push({ idempotencyKey, tenantId: input.tenantId, businessDate: input.businessDate, contactId, orderIds: [...group.orderIds].sort(), channel: group.policy.channel, provider: group.policy.provider, status: 'DRAFT_ONLY', canSend: false });
  }
  return { entries, skipped };
}
