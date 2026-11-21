import React from 'react';
import { POMPEIA_LOGO_DATA_URL } from '../../assets/logoData';

interface LogoProps {
  className?: string;
  size?: number;
}

export const PompeiaLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <div
      style={size ? { width: size, height: size } : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-md border border-[#ff5a1f]/40 bg-[#0c1122] ${className}`}
    >
      <img
        src={POMPEIA_LOGO_DATA_URL}
        alt="Pompéia Drinkeria"
        className="w-full h-full object-cover"
        loading="eager"
        decoding="sync"
      />
    </div>
  );
};
