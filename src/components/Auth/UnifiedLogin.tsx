import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wine,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const UnifiedLogin: React.FC = () => {
  const { loginWithPin } = useApp();
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus input on mount so device keyboard works immediately
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const processLogin = (pinToTest: string) => {
    const result = loginWithPin(pinToTest);
    if (result.success && result.role) {
      const roleNames: Record<string, string> = {
        admin: 'Gerência Geral',
        garcom: 'Garçom / Salão',
        caixa: 'Caixa PDV',
        estoque: 'Estoque & Bar',
      };
      setLoggingInRole(roleNames[result.role] || result.role);
    } else {
      setPinError('PIN incorreto. Tente novamente ou consulte a gerência.');
      setTimeout(() => {
        setPinInput('');
        if (inputRef.current) inputRef.current.focus();
      }, 700);
    }
  };

  const handleSubmitPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Digite o seu PIN de 4 dígitos.');
      return;
    }
    processLogin(pinInput.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setPinError('');
    setPinInput(val);
    if (val.length === 4) {
      processLogin(val);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-6 select-none touch-manipulation">
      {/* Brand Header */}
      <div className="max-w-sm mx-auto w-full text-center pt-8 sm:pt-14 space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 border border-neutral-700 bg-neutral-950 mx-auto shadow-lg">
          <Wine className="w-7 h-7 text-white stroke-[1.4]" />
        </div>

        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-[0.25em] text-white uppercase">
            HONORATO
          </h1>
          <p className="text-[10px] sm:text-[11px] tracking-[0.3em] text-neutral-400 uppercase mt-0.5">
            Drinkeria · Terminal da Equipe
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-sm mx-auto w-full my-auto bg-neutral-950 border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-1">
          <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider block">
            Acesso Restrito
          </span>
          <p className="text-xs text-neutral-500">
            Digite seu PIN numérico de 4 dígitos no teclado
          </p>
        </div>

        {/* Masked Dots Indicator */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pinInput.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                  filled
                    ? 'bg-white border-white scale-125 shadow-md shadow-white/40'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              />
            );
          })}
        </div>

        {/* Device Keyboard Input (Mobile Phone Numeric Keyboard + Computer Keyboard) */}
        <form onSubmit={handleSubmitPin} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showNumbers ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinInput}
              onChange={handleInputChange}
              placeholder="••••"
              autoComplete="off"
              autoFocus
              className="w-full bg-neutral-900 border border-neutral-700 py-3.5 px-4 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
            />

            <button
              type="button"
              onClick={() => setShowNumbers(!showNumbers)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 cursor-pointer"
              title={showNumbers ? 'Ocultar' : 'Revelar dígitos'}
            >
              {showNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Feedback or Error Message */}
          {loggingInRole && (
            <div className="p-3 bg-neutral-900 border border-white text-white text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Acessando {loggingInRole}...</span>
            </div>
          )}

          {pinError && (
            <div className="p-3 bg-neutral-900 border border-neutral-600 text-neutral-300 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pinInput.length === 0}
            className="w-full py-3.5 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Entrar no Sistema</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-neutral-600 pb-4">
        HONORATO DRINKERIA · SISTEMA OPERACIONAL
      </footer>
    </div>
  );
};
