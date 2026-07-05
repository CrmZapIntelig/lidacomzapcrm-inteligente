/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Send,
  Sliders,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Users,
  UserCheck,
  Power,
  HelpCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Client, AppSettings, Campaign } from '../types';
import { FUNNEL_STAGES } from '../utils/mockData';

interface DisparadorViewProps {
  clients: Client[];
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
  onUpdateClient: (updated: Client) => void;
  onAddHistoryEvent: (clientId: string, type: string, title: string, description: string) => void;
  onSendMessage: (clientId: string, text: string, type?: 'text' | 'image' | 'audio' | 'file') => void;
}

export default function DisparadorView({
  clients,
  settings,
  onUpdateSettings,
  onUpdateClient,
  onAddHistoryEvent,
  onSendMessage,
}: DisparadorViewProps) {
  // Disparador Offset State
  const [lastDispatchedIndex, setLastDispatchedIndex] = useState<number>(250);
  const [activeDayPreset, setActiveDayPreset] = useState<1 | 2 | 3>(1);
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(250);

  // Settings configs
  const [dailyLimit, setDailyLimit] = useState<number>(settings.dailyLimit);
  const [intervalSecs, setIntervalSecs] = useState<number>(settings.intervalMin);
  const [autoPauseVal, setAutoPauseVal] = useState<boolean>(settings.autoPause);

  // Exclude switches
  const [excludeGroups, setExcludeGroups] = useState<boolean>(true);
  const [excludeBlocked, setExcludeBlocked] = useState<boolean>(true);
  const [excludeAlreadySent, setExcludeAlreadySent] = useState<boolean>(true);
  const [targetChannel, setTargetChannel] = useState<'todos' | 'whatsapp' | 'rcs'>('todos');

  // Template/Message input to prepare on "Rascunho"
  const [disparadorMessage, setDisparadorMessage] = useState<string>(
    'Olá {cliente}! Tudo bem? Vimos aqui que você se interessou pelo cardápio do Restaurante Prato Mineiro. Podemos te mandar um cupom exclusivo de 10% para fechar hoje?'
  );

  // UI Flow Step Simulations: 'idle' -> 'pre-loaded' -> 'sending' -> 'done'
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'pre-loaded' | 'sending' | 'done'>('idle');
  const [targetQueue, setTargetQueue] = useState<Client[]>([]);
  const [currentIndexInDispatch, setCurrentIndexInDispatch] = useState<number>(0);

  // Load preset indicators
  useEffect(() => {
    if (activeDayPreset === 1) {
      setRangeStart(0);
      setRangeEnd(250);
    } else if (activeDayPreset === 2) {
      setRangeStart(251);
      setRangeEnd(500);
    } else if (activeDayPreset === 3) {
      setRangeStart(501);
      setRangeEnd(750);
    }
  }, [activeDayPreset]);

  // Compute Queue of contacts matching toggles and range bounds
  const getFilteredFila = () => {
    return clients.filter((client, cursor) => {
      // Excludes
      if (excludeGroups && client.type === 'grupo') return false;
      if (excludeBlocked && client.type === 'bloqueado') return false;
      if (excludeAlreadySent && client.dispatched) return false;
      
      if (targetChannel === 'whatsapp' && (client.channel === 'rcs')) return false;
      if (targetChannel === 'rcs' && (client.channel === 'whatsapp')) return false;

      // Index filter bounds (index approximation or absolute range lists)
      // Since mock array is smaller, we can simulate the offset math safely
      return true;
    });
  };

  // Run initial preparation trigger
  const handlePrepareDisparo = () => {
    const queue = getFilteredFila();
    
    // Auto populate clients into the "RASCUNHO" State as requested
    queue.forEach((client) => {
      if (client.stage !== 'Rascunho') {
        const updated = { ...client, stage: 'Rascunho' as const };
        onUpdateClient(updated);
        onAddHistoryEvent(client.id, 'stage_change', 'Fila de Disparo', `Filtro de Disparo carregou o contato na etapa Rascunho.`);
      }
    });

    setTargetQueue(queue);
    setCurrentIndexInDispatch(0);
    setDispatchStatus('pre-loaded');
  };

  // Start Actual Message dispatch simulation
  const handleStartConversations = () => {
    if (targetQueue.length === 0) return;
    setDispatchStatus('sending');
  };

  // Automated step index generator for sending messages manual simulation
  const handleSimulateSingleSend = () => {
    if (currentIndexInDispatch >= targetQueue.length) {
      setDispatchStatus('done');
      return;
    }
    const currentClient = targetQueue[currentIndexInDispatch];
    
    // 1. Generate text substitute
    const finalMsg = disparadorMessage.replace(/{cliente}/g, currentClient.name === currentClient.phone ? 'Cliente' : currentClient.name);
    
    // 2. Dispatch simulated message
    onSendMessage(currentClient.id, finalMsg, 'text');
    
    // 3. Move automatically in Funnel: RASCUNHO -> LEAD as requested
    const updatedClient = { ...currentClient, stage: 'Lead' as const, dispatched: true };
    onUpdateClient(updatedClient);
    onAddHistoryEvent(currentClient.id, 'stage_change', 'Disparo Ativo', 'Rascunho atualizado AUTOMATICAMENTE para LEAD após enviar disparo de propaganda.');

    // 4. Update index tracker
    setLastDispatchedIndex((prev) => prev + 1);
    setCurrentIndexInDispatch((prev) => prev + 1);

    if (currentIndexInDispatch + 1 >= targetQueue.length) {
      setDispatchStatus('done');
    }
  };

  const handleApplyConfig = () => {
    onUpdateSettings({
      dailyLimit,
      intervalMin: intervalSecs
    });
    alert('Configurações do Disparador atualizadas com sucesso!');
  };

  const handleResetQueue = () => {
    setDispatchStatus('idle');
    setTargetQueue([]);
    setCurrentIndexInDispatch(0);
  };

  const filaCount = getFilteredFila().length;

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      {/* View Header Info */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Disparador Inteligente & Anti-Ban</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prepare transmissões em massa com parâmetros automáticos de continuidade para preservar a integridade do seu chip.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side Panel: Exclusions & Continuation Indexes */}
        <div className="space-y-6 lg:col-span-1">
          {/* Fila metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Metodologia De Continuidade</h3>
            
            {/* Range Day Selectors */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDayPreset(day as any)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold border transition ${
                    activeDayPreset === day
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  Dia {day}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Janela de índices:</span>
                <span className="font-bold text-slate-900 dark:text-white">{rangeStart} até {rangeEnd}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Último Disparado:</span>
                <span className="font-bold text-emerald-500 font-bold">{lastDispatchedIndex}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Próximo Fila:</span>
                <span className="font-bold text-indigo-500 font-bold">{lastDispatchedIndex + 1}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              💡 Novos números captados no site entram automaticamente após o índice <span className="font-bold">{lastDispatchedIndex}</span>.
            </div>
          </div>

          {/* Target Rule Filter switches */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Filtros De Segurança</h3>
            
            <div className="space-y-2.5">
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Ignorar Grupos</span>
                <input
                  type="checkbox"
                  checked={excludeGroups}
                  onChange={(e) => setExcludeGroups(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Ignorar Bloqueados / Spam</span>
                <input
                  type="checkbox"
                  checked={excludeBlocked}
                  onChange={(e) => setExcludeBlocked(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Ignorar Já Contatados</span>
                <input
                  type="checkbox"
                  checked={excludeAlreadySent}
                  onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">Canal de Disparo</h3>
              <select
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value as 'todos' | 'whatsapp' | 'rcs')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="todos">Ambos (Omnichannel)</option>
                <option value="whatsapp">Apenas WhatsApp</option>
                <option value="rcs">Apenas Google RCS</option>
              </select>
            </div>
          </div>

          {/* Throttle configurations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Intervalos & Velocidade</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Intervalo entre disparos:</span>
                  <span className="font-bold text-emerald-500">{intervalSecs} segundos</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={intervalSecs}
                  onChange={(e) => setIntervalSecs(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Limite diário recomendado:</label>
                <input
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-850 p-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              <button
                onClick={handleApplyConfig}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold py-2 rounded-xl text-xs transition"
              >
                Aplicar Ajustes
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Column: Campaign drafting & Simulator logs */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Main Campaign Preload and drafting card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Preparar Mensagem de Rascunho</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">Escreva seu anúncio proativo. Use <span className="font-mono font-bold text-emerald-500">{'{cliente}'}</span> para inserir o nome dinamicamente.</p>
            </div>

            <textarea
              value={disparadorMessage}
              onChange={(e) => setDisparadorMessage(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
              placeholder="Digite a mensagem..."
            />

            {/* Preparation triggers */}
            {dispatchStatus === 'idle' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1.5">
                <div className="text-xs font-mono text-slate-405">
                  Fila de Disparo atual: <span className="font-bold text-emerald-500">{filaCount} contatos</span> qualificados.
                </div>
                <button
                  onClick={handlePrepareDisparo}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/10 active:scale-95 transition"
                >
                  PREPARAR FILA DE CONTATOS
                </button>
              </div>
            )}

            {/* Prefilled and Loaded trigger queue status */}
            {dispatchStatus !== 'idle' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-905 space-y-4">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                    <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
                    FILA DE DISPARO PROCESSADA EM "RASCUNHO"
                  </span>
                  <button
                    onClick={handleResetQueue}
                    className="text-slate-500 font-bold hover:underline"
                  >
                    Limpar / Reiniciar
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg flex items-center justify-between font-mono text-[11px] font-bold">
                  <div>
                    <span className="text-slate-400">Total Fila:</span> {targetQueue.length}
                  </div>
                  <div>
                    <span className="text-slate-400">Progresso:</span> {currentIndexInDispatch} / {targetQueue.length}
                  </div>
                  <div>
                    <span className="text-emerald-500">Mover para:</span> LEAD
                  </div>
                </div>

                {/* State progress bar */}
                <div className="w-full bg-slate-105 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${(currentIndexInDispatch / Math.max(targetQueue.length, 1)) * 100}%` }}
                  />
                </div>

                {/* Simulated trigger console actions */}
                {dispatchStatus === 'pre-loaded' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-400">Clique para iniciar o envio sequencial controlado pelo operador:</p>
                    <button
                      onClick={handleStartConversations}
                      className="bg-indigo-550 hover:bg-indigo-650 bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>INICIAR CONVERSAS</span>
                    </button>
                  </div>
                )}

                {/* Sends progress console step loop trigger */}
                {dispatchStatus === 'sending' && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/50 text-xs rounded-lg text-indigo-750 dark:text-indigo-400 leading-relaxed">
                      💡 <strong>DISPARO ASSISTIDO:</strong> Com o disparador anti-ban ativo, preenchemos dinamicamente a mensagem no chat do cliente. Para manter total segurança, clique no controle abaixo para enviar individualmente e mover a etapa do funil: <strong>RASCUNHO ➜ LEAD</strong>.
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        onClick={handleSimulateSingleSend}
                        className="bg-emerald-500 hover:bg-emerald-600 font-bold px-5 py-2.5 rounded-xl text-xs text-white flex items-center gap-1"
                      >
                        <span>Confirmar Envio Atual ({currentIndexInDispatch + 1})</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Done dispatch logs */}
                {dispatchStatus === 'done' && (
                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <div>
                      <strong>Campanha de Contatos Concluída!</strong> Todos os leads selecionados foram contatados e atualizados no funil comercial com status "Lead".
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List of contacts targeted on current batch */}
          {targetQueue.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Contatos na Fila de Rascunho</h3>
              
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
                {targetQueue.map((cli, i) => (
                  <div key={cli.id} className="flex items-center justify-between text-xs py-2">
                    <span className="font-bold text-slate-700 dark:text-slate-350">{i + 1}. {cli.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{cli.phone}</span>
                      {i < currentIndexInDispatch ? (
                        <span className="text-[10px] font-bold text-emerald-500">DISPARADO</span>
                      ) : i === currentIndexInDispatch ? (
                        <span className="text-[10px] font-bold text-indigo-505 text-indigo-500 animate-pulse">AGUARDANDO...</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">NA FILA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
