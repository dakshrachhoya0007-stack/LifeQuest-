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
  bgSecondary: '#0A1930',
  bgSurface: '#102440',
  bgElevated: '#102440',
  bgDeepNavy: '#1E3A63',
  bgDeepPurple: '#1E3A63',
  bgRecessed: '#061225',
  brandPrimary: '#1677FF',
  brandBright: '#00D9FF',
  brandSecondary: '#00D9FF',
  brandGold: '#F59E0B',
  brandGoldGlow: '#FBBF24',
  accentCyan: '#00D9FF',
  accentCyanSoft: '#38D9F5',
  accentEmerald: '#10B981',
  accentRuby: '#F43F5E',
  accentAmber: '#F59E0B',
  textPrimary: '#F2F7FF',
  textSecondary: '#94A8C7',
  textMuted: '#647A9E',
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
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#F2F7FF',
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness & Vitality',
    paletteLabel: 'Emerald Vitality + Cyan',
    primaryHex: '#10B981',
    primaryRgb: '16, 185, 129',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#34D399',
    secondaryTextHex: '#38D9F5',
    contrastTextHex: '#061225',
  },
  'skill-tree': {
    id: 'skill-tree',
    name: 'Skill Tree',
    paletteLabel: 'Electric Blue + Cyan Pulse',
    primaryHex: '#1677FF',
    primaryRgb: '22, 119, 255',
    secondaryHex: '#38D9F5',
    secondaryRgb: '56, 217, 245',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#10B981',
    contrastTextHex: '#F2F7FF',
  },
  quests: {
    id: 'quests',
    name: 'Quests & Calendar',
    paletteLabel: 'Cyan + Electric Blue',
    primaryHex: '#00D9FF',
    primaryRgb: '0, 217, 255',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#FBBF24',
    contrastTextHex: '#061225',
  },
  achievements: {
    id: 'achievements',
    name: 'Achievements & Hall of Legends',
    paletteLabel: 'Amber Gold + Electric Blue',
    primaryHex: '#F59E0B',
    primaryRgb: '245, 158, 11',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#FBBF24',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#061225',
  },
  'boss-battles': {
    id: 'boss-battles',
    name: 'Boss Battles',
    paletteLabel: 'Crimson Danger + Electric Blue',
    primaryHex: '#F43F5E',
    primaryRgb: '244, 63, 94',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#FB7185',
    secondaryTextHex: '#38D9F5',
    contrastTextHex: '#F2F7FF',
  },
  rivals: {
    id: 'rivals',
    name: 'Rivals Arena',
    paletteLabel: 'Crimson Danger + Electric Blue',
    primaryHex: '#F43F5E',
    primaryRgb: '244, 63, 94',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#FB7185',
    secondaryTextHex: '#38D9F5',
    contrastTextHex: '#F2F7FF',
  },
  social: {
    id: 'social',
    name: 'Fellowship & Battle Pass',
    paletteLabel: 'Electric Blue + Cyan',
    primaryHex: '#1677FF',
    primaryRgb: '22, 119, 255',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#FBBF24',
    contrastTextHex: '#F2F7FF',
  },
  events: {
    id: 'events',
    name: 'Community Events',
    paletteLabel: 'Cyan + Electric Blue',
    primaryHex: '#00D9FF',
    primaryRgb: '0, 217, 255',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#061225',
  },
  mentor: {
    id: 'mentor',
    name: 'AI Fitness Mentor',
    paletteLabel: 'Electric Blue + Cyan',
    primaryHex: '#1677FF',
    primaryRgb: '22, 119, 255',
    secondaryHex: '#38D9F5',
    secondaryRgb: '56, 217, 245',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#F2F7FF',
  },
  museum: {
    id: 'museum',
    name: 'Personal Records Museum',
    paletteLabel: 'Amber Gold + Electric Blue',
    primaryHex: '#F59E0B',
    primaryRgb: '245, 158, 11',
    secondaryHex: '#1677FF',
    secondaryRgb: '22, 119, 255',
    accentTextHex: '#FBBF24',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#061225',
  },
  character: {
    id: 'character',
    name: 'Character Profile',
    paletteLabel: 'Electric Blue + Cyan',
    primaryHex: '#1677FF',
    primaryRgb: '22, 119, 255',
    secondaryHex: '#00D9FF',
    secondaryRgb: '0, 217, 255',
    accentTextHex: '#38D9F5',
    secondaryTextHex: '#94A8C7',
    contrastTextHex: '#F2F7FF',
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
