import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PompeiaLogo } from '../Common/PompeiaLogo';

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
      setPinError('Digite o seu PIN de 4 dígitos');
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
    <div className="min-h-screen bg-[#0c1122] text-[#f0f4fc] flex flex-col justify-between p-4 sm:p-6 select-none touch-manipulation login-safe-container">
      {/* Brand Header */}
      <div className="max-w-sm mx-auto w-full text-center pt-10 sm:pt-14 space-y-3">
        <PompeiaLogo className="w-16 h-16 mx-auto rounded-2xl shadow-xl shadow-[#ff5a1f]/20 border-2 border-[#ff5a1f]" />

        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-[0.25em] text-white uppercase">
            POMPÉIA
          </h1>
          <p className="text-[10px] sm:text-[11px] tracking-[0.3em] text-[#ff5a1f] uppercase font-bold mt-0.5">
            Drinkeria · Terminal da Equipe
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-sm mx-auto w-full my-auto bg-[#13192f] border border-[#ff5a1f]/30 p-6 sm:p-8 space-y-6 shadow-2xl rounded-2xl">
        <div className="text-center space-y-1">
          <span className="text-[11px] text-[#8ba7ff] font-semibold uppercase tracking-wider block">
            Acesso Restrito
          </span>
          <p className="text-xs text-neutral-400">
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
                    ? 'bg-[#ff5a1f] border-[#ff5a1f] scale-125 shadow-md shadow-[#ff5a1f]/50'
                    : 'bg-[#0c1122] border-[#253257]'
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
              className="w-full bg-[#0c1122] border border-[#253257] py-3.5 px-4 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff5a1f] rounded-xl transition-colors"
            />

            <button
              type="button"
              onClick={() => setShowNumbers(!showNumbers)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={showNumbers ? 'Ocultar dígitos' : 'Mostrar dígitos'}
            >
              {showNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Feedback Messages */}
          {pinError && (
            <div className="p-3 bg-[#2a131b] border border-[#ff5a1f]/50 text-white text-xs flex items-center gap-2 animate-shake rounded-lg">
              <AlertCircle className="w-4 h-4 text-[#ff5a1f] shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {loggingInRole && (
            <div className="p-3 bg-[#112338] border border-[#8ba7ff]/60 text-white text-xs flex items-center justify-center gap-2 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#8ba7ff] shrink-0" />
              <span>Autenticado como <strong>{loggingInRole}</strong>...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!pinInput.trim()}
            className="w-full py-3 bg-[#ff5a1f] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#ff6f3b] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#ff5a1f]/30 rounded-xl"
          >
            <span>Entrar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="max-w-sm mx-auto w-full text-center pb-4 text-[10px] text-neutral-400 tracking-wider">
        <span>POMPÉIA DRINKERIA · SISTEMA OPERACIONAL</span>
      </div>
    </div>
  );
};
