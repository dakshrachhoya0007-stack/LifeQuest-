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
  bgBase: '#100D18',
  bgSecondary: '#171220',
  bgSurface: '#21152F',
  bgElevated: '#21152F',
  bgDeepPurple: '#362B45',
  bgRecessed: '#100D18',
  brandPrimary: '#7045A0',
  brandBright: '#9A72CC',
  brandSecondary: '#D6A84B',
  brandGoldGlow: '#E8C777',
  accentEmerald: '#49B88A',
  accentRuby: '#D65C66',
  accentAmber: '#D6A84B',
  textPrimary: '#F2EDF7',
  textSecondary: '#A69AAF',
  textMuted: '#766D82',
} as const;

export const FEATURE_THEMES: Record<FeatureThemeId, FeatureTheme> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    paletteLabel: 'Royal Purple + Antique Gold',
    primaryHex: '#7045A0',
    primaryRgb: '112, 69, 160',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#F2EDF7',
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness & Vitality',
    paletteLabel: 'Emerald Success + Royal Purple',
    primaryHex: '#49B88A',
    primaryRgb: '73, 184, 138',
    secondaryHex: '#7045A0',
    secondaryRgb: '112, 69, 160',
    accentTextHex: '#49B88A',
    secondaryTextHex: '#E8C777',
    contrastTextHex: '#100D18',
  },
  'skill-tree': {
    id: 'skill-tree',
    name: 'Skill Tree',
    paletteLabel: 'Royal Purple + Soft Gold',
    primaryHex: '#7045A0',
    primaryRgb: '112, 69, 160',
    secondaryHex: '#E8C777',
    secondaryRgb: '232, 199, 119',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#49B88A',
    contrastTextHex: '#F2EDF7',
  },
  quests: {
    id: 'quests',
    name: 'Quests & Calendar',
    paletteLabel: 'Antique Gold + Royal Purple',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#7045A0',
    secondaryRgb: '112, 69, 160',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#D6A84B',
    contrastTextHex: '#100D18',
  },
  achievements: {
    id: 'achievements',
    name: 'Achievements & Hall of Legends',
    paletteLabel: 'Antique Gold + Soft Gold',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#E8C777',
    secondaryRgb: '232, 199, 119',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#100D18',
  },
  'boss-battles': {
    id: 'boss-battles',
    name: 'Boss Battles',
    paletteLabel: 'Crimson Danger + Antique Gold',
    primaryHex: '#D65C66',
    primaryRgb: '214, 92, 102',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#D65C66',
    secondaryTextHex: '#E8C777',
    contrastTextHex: '#F2EDF7',
  },
  rivals: {
    id: 'rivals',
    name: 'Rivals Arena',
    paletteLabel: 'Crimson Danger + Royal Purple',
    primaryHex: '#D65C66',
    primaryRgb: '214, 92, 102',
    secondaryHex: '#7045A0',
    secondaryRgb: '112, 69, 160',
    accentTextHex: '#D65C66',
    secondaryTextHex: '#E8C777',
    contrastTextHex: '#F2EDF7',
  },
  social: {
    id: 'social',
    name: 'Social & Fellowship',
    paletteLabel: 'Royal Purple + Soft Gold',
    primaryHex: '#7045A0',
    primaryRgb: '112, 69, 160',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#F2EDF7',
  },
  events: {
    id: 'events',
    name: 'Community Events',
    paletteLabel: 'Antique Gold + Royal Purple',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#7045A0',
    secondaryRgb: '112, 69, 160',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#100D18',
  },
  mentor: {
    id: 'mentor',
    name: 'AI Fitness Mentor',
    paletteLabel: 'Royal Purple + Soft Gold',
    primaryHex: '#7045A0',
    primaryRgb: '112, 69, 160',
    secondaryHex: '#E8C777',
    secondaryRgb: '232, 199, 119',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#F2EDF7',
  },
  museum: {
    id: 'museum',
    name: 'Personal Records Museum',
    paletteLabel: 'Antique Gold + Deep Purple',
    primaryHex: '#D6A84B',
    primaryRgb: '214, 168, 75',
    secondaryHex: '#7045A0',
    secondaryRgb: '112, 69, 160',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#100D18',
  },
  character: {
    id: 'character',
    name: 'Character Profile',
    paletteLabel: 'Royal Purple + Antique Gold',
    primaryHex: '#7045A0',
    primaryRgb: '112, 69, 160',
    secondaryHex: '#D6A84B',
    secondaryRgb: '214, 168, 75',
    accentTextHex: '#E8C777',
    secondaryTextHex: '#A69AAF',
    contrastTextHex: '#F2EDF7',
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
