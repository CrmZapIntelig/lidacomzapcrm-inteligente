import React from 'react';
import type { Order } from '../types';
import type { TestOrderClient } from '../application/testOrderAccess';
import { TestOrdersView } from './TestOrdersView';

/** The current CRM table is preserved; TEST transport is injected explicitly. */
export default function OrdersView({ orders, testClient }: { orders: Order[]; testClient?: TestOrderClient }) {
  if (testClient) return <div key={testClient.contextKey}><TestOrdersView client={testClient} /></div>;
  return (<div className="space-y-6 font-sans">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Relatório Geral de Pedidos</h2>
                <p className="text-sm text-slate-550 dark:text-slate-400">Ordens de serviço faturadas pelo operador no chat.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-805 border-b border-light-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Produtos Adquiridos</th>
                        <th className="py-3 px-4">Meio Pgto</th>
                        <th className="py-3 px-4">Total Ordem</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {orders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{ord.id}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-350">{ord.clientName}</td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate">{ord.items.map((i) => `${i.quantity}un. × ${i.productName}`).join(', ')}</td>
                          <td className="py-3.5 px-4 font-mono">{ord.paymentMethod}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-505 text-emerald-500">R$ {ord.total.toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            {ord.status === 'Pago' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                PAGO
                              </span>
                            ) : ord.status === 'Cancelado' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                CANCELADO
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                PENDENTE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>);
}
