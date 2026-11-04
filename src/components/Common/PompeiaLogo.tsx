import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const PompeiaLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <div
      style={size ? { width: size, height: size } : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-md border border-[#ff5a1f]/30 ${className}`}
    >
      <img
        src="./logo.jpg"
        alt="Pompéia Drinkeria"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to SVG if image not found
          (e.currentTarget as HTMLImageElement).src = './favicon.svg';
        }}
      />
    </div>
  );
};
