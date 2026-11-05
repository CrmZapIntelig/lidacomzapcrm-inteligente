import { useEffect, useMemo, useState } from 'react';
import type { Client } from '../types';
import type { OperationalSnapshot } from '../application/productionOrders';
import { prepareDailySatisfactionAudience } from '../application/dailySatisfactionAudience';
import { buildSatisfactionOperationalInput, satisfactionBusinessDate, type SatisfactionWhatsAppProvider } from '../application/dailySatisfactionPresentation';
import { persistDailySatisfactionAudience, watchDailySatisfactionAudience, type PersistedSatisfactionAudience, PRODUCTION_TENANT } from '../lib/productionStore';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700';
const field = 'w-full rounded-lg border border-slate-300 p-2 bg-transparent dark:border-slate-600';
const button = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800';
const localBusinessDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

interface Props { orders: readonly OperationalSnapshot[]; clients: readonly Client[]; disabled: boolean }

export default function ProductionSatisfactionView({ orders, clients, disabled }: Props) {
  const [businessDate, setBusinessDate] = useState(localBusinessDate);
  const [mode, setMode] = useState<'BATCH' | 'INDIVIDUAL'>('BATCH');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [whatsappProvider, setWhatsappProvider] = useState<SatisfactionWhatsAppProvider>('WHATSAPP_META_OFFICIAL');
  const [audiences, setAudiences] = useState<PersistedSatisfactionAudience[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const operational = useMemo(() => buildSatisfactionOperationalInput({ tenantId: PRODUCTION_TENANT, orders, clients, whatsappProvider }), [orders, clients, whatsappProvider]);
  const datedDeliveries = useMemo(() => operational.deliveries.filter(item => satisfactionBusinessDate(item.deliveredAt, 'America/Sao_Paulo') === businessDate), [operational.deliveries, businessDate]);
  const deliveredContacts = useMemo(() => [...new Set(datedDeliveries.map(item => item.contactId))].sort(), [datedDeliveries]);
  useEffect(() => { if (!selectedContactId || !deliveredContacts.includes(selectedContactId)) setSelectedContactId(deliveredContacts[0] ?? ''); }, [deliveredContacts, selectedContactId]);
  useEffect(() => { setAudiences([]); setError(''); if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) { setError('Informe uma data operacional válida.'); return; } try { return watchDailySatisfactionAudience(businessDate, setAudiences, setError); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a pesquisa.'); } }, [businessDate]);

  async function prepare() {
    if (busy || disabled) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const deliveries = mode === 'INDIVIDUAL' ? datedDeliveries.filter(item => item.contactId === selectedContactId) : datedDeliveries;
      if (mode === 'INDIVIDUAL' && !selectedContactId) throw new Error('Selecione um contato entregue.');
      const result = prepareDailySatisfactionAudience({ tenantId: PRODUCTION_TENANT, businessDate, timeZone: 'America/Sao_Paulo', deliveries, policies: operational.policies, existingIdempotencyKeys: audiences.map(item => item.idempotencyKey) });
      const persisted = await persistDailySatisfactionAudience(result.entries);
      const reasons = new Map<string, number>();
      for (const skipped of result.skipped) reasons.set(skipped.reason, (reasons.get(skipped.reason) ?? 0) + 1);
      const skippedSummary = [...reasons].map(([reason, count]) => `${reason}: ${count}`).join(' · ');
      setNotice(`${persisted.created} rascunho(s) preparado(s); ${persisted.replayed} já existente(s).${skippedSummary ? ` Ignorados: ${skippedSummary}.` : ''}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível preparar a pesquisa.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <section className={panel + ' space-y-4'}>
      <div><h3 className="text-lg font-bold">Pesquisa de satisfação do dia</h3><p className="text-sm text-slate-500">Prepara uma lista revisável dos pedidos com entrega comprovada. Não envia WhatsApp ou RCS.</p></div>
      <div className="grid md:grid-cols-3 gap-3">
        <label>Data operacional<input className={field} type="date" value={businessDate} onChange={event => setBusinessDate(event.target.value)} /></label>
        <label>Modo<select className={field} value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="BATCH">Lote do dia</option><option value="INDIVIDUAL">Contato individual</option></select></label>
        <label>Provedor WhatsApp para o rascunho<select className={field} value={whatsappProvider} onChange={event => setWhatsappProvider(event.target.value as SatisfactionWhatsAppProvider)}><option value="WHATSAPP_META_OFFICIAL">Meta oficial</option><option value="WHATSAPP_EVOLUTION_OPTIONAL">Evolution API opcional</option></select></label>
      </div>
      {mode === 'INDIVIDUAL' && <label>Contato entregue<select className={field} value={selectedContactId} onChange={event => setSelectedContactId(event.target.value)}><option value="">Selecione</option>{deliveredContacts.map(id => <option key={id} value={id}>{clients.find(client => client.id === id)?.name ?? id}</option>)}</select></label>}
      <div className="grid sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><strong>{datedDeliveries.length}</strong><br />entregas do dia com evidência</div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><strong>{deliveredContacts.length}</strong><br />contatos entregues no dia</div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><strong>{audiences.length}</strong><br />rascunhos já preparados</div>
        <div className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100"><strong>{operational.missingDeliveryEvidence.length}</strong><br />legados sem data comprovada</div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}
      <button className={button + ' bg-emerald-600 text-white'} disabled={disabled || busy || !datedDeliveries.length || mode === 'INDIVIDUAL' && !selectedContactId} onClick={() => void prepare()}>{busy ? 'Preparando…' : mode === 'BATCH' ? 'Preparar lote para revisão' : 'Preparar contato para revisão'}</button>
      <p className="text-xs text-slate-500">Consentimento operacional, bloqueio, canal disponível e duplicidade são avaliados novamente. O envio continua pertencendo ao Dispatch e exige uma autorização separada.</p>
    </section>
    <section className={panel}>
      <h3 className="font-bold mb-3">Rascunhos preparados</h3>
      {!audiences.length && <p className="text-sm text-slate-500">Nenhum rascunho preparado para esta data.</p>}
      <div className="space-y-2">{audiences.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex flex-wrap justify-between gap-2"><strong>{clients.find(client => client.id === item.contactId)?.name ?? item.contactId}</strong><span className="text-xs rounded-full bg-amber-100 px-2 py-1 text-amber-900">RASCUNHO — NÃO ENVIADO</span></div><p className="text-sm">{item.orderIds.length} pedido(s) · {item.channel} · {item.provider}</p></article>)}</div>
    </section>
  </div>;
}
