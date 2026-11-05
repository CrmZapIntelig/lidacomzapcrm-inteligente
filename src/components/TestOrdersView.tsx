import React, { useEffect, useRef, useState } from 'react';
import type { TestOrderClient, TestOrderRow } from '../application/testOrderAccess';
import { TestOrderScreen } from '../application/testOrderScreen';
import type { TestOrderScreenState } from '../application/testOrderScreen';
import { renderPrintSnapshot } from '../application/operationsFinance';

const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const orderLabels = { DRAFT: 'Em revisão', CONFIRMED: 'Confirmado', CANCELED: 'Cancelado' };
const paymentLabels = { PENDING: 'Pendente', RECEIVED: 'Recebido', REFUNDED: 'Estornado' };
const productionLabels = { WAITING: 'Aguardando', PREPARING: 'Em preparo', READY: 'Pronto' };
const deliveryLabels = { NOT_APPLICABLE: 'Não iniciada', READY: 'Aguardando entregador', ASSIGNED: 'Entregador atribuído', IN_TRANSIT: 'Em entrega', DELIVERED: 'Entregue' };
const methodLabels = { PIX: 'Pix', DINHEIRO: 'Dinheiro', DEBITO: 'Débito', CREDITO: 'Crédito', NOTA: 'NOTA' };
const buttonClass = 'rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed';

export function TestOrderTable({ orders, locked, onConfirm, onProduction, onPrint }: {
  orders: TestOrderRow[]; locked: boolean; onConfirm: (id: string) => void;
  onProduction: (order: TestOrderRow) => void; onPrint: (id: string) => void;
}) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
    <table className="w-full text-left text-sm"><caption className="sr-only">Pedidos canônicos de teste e seus estados independentes</caption>
      <thead className="bg-slate-50 dark:bg-slate-800 text-xs"><tr>{['Pedido e cliente', 'Itens e valor', 'Pedido', 'Pagamento', 'Produção', 'Entrega', 'Ações'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
      <tbody>{orders.map(order => <tr key={order.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
        <td className="p-4 min-w-48"><p className="font-mono text-xs break-all">{order.id}</p><p className="font-semibold mt-1">{order.customerName}</p><p className="text-xs text-slate-500">{order.channel === 'NONE' ? 'Cardápio / balcão' : order.channel} · {order.provider ?? 'Sem provedor'}</p></td>
        <td className="p-4 min-w-48"><ul>{order.items.map(item => <li key={item.id}>{item.quantity} × {item.name} <span className="text-slate-500">({item.size})</span></li>)}</ul><p className="font-bold mt-2">{money(order.totalCents)}</p></td>
        <td className="p-4 whitespace-nowrap">{orderLabels[order.orderState]}</td>
        <td className="p-4 whitespace-nowrap"><p>{paymentLabels[order.paymentState]}</p><p className="text-xs text-slate-500">{methodLabels[order.method]}</p><p className="text-xs">Recebido: {money(order.receivedCents)}</p></td>
        <td className="p-4 whitespace-nowrap">{order.orderState === 'DRAFT' ? 'Aguardando confirmação' : order.orderState === 'CANCELED' ? 'Cancelada' : productionLabels[order.productionState]}</td>
        <td className="p-4 whitespace-nowrap">{order.modality === 'PICKUP' ? 'Retirada' : order.modality === 'TABLE' ? 'Mesa' : deliveryLabels[order.deliveryState]}</td>
        <td className="p-4"><div className="flex flex-col gap-2 min-w-36">
          {order.actions.includes('CONFIRM') && <button type="button" className={buttonClass} disabled={locked} onClick={() => onConfirm(order.id)}>Confirmar pedido TEST</button>}
          {order.actions.includes('PRODUCTION') && <button type="button" className={buttonClass} disabled={locked} onClick={() => onProduction(order)}>{order.productionState === 'WAITING' ? 'Iniciar preparo TEST' : 'Marcar pronto TEST'}</button>}
          {order.canPrint && <button type="button" className={buttonClass} disabled={locked} onClick={() => onPrint(order.id)}>Ver documento</button>}
          {!order.actions.includes('CONFIRM') && !order.actions.includes('PRODUCTION') && !order.canPrint && <span className="text-xs text-slate-500">Somente consulta</span>}
        </div></td>
      </tr>)}</tbody>
    </table>
    {!orders.length && <p className="p-8 text-center text-slate-500">Nenhum pedido de teste disponível.</p>}
  </div>;
}

export function TestOrdersView({ client }: { client: TestOrderClient }) {
  const [state, setState] = useState<TestOrderScreenState>({ orders: [], loading: true, busy: false, message: '', retryAvailable: false, document: null });
  const screen = useRef<TestOrderScreen | null>(null);
  useEffect(() => {
    const current = new TestOrderScreen(client); screen.current = current; setState(current.snapshot);
    const unsubscribe = current.subscribe(() => setState(current.snapshot)); void current.load();
    return () => { unsubscribe(); current.dispose(); screen.current = null; };
  }, [client]);
  const locked = state.busy || state.loading || state.retryAvailable;
  return <section className="space-y-5 font-sans text-slate-900 dark:text-slate-100" aria-label="Pedidos de teste">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Pedidos de teste</h2><p className="text-sm text-slate-500">O mesmo pedido acompanha atendimento, produção e entrega.</p></div><button type="button" className={buttonClass} disabled={locked} onClick={() => void screen.current?.load()}>Atualizar pedidos</button></div>
    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Ambiente de teste · dados fictícios. Não produzir, cobrar ou enviar mensagens.</p>
    {state.loading && <p role="status">Carregando pedidos de teste…</p>}
    {state.message && <p role="status" aria-live="polite" className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm">{state.message}</p>}
    {state.retryAvailable && <button type="button" className={buttonClass} disabled={state.busy} onClick={() => void screen.current?.retry()}>Repetir ação</button>}
    <TestOrderTable orders={state.orders} locked={locked} onConfirm={id => void screen.current?.execute(id, { kind: 'CONFIRM' })} onProduction={order => void screen.current?.execute(order.id, { kind: 'PRODUCTION', state: order.productionState === 'WAITING' ? 'PREPARING' : 'READY' })} onPrint={id => void screen.current?.print(id)} />
    {state.document && <div className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-semibold">Documento de teste · sem valor fiscal</h3><button type="button" className={buttonClass} onClick={() => screen.current?.closeDocument()}>Fechar documento</button></div><iframe title="Documento do pedido de teste" sandbox="" srcDoc={renderPrintSnapshot(state.document)} className="h-96 w-full rounded-xl border border-slate-200 bg-white" /></div>}
  </section>;
}
