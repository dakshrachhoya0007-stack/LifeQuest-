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
    border: 'border-[#9CA3AF]/55',
    text: 'text-[#D1D5DB]',
    bg: 'bg-[#1B1430]/85',
    hex: '#C4C9DB',
  },
  Uncommon: {
    border: 'border-[#35D69A]/55',
    text: 'text-[#35D69A]',
    bg: 'bg-[#0F2924]/70',
    hex: '#35D69A',
  },
  Rare: {
    border: 'border-[#65A9FF]/60',
    text: 'text-[#65A9FF]',
    bg: 'bg-[#172247]/70',
    hex: '#65A9FF',
  },
  Epic: {
    border: 'border-[#A875FF]/70',
    text: 'text-[#A875FF]',
    bg: 'bg-[#24143D]',
    hex: '#A875FF',
  },
  Legendary: {
    border: 'border-[#E7B94F]/80',
    text: 'text-[#FFD978]',
    bg: 'bg-gradient-to-r from-[#24143D] to-[#3A2418]',
    hex: '#E7B94F',
  },
  Mythic: {
    border: 'border-[#F05B70]/75',
    text: 'text-[#F05B70]',
    bg: 'bg-[#361325]/80',
    hex: '#F05B70',
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
    unlockRequirement: 'Reach Tier 50 in Season 1 or Tier 5 Mastery',
    limitedEdition: true,
    category: 'seasonal',
    conditionType: 'season_tier',
    threshold: 5,
  },
  {
    id: 'title_season_1_vanguard',
    name: 'Canopy Pathfinder',
    rarity: 'Rare',
    description: 'Charted the early boughs of the Season 1 Battle Pass.',
    unlockRequirement: 'Reach Tier 15 in Season 1',
    limitedEdition: true,
    category: 'seasonal',
    conditionType: 'season_tier',
    threshold: 15,
  },
  {
    id: 'title_season_1_ascendant',
    name: 'Equinox Standard',
    rarity: 'Epic',
    description: 'Carried the golden lantern past the Season 1 halfway crest.',
    unlockRequirement: 'Reach Tier 30 in Season 1',
    limitedEdition: true,
    category: 'seasonal',
    conditionType: 'season_tier',
    threshold: 30,
  },
  {
    id: 'title_card_archivist',
    name: 'Card Archivist',
    rarity: 'Epic',
    description: 'Curated 12+ unique 2D fantasy cards in the Realm Binder.',
    unlockRequirement: 'Collect 12 unique Collectible Cards',
    category: 'collection',
    conditionType: 'cards_collected',
    threshold: 12,
  },
  {
    id: 'title_citadel_patron',
    name: 'Citadel Patron',
    rarity: 'Rare',
    description: 'Acquired from the Cosmetic Marketplace using earned Gold or Fragments.',
    unlockRequirement: 'Unlock in Cosmetic Marketplace',
    category: 'collection',
    conditionType: 'marketplace_unlock',
    threshold: 1,
  },
  {
    id: 'title_astral_curator',
    name: 'Astral Curator',
    rarity: 'Epic',
    description: 'Reached 50% total realm collection completion or acquired in the Marketplace.',
    unlockRequirement: '50% Collection Completion or Marketplace',
    category: 'collection',
    conditionType: 'collection_percent',
    threshold: 50,
  },
  {
    id: 'title_vault_seeker',
    name: 'Vault Seeker',
    rarity: 'Rare',
    description: 'Catalogued 25% of Aetheria’s trophies, cards, titles, and cosmetics.',
    unlockRequirement: 'Reach 25% Overall Collection Completion',
    category: 'collection',
    conditionType: 'collection_percent',
    threshold: 25,
  },
  {
    id: 'title_grand_curator',
    name: 'Grand Treasury Keeper',
    rarity: 'Legendary',
    description: 'Steward of 75% of all permanent artifacts and cards across the realm.',
    unlockRequirement: 'Reach 75% Overall Collection Completion',
    category: 'collection',
    conditionType: 'collection_percent',
    threshold: 75,
  },
  {
    id: 'title_eternal_collector',
    name: 'Eternal Collector',
    rarity: 'Mythic',
    description: 'Completed the full 100% chronicle of Aetheria’s permanent collections.',
    unlockRequirement: 'Reach 100% Overall Collection Completion',
    category: 'collection',
    conditionType: 'collection_percent',
    threshold: 100,
  },
  {
    id: 'title_oathbound_ally',
    name: 'Oathbound Ally',
    rarity: 'Rare',
    description: 'Forged a Level 3 cooperative bond through verified shared training.',
    unlockRequirement: 'Reach Friendship Level 3 with a companion',
    category: 'social',
    conditionType: 'friendship_level',
    threshold: 3,
  },
  {
    id: 'title_kindred_vanguard',
    name: 'Kindred Vanguard',
    rarity: 'Epic',
    description: 'Built an enduring Level 5 Citadel Kindred friendship.',
    unlockRequirement: 'Reach Friendship Level 5 with a companion',
    category: 'social',
    conditionType: 'friendship_level',
    threshold: 5,
  },
  {
    id: 'title_div_bronze',
    name: 'Bronze Contender',
    rarity: 'Common',
    description: 'Stepped into fair competitive duels across the Rivals Arena.',
    unlockRequirement: 'Complete Rivals placement matches in Bronze+',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 1,
  },
  {
    id: 'title_div_silver',
    name: 'Silver Duelist',
    rarity: 'Uncommon',
    description: 'Climbed into the Silver Rivals Division through honest duels.',
    unlockRequirement: 'Reach Silver Division (1100+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 2,
  },
  {
    id: 'title_div_gold',
    name: 'Gilded Challenger',
    rarity: 'Rare',
    description: 'Earned standing in the Gold Rivals Division.',
    unlockRequirement: 'Reach Gold Division (1300+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 3,
  },
  {
    id: 'title_div_platinum',
    name: 'Platinum Vanguard',
    rarity: 'Rare',
    description: 'Held composure among the disciplined Platinum Rivals tier.',
    unlockRequirement: 'Reach Platinum Division (1500+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 4,
  },
  {
    id: 'title_div_diamond',
    name: 'Diamond Tactician',
    rarity: 'Epic',
    description: 'Out-endured top competitors in the Diamond Rivals Division.',
    unlockRequirement: 'Reach Diamond Division (1700+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 5,
  },
  {
    id: 'title_div_master',
    name: 'Master Gladiator',
    rarity: 'Legendary',
    description: 'Stood among Aetheria’s Master-ranked competitors.',
    unlockRequirement: 'Reach Master Division (1900+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 6,
  },
  {
    id: 'title_div_grandmaster',
    name: 'Grandmaster of Aetheria',
    rarity: 'Mythic',
    description: 'Commanded the apex Grandmaster Rivals Division.',
    unlockRequirement: 'Reach Grandmaster Division (2100+ Elo)',
    category: 'rivals',
    conditionType: 'ranked_division',
    threshold: 7,
  },
  {
    id: 'title_prestige_1',
    name: 'Awakened Paragon',
    rarity: 'Rare',
    description: 'Ascended to Prestige Tier I without ever surrendering lifetime mastery.',
    unlockRequirement: 'Unlock Prestige Tier I (Level 10+)',
    category: 'prestige',
    conditionType: 'prestige_tier',
    threshold: 1,
  },
  {
    id: 'title_prestige_2',
    name: 'Citadel Ascendant',
    rarity: 'Epic',
    description: 'Inscribed Prestige Tier II upon your permanent Chronicle.',
    unlockRequirement: 'Unlock Prestige Tier II (Level 18+)',
    category: 'prestige',
    conditionType: 'prestige_tier',
    threshold: 2,
  },
  {
    id: 'title_prestige_3',
    name: 'Astral Exemplar',
    rarity: 'Legendary',
    description: 'Elevated to Prestige Tier III across enduring real-world discipline.',
    unlockRequirement: 'Unlock Prestige Tier III (Level 25+)',
    category: 'prestige',
    conditionType: 'prestige_tier',
    threshold: 3,
  },
  {
    id: 'title_prestige_4',
    name: 'Eternal Warden',
    rarity: 'Legendary',
    description: 'Reached Prestige Tier IV through months of unbroken commitment.',
    unlockRequirement: 'Unlock Prestige Tier IV (Level 35+)',
    category: 'prestige',
    conditionType: 'prestige_tier',
    threshold: 4,
  },
  {
    id: 'title_prestige_5',
    name: 'Sovereign of Aetheria',
    rarity: 'Mythic',
    description: 'Crowned at Prestige Tier V—legendary beacon of the Golden Canopy.',
    unlockRequirement: 'Unlock Prestige Tier V (Level 50+)',
    category: 'prestige',
    conditionType: 'prestige_tier',
    threshold: 5,
  },
  {
    id: 'title_event_herald',
    name: 'Festival Beacon',
    rarity: 'Epic',
    description: 'Stood among contributors during a Limited-Time Community Event.',
    unlockRequirement: 'Claim a Limited-Time Event reward track milestone',
    limitedEdition: true,
    category: 'event',
    conditionType: 'event_milestone',
    threshold: 1,
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
    iconName: 'Flame',
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

export const buildBattlePassTiers = (seasonNumber: number = 1) => {
  const prefix = `s${seasonNumber}_tier_`;
  const firstFive = [
    {
      tier: 1,
      id: `${prefix}1`,
      title: 'Tier 1: Sprouting Sigil',
      requiredSeasonXp: 100,
      rewardType: 'cosmetic_crest' as const,
      rewardLabel: 'Canopy Sprout Profile Crest + 40 Gold',
      rewardGold: 40,
      track: 'free' as const,
      eliteRewardType: 'cosmetic_crest' as const,
      eliteRewardLabel: 'Arcane Twilight Halo Aura',
      eliteCosmeticId: 'aura_violet_runes',
      eliteFragments: 25,
    },
    {
      tier: 2,
      id: `${prefix}2`,
      title: 'Tier 2: Verdant Banner',
      requiredSeasonXp: 250,
      rewardType: 'cosmetic_crest' as const,
      rewardLabel: 'Emerald Hearth Border + 25 Fragments',
      rewardFragments: 25,
      track: 'free' as const,
      eliteRewardType: 'cosmetic_crest' as const,
      eliteRewardLabel: 'Royal Aureole Frame',
      eliteCosmeticId: 'frame_royal_aureole',
    },
    {
      tier: 3,
      id: `${prefix}3`,
      title: 'Tier 3: Solar Medal',
      requiredSeasonXp: 450,
      rewardType: 'card' as const,
      rewardLabel: 'Card: Golden Canopy Sprout + Ember Keeper Boost',
      rewardRefId: 'badge_streak_keeper',
      rewardCardId: 'card_sea_canopy_bud',
      track: 'free' as const,
      eliteRewardType: 'cosmetic_crest' as const,
      eliteRewardLabel: 'Sun Citadel Sovereign Regalia',
      eliteCosmeticId: 'outfit_sun_citadel_plate',
    },
    {
      tier: 4,
      id: `${prefix}4`,
      title: 'Tier 4: Sovereign Seal',
      requiredSeasonXp: 700,
      rewardType: 'fragments' as const,
      rewardLabel: 'Vanguard Commendation + 45 Fragments',
      rewardFragments: 45,
      rewardGold: 50,
      track: 'free' as const,
      eliteRewardType: 'cosmetic_crest' as const,
      eliteRewardLabel: 'Solar Aureole Rays Aura',
      eliteCosmeticId: 'aura_solar_crest',
    },
    {
      tier: 5,
      id: `${prefix}5`,
      title: 'Tier 5: Dawnbreaker Threshold',
      requiredSeasonXp: 1000,
      rewardType: 'title' as const,
      rewardLabel: 'Title: Dawnbreaker Warden',
      rewardRefId: 'title_season_1_conqueror',
      rewardTitleId: 'title_season_1_conqueror',
      track: 'free' as const,
      eliteRewardType: 'cosmetic_crest' as const,
      eliteRewardLabel: 'Celestial Sanctum Tapestry',
      eliteCosmeticId: 'banner_celestial_sanctum',
    },
  ];

  const remaining = Array.from({ length: 45 }, (_, idx) => {
    const tier = idx + 6; // 6..50
    const requiredSeasonXp = 1000 + (tier - 5) * 320; // Ends cleanly at 15,400 XP for Tier 50

    // Assign rich alternating rewards across cards, titles, cosmetics, fragments, and gold
    if (tier === 10) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Equinox Card Vault`,
        requiredSeasonXp,
        rewardType: 'card' as const,
        rewardLabel: 'Card: Bough of the Equinox + 60 Gold',
        rewardCardId: 'card_sea_sunlit_bough',
        rewardGold: 60,
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Whispering Canopy Palette',
        eliteCosmeticId: 'color_verdant_canopy',
      };
    }
    if (tier === 15) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Pathfinder Honor`,
        requiredSeasonXp,
        rewardType: 'title' as const,
        rewardLabel: 'Title: Canopy Pathfinder + 50 Fragments',
        rewardTitleId: 'title_season_1_vanguard',
        rewardFragments: 50,
        track: 'free' as const,
        eliteRewardType: 'card' as const,
        eliteRewardLabel: 'Card: Moonwell Vigil + 60 Fragments',
        eliteCardId: 'card_sea_lunar_watch',
        eliteFragments: 60,
      };
    }
    if (tier === 20) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Galeweaver Crest`,
        requiredSeasonXp,
        rewardType: 'cosmetic_crest' as const,
        rewardLabel: 'Galeweaver Braids Hairstyle',
        rewardRefId: 'hair_gale_braids',
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Twilight Mantle Vestments',
        eliteCosmeticId: 'outfit_arcane_vestments',
      };
    }
    if (tier === 25) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Chalice Crest`,
        requiredSeasonXp,
        rewardType: 'card' as const,
        rewardLabel: 'Card: Chalice of Dawnlight',
        rewardCardId: 'card_sea_aether_chalice',
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Golden World Tree Banner + 80 Fragments',
        eliteCosmeticId: 'banner_world_tree',
        eliteFragments: 80,
      };
    }
    if (tier === 30) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Equinox Standard`,
        requiredSeasonXp,
        rewardType: 'title' as const,
        rewardLabel: 'Title: Equinox Standard + 90 Gold',
        rewardTitleId: 'title_season_1_ascendant',
        rewardGold: 90,
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Emberstone Crimson Palette',
        eliteCosmeticId: 'color_crimson_forge',
      };
    }
    if (tier === 35) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Sovereign Cache`,
        requiredSeasonXp,
        rewardType: 'fragments' as const,
        rewardLabel: '125 Cosmetic Fragments + 120 Gold',
        rewardFragments: 125,
        rewardGold: 120,
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Astral Crown-Locks',
        eliteCosmeticId: 'hair_astral_crown',
      };
    }
    if (tier === 40) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Dawnbreaker Sigil`,
        requiredSeasonXp,
        rewardType: 'card' as const,
        rewardLabel: 'Card: Sigil of the Dawnbreaker',
        rewardCardId: 'card_sea_dawnbreaker_crest',
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Dragonfire Halo Frame',
        eliteCosmeticId: 'frame_dragonfire_halo',
      };
    }
    if (tier === 45) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier ${tier}: Starlight Citadel`,
        requiredSeasonXp,
        rewardType: 'fragments' as const,
        rewardLabel: '140 Cosmetic Fragments + 150 Gold',
        rewardFragments: 140,
        rewardGold: 150,
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Starlight Sentinel Regalia',
        eliteCosmeticId: 'outfit_astral_warden',
      };
    }
    if (tier === 50) {
      return {
        tier,
        id: `${prefix}${tier}`,
        title: `Tier 50: Astral Canopy Zenith`,
        requiredSeasonXp,
        rewardType: 'card' as const,
        rewardLabel: 'Mythic Card: World-Tree Astral Root + 250 Gold',
        rewardCardId: 'card_sea_astral_root',
        rewardGold: 250,
        rewardFragments: 150,
        track: 'free' as const,
        eliteRewardType: 'cosmetic_crest' as const,
        eliteRewardLabel: 'Obsidian Sovereign Crown Frame + 200 Fragments',
        eliteCosmeticId: 'frame_obsidian_crown',
        eliteFragments: 200,
      };
    }

    const isFragTier = tier % 2 === 0;
    return {
      tier,
      id: `${prefix}${tier}`,
      title: `Tier ${tier}: Canopy Cache`,
      requiredSeasonXp,
      rewardType: isFragTier ? ('fragments' as const) : ('gold' as const),
      rewardLabel: isFragTier ? `${25 + (tier % 5) * 5} Cosmetic Fragments` : `${55 + tier * 2} Gold`,
      rewardFragments: isFragTier ? 25 + (tier % 5) * 5 : undefined,
      rewardGold: isFragTier ? undefined : 55 + tier * 2,
      track: 'free' as const,
      eliteRewardType: isFragTier ? ('gold' as const) : ('fragments' as const),
      eliteRewardLabel: isFragTier ? `+${60 + tier * 2} Gold Treasury Cache` : `+${35 + (tier % 4) * 10} Cosmetic Fragments`,
      eliteGold: isFragTier ? 60 + tier * 2 : undefined,
      eliteFragments: isFragTier ? undefined : 35 + (tier % 4) * 10,
    };
  });

  return [...firstFive, ...remaining];
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
      subtitle: '50-Tier Seasonal Battle Pass · Pure Cosmetic, Card & Honor Rewards',
      description:
        'Progress across 50 seasonal Battle Pass tiers through verified workouts, healthy habits, study focus, raid teamwork, and weekly missions. Free and Premium Cosmetic tracks preserve earned collectibles permanently—zero pay-to-win.',
      accentHex: '#E7B94F',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: 'active',
      dailyXpCap: 350,
      challenges: [
        {
          id: 'sc_weekly_workouts',
          cadence: 'weekly',
          title: 'Iron Vanguard Trials',
          description: 'Complete 3 verified workout sessions during the season.',
          metric: 'workouts',
          targetCount: 3,
          seasonalXpReward: 260,
        },
        {
          id: 'sc_weekly_habits',
          cadence: 'weekly',
          title: 'Oathkeeper Rhythm',
          description: 'Record 5 verified habit completions.',
          metric: 'habit_completions',
          targetCount: 5,
          seasonalXpReward: 220,
        },
        {
          id: 'sc_weekly_study',
          cadence: 'weekly',
          title: 'Scholarly Illumination',
          description: 'Complete 3 verified study or deep-focus sessions.',
          metric: 'study_sessions',
          targetCount: 3,
          seasonalXpReward: 210,
        },
        {
          id: 'sc_season_boss',
          cadence: 'season',
          title: 'Titan Frontline',
          description: 'Land 4 verified strikes in Weekly Boss Battles.',
          metric: 'boss_hits',
          targetCount: 4,
          seasonalXpReward: 420,
        },
        {
          id: 'sc_season_community',
          cadence: 'season',
          title: 'Heartlands Fellowship',
          description: 'Contribute 120 verified points to Community Events.',
          metric: 'community_points',
          targetCount: 120,
          seasonalXpReward: 400,
        },
        {
          id: 'sc_season_dedicated',
          cadence: 'season',
          title: 'Seasonal Chronicle',
          description: 'Complete 15 verified real-life activities across all pillars.',
          metric: 'verified_activities',
          targetCount: 15,
          seasonalXpReward: 650,
        },
      ],
      milestones: buildBattlePassTiers(1),
    },
  ];
};

