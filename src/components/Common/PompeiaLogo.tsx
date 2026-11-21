import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const PompeiaLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size }) => {
  const [error, setError] = useState(false);

  // Logo Oficial Pompéia / P estilizado em SVG para garantia absoluta de nunca quebrar
  if (error) {
    return (
      <div
        style={size ? { width: size, height: size } : undefined}
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-md border border-[#ff5a1f]/40 bg-gradient-to-br from-[#1a2342] to-[#0c1122] ${className}`}
      >
        <span className="font-brand font-bold text-[#ff5a1f] text-base tracking-widest select-none">P</span>
      </div>
    );
  }

  // Detecta o caminho base relativo para garantir carregamento em qualquer rota (/drinkeria, /drinkeria/cardapio, etc.)
  const basePath = typeof window !== 'undefined' && window.location.pathname.includes('/drinkeria') ? '/drinkeria' : '';
  const logoSrc = `${basePath}/logo.jpg`;

  return (
    <div
      style={size ? { width: size, height: size } : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-md border border-[#ff5a1f]/30 bg-[#0c1122] ${className}`}
    >
      <img
        src={logoSrc}
        alt="Pompéia Drinkeria"
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
};
