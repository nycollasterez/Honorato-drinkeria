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
      <header className="no-print sticky top-0 z-40 bg-black/95 backdrop-blur border-b border-neutral-900 safe-header">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 border border-neutral-700 bg-neutral-950 flex items-center justify-center text-white">
              <Wine className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <span className="font-brand text-base font-bold tracking-widest text-white leading-none block">
                HONORATO
              </span>
              <span className="text-[9px] tracking-[0.2em] text-neutral-400 uppercase block">
                Drinkeria
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tableBadge && (
              <span className="px-2 py-0.5 border border-neutral-800 bg-neutral-950 text-[10px] font-mono uppercase tracking-wider text-neutral-300">
                {tableBadge}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
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
    <header className="no-print sticky top-0 z-40 bg-black/95 backdrop-blur border-b border-neutral-800 safe-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-neutral-700 bg-neutral-950 flex items-center justify-center text-white shrink-0">
              <Wine className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-brand text-base font-bold tracking-widest text-white">
                HONORATO
              </span>
              <span className="text-[9px] tracking-wider text-neutral-400 uppercase hidden sm:inline">
                Drinkeria
              </span>
            </div>
          </div>

          {/* Quick Metrics (Desktop) */}
          {(currentUser.role === 'admin' || currentUser.role === 'caixa') && (
            <div className="hidden lg:flex items-center gap-6 text-xs text-neutral-400">
              <div>
                <span className="text-[10px] uppercase text-neutral-500 block">Comandas</span>
                <span className="font-bold text-white">{openComandasCount} abertas</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-500 block">Faturamento Hoje</span>
                <span className="font-bold text-white font-mono">{formatCurrency(cashRegister.totalRevenue)}</span>
              </div>
            </div>
          )}

          {/* Right: Quick /cardapio button for Manager, User info & Logout */}
          <div className="flex items-center gap-2.5">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/cardapio');
                  }
                  setActiveView('cardapio');
                }}
                className="px-2.5 py-1 bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Visualizar cardápio do cliente (/cardapio)"
              >
                <span>/cardapio</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <span className="text-xs text-neutral-300 font-medium hidden sm:inline px-2 py-0.5 border border-neutral-800 bg-neutral-900">
              {currentUser.name}
            </span>

            <button
              onClick={logout}
              className="p-1.5 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 bg-neutral-900 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Nav Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1.5 border-t border-neutral-900 scrollbar-none text-xs touch-pan-x">
          {allowedNavItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap transition-colors border cursor-pointer ${
                  isActive
                    ? 'bg-white text-black border-white font-bold'
                    : 'text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-0.5 text-[9px] font-bold px-1 py-0.2 ${
                      isActive ? 'bg-black text-white' : 'bg-white text-black'
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
