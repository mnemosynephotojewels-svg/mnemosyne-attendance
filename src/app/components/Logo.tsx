import React from 'react';
import { Heart } from 'lucide-react';

interface LogoProps {
  variant?: 'light' | 'dark';
  showIcon?: boolean;
}

export function Logo({ variant = 'dark', showIcon = true }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#0B3060]';
  
  return (
    <div className="flex items-center gap-3">
      {showIcon && (
        <Heart className="w-8 h-8 fill-[#F7B34C] text-[#F7B34C]" />
      )}
      <span className={`text-2xl ${textColor}`} style={{ fontFamily: 'Playfair Display, serif' }}>
        MNEMOSYNE
      </span>
    </div>
  );
}
