import { validateCommand, type OperationalCommand } from './productionOrders';

/** Only a storage rejection proved before writes may release an uncertain command. */
export class ProductionCommandRejected extends Error {}
export interface ProductionCommandReply { revision: number; replay: boolean }
export interface ProductionCommandContext { tenantId: string; actor: string }

export class ProductionCommandRecovery {
  private command: OperationalCommand | null = null;
  private inFlight = false;
  private listeners = new Set<() => void>();

  constructor(
    private readonly execute: (command: OperationalCommand) => Promise<ProductionCommandReply>,
    private readonly context: () => ProductionCommandContext,
  ) {}

  get pending() { return this.command ? structuredClone(this.command) : null; }
  get busy() { return this.inFlight; }
  get blocked() { return this.inFlight || this.command !== null; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish() { for (const listener of this.listeners) listener(); }

  async submit(command: OperationalCommand) {
    if (this.blocked) throw new Error('PRODUCTION_COMMAND_PENDING');
    validateCommand(command);
    this.checkContext(command);
    this.command = structuredClone(command);
    return this.send();
  }

  async retry() {
    if (!this.command || this.inFlight) throw new Error('PRODUCTION_COMMAND_PENDING');
    return this.send();
  }

  private checkContext(command: OperationalCommand) {
    const current = this.context();
    if (command.actor !== current.actor || command.tenantId !== current.tenantId) throw new Error('PRODUCTION_COMMAND_CONTEXT_CHANGED');
  }

  private async send() {
    const command = structuredClone(this.command!);
    this.checkContext(command);
    this.inFlight = true;
    this.publish();
    try {
      const reply = await this.execute(structuredClone(command));
      this.checkContext(command);
      if (!reply || reply.revision !== command.expectedRevision + 1 || typeof reply.replay !== 'boolean') throw new Error('PRODUCTION_COMMAND_REPLY_INVALID');
      this.command = null;
      return reply;
    } catch (error) {
      // Plain errors, including transport failures, never imply that the write failed.
      if (error instanceof ProductionCommandRejected) this.command = null;
      throw error;
    } finally {
      this.inFlight = false;
      this.publish();
    }
  }
}
