import type {
  GlobalAchievementCategory,
  GlobalAchievementRarity,
  GlobalExclusiveAchievement,
  GlobalRequirementType,
  GlobalTitleStyle,
} from '../types/game.ts';

export const GLOBAL_LEGEND_CATEGORIES: Array<{
  id: GlobalAchievementCategory;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'legendary_discipline',
    label: 'Legendary Discipline',
    subtitle: 'Iron will, long-term ritual mastery, and unyielding self-control.',
  },
  {
    id: 'master_of_knowledge',
    label: 'Master of Knowledge',
    subtitle: 'Long-horizon intellectual quests, tactical insight, and mindful study.',
  },
  {
    id: 'physical_excellence',
    label: 'Physical Excellence',
    subtitle: 'Long-term athletic endurance, verified reps, and disciplined conditioning.',
  },
  {
    id: 'unbreakable_consistency',
    label: 'Unbreakable Consistency',
    subtitle: 'Sustained multi-month streaks, balanced nutrition, and steadfast hydration.',
  },
  {
    id: 'exploration_and_discovery',
    label: 'Exploration & Discovery',
    subtitle: 'Grand campaigns, historic feats, and realm-wide milestones.',
  },
  {
    id: 'social_legends',
    label: 'Social Legends',
    subtitle: 'Thriving fellowships, enduring guild command, and inspiring companions.',
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
  Epic: {
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/45',
    cardGlow: 'shadow-purple-950/30',
  },
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
  // 1. LEGENDARY DISCIPLINE (7) — Zero Player XP inflation (Honor + Title + Gold)
  // =========================================================================
  {
    id: 'gl-disc-01',
    name: 'Oathkeeper of Dawn',
    story: 'First across the realm to conquer seventy-five Discipline trials with unshakeable poise.',
    category: 'legendary_discipline',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'OATHKEEPER OF DAWN',
    titleStyle: 'gold',
    emblemIcon: 'ShieldCheck',
    requirementSummary: 'Claim 75 Discipline category AI quests',
    requirementType: 'dynamic_discipline_claimed',
    threshold: 75,
    rewardPlayerXp: 0,
    rewardGold: 800,
  },
  {
    id: 'gl-disc-02',
    name: 'The Unyielding Vow',
    story: 'While lesser knights broke when fatigue spoke, one stood firm through three hundred daily habits.',
    category: 'legendary_discipline',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'THE UNYIELDING',
    titleStyle: 'gold',
    emblemIcon: 'Flame',
    requirementSummary: 'Record 300 completed habit logs across your journey',
    requirementType: 'habits_claimed_total',
    threshold: 300,
    rewardPlayerXp: 0,
    rewardGold: 1000,
  },
  {
    id: 'gl-disc-03',
    name: 'Architect of Order',
    story: 'Carved structure out of chaos across one hundred fifty AI-crafted daily quests.',
    category: 'legendary_discipline',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'ARCHITECT OF ORDER',
    titleStyle: 'arcane',
    emblemIcon: 'Compass',
    requirementSummary: 'Claim 150 AI Dynamic Daily Quests',
    requirementType: 'dynamic_quests_claimed_total',
    threshold: 150,
    rewardPlayerXp: 0,
    rewardGold: 1400,
  },
  {
    id: 'gl-disc-04',
    name: 'Sovereign of Routine',
    story: 'A thousand vows kept over seasons of unwavering personal command.',
    category: 'legendary_discipline',
    rarity: 'Ascendant',
    difficulty: 'Pinnacle',
    titleTag: 'ROUTINE SOVEREIGN',
    titleStyle: 'celestial',
    emblemIcon: 'Crown',
    requirementSummary: 'Record 1,000 completed habit logs',
    requirementType: 'habits_claimed_total',
    threshold: 1000,
    rewardPlayerXp: 0,
    rewardGold: 3000,
  },
  {
    id: 'gl-disc-05',
    name: 'Sentinel of Procrastination Conquered',
    story: 'Defeated hesitation permanently across two hundred Discipline quests.',
    category: 'legendary_discipline',
    rarity: 'Mythic',
    difficulty: 'Pinnacle',
    titleTag: 'IRON WILL SENTINEL',
    titleStyle: 'crimson',
    emblemIcon: 'Flame',
    requirementSummary: 'Claim 200 Discipline category AI quests',
    requirementType: 'dynamic_discipline_claimed',
    threshold: 200,
    rewardPlayerXp: 0,
    rewardGold: 2200,
  },
  {
    id: 'gl-disc-06',
    name: 'Tempered Temperance',
    story: 'Mastered lifelong consistency across three hundred total completed quests.',
    category: 'legendary_discipline',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'TEMPERED PARAGON',
    titleStyle: 'emerald',
    emblemIcon: 'Gem',
    requirementSummary: 'Claim 300 quests across classic and dynamic quest boards',
    requirementType: 'quests_claimed_total',
    threshold: 300,
    rewardPlayerXp: 0,
    rewardGold: 2600,
  },
  {
    id: 'gl-disc-07',
    name: 'The First Ascendant',
    story: 'First champion to reach 100,000 lifetime Player XP through authentic dedication.',
    category: 'legendary_discipline',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'THE FIRST ASCENDANT',
    titleStyle: 'prismatic',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Amass 100,000 total Player XP across the realm',
    requirementType: 'total_xp',
    threshold: 100000,
    rewardPlayerXp: 0,
    rewardGold: 5000,
  },

  // =========================================================================
  // 2. MASTER OF KNOWLEDGE (6)
  // =========================================================================
  {
    id: 'gl-know-01',
    name: 'Scribe of the Astral Archive',
    story: 'Inscribed seventy-five verified study reflections into the Astral Chronicle.',
    category: 'master_of_knowledge',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'ASTRAL SCRIBE',
    titleStyle: 'celestial',
    emblemIcon: 'BookOpen',
    requirementSummary: 'Complete 75 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 75,
    rewardPlayerXp: 0,
    rewardGold: 800,
  },
  {
    id: 'gl-know-02',
    name: 'Grand Scholar of Aetheria',
    story: 'Turned hundreds of quiet study hours into unmatched realm wisdom.',
    category: 'master_of_knowledge',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'GRAND SCHOLAR',
    titleStyle: 'arcane',
    emblemIcon: 'GraduationCap',
    requirementSummary: 'Complete 175 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 175,
    rewardPlayerXp: 0,
    rewardGold: 1600,
  },
  {
    id: 'gl-know-03',
    name: 'Oracle of Self-Mastery',
    story: 'Reviewed sixty full Daily Quest Reports across seasons of deliberate self-study.',
    category: 'master_of_knowledge',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'SELF ORACLE',
    titleStyle: 'celestial',
    emblemIcon: 'ScrollText',
    requirementSummary: 'Generate and review 60 Daily Quest Reports',
    requirementType: 'daily_reports_generated',
    threshold: 60,
    rewardPlayerXp: 0,
    rewardGold: 1200,
  },
  {
    id: 'gl-know-04',
    name: 'Sage of Growth',
    story: 'Conquered one hundred fifty Personal Growth quests through steady reflection.',
    category: 'master_of_knowledge',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'SAGE OF GROWTH',
    titleStyle: 'emerald',
    emblemIcon: 'Lightbulb',
    requirementSummary: 'Complete 150 Personal Growth category AI quests',
    requirementType: 'dynamic_personal_growth_claimed',
    threshold: 150,
    rewardPlayerXp: 0,
    rewardGold: 1800,
  },
  {
    id: 'gl-know-05',
    name: 'Luminary of the High Spire',
    story: 'Completed three hundred Intellectual trials; an unmatched beacon of focus.',
    category: 'master_of_knowledge',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'HIGH SPIRE LUMINARY',
    titleStyle: 'celestial',
    emblemIcon: 'Eye',
    requirementSummary: 'Complete 300 Intellectual category AI quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 300,
    rewardPlayerXp: 0,
    rewardGold: 3200,
  },
  {
    id: 'gl-know-06',
    name: 'Keeper of All Scrolls',
    story: 'Reviewed one hundred eighty Daily Quest Reports across half a year of self-mastery.',
    category: 'master_of_knowledge',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'KEEPER OF SCROLLS',
    titleStyle: 'prismatic',
    emblemIcon: 'Library',
    requirementSummary: 'Generate and review 180 Daily Quest Reports',
    requirementType: 'daily_reports_generated',
    threshold: 180,
    rewardPlayerXp: 0,
    rewardGold: 4200,
  },

  // =========================================================================
  // 3. PHYSICAL EXCELLENCE (7)
  // =========================================================================
  {
    id: 'gl-phys-01',
    name: 'Vanguard of Iron',
    story: 'Built steel resilience across one hundred twenty verified workout sessions.',
    category: 'physical_excellence',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'VANGUARD OF IRON',
    titleStyle: 'crimson',
    emblemIcon: 'Dumbbell',
    requirementSummary: 'Complete 120 fitness workout sessions',
    requirementType: 'total_workouts',
    threshold: 120,
    rewardPlayerXp: 0,
    rewardGold: 1200,
  },
  {
    id: 'gl-phys-02',
    name: 'Titan of Fifteen Thousand Reps',
    story: 'Fifteen thousand verified repetitions witnessed under disciplined form.',
    category: 'physical_excellence',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'TITAN OF IRON',
    titleStyle: 'crimson',
    emblemIcon: 'Zap',
    requirementSummary: 'Accumulate 15,000 Aether Vision verified repetitions',
    requirementType: 'total_verified_reps',
    threshold: 15000,
    rewardPlayerXp: 0,
    rewardGold: 2000,
  },
  {
    id: 'gl-phys-03',
    name: 'Avatar of Motion',
    story: 'Conquered one hundred fifty Physical AI quests across running, strength, and mobility.',
    category: 'physical_excellence',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'AVATAR OF MOTION',
    titleStyle: 'gold',
    emblemIcon: 'Activity',
    requirementSummary: 'Complete 150 Physical category AI quests',
    requirementType: 'dynamic_physical_claimed',
    threshold: 150,
    rewardPlayerXp: 0,
    rewardGold: 1800,
  },
  {
    id: 'gl-phys-04',
    name: 'Colossus of Endurance',
    story: 'Three hundred full training sessions earned safely over long-term commitment.',
    category: 'physical_excellence',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'COLOSSUS',
    titleStyle: 'crimson',
    emblemIcon: 'Shield',
    requirementSummary: 'Complete 300 fitness workout sessions',
    requirementType: 'total_workouts',
    threshold: 300,
    rewardPlayerXp: 0,
    rewardGold: 3500,
  },
  {
    id: 'gl-phys-05',
    name: 'Fifty-Thousandfold Strike',
    story: 'Fifty thousand verified repetitions built patiently without shortcuts or injury.',
    category: 'physical_excellence',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'APEX ATHLETE',
    titleStyle: 'prismatic',
    emblemIcon: 'Trophy',
    requirementSummary: 'Accumulate 50,000 Aether Vision verified repetitions',
    requirementType: 'total_verified_reps',
    threshold: 50000,
    rewardPlayerXp: 0,
    rewardGold: 5000,
  },
  {
    id: 'gl-phys-06',
    name: 'Swift Strider of the Realm',
    story: 'First runner to conquer eighty Physical AI quests with balanced recovery.',
    category: 'physical_excellence',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'SWIFT STRIDER',
    titleStyle: 'emerald',
    emblemIcon: 'Wind',
    requirementSummary: 'Complete 80 Physical category AI quests',
    requirementType: 'dynamic_physical_claimed',
    threshold: 80,
    rewardPlayerXp: 0,
    rewardGold: 1100,
  },
  {
    id: 'gl-phys-07',
    name: 'Aether Body Ascendant',
    story: 'Gathered 18,000 Aether Points through pure physical mastery and vitality.',
    category: 'physical_excellence',
    rarity: 'Ascendant',
    difficulty: 'Pinnacle',
    titleTag: 'AETHER VESSEL',
    titleStyle: 'celestial',
    emblemIcon: 'Sun',
    requirementSummary: 'Earn 18,000 Aether Points',
    requirementType: 'aether_points',
    threshold: 18000,
    rewardPlayerXp: 0,
    rewardGold: 2800,
  },

  // =========================================================================
  // 4. UNBREAKABLE CONSISTENCY (7)
  // =========================================================================
  {
    id: 'gl-cons-01',
    name: 'Keeper of the Forty-Five-Day Flame',
    story: 'Sustained a blazing 45-day streak through storms, travel, and fatigue.',
    category: 'unbreakable_consistency',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'FLAMEKEEPER',
    titleStyle: 'gold',
    emblemIcon: 'Flame',
    requirementSummary: 'Reach a 45-day habit streak',
    requirementType: 'current_streak',
    threshold: 45,
    rewardPlayerXp: 0,
    rewardGold: 1200,
  },
  {
    id: 'gl-cons-02',
    name: 'Quarter-Year Sentinel',
    story: 'Ninety unbroken dawns; discipline ceased to be effort and became identity.',
    category: 'unbreakable_consistency',
    rarity: 'Mythic',
    difficulty: 'Pinnacle',
    titleTag: 'NINETY DAWNS',
    titleStyle: 'celestial',
    emblemIcon: 'Moon',
    requirementSummary: 'Reach a 90-day habit streak',
    requirementType: 'current_streak',
    threshold: 90,
    rewardPlayerXp: 0,
    rewardGold: 2600,
  },
  {
    id: 'gl-cons-03',
    name: 'Immortal Sunbeam',
    story: 'One hundred eighty consecutive days of honoring your word across Aetheria.',
    category: 'unbreakable_consistency',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'UNBROKEN',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach a 180-day habit streak',
    requirementType: 'current_streak',
    threshold: 180,
    rewardPlayerXp: 0,
    rewardGold: 5500,
  },
  {
    id: 'gl-cons-04',
    name: 'Steward of Living Springs',
    story: 'Honored nourishment and hydration across sixty full daily hydration milestones.',
    category: 'unbreakable_consistency',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'SPRING STEWARD',
    titleStyle: 'celestial',
    emblemIcon: 'Droplets',
    requirementSummary: 'Complete 60 daily hydration milestones (8+ glasses/day)',
    requirementType: 'hydration_goals_total',
    threshold: 60,
    rewardPlayerXp: 0,
    rewardGold: 1100,
  },
  {
    id: 'gl-cons-05',
    name: 'Alchemist of Wholesome Table',
    story: 'Recorded one hundred eighty balanced meals with honest culinary discipline.',
    category: 'unbreakable_consistency',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'HARVEST KEEPER',
    titleStyle: 'emerald',
    emblemIcon: 'Apple',
    requirementSummary: 'Log 180 balanced meals in Nutrition',
    requirementType: 'meals_logged_total',
    threshold: 180,
    rewardPlayerXp: 0,
    rewardGold: 1500,
  },
  {
    id: 'gl-cons-06',
    name: 'Five-Hundredfold Nourishment',
    story: 'Five hundred mindful meals logged across seasons of sustained health.',
    category: 'unbreakable_consistency',
    rarity: 'Ascendant',
    difficulty: 'Pinnacle',
    titleTag: 'VITALITY MASTER',
    titleStyle: 'emerald',
    emblemIcon: 'Heart',
    requirementSummary: 'Log 500 balanced meals in Nutrition',
    requirementType: 'meals_logged_total',
    threshold: 500,
    rewardPlayerXp: 0,
    rewardGold: 3200,
  },
  {
    id: 'gl-cons-07',
    name: 'Centurion of Quests',
    story: 'Claimed three hundred fifty AI-crafted daily quests without yielding a season.',
    category: 'unbreakable_consistency',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'QUEST CENTURION',
    titleStyle: 'gold',
    emblemIcon: 'Award',
    requirementSummary: 'Claim 350 AI Dynamic Daily Quests',
    requirementType: 'dynamic_quests_claimed_total',
    threshold: 350,
    rewardPlayerXp: 0,
    rewardGold: 3800,
  },

  // =========================================================================
  // 5. EXPLORATION & DISCOVERY (6)
  // =========================================================================
  {
    id: 'gl-expl-01',
    name: 'Chronicler of the First Ruin',
    story: 'Conquered 450 lifetime habit vows while reconstructing the Fallen Citadel lore.',
    category: 'exploration_and_discovery',
    rarity: 'Legendary',
    difficulty: 'Extreme',
    titleTag: 'REALM CHRONICLER',
    titleStyle: 'gold',
    emblemIcon: 'Map',
    requirementSummary: 'Record 450 completed habit logs',
    requirementType: 'habits_claimed_total',
    threshold: 450,
    rewardPlayerXp: 0,
    rewardGold: 1400,
  },
  {
    id: 'gl-expl-02',
    name: 'Restorer of Aetheria',
    story: 'Reached Level 35 and completed all 7 Storyline Campaign chapters.',
    category: 'exploration_and_discovery',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'REALM RESTORER',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach Player Level 35 across Aetheria campaigns',
    requirementType: 'level',
    threshold: 35,
    rewardPlayerXp: 0,
    rewardGold: 4000,
  },
  {
    id: 'gl-expl-06',
    name: 'Archivist of Heroic Feats',
    story: 'Unlocked thirty-five standard realm achievements across every pillar of LifeQuest.',
    category: 'exploration_and_discovery',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'ARCHIVIST',
    titleStyle: 'celestial',
    emblemIcon: 'Award',
    requirementSummary: 'Unlock 35 normal realm achievements',
    requirementType: 'normal_achievements_unlocked',
    threshold: 35,
    rewardPlayerXp: 0,
    rewardGold: 2200,
  },

  // =========================================================================
  // 6. SOCIAL LEGENDS (6)
  // =========================================================================
  {
    id: 'gl-soc-01',
    name: 'Herald of Fellowship',
    story: 'Built an enduring circle of twenty-five accepted allies across Aetheria.',
    category: 'social_legends',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'HERALD OF BONDS',
    titleStyle: 'emerald',
    emblemIcon: 'Users',
    requirementSummary: 'Have 25 accepted friends in Aetheria',
    requirementType: 'friends_count',
    threshold: 25,
    rewardPlayerXp: 0,
    rewardGold: 1000,
  },
  {
    id: 'gl-soc-02',
    name: 'Ambassador of Kindness',
    story: 'Completed seventy-five Social AI quests uplifting real-world communities.',
    category: 'social_legends',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'REALM AMBASSADOR',
    titleStyle: 'emerald',
    emblemIcon: 'HeartHandshake',
    requirementSummary: 'Complete 75 Social category AI quests',
    requirementType: 'dynamic_social_claimed',
    threshold: 75,
    rewardPlayerXp: 0,
    rewardGold: 1600,
  },
  {
    id: 'gl-soc-03',
    name: 'Founder of the Citadel Guild',
    story: 'Achieved Level 30 Guild command and sustained active guild leadership.',
    category: 'social_legends',
    rarity: 'Mythic',
    difficulty: 'Pinnacle',
    titleTag: 'GUILD SOVEREIGN',
    titleStyle: 'gold',
    emblemIcon: 'Shield',
    requirementSummary: 'Reach Player Level 30 while commanding an active fellowship',
    requirementType: 'level',
    threshold: 30,
    rewardPlayerXp: 0,
    rewardGold: 2600,
  },
  {
    id: 'gl-soc-04',
    name: 'Tavern Bard of Aetheria',
    story: 'Shared two hundred fifty encouraging dispatches across Realm and Guild halls.',
    category: 'social_legends',
    rarity: 'Legendary',
    difficulty: 'Hard',
    titleTag: 'TAVERN BARD',
    titleStyle: 'arcane',
    emblemIcon: 'MessageSquare',
    requirementSummary: 'Send 250 messages in Realm or Guild Chat',
    requirementType: 'chat_messages_sent',
    threshold: 250,
    rewardPlayerXp: 0,
    rewardGold: 1100,
  },
  {
    id: 'gl-soc-05',
    name: 'Paragon of Unity',
    story: 'Completed two hundred Social AI quests, uplifting real communities beyond the screen.',
    category: 'social_legends',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'PARAGON OF UNITY',
    titleStyle: 'celestial',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Complete 200 Social category AI quests',
    requirementType: 'dynamic_social_claimed',
    threshold: 200,
    rewardPlayerXp: 0,
    rewardGold: 3400,
  },
  {
    id: 'gl-soc-06',
    name: 'Bannerlord of Sixty Allies',
    story: 'Formed sixty trusted, accepted friendships across the realm.',
    category: 'social_legends',
    rarity: 'Ascendant',
    difficulty: 'Pinnacle',
    titleTag: 'BANNERLORD',
    titleStyle: 'gold',
    emblemIcon: 'Users',
    requirementSummary: 'Have 60 accepted friends in Aetheria',
    requirementType: 'friends_count',
    threshold: 60,
    rewardPlayerXp: 0,
    rewardGold: 2800,
  },

  // =========================================================================
  // 7. ULTIMATE CHALLENGES (7)
  // =========================================================================
  {
    id: 'gl-ult-01',
    name: 'Dragonslayer of the Five Kingdoms',
    story: 'Vanquished bosses forty times over, turning dread into sovereign triumph.',
    category: 'ultimate_challenges',
    rarity: 'Mythic',
    difficulty: 'Extreme',
    titleTag: 'DREADSLAYER',
    titleStyle: 'crimson',
    emblemIcon: 'Flame',
    requirementSummary: 'Defeat Kingdom Bosses 40 times',
    requirementType: 'total_bosses_defeated',
    threshold: 40,
    rewardPlayerXp: 0,
    rewardGold: 2400,
  },
  {
    id: 'gl-ult-02',
    name: 'Conqueror of All Five Realms',
    story: 'Defeated bosses eighty times and cleansed every realm of stagnation.',
    category: 'ultimate_challenges',
    rarity: 'Celestial',
    difficulty: 'Pinnacle',
    titleTag: 'FIVE REALMS CONQUEROR',
    titleStyle: 'crimson',
    emblemIcon: 'Crown',
    requirementSummary: 'Defeat Kingdom Bosses 80 times',
    requirementType: 'total_bosses_defeated',
    threshold: 80,
    rewardPlayerXp: 0,
    rewardGold: 4500,
  },
  {
    id: 'gl-ult-03',
    name: 'Ascendant Level Thirty',
    story: 'Reached Player Level 30 through months of balanced training, habits, and focus.',
    category: 'ultimate_challenges',
    rarity: 'Ascendant',
    difficulty: 'Extreme',
    titleTag: 'GRAND CHAMPION',
    titleStyle: 'gold',
    emblemIcon: 'Star',
    requirementSummary: 'Reach Player Level 30',
    requirementType: 'level',
    threshold: 30,
    rewardPlayerXp: 0,
    rewardGold: 3000,
  },
  {
    id: 'gl-ult-04',
    name: 'Eternal Level Fifty',
    story: 'A mythic plateau of real-world transformation achieved at Level 50.',
    category: 'ultimate_challenges',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'ETERNAL LEGEND',
    titleStyle: 'prismatic',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach Player Level 50',
    requirementType: 'level',
    threshold: 50,
    rewardPlayerXp: 0,
    rewardGold: 6500,
  },
  {
    id: 'gl-ult-05',
    name: 'Gilded Treasurer of the Crown',
    story: 'Held twenty-five thousand Gold Sovereigns earned honestly through quests and raids.',
    category: 'ultimate_challenges',
    rarity: 'Ascendant',
    difficulty: 'Pinnacle',
    titleTag: 'GILDED SOVEREIGN',
    titleStyle: 'gold',
    emblemIcon: 'Coins',
    requirementSummary: 'Hold 25,000 Gold in your treasury',
    requirementType: 'gold_balance',
    threshold: 25000,
    rewardPlayerXp: 0,
    rewardGold: 2000,
  },
  {
    id: 'gl-ult-07',
    name: 'Celestial Starbearer',
    story: 'Reached 35,000 Aether Points, shining like a second sun above the Fallen Citadel.',
    category: 'ultimate_challenges',
    rarity: 'Eternal',
    difficulty: 'Pinnacle',
    titleTag: 'STARBEARER',
    titleStyle: 'prismatic',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Accumulate 35,000 Aether Points',
    requirementType: 'aether_points',
    threshold: 35000,
    rewardPlayerXp: 0,
    rewardGold: 5800,
  },

  // =========================================================================
  // 8. SPECIAL HIDDEN ACHIEVEMENTS (6)
  // =========================================================================
  {
    id: 'gl-hid-01',
    name: 'Echo of the Fallen Crown',
    story: 'Sustained a 120-day unbroken streak after reclaiming the Fallen Crown.',
    category: 'special_hidden_achievements',
    rarity: 'Mythic',
    difficulty: 'Secret',
    titleTag: 'CROWN RECLAIMED',
    titleStyle: 'gold',
    emblemIcon: 'Crown',
    requirementSummary: 'Reach a 120-day habit streak',
    requirementType: 'current_streak',
    threshold: 120,
    rewardPlayerXp: 0,
    rewardGold: 3600,
    isHidden: true,
    hint: 'Tending your daily flame across four quiet seasons unlocks an ancient echo.',
  },
  {
    id: 'gl-hid-02',
    name: 'Voice Across the Veil',
    story: 'Delivered five hundred Realm or Guild messages uniting fellow champions.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'VOICE OF FELLOWSHIP',
    titleStyle: 'arcane',
    emblemIcon: 'Compass',
    requirementSummary: 'Send 500 messages across Realm and Guild halls',
    requirementType: 'chat_messages_sent',
    threshold: 500,
    rewardPlayerXp: 0,
    rewardGold: 2000,
    isHidden: true,
    hint: 'Encouragement spoken steadily across Realm and Guild halls shapes fellowship.',
  },
  {
    id: 'gl-hid-03',
    name: 'Mirror of True Growth',
    story: 'Completed two hundred Personal Growth quests that reshaped daily mastery.',
    category: 'special_hidden_achievements',
    rarity: 'Celestial',
    difficulty: 'Secret',
    titleTag: 'SOULBOUND',
    titleStyle: 'emerald',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Complete 200 Personal Growth AI quests',
    requirementType: 'dynamic_personal_growth_claimed',
    threshold: 200,
    rewardPlayerXp: 0,
    rewardGold: 3600,
    isHidden: true,
    hint: 'Look inward with patience; quiet self-reflection compounds into rare clarity.',
  },
  {
    id: 'gl-hid-04',
    name: 'Century of the Unarmed Fist',
    story: 'Defeated Kingdom Bosses 100 times through bodyweight strength, timing, and resolve.',
    category: 'special_hidden_achievements',
    rarity: 'Eternal',
    difficulty: 'Secret',
    titleTag: 'VOIDBREAKER',
    titleStyle: 'crimson',
    emblemIcon: 'Flame',
    requirementSummary: 'Defeat Kingdom Bosses 100 times',
    requirementType: 'total_bosses_defeated',
    threshold: 100,
    rewardPlayerXp: 0,
    rewardGold: 5500,
    isHidden: true,
    hint: 'One hundred shadows fall only to veterans who return training round after round.',
  },
  {
    id: 'gl-hid-05',
    name: 'Whisper of the Five-Hundredth Deed',
    story: 'Completed 500 combined quests—etching permanence into the notice board.',
    category: 'special_hidden_achievements',
    rarity: 'Celestial',
    difficulty: 'Secret',
    titleTag: 'MYTHWALKER',
    titleStyle: 'arcane',
    emblemIcon: 'ScrollText',
    requirementSummary: 'Claim 500 quests across classic and dynamic quest boards',
    requirementType: 'quests_claimed_total',
    threshold: 500,
    rewardPlayerXp: 0,
    rewardGold: 4500,
    isHidden: true,
    hint: 'Hundreds of small daily promises eventually rewrite the Citadel’s chronicle.',
  },
  {
    id: 'gl-hid-06',
    name: 'The Phoenix Sovereign',
    story: 'Amassed 250,000 lifetime Player XP—the ultimate phoenix of real-world progression.',
    category: 'special_hidden_achievements',
    rarity: 'Eternal',
    difficulty: 'Secret',
    titleTag: 'PHOENIX SOVEREIGN',
    titleStyle: 'prismatic',
    emblemIcon: 'Flame',
    requirementSummary: 'Amass 250,000 total Player XP across the realm',
    requirementType: 'total_xp',
    threshold: 250000,
    rewardPlayerXp: 0,
    rewardGold: 7500,
    isHidden: true,
    hint: 'Only heroes who walk the long horizon for years awaken the Sovereign flame.',
  },
  {
    id: 'gl-hid-07',
    name: 'Spring of the Still Mind',
    story: 'Completed 30 Daily Hydration targets, proving calm recovery fuels endurance.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'WELLSPRING',
    titleStyle: 'emerald',
    emblemIcon: 'Droplets',
    requirementSummary: 'Complete 30 full daily hydration goals',
    requirementType: 'hydration_goals_total',
    threshold: 30,
    rewardPlayerXp: 0,
    rewardGold: 1600,
    isHidden: true,
    hint: 'Clear water tended thirty days over quietly awakens an ancient wellspring.',
  },
  {
    id: 'gl-hid-08',
    name: 'Scribe of Thirty Mornings',
    story: 'Generated 30 AI Daily Reports to learn from balanced victories and rest.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'DAWN SCRIBE',
    titleStyle: 'arcane',
    emblemIcon: 'BookOpen',
    requirementSummary: 'Generate 30 Daily Progression Reports',
    requirementType: 'daily_reports_generated',
    threshold: 30,
    rewardPlayerXp: 0,
    rewardGold: 1800,
    isHidden: true,
    hint: 'Reviewing your footsteps across thirty evenings reveals a hidden chronicle.',
  },
  {
    id: 'gl-hid-09',
    name: 'Keepers of the Balanced Table',
    story: 'Logged 120 balanced meals nourishing real-life strength and vitality.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'HEARTH STEWARD',
    titleStyle: 'gold',
    emblemIcon: 'Utensils',
    requirementSummary: 'Log 120 balanced meals in the Nutrition Ledger',
    requirementType: 'meals_logged_total',
    threshold: 120,
    rewardPlayerXp: 0,
    rewardGold: 2400,
    isHidden: true,
    hint: 'Honest nourishment repeated through the months earns the Hearth’s silent blessing.',
  },
  {
    id: 'gl-hid-10',
    name: 'Scholar of the Quiet Hour',
    story: 'Claimed 50 Intellectual dynamic quests—strengthening mind alongside body.',
    category: 'special_hidden_achievements',
    rarity: 'Legendary',
    difficulty: 'Secret',
    titleTag: 'QUIET LUMINARY',
    titleStyle: 'arcane',
    emblemIcon: 'Sparkles',
    requirementSummary: 'Complete 50 Intellectual dynamic quests',
    requirementType: 'dynamic_intellectual_claimed',
    threshold: 50,
    rewardPlayerXp: 0,
    rewardGold: 2800,
    isHidden: true,
    hint: 'Curiosity practiced fifty times unlocks an archive sealed to the impatient.',
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
    case 'hydration_goals_total':
      return snapshot.hydrationGoalsTotal;
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
    default:
      return 0;
  }
};
