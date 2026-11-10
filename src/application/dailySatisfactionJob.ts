import { prepareDailySatisfactionAudience, validSatisfactionDay, type DeliveredOrderFact, type SatisfactionContactPolicy, type SatisfactionAudienceEntry } from './dailySatisfactionAudience';
import { satisfactionBusinessDate } from './dailySatisfactionPresentation';

export interface SatisfactionJobScope { tenantId: string; businessDate: string; timeZone: string }
export interface SatisfactionJobPort {
  /** Bound by a trusted server adapter, never by a request-supplied tenant alone. */
  readonly tenantId: string;
  load(scope: SatisfactionJobScope): Promise<{ deliveries: readonly DeliveredOrderFact[]; policies: readonly SatisfactionContactPolicy[] }>;
  /** Must atomically create-if-absent per tenant/day/contact key. Retries may overlap. */
  persist(entries: readonly SatisfactionAudienceEntry[]): Promise<{ created: number; replayed: number }>;
}

/** Server orchestration only. No scheduler is registered and no provider can send from this port. */
export async function runDailySatisfactionJob(input: SatisfactionJobScope & { enabled?: boolean; now: string }, port: SatisfactionJobPort) {
  if (input.enabled !== true) return { status: 'DISABLED' as const, created: 0, replayed: 0, canSend: false as const };
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(input.tenantId) || input.tenantId !== port.tenantId || !validSatisfactionDay(input.businessDate)) throw new Error('SATISFACTION_JOB_SCOPE_INVALID');
  const today = satisfactionBusinessDate(input.now, input.timeZone);
  if (input.businessDate >= today) throw new Error('SATISFACTION_JOB_DAY_NOT_CLOSED');
  const scope = { tenantId: input.tenantId, businessDate: input.businessDate, timeZone: input.timeZone };
  const data = await port.load(scope);
  // Do not skip keys from an earlier read: concurrent retry safety belongs to atomic persistence.
  const audience = prepareDailySatisfactionAudience({ ...scope, deliveries: data.deliveries, policies: data.policies });
  const result = audience.entries.length ? await port.persist(audience.entries) : { created: 0, replayed: 0 };
  if (!Number.isSafeInteger(result.created) || !Number.isSafeInteger(result.replayed) || result.created < 0 || result.replayed < 0 || result.created + result.replayed !== audience.entries.length) throw new Error('SATISFACTION_JOB_PERSISTENCE_RESULT_INVALID');
  return { status: 'PREPARED' as const, ...scope, ...result, skipped: audience.skipped, canSend: false as const };
}
