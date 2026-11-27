export type FeatureThemeId =
  | 'dashboard'
  | 'fitness'
  | 'skill-tree'
  | 'quests'
  | 'achievements'
  | 'boss-battles'
  | 'rivals'
  | 'social'
  | 'events'
  | 'mentor'
  | 'museum'
  | 'character';

export interface FeatureTheme {
  id: FeatureThemeId;
  name: string;
  paletteLabel: string;
  primaryHex: string;
  primaryRgb: string;
  secondaryHex: string;
  secondaryRgb: string;
  accentTextHex: string;
  secondaryTextHex: string;
  contrastTextHex: string;
}

export const GLOBAL_BRAND = {
  bgBase: '#061225',
  bgSurface: '#102440',
  bgElevated: '#0A1930',
  bgRecessed: '#040C1C',
  brandPrimary: '#1677FF',
  brandBright: '#00D9FF',
  brandSecondary: '#E7B94F',
  brandGoldGlow: '#FFD978',
  accentCyan: '#00D9FF',
  accentEmerald: '#35D69A',
  accentRuby: '#F05B70',
  accentIce: '#65A9FF',
  accentAmber: '#FFAA45',
  textPrimary: '#F2F7FF',
  textSecondary: '#94A8C7',
} as const;

export const FEATURE_THEMES: Record<FeatureThemeId, FeatureTheme> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    paletteLabel: 'Electric Blue + Cyan',
    primaryHex: '#1677FF',
    primaryRgb: '22, 119, 255',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#00D9FF',
    secondaryTextHex: '#FFD978',
    contrastTextHex: '#FFFFFF',
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness & Vitality',
    paletteLabel: 'Emerald Green + Electric Cyan',
    primaryHex: '#35D69A',
    primaryRgb: '53, 214, 154',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#35D69A',
    secondaryTextHex: '#00D9FF',
    contrastTextHex: '#061225',
  },
  'skill-tree': {
    id: 'skill-tree',
    name: 'Skill Tree',
    paletteLabel: 'Electric Cyan + Cobalt Blue',
    primaryHex: '#00D9FF',
    primaryRgb: '0, 217, 255',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#00D9FF',
    secondaryTextHex: '#65A9FF',
    contrastTextHex: '#061225',
  },
  quests: {
    id: 'quests',
    name: 'Quests & Calendar',
    paletteLabel: 'Premium Gold + Warm Amber',
    primaryHex: '#E7B94F',
    primaryRgb: '231, 185, 79',
    secondaryHex: '#FFAA45',
    secondaryRgb: '255, 170, 69',
    accentTextHex: '#FFD978',
    secondaryTextHex: '#FFAA45',
    contrastTextHex: '#061225',
  },
  achievements: {
    id: 'achievements',
    name: 'Achievements & Hall of Legends',
    paletteLabel: 'Premium Gold + Electric Cyan',
    primaryHex: '#E7B94F',
    primaryRgb: '231, 185, 79',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#FFD978',
    secondaryTextHex: '#00D9FF',
    contrastTextHex: '#061225',
  },
  'boss-battles': {
    id: 'boss-battles',
    name: 'Boss Battles',
    paletteLabel: 'Ruby Crimson + Warm Amber',
    primaryHex: '#F05B70',
    primaryRgb: '240, 91, 112',
    secondaryHex: '#FFAA45',
    secondaryRgb: '255, 170, 69',
    accentTextHex: '#F05B70',
    secondaryTextHex: '#FFAA45',
    contrastTextHex: '#FFFFFF',
  },
  rivals: {
    id: 'rivals',
    name: 'Rivals Arena',
    paletteLabel: 'Ruby Red + Royal Gold',
    primaryHex: '#F05B70',
    primaryRgb: '240, 91, 112',
    secondaryHex: '#E7B94F',
    secondaryRgb: '231, 185, 79',
    accentTextHex: '#F05B70',
    secondaryTextHex: '#FFD978',
    contrastTextHex: '#FFFFFF',
  },
  social: {
    id: 'social',
    name: 'Social & Fellowship',
    paletteLabel: 'Icy Blue + Electric Cyan',
    primaryHex: '#65A9FF',
    primaryRgb: '101, 169, 255',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#65A9FF',
    secondaryTextHex: '#00D9FF',
    contrastTextHex: '#061225',
  },
  events: {
    id: 'events',
    name: 'Community Events',
    paletteLabel: 'Warm Amber + Electric Cyan',
    primaryHex: '#FFAA45',
    primaryRgb: '255, 170, 69',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#FFAA45',
    secondaryTextHex: '#00D9FF',
    contrastTextHex: '#061225',
  },
  mentor: {
    id: 'mentor',
    name: 'AI Fitness Mentor',
    paletteLabel: 'Electric Cyan + Cobalt Blue',
    primaryHex: '#00D9FF',
    primaryRgb: '0, 217, 255',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#00D9FF',
    secondaryTextHex: '#65A9FF',
    contrastTextHex: '#061225',
  },
  museum: {
    id: 'museum',
    name: 'Personal Records Museum',
    paletteLabel: 'Premium Gold + Electric Blue',
    primaryHex: '#E7B94F',
    primaryRgb: '231, 185, 79',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#FFD978',
    secondaryTextHex: '#65A9FF',
    contrastTextHex: '#061225',
  },
  character: {
    id: 'character',
    name: 'Character Profile',
    paletteLabel: 'Electric Cyan + Gold',
    primaryHex: '#00D9FF',
    primaryRgb: '0, 217, 255',
    secondaryHex: '#E7B94F',
    secondaryRgb: '231, 185, 79',
    accentTextHex: '#00D9FF',
    secondaryTextHex: '#FFD978',
    contrastTextHex: '#061225',
  },
};

export interface FeatureRoutingContext {
  activeTab: string;
  progressionSubTab?: string;
  socialSubTab?: string;
  characterSubTab?: string;
  storeSubTab?: string;
  eventsSubTab?: string;
  guildsSubTab?: string;
}

export function resolveFeatureThemeId(ctx: FeatureRoutingContext): FeatureThemeId {
  const { activeTab, progressionSubTab } = ctx;

  if (activeTab === 'fitness' || activeTab === 'nutrition' || activeTab === 'aether-vision') {
    return 'fitness';
  }
  if (activeTab === 'skill-tree') {
    return 'skill-tree';
  }
  if (activeTab === 'quests' || activeTab === 'daily-report' || activeTab === 'daily-calendar') {
    return 'quests';
  }
  if (activeTab === 'achievements' || activeTab === 'hall-of-legends') {
    return 'achievements';
  }
  if (activeTab === 'progression') {
    if (progressionSubTab === 'skill-tree') return 'skill-tree';
    if (progressionSubTab === 'achievements' || progressionSubTab === 'hall-of-legends') {
      return 'achievements';
    }
    return 'quests';
  }
  if (activeTab === 'boss-battles') {
    return 'boss-battles';
  }
  if (activeTab === 'rivals') {
    return 'rivals';
  }
  if (
    activeTab === 'seasons' ||
    activeTab === 'battle-pass' ||
    activeTab === 'social' ||
    activeTab === 'leaderboard' ||
    activeTab === 'friends' ||
    activeTab === 'chat' ||
    activeTab === 'activity-feed' ||
    activeTab === 'workout-parties' ||
    activeTab === 'friendships' ||
    activeTab === 'guilds' ||
    activeTab === 'territory-wars'
  ) {
    return 'social';
  }
  if (activeTab === 'events' || activeTab === 'decisions') {
    return 'events';
  }
  if (activeTab === 'mentor') {
    return 'mentor';
  }
  if (activeTab === 'museum') {
    return 'museum';
  }
  if (activeTab === 'store' || activeTab === 'marketplace') {
    return 'achievements';
  }
  if (
    activeTab === 'character' ||
    activeTab === 'customization' ||
    activeTab === 'cards' ||
    activeTab === 'trophies'
  ) {
    return 'character';
  }
  return 'dashboard';
}

export function resolveFeatureTheme(ctx: FeatureRoutingContext): FeatureTheme {
  return FEATURE_THEMES[resolveFeatureThemeId(ctx)];
}

export function applyFeatureThemeToDocument(theme: FeatureTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.featureTheme = theme.id;
  root.style.setProperty('--lq-accent', theme.primaryHex);
  root.style.setProperty('--lq-accent-rgb', theme.primaryRgb);
  root.style.setProperty('--lq-accent-secondary', theme.secondaryHex);
  root.style.setProperty('--lq-accent-secondary-rgb', theme.secondaryRgb);
  root.style.setProperty('--lq-accent-text', theme.accentTextHex);
  root.style.setProperty('--lq-accent-secondary-text', theme.secondaryTextHex);
  root.style.setProperty('--lq-accent-contrast', theme.contrastTextHex);
}
