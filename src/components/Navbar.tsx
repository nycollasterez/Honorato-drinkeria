import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  CreditCard,
  Package,
  QrCode,
  BookOpen,
  Wine,
  LogOut,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { AppView, UserRole } from '../types';
import { PompeiaLogo } from './Common/PompeiaLogo';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    comandas,
    cashRegister,
    currentUser,
    logout,
  } = useApp();

  const openComandasCount = comandas.filter(
    (c) => c.status === 'aberta' || c.status === 'fechando'
  ).length;

  const formatCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // CLIENT MINIMAL HEADER: strictly for public viewing, ZERO login access
  if (!currentUser || currentUser.role === 'cliente') {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const mesaParam = params?.get('mesa');
    const tableBadge = mesaParam ? mesaParam.replace(/-/g, ' ').toUpperCase() : null;

    return (
      <header className="no-print sticky top-0 z-40 bg-[#0c1122]/95 backdrop-blur border-b border-[#1f2945] safe-header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PompeiaLogo className="w-9 h-9" />
            <div>
              <span className="font-brand text-base font-bold tracking-widest text-white leading-none block">
                POMPÉIA
              </span>
              <span className="text-[9px] tracking-[0.2em] text-[#ff5a1f] uppercase font-semibold block mt-0.5">
                Drinkeria
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tableBadge && (
              <span className="px-2.5 py-1 border border-[#ff5a1f]/40 bg-[#13192f] text-[10px] font-mono uppercase tracking-wider text-[#8ba7ff] rounded-md font-bold">
                {tableBadge}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
              Cardápio Digital
            </span>
          </div>
        </div>
      </header>
    );
  }

  // STAFF ROLES NAVIGATION
  const allNavItems: {
    view: AppView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    roles: UserRole[];
  }[] = [
    {
      view: 'gerencia',
      label: 'Gerência',
      icon: <TrendingUp className="w-4 h-4" />,
      roles: ['admin'],
    },
    {
      view: 'comandas',
      label: 'Comandas',
      icon: <FileText className="w-4 h-4" />,
      badge: openComandasCount,
      roles: ['garcom', 'caixa', 'admin'],
    },
    {
      view: 'caixa',
      label: 'Caixa PDV',
      icon: <CreditCard className="w-4 h-4" />,
      roles: ['caixa', 'admin'],
    },
    {
      view: 'estoque',
      label: 'Estoque & Bar',
      icon: <Package className="w-4 h-4" />,
      roles: ['estoque', 'admin'],
    },
    {
      view: 'qrcode',
      label: 'QR Code',
      icon: <QrCode className="w-4 h-4" />,
      roles: ['admin'],
    },
    {
      view: 'cardapio',
      label: 'Cardápio',
      icon: <BookOpen className="w-4 h-4" />,
      roles: ['garcom', 'estoque', 'admin'],
    },
  ];

  const allowedNavItems = allNavItems.filter((item) =>
    currentUser.role === 'admin' ? true : item.roles.includes(currentUser.role)
  );

  return (
    <header className="no-print sticky top-0 z-40 bg-[#0c1122]/95 backdrop-blur border-b border-[#1f2945] safe-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <PompeiaLogo className="w-9 h-9" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-brand text-base font-bold tracking-widest text-white">
                POMPÉIA
              </span>
              <span className="text-[9px] tracking-wider text-[#ff5a1f] uppercase font-semibold hidden sm:inline">
                Drinkeria
              </span>
            </div>
          </div>

          {/* Quick Metrics (Desktop) */}
          {(currentUser.role === 'admin' || currentUser.role === 'caixa') && (
            <div className="hidden lg:flex items-center gap-6 text-xs text-neutral-300">
              <div>
                <span className="text-[10px] uppercase text-neutral-400 block">Comandas</span>
                <span className="font-bold text-white">{openComandasCount} abertas</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400 block">Faturamento Hoje</span>
                <span className="font-bold text-[#ff5a1f] font-mono">{formatCurrency(cashRegister.totalRevenue)}</span>
              </div>
            </div>
          )}

          {/* Right: Quick /cardapio button for Manager, User info & Logout */}
          <div className="flex items-center gap-2.5">
            {currentUser.role === 'admin' && (
              <a
                href="./cardapio"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#ff5a1f]/40 bg-[#13192f] hover:bg-[#1a2342] text-[11px] font-semibold text-white rounded transition-colors"
                title="Abrir Cardápio Público em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#ff5a1f]" />
                <span>Cardápio</span>
              </a>
            )}

            <div className="text-right">
              <span className="text-xs font-semibold text-white block capitalize">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#8ba7ff] uppercase tracking-wider block font-medium">
                {currentUser.role === 'admin' ? 'Gerência' : currentUser.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 border border-[#1f2945] hover:border-[#ff5a1f] bg-[#13192f] hover:bg-[#1a2342] text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Sair do terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-[#1f2945]/70">
          {allowedNavItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ff5a1f] text-white shadow-lg shadow-[#ff5a1f]/30 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-[#13192f]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-[#ff5a1f] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
