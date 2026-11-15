import {
  GlobalAchievementCategory,
  GlobalAchievementRarity,
  GlobalExclusiveAchievement,
  GlobalRequirementType,
  GlobalTitleStyle,
} from '../types/game';

export const GLOBAL_LEGEND_CATEGORIES: Array<{
  id: GlobalAchievementCategory;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'legendary_discipline',
    label: 'Legendary Discipline',
    subtitle: 'Iron will, daily ritual mastery, and unyielding self-control.',
  },
  {
    id: 'master_of_knowledge',
    label: 'Master of Knowledge',
    subtitle: 'Intellectual quests, tactical insight, and mindful study.',
  },
  {
    id: 'physical_excellence',
    label: 'Physical Excellence',
    subtitle: 'Athletic endurance, Aether Vision reps, and training mastery.',
  },
  {
    id: 'unbreakable_consistency',
    label: 'Unbreakable Consistency',
    subtitle: 'Streaks, daily nourishment, hydration, and relentless return.',
  },
  {
    id: 'exploration_and_discovery',
    label: 'Exploration & Discovery',
    subtitle: 'Campaign realms, blacksmith relics, and hidden lore.',
  },
  {
    id: 'social_legends',
    label: 'Social Legends',
    subtitle: 'Fellowships, guild command, and inspiring companions.',
  },
  {
    id: 'ultimate_challenges',
    label: 'Ultimate Challenges',
    subtitle: 'Sovereign boss conquests, Ascension, and pinnacle prestige.',
  },
  {
    id: 'special_hidden_achievements',
    label: 'Special Hidden',
    subtitle: 'Secret worldwide feats revealed only when discovered or claimed.',
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
    badgeBg: 'bg-gradient-to-r from-[#2e2008] via-[#46300a] to-[#2e2008]',
    badgeBorder: 'border-amber-400/75',
    badgeText: 'text-amber-300',
    glowShadow: 'shadow-[0_0_16px_rgba(245,158,11,0.28)]',
    accentHex: '#F59E0B',
  },
  celestial: {
    badgeBg: 'bg-gradient-to-r from-[#091c34] via-[#0f345d] to-[#091c34]',
    badgeBorder: 'border-sky-300/75',
    badgeText: 'text-sky-200',
    glowShadow: 'shadow-[0_0_16px_rgba(56,189,248,0.28)]',
    accentHex: '#38BDF8',
  },
  crimson: {
    badgeBg: 'bg-gradient-to-r from-[#2c0914] via-[#511124] to-[#2c0914]',
    badgeBorder: 'border-rose-400/75',
    badgeText: 'text-rose-200',
    glowShadow: 'shadow-[0_0_16px_rgba(244,63,94,0.28)]',
    accentHex: '#FB7185',
  },
  emerald: {
    badgeBg: 'bg-gradient-to-r from-[#07261c] via-[#0d4834] to-[#07261c]',
    badgeBorder: 'border-emerald-400/75',
    badgeText: 'text-emerald-200',
    glowShadow: 'shadow-[0_0_16px_rgba(16,185,129,0.28)]',
    accentHex: '#34D399',
  },
  arcane: {
    badgeBg: 'bg-gradient-to-r from-[#1d0d36] via-[#371667] to-[#1d0d36]',
    badgeBorder: 'border-purple-400/75',
    badgeText: 'text-purple-200',
    glowShadow: 'shadow-[0_0_16px_rgba(168,85,247,0.3)]',
    accentHex: '#C084FC',
  },
  prismatic: {
    badgeBg: 'bg-gradient-to-r from-[#29123c] via-[#122e4f] to-[#3a250b]',
    badgeBorder: 'border-amber-300/85',
    badgeText: 'text-amber-100',
    glowShadow: 'shadow-[0_0_20px_rgba(251,191,36,0.35)]',
    accentHex: '#FDE68A',
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
  Legendary: {
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/45',
    cardGlow: 'shadow-amber-950/30',
  },
  Mythic: {
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/45',
    cardGlow: 'shadow-purple-950/35',
  },
  Ascendant: {
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/45',
    cardGlow: 'shadow-sky-950/35',
  },
  Celestial: {
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/45',
    cardGlow: 'shadow-emerald-950/35',
  },
  Eternal: {
    textClass: 'text-rose-200',
    borderClass: 'border-amber-300/65',
    cardGlow: 'shadow-amber-900/40',
  },
};

export const GLOBAL_EXCLUSIVE_ACHIEVEMENTS: GlobalExclusiveAchievement[] = [
  // =========================================================================
  // 1. LEGENDARY DISCIPLINE (7)
  // =========================================================================
  {
    id: 'gl-disc-01',
    name: 'Oathkeeper of Dawn',
    story: 'First across the realm to forge steel out of pure morning discipline and honor.',
    category: 'legendary_discipline',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'OATHKEEPER OF DAWN',
    titleStyle: 'gold',
    emblemIcon: 'ShieldCheck',
    requirementSummary: 'Complete the "Reclaim Your Honor" trial and conquer 5 Discipline AI quests',
    requirementType: 'dynamic_discipline_claimed',
    threshold: 5,
    rewardPlayerXp: 350,
    rewardForgeXp: 250,
    rewardGold: 400,
  },
  {
    id: 'gl-disc-02',
    name: 'The Unyielding Vow',
    story: 'While lesser knights broke when fatigue spoke, only one stood firm through twenty-five habits.',
    category: 'legendary_discipline',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'THE UNYIELDING',
    titleStyle: 'gold',
    emblemIcon: 'Flame',
    requirementSummary: 'Record 25 completed habit logs across your journey',
    requirementType: 'habits_claimed_total',
    threshold: 25,
    rewardPlayerXp: 400,
    rewardForgeXp: 250,
    rewardGold: 450,
  },
  {
    id: 'gl-disc-03',
    name: 'Architect of Order',
    story: 'Carved structure out of chaos, finishing twenty AI-forged daily quests with honor.',
    category: 'legendary_discipline',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'ARCHITECT OF ORDER',
    titleStyle: 'arcane',
    emblemIcon: 'Compass',
    requirementSummary: 'Claim 20 AI Dynamic Daily Quests',
    requirementType: 'dynamic_quests_claimed_total',
    threshold: 20,
    rewardPlayerXp: 550,
    rewardForgeXp: 380,
    rewardGold: 650,
  },
  {
    id: 'gl-disc-04',
    name: 'Sovereign of Routine',
    story: 'No distraction could pierce the armor of a hundred daily vows kept in sequence.',
    category: 'legendary_discipline',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'ROUTINE SOVEREIGN',
    titleStyle: 'celestial',
    emblemIcon: 'Crown',
    requirementSummary: 'Record 100 completed habit logs',
    requirementType: 'habits_claimed_total',
    threshold: 100,
    rewardPlayerXp: 900,
    rewardForgeXp: 650,
    rewardGold: 1200,
  },
  {
    id: 'gl-disc-05',
    name: 'Sentinel of Procrastination Slain',
    story: 'Struck down hesitation at its root by conquering fifteen Discipline quests.',
    category: 'legendary_discipline',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'IRON WILL SENTINEL',
    titleStyle: 'crimson',
    emblemIcon: 'Swords',
    requirementSummary: 'Claim 15 Discipline category AI quests',
    requirementType: 'dynamic_discipline_claimed',
    threshold: 15,
    rewardPlayerXp: 600,
    rewardForgeXp: 420,
    rewardGold: 750,
  },
  {
    id: 'gl-disc-06',
    name: 'Tempered Temperance',
    story: 'Mastered personal growth through deliberate reflection and thirty completed quests.',
    category: 'legendary_discipline',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'TEMPERED PARAGON',
    titleStyle: 'emerald',
    emblemIcon: 'Gem',
    requirementSummary: 'Claim 30 quests across classic and dynamic quest boards',
    requirementType: 'quests_claimed_total',
    threshold: 30,
    rewardPlayerXp: 850,
    rewardForgeXp: 600,
    rewardGold: 1000,
  },
  {
    id: 'gl-disc-07',
    name: 'The First Ascendant',
    story: 'First mortal in Aetheria whose sheer accumulation of disciplined deeds shook the Vault.',
    category: 'legendary_discipline',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'THE FIRST ASCENDANT',
    titleStyle: 'prismatic',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Amass 15,000 total Player XP across the realm',
    requirementType: 'total_xp',
    threshold: 15000,
    rewardPlayerXp: 1500,
    rewardForgeXp: 1000,
    rewardGold: 2500,
  },

  // =========================================================================
  // 2. MASTER OF KNOWLEDGE (6)
  // =========================================================================
  {
    id: 'gl-know-01',
    name: 'Scribe of the Astral Archive',
    story: 'Inscribed the first verified reflections of real study into the living chronicle.',
    category: 'master_of_knowledge',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'ASTRAL SCRIBE',
    titleStyle: 'celestial',
    emblemIcon: 'BookOpen',
    requirementSummary: 'Complete 5 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 5,
    rewardPlayerXp: 350,
    rewardForgeXp: 240,
    rewardGold: 400,
  },
  {
    id: 'gl-know-02',
    name: 'Grand Scholar of Aetheria',
    story: 'Turned quiet hours of reading and problem-solving into unmatched arcane intellect.',
    category: 'master_of_knowledge',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'GRAND SCHOLAR',
    titleStyle: 'arcane',
    emblemIcon: 'GraduationCap',
    requirementSummary: 'Complete 15 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 15,
    rewardPlayerXp: 650,
    rewardForgeXp: 450,
    rewardGold: 800,
  },
  {
    id: 'gl-know-03',
    name: 'Oracle of Self-Mastery',
    story: 'Studied their own Daily Quest Reports relentlessly to refine tomorrow before dawn.',
    category: 'master_of_knowledge',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'SELF ORACLE',
    titleStyle: 'celestial',
    emblemIcon: 'ScrollText',
    requirementSummary: 'Generate and review 7 Daily Quest Reports',
    requirementType: 'daily_reports_generated',
    threshold: 7,
    rewardPlayerXp: 400,
    rewardForgeXp: 280,
    rewardGold: 450,
  },
  {
    id: 'gl-know-04',
    name: 'Sage of Growth',
    story: 'Wove skillcraft and confidence into fifteen Personal Growth victories.',
    category: 'master_of_knowledge',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'SAGE OF GROWTH',
    titleStyle: 'emerald',
    emblemIcon: 'Lightbulb',
    requirementSummary: 'Complete 15 Personal Growth category AI quests',
    requirementType: 'dynamic_personal_growth_claimed',
    threshold: 15,
    rewardPlayerXp: 680,
    rewardForgeXp: 480,
    rewardGold: 850,
  },
  {
    id: 'gl-know-05',
    name: 'Luminary of the High Spire',
    story: 'Completed thirty Intellectual trials; even the High Mages seek their counsel.',
    category: 'master_of_knowledge',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'HIGH SPIRE LUMINARY',
    titleStyle: 'celestial',
    emblemIcon: 'Eye',
    requirementSummary: 'Complete 30 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 30,
    rewardPlayerXp: 1100,
    rewardForgeXp: 750,
    rewardGold: 1500,
  },
  {
    id: 'gl-know-06',
    name: 'Keeper of All Scrolls',
    story: 'Mastered twenty-five Daily Quest Reports, missing neither strength nor shadow.',
    category: 'master_of_knowledge',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'KEEPER OF SCROLLS',
    titleStyle: 'prismatic',
    emblemIcon: 'Library',
    requirementSummary: 'Generate and review 25 Daily Quest Reports',
    requirementType: 'daily_reports_generated',
    threshold: 25,
    rewardPlayerXp: 1200,
    rewardForgeXp: 850,
    rewardGold: 1800,
  },

  // =========================================================================
  // 3. PHYSICAL EXCELLENCE (7)
  // =========================================================================
  {
    id: 'gl-phys-01',
    name: 'Vanguard of Iron',
    story: 'The first champion whose sweat forged fifteen verified training sessions.',
    category: 'physical_excellence',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'VANGUARD OF IRON',
    titleStyle: 'crimson',
    emblemIcon: 'Dumbbell',
    requirementSummary: 'Complete 15 fitness workout sessions',
    requirementType: 'total_workouts',
    threshold: 15,
    rewardPlayerXp: 420,
    rewardForgeXp: 320,
    rewardGold: 480,
  },
  {
    id: 'gl-phys-02',
    name: 'Titan of a Thousand Reps',
    story: 'Each repetition witnessed by Aether Vision echoed like thunder in the citadel.',
    category: 'physical_excellence',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'TITAN OF IRON',
    titleStyle: 'crimson',
    emblemIcon: 'Zap',
    requirementSummary: 'Accumulate 1,000 Aether Vision verified repetitions',
    requirementType: 'total_verified_reps',
    threshold: 1000,
    rewardPlayerXp: 700,
    rewardForgeXp: 550,
    rewardGold: 900,
  },
  {
    id: 'gl-phys-03',
    name: 'Avatar of Motion',
    story: 'Conquered twenty-five Physical AI quests across running, strength, and endurance.',
    category: 'physical_excellence',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'AVATAR OF MOTION',
    titleStyle: 'gold',
    emblemIcon: 'Activity',
    requirementSummary: 'Complete 25 Physical category AI quests',
    requirementType: 'dynamic_physical_claimed',
    threshold: 25,
    rewardPlayerXp: 850,
    rewardForgeXp: 600,
    rewardGold: 1100,
  },
  {
    id: 'gl-phys-04',
    name: 'Colossus of Endurance',
    story: 'Fifty full training sessions etched into steel, proving strength is built daily.',
    category: 'physical_excellence',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'COLOSSUS',
    titleStyle: 'crimson',
    emblemIcon: 'Shield',
    requirementSummary: 'Complete 50 fitness workout sessions',
    requirementType: 'total_workouts',
    threshold: 50,
    rewardPlayerXp: 1050,
    rewardForgeXp: 800,
    rewardGold: 1400,
  },
  {
    id: 'gl-phys-05',
    name: 'Five-Thousandfold Strike',
    story: 'Five thousand verified repetitions performed without shortcuts or illusion.',
    category: 'physical_excellence',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'APEX ATHLETE',
    titleStyle: 'prismatic',
    emblemIcon: 'Trophy',
    requirementSummary: 'Accumulate 5,000 Aether Vision verified repetitions',
    requirementType: 'total_verified_reps',
    threshold: 5000,
    rewardPlayerXp: 1600,
    rewardForgeXp: 1200,
    rewardGold: 2600,
  },
  {
    id: 'gl-phys-06',
    name: 'Swift Strider of the Realm',
    story: 'First runner to conquer ten Physical AI quests under the Sunlit Bastion.',
    category: 'physical_excellence',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'SWIFT STRIDER',
    titleStyle: 'emerald',
    emblemIcon: 'Wind',
    requirementSummary: 'Complete 10 Physical category AI quests',
    requirementType: 'dynamic_physical_claimed',
    threshold: 10,
    rewardPlayerXp: 450,
    rewardForgeXp: 300,
    rewardGold: 500,
  },
  {
    id: 'gl-phys-07',
    name: 'Aether Body Ascendant',
    story: 'Gathered 1,500 Aether Points through pure physical mastery and vitality.',
    category: 'physical_excellence',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'AETHER VESSEL',
    titleStyle: 'celestial',
    emblemIcon: 'Sun',
    requirementSummary: 'Earn 1,500 Aether Points',
    requirementType: 'aether_points',
    threshold: 1500,
    rewardPlayerXp: 750,
    rewardForgeXp: 550,
    rewardGold: 950,
  },

  // =========================================================================
  // 4. UNBREAKABLE CONSISTENCY (7)
  // =========================================================================
  {
    id: 'gl-cons-01',
    name: 'Keeper of the Seven-Day Flame',
    story: 'Held a blazing 7-day habit streak before any rival across the realm.',
    category: 'unbreakable_consistency',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'FLAMEKEEPER',
    titleStyle: 'gold',
    emblemIcon: 'Flame',
    requirementSummary: 'Reach a 7-day habit streak',
    requirementType: 'current_streak',
    threshold: 7,
    rewardPlayerXp: 380,
    rewardForgeXp: 260,
    rewardGold: 420,
  },
  {
    id: 'gl-cons-02',
    name: 'Moon-Cycle Warden',
    story: 'Twenty-one unbroken dawns; discipline ceased to be effort and became nature.',
    category: 'unbreakable_consistency',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'TWENTY-ONE DAWNS',
    titleStyle: 'celestial',
    emblemIcon: 'Moon',
    requirementSummary: 'Reach a 21-day habit streak',
    requirementType: 'current_streak',
    threshold: 21,
    rewardPlayerXp: 800,
    rewardForgeXp: 550,
    rewardGold: 1000,
  },
  {
    id: 'gl-cons-03',
    name: 'Immortal Sunbeam',
    story: 'Sixty consecutive days of showing up—an unbroken legend etched into time itself.',
    category: 'unbreakable_consistency',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'UNBROKEN',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach a 60-day habit streak',
    requirementType: 'current_streak',
    threshold: 60,
    rewardPlayerXp: 2000,
    rewardForgeXp: 1400,
    rewardGold: 3000,
  },
  {
    id: 'gl-cons-04',
    name: 'Steward of Living Springs',
    story: 'Honored the body with 8 full glasses of hydration in one resolute day.',
    category: 'unbreakable_consistency',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'SPRING STEWARD',
    titleStyle: 'celestial',
    emblemIcon: 'Droplets',
    requirementSummary: 'Reach 8 glasses in daily hydration tracking',
    requirementType: 'water_glasses_current',
    threshold: 8,
    rewardPlayerXp: 280,
    rewardForgeXp: 200,
    rewardGold: 320,
  },
  {
    id: 'gl-cons-05',
    name: 'Alchemist of Wholesome Table',
    story: 'Recorded twenty balanced meals, honoring recovery and nourishment as sacred craft.',
    category: 'unbreakable_consistency',
    rarity: 'Mythic',
    difficulty: 'Hard',
    titleTag: 'HARVEST KEEPER',
    titleStyle: 'emerald',
    emblemIcon: 'Apple',
    requirementSummary: 'Log 20 balanced meals in Nutrition',
    requirementType: 'meals_logged_total',
    threshold: 20,
    rewardPlayerXp: 500,
    rewardForgeXp: 350,
    rewardGold: 600,
  },
  {
    id: 'gl-cons-06',
    name: 'Fifty-Meal Connoisseur',
    story: 'Fifty mindful meals logged with honesty, nourishing an unstoppable campaign.',
    category: 'unbreakable_consistency',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'VITALITY MASTER',
    titleStyle: 'emerald',
    emblemIcon: 'Heart',
    requirementSummary: 'Log 50 balanced meals in Nutrition',
    requirementType: 'meals_logged_total',
    threshold: 50,
    rewardPlayerXp: 900,
    rewardForgeXp: 650,
    rewardGold: 1200,
  },
  {
    id: 'gl-cons-07',
    name: 'Centurion of Quests',
    story: 'Claimed fifty AI-crafted daily quests without yielding a single season.',
    category: 'unbreakable_consistency',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'QUEST CENTURION',
    titleStyle: 'gold',
    emblemIcon: 'Award',
    requirementSummary: 'Claim 50 AI Dynamic Daily Quests',
    requirementType: 'dynamic_quests_claimed_total',
    threshold: 50,
    rewardPlayerXp: 1300,
    rewardForgeXp: 900,
    rewardGold: 1800,
  },

  // =========================================================================
  // 5. EXPLORATION & DISCOVERY (6)
  // =========================================================================
  {
    id: 'gl-expl-01',
    name: 'Chronicler of the First Ruin',
    story: 'Unlocked five chapters of the Storyline Campaign to rebuild Aetheria from the ash.',
    category: 'exploration_and_discovery',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'REALM CHRONICLER',
    titleStyle: 'gold',
    emblemIcon: 'Map',
    requirementSummary: 'Claim 5 Storyline Campaign chapters',
    requirementType: 'story_chapters_claimed',
    threshold: 5,
    rewardPlayerXp: 480,
    rewardForgeXp: 320,
    rewardGold: 550,
  },
  {
    id: 'gl-expl-02',
    name: 'Restorer of Aetheria',
    story: 'Completed the full seven-chapter Campaign of the Fallen Kingdom first in the world.',
    category: 'exploration_and_discovery',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'REALM RESTORER',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Complete all 7 Storyline Campaign chapters',
    requirementType: 'story_chapters_claimed',
    threshold: 7,
    rewardPlayerXp: 1250,
    rewardForgeXp: 900,
    rewardGold: 1800,
  },
  {
    id: 'gl-expl-03',
    name: 'Collector of Relics',
    story: 'Gathered eight distinct armaments into a gleaming personal vault.',
    category: 'exploration_and_discovery',
    rarity: 'Mythic',
    difficulty: 'Hard',
    titleTag: 'RELIC COLLECTOR',
    titleStyle: 'arcane',
    emblemIcon: 'Hammer',
    requirementSummary: 'Unlock 8 weapons or gear pieces in your Armory',
    requirementType: 'unlocked_weapons_count',
    threshold: 8,
    rewardPlayerXp: 520,
    rewardForgeXp: 450,
    rewardGold: 700,
  },
  {
    id: 'gl-expl-04',
    name: 'Grand Arsenal Curator',
    story: 'Fifteen legendary arms resting at command—an army forged from real-world deeds.',
    category: 'exploration_and_discovery',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'ARSENAL CURATOR',
    titleStyle: 'gold',
    emblemIcon: 'Swords',
    requirementSummary: 'Unlock 15 weapons or gear pieces in your Armory',
    requirementType: 'unlocked_weapons_count',
    threshold: 15,
    rewardPlayerXp: 950,
    rewardForgeXp: 800,
    rewardGold: 1300,
  },
  {
    id: 'gl-expl-05',
    name: 'Master of the Anvil',
    story: 'Tempered a chosen weapon to Level 10 through relentless Forge XP dedication.',
    category: 'exploration_and_discovery',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'ANVIL MASTER',
    titleStyle: 'crimson',
    emblemIcon: 'Hammer',
    requirementSummary: 'Upgrade any weapon in the Armory to Level 10',
    requirementType: 'max_weapon_level',
    threshold: 10,
    rewardPlayerXp: 650,
    rewardForgeXp: 500,
    rewardGold: 850,
  },
  {
    id: 'gl-expl-06',
    name: 'Archivist of Heroic Feats',
    story: 'Claimed twenty standard achievements across all pillars of LifeQuest.',
    category: 'exploration_and_discovery',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'ARCHIVIST',
    titleStyle: 'celestial',
    emblemIcon: 'Award',
    requirementSummary: 'Unlock 20 normal realm achievements',
    requirementType: 'normal_achievements_unlocked',
    threshold: 20,
    rewardPlayerXp: 800,
    rewardForgeXp: 600,
    rewardGold: 1000,
  },

  // =========================================================================
  // 6. SOCIAL LEGENDS (6)
  // =========================================================================
  {
    id: 'gl-soc-01',
    name: 'Herald of Fellowship',
    story: 'Built a circle of trusted companions across Aetheria through genuine kindness.',
    category: 'social_legends',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'HERALD OF BONDS',
    titleStyle: 'emerald',
    emblemIcon: 'Users',
    requirementSummary: 'Have 5 accepted friends in Aetheria',
    requirementType: 'friends_count',
    threshold: 5,
    rewardPlayerXp: 360,
    rewardForgeXp: 240,
    rewardGold: 450,
  },
  {
    id: 'gl-soc-02',
    name: 'Ambassador of Kindness',
    story: 'Completed ten Social AI quests connecting with family, friends, and guildmates.',
    category: 'social_legends',
    rarity: 'Mythic',
    difficulty: 'Hard',
    titleTag: 'REALM AMBASSADOR',
    titleStyle: 'emerald',
    emblemIcon: 'HeartHandshake',
    requirementSummary: 'Complete 10 Social category AI quests',
    requirementType: 'dynamic_social_claimed',
    threshold: 10,
    rewardPlayerXp: 520,
    rewardForgeXp: 360,
    rewardGold: 680,
  },
  {
    id: 'gl-soc-03',
    name: 'Founder of the Citadel Guild',
    story: 'Raised a guild banner and stepped forward as commander of a living fellowship.',
    category: 'social_legends',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'GUILD SOVEREIGN',
    titleStyle: 'gold',
    emblemIcon: 'Shield',
    requirementSummary: 'Hold Guild Leader rank in an active guild',
    requirementType: 'guild_leader',
    threshold: 1,
    rewardPlayerXp: 550,
    rewardForgeXp: 400,
    rewardGold: 750,
  },
  {
    id: 'gl-soc-04',
    name: 'Tavern Bard of Aetheria',
    story: 'Shared twenty-five encouraging dispatches across the Tavern and Guild halls.',
    category: 'social_legends',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'TAVERN BARD',
    titleStyle: 'arcane',
    emblemIcon: 'MessageSquare',
    requirementSummary: 'Send 25 messages in Realm or Guild Chat',
    requirementType: 'chat_messages_sent',
    threshold: 25,
    rewardPlayerXp: 340,
    rewardForgeXp: 240,
    rewardGold: 400,
  },
  {
    id: 'gl-soc-05',
    name: 'Paragon of Unity',
    story: 'Completed twenty-five Social AI quests, uplifting real communities beyond the screen.',
    category: 'social_legends',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'PARAGON OF UNITY',
    titleStyle: 'celestial',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Complete 25 Social category AI quests',
    requirementType: 'dynamic_social_claimed',
    threshold: 25,
    rewardPlayerXp: 950,
    rewardForgeXp: 650,
    rewardGold: 1300,
  },
  {
    id: 'gl-soc-06',
    name: 'Bannerlord of Fifteen Allies',
    story: 'Stood shoulder to shoulder with fifteen accepted friends on the path of progression.',
    category: 'social_legends',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'BANNERLORD',
    titleStyle: 'gold',
    emblemIcon: 'Users',
    requirementSummary: 'Have 15 accepted friends in Aetheria',
    requirementType: 'friends_count',
    threshold: 15,
    rewardPlayerXp: 780,
    rewardForgeXp: 520,
    rewardGold: 1050,
  },

  // =========================================================================
  // 7. ULTIMATE CHALLENGES (7)
  // =========================================================================
  {
    id: 'gl-ult-01',
    name: 'Dragonslayer of the Five Kingdoms',
    story: 'Vanquished bosses ten times over, turning dread into sovereign triumph.',
    category: 'ultimate_challenges',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'DREADSLAYER',
    titleStyle: 'crimson',
    emblemIcon: 'Swords',
    requirementSummary: 'Defeat Kingdom Bosses 10 times',
    requirementType: 'total_bosses_defeated',
    threshold: 10,
    rewardPlayerXp: 750,
    rewardForgeXp: 580,
    rewardGold: 950,
  },
  {
    id: 'gl-ult-02',
    name: 'Conqueror of All Five Realms',
    story: 'Cleansed every single Kingdom from Shadow Forest to Void Citadel.',
    category: 'ultimate_challenges',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'FIVE REALMS CONQUEROR',
    titleStyle: 'crimson',
    emblemIcon: 'Crown',
    requirementSummary: 'Clear all 5 Boss Kingdoms in Aetheria',
    requirementType: 'all_kingdoms_cleared',
    threshold: 1,
    rewardPlayerXp: 1400,
    rewardForgeXp: 1000,
    rewardGold: 2000,
  },
  {
    id: 'gl-ult-03',
    name: 'Ascendant Level Fifteen',
    story: 'First hero to shatter Level 15 through balanced habit, mind, and combat mastery.',
    category: 'ultimate_challenges',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'GRAND CHAMPION',
    titleStyle: 'gold',
    emblemIcon: 'Star',
    requirementSummary: 'Reach Player Level 15',
    requirementType: 'level',
    threshold: 15,
    rewardPlayerXp: 900,
    rewardForgeXp: 700,
    rewardGold: 1200,
  },
  {
    id: 'gl-ult-04',
    name: 'Eternal Level Twenty-Five',
    story: 'A mythic plateau of real-world transformation achieved by only one in the world.',
    category: 'ultimate_challenges',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'ETERNAL LEGEND',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach Player Level 25',
    requirementType: 'level',
    threshold: 25,
    rewardPlayerXp: 2500,
    rewardForgeXp: 1800,
    rewardGold: 3500,
  },
  {
    id: 'gl-ult-05',
    name: 'Gilded Treasurer of the Crown',
    story: 'Held five thousand Gold Sovereigns earned cleanly through quests and victory.',
    category: 'ultimate_challenges',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'GILDED SOVEREIGN',
    titleStyle: 'gold',
    emblemIcon: 'Coins',
    requirementSummary: 'Hold 5,000 Gold in your treasury',
    requirementType: 'gold_balance',
    threshold: 5000,
    rewardPlayerXp: 650,
    rewardForgeXp: 500,
    rewardGold: 1000,
  },
  {
    id: 'gl-ult-06',
    name: 'Emberheart Forge Master',
    story: 'Accumulated 2,000 Forge XP—enough cosmic fire to reforge celestial steel.',
    category: 'ultimate_challenges',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'EMBERHEART',
    titleStyle: 'crimson',
    emblemIcon: 'Flame',
    requirementSummary: 'Hold 2,000 Forge XP ready for the anvil',
    requirementType: 'forge_xp_balance',
    threshold: 2000,
    rewardPlayerXp: 600,
    rewardForgeXp: 500,
    rewardGold: 800,
  },
  {
    id: 'gl-ult-07',
    name: 'Celestial Starbearer',
    story: 'Reached 5,000 Aether Points, shining like a second sun above the Fallen Citadel.',
    category: 'ultimate_challenges',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'STARBEARER',
    titleStyle: 'prismatic',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Accumulate 5,000 Aether Points',
    requirementType: 'aether_points',
    threshold: 5000,
    rewardPlayerXp: 2200,
    rewardForgeXp: 1500,
    rewardGold: 3200,
  },

  // =========================================================================
  // 8. SPECIAL HIDDEN ACHIEVEMENTS (6)
  // =========================================================================
  {
    id: 'gl-hid-01',
    name: 'Echo of the Fallen Crown',
    story: 'A hidden vow fulfilled: stood in the ruins, walked all seven paths of honor, and returned home.',
    category: 'special_hidden_achievements',
    rarity: 'Mythic',
    difficulty: 'Secret',
    titleTag: 'CROWN RECLAIMED',
    titleStyle: 'gold',
    emblemIcon: 'Crown',
    requirementSummary: 'Complete and claim the 7-part "Reclaim Your Honor" trial',
    requirementType: 'honor_reclaimed',
    threshold: 1,
    rewardPlayerXp: 450,
    rewardForgeXp: 350,
    rewardGold: 550,
    isHidden: true,
  },
  {
    id: 'gl-hid-02',
    name: 'Voice Across the Veil',
    story: 'Forged a fellowship bond inside a Guild and spoke with allies in the tavern.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'VOICE OF FELLOWSHIP',
    titleStyle: 'arcane',
    emblemIcon: 'Compass',
    requirementSummary: 'Join an active Guild and connect with the realm',
    requirementType: 'guild_joined',
    threshold: 1,
    rewardPlayerXp: 320,
    rewardForgeXp: 220,
    rewardGold: 400,
    isHidden: true,
  },
  {
    id: 'gl-hid-03',
    name: 'Mirror of True Growth',
    story: 'Turned inward through twenty Personal Growth quests that transformed daily confidence.',
    category: 'special_hidden_achievements',
    rarity: 'Celestial',
    difficulty: 'Secret',
    titleTag: 'SOULFORGED',
    titleStyle: 'emerald',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Complete 20 Personal Growth AI quests',
    requirementType: 'dynamic_personal_growth_claimed',
    threshold: 20,
    rewardPlayerXp: 950,
    rewardForgeXp: 700,
    rewardGold: 1300,
    isHidden: true,
  },
  {
    id: 'gl-hid-04',
    name: 'Thirtyfold Aether Blade',
    story: 'Defeated Kingdom Bosses 25 times in silent mastery of elemental weakness and timing.',
    category: 'special_hidden_achievements',
    rarity: 'Eternal',
    difficulty: 'Secret',
    titleTag: 'VOIDBREAKER',
    titleStyle: 'crimson',
    emblemIcon: 'Swords',
    requirementSummary: 'Defeat Kingdom Bosses 25 times',
    requirementType: 'total_bosses_defeated',
    threshold: 25,
    rewardPlayerXp: 1500,
    rewardForgeXp: 1100,
    rewardGold: 2200,
    isHidden: true,
  },
  {
    id: 'gl-hid-05',
    name: 'Whisper of the Hundredth Deed',
    story: 'Completed 75 combined quests—leaving legends etched into every corner of the notice board.',
    category: 'special_hidden_achievements',
    rarity: 'Celestial',
    difficulty: 'Secret',
    titleTag: 'MYTHWALKER',
    titleStyle: 'arcane',
    emblemIcon: 'ScrollText',
    requirementSummary: 'Claim 75 quests across classic and dynamic quest boards',
    requirementType: 'quests_claimed_total',
    threshold: 75,
    rewardPlayerXp: 1450,
    rewardForgeXp: 1000,
    rewardGold: 2000,
    isHidden: true,
  },
  {
    id: 'gl-hid-06',
    name: 'The Phoenix Sovereign',
    story: 'From zero to fifty thousand Player XP—the ultimate phoenix of real-world progression.',
    category: 'special_hidden_achievements',
    rarity: 'Eternal',
    difficulty: 'Secret',
    titleTag: 'PHOENIX SOVEREIGN',
    titleStyle: 'prismatic',
    emblemIcon: 'Flame',
    requirementSummary: 'Amass 50,000 total Player XP across the realm',
    requirementType: 'total_xp',
    threshold: 50000,
    rewardPlayerXp: 3000,
    rewardForgeXp: 2000,
    rewardGold: 5000,
    isHidden: true,
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
  questsClaimedTotal: number;
  dynamicQuestsClaimedTotal: number;
  dynamicPhysicalClaimed: number;
  dynamicIntellectualClaimed: number;
  dynamicDisciplineClaimed: number;
  dynamicPersonalGrowthClaimed: number;
  dynamicSocialClaimed: number;
  normalAchievementsUnlocked: number;
  unlockedWeaponsCount: number;
  maxWeaponLevel: number;
  friendsCount: number;
  guildJoined: number;
  guildLeader: number;
  chatMessagesSent: number;
  storyChaptersClaimed: number;
  allKingdomsCleared: number;
  honorReclaimed: number;
  dailyReportsGenerated: number;
  goldBalance: number;
  forgeXpBalance: number;
}

export const getMetricValueForRequirement = (
  requirementType: GlobalRequirementType,
  snapshot: GlobalMetricSnapshot
): number => {
  switch (requirementType) {
    case 'level':
      return snapshot.level;
    case 'total_xp':
      return snapshot.totalXp;
    case 'current_streak':
      return snapshot.currentStreak;
    case 'total_workouts':
      return snapshot.totalWorkouts;
    case 'total_verified_reps':
      return snapshot.totalVerifiedReps;
    case 'total_bosses_defeated':
      return snapshot.totalBossesDefeated;
    case 'aether_points':
      return snapshot.aetherPoints;
    case 'habits_claimed_total':
      return snapshot.habitsClaimedTotal;
    case 'meals_logged_total':
      return snapshot.mealsLoggedTotal;
    case 'water_glasses_current':
      return snapshot.waterGlassesCurrent;
    case 'quests_claimed_total':
      return snapshot.questsClaimedTotal;
    case 'dynamic_quests_claimed_total':
      return snapshot.dynamicQuestsClaimedTotal;
    case 'dynamic_physical_claimed':
      return snapshot.dynamicPhysicalClaimed;
    case 'dynamic_intellectual_claimed':
      return snapshot.dynamicIntellectualClaimed;
    case 'dynamic_discipline_claimed':
      return snapshot.dynamicDisciplineClaimed;
    case 'dynamic_personal_growth_claimed':
      return snapshot.dynamicPersonalGrowthClaimed;
    case 'dynamic_social_claimed':
      return snapshot.dynamicSocialClaimed;
    case 'normal_achievements_unlocked':
      return snapshot.normalAchievementsUnlocked;
    case 'unlocked_weapons_count':
      return snapshot.unlockedWeaponsCount;
    case 'max_weapon_level':
      return snapshot.maxWeaponLevel;
    case 'friends_count':
      return snapshot.friendsCount;
    case 'guild_joined':
      return snapshot.guildJoined;
    case 'guild_leader':
      return snapshot.guildLeader;
    case 'chat_messages_sent':
      return snapshot.chatMessagesSent;
    case 'story_chapters_claimed':
      return snapshot.storyChaptersClaimed;
    case 'all_kingdoms_cleared':
      return snapshot.allKingdomsCleared;
    case 'honor_reclaimed':
      return snapshot.honorReclaimed;
    case 'daily_reports_generated':
      return snapshot.dailyReportsGenerated;
    case 'gold_balance':
      return snapshot.goldBalance;
    case 'forge_xp_balance':
      return snapshot.forgeXpBalance;
    default:
      return 0;
  }
};
