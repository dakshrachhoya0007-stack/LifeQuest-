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
    badgeBg: 'bg-gradient-to-r from-[#171220] via-[#2B2018] to-[#171220]',
    badgeBorder: 'border-[#D6A84B]/80',
    badgeText: 'text-[#E8C777]',
    glowShadow: 'shadow-[0_0_16px_rgba(214,168,75,0.28)]',
    accentHex: '#D6A84B',
  },
  celestial: {
    badgeBg: 'bg-gradient-to-r from-[#171220] via-[#251A3A] to-[#171220]',
    badgeBorder: 'border-[#9A72CC]/80',
    badgeText: 'text-[#D3BCF2]',
    glowShadow: 'shadow-[0_0_16px_rgba(154,114,204,0.28)]',
    accentHex: '#9A72CC',
  },
  crimson: {
    badgeBg: 'bg-gradient-to-r from-[#26121A] via-[#3A1924] to-[#171220]',
    badgeBorder: 'border-[#D65C66]/80',
    badgeText: 'text-[#F0929A]',
    glowShadow: 'shadow-[0_0_16px_rgba(214,92,102,0.28)]',
    accentHex: '#D65C66',
  },
  emerald: {
    badgeBg: 'bg-gradient-to-r from-[#11241E] via-[#17332A] to-[#171220]',
    badgeBorder: 'border-[#49B88A]/80',
    badgeText: 'text-[#7BE0B7]',
    glowShadow: 'shadow-[0_0_16px_rgba(73,184,138,0.28)]',
    accentHex: '#49B88A',
  },
  arcane: {
    badgeBg: 'bg-gradient-to-r from-[#171220] via-[#3B245A] to-[#171220]',
    badgeBorder: 'border-[#7045A0]/85',
    badgeText: 'text-[#D3BCF2]',
    glowShadow: 'shadow-[0_0_16px_rgba(112,69,160,0.34)]',
    accentHex: '#7045A0',
  },
  prismatic: {
    badgeBg: 'bg-gradient-to-r from-[#171220] via-[#3B245A] to-[#2B2018]',
    badgeBorder: 'border-[#E8C777]/85',
    badgeText: 'text-[#E8C777]',
    glowShadow: 'shadow-[0_0_20px_rgba(232,199,119,0.34)]',
    accentHex: '#E8C777',
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
    textClass: 'text-[#B998E3]',
    borderClass: 'border-[#7045A0]/60',
    cardGlow: 'shadow-[#7045A0]/35',
  },
  Legendary: {
    textClass: 'text-[#E8C777]',
    borderClass: 'border-[#D6A84B]/65',
    cardGlow: 'shadow-[#D6A84B]/30',
  },
  Mythic: {
    textClass: 'text-[#D65C66]',
    borderClass: 'border-[#D65C66]/70',
    cardGlow: 'shadow-[#D65C66]/35',
  },
  Ascendant: {
    textClass: 'text-[#E8C777]',
    borderClass: 'border-[#9A72CC]/55',
    cardGlow: 'shadow-[#9A72CC]/35',
  },
  Celestial: {
    textClass: 'text-[#D3BCF2]',
    borderClass: 'border-[#9A72CC]/55',
    cardGlow: 'shadow-[#9A72CC]/35',
  },
  Eternal: {
    textClass: 'text-[#E8C777]',
    borderClass: 'border-[#D6A84B]/65',
    cardGlow: 'shadow-[#D6A84B]/35',
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
