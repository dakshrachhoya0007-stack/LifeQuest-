import { ItemRarity } from '../types/game';

export interface RarityVisualStyle {
  tierIndex: number;
  label: string;
  shortTag: string;
  isBeyondMythic: boolean;
  border: string;
  ringClass: string;
  badge: string;
  text: string;
  accentHex: string;
  secondaryHex: string;
  cardGlow: string;
  pipActive: string;
  orb: string;
  frameAnimationClass: string;
  unlockTierHint: string;
}

export const RARITY_ORDER: ItemRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Ascendant',
  'Divine',
  'Celestial',
  'Eternal',
];

export const RARITY_STYLE_MAP: Record<ItemRarity, RarityVisualStyle> = {
  Common: {
    tierIndex: 1,
    label: 'Common',
    shortTag: 'I',
    isBeyondMythic: false,
    border: 'border-[#9CA3AF]/45',
    ringClass: '',
    badge: 'bg-[#0A1930] text-[#D1D5DB] border border-[#9CA3AF]/50',
    text: 'text-[#D1D5DB]',
    accentHex: '#C4C9DB',
    secondaryHex: '#9CA3AF',
    cardGlow: 'shadow-[#061225]/70',
    pipActive: 'bg-[#C4C9DB] border-white text-[#061225]',
    orb: 'bg-[#C4C9DB]/20',
    frameAnimationClass: '',
    unlockTierHint: 'Starter / Basic Treasury',
  },
  Uncommon: {
    tierIndex: 2,
    label: 'Uncommon',
    shortTag: 'II',
    isBeyondMythic: false,
    border: 'border-[#35D69A]/70',
    ringClass: '',
    badge: 'bg-[#0F2924] text-[#35D69A] border border-[#35D69A]/60',
    text: 'text-[#35D69A]',
    accentHex: '#35D69A',
    secondaryHex: '#1FA375',
    cardGlow: 'shadow-[#35D69A]/20',
    pipActive: 'bg-[#35D69A] border-emerald-200 text-[#061225]',
    orb: 'bg-[#35D69A]/25',
    frameAnimationClass: '',
    unlockTierHint: 'Treasury & Early Quests',
  },
  Rare: {
    tierIndex: 3,
    label: 'Rare',
    shortTag: 'III',
    isBeyondMythic: false,
    border: 'border-[#65A9FF]/80',
    ringClass: 'ring-1 ring-[#65A9FF]/30',
    badge: 'bg-[#0A1930] text-[#65A9FF] border border-[#65A9FF]/70',
    text: 'text-[#65A9FF]',
    accentHex: '#65A9FF',
    secondaryHex: '#38D9F5',
    cardGlow: 'shadow-[#65A9FF]/25',
    pipActive: 'bg-[#65A9FF] border-sky-200 text-[#061225]',
    orb: 'bg-[#65A9FF]/25',
    frameAnimationClass: '',
    unlockTierHint: 'Treasury & Realm Trials',
  },
  Epic: {
    tierIndex: 4,
    label: 'Epic',
    shortTag: 'IV',
    isBeyondMythic: false,
    border: 'border-[#00D9FF]/85',
    ringClass: 'ring-1 ring-[#00D9FF]/45',
    badge: 'bg-[#102440] text-[#00D9FF] border border-[#00D9FF]/80',
    text: 'text-[#00D9FF]',
    accentHex: '#00D9FF',
    secondaryHex: '#1677FF',
    cardGlow: 'shadow-[#1677FF]/35',
    pipActive: 'bg-[#00D9FF] border-cyan-200 text-[#061225]',
    orb: 'bg-[#00D9FF]/30',
    frameAnimationClass: '',
    unlockTierHint: 'Masterwork Vault & Treasury',
  },
  Legendary: {
    tierIndex: 5,
    label: 'Legendary',
    shortTag: 'V',
    isBeyondMythic: false,
    border: 'border-[#E7B94F]/95',
    ringClass: 'ring-1 ring-[#FFD978]/50 shadow-[0_0_22px_rgba(231,185,79,0.28)]',
    badge: 'bg-gradient-to-r from-[#102440] via-[#3A2319] to-[#102440] text-[#FFD978] border border-[#E7B94F]/85',
    text: 'text-[#FFD978]',
    accentHex: '#E7B94F',
    secondaryHex: '#1677FF',
    cardGlow: 'shadow-[#E7B94F]/30',
    pipActive: 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978] border-[#FFD978] text-[#061225]',
    orb: 'bg-[#E7B94F]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Heroic Vault & High Mastery',
  },
  Mythic: {
    tierIndex: 6,
    label: 'Mythic',
    shortTag: 'VI',
    isBeyondMythic: false,
    border: 'border-[#F05B70]/90',
    ringClass: 'ring-2 ring-[#F05B70]/45 shadow-[0_0_24px_rgba(240,91,112,0.28)]',
    badge: 'bg-gradient-to-r from-[#3A1123] to-[#102440] text-[#FF99A7] border border-[#F05B70]/85',
    text: 'text-[#F05B70]',
    accentHex: '#F05B70',
    secondaryHex: '#FFAA45',
    cardGlow: 'shadow-[#F05B70]/35',
    pipActive: 'bg-[#F05B70] border-rose-200 text-white',
    orb: 'bg-[#F05B70]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Mythic Vault & Evolution Catalyst',
  },
  Ascendant: {
    tierIndex: 7,
    label: 'Ascendant',
    shortTag: 'VII · RUNED',
    isBeyondMythic: true,
    border: 'border-[#38D9F5]/95',
    ringClass: 'ring-2 ring-[#38D9F5]/55 shadow-[0_0_24px_rgba(56,217,245,0.32)]',
    badge: 'bg-gradient-to-r from-[#13293D] via-[#102440] to-[#11313D] text-[#38D9F5] border border-[#38D9F5]/90',
    text: 'text-[#38D9F5]',
    accentHex: '#38D9F5',
    secondaryHex: '#1677FF',
    cardGlow: 'shadow-[#38D9F5]/35',
    pipActive: 'bg-[#38D9F5] border-cyan-100 text-[#061225]',
    orb: 'bg-[#38D9F5]/35',
    frameAnimationClass: 'animate-ascendant-pulse',
    unlockTierHint: 'Progression & Runic Evolution Only',
  },
  Divine: {
    tierIndex: 8,
    label: 'Divine',
    shortTag: 'VIII · SACRED',
    isBeyondMythic: true,
    border: 'border-[#FFD978]',
    ringClass: 'ring-2 ring-[#FFD978]/65 shadow-[0_0_28px_rgba(255,217,120,0.36)]',
    badge: 'bg-gradient-to-r from-[#3D2912] via-[#4D3414] to-[#102440] text-[#FFD978] border border-[#FFD978]',
    text: 'text-[#FFD978]',
    accentHex: '#FFD978',
    secondaryHex: '#FFAA45',
    cardGlow: 'shadow-[#FFD978]/40',
    pipActive: 'bg-[#FFD978] border-white text-[#061225]',
    orb: 'bg-[#FFD978]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Boss Trials & Sacred Ascension Only',
  },
  Celestial: {
    tierIndex: 9,
    label: 'Celestial',
    shortTag: 'IX · ASTRAL',
    isBeyondMythic: true,
    border: 'border-[#65A9FF]',
    ringClass: 'ring-2 ring-[#65A9FF]/65 shadow-[0_0_28px_rgba(101,169,255,0.4)]',
    badge: 'bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#132944] text-[#65A9FF] border border-[#65A9FF]/90',
    text: 'text-[#65A9FF]',
    accentHex: '#65A9FF',
    secondaryHex: '#38D9F5',
    cardGlow: 'shadow-[#65A9FF]/40',
    pipActive: 'bg-[#65A9FF] border-cyan-200 text-[#061225]',
    orb: 'bg-[#65A9FF]/40',
    frameAnimationClass: 'animate-celestial-drift',
    unlockTierHint: 'Citadel Conquest & Starlight Ascension',
  },
  Eternal: {
    tierIndex: 10,
    label: 'Eternal',
    shortTag: 'X · TIMELESS',
    isBeyondMythic: true,
    border: 'border-[#FFD978]',
    ringClass: 'ring-2 ring-[#00D9FF]/75 shadow-[0_0_34px_rgba(0,217,255,0.45)]',
    badge: 'bg-gradient-to-r from-[#0A1930] via-[#1677FF]/60 to-[#102440] text-[#FFD978] border border-[#FFD978]',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-[#FFD978] via-[#00D9FF] to-[#38D9F5]',
    accentHex: '#FFD978',
    secondaryHex: '#00D9FF',
    cardGlow: 'shadow-[#00D9FF]/45',
    pipActive: 'bg-gradient-to-r from-[#FFD978] via-[#00D9FF] to-[#38D9F5] border-white text-[#061225]',
    orb: 'bg-[#00D9FF]/40',
    frameAnimationClass: 'animate-eternal-shift',
    unlockTierHint: 'Apex Aetheria Mastery & Cosmic Ascension',
  },
};

export const getRarityStyle = (rarity?: string): RarityVisualStyle => {
  if (!rarity) return RARITY_STYLE_MAP.Common;
  if (rarity === 'Mythical') return RARITY_STYLE_MAP.Mythic;
  return RARITY_STYLE_MAP[rarity as ItemRarity] || RARITY_STYLE_MAP.Common;
};

export const isBeyondMythicRarity = (rarity?: string): boolean => {
  return getRarityStyle(rarity).isBeyondMythic;
};

export const getRarityTierIndex = (rarity?: string): number => {
  return getRarityStyle(rarity).tierIndex;
};
