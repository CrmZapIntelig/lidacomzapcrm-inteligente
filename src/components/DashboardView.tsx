/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Clock,
  ChevronRight,
  ArrowUpRight,
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Client, Order, Message, FunnelStage } from '../types';
import { FUNNEL_STAGES } from '../utils/mockData';

interface DashboardViewProps {
  clients: Client[];
  orders: Order[];
  messages: Record<string, Message[]>;
  onChangeTab: (tab: string) => void;
  onSelectClientInChat: (client: Client) => void;
}

export default function DashboardView({
  clients,
  orders,
  messages,
  onChangeTab,
  onSelectClientInChat,
}: DashboardViewProps) {
  // Safe stats calculators
  const totalLeads = clients.length;
  
  const conversationsStarted = Object.keys(messages).length;
  
  const totalMessagesSent = Object.values(messages)
    .flatMap((msgs) => msgs)
    .filter((m) => m.sender === 'operador' || m.sender === 'sistema')
    .length + 1500; // adding constant base for simulated stats

  const responseRate = 74; // Simulated static rate

  const ordersGenerated = orders.length;
  
  const salesClosed = orders.filter((o) => o.status === 'Pago').length;
  
  const totalRevenue = orders
    .filter((o) => o.status === 'Pago')
    .reduce((acc, order) => acc + order.total, 0);

  // Calculate counts per funnel stage
  const stageCounts = FUNNEL_STAGES.reduce<Record<FunnelStage, number>>((acc, stage) => {
    acc[stage.id] = clients.filter((c) => c.stage === stage.id).length;
    return acc;
  }, {} as Record<FunnelStage, number>);

  // Recent client chats
  const activeChats = clients
    .filter((c) => messages[c.id] && messages[c.id].length > 0)
    .slice(0, 4);

  // Recent orders
  const recentOrders = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  // Recharts Sales performance mock data (daily representation)
  const salesChartData = [
    { name: 'Seg', faturamento: 1200 },
    { name: 'Ter', faturamento: 1900 },
    { name: 'Qua', faturamento: 1600 },
    { name: 'Qui', faturamento: 2400 },
    { name: 'Sex', faturamento: 3100 },
    { name: 'Sáb', faturamento: 2800 },
    { name: 'Dom', faturamento: 1500 },
  ];

  // Recharts Response rate mock data
  const responseChartData = [
    { name: '09h', envios: 40, respostas: 30 },
    { name: '11h', envios: 85, respostas: 60 },
    { name: '13h', envios: 50, respostas: 45 },
    { name: '15h', envios: 110, respostas: 80 },
    { name: '17h', envios: 90, respostas: 72 },
    { name: '19h', envios: 60, respostas: 40 },
  ];

  return (
    <div className="space-y-6 font-sans p-1 pb-10">
      
      {/* Title & Introduction Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Dashboard Executivo
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe o faturamento, taxa de conversão do seu funil e desempenho do WhatsApp em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE SIMULATION
          </span>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Leads */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leads Totais</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalLeads}</span>
              <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5 font-mono">
                +12% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
            {/* Breakdown */}
            <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
               <span className="text-green-500">WA: {clients.filter(c => c.channel === 'whatsapp' || !c.channel).length}</span>
               <span className="text-blue-500">RCS: {clients.filter(c => c.channel === 'rcs').length}</span>
               <span className="text-amber-500">MESA: {clients.filter(c => c.channel === 'mesa_qr').length}</span>
               <span className="text-emerald-500">OMNI: {clients.filter(c => c.channel === 'ambos').length}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Conversas Iniciadas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{conversationsStarted}</span>
              <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5 font-mono">
                +8% <TrendingUp className="w-3 h-3" />
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Faturamento */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento (Pago)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Taxa de Resposta */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxa de Resposta</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{responseRate}%</span>
              <span className="text-xs text-sky-500 font-bold font-mono">Seguro</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytical Charts and Pipe Funnel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Curva de Faturamento Diário</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total acumulado de pedidos pagos na semana corrente.</p>
            </div>
            <div className="text-xs font-mono font-medium text-amber-500 flex items-center gap-1">
              R$ 17.500 total est.
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Faturamento (R$)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visual Conversion Pipeline Funnel representation */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Funil Comercial</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição volumétrica de contatos por etapa.</p>
          </div>
          
          <div className="space-y-2.5">
            {FUNNEL_STAGES.slice(0, 7).map((stage, idx) => {
              const count = stageCounts[stage.id] ?? 0;
              const maxCount = Math.max(...Object.values(stageCounts), 1);
              const percentage = (count / maxCount) * 100;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-350">{stage.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{count} leads</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-emerald-500`}
                      style={{ 
                        width: `${Math.max(percentage, 5)}%`,
                        opacity: 1 - idx * 0.12 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-500">Conversão de Lead a Pago:</span>
            <span className="font-bold text-emerald-500 font-mono">18.4%</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Last Active Chats & Latest Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Conversations */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Conversas Recentes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Clique para responder no Módulo WhatsApp.</p>
            </div>
            <button 
              onClick={() => onChangeTab('whatsapp')}
              className="text-xs text-emerald-500 font-bold flex items-center gap-1 hover:underline"
            >
              Ir para Chat <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {activeChats.map((client) => {
              const msgs = messages[client.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const displayDate = lastMsg ? lastMsg.timestamp : 'Agora';
              const displayText = lastMsg ? lastMsg.text : 'Sem mensagens anteriores';
              const stageConfig = FUNNEL_STAGES.find((s) => s.id === client.stage);

              return (
                <div 
                  key={client.id} 
                  onClick={() => {
                    onSelectClientInChat(client);
                    onChangeTab('whatsapp');
                  }}
                  className="flex items-center gap-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer rounded-lg px-2 -mx-2 transition"
                >
                  <div className={`w-9 h-9 rounded-full ${client.avatarColor} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                    {client.name.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{client.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{displayDate}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{displayText}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${stageConfig?.bgColor} ${stageConfig?.color} ${stageConfig?.borderColor}`}>
                        {stageConfig?.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders in System */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Últimos Pedidos Gerados</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifique status de pagamento e itens faturados.</p>
            </div>
            <button 
              onClick={() => onChangeTab('pedidos')}
              className="text-xs text-emerald-500 font-bold flex items-center gap-1 hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  <th className="py-2.5">Código</th>
                  <th className="py-2.5">Cliente</th>
                  <th className="py-2.5">Total</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="text-xs">
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{order.id}</td>
                    <td className="py-3 font-medium text-slate-600 dark:text-slate-350 max-w-[150px] truncate">{order.clientName}</td>
                    <td className="py-3 font-mono font-bold text-emerald-500">R$ {order.total.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      {order.status === 'Pago' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          PAGO
                        </span>
                      ) : order.status === 'Cancelado' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          CANCELADO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
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

      </div>

    </div>
  );
}
