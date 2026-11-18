import type {
  IdentityRarity,
  NotificationCategory,
  PlayerTitleDefinition,
  RareBadgeDefinition,
  ReputationBreakdown,
  SeasonDefinition,
  ServerNotificationPreferences,
} from '../types/game.ts';

export const IDENTITY_RARITY_STYLE: Record<
  IdentityRarity,
  { border: string; text: string; bg: string; hex: string }
> = {
  Common: {
    border: 'border-slate-600/60',
    text: 'text-slate-200',
    bg: 'bg-slate-900/80',
    hex: '#94A3B8',
  },
  Uncommon: {
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/60',
    hex: '#34D399',
  },
  Rare: {
    border: 'border-sky-500/55',
    text: 'text-sky-300',
    bg: 'bg-sky-950/60',
    hex: '#38BDF8',
  },
  Epic: {
    border: 'border-purple-500/60',
    text: 'text-purple-300',
    bg: 'bg-purple-950/65',
    hex: '#A855F7',
  },
  Legendary: {
    border: 'border-[#C5A15A]/70',
    text: 'text-[#E8CF96]',
    bg: 'bg-[#281E0E]/80',
    hex: '#C5A15A',
  },
  Mythic: {
    border: 'border-rose-400/75',
    text: 'text-rose-200',
    bg: 'bg-rose-950/75',
    hex: '#FB7185',
  },
};

export const PLAYER_TITLES_CATALOG: PlayerTitleDefinition[] = [
  {
    id: 'title_rising_champion',
    name: 'Rising Champion',
    rarity: 'Common',
    description: 'Took your first verified steps on the path of discipline.',
    unlockRequirement: 'Reach Level 2 or complete 2 verified workouts',
    category: 'discipline',
    conditionType: 'workouts_total',
    threshold: 2,
  },
  {
    id: 'title_iron_discipline',
    name: 'Iron Discipline',
    rarity: 'Uncommon',
    description: 'Kept your oath through steady daily action.',
    unlockRequirement: 'Reach a 5-day consistency streak',
    category: 'consistency',
    conditionType: 'streak_days',
    threshold: 5,
  },
  {
    id: 'title_aether_scholar',
    name: 'Aether Scholar',
    rarity: 'Rare',
    description: 'Awakened deeper mastery within the Real-Life Skill Tree.',
    unlockRequirement: 'Unlock 3 Skill Tree nodes',
    category: 'discipline',
    conditionType: 'skill_nodes_unlocked',
    threshold: 3,
  },
  {
    id: 'title_endurance_master',
    name: 'Endurance Master',
    rarity: 'Rare',
    description: 'Outlasted fatigue across verified training sessions.',
    unlockRequirement: 'Complete 15 verified workouts',
    category: 'endurance',
    conditionType: 'workouts_total',
    threshold: 15,
  },
  {
    id: 'title_stormbreaker',
    name: 'Titan Vanguard',
    rarity: 'Epic',
    description: 'Stood in the vanguard against Aetheria’s Weekly Raid Bosses.',
    unlockRequirement: 'Land 5 verified Weekly Boss raid strikes',
    category: 'boss',
    conditionType: 'boss_hits_total',
    threshold: 5,
  },
  {
    id: 'title_consistency_legend',
    name: 'Consistency Legend',
    rarity: 'Epic',
    description: 'Turned daily habits into an unyielding fortress.',
    unlockRequirement: 'Reach a 14-day consistency streak',
    category: 'consistency',
    conditionType: 'streak_days',
    threshold: 14,
  },
  {
    id: 'title_unbreakable',
    name: 'The Unbreakable',
    rarity: 'Legendary',
    description: 'Forged through grit, comebacks, and relentless effort.',
    unlockRequirement: 'Reach Skill Level 5 in any attribute or 30-day streak',
    category: 'strength',
    conditionType: 'skill_level_any',
    threshold: 5,
  },
  {
    id: 'title_legendary_achiever',
    name: 'Legendary Achiever',
    rarity: 'Mythic',
    description: 'Mastered trials across fitness, fellowship, and realm warfare.',
    unlockRequirement: 'Unlock 12 achievements or reach Level 15',
    category: 'discipline',
    conditionType: 'achievements_unlocked',
    threshold: 12,
  },
  {
    id: 'title_season_1_conqueror',
    name: 'Dawnbreaker Warden',
    rarity: 'Legendary',
    description: 'Ascended the Season 1: Awakening of the Golden Canopy track.',
    unlockRequirement: 'Reach Tier 5 in Season 1',
    category: 'seasonal',
    conditionType: 'season_tier',
    threshold: 5,
  },
];

export const RARE_BADGES_CATALOG: RareBadgeDefinition[] = [
  {
    id: 'badge_first_spark',
    name: 'First Oath Spark',
    rarity: 'Common',
    iconName: 'Flame',
    description: 'Completed your inaugural verified fitness training.',
    unlockRequirement: 'Complete 1 verified workout',
    conditionType: 'workouts_total',
    threshold: 1,
  },
  {
    id: 'badge_streak_keeper',
    name: 'Ember Keeper',
    rarity: 'Uncommon',
    iconName: 'Shield',
    description: 'Sustained a verified multi-day streak.',
    unlockRequirement: 'Maintain a 3-day consistency streak',
    conditionType: 'streak_days',
    threshold: 3,
  },
  {
    id: 'badge_node_seeker',
    name: 'Tree Awakening',
    rarity: 'Rare',
    iconName: 'Sparkles',
    description: 'Forged specialized branches across the Skill Tree.',
    unlockRequirement: 'Unlock 4 Skill Tree nodes',
    conditionType: 'skill_nodes_unlocked',
    threshold: 4,
  },
  {
    id: 'badge_raid_striker',
    name: 'Citadel Striker',
    rarity: 'Epic',
    iconName: 'Swords',
    description: 'Delivered substantial verified damage in Weekly Boss Battles.',
    unlockRequirement: 'Deal 500+ total Weekly Boss damage',
    conditionType: 'boss_damage_total',
    threshold: 500,
  },
  {
    id: 'badge_duelist_crest',
    name: 'Rival Crest',
    rarity: 'Epic',
    iconName: 'Award',
    description: 'Emerged victorious in fair 7-day Friend Rivalries.',
    unlockRequirement: 'Win 2 Friend Rivalries',
    conditionType: 'rivalry_wins',
    threshold: 2,
  },
  {
    id: 'badge_canopy_guardian',
    name: 'Canopy Guardian',
    rarity: 'Legendary',
    iconName: 'Crown',
    description: 'A pillar of community milestones and cooperative strength.',
    unlockRequirement: 'Contribute 250+ points to Community Events',
    conditionType: 'community_points',
    threshold: 250,
  },
  {
    id: 'badge_chronicle_vault',
    name: 'Museum Archivist',
    rarity: 'Legendary',
    iconName: 'Landmark',
    description: 'Enshrined an impressive collection of verified milestones.',
    unlockRequirement: 'Earn 6 Personal Records Museum entries',
    conditionType: 'museum_records',
    threshold: 6,
  },
  {
    id: 'badge_first_titan_slayer',
    name: 'First Titan Vanquisher',
    rarity: 'Mythic',
    iconName: 'Crown',
    description: 'World-first global rare badge claimed by the pioneering Weekly Boss vanquisher.',
    unlockRequirement: 'Defeat a Weekly Raid Boss (Global Exclusive First-Claim)',
    globalExclusive: true,
    conditionType: 'bosses_defeated',
    threshold: 1,
  },
  {
    id: 'badge_apex_reputation',
    name: 'Paragon of Aetheria',
    rarity: 'Mythic',
    iconName: 'Star',
    description: 'Earned enduring respect across every pillar of real-life progression.',
    unlockRequirement: 'Reach 1,200 Reputation',
    conditionType: 'reputation_score',
    threshold: 1200,
  },
];

export const getReputationTierLabel = (score: number): string => {
  if (score >= 2500) return 'Mythic Paragon';
  if (score >= 1200) return 'Grand Champion';
  if (score >= 600) return 'Honored Vanguard';
  if (score >= 250) return 'Trusted Squire';
  if (score >= 50) return 'Oathbound Initiate';
  return 'Aspiring Traveler';
};

export const computeTotalReputation = (b: ReputationBreakdown): number =>
  Math.max(
    0,
    Math.round(
      b.workoutsScore +
        b.consistencyScore +
        b.bossParticipationScore +
        b.rivalryScore +
        b.communityScore +
        b.skillMasteryScore +
        b.titlesAndBadgesScore
    )
  );

export const DEFAULT_SERVER_NOTIFICATION_PREFS: ServerNotificationPreferences = {
  masterEnabled: true,
  fitness: true,
  social: true,
  achievement: true,
  boss: true,
  community: true,
  seasonal: true,
};

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { label: string; description: string }
> = {
  player_progression: {
    label: 'Progression',
    description: 'Skill levels, titles, badges, reputation, and milestones',
  },
  social: {
    label: 'Social',
    description: 'Friend requests, guild invitations, and rival challenges',
  },
  game_world: {
    label: 'Game World',
    description: 'Weekly raid bosses, community events, and seasonal chapters',
  },
  fitness: {
    label: 'Fitness',
    description: 'Personal bests, streak milestones, and verified activity wins',
  },
};

export const buildInitialSeasonsCatalog = (now: Date = new Date()): SeasonDefinition[] => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  return [
    {
      id: `season-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-s1`,
      seasonNumber: 1,
      name: 'Season 1: Awakening of the Golden Canopy',
      theme: 'Solar Renewal & Iron Consistency',
      subtitle: 'Fair Real-World Dedication Track · Pure Cosmetic & Honor Rewards',
      description:
        'Unite physical workouts, daily habits, raid teamwork, and steady comebacks across Aetheria. Seasonal rewards grant collectible crests, titles, and badges without disrupting permanent character balance.',
      accentHex: '#C5A15A',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: 'active',
      challenges: [
        {
          id: 'sc_weekly_workouts',
          cadence: 'weekly',
          title: 'Iron Vanguard Trials',
          description: 'Complete 3 verified workout sessions during the season.',
          metric: 'workouts',
          targetCount: 3,
          seasonalXpReward: 180,
        },
        {
          id: 'sc_weekly_habits',
          cadence: 'weekly',
          title: 'Oathkeeper Rhythm',
          description: 'Record 5 verified habit completions.',
          metric: 'habit_completions',
          targetCount: 5,
          seasonalXpReward: 150,
        },
        {
          id: 'sc_season_boss',
          cadence: 'season',
          title: 'Titan Frontline',
          description: 'Land 4 verified strikes in Weekly Boss Battles.',
          metric: 'boss_hits',
          targetCount: 4,
          seasonalXpReward: 260,
        },
        {
          id: 'sc_season_community',
          cadence: 'season',
          title: 'Heartlands Fellowship',
          description: 'Contribute 120 verified points to Community Events.',
          metric: 'community_points',
          targetCount: 120,
          seasonalXpReward: 240,
        },
        {
          id: 'sc_season_dedicated',
          cadence: 'season',
          title: 'Seasonal Chronicle',
          description: 'Complete 15 verified real-life activities across all pillars.',
          metric: 'verified_activities',
          targetCount: 15,
          seasonalXpReward: 350,
        },
      ],
      milestones: [
        {
          tier: 1,
          id: 's1_tier_1',
          title: 'Tier 1: Sprouting Sigil',
          requiredSeasonXp: 100,
          rewardType: 'cosmetic_crest',
          rewardLabel: 'Canopy Sprout Profile Crest',
        },
        {
          tier: 2,
          id: 's1_tier_2',
          title: 'Tier 2: Verdant Banner',
          requiredSeasonXp: 250,
          rewardType: 'cosmetic_crest',
          rewardLabel: 'Emerald Hearth Border',
        },
        {
          tier: 3,
          id: 's1_tier_3',
          title: 'Tier 3: Solar Medal',
          requiredSeasonXp: 450,
          rewardType: 'badge',
          rewardLabel: 'Rare Badge: Ember Keeper Unlock Boost',
          rewardRefId: 'badge_streak_keeper',
        },
        {
          tier: 4,
          id: 's1_tier_4',
          title: 'Tier 4: Sovereign Seal',
          requiredSeasonXp: 700,
          rewardType: 'achievement',
          rewardLabel: 'Season 1 Vanguard Commendation',
        },
        {
          tier: 5,
          id: 's1_tier_5',
          title: 'Tier 5: Dawnbreaker Crown',
          requiredSeasonXp: 1000,
          rewardType: 'title',
          rewardLabel: 'Title: Dawnbreaker Warden',
          rewardRefId: 'title_season_1_conqueror',
        },
      ],
    },
  ];
};
