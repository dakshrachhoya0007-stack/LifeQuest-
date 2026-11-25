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
  bgBase: '#090910',
  bgSurface: '#141420',
  bgElevated: '#1A1A28',
  bgRecessed: '#0E0E17',
  brandPrimary: '#8B5CF6',
  brandSecondary: '#D6A84B',
  textPrimary: '#F5F3FF',
  textSecondary: '#A1A1B5',
} as const;

export const FEATURE_THEMES: Record<FeatureThemeId, FeatureTheme> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    paletteLabel: 'Royal Purple + Gold',
    primaryHex: '#8B5CF6',
    primaryRgb: '139, 92, 246',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#C4B5FD',
    secondaryTextHex: '#E8C678',
    contrastTextHex: '#FFFFFF',
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness',
    paletteLabel: 'Emerald Green + Mint',
    primaryHex: '#10B981',
    primaryRgb: '16, 185, 129',
    secondaryHex: '#6EE7B7',
    secondaryRgb: '110, 231, 183',
    accentTextHex: '#6EE7B7',
    secondaryTextHex: '#A7F3D0',
    contrastTextHex: '#04261B',
  },
  'skill-tree': {
    id: 'skill-tree',
    name: 'Skill Tree',
    paletteLabel: 'Forest Green + Magical Teal',
    primaryHex: '#16A34A',
    primaryRgb: '22, 163, 74',
    secondaryHex: '#14B8A6',
    secondaryRgb: '20, 184, 166',
    accentTextHex: '#4ADE80',
    secondaryTextHex: '#5EEAD4',
    contrastTextHex: '#FFFFFF',
  },
  quests: {
    id: 'quests',
    name: 'Quests',
    paletteLabel: 'Violet + Gold',
    primaryHex: '#8B5CF6',
    primaryRgb: '139, 92, 246',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#DDD6FE',
    secondaryTextHex: '#E8C678',
    contrastTextHex: '#FFFFFF',
  },
  achievements: {
    id: 'achievements',
    name: 'Achievements',
    paletteLabel: 'Gold + Amber',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#F59E0B',
    secondaryRgb: '245, 158, 11',
    accentTextHex: '#F3D282',
    secondaryTextHex: '#FCD34D',
    contrastTextHex: '#090910',
  },
  'boss-battles': {
    id: 'boss-battles',
    name: 'Boss Battles',
    paletteLabel: 'Crimson + Fiery Orange',
    primaryHex: '#DC2626',
    primaryRgb: '220, 38, 38',
    secondaryHex: '#F97316',
    secondaryRgb: '249, 115, 22',
    accentTextHex: '#FCA5A5',
    secondaryTextHex: '#FDBA74',
    contrastTextHex: '#FFFFFF',
  },
  rivals: {
    id: 'rivals',
    name: 'Rival System',
    paletteLabel: 'Crimson + Electric Red',
    primaryHex: '#E11D48',
    primaryRgb: '225, 29, 72',
    secondaryHex: '#EF4444',
    secondaryRgb: '239, 68, 68',
    accentTextHex: '#FDA4AF',
    secondaryTextHex: '#FCA5A5',
    contrastTextHex: '#FFFFFF',
  },
  social: {
    id: 'social',
    name: 'Social',
    paletteLabel: 'Electric Blue + Indigo',
    primaryHex: '#3B82F6',
    primaryRgb: '59, 130, 246',
    secondaryHex: '#6366F1',
    secondaryRgb: '99, 102, 241',
    accentTextHex: '#93C5FD',
    secondaryTextHex: '#A5B4FC',
    contrastTextHex: '#FFFFFF',
  },
  events: {
    id: 'events',
    name: 'Community Events',
    paletteLabel: 'Orange + Magenta',
    primaryHex: '#F97316',
    primaryRgb: '249, 115, 22',
    secondaryHex: '#D946EF',
    secondaryRgb: '217, 70, 239',
    accentTextHex: '#FDBA74',
    secondaryTextHex: '#F0ABFC',
    contrastTextHex: '#090910',
  },
  mentor: {
    id: 'mentor',
    name: 'AI Fitness Mentor',
    paletteLabel: 'Mystic Violet + Electric Blue',
    primaryHex: '#9333EA',
    primaryRgb: '147, 51, 234',
    secondaryHex: '#3B82F6',
    secondaryRgb: '59, 130, 246',
    accentTextHex: '#D8B4FE',
    secondaryTextHex: '#93C5FD',
    contrastTextHex: '#FFFFFF',
  },
  museum: {
    id: 'museum',
    name: 'Personal Records Museum',
    paletteLabel: 'Gold + Royal Purple',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#8B5CF6',
    secondaryRgb: '139, 92, 246',
    accentTextHex: '#F3D282',
    secondaryTextHex: '#C4B5FD',
    contrastTextHex: '#090910',
  },
  character: {
    id: 'character',
    name: 'Character Profile',
    paletteLabel: 'Royal Purple + Gold',
    primaryHex: '#8B5CF6',
    primaryRgb: '139, 92, 246',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#C4B5FD',
    secondaryTextHex: '#E8C678',
    contrastTextHex: '#FFFFFF',
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
  if (activeTab === 'quests' || activeTab === 'daily-report' || activeTab === 'seasons' || activeTab === 'daily-calendar') {
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
