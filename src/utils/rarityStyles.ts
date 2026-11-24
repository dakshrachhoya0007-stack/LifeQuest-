import { WeaponCategory, WeaponRarity } from '../types/game';

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

export const RARITY_ORDER: WeaponRarity[] = [
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

export const WEAPON_CATEGORIES_ORDER: WeaponCategory[] = [
  'Swords',
  'Greatswords',
  'Daggers',
  'Dual Blades',
  'Bows',
  'Crossbows',
  'Magic Staffs',
  'Wands',
  'Spears',
  'Axes',
  'War Hammers',
  'Scythes',
  'Shields',
  'Armour',
  'Helmets',
  'Accessories',
];

export const MAIN_HAND_WEAPON_CATEGORIES: WeaponCategory[] = [
  'Swords',
  'Greatswords',
  'Daggers',
  'Dual Blades',
  'Bows',
  'Crossbows',
  'Magic Staffs',
  'Wands',
  'Spears',
  'Axes',
  'War Hammers',
  'Scythes',
];

export const RARITY_STYLE_MAP: Record<WeaponRarity, RarityVisualStyle> = {
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
    unlockTierHint: 'Treasury & Realm Skirmishes',
  },
  Epic: {
    tierIndex: 4,
    label: 'Epic',
    shortTag: 'IV',
    isBeyondMythic: false,
    border: 'border-[#8B5CF6]/85',
    ringClass: 'ring-1 ring-[#8B5CF6]/45',
    badge: 'bg-[#1D1536] text-[#C4B5FD] border border-[#8B5CF6]/80',
    text: 'text-[#C4B5FD]',
    accentHex: '#8B5CF6',
    secondaryHex: '#6D28D9',
    cardGlow: 'shadow-[#6D28D9]/30',
    pipActive: 'bg-[#8B5CF6] border-[#C4B5FD] text-white',
    orb: 'bg-[#8B5CF6]/30',
    frameAnimationClass: '',
    unlockTierHint: 'Masterwork Forge & Treasury',
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
    badge: 'bg-gradient-to-r from-rose-950 to-red-950 text-rose-200 border border-rose-500/80',
    text: 'text-rose-300',
    accentHex: '#fb7185',
    secondaryHex: '#e11d48',
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
    border: 'border-[#34D399]/95',
    ringClass: 'ring-2 ring-[#34D399]/45 shadow-[0_0_22px_rgba(52,211,153,0.28)]',
    badge: 'bg-gradient-to-r from-[#0A251E] via-[#141420] to-[#0D3326] text-[#6EE7B7] border border-[#34D399]/85',
    text: 'text-[#34D399]',
    accentHex: '#34D399',
    secondaryHex: '#059669',
    cardGlow: 'shadow-emerald-950/80',
    pipActive: 'bg-[#34D399] border-emerald-100 text-[#090910]',
    orb: 'bg-[#34D399]/35',
    frameAnimationClass: 'animate-ascendant-pulse',
    unlockTierHint: 'Progression & Runic Evolution Only',
  },
  Divine: {
    tierIndex: 8,
    label: 'Divine',
    shortTag: 'VIII · SACRED',
    isBeyondMythic: true,
    border: 'border-[#FBBF24]',
    ringClass: 'ring-2 ring-[#D6A84B]/60 shadow-[0_0_26px_rgba(251,191,36,0.32)]',
    badge: 'bg-gradient-to-r from-[#2A1D0A] via-[#3A280D] to-[#1D1408] text-[#FDE68A] border border-[#FBBF24]',
    text: 'text-[#FBBF24]',
    accentHex: '#FBBF24',
    secondaryHex: '#D6A84B',
    cardGlow: 'shadow-amber-950/85',
    pipActive: 'bg-[#FBBF24] border-white text-[#090910]',
    orb: 'bg-[#FBBF24]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Boss Trials & Sacred Ascension Only',
  },
  Celestial: {
    tierIndex: 9,
    label: 'Celestial',
    shortTag: 'IX · ASTRAL',
    isBeyondMythic: true,
    border: 'border-[#38BDF8]',
    ringClass: 'ring-2 ring-[#38BDF8]/60 shadow-[0_0_28px_rgba(56,189,248,0.34)]',
    badge: 'bg-gradient-to-r from-[#141420] via-[#1D1736] to-[#0C2538] text-[#BAE6FD] border border-[#38BDF8]/85',
    text: 'text-[#38BDF8]',
    accentHex: '#38BDF8',
    secondaryHex: '#8B5CF6',
    cardGlow: 'shadow-sky-950/90',
    pipActive: 'bg-[#38BDF8] border-sky-200 text-[#090910]',
    orb: 'bg-[#38BDF8]/40',
    frameAnimationClass: 'animate-celestial-drift',
    unlockTierHint: 'Citadel Conquest & Starlight Ascension',
  },
  Eternal: {
    tierIndex: 10,
    label: 'Eternal',
    shortTag: 'X · TIMELESS',
    isBeyondMythic: true,
    border: 'border-[#D6A84B]',
    ringClass: 'ring-2 ring-[#D6A84B]/75 shadow-[0_0_34px_rgba(214,168,75,0.42)]',
    badge: 'bg-gradient-to-r from-[#141420] via-[#2A1B4E] to-[#2B1F0E] text-[#FDE68A] border border-[#D6A84B]',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-[#D6A84B] via-[#FDE68A] to-[#8B5CF6]',
    accentHex: '#D6A84B',
    secondaryHex: '#8B5CF6',
    cardGlow: 'shadow-[#6D28D9]/50',
    pipActive: 'bg-gradient-to-r from-[#D6A84B] to-[#8B5CF6] border-white text-[#090910]',
    orb: 'bg-[#D6A84B]/40',
    frameAnimationClass: 'animate-eternal-shift',
    unlockTierHint: 'Apex Aetheria Mastery & Cosmic Ascension',
  },
};

export const getRarityStyle = (rarity?: string): RarityVisualStyle => {
  if (!rarity) return RARITY_STYLE_MAP.Common;
  if (rarity === 'Mythical') return RARITY_STYLE_MAP.Mythic;
  return RARITY_STYLE_MAP[rarity as WeaponRarity] || RARITY_STYLE_MAP.Common;
};

export const isBeyondMythicRarity = (rarity?: string): boolean => {
  return getRarityStyle(rarity).isBeyondMythic;
};

export const getRarityTierIndex = (rarity?: string): number => {
  return getRarityStyle(rarity).tierIndex;
};
