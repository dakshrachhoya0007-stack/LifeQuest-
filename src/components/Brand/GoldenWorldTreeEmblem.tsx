import React from 'react';

export const GoldenWorldTreeEmblem: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="lqTreeGoldGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF3C4" />
        <stop offset="45%" stopColor="#FFD978" />
        <stop offset="100%" stopColor="#E7B94F" />
      </linearGradient>
      <radialGradient id="lqTreeHalo" cx="50%" cy="42%" r="48%">
        <stop offset="0%" stopColor="#E7B94F" stopOpacity="0.42" />
        <stop offset="65%" stopColor="#6638B8" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#100D1C" stopOpacity="0" />
      </radialGradient>
    </defs>

    <circle cx="32" cy="32" r="29" fill="url(#lqTreeHalo)" stroke="#FFD978" strokeOpacity="0.52" strokeWidth="1" />
    <circle cx="32" cy="32" r="25" stroke="#A875FF" strokeOpacity="0.48" strokeWidth="0.8" strokeDasharray="3 3" />

    <path
      d="M32 52C32 45 32 39 32 31M32 46C28 49 23 51 17 52M32 46C36 49 41 51 47 52M32 50C30 53 27 55 24 56M32 50C34 53 37 55 40 56"
      stroke="url(#lqTreeGoldGrad)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M32 32C28 28 24 26 20 25M32 30C36 26 40 24 44 23M32 28C30 22 27 18 23 15M32 28C34 22 37 18 41 15M32 25V12"
      stroke="url(#lqTreeGoldGrad)"
      strokeWidth="1.9"
      strokeLinecap="round"
    />

    <circle cx="32" cy="11" r="2.2" fill="#FFF3C4" />
    <circle cx="22" cy="15" r="2.1" fill="#FFD978" />
    <circle cx="42" cy="15" r="2.1" fill="#FFD978" />
    <circle cx="17" cy="24" r="2" fill="#E7B94F" />
    <circle cx="47" cy="23" r="2" fill="#E7B94F" />
    <circle cx="26" cy="20" r="1.6" fill="#FFF3C4" />
    <circle cx="38" cy="20" r="1.6" fill="#FFF3C4" />
    <circle cx="20" cy="30" r="1.5" fill="#FFD978" />
    <circle cx="44" cy="29" r="1.5" fill="#FFD978" />
  </svg>
);
