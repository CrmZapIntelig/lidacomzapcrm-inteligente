/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon, Search, Menu, RefreshCw, UserCheck, CheckCircle, Database, LogOut, MessageSquare, Printer, TerminalSquare, Bell } from 'lucide-react';
import { AppSettings, User } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
  onToggleMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onTriggerSync?: () => void;
  syncing?: boolean;
  currentUser?: User;
  onLogout?: () => void;
}

export default function Header({
  settings,
  onUpdateSettings,
  onToggleMobileMenu,
  searchQuery,
  onSearchChange,
  onTriggerSync,
  syncing = false,
  currentUser,
  onLogout
}: HeaderProps) {
  const toggleTheme = () => {
    onUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 px-4 py-3 font-sans transition-colors duration-150">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Left Side: Mobile burger, page category indicator */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
             <div className="flex items-center gap-1.5 px-2 cursor-help" title="Banco de Dados (Supabase)">
               <Database className="w-3.5 h-3.5 text-emerald-500" />
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             </div>
             <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
             <div className="flex items-center gap-1.5 px-2 cursor-help" title="Conexão WhatsApp (Baileys)">
               <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             </div>
             <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
             <div className="flex items-center gap-1.5 px-2 cursor-help" title="Spooler Impressora Local">
               <Printer className="w-3.5 h-3.5 text-amber-500" />
               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
             </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar leads por nome, celular ou tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>

        {/* Right Side: Theme, Role switcher, sync indicator */}
        <div className="flex items-center gap-2.5">
          <button
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition"
            title="Notificações Operacionais"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border border-white dark:border-slate-900" />
          </button>

          <button
            onClick={onTriggerSync}
            disabled={syncing}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dotted ${
              syncing
                ? 'border-emerald-500 text-emerald-500 animate-pulse bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
            } text-[11px] uppercase font-bold tracking-wider transition`}
            title="Sincronizar com Banco de Dados"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando' : 'Sincronizar'}</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-750">
              <UserCheck className="w-4 h-4 text-emerald-500 ml-1.5 shrink-0" />
              <div className="flex flex-col pr-3">
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none">{currentUser.role}</span>
              </div>
            </div>
          )}

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            id="theme-toggler-btn"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
            aria-label="Toggle theme"
          >
            {settings.theme === 'light' ? (
              <Moon className="w-4.5 h-4.5 text-slate-600" />
            ) : (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            )}
          </button>
          
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"
            title="Sair do Sistema"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
