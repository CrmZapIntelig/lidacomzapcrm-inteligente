/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Megaphone,
  Send,
  ShoppingBag,
  Users2,
  GitMerge,
  BarChart3,
  Sliders,
  CheckCircle2,
  X,
  PhoneCall,
  Utensils,
  ChefHat,
  ClipboardCheck,
  Bike,
  UserCheck,
  Map,
  Navigation,
  Truck,
  Zap,
  DollarSign,
} from 'lucide-react';
import { AppSettings } from '../types';

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  settings: AppSettings;
  pipelineValue: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  currentTab,
  onChangeTab,
  settings,
  pipelineValue,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-sky-500' },
    { id: 'caixa', label: 'Caixa e PDV', icon: DollarSign, color: 'text-emerald-500' },
    { id: 'whatsapp', label: 'Módulo Chat', icon: MessageSquare, color: 'text-emerald-500', badge: '3' },
    { id: 'crm', label: 'Funil Kanban', icon: GitBranch, color: 'text-violet-500' },
    { id: 'campanhas', label: 'Campanhas', icon: Megaphone, color: 'text-indigo-400' },
    { id: 'disparador', label: 'Disparador Inteligente', icon: Send, color: 'text-blue-500' },
    { id: 'cardapio', label: 'Cardápio Digital', icon: Utensils, color: 'text-emerald-450' },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag, color: 'text-amber-500' },
    { id: 'cozinha', label: 'Cozinha', icon: ChefHat, color: 'text-rose-500' },
    { id: 'producao', label: 'Produção', icon: ClipboardCheck, color: 'text-purple-500' },
    { id: 'gestao_entregas', label: 'Gestão de Entregas', icon: Truck, color: 'text-emerald-500' },
    { id: 'clientes', label: 'Clientes', icon: Users2, color: 'text-pink-500' },
    { id: 'automations', label: 'Automações SE/ENTÃO', icon: GitMerge, color: 'text-fuchsia-500' },
    { id: 'central', label: 'Central Inteligente', icon: Zap, color: 'text-amber-400' },
    { id: 'relatorios', label: 'Relatórios & BI', icon: BarChart3, color: 'text-teal-500' },
    { id: 'configuracoes', label: 'Configurações', icon: Sliders, color: 'text-slate-400' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-none">
              CRM GreenHub
            </h1>
            <span className="text-[10px] font-mono font-medium text-emerald-500 flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              SaaS Ativo V2.5
            </span>
          </div>
        </div>
      </div>

      {/* Operator Status Card */}
      <div className="mx-4 my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
              {settings.operatorName.substring(0, 2)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-100">{settings.operatorName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{settings.operatorRole}</p>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between text-[10px] font-mono text-slate-500">
          <span>Funil Ativo:</span>
          <span className="text-emerald-500 font-bold">{pipelineValue}</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={() => {
                onChangeTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-rose-500 text-white font-mono font-bold text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* WhatsApp Physical Device Status footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-905/35">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
            <span>Sessão API:</span>
          </div>
          {settings.waSessionStatus === 'connected' ? (
            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
              CONECTADO
            </span>
          ) : settings.waSessionStatus === 'disconnected' ? (
            <span className="text-[10px] font-semibold text-rose-500 bg-rose-100/60 dark:bg-rose-950/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
              DESCONECTADO
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-amber-500 bg-amber-100/60 dark:bg-amber-955/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono animate-pulse">
              CONECTANDO
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar container */}
      <aside className="hidden lg:block w-64 h-screen shrink-0 sticky top-0 font-sans z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay and component) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full animate-in slide-in-from-left duration-200 shadow-2xl">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white z-10 shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
