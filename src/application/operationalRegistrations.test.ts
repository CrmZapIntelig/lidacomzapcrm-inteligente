import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRegistrationPort } from './operationalRegistrations';
test('local registrations retain tenant/type identity, revisions and immutable returned snapshots', () => {
  const port = new MemoryRegistrationPort();
  const record = { id: 'demo-1', tenantId: 'demo-tenant', kind: 'CLIENT' as const, name: 'Cliente Demo', mode: 'SIMULATION' as const, revision: 0 };
  const saved = port.save(record, 0); saved.name = 'Changed';
  assert.equal(port.list('demo-tenant', 'CLIENT')[0].name, 'Cliente Demo');
  assert.equal(port.list('demo-other', 'CLIENT').length, 0);
  assert.throws(() => port.save(record, 0), /REVISION/);
  assert.equal(port.save({ ...record, revision: 1, name: 'Cliente Editado Demo' }, 1).revision, 2);
  port.save({ ...record, kind: 'COURIER', name: 'Entregador Demo' }, 0);
  assert.equal(port.list('demo-tenant', 'COURIER').length, 1);
  assert.throws(() => port.save({ ...record, mode: 'LIVE' } as never, 0), /DEMO/);
});
