/** Local UX preparation only. Existing operational identities and collections are not replaced. */
export type RegistrationKind = 'CLIENT' | 'COURIER' | 'PRODUCT' | 'TABLE' | 'PAYMENT_METHOD';
export interface DemoRegistration { id: string; tenantId: string; kind: RegistrationKind; name: string; mode: 'SIMULATION'; revision: number }
export class MemoryRegistrationPort {
  private records = new Map<string, DemoRegistration>();
  save(record: DemoRegistration, expectedRevision: number): DemoRegistration {
    if (record.mode !== 'SIMULATION' || !/^demo-[\w-]+$/.test(record.id) || !/^demo-[\w-]+$/.test(record.tenantId) || !record.name.includes('Demo') || !['CLIENT', 'COURIER', 'PRODUCT', 'TABLE', 'PAYMENT_METHOD'].includes(record.kind)) throw new Error('DEMO_REGISTRATION_REQUIRED');
    const key = JSON.stringify([record.tenantId, record.kind, record.id]);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (this.records.get(key)?.revision ?? 0) || record.revision !== expectedRevision) throw new Error('REGISTRATION_REVISION_CONFLICT');
    const result = { ...record, revision: expectedRevision + 1 };
    this.records.set(key, result); return { ...result };
  }
  list(tenantId: string, kind: RegistrationKind): DemoRegistration[] {
    return [...this.records.values()].filter(r => r.tenantId === tenantId && r.kind === kind).map(r => ({ ...r }));
  }
}
