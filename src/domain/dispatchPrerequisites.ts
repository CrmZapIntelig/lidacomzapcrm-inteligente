import type { CommunicationChannel, ContactChannelIdentity, ProviderCapabilities } from './omnichannel';
import type { DispatchQueueStatus } from './types';
import { businessKey, required, timestamp, isChannelProviderCompatible } from './offlinePrimitives';

export interface MarketingAudience { id: string; tenantId: string; marketingCampaignId: string; rationale: string; contactIds: readonly string[] }
export interface DispatchAudienceSnapshot { id: string; tenantId: string; campaignId: string; marketingCampaignId?: string; sourceAudienceId: string; revision: string; contactIds: readonly string[]; capturedAt: string }
export function captureDispatchAudience(input: DispatchAudienceSnapshot): DispatchAudienceSnapshot {
  [input.id, input.tenantId, input.campaignId, input.sourceAudienceId, input.revision].forEach(required);
  if (input.marketingCampaignId) required(input.marketingCampaignId);
  timestamp(new Date(input.capturedAt)); input.contactIds.forEach(required);
  return { ...input, contactIds: [...new Set(input.contactIds)] };
}
export interface EligibilityEvidence {
  tenantId: string; contactId: string; phone: string;
  blocked: boolean; optedOut: boolean; group: boolean;
  consent: 'ALLOWED' | 'DENIED' | 'UNKNOWN';
  preferredChannel: CommunicationChannel | 'ANY' | 'PHONE' | 'NONE' | 'UNKNOWN';
  lastCommercialAt?: string;
  alreadyPrepared: boolean;
  identity: ContactChannelIdentity;
  capability?: ProviderCapabilities;
  templateApprovedForOffline: boolean;
}
export interface EligibilityPolicy { tenantId: string; minimumIntervalMs: number; evaluatedAt: Date }
export function evaluateDispatchEligibility(e: EligibilityEvidence, p: EligibilityPolicy) {
  timestamp(p.evaluatedAt); required(p.tenantId);
  if (!Number.isFinite(p.minimumIntervalMs) || p.minimumIntervalMs < 0) throw new Error('INVALID_FREQUENCY_POLICY');
  const reasons: string[] = [];
  if (e.tenantId !== p.tenantId || e.identity.tenantId !== p.tenantId || e.identity.contactId !== e.contactId) reasons.push('CONTEXT_MISMATCH');
  if (!/^\+[1-9]\d{7,14}$/.test(e.phone) || e.identity.address !== e.phone) reasons.push('INVALID_PHONE');
  if (e.blocked || e.group) reasons.push('BLOCKED');
  if (e.optedOut) reasons.push('OPTED_OUT');
  if (e.consent !== 'ALLOWED') reasons.push('CONSENT_NOT_ALLOWED');
  if (!['ANY', 'UNKNOWN', e.identity.channel].includes(e.preferredChannel)) reasons.push('CHANNEL_NOT_PREFERRED');
  if (e.alreadyPrepared) reasons.push('DUPLICATE_PREPARATION');
  if (e.lastCommercialAt !== undefined) {
    const last = Date.parse(e.lastCommercialAt);
    if (!Number.isFinite(last) || p.evaluatedAt.getTime() - last < p.minimumIntervalMs) reasons.push('COMMERCIAL_FREQUENCY');
  }
  if (e.identity.availability !== 'KNOWN_AVAILABLE' || e.identity.eligibility !== 'ELIGIBLE') reasons.push('CHANNEL_NOT_AVAILABLE_OR_ELIGIBLE');
  if (!e.identity.provider || !isChannelProviderCompatible(e.identity.channel, e.identity.provider) || !e.capability || e.capability.provider !== e.identity.provider || e.capability.channel !== e.identity.channel || !e.capability.capabilities.includes('TEXT') || e.capability.source === 'UNKNOWN' || !Number.isFinite(e.capability.observedAt.getTime()) || e.capability.observedAt.getTime() > p.evaluatedAt.getTime()) reasons.push('CAPABILITY_NOT_EVIDENCED');
  if (!e.templateApprovedForOffline) reasons.push('TEMPLATE_NOT_APPROVED');
  return { eligibleForPreparation: reasons.length === 0, canSend: false as const, window: 'NOT_EVALUATED' as const, reasons };
}
export interface DispatchBudgetPolicy { tenantId: string; campaignId: string; dailyLimit: number; timeZone: string }
export interface DailyDispatchBudget { tenantId: string; campaignId: string; day: string; timeZone: string; entryKeys: readonly string[] }
export function budgetDay(at: Date, timeZone: string): string {
  timestamp(at);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-');
}
export function consumeBudget(budgets: readonly DailyDispatchBudget[], policy: DispatchBudgetPolicy, at: Date, entryKey: string) {
  [policy.tenantId, policy.campaignId, entryKey].forEach(required);
  if (!Number.isInteger(policy.dailyLimit) || policy.dailyLimit < 1) throw new Error('INVALID_DAILY_LIMIT');
  const day = budgetDay(at, policy.timeZone);
  if (budgets.some(b => b.tenantId === policy.tenantId && b.campaignId === policy.campaignId && b.timeZone !== policy.timeZone)) throw new Error('BUDGET_TIME_ZONE_CHANGED');
  const matches = budgets.filter(b => b.tenantId === policy.tenantId && b.campaignId === policy.campaignId && b.day === day);
  if (matches.length > 1) throw new Error('DUPLICATE_BUDGET_WINDOW');
  const current = matches[0] ?? { ...policy, day, entryKeys: [] };
  const duplicate = current.entryKeys.includes(entryKey);
  const allowed = duplicate || new Set(current.entryKeys).size < policy.dailyLimit;
  const next = allowed && !duplicate ? { ...current, entryKeys: [...current.entryKeys, entryKey] } : { ...current, entryKeys: [...current.entryKeys] };
  return { allowed, duplicate, budgets: [...budgets.filter(b => b !== matches[0]).map(b => ({ ...b, entryKeys: [...b.entryKeys] })), next] };
}
export interface OfflineQueueEntry { id: string; tenantId: string; campaignId: string; contactId: string; position: number; status: DispatchQueueStatus; idempotencyKey: string; attempts: number; createdAt: string; ownerId?: string; leaseExpiresAt?: string; nextAttemptAt?: string }
export interface OfflineDispatchQueue { tenantId: string; campaignId: string; entries: readonly OfflineQueueEntry[] }
export function appendAudience(queue: OfflineDispatchQueue, audience: DispatchAudienceSnapshot): OfflineDispatchQueue {
  if (queue.tenantId !== audience.tenantId || queue.campaignId !== audience.campaignId) throw new Error('AUDIENCE_CONTEXT_MISMATCH');
  const snapshot = captureDispatchAudience(audience);
  validateQueue(queue);
  const entries = queue.entries.map(e => ({ ...e }));
  let position = entries.reduce((max, e) => Math.max(max, e.position), 0);
  for (const contactId of snapshot.contactIds) {
    const key = businessKey(queue.tenantId, queue.campaignId, contactId);
    if (entries.some(e => e.idempotencyKey === key)) continue;
    entries.push({ id: `queue:${key}`, idempotencyKey: key, tenantId: queue.tenantId, campaignId: queue.campaignId, contactId, position: ++position, status: 'QUEUED', attempts: 0, createdAt: snapshot.capturedAt });
  }
  return { ...queue, entries };
}
export function validateQueue(queue: OfflineDispatchQueue): void {
  required(queue.tenantId); required(queue.campaignId);
  const ids = new Set<string>(), positions = new Set<number>(), keys = new Set<string>();
  for (const e of queue.entries) {
    if (e.tenantId !== queue.tenantId || e.campaignId !== queue.campaignId || e.id !== `queue:${businessKey(e.tenantId, e.campaignId, e.contactId)}` || e.idempotencyKey !== businessKey(e.tenantId, e.campaignId, e.contactId) || ids.has(e.id) || keys.has(e.idempotencyKey) || positions.has(e.position) || !Number.isInteger(e.position) || e.position < 1 || !Number.isInteger(e.attempts) || e.attempts < 0 || !['QUEUED', 'DRAFT_PREPARED', 'SENT', 'REPLIED', 'FAILED', 'SKIPPED'].includes(e.status)) throw new Error('QUEUE_COLLISION_OR_INVALID_RECORD');
    timestamp(new Date(e.createdAt));
    if ((e.ownerId === undefined) !== (e.leaseExpiresAt === undefined)) throw new Error('INVALID_LEASE');
    if (e.leaseExpiresAt) timestamp(new Date(e.leaseExpiresAt));
    if (e.nextAttemptAt) timestamp(new Date(e.nextAttemptAt));
    ids.add(e.id); keys.add(e.idempotencyKey); positions.add(e.position);
  }
}
// OutboundQueue reserve/lease semantics adapted separately from commercial statuses.
export function reserveEntry(queue: OfflineDispatchQueue, entryId: string, ownerId: string, at: Date, leaseMs: number) {
  validateQueue(queue); required(ownerId); timestamp(at);
  if (!Number.isFinite(leaseMs) || leaseMs <= 0) throw new Error('INVALID_LEASE');
  let reserved = false;
  const entries = queue.entries.map(e => {
    if (e.id !== entryId || e.status !== 'QUEUED' || (e.leaseExpiresAt && Date.parse(e.leaseExpiresAt) > at.getTime()) || (e.nextAttemptAt && Date.parse(e.nextAttemptAt) > at.getTime())) return { ...e };
    reserved = true;
    return { ...e, ownerId, leaseExpiresAt: new Date(at.getTime() + leaseMs).toISOString(), nextAttemptAt: undefined, attempts: e.attempts + 1 };
  });
  return { reserved, queue: { ...queue, entries } };
}
export function calculateRetryDecision(input: { attempt: number; maxAttempts: number; baseDelayMs: number; maxDelayMs: number; retryable: boolean }) {
  if (!Number.isInteger(input.attempt) || input.attempt < 1 || !Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || !Number.isFinite(input.baseDelayMs) || input.baseDelayMs < 0 || !Number.isFinite(input.maxDelayMs) || input.maxDelayMs < 0) throw new Error('INVALID_RETRY_POLICY');
  const retry = input.retryable && input.attempt < input.maxAttempts;
  return { retry, delayMs: retry ? Math.min(input.maxDelayMs, input.baseDelayMs === 0 ? 0 : input.baseDelayMs * 2 ** (input.attempt - 1)) : null };
}
export function releaseEntry(queue: OfflineDispatchQueue, entryId: string, ownerId: string, at: Date, retry: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number; retryable: boolean }) {
  validateQueue(queue); timestamp(at); required(ownerId);
  const entry = queue.entries.find(e => e.id === entryId);
  if (!entry || entry.status !== 'QUEUED' || entry.ownerId !== ownerId || !entry.leaseExpiresAt || Date.parse(entry.leaseExpiresAt) <= at.getTime()) throw new Error('QUEUE_OWNER_OR_LEASE_MISMATCH');
  const decision = calculateRetryDecision({ ...retry, attempt: entry.attempts });
  return { ...queue, entries: queue.entries.map(e => e.id !== entryId ? { ...e } : { ...e, ownerId: undefined, leaseExpiresAt: undefined, status: decision.retry ? 'QUEUED' as const : 'FAILED' as const, nextAttemptAt: decision.retry ? new Date(at.getTime() + decision.delayMs!).toISOString() : undefined }) };
}
export function cancelEntry(queue: OfflineDispatchQueue, entryId: string): OfflineDispatchQueue {
  validateQueue(queue);
  const entry = queue.entries.find(e => e.id === entryId);
  if (!entry || !['QUEUED', 'DRAFT_PREPARED'].includes(entry.status)) throw new Error('INVALID_CANCELLATION');
  return { ...queue, entries: queue.entries.map(e => e.id === entryId ? { ...e, status: 'SKIPPED', ownerId: undefined, leaseExpiresAt: undefined } : { ...e }) };
}
/** JSON-compatible snapshot boundary. Persistence is caller-owned; no storage here. */
export function snapshotQueue(queue: OfflineDispatchQueue): OfflineDispatchQueue {
  validateQueue(queue);
  return { ...queue, entries: queue.entries.map(e => ({ ...e })) };
}
// Exact historical outbound graph; describes transport only and performs no delivery.
export type OutboundProcessingState = 'PREPARED' | 'QUEUED' | 'RESERVED' | 'SENDING' | 'PROVIDER_ACCEPTED' | 'DELIVERED' | 'READ' | 'FAILED_RETRYABLE' | 'FAILED_FINAL' | 'CANCELLED';
const transitions: Record<OutboundProcessingState, readonly OutboundProcessingState[]> = {
  PREPARED: ['QUEUED', 'CANCELLED'], QUEUED: ['RESERVED', 'CANCELLED'], RESERVED: ['SENDING', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'CANCELLED'], SENDING: ['PROVIDER_ACCEPTED', 'FAILED_RETRYABLE', 'FAILED_FINAL'], PROVIDER_ACCEPTED: ['DELIVERED', 'FAILED_RETRYABLE', 'FAILED_FINAL'], DELIVERED: ['READ'], READ: [], FAILED_RETRYABLE: ['QUEUED', 'FAILED_FINAL', 'CANCELLED'], FAILED_FINAL: [], CANCELLED: [],
};
export function transitionOutboundState(current: OutboundProcessingState, next: OutboundProcessingState): OutboundProcessingState {
  if (!transitions[current]?.includes(next)) throw new Error('INVALID_OUTBOUND_TRANSITION');
  return next;
}
