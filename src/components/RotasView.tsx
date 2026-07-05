/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Bike, 
  MapPin, 
  Compass, 
  Play, 
  Cpu, 
  CheckSquare, 
  User, 
  Clock, 
  Navigation, 
  AlertOctagon, 
  Tv2, 
  Shuffle, 
  Volume2, 
  Send, 
  Users2, 
  CheckCircle2, 
  Smartphone,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Courier, DeliveryRoute, DeliveryOrder, Message } from '../types';

interface RotasViewProps {
  couriers: Courier[];
  setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>;
  routes: DeliveryRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<DeliveryRoute[]>>;
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
  messages: Record<string, Message[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
}

export default function RotasView({
  couriers,
  setCouriers,
  routes,
  setRoutes,
  deliveryOrders,
  setDeliveryOrders,
  messages,
  setMessages
}: RotasViewProps) {
  const [isAutoDispatchEnabled, setIsAutoDispatchEnabled] = useState(true);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  
  // Simulated tracking logs on screen
  const [logMessages, setLogMessages] = useState<string[]>([
    'Iniciando Satélite de GPS da Frota...',
    'Central de Operações sincronizada.',
    'Mecanismo de roteamento inteligente ativo.'
  ]);

  // Operational alerts
  const [alerts, setAlerts] = useState<string[]>([]);

  // Simulation settings
  const [isSpeedingSimulation, setIsSpeedingSimulation] = useState(true);

  // Generate logs helper
  const addLog = (msg: string) => {
    setLogMessages(prev => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15)
    ]);
  };

  // Helper: send mock WhatsApp message to client
  const triggerWhatsAppWebhook = (clientPhone: string, text: string) => {
    const cleanPhone = clientPhone || 'default';
    const newMsg: Message = {
      id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: 'sistema',
      text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => {
      const clientMsgs = prev[cleanPhone] || [];
      return {
        ...prev,
        [cleanPhone]: [...clientMsgs, newMsg]
      };
    });
    addLog(`Mensagem WhatsApp despachada para o contato ${cleanPhone}!`);
  };

  // Run periodic automated checks & route coordinate simulation
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Simulate coordinate updates for routes currently "Em Rota"
      setRoutes(prevRoutes => {
        return prevRoutes.map(route => {
          if (route.status === 'Em Rota') {
            // Move current coordinate slightly closer to destination
            const dLat = route.destLat - route.currentLat;
            const dLng = route.destLng - route.currentLng;
            
            const distanceLeft = Math.sqrt(dLat * dLat + dLng * dLng);
            
            if (distanceLeft < 0.001) {
              // Extremely close, let's keep it there or auto-complete simulation if user desired
              return {
                ...route,
                remainingTime: '1 min',
                remainingDistance: '0.1 km'
              };
            } else {
              // Move 10% closer
              const nextLat = route.currentLat + dLat * 0.12;
              const nextLng = route.currentLng + dLng * 0.12;
              const nextHistory = [...route.historyCoords, { lat: nextLat, lng: nextLng }];

              // Recalculate human metrics
              const rawDistance = (distanceLeft * 111 * 0.88).toFixed(1);
              const speedVal = Math.floor(38 + Math.random() * 12);
              const etaMinutes = Math.max(1, Math.ceil(parseFloat(rawDistance) * 3));
              
              return {
                ...route,
                currentLat: nextLat,
                currentLng: nextLng,
                historyCoords: nextHistory,
                remainingDistance: `${rawDistance} km`,
                remainingTime: `${etaMinutes} min`,
                speedKmh: speedVal,
                updatedAt: new Date().toISOString()
              };
            }
          }
          return route;
        });
      });

      // 2. Scan for Operational Warnings
      const newAlerts: string[] = [];
      const now = new Date();
      
      // Look for orders "PRONTO" but without any courier/route
      const pendingOrdersCount = deliveryOrders.filter(o => o.status === 'PRONTO' && !routes.some(r => r.orderId === o.id)).length;
      if (pendingOrdersCount > 0) {
        newAlerts.push(`ALERTA: Há ${pendingOrdersCount} pedido(s) pronto(s) sem entregadores vinculados!`);
      }

      // Look for delayed routes
      routes.forEach(r => {
        if (r.status === 'Em Rota' && parseInt(r.remainingTime) > 15 && Math.random() > 0.85) {
          const matchingOrder = deliveryOrders.find(o => o.id === r.orderId);
          if (matchingOrder) {
            newAlerts.push(`EMERGÊNCIA: Rota ${r.id} para ${matchingOrder.clientName} está atrasando (> 20m).`);
          }
        }
      });

      setAlerts(newAlerts);

    }, 6000);

    return () => clearInterval(timer);
  }, [deliveryOrders, routes, setRoutes]);

  // Handle Automatic Dispatch algorithm
  const triggerAutoDispatch = () => {
    // Locate orders that are ready but have no assigned route
    const readyOrders = deliveryOrders.filter(o => 
      o.status === 'PRONTO' && 
      !routes.some(r => r.orderId === o.id)
    );

    if (readyOrders.length === 0) {
      alert('Não no momento: Não há pedidos PRONTO aguardando despacho de rota.');
      return;
    }

    // Locate available couriers
    const availableCouriers = couriers.filter(c => c.status === 'Disponível');
    if (availableCouriers.length === 0) {
      alert('Falta de Frota: Todos os motociclistas estão ocupados, em entrega, offline ou pausados!');
      return;
    }

    // Match the first ready order with the first available courier
    const orderToMatch = readyOrders[0];
    const courierToMatch = availableCouriers[0];

    // Create route
    const newRouteId = `R-${orderToMatch.id.replace('DEL-', '')}`;
    const newRoute: DeliveryRoute = {
      id: newRouteId,
      orderId: orderToMatch.id,
      courierId: courierToMatch.id,
      status: 'Aguardando Entregador',
      originLat: -23.5615, // Base Restaurante
      originLng: -46.6559,
      // Distribute dest randomly near Paulista Area
      destLat: -23.5615 + (Math.random() - 0.5) * 0.018,
      destLng: -46.6559 + (Math.random() - 0.5) * 0.018,
      currentLat: -23.5615,
      currentLng: -46.6559,
      remainingDistance: '3.1 km',
      remainingTime: '12 min',
      speedKmh: 0,
      historyCoords: [{ lat: -23.5615, lng: -46.6559 }],
      alerts: [],
      updatedAt: new Date().toISOString()
    };

    setRoutes(prev => [...prev, newRoute]);

    // Update courier status
    setCouriers(prev => prev.map(c => {
      if (c.id === courierToMatch.id) {
        return {
          ...c,
          status: 'Em entrega',
          activeOrders: [...c.activeOrders, orderToMatch.id]
        };
      }
      return c;
    }));

    // Update order status
    setDeliveryOrders(prev => prev.map(o => {
      if (o.id === orderToMatch.id) {
        return {
          ...o,
          status: 'EM ENTREGA'
        };
      }
      return o;
    }));

    addLog(`Match Efetuado! Algoritmo vinculou Pedido #${orderToMatch.id} ao motociclista ${courierToMatch.name}.`);
    
    // Send automated WhatsApp hook to client
    triggerWhatsAppWebhook(
      orderToMatch.clientPhone,
      `🛵 Olá, ${orderToMatch.clientName}! Seu entregador pegou a rota. O motoboy ${courierToMatch.name} (${courierToMatch.vehicle}) está a caminho do seu endereço!`
    );
  };

  // Accept/Reject Simulator flow triggered manually by operator mimicking the mobile app
  const simulateRiderResponse = (routeId: string, accepted: boolean) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const order = deliveryOrders.find(o => o.id === route.orderId);
    const courier = couriers.find(c => c.id === route.courierId);

    if (accepted) {
      // Step to 'Entregador Aceitou'
      setRoutes(prev => prev.map(r => {
        if (r.id === routeId) {
          return { ...r, status: 'Entregador Aceitou' };
        }
        return r;
      }));

      addLog(`Motociclista ${courier ? courier.name : 'Rider'} ACEITOU o despacho do pedido #${route.orderId}.`);
      
      if (order) {
        // Send WhatsApp hook to client
        triggerWhatsAppWebhook(
          order.clientPhone,
          `🛵 Seu entregador foi acionado! O entregador ${courier?.name || 'Rider'} aceitou a chamada e está se deslocando para coletar o pedido.`
        );
      }
    } else {
      // Reject! Remove courier association from this route, release courier, log alert
      setRoutes(prev => prev.filter(r => r.id !== routeId));
      
      if (courier) {
        setCouriers(prev => prev.map(c => {
          if (c.id === courier.id) {
            return {
              ...c,
              status: 'Disponível',
              activeOrders: c.activeOrders.filter(oId => oId !== route.orderId)
            };
          }
          return c;
        }));
      }

      if (order) {
        setDeliveryOrders(prev => prev.map(o => {
          if (o.id === order.id) {
            return { ...o, status: 'PRONTO' };
          }
          return o;
        }));
      }

      addLog(`AVISO: Motociclista ${courier ? courier.name : 'Rider'} REJEITOU o chamado do pedido #${route.orderId}. Rota desfeita.`);
    }
  };

  // Change Route step status manually
  const updateRouteStepStatus = (routeId: string, nextStatus: DeliveryRoute['status']) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const order = deliveryOrders.find(o => o.id === route.orderId);
    const courier = couriers.find(c => c.id === route.courierId);

    // Update Route status
    setRoutes(prev => prev.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          status: nextStatus,
          speedKmh: nextStatus === 'Em Rota' ? 44 : 0,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    }));

    addLog(`Rota ${routeId} alterada para etapa: [${nextStatus}].`);

    if (order) {
      if (nextStatus === 'Pedido Coletado') {
        // Trigger SMS/WhatsApp message
        triggerWhatsAppWebhook(
          order.clientPhone,
          `📦 Seu pedido foi coletado! O entregador conferiu e colocou a embalagem térmica na mochila de transporte.`
        );
      } 
      else if (nextStatus === 'Em Rota') {
        // Update Order to EM ENTREGA
        setDeliveryOrders(prev => prev.map(o => {
          if (o.id === order.id) {
            return { ...o, status: 'EM ENTREGA' };
          }
          return o;
        }));

        // Send GPS tracker link
        triggerWhatsAppWebhook(
          order.clientPhone,
          `📍 Seu pedido está a caminho! Acompanhe o trajeto em tempo real pelo painel de rastreio.\n⏱️ Previsão de entrega: ${route.remainingTime || '15 min'}.`
        );
      } 
      else if (nextStatus === 'Pedido Entregue') {
        // Update Order to FECHADO
        setDeliveryOrders(prev => prev.map(o => {
          if (o.id === order.id) {
            return { ...o, status: 'FECHADO' };
          }
          return o;
        }));

        // Release Courier
        if (courier) {
          setCouriers(prev => prev.map(c => {
            if (c.id === courier.id) {
              return {
                ...c,
                status: 'Disponível',
                activeOrders: c.activeOrders.filter(id => id !== order.id)
              };
            }
            return c;
          }));
        }

        // Send final WhatsApp messages
        triggerWhatsAppWebhook(
          order.clientPhone,
          `✅ Pedido entregue! Obrigado por comprar no Cardápio Digital. Avalie o entregador se possível!`
        );

        // Delete active routing tracking now that it is completed
        setRoutes(prev => prev.filter(r => r.id !== routeId));
      }
    }
  };

  // Find routing coordinates or names
  const getOrderAddressText = (orderId: string) => {
    const o = deliveryOrders.find(od => od.id === orderId);
    if (!o) return 'Retirada no Balcão';
    return o.address.street ? `${o.address.street}, ${o.address.number}` : 'Endereço Indisponível';
  };

  return (
    <div id="rotas-view-container" className="space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </span>
            Painel Logístico GPRS & Rotas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mapeamento de rotas, acompanhamento vetorial e regras de roteamento automatizado de frotas.
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-650 dark:text-slate-300">Distribuição Automática</span>
            <button
              onClick={() => {
                setIsAutoDispatchEnabled(!isAutoDispatchEnabled);
                addLog(`Distribuição Automática ${!isAutoDispatchEnabled ? 'Habilitada' : 'Pausada'}.`);
              }}
              className={`w-9 h-5 rounded-full p-0.5 transition-all focus:outline-none ${
                isAutoDispatchEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAutoDispatchEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <button
            onClick={triggerAutoDispatch}
            className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/15 transition active:scale-95"
          >
            <Shuffle className="w-4 h-4" />
            Distribuir Agora
          </button>
        </div>
      </div>

      {/* EMERGENCY & ALERTS BANNER */}
      {alerts.length > 0 && (
        <div id="logistic-alerts-banner" className="bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/40 p-3.5 rounded-2xl flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-rose-800 dark:text-rose-300">Alertas Operacionais de Logística:</h4>
            <div className="list-disc pl-4 space-y-1 text-rose-700 dark:text-rose-450 font-medium">
              {alerts.map((al, idx) => (
                <p key={idx}>• {al}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CORE GRID: VECTOR RADAR MAP + TIMELINE CONTROLLIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* VECTOR PREMIUM GPS RADAR MAP (2 SPANS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl relative overflow-hidden h-[420px] flex flex-col justify-between shadow-2xl">
            {/* Dark grid patterns mimicking Uber custom style */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            
            {/* Gradient background radar glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-indigo-500/5 animate-pulse pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full border border-indigo-500/10 pointer-events-none" />

            {/* MAP RENDER VIA INLINE SVG STREETS LAYOUT */}
            <div className="absolute inset-0 select-none pointer-events-none">
              <svg className="w-full h-full opacity-30 stroke-slate-800 stroke-[1.5]" fill="none">
                {/* Simulated Street Grid Maps lines */}
                <line x1="5%" y1="10%" x2="95%" y2="90%" />
                <line x1="10%" y1="90%" x2="90%" y2="10%" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" className="stroke-indigo-950/40 stroke-2" />
                <line x1="0%" y1="50%" x2="100%" y2="50%" className="stroke-indigo-950/40 stroke-2" />
                <path d="M 50 100 Q 250 180 400 350" />
                <path d="M 0 20 Q 300 200 600 390" />
                <path d="M 120 400 Q 250 250 550 10" />
              </svg>
            </div>

            {/* Central Base Node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border border-white" />
              </div>
              <span className="bg-slate-950/95 text-emerald-400 font-bold border border-emerald-900/60 rounded px-1.5 py-0.5 mt-1 text-[8.5px] uppercase tracking-wider font-mono shadow-md">
                Base Prato Mineiro
              </span>
            </div>

            {/* DYNAMIC GPS PINS */}
            {/* Rendering pending destination pins */}
            {deliveryOrders.filter(o => o.status === 'EM ENTREGA').map((o) => {
              // Calculate randomized offsets based on numeric string
              const val = o.id.replace(/\D/g, '');
              const seedVal = val ? parseInt(val) : 55;
              const xOffset = 50 + (seedVal % 15) * ((seedVal % 2 === 0 ? 1 : -1) * 2.2);
              const yOffset = 50 + (seedVal % 11) * ((seedVal % 3 === 0 ? 1 : -1) * 2.5);

              return (
                <div
                  key={o.id}
                  className="absolute z-10 transition-all duration-1000"
                  style={{ top: `${yOffset}%`, left: `${xOffset}%` }}
                >
                  <div className="flex flex-col items-center">
                    <div className="relative group cursor-pointer">
                      <div className="absolute -inset-1 rounded-full bg-indigo-500 animate-ping opacity-60 pointer-events-none" />
                      <MapPin className="w-6 h-6 text-rose-500 fill-rose-500 animate-bounce" />
                    </div>
                    <span className="bg-slate-950 border border-slate-800 rounded px-1.5 text-[8.5px] text-slate-100 font-mono scale-90 whitespace-nowrap mt-0.5">
                      #{o.id} ({o.clientName.split(' ')[0]})
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Rendering online driving couriers */}
            {couriers.map((co) => {
              // Decide positioning based on whether they have active routes or are idle
              const val = co.name.charCodeAt(2) + co.name.charCodeAt(4);
              const isDelivering = co.status === 'Em entrega';
              const xLoc = isDelivering ? 38 + (val % 10) * 3 : 20 + (val % 8) * 4;
              const yLoc = isDelivering ? 68 - (val % 8) * 3.5 : 30 + (val % 10) * 3;

              return (
                <div
                  key={co.id}
                  className="absolute z-20 transition-all duration-1000"
                  style={{ top: `${yLoc}%`, left: `${xLoc}%` }}
                >
                  <div className="flex flex-col items-center">
                    <div className="relative cursor-pointer">
                      <div className={`p-1 rounded-full border shadow-lg ${
                        co.status === 'Disponível' ? 'bg-emerald-500 border-white text-white' :
                        co.status === 'Em entrega' ? 'bg-indigo-600 border-indigo-400 text-white animate-spin-slow' :
                        'bg-slate-600 border-slate-500 text-slate-300'
                      }`}>
                        <Bike className="w-3.5 h-3.5" />
                      </div>
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                        co.status === 'Disponível' ? 'bg-emerald-400' :
                        co.status === 'Em entrega' ? 'bg-indigo-400' : 'bg-slate-400'
                      }`} />
                    </div>
                    <span className="bg-slate-950/90 text-slate-300 backdrop-blur-xs font-mono font-bold text-[7.5px] px-1 rounded-md border border-slate-800 mt-0.5 whitespace-nowrap">
                      {co.name.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Vector Map Legend & Stats Overlay */}
            <div className="z-10 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[9px] uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Base</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block ml-2" />
                <span>Riders</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ml-2" />
                <span>Entregas</span>
              </div>
              <div className="text-slate-400 text-[10px] font-mono">
                Satélites GPS: <span className="text-emerald-400 font-extrabold animate-pulse">4 ATIVOS / 100% SINAL</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY ACTION LOG BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Tv2 className="w-4 h-4 text-slate-400" />
              Eventos Logísticos e Despachos do Sistema
            </h4>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
              {logMessages.map((log, index) => (
                <p key={index} className="border-b border-slate-100 dark:border-slate-900/60 py-0.5 last:border-0 truncate">
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ACTIVE ROUTES TIMELINE TRACKER (1 COLUMN) */}
        <div id="logistic-tracker-column" className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm h-full">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
            <h3 className="font-extrabold text-[12px] uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-indigo-500 animate-pulse" />
              Linha do Tempo de Rotas
            </h3>
            <span className="bg-slate-100 dark:bg-slate-950 border text-slate-550 font-mono text-[10px] px-2 py-0.5 rounded-md">
              {routes.length} rotas
            </span>
          </div>

          {/* Accept simulations alert box */}
          {routes.some(r => r.status === 'Aguardando Entregador') && (
            <div className="bg-indigo-50 dark:bg-indigo-955/20 border border-indigo-200 dark:border-indigo-900/50 p-3 rounded-xl space-y-2">
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Aceite Pendente no App
              </span>
              <p className="text-[10px] text-slate-600 dark:text-slate-300">
                O aplicativo do celular de entregas recebeu um chamado para o pedido de rota ativa. Registre a resposta do entregador:
              </p>
              
              <div className="space-y-1.5">
                {routes.filter(r => r.status === 'Aguardando Entregador').map(r => {
                  const riderName = couriers.find(c => c.id === r.courierId)?.name || 'Motoboy';
                  return (
                    <div key={r.id} className="bg-white/80 dark:bg-slate-950 p-2 rounded border border-indigo-100 dark:border-indigo-950 flex items-center justify-between gap-1.5">
                      <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350 truncate max-w-[80px]">
                        {riderName} ({r.orderId})
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => simulateRiderResponse(r.id, false)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[8.5px] px-2 py-0.5 rounded"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => simulateRiderResponse(r.id, true)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[8.5px] px-2 py-0.5 rounded"
                        >
                          Aceitar 👍
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE ROUTE LOGISTICS LISTINGS */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto overflow-x-hidden scrollbar-thin">
            {routes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Compass className="w-8 h-8 mx-auto stroke-[1.2] text-slate-300" />
                <p className="font-mono text-[10px] uppercase">Nenhuma rota ativa sendo despachada</p>
                <p className="text-[11px] text-slate-500">Mude o status de pedidos para "PRONTO" ou use a Distribuição Automática.</p>
              </div>
            ) : (
              routes.map(r => {
                const assignedRider = couriers.find(c => c.id === r.courierId);
                const progressPercentage = 
                  r.status === 'Entregador Aceitou' ? 16 :
                  r.status === 'Indo Retirada' ? 33 :
                  r.status === 'Pedido Coletado' ? 50 :
                  r.status === 'Em Rota' ? 75 :
                  r.status === 'Pedido Entregue' ? 100 : 5;

                return (
                  <div key={r.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/55 dark:border-slate-850 rounded-2xl relative space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9.5px] font-bold bg-slate-205 dark:bg-slate-900 border dark:border-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        #{r.orderId}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 rounded uppercase font-mono">
                        {r.status}
                      </span>
                    </div>

                    <div className="text-[11px] space-y-0.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Rider: <span className="text-slate-900 dark:text-white font-black">{assignedRider ? assignedRider.name : 'Doutor Indefinido'}</span>
                      </p>
                      <p className="text-[10px] text-slate-450 truncate">
                        Endereço: {getOrderAddressText(r.orderId)}
                      </p>
                    </div>

                    {/* Progress tracking line */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400">
                        <span>COLETA</span>
                        <span>EM ROTA</span>
                        <span>ENTREGUE</span>
                      </div>
                    </div>

                    {/* Meta info block */}
                    {r.status === 'Em Rota' && (
                      <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-2 rounded-lg border text-center text-[9px] font-mono leading-none">
                        <div>
                          <span className="text-slate-400 block text-[7.5px] uppercase">Dist.</span>
                          <span className="text-slate-700 dark:text-slate-100 font-extrabold">{r.remainingDistance}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[7.5px] uppercase">Resta</span>
                          <span className="text-indigo-555 font-extrabold animate-pulse">{r.remainingTime}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[7.5px] uppercase">Vel.</span>
                          <span className="text-slate-705 dark:text-slate-200 font-extrabold">{r.speedKmh} km/h</span>
                        </div>
                      </div>
                    )}

                    {/* Selector of step stages */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-200/40 dark:border-slate-850">
                      <span className="text-[8.5px] text-slate-400 block font-mono font-bold uppercase">Avançar Etapa Logística:</span>
                      <div className="flex flex-wrap gap-1">
                        {r.status === 'Aguardando Entregador' && (
                          <span className="text-[9.5px] italic text-slate-400">Aguardando aceite do App do entregador...</span>
                        )}
                        {r.status === 'Entregador Aceitou' && (
                          <button
                            onClick={() => updateRouteStepStatus(r.id, 'Indo Retirada')}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/45 text-indigo-600 dark:text-indigo-400 text-[8.5px] font-bold py-1 px-1.5 rounded-md border"
                          >
                            Ir para Retirada 🛵
                          </button>
                        )}
                        {r.status === 'Indo Retirada' && (
                          <button
                            onClick={() => updateRouteStepStatus(r.id, 'Pedido Coletado')}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/45 text-indigo-600 dark:text-indigo-400 text-[8.5px] font-bold py-1 px-1.5 rounded-md border"
                          >
                            Registrar Coleta ✅
                          </button>
                        )}
                        {r.status === 'Pedido Coletado' && (
                          <button
                            onClick={() => updateRouteStepStatus(r.id, 'Em Rota')}
                            className="bg-emerald-500 hover:bg-emerald-650 text-white text-[8.5px] font-bold py-1 px-1.5 rounded-md border border-emerald-500/20"
                          >
                            Despachar em Trânsito 📍
                          </button>
                        )}
                        {r.status === 'Em Rota' && (
                          <button
                            onClick={() => updateRouteStepStatus(r.id, 'Pedido Entregue')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] font-bold py-1 px-1.5 rounded-md border border-emerald-500/20 w-full text-center"
                          >
                            Finalizar Entrega (Recebido) ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
