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
    border: 'border-slate-700',
    ringClass: '',
    badge: 'bg-slate-800 text-slate-300 border border-slate-700',
    text: 'text-slate-300',
    accentHex: '#94a3b8',
    secondaryHex: '#64748b',
    cardGlow: 'shadow-slate-950/50',
    pipActive: 'bg-slate-400 border-slate-300 text-slate-950',
    orb: 'bg-slate-500/20',
    frameAnimationClass: '',
    unlockTierHint: 'Starter / Basic Treasury',
  },
  Uncommon: {
    tierIndex: 2,
    label: 'Uncommon',
    shortTag: 'II',
    isBeyondMythic: false,
    border: 'border-emerald-600/80',
    ringClass: '',
    badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
    text: 'text-emerald-300',
    accentHex: '#34d399',
    secondaryHex: '#059669',
    cardGlow: 'shadow-emerald-950/60',
    pipActive: 'bg-emerald-400 border-emerald-200 text-slate-950',
    orb: 'bg-emerald-500/25',
    frameAnimationClass: '',
    unlockTierHint: 'Treasury & Early Quests',
  },
  Rare: {
    tierIndex: 3,
    label: 'Rare',
    shortTag: 'III',
    isBeyondMythic: false,
    border: 'border-blue-500/80',
    ringClass: '',
    badge: 'bg-blue-950 text-blue-300 border border-blue-700',
    text: 'text-blue-300',
    accentHex: '#60a5fa',
    secondaryHex: '#2563eb',
    cardGlow: 'shadow-blue-950/60',
    pipActive: 'bg-blue-400 border-blue-200 text-slate-950',
    orb: 'bg-blue-500/25',
    frameAnimationClass: '',
    unlockTierHint: 'Treasury & Realm Trials',
  },
  Epic: {
    tierIndex: 4,
    label: 'Epic',
    shortTag: 'IV',
    isBeyondMythic: false,
    border: 'border-purple-500/85',
    ringClass: 'ring-1 ring-purple-500/35',
    badge: 'bg-purple-950 text-purple-300 border border-purple-700',
    text: 'text-purple-300',
    accentHex: '#c084fc',
    secondaryHex: '#7e22ce',
    cardGlow: 'shadow-purple-950/70',
    pipActive: 'bg-purple-400 border-purple-200 text-slate-950',
    orb: 'bg-purple-500/30',
    frameAnimationClass: '',
    unlockTierHint: 'Masterwork Vault & Treasury',
  },
  Legendary: {
    tierIndex: 5,
    label: 'Legendary',
    shortTag: 'V',
    isBeyondMythic: false,
    border: 'border-amber-500/90',
    ringClass: 'ring-1 ring-amber-500/45',
    badge: 'bg-amber-950 text-amber-300 border border-amber-500/70',
    text: 'text-amber-300',
    accentHex: '#fbbf24',
    secondaryHex: '#d97706',
    cardGlow: 'shadow-amber-950/70',
    pipActive: 'bg-amber-400 border-amber-200 text-slate-950',
    orb: 'bg-amber-500/35',
    frameAnimationClass: '',
    unlockTierHint: 'Heroic Vault & High Mastery',
  },
  Mythic: {
    tierIndex: 6,
    label: 'Mythic',
    shortTag: 'VI',
    isBeyondMythic: false,
    border: 'border-rose-500/90',
    ringClass: 'ring-2 ring-rose-500/40',
    badge: 'bg-gradient-to-r from-rose-950 to-fuchsia-950 text-rose-200 border border-rose-500/80',
    text: 'text-rose-300',
    accentHex: '#fb7185',
    secondaryHex: '#c026d3',
    cardGlow: 'shadow-rose-950/80',
    pipActive: 'bg-rose-400 border-rose-200 text-slate-950',
    orb: 'bg-rose-500/35',
    frameAnimationClass: '',
    unlockTierHint: 'Mythic Vault & Evolution Catalyst',
  },
  Ascendant: {
    tierIndex: 7,
    label: 'Ascendant',
    shortTag: 'VII · RUNED',
    isBeyondMythic: true,
    border: 'border-teal-400/95',
    ringClass: 'ring-2 ring-teal-400/50 shadow-[0_0_22px_rgba(45,212,191,0.3)]',
    badge: 'bg-gradient-to-r from-teal-950 via-cyan-950 to-emerald-950 text-teal-200 border border-teal-400/90',
    text: 'text-teal-300',
    accentHex: '#2dd4bf',
    secondaryHex: '#06b6d4',
    cardGlow: 'shadow-teal-950/80',
    pipActive: 'bg-teal-300 border-teal-100 text-slate-950',
    orb: 'bg-teal-400/35',
    frameAnimationClass: 'animate-ascendant-pulse',
    unlockTierHint: 'Progression & Runic Evolution Only',
  },
  Divine: {
    tierIndex: 8,
    label: 'Divine',
    shortTag: 'VIII · SACRED',
    isBeyondMythic: true,
    border: 'border-yellow-300',
    ringClass: 'ring-2 ring-yellow-300/60 shadow-[0_0_26px_rgba(253,224,71,0.34)]',
    badge: 'bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-yellow-200 border border-yellow-300',
    text: 'text-yellow-200',
    accentHex: '#fde047',
    secondaryHex: '#f59e0b',
    cardGlow: 'shadow-yellow-950/85',
    pipActive: 'bg-yellow-300 border-white text-slate-950',
    orb: 'bg-yellow-300/35',
    frameAnimationClass: '',
    unlockTierHint: 'Boss Trials & Sacred Ascension Only',
  },
  Celestial: {
    tierIndex: 9,
    label: 'Celestial',
    shortTag: 'IX · ASTRAL',
    isBeyondMythic: true,
    border: 'border-violet-400',
    ringClass: 'ring-2 ring-violet-400/65 shadow-[0_0_28px_rgba(167,139,250,0.4)]',
    badge: 'bg-gradient-to-r from-indigo-950 via-purple-900 to-fuchsia-950 text-violet-100 border border-violet-300/90',
    text: 'text-violet-200',
    accentHex: '#c084fc',
    secondaryHex: '#38bdf8',
    cardGlow: 'shadow-violet-950/90',
    pipActive: 'bg-violet-300 border-sky-200 text-slate-950',
    orb: 'bg-violet-500/40',
    frameAnimationClass: 'animate-celestial-drift',
    unlockTierHint: 'Citadel Conquest & Starlight Ascension',
  },
  Eternal: {
    tierIndex: 10,
    label: 'Eternal',
    shortTag: 'X · TIMELESS',
    isBeyondMythic: true,
    border: 'border-cyan-300',
    ringClass: 'ring-2 ring-cyan-300/75 shadow-[0_0_34px_rgba(34,211,238,0.45)]',
    badge: 'bg-gradient-to-r from-fuchsia-950 via-indigo-950 to-cyan-950 text-cyan-100 border border-cyan-300',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-amber-200',
    accentHex: '#22d3ee',
    secondaryHex: '#f472b6',
    cardGlow: 'shadow-cyan-950/95',
    pipActive: 'bg-gradient-to-r from-cyan-300 to-fuchsia-300 border-white text-slate-950',
    orb: 'bg-cyan-400/40',
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
