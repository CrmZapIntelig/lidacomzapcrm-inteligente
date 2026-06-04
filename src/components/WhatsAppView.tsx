/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  UserCheck2,
  Users,
  Ban,
  Tag,
  Clock,
  MoreVertical,
  Plus,
  Send,
  Smile,
  Mic,
  Image as ImageIcon,
  Paperclip,
  CheckCheck,
  Calendar,
  AlertCircle,
  ShoppingBag,
  History,
  X,
  Sparkles,
  BookOpen,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { Client, Message, FunnelStage, ContactType, HistoryEvent } from '../types';
import { FUNNEL_STAGES } from '../utils/mockData';

interface WhatsAppViewProps {
  clients: Client[];
  messages: Record<string, Message[]>;
  onSendMessage: (clientId: string, text: string, type?: 'text' | 'image' | 'audio' | 'file', fileName?: string) => void;
  onUpdateClient: (updated: Client) => void;
  onAddHistoryEvent: (clientId: string, type: HistoryEvent['type'], title: string, description: string) => void;
  selectedClient: Client | null;
  onSelectClient: (client: Client | null) => void;
  onOpenOrderModal: (client: Client) => void;
}

const TEMPLATES = [
  'Olá {nome}! Tudo bem? Seu pedido já foi processado e está indo para a área de expedição. Logo te envio o código de rastreamento!',
  'Oi {nome}, recebemos seu contato de interesse no catálogo. Tem algum tamanho ou cor preferida que gostaria de consultar?',
  'Olá! Verifiquei que seu pagamento Pix foi aprovado com sucesso. Obrigado pela preferência! 🎉',
  'Olá, {nome}! Vi que conversamos e acabou não finalizando o pedido. Conseguimos liberar 5% de desconto se fechar hoje. O que acha?',
];

export default function WhatsAppView({
  clients,
  messages,
  onSendMessage,
  onUpdateClient,
  onAddHistoryEvent,
  selectedClient,
  onSelectClient,
  onOpenOrderModal,
}: WhatsAppViewProps) {
  const [chatFilter, setChatFilter] = useState<'todos' | 'salvo' | 'nao_salvo' | 'grupo' | 'bloqueado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  
  // Custom states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  // Quick tagging actions
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  // Quick note/scheduling
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Active side-sub-tab: "acoes" or "historico"
  const [sideSubTab, setSideSubTab] = useState<'acoes' | 'historico'>('acoes');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedClient]);

  // Audio simulation timer
  useEffect(() => {
    if (showAudioRecorder) {
      setAudioSeconds(0);
      audioIntervalRef.current = setInterval(() => {
        setAudioSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [showAudioRecorder]);

  // Handle client selection resetting side states
  const handleSelectChat = (client: Client) => {
    onSelectClient(client);
    setShowEmojiPicker(false);
    setShowTemplates(false);
    setShowAttachmentMenu(false);
    setShowNewTagForm(false);
    setShowScheduleForm(false);
  };

  // Filter & Search Contacts
  const filteredClients = clients.filter((client) => {
    // Stage Filter first
    if (chatFilter !== 'todos' && client.type !== chatFilter) {
      return false;
    }
    // Search query match
    const q = searchQuery.toLowerCase();
    const matchesName = client.name.toLowerCase().includes(q);
    const matchesPhone = client.phone.includes(q);
    const matchesTags = client.tags.some((t) => t.toLowerCase().includes(q));
    const matchesStage = client.stage.toLowerCase().includes(q);
    return matchesName || matchesPhone || matchesTags || matchesStage;
  });

  const activeChatMessages = selectedClient ? (messages[selectedClient.id] || []) : [];

  const handleSendText = () => {
    if (!selectedClient || !inputText.trim()) return;
    onSendMessage(selectedClient.id, inputText.trim(), 'text');
    setInputText('');
    setShowEmojiPicker(false);
    setShowTemplates(false);
  };

  const handleSendTemplate = (tpl: string) => {
    if (!selectedClient) return;
    const clientName = selectedClient.type === 'nao_salvo' ? 'Cliente' : selectedClient.name;
    const text = tpl.replace(/{nome}/g, clientName);
    onSendMessage(selectedClient.id, text, 'text');
    setShowTemplates(false);
  };

  const handleSendAudio = () => {
    if (!selectedClient) return;
    const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    const durationText = formatTime(audioSeconds);
    onSendMessage(selectedClient.id, `Mensagem de Áudio Escutada`, 'audio', durationText);
    setShowAudioRecorder(false);
  };

  const handleSendImage = () => {
    if (!selectedClient) return;
    onSendMessage(selectedClient.id, `Design de Produto Inverno.jpeg`, 'image');
    setShowAttachmentMenu(false);
  };

  const handleSendFile = () => {
    if (!selectedClient) return;
    onSendMessage(selectedClient.id, `Catalogo_Precos_CRM_V5.pdf`, 'file');
    setShowAttachmentMenu(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Quick Action Buttons
  const handleChangeStage = (stage: FunnelStage) => {
    if (!selectedClient) return;
    const oldStage = selectedClient.stage;
    const updated = { ...selectedClient, stage };
    onUpdateClient(updated);
    onAddHistoryEvent(selectedClient.id, 'stage_change', 'Mudança de Funil', `Alterado de ${oldStage} para ${stage}`);
  };

  const handleMarkClosed = () => {
    if (!selectedClient) return;
    handleChangeStage('Fechado');
  };

  const handleAddTag = () => {
    if (!selectedClient || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!selectedClient.tags.includes(tag)) {
      const updated = { ...selectedClient, tags: [...selectedClient.tags, tag] };
      onUpdateClient(updated);
      onAddHistoryEvent(selectedClient.id, 'tag_added', 'Tag Adicionada', `Tag "${tag}" vinculada ao cliente.`);
    }
    setNewTagInput('');
    setShowNewTagForm(false);
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, tags: selectedClient.tags.filter((t) => t !== tag) };
    onUpdateClient(updated);
    onAddHistoryEvent(selectedClient.id, 'tag_added', 'Tag Removida', `Tag "${tag}" desvinculada do cliente.`);
  };

  const handleScheduleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !scheduleDate) return;
    const note = `Retorno Agendado para ${scheduleDate} - Notas: ${scheduleNotes}`;
    const updated = {
      ...selectedClient,
      notes: [...selectedClient.notes, note],
    };
    onUpdateClient(updated);
    onAddHistoryEvent(selectedClient.id, 'note_added', 'Retorno Agendado', `Lembrete de retorno definido para ${scheduleDate}`);
    setScheduleDate('');
    setScheduleNotes('');
    setShowScheduleForm(false);
  };

  const handleSendCatalog = () => {
    if (!selectedClient) return;
    const text = '📚 Aqui está o nosso Catálogo de Produtos Atualizado de nossa Linha Inverno e Coleções! Sinta-se à vontade para escolher seus modelos.';
    onSendMessage(selectedClient.id, text, 'text');
    onSendMessage(selectedClient.id, 'Catalogo_Precos_CRM_V5.pdf', 'file');
  };

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden font-sans shadow-xs relative">
      
      {/* 1. LEFT SIDEBAR: Conversas & Contatos */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-905 shrink-0">
        
        {/* Connection status header */}
        <div className="p-3 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate leading-none">
              WhatsApp
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate leading-none">
              Google RCS
            </span>
          </div>
        </div>

        {/* Filters Tabs row */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none flex gap-1 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setChatFilter('todos')}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap shrink-0 transition-all font-medium ${
              chatFilter === 'todos'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setChatFilter('salvo')}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap shrink-0 transition-all font-medium flex items-center gap-1 ${
              chatFilter === 'salvo'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Salvos
          </button>
          <button
            onClick={() => setChatFilter('nao_salvo')}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap shrink-0 transition-all font-medium flex items-center gap-1 ${
              chatFilter === 'nao_salvo'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Não Salvos
          </button>
          <button
            onClick={() => setChatFilter('grupo')}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap shrink-0 transition-all font-medium flex items-center gap-1 ${
              chatFilter === 'grupo'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Grupos
          </button>
          <button
            onClick={() => setChatFilter('bloqueado')}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap shrink-0 transition-all font-medium flex items-center gap-1 ${
              chatFilter === 'bloqueado'
                ? 'bg-emerald-500 text-white font-bold'
                : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Bloqueados
          </button>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
          {filteredClients.length === 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nenhum canal ou chat atende aos filtros</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const msgs = messages[client.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const isSelected = selectedClient?.id === client.id;
              
              const stageConfig = FUNNEL_STAGES.find((s) => s.id === client.stage);

              return (
                <div
                  key={client.id}
                  onClick={() => handleSelectChat(client)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer relative transition-all ${
                    isSelected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${client.avatarColor || 'bg-slate-300'} text-white flex items-center justify-center font-bold text-sm shrink-0 select-none shadow-xs`}>
                    {client.name.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        {client.channel === 'rcs' ? (
                          <div title="Google Messages (RCS)" className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        ) : client.channel === 'ambos' ? (
                           <div title="Omnichannel" className="flex shrink-0"><div className="w-1.5 h-2 bg-emerald-500 rounded-l-full" /><div className="w-1.5 h-2 bg-blue-500 rounded-r-full" /></div>
                        ) : client.channel === 'mesa_qr' ? (
                           <div title="Mesa QR" className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        ) : client.channel === 'delivery' ? (
                           <div title="Delivery" className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        ) : (
                          <div title="WhatsApp" className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        {client.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] font-mono text-slate-400">{lastMsg.timestamp}</span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : 'Conversar agora'}
                    </p>

                    <div className="flex items-center justify-between gap-1 mt-2">
                      <span className={`text-[9px] font-mono font-medium tracking-tight px-1.5 py-0.2 rounded-full border shrink-0 ${stageConfig?.bgColor} ${stageConfig?.color} ${stageConfig?.borderColor}`}>
                        {stageConfig?.label}
                      </span>
                      {client.type !== 'salvo' && (
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full shrink-0">
                          {client.type === 'nao_salvo' ? 'não salvo' : client.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MIDDLE COLUMN: Interactive Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-250 dark:border-slate-800 transition-colors">
        {selectedClient ? (
          <>
            {/* Active chat header with contact basics */}
            <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${selectedClient.avatarColor} text-white flex items-center justify-center font-bold font-sans text-sm shadow-xs`}>
                  {selectedClient.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                    {selectedClient.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-mono text-slate-400">{selectedClient.phone}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                      selectedClient.channel === 'rcs' ? 'text-blue-500' : 
                      selectedClient.channel === 'mesa_qr' ? 'text-amber-500' : 
                      'text-emerald-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        selectedClient.channel === 'rcs' ? 'bg-blue-500' : 
                        selectedClient.channel === 'mesa_qr' ? 'bg-amber-500' : 
                        'bg-emerald-500'
                      }`} />
                      {selectedClient.channel === 'rcs' ? 'RCS online' : 
                       selectedClient.channel === 'ambos' ? 'Omni online' : 
                       selectedClient.channel === 'mesa_qr' ? 'Mesa online' : 
                       'WA online'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSideSubTab(sideSubTab === 'historico' ? 'acoes' : 'historico')}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Timeline de histórico"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Micro Messaging Logs scroll viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50 dark:bg-slate-950/40 scrollbar-thin">
              {activeChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Smile className="w-10 h-10 text-emerald-500 mb-2 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Inicie uma nova jornada</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">As mensagens de disparo serão pré-preenchidas abaixo para sua aprovação.</p>
                </div>
              ) : (
                activeChatMessages.map((msg) => {
                  const isUser = msg.sender === 'operador';
                  const isSystem = msg.sender === 'sistema';
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-1.5">
                        <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-medium px-3 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/50 shadow-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {msg.text} ({msg.timestamp})
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in-20 duration-150`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
                          isUser
                            ? 'bg-emerald-500 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/70 dark:border-slate-800/80'
                        }`}
                      >
                        {/* Audio Media Display */}
                        {msg.type === 'audio' && (
                          <div className="flex items-center gap-3.5 py-1 min-w-[200px]">
                            <button className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-400 text-white dark:text-slate-950 flex items-center justify-center font-bold">
                              ▶
                            </button>
                            <div className="flex-1">
                              <div className="h-1 bg-slate-200/60 dark:bg-slate-700 rounded-full w-full relative overflow-hidden">
                                <div className="absolute left-0 top-0 h-full w-[45%] bg-emerald-600 dark:bg-emerald-400" />
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono mt-1 block">Áudio enviado ({msg.fileName})</span>
                            </div>
                            <Mic className="w-4.5 h-4.5 shrink-0 animate-pulse text-emerald-500" />
                          </div>
                        )}

                        {/* Image Media Display */}
                        {msg.type === 'image' && (
                          <div className="space-y-1.5 max-w-[220px]">
                            <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/50">
                              <ImageIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <span className="text-[11px] block font-semibold underline truncate text-emerald-600 dark:text-emerald-400">{msg.text}</span>
                          </div>
                        )}

                        {/* File Media Display */}
                        {msg.type === 'file' && (
                          <div className="flex items-center gap-2.5 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl max-w-[220px] border border-slate-200/20">
                            <Paperclip className="w-6 h-6 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-800 dark:text-slate-250 truncate leading-none">{msg.text}</p>
                              <span className="text-[8px] font-mono text-slate-400">PDF • 1.4 MB</span>
                            </div>
                          </div>
                        )}

                        {/* Normal Plain Text message */}
                        {(!msg.type || msg.type === 'text') && (
                          <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-slate-400 font-mono select-none">
                          <span>{msg.timestamp}</span>
                          {isUser && <CheckCheck className="w-3.2 h-3.2 text-blue-400 shrink-0" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Popovers Overlay row (Emoji picker, Catalog triggers, Template triggers) */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs shrink-0 relative flex flex-wrap items-center gap-2 z-10">
              
              {/* Emojis Trigger */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowTemplates(false);
                    setShowAttachmentMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                    showEmojiPicker ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span>Emoji</span>
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl shadow-xl flex gap-1.5 text-lg z-30 animate-in fade-in-5 duration-100">
                    {['💡', '👍', '🙏', '🎉', '🔥', '📍', '💰', '🚚', '📦'].map((em) => (
                      <button key={em} onClick={() => handleEmojiClick(em)} className="hover:scale-125 transition">
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Templates Trigger */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTemplates(!showTemplates);
                    setShowEmojiPicker(false);
                    setShowAttachmentMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                    showTemplates ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>Templates</span>
                </button>
                {showTemplates && (
                  <div className="absolute bottom-11 left-0 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-72 max-h-56 overflow-y-auto p-2.5 z-30 space-y-2 animate-in slide-in-from-bottom-2 duration-120 scrollbar-thin">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Selecione para enviar rápido:</p>
                    {TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendTemplate(tpl)}
                        className="w-full text-left text-xs p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-750 transition"
                      >
                        {tpl.replace(/{nome}/g, selectedClient.type === 'nao_salvo' ? 'Cliente' : selectedClient.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Catalog Send shortcut */}
              <button
                onClick={handleSendCatalog}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Enviar Catálogo</span>
              </button>
            </div>

            {/* Input message form controls */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 z-10">
              <div className="flex items-center gap-3">
                {/* Audio Recording Toggle Trigger */}
                <button
                  type="button"
                  onClick={() => setShowAudioRecorder(!showAudioRecorder)}
                  className={`p-2.5 rounded-xl border transition ${
                    showAudioRecorder
                      ? 'bg-rose-500 text-white border-rose-500 animation-pulse'
                      : 'hover:bg-slate-50 text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                  title="Simular Gravação de Áudio"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Simulated Audio dispatch block */}
                {showAudioRecorder ? (
                  <div className="flex-1 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl flex items-center justify-between border border-rose-100 dark:border-rose-900 z-10 animate-pulse">
                    <div className="flex items-center gap-2 text-rose-500 text-xs font-bold font-mono">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                      GRAVANDO DEPOIMENTO CLS: {audioSeconds}s
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAudioRecorder(false)}
                        className="text-xs text-slate-500 font-bold hover:underline"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={handleSendAudio}
                        className="text-xs bg-rose-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-rose-600 transition"
                      >
                        Enviar Áudio
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Attachment menu expand */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowAttachmentMenu(!showAttachmentMenu);
                          setShowEmojiPicker(false);
                          setShowTemplates(false);
                        }}
                        className={`p-2.5 rounded-xl border hover:bg-slate-50 text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-805 dark:border-slate-700 ${
                          showAttachmentMenu ? 'bg-slate-200' : ''
                        }`}
                        title="Enviar anexo"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      {showAttachmentMenu && (
                        <div className="absolute bottom-12 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-40 flex flex-col gap-1 w-44 animate-in fade-in-5 duration-100">
                          <button
                            onClick={handleSendImage}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-350 font-medium"
                          >
                            <ImageIcon className="w-4 h-4 text-emerald-500" />
                            <span>Enviar Imagem</span>
                          </button>
                          <button
                            onClick={handleSendFile}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-350 font-medium"
                          >
                            <Paperclip className="w-4 h-4 text-blue-500" />
                            <span>Enviar PDF/Doc</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendText();
                      }}
                      className="flex-1 flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Digite sua mensagem proativa aqui..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 font-bold text-white px-5 rounded-xl flex items-center justify-center gap-1 shrink-0 shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                      >
                        <Send className="w-4.5 h-4.5" />
                        <span className="hidden sm:inline text-xs">Enviar</span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Central de Conversas do WhatsApp</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Selecione um contato na barra lateral esquerda para iniciar os diálogos, criar pedidos comerciais e operar o funil.
            </p>
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL: CRM Workspace Integration */}
      {selectedClient && (
        <div className="w-80 h-full flex flex-col bg-white dark:bg-slate-900 overflow-y-auto border-l border-slate-200 dark:border-slate-805 shrink-0 transition-all scrollbar-thin">
          
          {/* Tabs row for Acões vs Timeline */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 select-none">
            <button
              onClick={() => setSideSubTab('acoes')}
              className={`flex-1 text-center py-3 text-xs font-semibold ${
                sideSubTab === 'acoes'
                  ? 'border-b-2 border-emerald-500 text-emerald-500'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              Ações Rápidas
            </button>
            <button
              onClick={() => setSideSubTab('historico')}
              className={`flex-1 text-center py-3 text-xs font-semibold ${
                sideSubTab === 'historico'
                  ? 'border-b-2 border-emerald-500 text-emerald-500'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
              }`}
            >
              Timeline Cliente
            </button>
          </div>

          <div className="flex-1 p-4 space-y-5">
            {sideSubTab === 'acoes' ? (
              <>
                {/* Visual Pipeline stage switcher */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Etapa Funil Kanban</span>
                  <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/50 dark:border-slate-750">
                    <select
                      value={selectedClient.stage}
                      onChange={(e) => handleChangeStage(e.target.value as FunnelStage)}
                      className="w-full text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1"
                    >
                      {FUNNEL_STAGES.map((stg) => (
                        <option key={stg.id} value={stg.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                          {stg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Call order action module */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fatura de Pedidos</span>
                  <button
                    onClick={() => onOpenOrderModal(selectedClient)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition"
                  >
                    <ShoppingBag className="w-4.5 h-4.5" />
                    <span>Gerar Pedido no Chat</span>
                  </button>
                </div>

                {/* Marking closed leads shortcut */}
                <div>
                  <button
                    onClick={handleMarkClosed}
                    disabled={selectedClient.stage === 'Fechado'}
                    className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition ${
                      selectedClient.stage === 'Fechado'
                        ? 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-805 dark:border-slate-700/50'
                        : 'border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Marcar como Fechado</span>
                  </button>
                </div>

                {/* Multi Tags chip configuration */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Etiquetas / Tags</span>
                    <button
                      onClick={() => setShowNewTagForm(!showNewTagForm)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      {showNewTagForm ? 'Cancelar' : 'Adicionar'}
                    </button>
                  </div>

                  {showNewTagForm && (
                    <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700 animate-in slide-in-from-top-1">
                      <input
                        type="text"
                        placeholder="Tag..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <button onClick={handleAddTag} className="bg-emerald-500 text-white font-bold p-1 rounded-md text-xs">
                        OK
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {selectedClient.tags.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Nenhuma tag anotada</span>
                    ) : (
                      selectedClient.tags.map((tg) => (
                        <span
                          key={tg}
                          className="group text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200/50 dark:border-slate-700/50"
                        >
                          {tg}
                          <button
                            onClick={() => handleRemoveTag(tg)}
                            className="text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-all font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Scheduling widget return */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agendar Retorno</span>
                    <button
                      onClick={() => setShowScheduleForm(!showScheduleForm)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      {showScheduleForm ? 'Fechar' : 'Formulário'}
                    </button>
                  </div>

                  {showScheduleForm && (
                    <form onSubmit={handleScheduleReturn} className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border dark:border-slate-700">
                      <input
                        type="datetime-local"
                        required
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Anotar motivo (ex: ligar para fechar)..."
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 rounded-md text-xs"
                      >
                        Confirmar Compromisso
                      </button>
                    </form>
                  )}
                </div>

                {/* Notes log and customer info */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Notas & Observações</span>
                  <div className="space-y-2">
                    {selectedClient.notes.map((note, index) => (
                      <div key={index} className="text-xs p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-750 rounded-xl text-slate-650 dark:text-slate-405 flex items-start gap-1 p-2">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Histórico de Eventos</span>
                
                {/* We will render dynamic log events or simple checklist */}
                <div className="relative pl-3 border-l-2 border-emerald-500/30 space-y-4">
                  <div className="space-y-1 relative">
                    <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                    <span className="text-[10px] font-mono text-slate-400">26/05/2026 às 14:26</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mensagem Enviada</p>
                    <p className="text-[11px] text-slate-500">Respondido catálogo de preços e frete motoboy.</p>
                  </div>

                  <div className="space-y-1 relative">
                    <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-white dark:border-slate-900" />
                    <span className="text-[10px] font-mono text-slate-400">26/05/2026 às 14:22</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Funil Comercial Atualizado</p>
                    <p className="text-[11px] text-slate-500">Movido de "Lead" para "Em Atendimento"</p>
                  </div>

                  <div className="space-y-1 relative">
                    <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-slate-400 border border-white dark:border-slate-900" />
                    <span className="text-[10px] font-mono text-slate-400">26/05/2026 às 14:20</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Contato Identificado</p>
                    <p className="text-[11px] text-slate-500">Mensagem recebida do cliente no WhatsApp.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
