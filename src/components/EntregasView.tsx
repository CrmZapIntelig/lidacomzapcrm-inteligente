/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Clock, 
  Navigation, 
  CheckCircle, 
  Search, 
  ShieldAlert, 
  Plus, 
  Database, 
  User,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryOrder, Client } from '../types';

interface EntregasViewProps {
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
}

export default function EntregasView({
  deliveryOrders,
  setDeliveryOrders
}: EntregasViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Available simulated couriers (motoboys)
  const [couriers, setCouriers] = useState([
    { id: 'moto_1', name: 'Danilo Alvarenga', vehicle: 'Titan 160cc Preta', status: 'Disponível', deliveredToday: 8 },
    { id: 'moto_2', name: 'Carlos Eduardo', vehicle: 'Lander 250cc Azul', status: 'Em Entrega', deliveredToday: 12 },
    { id: 'moto_3', name: 'Roberta Rodrigues', vehicle: 'Pop 110i Vermelha', status: 'Disponível', deliveredToday: 5 },
    { id: 'moto_4', name: 'Jefferson Lucas', vehicle: 'NXR Bros 160 Verde', status: 'Em Rota', deliveredToday: 11 },
  ]);

  // Update order status within delivery workflows
  const handleUpdateDeliveryStatus = (orderId: string, newStatus: DeliveryOrder['status']) => {
    setDeliveryOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus
        };
      }
      return o;
    }));
  };

  // Distance computation (mocked beautifully based on zipCode/id)
  const getDeliveryMeta = (orderId: string) => {
    let digitSum = 0;
    for (let i = 0; i < orderId.length; i++) {
      const parsed = parseInt(orderId[i]);
      if (!isNaN(parsed)) digitSum += parsed;
    }
    const distanceVal = (1.2 + (digitSum % 5) * 1.1).toFixed(1);
    const etaVal = Math.floor(6 + (digitSum % 5) * 4);
    return {
      distance: `${distanceVal} km`,
      eta: `${etaVal} min`
    };
  };

  // Filter criteria
  const filteredOrders = deliveryOrders.filter(o => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      o.clientName.toLowerCase().includes(term) ||
      (o.address.street || '').toLowerCase().includes(term) ||
      o.clientPhone.includes(term)
    );
  });

  // Flow classification
  const waitingOrders = filteredOrders.filter(o => o.status === 'PRONTO');
  const inRouteOrders = filteredOrders.filter(o => o.status === 'EM ENTREGA');
  const deliveredOrders = filteredOrders.filter(o => o.status === 'FECHADO');

  // Stats calculation
  const totalFleetCount = couriers.length;
  const dispatchWaitingCount = deliveryOrders.filter(o => o.status === 'PRONTO').length;
  const activeRoutesCount = deliveryOrders.filter(o => o.status === 'EM ENTREGA').length;

  return (
    <div className="space-y-6 font-sans text-slate-100 bg-slate-950 p-6 rounded-3xl min-h-screen border border-slate-900 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20 text-sky-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Painel Logístico de Entregas
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Despache motoboys, rastreie rotas e acompanhe as taxas de entrega em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Search tool */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar entregas por rua, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs px-9 py-2 rounded-xl focus:outline-none focus:border-sky-500 transition-colors w-64"
            />
          </div>
        </div>
      </div>

      {/* DELIVERY METRICS SCREEN BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-400 block uppercase font-mono mb-1">Aguardando Motoboy</span>
          <p className="text-lg font-black text-amber-400">{dispatchWaitingCount} Pronto(s) na Expedição</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-400 block uppercase font-mono mb-1">Em Rota Ativa</span>
          <p className="text-lg font-black text-sky-405">{activeRoutesCount} Motoqueiros em Trânsito</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-400 block uppercase font-mono mb-1">Taxas Acumuladas</span>
          <p className="text-lg font-black text-emerald-400">
            R$ {deliveryOrders.reduce((sum, o) => sum + (o.status === 'FECHADO' ? o.deliveryFee : 0), 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-400 block uppercase font-mono mb-1">Frota de Apoio</span>
          <p className="text-lg font-black text-slate-200">{totalFleetCount} Motoboys Logados</p>
        </div>

      </div>

      {/* MAIN TWO-COLUMN LAYOUT: 1. LANES / 2. COURIER FLEET SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LANES OPERATIONAL PANEL (3 COLUMNS) - OCCUPIES 3/4 WIDGET */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* LANES 1: AGUARDANDO MOTOBOY */}
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block animate-pulse" />
                Aguardando Motoboy
              </span>
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10.5px] border border-slate-800 font-mono text-slate-350">{waitingOrders.length}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {waitingOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-600 font-mono text-[10px] uppercase">
                  Sem encomendas prontas
                </div>
              ) : (
                waitingOrders.map(order => {
                  const { distance, eta } = getDeliveryMeta(order.id);
                  return (
                    <div key={order.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-100">
                          #{order.id}
                        </span>
                        <span className="text-[9.5px] font-bold text-amber-505 uppercase">
                          {order.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white">{order.clientName}</h4>
                        <p className="text-[10px] text-slate-450 font-mono mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          {order.address.street ? `${order.address.street}, ${order.address.number}` : 'A retirar'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                        <div>
                          <span className="text-slate-500 block text-[8px] uppercase">Distância</span>
                          <span className="text-white font-bold">{distance}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px] uppercase">Est. Tempo</span>
                          <span className="text-white font-bold">{eta}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'EM ENTREGA')}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-[10.5px] uppercase py-1.5 rounded-lg border border-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-1 leading-none"
                      >
                        <Navigation className="w-3 h-3" />
                        Despachar Entregador
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LANES 2: EM ROTA (DELIVERING) */}
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
              <span className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 block animate-ping" />
                Em Trânsito / Rota
              </span>
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10.5px] border border-slate-800 font-mono text-slate-350">{inRouteOrders.length}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {inRouteOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-600 font-mono text-[10px] uppercase">
                  Nenhuma moto na rua
                </div>
              ) : (
                inRouteOrders.map(order => {
                  const { distance, eta } = getDeliveryMeta(order.id);
                  return (
                    <div key={order.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-100">
                          #{order.id}
                        </span>
                        <span className="text-[9px] font-bold text-sky-400 uppercase bg-sky-950 px-1.5 rounded border border-sky-900">
                          COURIER_OUT
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white">{order.clientName}</h4>
                        <p className="text-[10px] text-slate-450 font-mono mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-400 animate-bounce" />
                          {order.address.street ? `${order.address.street}, ${order.address.number}` : 'A retirar'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-sky-955/20 p-2 rounded-lg border border-sky-900/20">
                        <div>
                          <span className="text-sky-450 block text-[8px] uppercase font-bold">Rastreador GPS</span>
                          <span className="text-sky-300 font-bold">{distance} rest.</span>
                        </div>
                        <div>
                          <span className="text-sky-450 block text-[8px] uppercase font-bold">Est. Chegada</span>
                          <span className="text-sky-305 font-bold">~ 12 min</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateDeliveryStatus(order.id, 'FECHADO')}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10.5px] uppercase py-1.5 rounded-lg border border-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1 leading-none"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Finalizar Entrega
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LANES 3: ENTREGUES */}
          <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
              <span className="text-xs font-black uppercase text-emerald-450 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
                Entregue / Concluído
              </span>
              <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10.5px] border border-slate-800 font-mono text-slate-350">{deliveredOrders.length}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {deliveredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-600 font-mono text-[10px] uppercase">
                  Nenhuma entrega finalizada hoje
                </div>
              ) : (
                deliveredOrders.map(order => (
                  <div key={order.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-900 space-y-2 opacity-85 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                        #{order.id}
                      </span>
                      <span className="text-[8.5px] font-mono text-emerald-450 font-black flex items-center gap-0.5 bg-emerald-950/50 p-1 px-1.5 rounded border border-emerald-500/10">
                        FINALIZADO
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-300">{order.clientName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                        {order.address.street || 'Retirada'}
                      </p>
                    </div>

                    <div className="text-[9px] font-mono text-slate-500 flex justify-between">
                      <span>Pgto: <span className="text-slate-300 font-bold">{order.paymentMethod}</span></span>
                      <span className="text-emerald-500 font-extrabold">Fee: R$ {order.deliveryFee.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COURIER FLEET CONTROLS & MONITOR - OCCUPIES 1/4 COLUMN */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/55 p-5 rounded-2xl border border-slate-900 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-205 border-b border-slate-800 pb-3 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              Equipe de Logística (Frota)
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin">
              {couriers.map((co) => (
                <div key={co.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1.5 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">{co.name}</span>
                    <span className={`text-[8.5px] font-bold uppercase rounded-full px-1.5 py-0.2 ${
                      co.status === 'Disponível' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' 
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-900/40'
                    }`}>
                      {co.status}
                    </span>
                  </div>

                  <p className="text-[9.5px] text-slate-450 font-mono">{co.vehicle}</p>
                  
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900 pt-1.5">
                    <span>Entregas hoje:</span>
                    <span className="font-bold text-slate-300">{co.deliveredToday}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const name = prompt('Nome do Motoboy:');
                const vehicle = prompt('Veículo (Ex: CG Titan 160cc vermelha):');
                if (name && vehicle) {
                  setCouriers((prev) => [
                    ...prev,
                    {
                      id: `moto_${Date.now()}`,
                      name,
                      vehicle,
                      status: 'Disponível',
                      deliveredToday: 0
                    }
                  ]);
                }
              }}
              className="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-850"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              Cadastrar Novo Motoboy
            </button>
          </div>

          {/* tbl_entregas Database table preview layout log for operational completeness */}
          <div className="p-4 bg-slate-900/35 border border-slate-900 rounded-xl font-mono text-[10.5px] text-slate-400 space-y-2">
            <p className="font-extrabold text-slate-300 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-sky-400" />
              tbl_entregas_webhook
            </p>
            <p className="text-[9.5px] text-slate-500 leading-snug">
              Webhooks ativos escutando canais do iFood Logística, Lalamove, Uber Direct e Loggi para simulação transparente.
            </p>
            <div className="bg-slate-950 p-2 rounded border border-slate-850 text-[9px] text-sky-350">
              ⚡ CONNECTED - STATUS 200 OK
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
