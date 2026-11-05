import type { ChannelProvider, CommunicationChannel } from './omnichannel';

export const messageWorkflows = ['SERVICE', 'ACTIVE_SALES', 'MARKETING', 'CAMPAIGN', 'AUTOMATION'] as const;
export type MessageWorkflow = typeof messageWorkflows[number];
export interface MessageChannelDefinition {
  id: string;
  label: string;
  channel: string;
  /** Only a known adapter may enter the current preparation engine. */
  provider?: ChannelProvider;
}
export const messageChannelCatalog: readonly Readonly<MessageChannelDefinition>[] = Object.freeze([
  Object.freeze({ id: 'meta', label: 'WhatsApp · Meta oficial', channel: 'WHATSAPP', provider: 'WHATSAPP_META_OFFICIAL' as const }),
  Object.freeze({ id: 'evolution', label: 'WhatsApp · Evolution', channel: 'WHATSAPP', provider: 'WHATSAPP_EVOLUTION_OPTIONAL' as const }),
  Object.freeze({ id: 'rcs', label: 'RCS', channel: 'RCS', provider: 'RCS_GOOGLE' as const }),
]);
/** Shared across all workflows. Future catalog entries do not acquire a working adapter. */
export function messageChannelOptions(workflow: MessageWorkflow, future: readonly MessageChannelDefinition[] = []) {
  if (!(messageWorkflows as readonly string[]).includes(workflow)) throw new Error('UNKNOWN_MESSAGE_WORKFLOW');
  const ids = new Set(messageChannelCatalog.map(d => d.id));
  for (const d of future) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(d.id) || !d.label.trim() || !d.channel.trim() || ids.has(d.id) || d.provider !== undefined) throw new Error('INVALID_FUTURE_CHANNEL');
    ids.add(d.id);
  }
  return [...messageChannelCatalog, ...future].map(d => ({ ...d, workflow, canSend: false as const,
    preparationAvailable: d.provider !== undefined, reason: d.provider ? 'CONNECTION_AND_POLICY_REQUIRED' : 'ADAPTER_REQUIRED' }));
}
export function messageProviderChannel(provider: ChannelProvider): CommunicationChannel {
  const found = messageChannelCatalog.find(d => d.provider === provider);
  if (!found) throw new Error('UNKNOWN_MESSAGE_PROVIDER');
  return found.channel as CommunicationChannel;
}
