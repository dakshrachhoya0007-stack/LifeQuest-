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
    badge: 'bg-[#171220] text-[#D1D5DB] border border-[#9CA3AF]/50',
    text: 'text-[#D1D5DB]',
    accentHex: '#C4C9DB',
    secondaryHex: '#9CA3AF',
    cardGlow: 'shadow-[#100D18]/75',
    pipActive: 'bg-[#C4C9DB] border-[#F2EDF7] text-[#100D18]',
    orb: 'bg-[#C4C9DB]/20',
    frameAnimationClass: '',
    unlockTierHint: 'Starter / Basic Treasury',
  },
  Uncommon: {
    tierIndex: 2,
    label: 'Uncommon',
    shortTag: 'II',
    isBeyondMythic: false,
    border: 'border-[#49B88A]/70',
    ringClass: '',
    badge: 'bg-[#122620] text-[#49B88A] border border-[#49B88A]/60',
    text: 'text-[#49B88A]',
    accentHex: '#49B88A',
    secondaryHex: '#2E8F67',
    cardGlow: 'shadow-[#49B88A]/20',
    pipActive: 'bg-[#49B88A] border-emerald-200 text-[#100D18]',
    orb: 'bg-[#49B88A]/25',
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
    badge: 'bg-[#151D33] text-[#65A9FF] border border-[#65A9FF]/70',
    text: 'text-[#65A9FF]',
    accentHex: '#65A9FF',
    secondaryHex: '#38D9F5',
    cardGlow: 'shadow-[#65A9FF]/25',
    pipActive: 'bg-[#65A9FF] border-sky-200 text-[#100D18]',
    orb: 'bg-[#65A9FF]/25',
    frameAnimationClass: '',
    unlockTierHint: 'Treasury & Realm Trials',
  },
  Epic: {
    tierIndex: 4,
    label: 'Epic',
    shortTag: 'IV',
    isBeyondMythic: false,
    border: 'border-[#9A72CC]/85',
    ringClass: 'ring-1 ring-[#9A72CC]/45',
    badge: 'bg-[#21152F] text-[#9A72CC] border border-[#9A72CC]/80',
    text: 'text-[#9A72CC]',
    accentHex: '#9A72CC',
    secondaryHex: '#7045A0',
    cardGlow: 'shadow-[#7045A0]/35',
    pipActive: 'bg-[#9A72CC] border-[#F2EDF7] text-[#100D18]',
    orb: 'bg-[#9A72CC]/30',
    frameAnimationClass: '',
    unlockTierHint: 'Masterwork Vault & Treasury',
  },
  Legendary: {
    tierIndex: 5,
    label: 'Legendary',
    shortTag: 'V',
    isBeyondMythic: false,
    border: 'border-[#D6A84B]/95',
    ringClass: 'ring-1 ring-[#E8C777]/50 shadow-[0_0_22px_rgba(214,168,75,0.28)]',
    badge: 'bg-gradient-to-r from-[#21152F] via-[#3A2817] to-[#21152F] text-[#E8C777] border border-[#D6A84B]/85',
    text: 'text-[#E8C777]',
    accentHex: '#D6A84B',
    secondaryHex: '#7045A0',
    cardGlow: 'shadow-[#D6A84B]/30',
    pipActive: 'bg-gradient-to-r from-[#D6A84B] to-[#E8C777] border-[#E8C777] text-[#100D18]',
    orb: 'bg-[#D6A84B]/35',
    frameAnimationClass: '',
    unlockTierHint: 'Heroic Vault & High Mastery',
  },
  Mythic: {
    tierIndex: 6,
    label: 'Mythic',
    shortTag: 'VI',
    isBeyondMythic: false,
    border: 'border-[#D65C66]/90',
    ringClass: 'ring-2 ring-[#D65C66]/45 shadow-[0_0_24px_rgba(214,92,102,0.28)]',
    badge: 'bg-gradient-to-r from-[#361321] to-[#21152F] text-[#FF9CA6] border border-[#D65C66]/85',
    text: 'text-[#D65C66]',
    accentHex: '#D65C66',
    secondaryHex: '#FFAA45',
    cardGlow: 'shadow-[#D65C66]/35',
    pipActive: 'bg-[#D65C66] border-rose-200 text-[#F2EDF7]',
    orb: 'bg-[#D65C66]/35',
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
    badge: 'bg-gradient-to-r from-[#162238] via-[#21152F] to-[#132B38] text-[#38D9F5] border border-[#38D9F5]/90',
    text: 'text-[#38D9F5]',
    accentHex: '#38D9F5',
    secondaryHex: '#7045A0',
    cardGlow: 'shadow-[#38D9F5]/35',
    pipActive: 'bg-[#38D9F5] border-cyan-100 text-[#100D18]',
    orb: 'bg-[#38D9F5]/35',
    frameAnimationClass: 'animate-ascendant-pulse',
    unlockTierHint: 'Progression & Runic Evolution Only',
  },
  Divine: {
    tierIndex: 8,
    label: 'Divine',
    shortTag: 'VIII · SACRED',
    isBeyondMythic: true,
    border: 'border-[#E8C777]',
    ringClass: 'ring-2 ring-[#E8C777]/65 shadow-[0_0_28px_rgba(232,199,119,0.36)]',
    badge: 'bg-gradient-to-r from-[#3A2814] via-[#4D3414] to-[#21152F] text-[#E8C777] border border-[#E8C777]',
    text: 'text-[#E8C777]',
    accentHex: '#E8C777',
    secondaryHex: '#D6A84B',
    cardGlow: 'shadow-[#E8C777]/40',
    pipActive: 'bg-[#E8C777] border-[#F2EDF7] text-[#100D18]',
    orb: 'bg-[#E8C777]/35',
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
    badge: 'bg-gradient-to-r from-[#171220] via-[#21152F] to-[#26193E] text-[#A875FF] border border-[#A875FF]/90',
    text: 'text-[#A875FF]',
    accentHex: '#A875FF',
    secondaryHex: '#65A9FF',
    cardGlow: 'shadow-[#A875FF]/40',
    pipActive: 'bg-[#A875FF] border-[#F2EDF7] text-[#100D18]',
    orb: 'bg-[#A875FF]/40',
    frameAnimationClass: 'animate-celestial-drift',
    unlockTierHint: 'Citadel Conquest & Starlight Ascension',
  },
  Eternal: {
    tierIndex: 10,
    label: 'Eternal',
    shortTag: 'X · TIMELESS',
    isBeyondMythic: true,
    border: 'border-[#E8C777]',
    ringClass: 'ring-2 ring-[#9A72CC]/75 shadow-[0_0_34px_rgba(154,114,204,0.45)]',
    badge: 'bg-gradient-to-r from-[#171220] via-[#7045A0]/60 to-[#21152F] text-[#E8C777] border border-[#E8C777]',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-[#E8C777] via-[#9A72CC] to-[#38D9F5]',
    accentHex: '#E8C777',
    secondaryHex: '#9A72CC',
    cardGlow: 'shadow-[#9A72CC]/45',
    pipActive: 'bg-gradient-to-r from-[#E8C777] via-[#9A72CC] to-[#38D9F5] border-[#F2EDF7] text-[#100D18]',
    orb: 'bg-[#9A72CC]/40',
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
