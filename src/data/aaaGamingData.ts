import type {
  CardCollectionAchievementDef,
  CardPackDef,
  CollectibleCardDef,
  CollectibleCardRarity,
  CoopFriendshipMissionDef,
  DailyCalendarDayState,
  EndorsementCategory,
  MarketplaceItemDef,
  RankedDivisionDef,
  RankedDivisionName,
} from '../types/game.ts';

// --- AAA 2: COLLECTIBLE CARDS & TRANSPARENT PACKS ---

export const DUPLICATE_CARD_FRAGMENT_RATES: Record<CollectibleCardRarity, number> = {
  Common: 15,
  Rare: 35,
  Epic: 80,
  Legendary: 180,
  Mythic: 350,
};

export const COLLECTIBLE_CARDS_CATALOG: CollectibleCardDef[] = [
  // Fitness Milestones (6)
  {
    id: 'card_fit_iron_vow',
    name: 'Oath of the Iron Rep',
    subtitle: 'Strength Milestone',
    rarity: 'Common',
    category: 'fitness_milestone',
    lore: 'Etched in basalt at the Citadel Training Grounds for those who never skip the first set.',
    motif: 'fist',
    primaryHex: '#21152F',
    secondaryHex: '#100D18',
    accentHex: '#A69AAF',
    flavorStatLabel: 'Resolve',
    flavorStatValue: '100 Verified Reps',
  },
  {
    id: 'card_fit_horizon_stride',
    name: 'Strider of Emerald Steps',
    subtitle: 'Cardio Endurance',
    rarity: 'Common',
    category: 'fitness_milestone',
    lore: 'Each steady mile maps another lantern along the Emerald Vale.',
    motif: 'wave',
    primaryHex: '#162922',
    secondaryHex: '#0D1714',
    accentHex: '#49B88A',
    flavorStatLabel: 'Stride',
    flavorStatValue: '25km Mapped',
  },
  {
    id: 'card_fit_aether_eye',
    name: 'Lens of True Form',
    subtitle: 'Precision Conditioning',
    rarity: 'Rare',
    category: 'fitness_milestone',
    lore: 'Clean posture and measured cadence turn simple movement into mastery.',
    motif: 'stride',
    primaryHex: '#241836',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Accuracy',
    flavorStatValue: 'Form Verified',
  },
  {
    id: 'card_fit_stillwater',
    name: 'Sanctuary of Still Breath',
    subtitle: 'Rest & Recovery',
    rarity: 'Rare',
    category: 'fitness_milestone',
    lore: 'True champions honor sleep, hydration, and active recovery days as sacred discipline.',
    motif: 'canopy',
    primaryHex: '#172821',
    secondaryHex: '#0D1512',
    accentHex: '#49B88A',
    flavorStatLabel: 'Vitality',
    flavorStatValue: 'Rest Honored',
  },
  {
    id: 'card_fit_ember_streak',
    name: 'Unbroken Thirty-Dawn Torch',
    subtitle: 'Consistency Pillar',
    rarity: 'Epic',
    category: 'fitness_milestone',
    lore: 'Lit at dawn and tended across thirty mornings without succumbing to doubt.',
    motif: 'flame',
    primaryHex: '#2A1B3D',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Flame',
    flavorStatValue: '30-Day Rhythm',
  },
  {
    id: 'card_fit_titan_heart',
    name: 'Heart of the Vanguard',
    subtitle: 'All-Round Mastery',
    rarity: 'Legendary',
    category: 'fitness_milestone',
    lore: 'Built by balancing power, mobility, intellect, and sustainable recovery.',
    motif: 'crown',
    primaryHex: '#2A1D24',
    secondaryHex: '#100D18',
    accentHex: '#D6A84B',
    flavorStatLabel: 'Balance',
    flavorStatValue: 'All 6 Virtues',
  },

  // Seasonal Themes (6)
  {
    id: 'card_sea_canopy_bud',
    name: 'Golden Canopy Sprout',
    subtitle: 'Season 1 Limited',
    rarity: 'Common',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'The first gilded leaf unfurling above the Sanctuary Citadel in Season 1.',
    motif: 'canopy',
    primaryHex: '#241C16',
    secondaryHex: '#100D18',
    accentHex: '#E8C777',
    flavorStatLabel: 'Season',
    flavorStatValue: 'Canopy I',
  },
  {
    id: 'card_sea_sunlit_bough',
    name: 'Bough of the Equinox',
    subtitle: 'Season 1 Limited',
    rarity: 'Rare',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'Warm solar veins pulse across Aetheria whenever realms unite in discipline.',
    motif: 'star',
    primaryHex: '#241836',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Tier',
    flavorStatValue: 'Season Pass',
  },
  {
    id: 'card_sea_aether_chalice',
    name: 'Chalice of Dawnlight',
    subtitle: 'Season 1 Limited',
    rarity: 'Epic',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'Filled only by verified actions across thirty days of fair seasonal endeavor.',
    motif: 'crown',
    primaryHex: '#2A1B3D',
    secondaryHex: '#100D18',
    accentHex: '#E8C777',
    flavorStatLabel: 'Radiance',
    flavorStatValue: 'Battle Pass T25',
  },
  {
    id: 'card_sea_dawnbreaker_crest',
    name: 'Sigil of the Dawnbreaker',
    subtitle: 'Season 1 Capstone',
    rarity: 'Legendary',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'Awarded to adventurers who saw Season 1 through to its golden zenith.',
    motif: 'crown',
    primaryHex: '#2F2316',
    secondaryHex: '#100D18',
    accentHex: '#D6A84B',
    flavorStatLabel: 'Pinnacle',
    flavorStatValue: 'Season Mastery',
  },
  {
    id: 'card_sea_astral_root',
    name: 'World-Tree Astral Root',
    subtitle: 'Season 1 Mythic',
    rarity: 'Mythic',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'A shimmering thread linking every realm companion beneath the Golden World Tree.',
    motif: 'canopy',
    primaryHex: '#321422',
    secondaryHex: '#100D18',
    accentHex: '#D65C66',
    flavorStatLabel: 'Harmony',
    flavorStatValue: 'Mythic Relic',
  },
  {
    id: 'card_sea_lunar_watch',
    name: 'Moonwell Vigil',
    subtitle: 'Seasonal Nightfall',
    rarity: 'Rare',
    category: 'seasonal_theme',
    seasonTag: 'Season 1',
    limitedEdition: true,
    lore: 'Quiet evening reflection before slumber resets tomorrow’s focus.',
    motif: 'star',
    primaryHex: '#21152F',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Cadence',
    flavorStatValue: 'Night Watch',
  },

  // Community Events (6)
  {
    id: 'card_evt_banner_call',
    name: 'Herald of the Citadel',
    subtitle: 'Community Chronicle',
    rarity: 'Common',
    category: 'community_event',
    lore: 'When the horn of the Citadel sounds, solo warriors become an unbroken fellowship.',
    motif: 'fist',
    primaryHex: '#21152F',
    secondaryHex: '#100D18',
    accentHex: '#A69AAF',
    flavorStatLabel: 'Fellowship',
    flavorStatValue: 'First Event',
  },
  {
    id: 'card_evt_obsidian_breach',
    name: 'Obsidian Gatebreaker',
    subtitle: 'Weekly Raid Boss',
    rarity: 'Rare',
    category: 'community_event',
    lore: 'Chipped from the armor of Malakor through collective verified realm strikes.',
    motif: 'titan',
    primaryHex: '#2D1523',
    secondaryHex: '#100D18',
    accentHex: '#D65C66',
    flavorStatLabel: 'Siege',
    flavorStatValue: 'Raid Vanguard',
  },
  {
    id: 'card_evt_golden_festival',
    name: 'Lanterns of the Canopy',
    subtitle: 'Festival Milestone',
    rarity: 'Epic',
    category: 'community_event',
    lore: 'Thousands of small healthy choices lit together across Aetheria’s skies.',
    motif: 'flame',
    primaryHex: '#2E2214',
    secondaryHex: '#100D18',
    accentHex: '#D6A84B',
    flavorStatLabel: 'Festival',
    flavorStatValue: 'Realm Light',
  },
  {
    id: 'card_evt_territory_oath',
    name: 'Warden of the Spire',
    subtitle: 'Territory Campaign',
    rarity: 'Epic',
    category: 'community_event',
    lore: 'Earned beside guildmates defending shared beacons across Aetheria.',
    motif: 'crown',
    primaryHex: '#26183A',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Guild',
    flavorStatValue: 'Realm Defense',
  },
  {
    id: 'card_evt_world_voice',
    name: 'Decree of the Realm Council',
    subtitle: 'Community Decisions',
    rarity: 'Rare',
    category: 'community_event',
    lore: 'Every vote shapes the next season, raid boss, and festival horizon.',
    motif: 'star',
    primaryHex: '#21152F',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Council',
    flavorStatValue: 'Voice Heard',
  },
  {
    id: 'card_evt_titan_eclipse',
    name: 'Eclipse of Malakor',
    subtitle: 'Mythic Raid Honor',
    rarity: 'Mythic',
    category: 'community_event',
    lore: 'Commemorates the realm standing shoulder-to-shoulder against the Titan.',
    motif: 'titan',
    primaryHex: '#34131E',
    secondaryHex: '#100D18',
    accentHex: '#D65C66',
    flavorStatLabel: 'Raid',
    flavorStatValue: 'Titan Fall',
  },

  // Mythic Fictional Heroes (6)
  {
    id: 'card_hero_kael',
    name: 'Vanguard Kaelen',
    subtitle: 'Hero Chronicle',
    rarity: 'Rare',
    category: 'mythic_hero',
    lore: 'A fallen knight who rebuilt strength one disciplined morning at a time.',
    motif: 'fist',
    primaryHex: '#241836',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Strength & Honor',
  },
  {
    id: 'card_hero_lyra',
    name: 'Arcanist Lyra',
    subtitle: 'Hero Chronicle',
    rarity: 'Epic',
    category: 'mythic_hero',
    lore: 'Keeper of focus and deep study—turning curiosity into enduring clarity.',
    motif: 'star',
    primaryHex: '#2A1B3D',
    secondaryHex: '#100D18',
    accentHex: '#9A72CC',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Pure Focus',
  },
  {
    id: 'card_hero_theron',
    name: 'Strider Theron',
    subtitle: 'Hero Chronicle',
    rarity: 'Epic',
    category: 'mythic_hero',
    lore: 'Outpaces storms with calm breathing, long endurance, and patient cadence.',
    motif: 'wave',
    primaryHex: '#152822',
    secondaryHex: '#0D1412',
    accentHex: '#49B88A',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Limitless Pace',
  },
  {
    id: 'card_hero_soren',
    name: 'Bastion Soren',
    subtitle: 'Hero Chronicle',
    rarity: 'Legendary',
    category: 'mythic_hero',
    lore: 'Taught the Citadel that resilience includes resting before posture breaks.',
    motif: 'stride',
    primaryHex: '#2C2112',
    secondaryHex: '#100D18',
    accentHex: '#E8C777',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Unbroken Resolve',
  },
  {
    id: 'card_hero_nyx',
    name: 'Shadowweaver Nyx',
    subtitle: 'Hero Chronicle',
    rarity: 'Legendary',
    category: 'mythic_hero',
    lore: 'Transforms late comebacks into triumphant momentum after every setback.',
    motif: 'flame',
    primaryHex: '#26183A',
    secondaryHex: '#100D18',
    accentHex: '#D6A84B',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Phoenix Comeback',
  },
  {
    id: 'card_hero_aetheria',
    name: 'Sovereign of the World Tree',
    subtitle: 'Mythic Exemplar',
    rarity: 'Mythic',
    category: 'mythic_hero',
    lore: 'An eternal emblem of lifelong balance, courage, and quiet mastery.',
    motif: 'crown',
    primaryHex: '#331424',
    secondaryHex: '#100D18',
    accentHex: '#D65C66',
    flavorStatLabel: 'Virtue',
    flavorStatValue: 'Eternal Sovereign',
  },
];

export const CARD_PACKS_CATALOG: CardPackDef[] = [
  {
    id: 'pack_starter_chronicle',
    name: 'Starter Chronicle Pack',
    description: 'Contains 3 collectible 2D fantasy cards across all core pillars. Duplicates automatically convert to Cosmetic Fragments.',
    cardCount: 3,
    priceGold: 120,
    priceFragments: 60,
    guaranteedMinRarity: 'Common',
    dropRates: { Common: 52, Rare: 30, Epic: 12, Legendary: 5, Mythic: 1 },
    accentHex: '#9A72CC',
  },
  {
    id: 'pack_seasonal_canopy',
    name: 'Seasonal Canopy Pack',
    description: 'Features 3 cards weighted toward Season 1 & Community Event chronicles with guaranteed Rare+ slot.',
    cardCount: 3,
    priceGold: 220,
    priceFragments: 110,
    guaranteedMinRarity: 'Rare',
    dropRates: { Common: 25, Rare: 42, Epic: 22, Legendary: 9, Mythic: 2 },
    accentHex: '#D6A84B',
    featuredCategory: 'seasonal_theme',
  },
  {
    id: 'pack_mythic_vanguard',
    name: 'Mythic Vanguard Pack',
    description: 'Contains 4 cards with elevated Epic, Legendary, and Mythic drop probabilities—earned strictly via in-game currencies.',
    cardCount: 4,
    priceGold: 380,
    priceFragments: 190,
    guaranteedMinRarity: 'Epic',
    dropRates: { Common: 10, Rare: 32, Epic: 35, Legendary: 17, Mythic: 6 },
    accentHex: '#D65C66',
    featuredCategory: 'mythic_hero',
  },
];

export const CARD_COLLECTION_ACHIEVEMENTS: CardCollectionAchievementDef[] = [
  {
    id: 'card_ach_5',
    title: 'Novice Chronicler',
    description: 'Collect 5 unique 2D fantasy cards in your personal binder.',
    requiredUniqueCards: 5,
    rewardGold: 80,
    rewardFragments: 40,
  },
  {
    id: 'card_ach_12',
    title: 'Archivist of Aetheria',
    description: 'Collect 12 unique cards across milestones, seasons, and heroes.',
    requiredUniqueCards: 12,
    rewardGold: 180,
    rewardFragments: 90,
    rewardTitleId: 'title_card_archivist',
  },
  {
    id: 'card_ach_20',
    title: 'Grand Deck Sovereign',
    description: 'Collect 20 unique cards and curate your profile showcase.',
    requiredUniqueCards: 20,
    rewardGold: 350,
    rewardFragments: 160,
  },
  {
    id: 'card_ach_mythic',
    title: 'Mythic Prism Bearer',
    description: 'Obtain at least 1 Mythic rarity collectible card.',
    requiredUniqueCards: 1,
    requiredRarity: 'Mythic',
    rewardGold: 250,
    rewardFragments: 120,
  },
];

// --- AAA 6: COSMETIC MARKETPLACE CATALOG (ZERO PAY-TO-WIN) ---

export const MARKETPLACE_ITEMS_CATALOG: MarketplaceItemDef[] = [
  {
    id: 'mkt_frame_obsidian_gold',
    category: 'frame',
    name: 'Obsidian Crown Frame',
    description: 'Matte obsidian trim inlaid with hand-hammered antique gold.',
    rarity: 'Epic',
    priceGold: 180,
    priceFragments: 90,
    realMoneyUsdDisplay: '$2.99 (Checkout Disabled)',
    linkedCosmeticId: 'frame_royal_aureole',
    featuredCollectionTag: 'Citadel Spotlight',
    primaryHex: '#21152F',
    accentHex: '#D6A84B',
  },
  {
    id: 'mkt_frame_astral_crest',
    category: 'frame',
    name: 'Astral Citadel Frame',
    description: 'Deep royal purple celestial bezel forged for arena & profile portraits.',
    rarity: 'Legendary',
    priceGold: 280,
    priceFragments: 140,
    realMoneyUsdDisplay: '$4.99 (Checkout Disabled)',
    linkedCosmeticId: 'frame_celestial_citadel',
    featuredCollectionTag: 'Astral Rotation',
    rotating: true,
    primaryHex: '#26183A',
    accentHex: '#9A72CC',
  },
  {
    id: 'mkt_banner_crimson_banneret',
    category: 'banner',
    name: 'Crimson Raid Tapestry',
    description: 'High-contrast crimson & gold profile banner celebrating boss raiders.',
    rarity: 'Epic',
    priceGold: 210,
    priceFragments: 105,
    realMoneyUsdDisplay: '$3.49 (Checkout Disabled)',
    linkedCosmeticId: 'banner_crimson_vanguard',
    featuredCollectionTag: 'Citadel Spotlight',
    primaryHex: '#331420',
    accentHex: '#D65C66',
  },
  {
    id: 'mkt_banner_starfall_vault',
    category: 'banner',
    name: 'Starfall Sanctum Banner',
    description: 'Nocturnal amethyst vista lit by falling astral embers.',
    rarity: 'Legendary',
    priceGold: 320,
    priceFragments: 160,
    realMoneyUsdDisplay: '$4.99 (Checkout Disabled)',
    linkedCosmeticId: 'banner_celestial_sanctum',
    featuredCollectionTag: 'Astral Rotation',
    rotating: true,
    primaryHex: '#26183A',
    accentHex: '#9A72CC',
  },
  {
    id: 'mkt_aura_solar_crest',
    category: 'aura',
    name: 'Solar Aureole Rays',
    description: 'Warm radiant 2D ring halo rotating gently behind your hero portrait.',
    rarity: 'Epic',
    priceGold: 240,
    priceFragments: 120,
    realMoneyUsdDisplay: '$3.99 (Checkout Disabled)',
    linkedCosmeticId: 'aura_solar_crest',
    featuredCollectionTag: 'Golden Canopy',
    primaryHex: '#2D2212',
    accentHex: '#E8C777',
  },
  {
    id: 'mkt_aura_aether_prism',
    category: 'aura',
    name: 'Prismatic Aether Halo',
    description: 'Mythic multi-layered royal-purple and antique-gold aura exclusively cosmetic.',
    rarity: 'Mythic',
    priceGold: 460,
    priceFragments: 230,
    realMoneyUsdDisplay: '$6.99 (Checkout Disabled)',
    linkedCosmeticId: 'aura_mythic_prism',
    featuredCollectionTag: 'Astral Rotation',
    rotating: true,
    primaryHex: '#26183A',
    accentHex: '#D6A84B',
  },
  {
    id: 'mkt_outfit_starlight_mantle',
    category: 'outfit',
    name: 'Starlight Sentinel Regalia',
    description: 'Ornamental ceremonial armor cloak worn across profiles and workout parties.',
    rarity: 'Legendary',
    priceGold: 340,
    priceFragments: 170,
    realMoneyUsdDisplay: '$5.49 (Checkout Disabled)',
    linkedCosmeticId: 'outfit_astral_warden',
    featuredCollectionTag: 'Citadel Spotlight',
    primaryHex: '#21152F',
    accentHex: '#9A72CC',
  },
  {
    id: 'mkt_outfit_emerald_warden',
    category: 'outfit',
    name: 'Sylvan Ranger Vestments',
    description: 'Forest-emerald cloak woven for endurance runners and canopy explorers.',
    rarity: 'Rare',
    priceGold: 150,
    priceFragments: 75,
    realMoneyUsdDisplay: '$2.49 (Checkout Disabled)',
    linkedCosmeticId: 'outfit_emerald_strider',
    featuredCollectionTag: 'Golden Canopy',
    primaryHex: '#152822',
    accentHex: '#49B88A',
  },
  {
    id: 'mkt_title_guild_herald',
    category: 'title',
    name: 'Title: Citadel Patron',
    description: 'Displays the distinguished "Citadel Patron" title beside your hero identity.',
    rarity: 'Rare',
    priceGold: 140,
    priceFragments: 70,
    realMoneyUsdDisplay: '$1.99 (Checkout Disabled)',
    linkedTitleId: 'title_citadel_patron',
    featuredCollectionTag: 'Citadel Spotlight',
    primaryHex: '#21152F',
    accentHex: '#D6A84B',
  },
  {
    id: 'mkt_title_astral_collector',
    category: 'title',
    name: 'Title: Astral Curator',
    description: 'Prestige cosmetic title unlocked via Cosmetic Fragments or earned Gold.',
    rarity: 'Epic',
    priceGold: 220,
    priceFragments: 110,
    realMoneyUsdDisplay: '$2.99 (Checkout Disabled)',
    linkedTitleId: 'title_astral_curator',
    featuredCollectionTag: 'Astral Rotation',
    rotating: true,
    primaryHex: '#26183A',
    accentHex: '#9A72CC',
  },
  {
    id: 'mkt_pack_starter',
    category: 'pack',
    name: 'Starter Chronicle Card Pack',
    description: 'Open 3 collectible fantasy cards immediately using earned Gold or Fragments.',
    rarity: 'Common',
    priceGold: 120,
    priceFragments: 60,
    realMoneyUsdDisplay: 'Earned Currency Only',
    linkedPackId: 'pack_starter_chronicle',
    featuredCollectionTag: 'Card Binder',
    primaryHex: '#21152F',
    accentHex: '#A69AAF',
  },
  {
    id: 'mkt_pack_mythic',
    category: 'pack',
    name: 'Mythic Vanguard Card Pack',
    description: 'Open 4 elevated-odds fantasy cards using earned Gold or Cosmetic Fragments.',
    rarity: 'Mythic',
    priceGold: 380,
    priceFragments: 190,
    realMoneyUsdDisplay: 'Earned Currency Only',
    linkedPackId: 'pack_mythic_vanguard',
    featuredCollectionTag: 'Card Binder',
    primaryHex: '#331424',
    accentHex: '#D65C66',
  },
];

// --- AAA 7: 7 CORE RANKED DIVISIONS ---

export const RANKED_DIVISIONS_CATALOG: RankedDivisionDef[] = [
  {
    division: 'Bronze',
    minRating: 0,
    maxRating: 1099,
    accentHex: '#B87A4B',
    rewardTitleId: 'title_div_bronze',
    rewardTitleName: 'Bronze Contender',
    rewardFrameId: 'frame_bronze_hearth',
  },
  {
    division: 'Silver',
    minRating: 1100,
    maxRating: 1299,
    accentHex: '#C7BFD3',
    rewardTitleId: 'title_div_silver',
    rewardTitleName: 'Silver Duelist',
    rewardFrameId: 'frame_bronze_hearth',
  },
  {
    division: 'Gold',
    minRating: 1300,
    maxRating: 1499,
    accentHex: '#D6A84B',
    rewardTitleId: 'title_div_gold',
    rewardTitleName: 'Gilded Challenger',
    rewardFrameId: 'frame_royal_aureole',
  },
  {
    division: 'Platinum',
    minRating: 1500,
    maxRating: 1699,
    accentHex: '#49B88A',
    rewardTitleId: 'title_div_platinum',
    rewardTitleName: 'Platinum Vanguard',
    rewardFrameId: 'frame_royal_aureole',
  },
  {
    division: 'Diamond',
    minRating: 1700,
    maxRating: 1899,
    accentHex: '#9A72CC',
    rewardTitleId: 'title_div_diamond',
    rewardTitleName: 'Diamond Tactician',
    rewardFrameId: 'frame_celestial_citadel',
  },
  {
    division: 'Master',
    minRating: 1900,
    maxRating: 2099,
    accentHex: '#D65C66',
    rewardTitleId: 'title_div_master',
    rewardTitleName: 'Master Gladiator',
    rewardFrameId: 'frame_celestial_citadel',
  },
  {
    division: 'Grandmaster',
    minRating: 2100,
    maxRating: null,
    accentHex: '#E8C777',
    rewardTitleId: 'title_div_grandmaster',
    rewardTitleName: 'Grandmaster of Aetheria',
    rewardFrameId: 'frame_obsidian_crown',
  },
];

export const PLACEMENT_MATCHES_REQUIRED = 5;
export const DEMOTION_SHIELD_MATCHES = 3;

export const computeRankedDivision = (rating: number): RankedDivisionName => {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1700) return 'Diamond';
  if (rating >= 1500) return 'Platinum';
  if (rating >= 1300) return 'Gold';
  if (rating >= 1100) return 'Silver';
  return 'Bronze';
};

// --- AAA 4: FRIENDSHIP LEVELS & COOP MISSIONS ---

export const FRIENDSHIP_LEVEL_THRESHOLDS: Array<{
  level: number;
  title: string;
  requiredXp: number;
  rewardLabel: string;
}> = [
  { level: 1, title: 'Acquaintances', requiredXp: 0, rewardLabel: 'Shared Activity Status' },
  { level: 2, title: 'Road Companions', requiredXp: 100, rewardLabel: 'Companion Crest Decoration' },
  { level: 3, title: 'Oath Allies', requiredXp: 260, rewardLabel: 'Title: Oathbound Ally' },
  { level: 4, title: 'Vanguard Partners', requiredXp: 480, rewardLabel: 'Twin Banner Emblem' },
  { level: 5, title: 'Citadel Kindred', requiredXp: 760, rewardLabel: 'Title: Kindred Vanguard' },
  { level: 6, title: 'Eternal Fellowship', requiredXp: 1120, rewardLabel: 'Golden Fellowship Frame Accent' },
];

export const COOP_FRIENDSHIP_MISSIONS: CoopFriendshipMissionDef[] = [
  {
    id: 'coop_party_first',
    title: 'First Joint Session',
    description: 'Complete 1 Workout Party session together with verified activity.',
    targetActivities: 1,
    friendshipXpReward: 75,
    badgeLabel: 'Party Spark',
  },
  {
    id: 'coop_three_missions',
    title: 'Three-Dawn Pact',
    description: 'Complete 3 verified shared workouts, Rivals friendly duels, or milestone cheers.',
    targetActivities: 3,
    friendshipXpReward: 140,
    badgeLabel: 'Triple Pact',
  },
  {
    id: 'coop_ten_bond',
    title: 'Unbroken Fellowship',
    description: 'Reach 10 verified cooperative interactions across parties and milestones.',
    targetActivities: 10,
    friendshipXpReward: 260,
    badgeLabel: 'Citadel Kindred',
  },
];

// --- AAA 10: PEER ENDORSEMENT CATEGORIES ---

export const ENDORSEMENT_CATEGORIES_META: Record<
  EndorsementCategory,
  { label: string; description: string; accentHex: string }
> = {
  helpfulness: {
    label: 'Helpfulness',
    description: 'Encouraged others or shared constructive wisdom.',
    accentHex: '#9A72CC',
  },
  sportsmanship: {
    label: 'Sportsmanship',
    description: 'Competed with fairness, grace, and respect in Rivals & Raids.',
    accentHex: '#D6A84B',
  },
  consistency: {
    label: 'Consistency',
    description: 'Inspiring steady dedication to balanced daily habits.',
    accentHex: '#49B88A',
  },
  encouragement: {
    label: 'Encouragement',
    description: 'Lifted teammates in Workout Parties and realm fellowship.',
    accentHex: '#E8C777',
  },
};

export const ENDORSEMENT_MILESTONES: Array<{ id: string; requiredTotal: number; title: string }> = [
  { id: 'end_ms_3', requiredTotal: 3, title: 'Respected Companion' },
  { id: 'end_ms_10', requiredTotal: 10, title: 'Beacon of Sportsmanship' },
  { id: 'end_ms_25', requiredTotal: 25, title: 'Champion of Goodwill' },
];

// --- AAA 11: ADDITIVE PRESTIGE TIERS & CHALLENGES ---

export const PRESTIGE_MIN_HERO_LEVEL = 10; // Accessible progression threshold (plus higher-level prestige tiers I..X)
export const PRESTIGE_TIERS_CATALOG: Array<{
  tier: number;
  roman: string;
  requiredLevel: number;
  title: string;
  rewardLabel: string;
  rewardCosmeticId?: string;
  rewardTitleId?: string;
}> = [
  {
    tier: 1,
    roman: 'I',
    requiredLevel: 10,
    title: 'Awakened Paragon',
    rewardLabel: 'Prestige I Crest + Title: Awakened Paragon',
    rewardTitleId: 'title_prestige_1',
    rewardCosmeticId: 'aura_solar_crest',
  },
  {
    tier: 2,
    roman: 'II',
    requiredLevel: 18,
    title: 'Citadel Ascendant',
    rewardLabel: 'Prestige II Banner Trim + Title: Citadel Ascendant',
    rewardTitleId: 'title_prestige_2',
    rewardCosmeticId: 'frame_royal_aureole',
  },
  {
    tier: 3,
    roman: 'III',
    requiredLevel: 25,
    title: 'Astral Exemplar',
    rewardLabel: 'Prestige III Halo + Title: Astral Exemplar',
    rewardTitleId: 'title_prestige_3',
    rewardCosmeticId: 'aura_mythic_prism',
  },
  {
    tier: 4,
    roman: 'IV',
    requiredLevel: 35,
    title: 'Eternal Warden',
    rewardLabel: 'Prestige IV Regalia + Title: Eternal Warden',
    rewardTitleId: 'title_prestige_4',
    rewardCosmeticId: 'banner_celestial_sanctum',
  },
  {
    tier: 5,
    roman: 'V',
    requiredLevel: 50,
    title: 'Sovereign of Aetheria',
    rewardLabel: 'Prestige V Crown + Title: Sovereign of Aetheria',
    rewardTitleId: 'title_prestige_5',
    rewardCosmeticId: 'frame_obsidian_crown',
  },
];

export const PRESTIGE_CHALLENGES_CATALOG: Array<{
  id: string;
  title: string;
  description: string;
  minPrestigeTier: number;
  rewardFragments: number;
  rewardGold: number;
}> = [
  {
    id: 'pch_steady_week',
    title: 'Paragon Rhythm',
    description: 'Complete 5 verified activities after unlocking Prestige I.',
    minPrestigeTier: 1,
    rewardFragments: 80,
    rewardGold: 150,
  },
  {
    id: 'pch_community_mentor',
    title: 'Fellowship Pillar',
    description: 'Support 2 community goals or workout parties while Prestiged.',
    minPrestigeTier: 1,
    rewardFragments: 100,
    rewardGold: 200,
  },
];

// --- AAA 12: FLEXIBLE 30-DAY REWARD CALENDAR ---

export const DAILY_CALENDAR_REWARDS: Array<{
  dayNumber: number;
  rewardType: DailyCalendarDayState['rewardType'];
  rewardLabel: string;
  amount: number;
  isWeeklyMilestone: boolean;
}> = Array.from({ length: 30 }, (_, idx) => {
  const day = idx + 1;
  const isWeeklyMilestone = day === 7 || day === 14 || day === 21 || day === 28 || day === 30;
  if (day === 30) {
    return {
      dayNumber: day,
      rewardType: 'card_pack',
      rewardLabel: 'Mythic Vanguard Card Pack',
      amount: 1,
      isWeeklyMilestone: true,
    };
  }
  if (day === 7 || day === 14 || day === 21 || day === 28) {
    const fragAmt = 40 + day;
    return {
      dayNumber: day,
      rewardType: day === 14 ? 'card_pack' : 'fragments',
      rewardLabel: day === 14 ? 'Seasonal Canopy Card Pack' : `${fragAmt} Cosmetic Fragments`,
      amount: day === 14 ? 1 : fragAmt,
      isWeeklyMilestone: true,
    };
  }
  if (day % 5 === 0) {
    return {
      dayNumber: day,
      rewardType: 'card',
      rewardLabel: 'Collectible Fantasy Card',
      amount: 1,
      isWeeklyMilestone: false,
    };
  }
  if (day % 3 === 0) {
    const fragAmt = 15 + (day % 4) * 5;
    return {
      dayNumber: day,
      rewardType: 'fragments',
      rewardLabel: `${fragAmt} Cosmetic Fragments`,
      amount: fragAmt,
      isWeeklyMilestone: false,
    };
  }
  if (day % 2 === 0) {
    const goldAmt = 20 + day;
    return {
      dayNumber: day,
      rewardType: 'gold',
      rewardLabel: `${goldAmt} Gold`,
      amount: goldAmt,
      isWeeklyMilestone: false,
    };
  }
  const bonusAmt = 15 + Math.round(day * 0.5);
  return {
    dayNumber: day,
    rewardType: 'quest_bonus',
    rewardLabel: `+${bonusAmt} Bonus Gold & Momentum`,
    amount: bonusAmt,
    isWeeklyMilestone: false,
  };
});

export const DAILY_CALENDAR_WEEKLY_MILESTONES: Array<{
  id: string;
  dayTarget: number;
  title: string;
  rewardLabel: string;
  rewardGold: number;
  rewardFragments: number;
}> = [
  {
    id: 'dc_week_1',
    dayTarget: 7,
    title: '7-Day Horizon Milestone',
    rewardLabel: '+60 Gold & +35 Cosmetic Fragments',
    rewardGold: 60,
    rewardFragments: 35,
  },
  {
    id: 'dc_week_2',
    dayTarget: 14,
    title: '14-Day Canopy Milestone',
    rewardLabel: '+90 Gold & +55 Cosmetic Fragments',
    rewardGold: 90,
    rewardFragments: 55,
  },
  {
    id: 'dc_week_3',
    dayTarget: 21,
    title: '21-Day Citadel Milestone',
    rewardLabel: '+120 Gold & +75 Cosmetic Fragments',
    rewardGold: 120,
    rewardFragments: 75,
  },
  {
    id: 'dc_week_4',
    dayTarget: 28,
    title: '28-Day Sovereign Milestone',
    rewardLabel: '+180 Gold & +110 Cosmetic Fragments',
    rewardGold: 180,
    rewardFragments: 110,
  },
];

// --- AAA 8: COLLECTION COMPLETION MILESTONES ---

export const COLLECTION_COMPLETION_MILESTONES: Array<{
  thresholdPercent: 25 | 50 | 75 | 100;
  id: string;
  title: string;
  rewardLabel: string;
  rewardTitleId: string;
  rewardCosmeticId?: string;
  rewardFragments: number;
}> = [
  {
    thresholdPercent: 25,
    id: 'col_ms_25',
    title: 'Quarter-Vault Collector',
    rewardLabel: 'Title: Vault Seeker + 60 Cosmetic Fragments',
    rewardTitleId: 'title_vault_seeker',
    rewardFragments: 60,
  },
  {
    thresholdPercent: 50,
    id: 'col_ms_50',
    title: 'Half-Realm Archivist',
    rewardLabel: 'Astral Citadel Frame + 120 Cosmetic Fragments',
    rewardTitleId: 'title_astral_curator',
    rewardCosmeticId: 'frame_celestial_citadel',
    rewardFragments: 120,
  },
  {
    thresholdPercent: 75,
    id: 'col_ms_75',
    title: 'Grand Treasury Keeper',
    rewardLabel: 'Prismatic Aether Halo + 220 Cosmetic Fragments',
    rewardTitleId: 'title_grand_curator',
    rewardCosmeticId: 'aura_mythic_prism',
    rewardFragments: 220,
  },
  {
    thresholdPercent: 100,
    id: 'col_ms_100',
    title: 'Omnibus of Aetheria',
    rewardLabel: 'Title: Eternal Collector + 400 Cosmetic Fragments',
    rewardTitleId: 'title_eternal_collector',
    rewardCosmeticId: 'frame_obsidian_crown',
    rewardFragments: 400,
  },
];
