import type {
  GlobalAchievementCategory,
  GlobalAchievementRarity,
  GlobalExclusiveAchievement,
  GlobalTitleStyle,
} from '../types/game.ts';

export const GLOBAL_LEGEND_CATEGORIES: Array<{
  id: GlobalAchievementCategory;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'legendary_discipline',
    label: 'Discipline',
    subtitle: 'Iron will, daily ritual mastery, and unyielding self-control.',
  },
  {
    id: 'physical_excellence',
    label: 'Physical Excellence',
    subtitle: 'Athletic endurance, verified reps, and disciplined conditioning.',
  },
  {
    id: 'unbreakable_consistency',
    label: 'Consistency',
    subtitle: 'Sustained streaks and unwavering daily cadence.',
  },
  {
    id: 'ultimate_challenges',
    label: 'Pinnacle Feats',
    subtitle: 'Conquest across all realms and ascendant champion mastery.',
  },
];

export const TITLE_STYLE_META: Record<
  GlobalTitleStyle,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowShadow: string;
    accentHex: string;
  }
> = {
  gold: {
    badgeBg: 'bg-gradient-to-r from-[#102440] via-[#3A2717] to-[#102440]',
    badgeBorder: 'border-[#E7B94F]/85',
    badgeText: 'text-[#FFD978]',
    glowShadow: 'shadow-[0_0_16px_rgba(231,185,79,0.3)]',
    accentHex: '#E7B94F',
  },
  celestial: {
    badgeBg: 'bg-gradient-to-r from-[#102440] via-[#102440] to-[#132B45]',
    badgeBorder: 'border-[#65A9FF]/80',
    badgeText: 'text-[#65A9FF]',
    glowShadow: 'shadow-[0_0_16px_rgba(101,169,255,0.28)]',
    accentHex: '#65A9FF',
  },
  crimson: {
    badgeBg: 'bg-gradient-to-r from-[#361124] via-[#4D162E] to-[#102440]',
    badgeBorder: 'border-[#F05B70]/80',
    badgeText: 'text-[#F05B70]',
    glowShadow: 'shadow-[0_0_16px_rgba(240,91,112,0.3)]',
    accentHex: '#F05B70',
  },
  emerald: {
    badgeBg: 'bg-gradient-to-r from-[#0E2923] via-[#133D34] to-[#102629]',
    badgeBorder: 'border-[#35D69A]/80',
    badgeText: 'text-[#35D69A]',
    glowShadow: 'shadow-[0_0_16px_rgba(53,214,154,0.28)]',
    accentHex: '#35D69A',
  },
  arcane: {
    badgeBg: 'bg-gradient-to-r from-[#102440] via-[#1677FF] to-[#102440]',
    badgeBorder: 'border-[#00D9FF]/85',
    badgeText: 'text-[#00D9FF]',
    glowShadow: 'shadow-[0_0_16px_rgba(0,217,255,0.34)]',
    accentHex: '#00D9FF',
  },
  prismatic: {
    badgeBg: 'bg-gradient-to-r from-[#102440] via-[#1677FF] to-[#263C5A]',
    badgeBorder: 'border-[#FFD978]/85',
    badgeText: 'text-[#FFD978]',
    glowShadow: 'shadow-[0_0_20px_rgba(255,217,120,0.38)]',
    accentHex: '#38D9F5',
  },
};

export const RARITY_FRAME_META: Record<
  GlobalAchievementRarity,
  {
    textClass: string;
    borderClass: string;
    cardGlow: string;
  }
> = {
  Epic: {
    textClass: 'text-[#00D9FF]',
    borderClass: 'border-[#00D9FF]/60',
    cardGlow: 'shadow-[#1677FF]/40',
  },
  Legendary: {
    textClass: 'text-[#FFD978]',
    borderClass: 'border-[#E7B94F]/65',
    cardGlow: 'shadow-[#E7B94F]/35',
  },
  Mythic: {
    textClass: 'text-[#F05B70]',
    borderClass: 'border-[#F05B70]/75',
    cardGlow: 'shadow-[#F05B70]/40',
  },
  Ascendant: {
    textClass: 'text-[#38D9F5]',
    borderClass: 'border-[#38D9F5]/55',
    cardGlow: 'shadow-[#38D9F5]/35',
  },
  Celestial: {
    textClass: 'text-[#65A9FF]',
    borderClass: 'border-[#65A9FF]/55',
    cardGlow: 'shadow-[#65A9FF]/35',
  },
  Eternal: {
    textClass: 'text-[#FFD978]',
    borderClass: 'border-[#00D9FF]/65',
    cardGlow: 'shadow-[#00D9FF]/40',
  },
};

// Curated 5 Worldwide One-Player-Only Global Exclusive Achievements.
// Zero Player XP inflation — grants permanent unique worldwide title + balanced Gold bounty.
export const GLOBAL_EXCLUSIVE_ACHIEVEMENTS: GlobalExclusiveAchievement[] = [
  {
    id: 'gl-disc-02',
    name: 'The Unyielding Vow',
    story: 'While lesser knights faltered when fatigue spoke, one stood firm across three hundred verified daily habits.',
    category: 'legendary_discipline',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'THE UNYIELDING',
    titleStyle: 'arcane',
    emblemIcon: 'Flame',
    requirementSummary: 'Record 300 completed habit logs across your journey',
    requirementType: 'habits_claimed_total',
    threshold: 300,
    rewardPlayerXp: 0,
    rewardGold: 600,
  },
  {
    id: 'gl-phys-02',
    name: 'Titan of a Thousand Reps',
    story: 'First across the world to push through 1,000 camera-verified physical repetitions without faltering.',
    category: 'physical_excellence',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'TITAN OF IRON',
    titleStyle: 'crimson',
    emblemIcon: 'Dumbbell',
    requirementSummary: 'Accumulate 1,000 Aether Vision verified exercise repetitions',
    requirementType: 'total_verified_reps',
    threshold: 1000,
    rewardPlayerXp: 0,
    rewardGold: 700,
  },
  {
    id: 'gl-cons-02',
    name: 'Moon-Cycle Warden',
    story: 'Three weeks of uninterrupted discipline forged into an ironclad lifelong cadence.',
    category: 'unbreakable_consistency',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'TWENTY-ONE DAWNS',
    titleStyle: 'emerald',
    emblemIcon: 'ShieldCheck',
    requirementSummary: 'Maintain a 21-day verified healthy habit streak',
    requirementType: 'current_streak',
    threshold: 21,
    rewardPlayerXp: 0,
    rewardGold: 650,
  },
  {
    id: 'gl-ult-02',
    name: 'Conqueror of All Five Realms',
    story: 'Banished the Void from Forest, Mountain, Ocean, Desert, and Citadel before any rival could stand.',
    category: 'ultimate_challenges',
    rarity: 'Mythic',
    difficulty: 'Pinnacle',
    titleTag: 'FIVE REALMS CONQUEROR',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Defeat the sovereign boss in all 5 Kingdoms of Aetheria',
    requirementType: 'all_kingdoms_cleared',
    threshold: 1,
    rewardPlayerXp: 0,
    rewardGold: 900,
  },
  {
    id: 'gl-ult-03',
    name: 'Ascendant Paragon',
    story: 'Reached Character Level 15 through pure, verified dedication across body and discipline.',
    category: 'ultimate_challenges',
    rarity: 'Mythic',
    difficulty: 'Pinnacle',
    titleTag: 'GRAND CHAMPION',
    titleStyle: 'celestial',
    emblemIcon: 'Award',
    requirementSummary: 'Reach Character Level 15',
    requirementType: 'level',
    threshold: 15,
    rewardPlayerXp: 0,
    rewardGold: 800,
  },
];

export interface GlobalMetricSnapshot {
  level: number;
  totalXp: number;
  currentStreak: number;
  totalWorkouts: number;
  totalVerifiedReps: number;
  totalBossesDefeated: number;
  aetherPoints: number;
  habitsClaimedTotal: number;
  mealsLoggedTotal: number;
  waterGlassesCurrent: number;
  hydrationGoalsTotal: number;
  questsClaimedTotal: number;
  dynamicQuestsClaimedTotal: number;
  dynamicPhysicalClaimed: number;
  dynamicIntellectualClaimed: number;
  dynamicDisciplineClaimed: number;
  dynamicPersonalGrowthClaimed: number;
  dynamicSocialClaimed: number;
  normalAchievementsUnlocked: number;
  friendsCount: number;
  guildJoined: number;
  guildLeader: number;
  chatMessagesSent: number;
  storyChaptersClaimed: number;
  allKingdomsCleared: number;
  honorReclaimed: number;
  dailyReportsGenerated: number;
  goldBalance: number;
}

export const getMetricValueForRequirement = (
  requirementType: string,
  m: GlobalMetricSnapshot
): number => {
  switch (requirementType) {
    case 'level':
      return m.level;
    case 'total_xp':
      return m.totalXp;
    case 'current_streak':
      return m.currentStreak;
    case 'total_workouts':
      return m.totalWorkouts;
    case 'total_verified_reps':
      return m.totalVerifiedReps;
    case 'total_bosses_defeated':
      return m.totalBossesDefeated;
    case 'aether_points':
      return m.aetherPoints;
    case 'habits_claimed_total':
      return m.habitsClaimedTotal;
    case 'meals_logged_total':
      return m.mealsLoggedTotal;
    case 'water_glasses_current':
      return m.waterGlassesCurrent;
    case 'hydration_goals_total':
      return m.hydrationGoalsTotal;
    case 'quests_claimed_total':
      return m.questsClaimedTotal;
    case 'dynamic_quests_claimed_total':
      return m.dynamicQuestsClaimedTotal;
    case 'dynamic_physical_claimed':
      return m.dynamicPhysicalClaimed;
    case 'dynamic_intellectual_claimed':
      return m.dynamicIntellectualClaimed;
    case 'dynamic_discipline_claimed':
      return m.dynamicDisciplineClaimed;
    case 'dynamic_personal_growth_claimed':
      return m.dynamicPersonalGrowthClaimed;
    case 'dynamic_social_claimed':
      return m.dynamicSocialClaimed;
    case 'normal_achievements_unlocked':
      return m.normalAchievementsUnlocked;
    case 'friends_count':
      return m.friendsCount;
    case 'guild_joined':
      return m.guildJoined;
    case 'guild_leader':
      return m.guildLeader;
    case 'chat_messages_sent':
      return m.chatMessagesSent;
    case 'story_chapters_claimed':
      return m.storyChaptersClaimed;
    case 'all_kingdoms_cleared':
      return m.allKingdomsCleared;
    case 'honor_reclaimed':
      return m.honorReclaimed;
    case 'daily_reports_generated':
      return m.dailyReportsGenerated;
    case 'gold_balance':
      return m.goldBalance;
    default:
      return 0;
  }
};
