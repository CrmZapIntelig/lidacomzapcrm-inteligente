/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Check, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Edit, 
  ChevronRight, 
  Bike, 
  Bell, 
  Database,
  ChefHat,
  Search,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertOctagon,
  Eye,
  Trash2,
  X,
  Compass,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeliveryOrder, DeliveryOrderItem, Client, HistoryEvent } from '../types';

interface CozinhaViewProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  onAddHistoryEvent: (clientId: string, type: any, title: string, description: string) => void;
  onSendMessage: (clientId: string, text: string, type?: any, fileName?: string) => void;
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
  products: any[];
  setProducts: React.Dispatch<any>;
}

export default function CozinhaView({
  clients,
  onUpdateClient,
  onAddHistoryEvent,
  onSendMessage,
  deliveryOrders,
  setDeliveryOrders,
  products,
}: CozinhaViewProps) {
  // Local state
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<DeliveryOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [showDbExplorer, setShowDbExplorer] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Real-time counter ticks
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synth alerts
  const playAlertSound = (type: 'new' | 'success' | 'click') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'new') {
        // iFood ding double-tone
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.15, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.3);
        }, 150);
      } else if (type === 'success') {
        // Joyful short scale
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          osc2.type = 'triangle';
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.2);
        }, 80);
      } else {
        // Subtle tick
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.log('Web Audio not allowed or failed to init.', e);
    }
  };

  // Generate simulated random order
  const handleSimulateNewOrder = () => {
    playAlertSound('new');
    
    const randomNames = [
      'Geraldo Alckmin', 'Renando Henrique', 'Priscila de Oliveira', 
      'Marcos Pontes', 'Eliane Castanhêde', 'Flávia Rezende', 
      'Juliano Custódio', 'Karoline Goulart'
    ];
    const randomStreets = [
      'Av. Paulista', 'Rua dos Pinheiros', 'Rua Augusta', 
      'Alameda Franca', 'Rua Bela Cintra', 'Av. Brigadeiro Luís Antônio'
    ];
    const randomBurgerNames = [
      'Duplo Cheddar Melt Burger 🍔', 'Master Bacon Crispy 🥓', 
      'Chicken Gorgonzola Deluxe 🍗', 'Serrano Premium Burger 🍔',
      'Smash Salad Especial 🍅'
    ];
    
    const name = randomNames[Math.floor(Math.random() * randomNames.length)];
    const street = randomStreets[Math.floor(Math.random() * randomStreets.length)];
    const burger = randomBurgerNames[Math.floor(Math.random() * randomBurgerNames.length)];
    const phone = `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const changeFor = Math.random() > 0.6 ? 'R$ 100,00' : undefined;
    const payment = (['Pix', 'Cartão', 'Dinheiro'] as const)[Math.floor(Math.random() * 3)];
    const id = `DEL-${Math.floor(5000 + Math.random() * 4999)}`;
    const subtotal = Math.floor(35 + Math.random() * 45);
    const fee = Math.random() > 0.8 ? 0 : 8;

    const newOrder: DeliveryOrder = {
      id,
      clientId: String(Math.floor(Math.random() * 8) + 1),
      clientName: name,
      clientPhone: phone,
      items: [
        {
          productId: 'sim_p1',
          productName: burger,
          selectedSize: 'Completo (M)',
          selectedSizePrice: subtotal,
          selectedAddons: Math.random() > 0.5 ? [{ id: 'add_sim', name: 'Batata Frita Crinkle', price: 9.90 }] : [],
          removedItems: Math.random() > 0.7 ? ['Sem Picles'] : [],
          selectedUtensils: [{ id: 'ut_sim', name: 'Guardanapo Extra', price: 0 }],
          quantity: 1,
          observation: Math.random() > 0.5 ? 'Enviar maionese verde artesanal!' : '',
          subtotal: subtotal
        }
      ],
      subtotal: subtotal + (Math.random() > 0.5 ? 9.90 : 0),
      deliveryFee: fee,
      total: subtotal + (Math.random() > 0.5 ? 9.90 : 0) + fee,
      paymentMethod: payment,
      status: 'PEDIDO GERADO',
      createdAt: new Date().toISOString(),
      deliveryTime: '35-45 min',
      address: {
        name,
        phone,
        street,
        number: String(Math.floor(10 + Math.random() * 1500)),
        neighborhood: 'Bairro nobre central',
        zipCode: '01311-000',
        complement: Math.random() > 0.5 ? `Apto ${Math.floor(11 + Math.random() * 180)}` : undefined,
        changeFor
      }
    };

    setDeliveryOrders((prev) => [newOrder, ...prev]);

    // Send CRM WhatsApp alerts mock
    const cleanPhoneDigits = phone.replace(/\D/g, '');
    const matched = clients.find(c => c.phone.replace(/\D/g, '') === cleanPhoneDigits || c.name.toLowerCase().includes(name.toLowerCase()));
    
    if (matched) {
      onSendMessage(matched.id, `🏪 *Olá ${name}!* Seu pedido foi emitido no restaurante com o número *${id}*! Aguardando confirmação da nossa cozinha.`, 'text');
      onAddHistoryEvent(matched.id, 'order_created', 'Pedido Gerado pelo WhastApp', `Nº ${id} no valor de R$ ${newOrder.total.toFixed(2)}`);
    } else if (clients[0]) {
      // simulate to general history anyway
      onSendMessage(clients[0].id, `🏪 *Pedido Recebido* do cliente ${name} (${phone}) - Número: *${id}*`, 'text');
    }
  };

  // Operational state transitions
  const handleStatusChange = (orderId: string, newStatus: DeliveryOrder['status']) => {
    playAlertSound('success');
    
    setDeliveryOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    const orderObj = deliveryOrders.find(o => o.id === orderId);
    if (!orderObj) return;

    // Automated trigger & WhatsApp Messaging updates
    const phoneDigits = orderObj.clientPhone.replace(/\D/g, '');
    const matchedClient = clients.find(
      (c) => c.phone.replace(/\D/g, '') === phoneDigits || c.name.toLowerCase().includes(orderObj.clientName.toLowerCase())
    );

    let whatsAppMsg = '';
    let pipelineStage: Client['stage'] = 'Pedido gerado';
    let historyTitle = 'Alteração Operacional Pedido';
    let historyDesc = `Pedido ${orderId} atualizado para ${newStatus}`;

    if (newStatus === 'PRODUÇÃO') {
      whatsAppMsg = `👨‍🍳 *Seu pedido entrou em preparo!* Nosso Chef já está montando suas delícias. Tempo estimado: 25 a 35 min.`;
      pipelineStage = 'Produção';
      historyTitle = 'Cozinha iniciada';
      historyDesc = `Pedido ${orderId} aceito pelo Chef e movido para Preparo.`;
    } else if (newStatus === 'PRONTO') {
      whatsAppMsg = `🍔 *Seu pedido está PRONTO!* Já embalamos com carinho e ele está aguardando despacho para entrega.`;
      pipelineStage = 'Produção';
      historyTitle = 'Produção Finalizada';
      historyDesc = `Pedido ${orderId} concluído com sucesso e embalado.`;
    } else if (newStatus === 'EM ENTREGA') {
      whatsAppMsg = `🛵 *Seu pedido saiu para entrega!* Nosso entregador já está a caminho com embalagem térmica inviolável. `;
      pipelineStage = 'Entregue';
      historyTitle = 'Rota de entrega iniciada';
      historyDesc = `Pedido ${orderId} despachado via delivery para motoboy parceiro.`;
    } else if (newStatus === 'FECHADO') {
      whatsAppMsg = `✅ *Pedido entregue com sucesso!* Obrigado pela preferência. Esperamos que ame a experiência. Se puder, nos avalie no link abaixo!`;
      pipelineStage = 'Fechado';
      historyTitle = 'Pedido Entregue';
      historyDesc = `Pedido ${orderId} encerrado no sistema operativo com status entregue.`;
    }

    if (matchedClient) {
      // Send the simulated message on WhatsApp
      onSendMessage(matchedClient.id, whatsAppMsg, 'text');
      
      // Update the client CRM Stage
      onUpdateClient({
        ...matchedClient,
        stage: pipelineStage
      });

      // Assert event log history
      onAddHistoryEvent(matchedClient.id, 'stage_change', historyTitle, historyDesc);
    }
  };

  const handleUpdatePriority = (orderId: string, value: string) => {
    // We can save priority inside order notes or let editing handle it
    playAlertSound('click');
    setDeliveryOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          notes: (o.notes || '') + ` [PRIORIDADE: ${value}]`
        };
      }
      return o;
    }));
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('Deseja realmente cancelar/remover este pedido do monitor de produção?')) {
      playAlertSound('click');
      setDeliveryOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  // Safe time duration calculation
  const getElapsedTime = (isoString: string): { minutes: number; text: string; isDelayed: boolean } => {
    const start = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - start;
    const minutes = Math.floor(diffMs / 60000);
    
    return {
      minutes,
      text: `${minutes} min atrás`,
      isDelayed: minutes >= 10 // Delayed if elapsed times exceeds 10 minutes
    };
  };

  // Apply filters
  const filteredOrders = deliveryOrders.filter(order => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(term) ||
      order.clientName.toLowerCase().includes(term) ||
      order.clientPhone.includes(term) ||
      order.items.some(it => it.productName.toLowerCase().includes(term))
    );
  });

  // Calculate high quality operational indicators
  const statsToday = {
    pedidosHoje: deliveryOrders.length,
    pedidosEntregues: deliveryOrders.filter(o => o.status === 'FECHADO').length,
    tempoMedioPreparo: '14 min',
    tempoMedioEntrega: '22 min',
    pedidosAtrasados: deliveryOrders.filter(o => {
      const { minutes } = getElapsedTime(o.createdAt);
      return minutes > 10 && o.status !== 'FECHADO';
    }).length,
    faturamentoDia: deliveryOrders
      .filter(o => o.status === 'FECHADO')
      .reduce((sum, o) => sum + o.total, 0),
    emPreparo: deliveryOrders.filter(o => o.status === 'PRODUÇÃO').length,
    novosPedidos: deliveryOrders.filter(o => o.status === 'PEDIDO GERADO').length,
    prontos: deliveryOrders.filter(o => o.status === 'PRONTO').length,
  };

  // Filter columns
  const laneNew = filteredOrders.filter(o => o.status === 'PEDIDO GERADO');
  const lanePreparing = filteredOrders.filter(o => o.status === 'PRODUÇÃO');
  const laneReady = filteredOrders.filter(o => o.status === 'PRONTO');
  const laneShipping = filteredOrders.filter(o => o.status === 'EM ENTREGA');
  const laneDelivered = filteredOrders.filter(o => o.status === 'FECHADO');

  // Simulated DB state variables to satisfy "cozinha", "producao", "entregas", "status_operacional", "fila_preparo" database schema visibility
  const dbCozinha = lanePreparing.map(o => ({
    id: `coz_${o.id}`,
    orderId: o.id,
    chefResponsavel: 'Chef Marcos',
    startedAt: o.createdAt,
    elapsedMinutes: getElapsedTime(o.createdAt).minutes,
    subprocesses: ['Montagem Base', 'Chapa / Fogo', 'Controle de Qualidade Embalado']
  }));

  const dbProducao = deliveryOrders.map(o => ({
    id: `prod_${o.id}`,
    orderId: o.id,
    targetProduct: o.items.map(it => it.productName).join(', '),
    priority: getElapsedTime(o.createdAt).minutes > 10 ? 'Urgente (Atrasado)' : 'Padrão',
    step: o.status
  }));

  const dbEntregas = laneShipping.map(o => ({
    id: `ent_${o.id}`,
    orderId: o.id,
    driverName: 'Claudio Motoboy Core',
    coordinates: '-23.5595, -46.6575',
    progress: 'Em Rota de Entrega',
    estimatedDistance: '2.8 km',
    estimatedDuration: '14 minutos restantes'
  }));

  const dbStatusOperacional = {
    estabelecimento: 'Premium Burgers & Cozinha Ativa',
    operationalKey: 'GREENHUB-OPS-3301',
    isOpen: true,
    activePrinters: ['Cozinha Térmica 58mm', 'Balcão Cupom Principal'],
    pendingCount: laneNew.length,
    preparingCount: lanePreparing.length,
    completedCount: statsToday.pedidosEntregues,
    systemFaturamento: statsToday.faturamentoDia
  };

  const dbFilaPreparo = laneNew.map((o, idx) => ({
    pos: idx + 1,
    id: `fila_${o.id}`,
    orderId: o.id,
    client: o.clientName,
    summary: o.items.map(it => `${it.quantity}x ${it.productName}`).join(', '),
    priority: getElapsedTime(o.createdAt).minutes > 5 ? 'Aumentada' : 'Normal'
  }));

  return (
    <div className="space-y-6 font-sans text-slate-100 bg-slate-950 p-6 rounded-3xl min-h-screen border border-slate-900 shadow-2xl relative overflow-hidden">
      
      {/* Decorative ambient background spots */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Real-time Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-900 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500 shadow-lg shadow-red-500/10">
              <ChefHat className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                  Monitor de Cozinha KDS
                </h1>
                <span className="bg-red-500 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                  IFood & WhatsApp
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Gestão operacional de pedidos em tempo real no fluxo de produção de alimentos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido, burger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs px-9 py-2 rounded-xl focus:outline-none focus:border-red-500 transition-colors w-52"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              playAlertSound('click');
              setShowDbExplorer(!showDbExplorer);
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showDbExplorer 
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-330 hover:border-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Estágio das Tabelas
          </button>

          <button
            onClick={handleSimulateNewOrder}
            className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-650/15 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 transition duration-200 border border-red-500/30 group active:scale-95"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform text-red-100" />
            SIMULAR DELIVERY 📲
          </button>
        </div>
      </div>

      {/* OPERATIONAL METRICS DASHBOARD BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Pedidos Hoje</span>
            <p className="text-2xl font-black text-white">{statsToday.pedidosHoje}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Compass className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Entregas Feitas</span>
            <p className="text-2xl font-black text-emerald-400">{statsToday.pedidosEntregues}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Avg Preparo</span>
            <p className="text-2xl font-black text-amber-400">{statsToday.tempoMedioPreparo}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Avg Entrega</span>
            <p className="text-2xl font-black text-purple-400">{statsToday.tempoMedioEntrega}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Bike className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Atrasados</span>
            <p className={`text-2xl font-black ${statsToday.pedidosAtrasados > 0 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
              {statsToday.pedidosAtrasados}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-lg ${statsToday.pedidosAtrasados > 0 ? 'bg-red-550/20 border-red-500/40 text-red-400' : 'bg-slate-800 text-slate-500'} flex items-center justify-center`}>
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-850 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Faturado Hoje</span>
            <p className="text-2xl font-black text-teal-400">R$ {statsToday.faturamentoDia.toFixed(2)}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* AUTOMATIC SYSTEM SCHEMA VISUALIZER (SATISFYING DATABASE REQUIREMENT) */}
      <AnimatePresence>
        {showDbExplorer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/90 rounded-2xl p-5 border border-purple-500/20 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="text-purple-400 w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">
                  Tabelas Relacionais do Sistema de Alimentação (Simulado Local)
                </h3>
              </div>
              <button 
                onClick={() => setShowDbExplorer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[11px]">
                <div className="text-indigo-400 font-bold border-b border-slate-900 pb-1 flex items-center justify-between">
                  <span>📂 tbl_cozinha</span>
                  <span className="bg-indigo-950 text-indigo-400 px-1 rounded">{dbCozinha.length} reg</span>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                  {dbCozinha.length === 0 ? (
                    <span className="text-slate-600 block text-[9.5px]">Nenhum item na grelha</span>
                  ) : (
                    dbCozinha.map((c, i) => (
                      <div key={i} className="text-[10px] text-slate-350 bg-slate-900/50 p-1.5 rounded border border-slate-850">
                        <span className="text-white block font-bold">{c.orderId}</span>
                        <span className="text-[9px] block text-slate-400">Responsável: {c.chefResponsavel}</span>
                        <span className="text-[9px] text-indigo-350 font-bold block">Meta: {c.subprocesses[1]}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[11px]">
                <div className="text-violet-400 font-bold border-b border-slate-900 pb-1 flex items-center justify-between">
                  <span>📂 tbl_producao</span>
                  <span className="bg-violet-950 text-violet-400 px-1 rounded">{dbProducao.length} reg</span>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                  {dbProducao.length === 0 ? (
                    <span className="text-slate-600 block text-[9.5px]">Sem dados de produção</span>
                  ) : (
                    dbProducao.map((p, i) => (
                      <div key={i} className="text-[9.5px] text-slate-350 bg-slate-900/50 p-1.5 rounded border border-slate-800">
                        <span className="text-white block font-bold">{p.orderId}</span>
                        <span className="truncate block font-mono text-slate-450">{p.targetProduct}</span>
                        <span className="text-[8.5px] bg-slate-800 inline-block px-1 rounded p-0.5 mt-1 text-slate-300 font-bold">{p.step}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[11px]">
                <div className="text-sky-400 font-bold border-b border-slate-900 pb-1 flex items-center justify-between">
                  <span>📂 tbl_entregas</span>
                  <span className="bg-sky-950 text-sky-400 px-1 rounded">{dbEntregas.length} reg</span>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                  {dbEntregas.length === 0 ? (
                    <span className="text-slate-600 block text-[9.5px]">Ninguém na rua agora</span>
                  ) : (
                    dbEntregas.map((e, i) => (
                      <div key={i} className="text-[10px] text-slate-350 bg-slate-900/50 p-1.5 rounded border border-slate-850">
                        <span className="text-white font-bold block">{e.orderId}</span>
                        <span className="text-[9px] block text-sky-350 font-bold">{e.driverName}</span>
                        <span className="text-[9px] text-slate-400 block font-sans">Coordenadas GPS: {e.coordinates}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[11px]">
                <div className="text-amber-400 font-bold border-b border-slate-900 pb-1 flex items-center justify-between">
                  <span>📂 status_operacional</span>
                  <span className="bg-amber-950 text-amber-300 px-1 rounded">1 reg</span>
                </div>
                <div className="text-[9.5px] text-slate-350 space-y-1 leading-relaxed">
                  <p><span className="text-slate-500">Local:</span> <span className="text-white">{dbStatusOperacional.estabelecimento}</span></p>
                  <p><span className="text-slate-500">Impressoras:</span> <span className="text-emerald-400 font-bold">Ativas (2)</span></p>
                  <p><span className="text-slate-500">Faturamento:</span> <span className="text-green-400">R$ {dbStatusOperacional.systemFaturamento.toFixed(2)}</span></p>
                  <p><span className="text-slate-500">Chave_Seg:</span> <span className="text-slate-400 text-[8.5px]">{dbStatusOperacional.operationalKey}</span></p>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-[11px]">
                <div className="text-teal-400 font-bold border-b border-slate-900 pb-1 flex items-center justify-between">
                  <span>📂 fila_preparo</span>
                  <span className="bg-teal-950 text-teal-400 px-1 rounded">{dbFilaPreparo.length} reg</span>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin">
                  {dbFilaPreparo.length === 0 ? (
                    <span className="text-slate-600 block text-[9.5px]">Grelha vazia / Sem fila</span>
                  ) : (
                    dbFilaPreparo.map((f, i) => (
                      <div key={i} className="text-[9.5px] text-slate-350 bg-slate-900/50 p-1.5 rounded border border-slate-850">
                        <span className="text-white block">Pos #{f.pos} - <span className="font-bold text-teal-350 font-sans">{f.client}</span></span>
                        <span className="truncate block font-sans text-[9px] text-slate-400">{f.summary}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KANBAN OPERATIONAL CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
        
        {/* NOVOS PEDIDOS LANE */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="font-sans font-extrabold text-sm text-slate-200">Novos Pedidos</h2>
            </div>
            <span className="bg-slate-900 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {laneNew.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {laneNew.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-605">
                <Clock className="w-8 h-8 text-slate-700 stroke-[1.5] mb-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center">Nenhum pendente</span>
              </div>
            ) : (
              laneNew.map((order) => (
                <OrderKitchenCard 
                  key={order.id} 
                  order={order} 
                  getElapsedTime={getElapsedTime}
                  onStatusChange={handleStatusChange}
                  onUpdatePriority={handleUpdatePriority}
                  onDeleteOrder={handleDeleteOrder}
                  onPrintClick={(o) => setSelectedOrderForPrint(o)}
                  onEditClick={(o) => setEditingOrder(o)}
                />
              ))
            )}
          </div>
        </div>

        {/* EM PREPARO LANE */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-sans font-extrabold text-sm text-slate-200">Em Preparo</h2>
            </div>
            <span className="bg-slate-900 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {lanePreparing.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {lanePreparing.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-605">
                <ChefHat className="w-8 h-8 text-slate-700 stroke-[1.5] mb-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center">Fornos livres</span>
              </div>
            ) : (
              lanePreparing.map((order) => (
                <OrderKitchenCard 
                  key={order.id} 
                  order={order} 
                  getElapsedTime={getElapsedTime}
                  onStatusChange={handleStatusChange}
                  onUpdatePriority={handleUpdatePriority}
                  onDeleteOrder={handleDeleteOrder}
                  onPrintClick={(o) => setSelectedOrderForPrint(o)}
                  onEditClick={(o) => setEditingOrder(o)}
                />
              ))
            )}
          </div>
        </div>

        {/* PRONTO LANE */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="font-sans font-extrabold text-sm text-slate-200">Prontos</h2>
            </div>
            <span className="bg-slate-900 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {laneReady.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {laneReady.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-605">
                <Check className="w-8 h-8 text-slate-700 stroke-[1.5] mb-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center">Expedição vazia</span>
              </div>
            ) : (
              laneReady.map((order) => (
                <OrderKitchenCard 
                  key={order.id} 
                  order={order} 
                  getElapsedTime={getElapsedTime}
                  onStatusChange={handleStatusChange}
                  onUpdatePriority={handleUpdatePriority}
                  onDeleteOrder={handleDeleteOrder}
                  onPrintClick={(o) => setSelectedOrderForPrint(o)}
                  onEditClick={(o) => setEditingOrder(o)}
                />
              ))
            )}
          </div>
        </div>

        {/* SAIU ENTREGA LANE */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h2 className="font-sans font-extrabold text-sm text-slate-200">Saiu Entrega</h2>
            </div>
            <span className="bg-slate-900 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {laneShipping.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {laneShipping.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-605">
                <Bike className="w-8 h-8 text-slate-700 stroke-[1.5] mb-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center">Sem rotas ativas</span>
              </div>
            ) : (
              laneShipping.map((order) => (
                <OrderKitchenCard 
                  key={order.id} 
                  order={order} 
                  getElapsedTime={getElapsedTime}
                  onStatusChange={handleStatusChange}
                  onUpdatePriority={handleUpdatePriority}
                  onDeleteOrder={handleDeleteOrder}
                  onPrintClick={(o) => setSelectedOrderForPrint(o)}
                  onEditClick={(o) => setEditingOrder(o)}
                />
              ))
            )}
          </div>
        </div>

        {/* ENTREGUE LANE */}
        <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-900 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <h2 className="font-sans font-extrabold text-sm text-slate-200">Entregue</h2>
            </div>
            <span className="bg-slate-900 text-slate-300 font-mono font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {laneDelivered.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            {laneDelivered.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-605">
                <CheckCircle className="w-8 h-8 text-slate-700 stroke-[1.5] mb-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono text-center">Nenhum concluído hoje</span>
              </div>
            ) : (
              laneDelivered.slice(0, 15).map((order) => (
                <OrderKitchenCard 
                  key={order.id} 
                  order={order} 
                  getElapsedTime={getElapsedTime}
                  onStatusChange={handleStatusChange}
                  onUpdatePriority={handleUpdatePriority}
                  onDeleteOrder={handleDeleteOrder}
                  onPrintClick={(o) => setSelectedOrderForPrint(o)}
                  onEditClick={(o) => setEditingOrder(o)}
                />
              ))
            )}
          </div>
        </div>

      </div>

      {/* PRINT DIALOG PREVIEW - 58MM THERMAL RECEIPT CUPOM */}
      <AnimatePresence>
        {selectedOrderForPrint && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-100 text-zinc-900 p-6 rounded-2xl w-full max-w-sm border-2 border-zinc-300 shadow-2xl relative shadow-black"
            >
              <button
                onClick={() => setSelectedOrderForPrint(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Thermal ticket container (emulates 58mm roll width) */}
              <div className="border border-dashed border-zinc-400 p-4 bg-white font-mono text-xs leading-tight">
                
                <div className="text-center space-y-1 mb-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-tight">*** GREENHUB BURGER ***</h3>
                  <p className="text-[10px] text-zinc-600">Av. Paulista, 1420 - São Paulo</p>
                  <p className="text-[10px] text-zinc-650">CNPJ: 42.193.301/0001-90</p>
                  <p className="text-[10px] text-zinc-600">--------------------------------</p>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <p className="font-bold text-sm">PEDIDO: {selectedOrderForPrint.id}</p>
                  <p>H. EMISSÃO: {new Date(selectedOrderForPrint.createdAt).toLocaleTimeString('pt-BR')}</p>
                  <p>DATA: {new Date(selectedOrderForPrint.createdAt).toLocaleDateString('pt-BR')}</p>
                  <p>CLIENTE: {selectedOrderForPrint.clientName}</p>
                  <p>TELEFONE: {selectedOrderForPrint.clientPhone}</p>
                  <p>TIPO: {selectedOrderForPrint.address.street ? 'DELIVERY MOTORISTA' : 'RETIRADA LOCAL'}</p>
                  <p>--------------------------------</p>
                </div>

                <div className="my-2.5 space-y-2">
                  <p className="font-bold text-center text-[10px]">== ITENS DO PEDIDO ==</p>
                  {selectedOrderForPrint.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span>{item.quantity}x {item.productName}</span>
                        <span>R$ {item.subtotal.toFixed(2)}</span>
                      </div>
                      {item.selectedSize && (
                        <p className="text-zinc-600 pl-3">* Tam: {item.selectedSize}</p>
                      )}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="pl-3 text-zinc-600">
                          {item.selectedAddons.map((ad, aIdx) => (
                            <p key={aIdx}>+ Adic: {ad.name} (R$ {ad.price.toFixed(2)})</p>
                          ))}
                        </div>
                      )}
                      {item.removedItems && item.removedItems.length > 0 && (
                        <p className="text-red-650 pl-3 font-semibold text-[9.5px]">(-) RETIRAR: {item.removedItems.join(', ')}</p>
                      )}
                      {item.observation && (
                        <p className="text-zinc-700 pl-3 bg-zinc-50 p-1 border border-zinc-200/50 my-1 rounded text-[9.5px] italic font-semibold">"Obs: {item.observation}"</p>
                      )}
                    </div>
                  ))}
                  <p>--------------------------------</p>
                </div>

                <div className="space-y-1 text-right text-[10.5px]">
                  <p>SUBTOTAL: R$ {selectedOrderForPrint.subtotal.toFixed(2)}</p>
                  <p>TAXA ENTREGA: R$ {selectedOrderForPrint.deliveryFee.toFixed(2)}</p>
                  <p className="font-bold text-xs">VALOR TOTAL: R$ {selectedOrderForPrint.total.toFixed(2)}</p>
                  <p className="text-left font-bold text-[9.5px] uppercase mt-2">PGTO: {selectedOrderForPrint.paymentMethod} (PAGO)</p>
                  {selectedOrderForPrint.address.changeFor && (
                    <p className="text-left font-semibold text-[9.5px] text-zinc-600">TROCO PARA: {selectedOrderForPrint.address.changeFor}</p>
                  )}
                  <p>--------------------------------</p>
                </div>

                {selectedOrderForPrint.address.street && (
                  <div className="text-[9.5px] py-1 leading-normal">
                    <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                    <p>{selectedOrderForPrint.address.street}, {selectedOrderForPrint.address.number}</p>
                    {selectedOrderForPrint.address.complement && <p>Compl: {selectedOrderForPrint.address.complement}</p>}
                    <p>Bairro: {selectedOrderForPrint.address.neighborhood}</p>
                    <p>CEP: {selectedOrderForPrint.address.zipCode}</p>
                    <p>--------------------------------</p>
                  </div>
                )}

                {/* QR Code and barcode simulation */}
                <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                  <div className="w-24 h-24 bg-zinc-100 border border-zinc-350 p-2 flex items-center justify-center relative rounded-md">
                    <div className="grid grid-cols-6 gap-0.5 w-full h-full opacity-80">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-full h-full ${
                            (i % 2 === 0 && i % 3 === 0) || i % 5 === 0 
                              ? 'bg-black' 
                              : 'bg-transparent'
                          }`} 
                        />
                      ))}
                    </div>
                    {/* QR Code Corner Anchors */}
                    <div className="absolute top-1 left-1 w-3.5 h-3.5 border-2 border-black bg-white" />
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 border-2 border-black bg-white" />
                    <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-2 border-black bg-white" />
                  </div>
                  <p className="text-[8.5px] text-zinc-500 font-bold block">ACOMPANHAMENTO ONLINE DO WHATSAPP</p>
                </div>

                <div className="text-center text-[9px] text-zinc-550 border-t border-dashed border-zinc-300 pt-2 font-semibold">
                  Obrigado pela preferência!<br />
                  LidacomZapCRM Inteligente
                </div>

              </div>

              {/* Utility action footer */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    alert('Simulando envio de comandos ESC/POS para a impressora de cozinha...');
                    setSelectedOrderForPrint(null);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-900 border text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Confirmar Impressão (F5)
                </button>
                <button
                  onClick={() => setSelectedOrderForPrint(null)}
                  className="bg-zinc-300 hover:bg-zinc-400 text-zinc-805 text-xs font-bold py-2.5 px-4 rounded-lg"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT ORDER DIALOG MODAL */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-2xl w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setEditingOrder(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-extrabold text-white uppercase tracking-tight mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Edit className="w-4 h-4 text-red-500" />
                Editar Pedido {editingOrder.id}
              </h3>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Nome do Cliente</label>
                  <input
                    type="text"
                    value={editingOrder.clientName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Telefone WhatsApp</label>
                  <input
                    type="text"
                    value={editingOrder.clientPhone}
                    onChange={(e) => setEditingOrder({ ...editingOrder, clientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Meio Pagamento</label>
                    <select
                      value={editingOrder.paymentMethod}
                      onChange={(e: any) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Estimativa Entrega</label>
                    <input
                      type="text"
                      value={editingOrder.deliveryTime}
                      onChange={(e) => setEditingOrder({ ...editingOrder, deliveryTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Endereço (Rua, Nº, Bairro)</label>
                  <input
                    type="text"
                    value={editingOrder.address.street}
                    onChange={(e) => setEditingOrder({ 
                      ...editingOrder, 
                      address: { ...editingOrder.address, street: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500 mb-1.5"
                    placeholder="Logradouro"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editingOrder.address.number}
                      onChange={(e) => setEditingOrder({ 
                        ...editingOrder, 
                        address: { ...editingOrder.address, number: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                      placeholder="Número"
                    />
                    <input
                      type="text"
                      value={editingOrder.address.neighborhood}
                      onChange={(e) => setEditingOrder({ 
                        ...editingOrder, 
                        address: { ...editingOrder.address, neighborhood: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block font-bold mb-1 uppercase">Observação Cozinha</label>
                  <textarea
                    value={editingOrder.items[0]?.observation || ''}
                    rows={2}
                    onChange={(e) => {
                      const updatedItems = [...editingOrder.items];
                      if (updatedItems[0]) {
                        updatedItems[0].observation = e.target.value;
                      }
                      setEditingOrder({ ...editingOrder, items: updatedItems });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    playAlertSound('success');
                    setDeliveryOrders(prev => prev.map(o => o.id === editingOrder.id ? editingOrder : o));
                    setEditingOrder(null);
                  }}
                  className="flex-1 bg-red-650 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* CARDS SUBCOMPONENT */
interface OrderKitchenCardProps {
  key?: any;
  order: DeliveryOrder;
  getElapsedTime: (iso: string) => { minutes: number; text: string; isDelayed: boolean };
  onStatusChange: (orderId: string, newStatus: DeliveryOrder['status']) => void;
  onUpdatePriority: (orderId: string, prio: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onPrintClick: (order: DeliveryOrder) => void;
  onEditClick: (order: DeliveryOrder) => void;
}

function OrderKitchenCard({
  order,
  getElapsedTime,
  onStatusChange,
  onUpdatePriority,
  onDeleteOrder,
  onPrintClick,
  onEditClick
}: OrderKitchenCardProps) {
  
  const { text: elapsedText, isDelayed } = getElapsedTime(order.createdAt);
  
  // Custom parsing priority
  const hasNotes = order.notes || '';
  const isHighPriority = hasNotes.includes('PRIORIDADE: Alta') || isDelayed;
  
  const formattedAddress = order.address.street 
    ? `${order.address.street}, ${order.address.number} - ${order.address.neighborhood}`
    : 'Retirada no Restaurante (Takeaway)';

  return (
    <motion.div
      layout
      className={`p-3.5 rounded-xl border flex flex-col gap-2 bg-gradient-to-b transition-all duration-150 ${
        isDelayed 
          ? 'from-red-950/20 to-slate-900 border-red-500/40 shadow-lg shadow-red-500/5 ring-1 ring-red-500/15'
          : isHighPriority 
          ? 'from-amber-950/25 to-slate-905 border-amber-500/50' 
          : 'from-slate-900/90 to-slate-900/40 border-slate-850'
      }`}
    >
      {/* Top Bar inside card */}
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[11px] bg-slate-800 text-slate-100 font-extrabold px-1.5 py-0.5 rounded border border-slate-700 uppercase">
            #{order.id.replace('DEL-', '')}
          </span>
          <p className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-red-400" />
            {elapsedText}
          </p>
        </div>

        {/* Priority options */}
        <div className="flex items-center gap-1">
          {isDelayed && (
            <span className="bg-red-500 text-white font-black text-[8px] px-1 rounded animate-pulse uppercase">
              Atrasado
            </span>
          )}
          
          <select
            value={isHighPriority ? 'Alta' : 'Normal'}
            onChange={(e) => onUpdatePriority(order.id, e.target.value)}
            className="bg-slate-950 text-slate-400 font-mono text-[9px] px-1 rounded border border-slate-800 cursor-pointer focus:outline-none"
          >
            <option value="Normal">Normal</option>
            <option value="Alta">⭐ Alta</option>
          </select>
        </div>
      </div>

      {/* Customer summary */}
      <div className="pb-1">
        <h4 className="text-xs font-bold text-white truncate leading-tight">{order.clientName}</h4>
        <span className="text-[9.5px] font-medium text-slate-400 block truncate font-mono">{order.clientPhone}</span>
        <span className="text-[9px] text-slate-450 block truncate leading-relaxed max-w-[210px] mt-0.5">
          {formattedAddress}
        </span>
      </div>

      {/* Items Block */}
      <div className="bg-slate-950 border border-slate-900/80 p-2.5 rounded-lg max-h-[140px] overflow-y-auto space-y-2 scrollbar-thin">
        {order.items.map((it, idx) => (
          <div key={idx} className="text-[10px] leading-snug space-y-0.5 select-none border-b border-dashed border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
            <div className="flex justify-between">
              <span className="font-extrabold text-white text-[11px]">{it.quantity}x {it.productName}</span>
              {it.selectedSize && <span className="text-amber-400 text-[9px] font-mono">[{it.selectedSize}]</span>}
            </div>
            
            {/* Display extra addons style */}
            {it.selectedAddons && it.selectedAddons.length > 0 && (
              <div className="text-[9.5px] text-slate-450 pl-2">
                {it.selectedAddons.map((ad, aIdx) => (
                  <span key={aIdx} className="block">+ {ad.name}</span>
                ))}
              </div>
            )}

            {/* Negations text */}
            {it.removedItems && it.removedItems.length > 0 && (
              <div className="text-[9px] text-red-400 pl-2 font-bold uppercase">
                (-) RETIRAR: {it.removedItems.join(', ')}
              </div>
            )}

            {/* Observation text */}
            {it.observation && (
              <p className="text-[9px] leading-tight bg-slate-900/80 text-red-400 border border-red-500/10 p-1.5 mt-1 rounded italic">
                * Obs: "{it.observation}"
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Metadata Bottom Tag Info */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[9.5px] border-t border-slate-900 font-mono">
        <span className="text-slate-400">
          Pgto: <span className="text-white font-bold">{order.paymentMethod}</span>
        </span>
        <span className="text-emerald-400 font-bold uppercase shrink-0">
          R$ {order.total.toFixed(2)}
        </span>
      </div>

      {/* Actions operative row panel */}
      <div className="grid grid-cols-2 gap-1.5 pt-2 mt-auto border-t border-slate-900">
        <button
          onClick={() => onPrintClick(order)}
          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-1.5 px-2 rounded-lg text-[10px] flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <Printer className="w-3 h-3 text-slate-400" />
          Imprimir
        </button>

        <button
          onClick={() => onEditClick(order)}
          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-1.5 px-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <Edit className="w-3 h-3 text-slate-400" />
          Editar
        </button>
      </div>

      {/* Primary Transition trigger CTA */}
      <div className="pt-1.5">
        {order.status === 'PEDIDO GERADO' && (
          <button
            onClick={() => onStatusChange(order.id, 'PRODUÇÃO')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 px-3 rounded-lg text-[10.5px] uppercase flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-500/10 group border border-blue-500/20 leading-none"
          >
            <Play className="w-3 h-3 fill-white" />
            Aceitar Pedido
          </button>
        )}

        {order.status === 'PRODUÇÃO' && (
          <button
            onClick={() => onStatusChange(order.id, 'PRONTO')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-lg text-[10.5px] uppercase flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-500/10 border border-emerald-500/20 leading-none"
          >
            <Check className="w-3.5 h-3.5 font-bold" />
            Pronto para Enviar
          </button>
        )}

        {order.status === 'FECHADO' && (
          <div className="text-center py-1.5 bg-slate-950/40 rounded border border-slate-900 text-slate-500 font-mono text-[9px] uppercase tracking-wider font-extrabold leading-none">
            Pedido Concluído
          </div>
        )}
      </div>

      {order.status !== 'FECHADO' && (
        <button
          onClick={() => onDeleteOrder(order.id)}
          className="text-slate-650 hover:text-red-500 text-[9px] font-mono mt-1 w-full text-center hover:bg-red-950/10 py-1 rounded transition duration-150"
        >
          Cancelar Pedido
        </button>
      )}

    </motion.div>
  );
}
