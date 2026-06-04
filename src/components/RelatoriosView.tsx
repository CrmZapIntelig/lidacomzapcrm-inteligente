/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Flame, Layers, Award } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Client, Order, Campaign } from '../types';

interface RelatoriosViewProps {
  clients: Client[];
  orders: Order[];
  campaigns: Campaign[];
}

export default function RelatoriosView({ clients, orders, campaigns }: RelatoriosViewProps) {
  // Sort clients by volume spend to establish high end ranking
  const topPurchasers = [...clients]
    .filter((c) => c.totalBought > 0)
    .sort((a, b) => b.totalBought - a.totalBought)
    .slice(0, 5);

  // Calculate stats
  const activeClients = clients.filter((c) => c.stage !== 'Fechado').length;
  const closedSalesCount = orders.filter((o) => o.status === 'Pago').length;
  const pendingSalesCount = orders.filter((o) => o.status === 'Pendente').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'Pago')
    .reduce((v, ord) => v + ord.total, 0);

  // Conversion rates (simulated stats)
  const statsLogData = [
    { name: 'Lead', contatos: clients.length },
    { name: 'Atend.', contatos: clients.filter((c) => c.stage === 'Em atendimento').length + 5 },
    { name: 'Pedido', contatos: orders.length },
    { name: 'Pago', contatos: closedSalesCount },
  ];

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Relatórios & BI</h2>
          <p className="text-sm text-slate-505 dark:text-slate-400 font-sans">
            Métricas compiladas sobre pipelines de conversão comercial, comportamento do WhatsApp e ranking dos maiores compradores.
          </p>
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <Users className="w-4 h-4 text-purple-500 text-purple-500" />
            <span>Leads Ativos</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{activeClients}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Volume Faturado</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">R$ {totalRevenue.toFixed(2)}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-500 text-emerald-505 text-emerald-500" />
            <span>Vendas Pagas</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{closedSalesCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Faturas Pendentes</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{pendingSalesCount}</span>
        </div>
      </div>

      {/* Analysis grid graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Conversion volumetrics chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">Conversão de Etapas Pipeline</h3>
            <p className="text-xs text-slate-500">Fluxo volumétrico progressivo de leads de entrada até faturamento compensado.</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsLogData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="contatos" fill="#10b981" radius={[4, 4, 0, 0]} name="Contatos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top purchasers list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-955 dark:text-white flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-amber-500" />
              <span>Maiores Compradores</span>
            </h3>
            <p className="text-xs text-slate-500">Ranking consolidado dos clientes VIPs da sua base.</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {topPurchasers.map((client, i) => (
              <div key={client.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400">#{i + 1}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{client.name}</span>
                </div>
                <span className="font-mono font-bold text-emerald-505 text-emerald-500">
                  R$ {client.totalBought.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t text-[10px] text-slate-400 italic">
            *Dados baseados em orders compensadas via Pix / Cartão.
          </div>
        </div>
      </div>

      {/* Campaigns list row summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-950 dark:text-white">Desempenho de Campanhas Ativas</h3>
          <p className="text-xs text-slate-550 dark:text-slate-404 text-slate-400">Taxas reais de engajamento do disparador automático WhatsApp.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] uppercase font-mono text-slate-400 tracking-wider">
                <th className="py-2">Identificação</th>
                <th className="py-2">Gatilhos Enviados</th>
                <th className="py-2">Respostas Recebidas</th>
                <th className="py-2 text-right">Taxa de Engajamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-805 text-xs">
              {campaigns.map((camp) => {
                const conv = camp.sentCount > 0 
                  ? ((camp.responseCount / camp.sentCount) * 100).toFixed(1) + '%' 
                  : '0.0%';

                return (
                  <tr key={camp.id}>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-105">{camp.name}</td>
                    <td className="py-3 font-mono text-slate-650 dark:text-slate-350">{camp.sentCount}</td>
                    <td className="py-3 font-mono text-slate-650 dark:text-slate-350">{camp.responseCount}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-505 text-emerald-500">{conv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
