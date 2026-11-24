import { CampaignChapterDefinition, ReclaimHonorObjectiveId } from '../types/game';

export const FALLEN_KNIGHT_OPENING_MONOLOGUE = `Once, Aetheria was the greatest kingdom in the realm.
Its towers shone with eternal wisdom, strength and peace.
Then came The Great Fall.
Darkness shattered the citadel, scattered its guardians and plunged the land into ruin.
Among the survivors was a knight who had lost his kingdom, his honor and his strength.
Through discipline, courage and daily trials, the fallen must rise once again — and rebuild Aetheria.`;

export const RECLAIM_HONOR_OBJECTIVES: Array<{
  id: ReclaimHonorObjectiveId;
  label: string;
  hint: string;
  targetTab: string;
}> = [
  {
    id: 'visit_armory',
    label: 'Visit the Armoury',
    hint: 'Enter the Blacksmith Forge & Armory to inspect your war gear.',
    targetTab: 'armory',
  },
  {
    id: 'inspect_equipment',
    label: 'Inspect Equipment',
    hint: 'Select any weapon or armor piece in the Armory or Shop to inspect its stats.',
    targetTab: 'armory',
  },
  {
    id: 'visit_shop',
    label: 'Visit the Shop',
    hint: 'Browse the Aetheria Grand Bazaar to see weapons, elixirs and relics.',
    targetTab: 'store',
  },
  {
    id: 'open_quest_board',
    label: 'Open the Quest Board',
    hint: 'Review your active daily and special bounties on the Quest Board.',
    targetTab: 'quests',
  },
  {
    id: 'view_attributes',
    label: 'View Character Attributes',
    hint: 'Inspect your six RPG attributes and level progression in Character Profile.',
    targetTab: 'character',
  },
  {
    id: 'complete_habit',
    label: 'Complete One Introductory Habit',
    hint: 'Check off and claim one healthy habit in the Dashboard habits tracker.',
    targetTab: 'dashboard',
  },
  {
    id: 'return_castle',
    label: 'Return to the Castle Courtyard',
    hint: 'Return to the Castle Sanctuary after visiting the realm halls above.',
    targetTab: 'dashboard',
  },
];

export const CAMPAIGN_CHAPTERS: CampaignChapterDefinition[] = [
  {
    id: 'chapter-1-awakening',
    number: 1,
    title: 'Chapter I: The Awakening',
    subtitle: 'Embers Beneath Broken Stone',
    narrationIntro:
      'Cold starlight filters through the cracked archways of the Inner Keep. Beside a dying brazier, you retrieve a scarred blade and feel the first pulse of Aether stir within your chest.',
    npcSpeaker: 'Elder Thane',
    npcRole: 'Last Keeper of the Citadel Gate',
    npcDialogue:
      '“You breathe yet, champion. Look upon these ruined flagstones—not with despair, but as foundation stones waiting for steady hands. One true habit kindles the first flame.”',
    loreDiscovery:
      'Chronicle Fragment I: When the High Bell fell, six ancient virtues scattered from the throne: Strength, Discipline, Intelligence, Vitality, Agility, and Resilience.',
    missionTitle: 'Kindle the Courtyard Brazier',
    missionSummary: 'Begin your daily discipline by completing at least 1 real-life habit and entering the Courtyard Sanctuary.',
    requirements: {
      minHabitsCompleted: 1,
      minLevel: 1,
    },
    rewards: {
      playerXp: 80,
      forgeXp: 60,
      gold: 75,
      attributeBoost: { discipline: 2, resilience: 1 },
      restorationPercent: 20,
    },
  },
  {
    id: 'chapter-2-reclaim-honor',
    number: 2,
    title: 'Chapter II: Reclaim Your Honor',
    subtitle: 'Tempering Steel & Purpose',
    narrationIntro:
      'An oath without action is mere ash. Inside the cold smithy beneath the battlements, the ancient anvil waits for a warrior disciplined enough to re-strike its iron.',
    npcSpeaker: 'Forgemaster Vaelen',
    npcRole: 'Armourer of the Fallen Guard',
    npcDialogue:
      '“Rust yields only to sweat and honest cadence. Inspect your steel, walk the Grand Bazaar, and train your body—then this citadel will recognize its champion once more.”',
    loreDiscovery:
      'Chronicle Fragment II: Every forged blade in Aetheria remembers the cadence of real-life reps and unwavering routines.',
    missionTitle: 'Complete the Honor Trial & First Training',
    missionSummary: 'Complete all steps of the "Reclaim Your Honor" quest and log at least 1 workout session (manual or Aether Vision).',
    requirements: {
      requireReclaimHonor: true,
      minWorkouts: 1,
      attributeKey: 'strength',
      minAttributeValue: 6,
    },
    rewards: {
      playerXp: 130,
      forgeXp: 100,
      gold: 120,
      attributeBoost: { strength: 2, discipline: 2 },
      restorationPercent: 40,
    },
  },
  {
    id: 'chapter-3-lost-guardians',
    number: 3,
    title: 'Chapter III: The Lost Guardians',
    subtitle: 'Echoes Across the Frontier',
    narrationIntro:
      'Beyond the western gate, smoke rises from the Forest of Discipline. Word spreads that surviving Sentinels have raised standards among the shattered watchtowers.',
    npcSpeaker: 'Warden Lyra',
    npcRole: 'Outrider of the Thornwood',
    npcDialogue:
      '“We held the ridge as long as supplies lasted, yet Void blight weakens any body starved of nourishment and rest. Feed your strength, clear the first Void Sovereign, and our banners join yours.”',
    loreDiscovery:
      'Chronicle Fragment III: The Five Guardians forged an accord after The Great Fall—whichever survivor restores body and resolve first shall rally all five orders.',
    missionTitle: 'Rally the Guardians',
    missionSummary: 'Nourish your strength (log 1+ meal), build Discipline to 10+, and defeat 1 Kingdom Void Boss.',
    requirements: {
      minMealsLogged: 1,
      minBossesDefeated: 1,
      attributeKey: 'discipline',
      minAttributeValue: 10,
    },
    rewards: {
      playerXp: 200,
      forgeXp: 160,
      gold: 180,
      attributeBoost: { vitality: 2, agility: 2 },
      restorationPercent: 60,
    },
  },
  {
    id: 'chapter-4-kingdom-reborn',
    number: 4,
    title: 'Chapter IV: The Kingdom Reborn',
    subtitle: 'Stones Raised by Resolve',
    narrationIntro:
      'Banner silk snaps once more along the high battlements. Craftsmen return to the plaza, torches blaze along every archway, and the broken tower rises toward clear twilight.',
    npcSpeaker: 'Commander Darion',
    npcRole: 'Marshal of the Restored Keep',
    npcDialogue:
      '“Look upward—the masonry binds cleanly again. Three Void strongholds lie shattered, and your six virtues burn like forge-iron at white heat.”',
    loreDiscovery:
      'Chronicle Fragment IV: Aetheria’s walls are bound not by mortar alone, but by daily perseverance verified across battle and craft.',
    missionTitle: 'Rebuild the Citadel Battlements',
    missionSummary: 'Reach Level 4+, log 3+ total workouts, and liberate at least 2 Corrupted Kingdoms.',
    requirements: {
      minLevel: 4,
      minWorkouts: 3,
      minBossesDefeated: 2,
      attributeKey: 'resilience',
      minAttributeValue: 12,
    },
    rewards: {
      playerXp: 280,
      forgeXp: 220,
      gold: 250,
      attributeBoost: { resilience: 3, strength: 2 },
      restorationPercent: 80,
    },
  },
  {
    id: 'chapter-5-final-ascension',
    number: 5,
    title: 'Chapter V: The Final Ascension',
    subtitle: 'Crown of Restored Aetheria',
    narrationIntro:
      'High above the mended spires, golden dawn breaks through the last Void clouds. The fallen who knelt in ruin now stands crowned in mastery—an unbroken sovereign of realm and self.',
    npcSpeaker: 'Archon Seraphina',
    npcRole: 'Voice of the Crown Archive',
    npcDialogue:
      '“The Great Fall broke steel and stone, yet failed to extinguish your will. Step onto the sunlit parapet—Aetheria rises whole through everything you forged each day.”',
    loreDiscovery:
      'Final Chronicle: Legends speak not of champions born flawless, but of those who rose from the Fall and turned every single day into honor restored.',
    missionTitle: 'Claim the Sovereign Crown',
    missionSummary: 'Reach Level 6+, accumulate 5+ completed habits or workouts, and overthrow 3+ Kingdom Bosses.',
    requirements: {
      minLevel: 6,
      minBossesDefeated: 3,
      attributeKey: 'intelligence',
      minAttributeValue: 14,
    },
    rewards: {
      playerXp: 450,
      forgeXp: 320,
      gold: 400,
      attributeBoost: { strength: 2, discipline: 2, intelligence: 2, vitality: 2, agility: 2, resilience: 2 },
      restorationPercent: 100,
    },
  },
];

export interface TutorialStepDefinition {
  id: string;
  title: string;
  sectionLabel: string;
  targetTab: string;
  targetSelector: string;
  description: string;
  actionTip: string;
}

export const TUTORIAL_STEPS: TutorialStepDefinition[] = [
  {
    id: 'tut-castle',
    title: 'Welcome to the Castle Courtyard',
    sectionLabel: '1 / 11 · The Castle',
    targetTab: 'dashboard',
    targetSelector: '[data-tutorial-id="castle-courtyard"]',
    description:
      'Your selected 3D hero stands within the ruined citadel of Aetheria. As you complete habits, workouts, and chapters, the courtyard visually restores around you.',
    actionTip: 'Drag anywhere inside the 3D scene to orbit around your hero, or switch camera presets.',
  },
  {
    id: 'tut-character',
    title: 'Hero Level & Six Attributes',
    sectionLabel: '2 / 11 · Character',
    targetTab: 'character',
    targetSelector: '[data-tutorial-id="character-attributes"]',
    description:
      'Track your Level alongside six independent RPG attributes—Strength, Discipline, Intelligence, Vitality, Agility, and Resilience—driven by your real actions.',
    actionTip: 'You can also switch between all five 3D heroes at any time without losing progress.',
  },
  {
    id: 'tut-quests',
    title: 'The Quest Board',
    sectionLabel: '3 / 11 · Quest Board',
    targetTab: 'quests',
    targetSelector: '[data-tutorial-id="quest-board"]',
    description:
      'Daily, weekly, and special bounties convert consistent wellness milestones into Player XP, Forge XP, and Gold.',
    actionTip: 'Check back after workouts or habit streaks to claim completed bounties.',
  },
  {
    id: 'tut-shop',
    title: 'The Royal Shop & Treasury',
    sectionLabel: '4 / 11 · Shop',
    targetTab: 'store',
    targetSelector: '[data-tutorial-id="shop-bazaar"]',
    description:
      'Spend hard-earned Gold and Forge XP on new swords, shields, armor sets, combat elixirs, and Beyond-Mythical progression relics.',
    actionTip: 'Click Inspect on any piece of gear to preview its stats and fulfill Reclaim Your Honor.',
  },
  {
    id: 'tut-armory',
    title: 'The Blacksmith Armoury',
    sectionLabel: '5 / 11 · Armoury',
    targetTab: 'armory',
    targetSelector: '[data-tutorial-id="armory-forge"]',
    description:
      'Equip weapons and shields, temper steel with Forge XP, hone Mastery abilities, and evolve legendary relics into higher realms.',
    actionTip: 'Select any owned item here to inspect it, equip it, or temper it at the anvil.',
  },
  {
    id: 'tut-habits',
    title: 'Daily & Weekly Discipline Habits',
    sectionLabel: '6 / 11 · Habits',
    targetTab: 'dashboard',
    targetSelector: '[data-tutorial-id="habits-panel"]',
    description:
      'Your daily habits anchor every hero’s restoration. Completing an introductory habit progresses your first quest and increases Discipline.',
    actionTip: 'Click an active habit on the Dashboard to claim its period reward.',
  },
  {
    id: 'tut-fitness',
    title: 'Fitness Log & Aether Vision',
    sectionLabel: '7 / 11 · Fitness',
    targetTab: 'fitness',
    targetSelector: '[data-tutorial-id="fitness-tracker"]',
    description:
      'Log strength, cardio, or mobility sessions manually—or use Aether Vision AI motion analysis for verified rep and form XP.',
    actionTip: 'Every workout strengthens your Strength, Agility, and Boss Battle readiness.',
  },
  {
    id: 'tut-nutrition',
    title: 'Nutrition & Hydration Ledger',
    sectionLabel: '8 / 11 · Nutrition',
    targetTab: 'nutrition',
    targetSelector: '[data-tutorial-id="nutrition-tracker"]',
    description:
      'Track balanced meals and analyze food photos with Aether Vision to boost your Vitality attribute and sustain combat buffs.',
    actionTip: 'Use Aether Vision or log a meal to earn daily nutrition XP.',
  },
  {
    id: 'tut-rewards',
    title: 'Achievements & Heroic Rewards',
    sectionLabel: '9 / 11 · Rewards',
    targetTab: 'achievements',
    targetSelector: '[data-tutorial-id="achievements-rewards"]',
    description:
      'Major milestones across quests, streaks, armor forging, and boss conquests unlock permanent achievements and bonus chests.',
    actionTip: 'Claim unlocked achievements here whenever badges glow gold.',
  },
  {
    id: 'tut-story',
    title: 'The Fallen Knight Campaign',
    sectionLabel: '10 / 11 · Story',
    targetTab: 'storyline',
    targetSelector: '[data-tutorial-id="story-campaign"]',
    description:
      'Follow five story chapters from The Awakening to The Final Ascension—discover lore fragments, meet citadel wardens, and unlock missions.',
    actionTip: 'Complete real-life objectives to claim chapter rewards and restore the Citadel.',
  },
  {
    id: 'tut-kingdom',
    title: 'Rebuild the Five Kingdoms',
    sectionLabel: '11 / 11 · Kingdom',
    targetTab: 'storyline',
    targetSelector: '[data-tutorial-id="kingdom-restoration"]',
    description:
      'Confront the Void Sovereigns across five corrupted provinces. Every boss victory pushes back the darkness across Aetheria.',
    actionTip: 'You are ready, Champion. You can replay this tour anytime inside Settings.',
  },
];
