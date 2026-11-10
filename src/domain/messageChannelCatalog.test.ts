import test from 'node:test';
import assert from 'node:assert/strict';
import { messageChannelOptions, messageProviderChannel, messageWorkflows } from './messageChannelCatalog';
import type { ChannelProvider } from './omnichannel';
test('every messaging workflow offers the same three providers, without send authority', () => {
  for (const workflow of messageWorkflows) {
    const options = messageChannelOptions(workflow);
    assert.deepEqual(options.map(o => o.id), ['meta', 'evolution', 'rcs']);
    assert.ok(options.every(o => o.preparationAvailable && !o.canSend));
  }
});
test('future connections can join the catalog without impersonating a configured adapter', () => {
  const options = messageChannelOptions('MARKETING', [{ id: 'future-demo', label: 'Conexão de teste', channel: 'FUTURE' }]);
  assert.equal(options[3].preparationAvailable, false); assert.equal(options[3].reason, 'ADAPTER_REQUIRED');
  assert.equal(options[3].canSend, false);
  assert.throws(() => messageProviderChannel('future-demo' as ChannelProvider));
  for (const patch of [{ id: 'meta' }, { id: 'bad/id' }, { provider: 'RCS_GOOGLE' as const }]) assert.throws(() => messageChannelOptions('SERVICE', [{ id: 'future-demo', label: 'Futuro', channel: 'FUTURE', ...patch }]));
});
test('catalog consumers cannot mutate the next workflow options', () => {
  const first = messageChannelOptions('CAMPAIGN'); first[0].label = 'Changed';
  assert.equal(messageChannelOptions('AUTOMATION')[0].label, 'WhatsApp · Meta oficial');
});
