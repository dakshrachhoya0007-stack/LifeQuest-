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
    cardGlow: 'shadow-[#061225]/75',
    pipActive: 'bg-[#C4C9DB] border-[#F2F7FF] text-[#061225]',
    orb: 'bg-[#C4C9DB]/20',
    frameAnimationClass: '',
    unlockTierHint: 'Starter / Basic Treasury',
  },
  Uncommon: {
    tierIndex: 2,
    label: 'Uncommon',
    shortTag: 'II',
    isBeyondMythic: false,
    border: 'border-[#10B981]/70',
    ringClass: '',
    badge: 'bg-[#092425] text-[#10B981] border border-[#10B981]/60',
    text: 'text-[#10B981]',
    accentHex: '#10B981',
    secondaryHex: '#059669',
    cardGlow: 'shadow-[#10B981]/20',
    pipActive: 'bg-[#10B981] border-emerald-200 text-[#061225]',
    orb: 'bg-[#10B981]/25',
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
    badge: 'bg-[#0D2140] text-[#65A9FF] border border-[#65A9FF]/70',
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
    border: 'border-[#38D9F5]/85',
    ringClass: 'ring-1 ring-[#00D9FF]/45',
    badge: 'bg-[#102440] text-[#38D9F5] border border-[#00D9FF]/80',
    text: 'text-[#38D9F5]',
    accentHex: '#00D9FF',
    secondaryHex: '#1677FF',
    cardGlow: 'shadow-[#1677FF]/35',
    pipActive: 'bg-[#00D9FF] border-[#F2F7FF] text-[#061225]',
    orb: 'bg-[#00D9FF]/30',
    frameAnimationClass: '',
    unlockTierHint: 'Masterwork Vault & Treasury',
  },
  Legendary: {
    tierIndex: 5,
    label: 'Legendary',
    shortTag: 'V',
    isBeyondMythic: false,
    border: 'border-[#F59E0B]/95',
    ringClass: 'ring-1 ring-[#FBBF24]/50 shadow-[0_0_22px_rgba(245,158,11,0.28)]',
    badge: 'bg-gradient-to-r from-[#102440] via-[#3A2817] to-[#102440] text-[#FBBF24] border border-[#F59E0B]/85',
    text: 'text-[#FBBF24]',
    accentHex: '#F59E0B',
    secondaryHex: '#1677FF',
    cardGlow: 'shadow-[#F59E0B]/30',
    pipActive: 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] border-[#FBBF24] text-[#061225]',
    orb: 'bg-[#F59E0B]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Heroic Vault & High Mastery',
  },
  Mythic: {
    tierIndex: 6,
    label: 'Mythic',
    shortTag: 'VI',
    isBeyondMythic: false,
    border: 'border-[#F43F5E]/90',
    ringClass: 'ring-2 ring-[#F43F5E]/45 shadow-[0_0_24px_rgba(244,63,94,0.28)]',
    badge: 'bg-gradient-to-r from-[#361321] to-[#102440] text-[#FF9CA6] border border-[#F43F5E]/85',
    text: 'text-[#F43F5E]',
    accentHex: '#F43F5E',
    secondaryHex: '#FFAA45',
    cardGlow: 'shadow-[#F43F5E]/35',
    pipActive: 'bg-[#F43F5E] border-rose-200 text-[#F2F7FF]',
    orb: 'bg-[#F43F5E]/35',
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
    badge: 'bg-gradient-to-r from-[#0B2340] via-[#102440] to-[#0D2E42] text-[#38D9F5] border border-[#38D9F5]/90',
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
    border: 'border-[#FBBF24]',
    ringClass: 'ring-2 ring-[#FBBF24]/65 shadow-[0_0_28px_rgba(251,191,36,0.36)]',
    badge: 'bg-gradient-to-r from-[#3A2814] via-[#4D3414] to-[#102440] text-[#FBBF24] border border-[#FBBF24]',
    text: 'text-[#FBBF24]',
    accentHex: '#FBBF24',
    secondaryHex: '#F59E0B',
    cardGlow: 'shadow-[#FBBF24]/40',
    pipActive: 'bg-[#FBBF24] border-[#F2F7FF] text-[#061225]',
    orb: 'bg-[#FBBF24]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Boss Trials & Sacred Ascension Only',
  },
  Celestial: {
    tierIndex: 9,
    label: 'Celestial',
    shortTag: 'IX · ASTRAL',
    isBeyondMythic: true,
    border: 'border-[#A875FF]',
    ringClass: 'ring-2 ring-[#A875FF]/65 shadow-[0_0_28px_rgba(168,117,255,0.4)]',
    badge: 'bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#132B52] text-[#A875FF] border border-[#A875FF]/90',
    text: 'text-[#A875FF]',
    accentHex: '#A875FF',
    secondaryHex: '#65A9FF',
    cardGlow: 'shadow-[#A875FF]/40',
    pipActive: 'bg-[#A875FF] border-[#F2F7FF] text-[#061225]',
    orb: 'bg-[#A875FF]/40',
    frameAnimationClass: 'animate-celestial-drift',
    unlockTierHint: 'Citadel Conquest & Starlight Ascension',
  },
  Eternal: {
    tierIndex: 10,
    label: 'Eternal',
    shortTag: 'X · TIMELESS',
    isBeyondMythic: true,
    border: 'border-[#FBBF24]',
    ringClass: 'ring-2 ring-[#00D9FF]/75 shadow-[0_0_34px_rgba(0,217,255,0.45)]',
    badge: 'bg-gradient-to-r from-[#0A1930] via-[#1677FF]/45 to-[#102440] text-[#FBBF24] border border-[#FBBF24]',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-[#FBBF24] via-[#00D9FF] to-[#38D9F5]',
    accentHex: '#FBBF24',
    secondaryHex: '#00D9FF',
    cardGlow: 'shadow-[#00D9FF]/45',
    pipActive: 'bg-gradient-to-r from-[#FBBF24] via-[#00D9FF] to-[#38D9F5] border-[#F2F7FF] text-[#061225]',
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
