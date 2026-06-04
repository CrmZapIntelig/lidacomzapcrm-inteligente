/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  Zap, 
  Flame, 
  UtensilsCrossed, 
  CheckSquare, 
  TrendingUp, 
  Layers,
  ArrowRight,
  Sparkles,
  AlertOctagon,
  Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryOrder, DeliveryOrderItem } from '../types';

interface ProducaoViewProps {
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
}

export default function ProducaoView({
  deliveryOrders,
  setDeliveryOrders
}: ProducaoViewProps) {
  const [filterType, setFilterType] = useState<'ativos' | 'todos'>('ativos');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter orders in production
  const activeProdOrders = deliveryOrders.filter(o => 
    filterType === 'ativos' ? o.status === 'PRODUÇÃO' : true
  );

  // Group items to see aggregate demand (e.g. "We need to make 3x Bacon Burger right now!")
  const aggregateDemand: Record<string, { quantity: number; orderIds: string[]; addons: string[] }> = {};
  
  deliveryOrders.forEach(order => {
    if (order.status === 'PRODUÇÃO' || order.status === 'PEDIDO GERADO') {
      order.items.forEach(item => {
        const key = item.productName;
        const addonsList = (item.selectedAddons || []).map(a => a.name);
        
        if (!aggregateDemand[key]) {
          aggregateDemand[key] = {
            quantity: 0,
            orderIds: [],
            addons: []
          };
        }
        aggregateDemand[key].quantity += item.quantity;
        if (!aggregateDemand[key].orderIds.includes(order.id)) {
          aggregateDemand[key].orderIds.push(order.id);
        }
        addonsList.forEach(adName => {
          if (!aggregateDemand[key].addons.includes(adName)) {
            aggregateDemand[key].addons.push(adName);
          }
        });
      });
    }
  });

  // Calculate stats
  const totalItemsInPrep = Object.values(aggregateDemand).reduce((sum, item) => sum + item.quantity, 0);
  const activeOrdersCount = deliveryOrders.filter(o => o.status === 'PRODUÇÃO').length;
  const readyOrdersCount = deliveryOrders.filter(o => o.status === 'PRONTO').length;

  const handleFinishProduction = (orderId: string) => {
    setDeliveryOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'PRONTO'
        };
      }
      return o;
    }));
  };

  const handleStartProduction = (orderId: string) => {
    setDeliveryOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'PRODUÇÃO'
        };
      }
      return o;
    }));
  };

  return (
    <div className="space-y-6 font-sans text-slate-100 bg-slate-950 p-6 rounded-3xl min-h-screen border border-slate-900 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Fila de Produção de Alimentos
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Detalhamento de panelas, chapas, receitas e tempo de montagem do Cardápio Digital.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tab buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('ativos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === 'ativos'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-850'
            }`}
          >
            Apenas em Preparo ({activeOrdersCount})
          </button>
          <button
            onClick={() => setFilterType('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterType === 'todos'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-850'
            }`}
          >
            Todos do Fluxo ({deliveryOrders.length})
          </button>
        </div>
      </div>

      {/* Grid containing Recipes & Grelha panel + Step detailed view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AGGREGATE DEMAND (GRELHA DO CHEF) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/55 p-5 rounded-2xl border border-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Grelha Ativa (Fazer Agora)</h3>
              </div>
              <span className="bg-red-950 text-red-405 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                {totalItemsInPrep} itens em demanda
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.keys(aggregateDemand).length === 0 ? (
                <div className="py-8 text-center text-slate-600 font-mono text-[10.5px]">
                  Fornos livres, sem hambúrgueres pendentes.
                </div>
              ) : (
                Object.entries(aggregateDemand).map(([prodName, data], idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3 hover:border-purple-500/30 transition-all cursor-default"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[12px] font-extrabold text-white truncate">{prodName}</p>
                      
                      {data.addons.length > 0 && (
                        <p className="text-[9px] text-slate-450 truncate">
                          Adicionais: {data.addons.join(', ')}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.orderIds.map((oId, oidx) => (
                          <span key={oidx} className="bg-slate-900 border text-slate-400 font-mono text-[8px] px-1 rounded">
                            #{oId.replace('DEL-', '')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-mono font-black text-sm w-9 h-9 rounded-lg flex items-center justify-center border border-purple-500 shadow-md">
                      {data.quantity}x
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SIMULATED KITCHEN TEMPERATURES / DEVICE LOGS */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-905 rounded-2xl border border-slate-850 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Status de Sensores de IoT
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="text-slate-500 block text-[9px] uppercase">Grelha de Produção</span>
                <span className="text-emerald-400 font-bold block text-[13px] mt-0.5">182° C <span className="text-[9px] text-slate-450">(Estável)</span></span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="text-slate-500 block text-[9px] uppercase">Fritadeira Elétrica</span>
                <span className="text-emerald-400 font-bold block text-[13px] mt-0.5">165° C <span className="text-[9px] text-slate-450">(Ativa)</span></span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="text-slate-500 block text-[9px] uppercase">Câmara Fria Inox</span>
                <span className="text-sky-400 font-bold block text-[13px] mt-0.5">-4.2° C <span className="text-[9px] text-slate-450 text-sky-500">(Ideal Zone)</span></span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <span className="text-slate-500 block text-[9px] uppercase">Exaustor Vazão</span>
                <span className="text-emerald-400 font-bold block text-[13px] mt-0.5">94% <span className="text-[9px] text-slate-450">(Alta Rotação)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE RUNNING PRODUCTION QUEUE */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/55 p-5 rounded-2xl border border-slate-900 flex flex-col h-full min-h-[460px]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-205 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>Painel Detalhado de Operadores</span>
              <span className="bg-purple-950 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded border border-purple-900 uppercase">
                {activeProdOrders.length} ordens de preparo
              </span>
            </h3>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {activeProdOrders.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-600">
                  <UtensilsCrossed className="w-10 h-10 mb-2 stroke-[1.5]" />
                  <span className="text-[10.5px] uppercase tracking-widest font-mono">Sem pedidos no forno</span>
                </div>
              ) : (
                activeProdOrders.map((order, index) => (
                  <div 
                    key={order.id}
                    className="p-4 bg-slate-950 rounded-xl border border-slate-850 hover:border-purple-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">#{order.id}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          order.status === 'PRODUÇÃO' 
                            ? 'bg-amber-950 text-amber-400 border border-amber-900' 
                            : 'bg-blue-950 text-blue-400 border border-blue-900'
                        }`}>
                          {order.status === 'PRODUÇÃO' ? 'Em Preparo' : 'Novo Pedido'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        Cliente: <span className="font-bold text-slate-200">{order.clientName}</span>
                      </p>

                      <div className="pl-3 border-l-2 border-slate-800 py-1 space-y-1.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-355 font-mono">
                            <span className="text-white font-extrabold">{it.quantity}x</span> {it.productName}
                            {it.selectedSize && <span className="text-purple-400 ml-1 font-bold">[{it.selectedSize}]</span>}
                            {it.observation && (
                              <span className="block text-[10px] text-red-400 italic">"Obs: {it.observation}"</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-2 justify-between border-t border-slate-900/50 pt-2 md:border-0 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-500 uppercase block font-mono">Tempo Estimado</span>
                        <span className="text-xs font-extrabold text-amber-400 block font-mono">{order.deliveryTime || '35 min'}</span>
                      </div>

                      <div className="flex gap-1.5">
                        {order.status === 'PEDIDO GERADO' ? (
                          <button
                            onClick={() => handleStartProduction(order.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg border border-purple-500/20 active:scale-95 transition-all"
                          >
                            Iniciar Preparo
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFinishProduction(order.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg border border-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            Finalizar Produção
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
