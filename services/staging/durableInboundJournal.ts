import { LocalInboundJournal } from '../messaging/localInboundJournal';
import type { Journal } from '../messaging/localInboundJournal';

/** Async persistence port. Implementations must atomically retry the entire callback. */
export interface AtomicJsonPort {
  transaction<T>(update: (current: string | undefined) => { value: string; result: T }): Promise<T>;
}

/** Same tested ingress/worker rules, with an explicitly injected distributed store.
 * Default admission remains SIMULATION-only. Explicit TEST subclasses must
 * override validation and execution mode; persistence/queue semantics are shared. */
export class StagingDurableInboundJournal extends LocalInboundJournal {
  constructor(private readonly port: AtomicJsonPort, tenantId: string, accountId: string) {
    super('.', tenantId, accountId); // No filesystem operation: transaction is overridden.
  }
  protected override async transaction<T>(fn: (journal: Journal) => T): Promise<T> {
    return this.port.transaction(current => {
      const journal = current === undefined ? this.fresh() : this.restore(JSON.parse(current) as Journal);
      const result = fn(journal);
      for (const audit of journal.audit) if (audit.reason === 'DURABLE_LOCAL_ADMISSION') audit.reason = this.executionMode === 'STAGING' ? 'DURABLE_STAGING_META_TEST_ADMISSION' : 'DURABLE_STAGING_FIXTURE_ADMISSION';
      if (journal.work.length > 200 || journal.audit.length > 1000) throw new Error('STAGING_FIXTURE_CAPACITY');
      const value = JSON.stringify(journal);
      if (Buffer.byteLength(value, 'utf8') > 256 * 1024) throw new Error('STAGING_DOCUMENT_CAPACITY');
      return { value, result: structuredClone(result) };
    });
  }
}
