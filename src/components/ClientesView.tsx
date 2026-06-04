/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  Filter,
  Plus,
  Search,
  Tag,
  AlertCircle,
  Phone,
  Trash2,
  Edit2,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import { Client, FunnelStage } from '../types';
import { FUNNEL_STAGES } from '../utils/mockData';

interface ClientesViewProps {
  clients: Client[];
  onUpdateClient: (updated: Client) => void;
  onAddHistoryEvent: (clientId: string, type: string, title: string, description: string) => void;
}

export default function ClientesView({
  clients,
  onUpdateClient,
  onAddHistoryEvent,
}: ClientesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('todos');
  
  // Note dialog expansion state
  const [selectedClientForNote, setSelectedClientForNote] = useState<Client | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Edit simple parameters
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Quick simulated export trigger
  const handleExportCSV = () => {
    const header = 'Nome,Celular,Etapa,Total Comprado,Última Compra,Tags,Notas\n';
    const rows = clients.map((c) => {
      const notesCombined = c.notes.join(' | ');
      const tagsCombined = c.tags.join(' | ');
      return `"${c.name}","${c.phone}","${c.stage}",R$ ${c.totalBought.toFixed(2)},"${c.lastPurchaseDate || '-'}","${tagsCombined}","${notesCombined}"`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Lista_Leads_Exportada_CRM.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForNote || !newNoteText.trim()) return;

    const updated = {
      ...selectedClientForNote,
      notes: [...selectedClientForNote.notes, newNoteText.trim()],
    };
    onUpdateClient(updated);
    onAddHistoryEvent(selectedClientForNote.id, 'note_added', 'Observação de Vendas', `Nota registrada: "${newNoteText.trim()}"`);
    setNewNoteText('');
    setSelectedClientForNote(null);
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditPhone(client.phone);
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editName.trim() || !editPhone.trim()) return;
    console.log('EDITNAME NO SUBMIT:', editName);
    console.log('EDITPHONE NO SUBMIT:', editPhone);
    console.log('EDITINGCLIENT NO SUBMIT:', editingClient);
    const updated = {
      ...editingClient,
      name: editName.trim(),
      phone: editPhone.trim(),
    };
    console.log('UPDATED GERADO:', updated);
    onUpdateClient(updated);
    onAddHistoryEvent(editingClient.id, 'system_alert', 'Lead Editado', `Modificações de cadastro: Nome / Celular revisados.`);
    setEditingClient(null);
  };

  // Filter clients
  const filtered = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesStage = selectedStageFilter === 'todos' || c.stage === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 font-sans p-1 pb-12">
      
      {/* View header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Diretório de Clientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe a ficha cadastral de cada lead, histórico de compras consolidadas, etiquetas e crie anotações rápidas de pós-venda.
          </p>
        </div>
        
        {/* Export triggers */}
        <button
          onClick={handleExportCSV}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Base (.CSV)</span>
        </button>
      </div>

      {/* Filter and Search rows controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        
        {/* String query filter */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-404 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do titular ou celular de cadastro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-250 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Funnel Stage dropdown filter */}
        <div className="relative">
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-750 dark:text-slate-250 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="todos">Etapa Funil: Todos</option>
            {FUNNEL_STAGES.map((stg) => (
              <option key={stg.id} value={stg.id}>{stg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Customers grid directory table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-204 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-805 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-450 text-slate-400 tracking-wider">
                <th className="py-3 px-4">Titular do Contato</th>
                <th className="py-3 px-4">Telefone</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Tags Associadas</th>
                <th className="py-3 px-4">Fase Funil</th>
                <th className="py-3 px-4">Consumido Total</th>
                <th className="py-3 px-4">Histórico / Notas</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                    <p className="font-semibold text-slate-500">Nenhum cliente cadastrado atende a esse filtro.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const stageConfig = FUNNEL_STAGES.find((s) => s.id === client.stage);
                  
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition">
                      
                      {/* Name with avatar color */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-7.5 h-7.5 rounded-full ${client.avatarColor || 'bg-slate-400'} text-white flex items-center justify-center font-bold text-xs select-none shrink-0`}>
                            {client.name.substring(0, 2)}
                          </div>
                          <span className="truncate max-w-[160px]">{client.name}</span>
                        </div>
                      </td>

                      {/* Phone metadata */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{client.phone}</td>

                      {/* Channel metadata */}
                      <td className="py-3.5 px-4">
                        {client.channel === 'rcs' ? (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-md uppercase tracking-wider">G. RCS</span>
                        ) : client.channel === 'ambos' ? (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-md uppercase tracking-wider">OMNI</span>
                        ) : client.channel === 'mesa_qr' ? (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-md uppercase tracking-wider">MESA</span>
                        ) : (
                          <span className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md uppercase tracking-wider">WA</span>
                        )}
                      </td>

                      {/* Tags row */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {client.tags.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">Sem tags</span>
                          ) : (
                            client.tags.slice(0, 2).map((tg) => (
                              <span key={tg} className="text-[10px] font-mono font-bold bg-slate-55 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded-md">
                                {tg}
                              </span>
                            ))
                          )}
                          {client.tags.length > 2 && (
                            <span className="text-[10px] font-mono text-slate-400">+{client.tags.length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Funnel current stage tracker */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${stageConfig?.bgColor} ${stageConfig?.color} ${stageConfig?.borderColor}`}>
                          {stageConfig?.label}
                        </span>
                      </td>

                      {/* Total Buying purchases */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        R$ {client.totalBought.toFixed(2)}
                        {client.lastPurchaseDate && (
                          <span className="block text-[8px] text-slate-400 font-sans font-medium mt-0.5">Última: {client.lastPurchaseDate}</span>
                        )}
                      </td>

                      {/* Annotations lists snippet */}
                      <td className="py-3.5 px-4 pr-1 max-w-[200px]">
                        {client.notes.length === 0 ? (
                          <button
                            onClick={() => setSelectedClientForNote(client)}
                            className="text-[10px] text-indigo-505 text-indigo-500 font-bold hover:underline flex items-center gap-1"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Anotar OBS</span>
                          </button>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-505 dark:text-slate-400 truncate italic">"{client.notes[client.notes.length - 1]}"</p>
                            <button
                              onClick={() => setSelectedClientForNote(client)}
                              className="text-[8px] font-bold text-slate-400 hover:text-emerald-500 tracking-wider uppercase hover:underline"
                            >
                              Ver todas ({client.notes.length})
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Administrative edit buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(client)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 transition"
                            title="Editar Dados Contato"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW COMMENT NOTE ATTACHED DIALOG */}
      {selectedClientForNote && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-100">
            <button
              onClick={() => setSelectedClientForNote(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-indigo-500" />
              <span>Notas de Vendas: {selectedClientForNote.name}</span>
            </h3>

            {/* List existing items */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto mb-4 bg-slate-50 dark:bg-slate-805 p-2 rounded-lg scrollbar-thin">
              {selectedClientForNote.notes.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Nenhum histórico registrado.</p>
              ) : (
                selectedClientForNote.notes.map((n, i) => (
                  <p key={i} className="text-[11px] text-slate-600 dark:text-slate-350">• {n}</p>
                ))
              )}
            </div>

            <form onSubmit={handleAddNoteSubmit} className="space-y-3">
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider text-[9px]">Nova Anotação de Atendimento</label>
              <textarea
                required
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                placeholder="Insira notas de pós-venda, problemas reclamados pelo cliente..."
              />
              <div className="flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedClientForNote(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl transition"
                >
                  Registrar Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CONTACT BASIC ROW DATA */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl w-full max-w-sm shadow-xl relative animate-in zoom-in-95 duration-100">
            <button
              onClick={() => setEditingClient(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-3.5 uppercase tracking-wide">Editar Contato Cadastral</h3>

            <form onSubmit={handleSaveEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Celular (WhatsApp)</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
