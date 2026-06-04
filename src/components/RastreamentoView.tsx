/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Navigation, 
  Bike, 
  MapPin, 
  Clock, 
  Phone, 
  ExternalLink, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Smartphone, 
  DollarSign, 
  Heart, 
  ShieldCheck,
  Send,
  Sliders,
  Sparkles,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryOrder, DeliveryRoute, Courier, Message } from '../types';

interface RastreamentoViewProps {
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
  routes: DeliveryRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<DeliveryRoute[]>>;
  couriers: Courier[];
  setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>;
  messages: Record<string, Message[]>;
}

export default function RastreamentoView({
  deliveryOrders,
  setDeliveryOrders,
  routes,
  setRoutes,
  couriers,
  setCouriers,
  messages
}: RastreamentoViewProps) {
  const [selectedOrderIdForTracking, setSelectedOrderIdForTracking] = useState<string | null>(null);
  const [isMobileClientView, setIsMobileClientView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fallback tracking data if no active route is found
  const mockActiveTrackingOrders = deliveryOrders.filter(o => 
    routes.some(r => r.orderId === o.id) || o.status === 'EM ENTREGA' || o.status === 'PRONTO'
  );

  const filteredTrackingOrders = mockActiveTrackingOrders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get active route for an order
  const getRouteForOrder = (orderId: string): DeliveryRoute | null => {
    return routes.find(r => r.orderId === orderId) || null;
  };

  // Get courier assigned to a route
  const getCourierForRoute = (route: DeliveryRoute | null): Courier | null => {
    if (!route || !route.courierId) return null;
    return couriers.find(c => c.id === route.courierId) || null;
  };

  // Extract simulated WhatsApp messages sent to a contact
  const getWhatsAppHistoryForClient = (phone: string): Message[] => {
    const list = messages[phone] || [];
    // Filter out typical delivery templates
    return list.filter(m => 
      m.sender === 'sistema' && 
      (m.text.includes('🛵') || m.text.includes('📍') || m.text.includes('⏱️') || m.text.includes('✅') || m.text.includes('📦'))
    );
  };

  // Simulate GPS coordinates jump to show on operator tracking
  const handleSimulateGPSJump = (routeId: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.id === routeId) {
        const nextLat = r.currentLat + (r.destLat - r.currentLat) * 0.3;
        const nextLng = r.currentLng + (r.destLng - r.currentLng) * 0.3;
        const dLat = r.destLat - nextLat;
        const dLng = r.destLng - nextLng;
        const distanceLeft = Math.sqrt(dLat * dLat + dLng * dLng);
        const rawDistance = (distanceLeft * 111 * 0.88).toFixed(1);
        const speedVal = Math.floor(40 + Math.random() * 15);
        const etaMinutes = Math.max(1, Math.ceil(parseFloat(rawDistance) * 3));

        return {
          ...r,
          currentLat: nextLat,
          currentLng: nextLng,
          remainingDistance: `${rawDistance} km`,
          remainingTime: `${etaMinutes} min`,
          speedKmh: speedVal,
          historyCoords: [...r.historyCoords, { lat: nextLat, lng: nextLng }]
        };
      }
      return r;
    }));
  };

  // Toggle simulation view
  const handleOpenClientSimulator = (orderId: string) => {
    setSelectedOrderIdForTracking(orderId);
    setIsMobileClientView(true);
  };

  return (
    <div id="rastreamento-view-container" className="space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* HEADER SECTION */}
      <AnimatePresence mode="wait">
        {!isMobileClientView ? (
          <motion.div 
            key="operator-header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Navigation className="w-5 h-5 animate-pulse" />
                </span>
                Rastreamento HUD de Frota em Tempo Real
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Monitore o trajeto exato de cada entregador, verifique velocidades médias e confira as mensagens automáticas de WhatsApp enviadas.
              </p>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome de cliente ou código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-xs px-9 py-2 rounded-xl focus:outline-none focus:border-indigo-505 w-64 text-slate-900 dark:text-white"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="client-header"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4"
          >
            <button
              id="back-to-admin-view"
              onClick={() => setIsMobileClientView(false)}
              className="w-9 h-9 bg-slate-100 dark:bg-slate-900 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Simulador do Link de Rastreio Público</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Esta é a interface mobile premium que o cliente acessa via link do WhatsApp para acompanhar a entrega ao vivo.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER DUAL CORE VIEW MODE */}
      <AnimatePresence mode="wait">
        {!isMobileClientView ? (
          
          /* OPERATOR MULTI-ORDER TRACKING VIEW */
          <motion.div 
            key="operator-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* LEFT TRACKING SHIELD GRID (2 COLUMN) */}
            <div className="lg:col-span-2 space-y-4">
              {filteredTrackingOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-12 rounded-3xl text-center text-slate-400 space-y-3">
                  <Bike className="w-12 h-12 mx-auto stroke-[1.2] text-slate-355" />
                  <p className="font-mono text-xs uppercase tracking-wide">Sem ordens ativas em processo de entrega no momento</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Crie pedidos ou mude o status do fluxo operacional para <strong className="text-slate-700 dark:text-slate-300">"PRODUÇÃO"</strong> ou <strong className="text-slate-700 dark:text-slate-300">"PRONTO"</strong> e depois despache no painel de Entregas.
                  </p>
                </div>
              ) : (
                <div id="active-routes-operator-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTrackingOrders.map(order => {
                    const matchedRoute = getRouteForOrder(order.id);
                    const matchedRider = getCourierForRoute(matchedRoute);
                    const waHistory = getWhatsAppHistoryForClient(order.clientPhone);

                    return (
                      <div 
                        key={order.id}
                        id={`tracker-card-${order.id}`}
                        className="bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs hover:border-indigo-400 transition"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                          <div>
                            <span className="font-mono text-[10.5px] font-bold bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850">
                              #{order.id}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'EM ENTREGA' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50' : 
                            'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Customer / Rider Details */}
                        <div className="space-y-1">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                            Cliente: <span className="text-slate-905 dark:text-white font-extrabold">{order.clientName}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Destino: <span className="font-mono">{order.address.street || 'Fretado'}, {order.address.number || ''}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Condutor: <span className="font-bold text-slate-700 dark:text-slate-300">{matchedRider ? `${matchedRider.name} (${matchedRider.vehicle})` : 'Aguardando Despacho'}</span>
                          </p>
                        </div>

                        {/* Route telemetry indices if matched */}
                        {matchedRoute ? (
                          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono leading-tight">
                              <div>
                                <span className="text-slate-400 text-[8px] block uppercase">Est. Dist</span>
                                <span className="text-slate-800 dark:text-slate-250 font-bold">{matchedRoute.remainingDistance}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[8px] block uppercase">Est. Tempo</span>
                                <span className="text-indigo-500 font-bold">{matchedRoute.remainingTime}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[8px] block uppercase">Velom.</span>
                                <span className="text-slate-800 dark:text-slate-250 font-bold">{matchedRoute.speedKmh} km/h</span>
                              </div>
                            </div>

                            {/* Manual control simulation triggers */}
                            <div className="flex gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-900">
                              <button
                                onClick={() => handleSimulateGPSJump(matchedRoute.id)}
                                className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-805 text-[9px] font-bold py-1.5 rounded-lg text-slate-600 dark:text-slate-400 transition"
                              >
                                Simular Salto GPS 📡
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] py-3 text-center bg-amber-50/40 dark:bg-amber-955/10 border border-amber-200/50 text-amber-700 dark:text-amber-400 rounded-xl">
                            Sem rota ativa. Despache o pedido para gerar sinal GPRS.
                          </div>
                        )}

                        {/* Simulated Trigger buttons to public customer tracker link */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                          <button
                            id={`btn-open-simulator-${order.id}`}
                            onClick={() => handleOpenClientSimulator(order.id)}
                            className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/50 text-indigo-650 dark:text-indigo-400 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            Ver Link de Rastreio do Cliente (Mobile) 📱
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT WHATSAPP TEMPLATE SENT LOGGER (1 COLUMN) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-800 dark:text-slate-100 border-b border-light-100 dark:border-slate-850 pb-2.5 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-500" />
                  WhatsApp Automático
                </h3>
                
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-semibold">
                  Sempre que o operador altera etapas operacionais das rotas de entrega, o sistema despacha webhooks instantâneos de status no WhatsApp do cliente:
                </p>

                {/* Templates explanations list with visual designs */}
                <div className="space-y-3 text-[11px] font-mono leading-snug">
                  
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1 text-emerald-800 dark:text-emerald-400">
                    <span className="text-[8.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 block font-sans">Etapa: Entregador Aceitou</span>
                    <p className="italic">🛵 Seu entregador foi acionado! O entregador Carlos Eduardo aceitou a chamada e está se deslocando para coletar o pedido.</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-850 rounded-xl space-y-1 text-slate-600 dark:text-slate-400">
                    <span className="text-[8.5px] font-black uppercase text-slate-500 block font-sans">Etapa: Pedido Coletado</span>
                    <p className="italic">📦 Seu pedido foi coletado! O entregador conferiu e colocou a embalagem térmica na mochila de transporte.</p>
                  </div>

                  <div className="p-3 bg-sky-50/50 dark:bg-sky-955/20 border border-sky-100 dark:border-sky-900/40 rounded-xl space-y-1 text-sky-800 dark:text-sky-400">
                    <span className="text-[8.5px] font-black uppercase text-sky-650 block font-sans">Etapa: Em Rota</span>
                    <p className="italic">📍 Seu pedido está a caminho! Acompanhe o trajeto em tempo real pelo link do painel de rastreio.\n⏱️ Previsão de entrega: 12 min.</p>
                  </div>

                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1 text-emerald-800 dark:text-emerald-400">
                    <span className="text-[8.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 block font-sans">Etapa: Pedido Entregue</span>
                    <p className="italic">✅ Pedido entregue! Obrigado por comprar no Cardápio Digital. Avalie o entregador se possível!</p>
                  </div>

                </div>
              </div>
            </div>

          </motion.div>
        ) : (
          
          /* VISUAL MOBILE PREMIUM CLIENT TRACKER OVERLAY STYLE SHEET */
          <motion.div 
            key="client-simulator-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex justify-center py-6"
          >
            {/* PHYSICAL SMARTPHONE CHASSIS FRAME */}
            <div className="relative w-[360px] h-[720px] bg-slate-950 rounded-[50px] p-3 shadow-2xl border-4 border-slate-800/80 ring-15 ring-slate-900 ring-offset-3">
              
              {/* Camera cutout (notch) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-around px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-indigo-900" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              </div>

              {/* Speaker / Ear Piece slit */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-800 rounded-full z-30" />

              {/* SCREEN INSIDE PORTAL (MOBILE SPECIFIC SCREEN DESIGN) */}
              <div className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[40px] overflow-hidden relative flex flex-col justify-between text-slate-800 dark:text-slate-100 font-sans border-2 border-slate-900">
                
                {/* Status Bar simulation */}
                <div className="px-6 pt-3 pb-1 bg-slate-950 flex justify-between items-center text-[10px] font-mono font-bold text-white tracking-widest z-20">
                  <span>03:11</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G LTE</span>
                    <div className="w-5 h-2.5 border border-white rounded-md p-0.5 flex items-center">
                      <div className="h-full w-full bg-emerald-500 rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 overflow-y-auto scrollbar-none pb-4">
                  {(() => {
                    const trackingOrder = deliveryOrders.find(o => o.id === selectedOrderIdForTracking);
                    if (!trackingOrder) {
                      return (
                        <div className="p-8 text-center text-slate-500 space-y-2 mt-20">
                          <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-300">Resumo Indisponível</h4>
                          <p className="text-xs">Selecione uma ordem válida no painel gerencial.</p>
                        </div>
                      );
                    }

                    const matchedRoute = getRouteForOrder(trackingOrder.id);
                    const matchedRider = getCourierForRoute(matchedRoute);

                    return (
                      <div className="space-y-4">
                        
                        {/* MINI HEADER BAR */}
                        <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between text-white">
                          <div className="flex items-center gap-2">
                            <Bike className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono font-black uppercase tracking-wider">Acompanhamento</span>
                          </div>
                          <span className="font-mono text-[9.5px] bg-slate-850 px-2 py-0.5 rounded border border-slate-800 font-black">
                            #{trackingOrder.id}
                          </span>
                        </div>

                        {/* LIVE GPS MAP PREVIEW GRID CARD */}
                        <div className="px-4">
                          <div className="h-56 bg-slate-900 rounded-3xl relative overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col justify-end p-3 shadow-md">
                            {/* Grid map pattern */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                            
                            {/* Central hub and rider icon nodes */}
                            <svg className="absolute inset-0 w-full h-full opacity-20 stroke-slate-700 stroke-[1]" fill="none">
                              <line x1="10%" y1="10%" x2="90%" y2="95%" />
                              <line x1="10%" y1="90%" x2="90%" y2="10%" />
                              <path d="M 50 150 Q 150 100 300 180" />
                            </svg>

                            {/* Base indicator */}
                            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              </div>
                            </div>

                            {/* Rider marker icon on map */}
                            {matchedRoute ? (
                              <div className="absolute z-10 animate-bounce" style={{ top: '45%', left: '55%' }}>
                                <div className="bg-indigo-600 border-2 border-white p-1 rounded-full text-white shadow-lg shadow-indigo-600/25">
                                  <Bike className="w-4.5 h-4.5" />
                                </div>
                              </div>
                            ) : null}

                            {/* Destination pin on map */}
                            <div className="absolute top-1/3 left-2/3 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                              <MapPin className="w-5 h-5 text-rose-500 fill-rose-500" />
                            </div>

                            {/* Status and distance tracking index bar */}
                            <div className="z-10 bg-slate-950/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 text-white flex justify-between items-center text-[10px] font-mono leading-none shadow-md">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                <span className="font-extrabold">{matchedRoute ? matchedRoute.remainingTime : '15 min'}</span>
                              </div>
                              <div className="w-px h-3 bg-slate-800" />
                              <div className="font-extrabold text-slate-300">
                                {matchedRoute ? matchedRoute.remainingDistance : '2.8 km'} rest.
                              </div>
                              <div className="w-px h-3 bg-slate-800" />
                              <span className="text-emerald-400 font-extrabold uppercase">
                                {matchedRoute ? matchedRoute.status : trackingOrder.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ESTIMATIVE PROGRESS BAR */}
                        <div className="px-5 space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Seu pedido está pronto!</h3>
                            <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200/40 px-2 py-0.5 rounded-md font-bold uppercase">
                              GPS Ativo 🛰️
                            </span>
                          </div>

                          {/* Progress steps dots */}
                          <div className="flex justify-between items-center relative py-4">
                            {/* Horizontal progress bar background */}
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0" />
                            <div 
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 transition-all duration-1000 z-0" 
                              style={{ 
                                width: 
                                  matchedRoute?.status === 'Entregador Aceitou' ? '25%' :
                                  matchedRoute?.status === 'Pedido Coletado' ? '50%' :
                                  matchedRoute?.status === 'Em Rota' ? '75%' :
                                  trackingOrder.status === 'FECHADO' ? '100%' : '5%'
                              }} 
                            />

                            {[
                              { label: 'Aceito', step: 'Entregador Aceitou' },
                              { label: 'Coletado', step: 'Pedido Coletado' },
                              { label: 'Em Rota', step: 'Em Rota' },
                              { label: 'Entregue', step: 'Pedido Entregue' }
                            ].map((st, i) => {
                              const stepsInWorkflow = ['Aguardando Entregador', 'Entregador Aceitou', 'Indo Retirada', 'Pedido Coletado', 'Em Rota', 'Pedido Entregue'];
                              const isCompleted = stepsInWorkflow.indexOf(matchedRoute?.status || 'Aguardando Entregador') >= stepsInWorkflow.indexOf(st.step) || trackingOrder.status === 'FECHADO';
                              
                              return (
                                <div key={i} className="flex flex-col items-center z-10">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all text-[9px] font-bold ${
                                    isCompleted 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                  }`}>
                                    {isCompleted ? '✓' : i + 1}
                                  </div>
                                  <span className="text-[8px] font-bold mt-1 uppercase text-slate-450 tracking-wider">
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ASSIGNED COURIER MOBILE PROFILE CARD */}
                        <div className="px-4">
                          <div className="bg-slate-900 border border-slate-850 p-4 rounded-3xl text-white space-y-3">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Entregador Responsável:</span>
                            
                            <div className="flex items-center gap-3">
                              {/* Photo */}
                              <img
                                src={matchedRider ? matchedRider.photo : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop'}
                                alt="Rider profile"
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-800"
                              />

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate text-white">{matchedRider ? matchedRider.name : 'Suporte Logístico'}</h4>
                                <p className="text-[10px] text-slate-400 truncate">{matchedRider ? matchedRider.vehicle : 'Lander 250cc Azul'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                                    ★ {matchedRider ? matchedRider.rating : '4.8'}
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">Placa {matchedRider ? matchedRider.plate : 'MERCO'}</span>
                                </div>
                              </div>

                              {/* Actions phone call simulate */}
                              <button
                                onClick={() => alert(`Ligando cifrado para o entregador: ${matchedRider ? matchedRider.phone : '(11) 98765-1122'}`)}
                                className="w-9 h-9 bg-slate-800 hover:bg-slate-850 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700 active:scale-95 transition-all"
                                title="Ligar para o entregador"
                              >
                                <Phone className="w-4 h-4 text-emerald-400" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ORDER CONTENT BREAKDOWN */}
                        <div className="px-4">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-[26px] space-y-2.5">
                            <span className="text-[8.5px] font-bold text-slate-400 block uppercase tracking-wider">Produtos do Pedido</span>
                            
                            <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                              {trackingOrder.items.map((it, oidx) => (
                                <div key={oidx} className="flex justify-between items-center pt-1.5 first:pt-0 font-medium">
                                  <span className="text-slate-600 dark:text-slate-400"><strong className="text-slate-900 dark:text-white font-extrabold">{it.quantity}x</strong> {it.productName}</span>
                                  <span className="font-mono font-bold">R$ {it.subtotal.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 space-y-1 text-[11px] font-mono select-none">
                              <div className="flex justify-between text-slate-400">
                                <span>Subtotal</span>
                                <span>R$ {trackingOrder.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Taxa de Entrega</span>
                                <span className="text-emerald-500 font-bold">R$ {trackingOrder.deliveryFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-900 dark:text-white font-extrabold text-xs pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                                <span>Valor Total</span>
                                <span>R$ {trackingOrder.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECURITY SHIELD POLICY FOOTER */}
                        <div className="px-5 text-center text-[10px] text-slate-400 space-y-1 py-1 select-none">
                          <p className="flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            Entrega Segura com PIN CRM GreenHub
                          </p>
                          <p className="text-[8px] text-slate-450 leading-relaxed max-w-xs mx-auto">
                            Seus dados estão protegidos sob protocolos da LGPD. Em caso de dúvidas, contate o restaurante via WhatsApp.
                          </p>
                        </div>

                      </div>
                    );
                  })()}
                </div>

                {/* Back to Operator mode footer overlay bar on the phone */}
                <div className="p-3 bg-slate-950 border-t border-slate-900 flex justify-center text-[10px]">
                  <button
                    onClick={() => setIsMobileClientView(false)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-md shadow-indigo-600/15"
                  >
                    Voltar ao Painel Gerencial 🛡️
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
