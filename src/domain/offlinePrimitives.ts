import type { ContactChannelIdentity, ProviderCapabilities, ChannelProvider, CommunicationChannel } from './omnichannel';

// Selectively adapted from Gestão src/domain/omnichannel.ts, tree 0b13ef1.
export function required(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) throw new Error('INVALID_ID');
  return value;
}
export function timestamp(at: Date): number {
  if (!(at instanceof Date) || !Number.isFinite(at.getTime())) throw new Error('INVALID_DATE');
  return at.getTime();
}
export function businessKey(...parts: string[]): string {
  return parts.map(part => `${required(part).length}:${part}`).join('|');
}
export function isChannelProviderCompatible(channel: CommunicationChannel, provider: ChannelProvider): boolean {
  return channel === 'RCS' ? provider === 'RCS_GOOGLE' : channel === 'WHATSAPP' && ['WHATSAPP_META_OFFICIAL', 'WHATSAPP_EVOLUTION_OPTIONAL'].includes(provider);
}
export function createContactChannelIdentity(input: Omit<ContactChannelIdentity, 'availability' | 'availabilitySource' | 'eligibility'> & Partial<Pick<ContactChannelIdentity, 'availability' | 'availabilitySource' | 'eligibility'>>): ContactChannelIdentity {
  [input.id, input.tenantId, input.contactId, input.address].forEach(required);
  if (!['WHATSAPP', 'RCS'].includes(input.channel) || (input.provider && !isChannelProviderCompatible(input.channel, input.provider))) throw new Error('INVALID_CHANNEL_PROVIDER');
  return { ...input, availability: input.availability ?? 'UNKNOWN', availabilitySource: input.availabilitySource ?? 'UNKNOWN', eligibility: input.eligibility ?? 'UNKNOWN', createdAt: new Date(timestamp(input.createdAt)), updatedAt: new Date(timestamp(input.updatedAt)), lastCapabilityCheckAt: input.lastCapabilityCheckAt && new Date(timestamp(input.lastCapabilityCheckAt)) };
}
export function createProviderCapabilities(input: Omit<ProviderCapabilities, 'capabilities' | 'source'> & Partial<Pick<ProviderCapabilities, 'capabilities' | 'source'>>): ProviderCapabilities {
  if (!isChannelProviderCompatible(input.channel, input.provider)) throw new Error('INVALID_CHANNEL_PROVIDER');
  return { ...input, capabilities: [...(input.capabilities ?? [])], source: input.source ?? 'UNKNOWN', observedAt: new Date(timestamp(input.observedAt)) };
}
