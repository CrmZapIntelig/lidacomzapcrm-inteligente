import React, { useState } from 'react';
import { Client, Order, WhatsappTemplate, AutomationFlowRule, AutomationLog, ChatbotNode } from '../types';
import { 
  GitMerge, 
  Activity, 
  Network, 
  MessageSquareHeart, 
  Bot, 
  Plus, 
  Search,
  Filter,
  Play,
  Pause,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Edit2,
  Copy,
  Trash2,
  Power,
  Wand2,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Props {
  clients: Client[];
  orders: Order[];
}

// Fallback inicial para popular as telas quando ainda não houver dados dedicados.
const mockTemplates: WhatsappTemplate[] = [
  { id: '1', name: 'Confirmação de Pedido', category: 'vendas', content: 'Olá {{nome}}! Seu pedido {{pedido}} no valor de {{valor}} foi confirmado! Agradecemos a preferência.', active: true, createdAt: 'Atual' },
  { id: '2', name: 'Pedido em Rota', category: 'entrega', content: 'Boas notícias {{nome}}! Seu pedido acabou de sair para entrega. Você pode rastrear aqui: {{rastreamento}}', active: true, createdAt: 'Atual' },
  { id: '3', name: 'Recuperação Carrinho', category: 'recuperação', content: 'Oi {{nome}}, vimos que você não finalizou o pedido. Preparamos um cupom: {{cupom}} para você aproveitar hoje!', active: true, createdAt: 'Atual' },
];

const mockLogs: AutomationLog[] = [
  { id: 'l1', type: 'automação', title: 'Fluxo Carrinho Abandonado Executado', description: 'Mensagem de recuperação enviada para cliente cadastrado.', date: 'Hoje' },
  { id: 'l2', type: 'mensagem', title: 'Template de Venda Enviado', description: 'Template de Confirmação enviado com sucesso.', date: 'Hoje' },
  { id: 'l3', type: 'erro', title: 'Falha no Gatilho', description: 'Gatilho operacional falhou. Retentativa agendada.', date: 'Hoje' },
  { id: 'l4', type: 'webhook', title: 'Webhook Recebido: Novo Pedido', description: 'Registro recebido com sucesso da origem operacional.', date: 'Hoje' },
];

const mockRules: AutomationFlowRule[] = [
  { id: 'r1', name: 'Recuperar Carrinho', trigger: 'carrinho abandonado', action: 'enviar WhatsApp', actionDetails: 'Template: Recuperação Carrinho', active: true },
  { id: 'r2', name: 'Avisar Clientes VIP', trigger: 'cliente VIP', action: 'adicionar tag', actionDetails: 'Tag: Cliente VIP', active: false },
  { id: 'r3', name: 'Alertar Atraso', trigger: 'entrega atrasada', action: 'gerar alerta', actionDetails: 'Alerta de Atraso Cozinha', active: true },
];

export default function CentralInteligenteView({ clients, orders }: Props) {
  const [activeTab, setActiveTab] = useState<'Automações' | 'Eventos' | 'Fluxos' | 'Templates' | 'Chatbot'>('Automações');

  const tabs = [
    { id: 'Automações', icon: GitMerge },
    { id: 'Eventos', icon: Activity },
    { id: 'Fluxos', icon: Network },
    { id: 'Templates', icon: MessageSquareHeart },
    { id: 'Chatbot', icon: Bot },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          Central Inteligente
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Crie, conecte e monitore automações, templates e endpoints do chatbot interagindo em tempo real.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.id}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[500px]">
        {activeTab === 'Automações' && <AutomacoesTab />}
        {activeTab === 'Eventos' && <EventosTab />}
        {activeTab === 'Fluxos' && <FluxosTab />}
        {activeTab === 'Templates' && <TemplatesTab />}
        {activeTab === 'Chatbot' && <ChatbotTab />}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components for Tabs
// -------------------------------------------------------------

function AutomacoesTab() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Regras de Automação</h3>
          <p className="text-sm text-slate-500">Configurações simples (SE/ENTÃO) ativas no sistema.</p>
        </div>
        <button className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Regra
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockRules.map((rule) => (
          <div key={rule.id} className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 hover:border-emerald-500/50 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 text-[10px] uppercase font-bold font-mono tracking-wider rounded-md ${
                rule.active 
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
              }`}>
                {rule.active ? 'Ativa' : 'Pausada'}
              </span>
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">{rule.name}</h4>
            
            <div className="space-y-3 mt-4">
              <div className="text-sm">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">SE (Gatilho)</span>
                <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-300 shadow-sm font-medium text-[13px]">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  {rule.trigger}
                </span>
              </div>
              
              <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-700 mx-auto" />

              <div className="text-sm">
                <span className="text-xs uppercase font-bold text-slate-400 block mb-1">ENTÃO (Ação)</span>
                <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-300 shadow-sm font-medium text-[13px]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <div className="flex flex-col">
                    <span>{rule.action}</span>
                    {rule.actionDetails && (
                      <span className="text-[10px] text-slate-500 font-normal">{rule.actionDetails}</span>
                    )}
                  </div>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventosTab() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Timeline de Eventos (Realtime)</h3>
          <p className="text-sm text-slate-500">Monitoramento 24/7 das ações automáticas do sistema.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-800">
        <ul className="space-y-6">
          {mockLogs.map((log, index) => (
            <li key={log.id} className="relative flex gap-4">
              {/* Line connector */}
              {index !== mockLogs.length - 1 && (
                <div className="absolute top-8 left-3.5 w-px h-full bg-slate-200 dark:bg-slate-800" />
              )}
              
              {/* Icon circle */}
              <div className="relative shrink-0 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                {log.type === 'erro' ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
                 log.type === 'webhook' ? <Activity className="w-4 h-4 text-indigo-500" /> :
                 log.type === 'automação' ? <GitMerge className="w-4 h-4 text-emerald-500" /> :
                 <CheckCircle2 className="w-4 h-4 text-slate-400" />}
              </div>

              {/* Content */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{log.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{log.description}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-2 sm:mt-0">
                  <Clock className="w-3.5 h-3.5" />
                  {log.date}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FluxosTab() {
  return (
    <div className="p-6 h-[600px] flex flex-col relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Construtor de Fluxos</h3>
          <p className="text-sm text-slate-500">Desenhe automações complexas (Drag and Drop UI Preview).</p>
        </div>
        <button className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Fluxo
        </button>
      </div>

      <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none bg-opacity-10">
        
        {/* Placeholder Flow Map */}
        <div className="relative">
          {/* Node 1 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl p-4 w-48 shadow-lg z-10 text-center">
            <Activity className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <h5 className="font-bold text-sm text-slate-800 dark:text-white">Gatilho</h5>
            <p className="text-xs text-slate-500">Carrinho Abandonado</p>
          </div>
          
          {/* SVG line */}
          <svg className="absolute w-32 h-32 top-10 left-1/2 -translate-x-1/2 overflow-visible">
             <path d="M 0 0 C 0 50, 0 50, 0 100" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="4" className="animate-pulse" />
          </svg>

          {/* Node 2 */}
          <div className="mt-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 w-48 shadow-lg z-10 text-center mx-auto">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <h5 className="font-bold text-sm text-slate-800 dark:text-white">Aguardar</h5>
            <p className="text-xs text-slate-500">2 horas</p>
          </div>

          <svg className="absolute w-32 h-32 mt-4 left-1/2 -translate-x-1/2 overflow-visible">
            <path d="M 0 0 C 0 25, -60 25, -60 50" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="4" />
            <path d="M 0 0 C 0 25, 60 25, 60 50" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="4" />
          </svg>

          {/* Node 3 & 4 (Branch) */}
          <div className="flex gap-16 mt-16 px-10 relative left-1/2 -translate-x-1/2 w-max">
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-xl p-4 w-48 shadow-lg text-center">
              <MessageSquareHeart className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <h5 className="font-bold text-sm text-slate-800 dark:text-white">WhatsApp</h5>
              <p className="text-xs text-slate-500">Enviar Template</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 border border-rose-500/50 rounded-xl p-4 w-48 shadow-lg text-center">
              <GitMerge className="w-5 h-5 text-rose-500 mx-auto mb-2" />
              <h5 className="font-bold text-sm text-slate-800 dark:text-white">Tag</h5>
              <p className="text-xs text-slate-500">Perdido</p>
            </div>
          </div>
        </div>

        {/* floating tools */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl shadow border border-slate-200 dark:border-slate-800">
           <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><Plus className="w-5 h-5" /></button>
           <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1"/>
           <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><Search className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Templates Multi-Canal (WhatsApp e RCS)</h3>
          <p className="text-sm text-slate-500">Modelos prontos com suporte a variáveis dinâmicas para ambas as redes.</p>
        </div>
        <button className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTemplates.map((template) => (
          <div key={template.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-colors flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                {template.category}
              </span>
              <div className="flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><Edit2 className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"><Copy className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            
            <div className="p-4 flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">{template.name}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[13px]">
                {template.content.split(/(\{\{[^}]+\}\})/).map((part, i) => 
                  part.startsWith('{{') ? <span key={i} className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-1 rounded">{part}</span> : <span key={i}>{part}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatbotTab() {
  return (
    <div className="p-6 flex flex-col lg:flex-row gap-8">
      {/* Visual Configurator */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fluxos do Chatbot Multi-Canal (WA/RCS)</h3>
            <p className="text-sm text-slate-500">Configure menus automáticos e triagem de atendimento atuando nos dois canais simultaneamente.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
             <div className="flex justify-between items-center mb-4">
               <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <Bot className="w-5 h-5 text-emerald-500" />
                 Menu Principal (Saudação)
               </h4>
               <span className="text-xs bg-emerald-100 text-emerald-700 px-2 rounded-full font-bold uppercase tracking-wider">Ativo</span>
             </div>
             
             <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-mono mb-4">
                "Olá! Sou o assistente virtual. Como posso ajudar hoje? Escolha uma opção abaixo:"
             </div>

             <div className="space-y-2 pl-4 border-l-2 border-emerald-500/30">
               <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">1</div> Fazer Pedido (Cardápio)</span>
                 <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">2</div> Rastreio / Status da Entrega</span>
                 <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><div className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">3</div> Falar com Atendente Humano</span>
                 <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
             </div>

             <button className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
               <Plus className="w-4 h-4" /> Adicionar Opção
             </button>
          </div>
        </div>
      </div>

      {/* Emulator Sidebar */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-[500px] flex flex-col shadow-xl overflow-hidden">
           <div className="bg-emerald-600 p-4 text-white flex items-center justify-between shadow-md relative z-10">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                 <Bot className="w-5 h-5" />
               </div>
               <div>
                 <h4 className="font-bold text-sm">Bot Emulator</h4>
                 <span className="text-[10px] opacity-80 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" /> Online</span>
               </div>
             </div>
             <Power className="w-4 h-4 opacity-50" />
           </div>

           <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-emerald-50 dark:bg-slate-950 p-4 overflow-y-auto flex flex-col gap-4 bg-opacity-30">
              <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-sm text-[13px] shadow-sm max-w-[85%] border border-slate-100 dark:border-slate-700/50">
                Olá! Sou o assistente virtual. Como posso ajudar hoje? Escolha uma opção abaixo:
              </div>

              <div className="flex flex-col gap-2 w-[85%] pl-2">
                <button className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 p-2 rounded-xl text-left text-[12px] font-medium shadow-sm hover:brightness-95 transition-all outline-none">
                  1 - Fazer Pedido
                </button>
                <button className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 p-2 rounded-xl text-left text-[12px] font-medium shadow-sm hover:brightness-95 transition-all outline-none">
                  2 - Rastrear Entrega
                </button>
                <button className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-left text-[12px] font-medium shadow-sm hover:brightness-95 transition-all outline-none">
                  3 - Falar com Atendente
                </button>
              </div>
           </div>

           <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
             <input type="text" placeholder="Digite uma mensagem..." className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm px-3 focus:ring-2 ring-emerald-500 outline-none" disabled />
           </div>
        </div>
      </div>

    </div>
  );
}
