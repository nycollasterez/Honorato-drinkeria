/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UnifiedLogin } from './components/Auth/UnifiedLogin';
import { Navbar } from './components/Navbar';
import { CardapioView } from './components/Cardapio/CardapioView';
import { ComandasView } from './components/Comandas/ComandasView';
import { CaixaView } from './components/Caixa/CaixaView';
import { EstoqueView } from './components/Estoque/EstoqueView';
import { GerenciaView } from './components/Gerencia/GerenciaView';
import { QrCodeView } from './components/QrCode/QrCodeView';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-neutral-950 border border-neutral-800 p-8 space-y-4">
            <h2 className="font-brand text-2xl font-bold text-white uppercase tracking-widest">
              HONORATO
            </h2>
            <p className="text-xs text-neutral-300">
              Ocorreu um imprevisto na visualização.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-2.5 bg-white text-black font-bold uppercase text-xs tracking-wider cursor-pointer hover:bg-neutral-200"
              >
                Tentar Novamente
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 border border-neutral-700 bg-neutral-900 text-white font-semibold text-xs cursor-pointer hover:bg-neutral-800"
              >
                Restaurar e Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainLayout: React.FC = () => {
  const { activeView, currentUser } = useApp();

  // If no user is logged in or user explicitly requested login screen
  if (!currentUser || activeView === 'login') {
    return <UnifiedLogin />;
  }

  // STRICT CLIENT VIEW: Client has access ONLY to the Cardápio
  if (currentUser.role === 'cliente') {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Navbar />
        <main>
          <CardapioView />
        </main>
      </div>
    );
  }

  // STAFF ROLES: Full layout with authorized tabs
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />

      <main>
        {activeView === 'gerencia' && <GerenciaView />}
        {activeView === 'cardapio' && <CardapioView />}
        {activeView === 'comandas' && <ComandasView />}
        {activeView === 'caixa' && <CaixaView />}
        {activeView === 'estoque' && <EstoqueView />}
        {activeView === 'qrcode' && <QrCodeView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
