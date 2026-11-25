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
    id: 'visit_fitness',
    label: 'Enter Training Grounds',
    hint: 'Visit the Fitness Log or Aether Vision to review your bodyweight conditioning.',
    targetTab: 'fitness',
  },
  {
    id: 'visit_shop',
    label: 'Visit the Shop',
    hint: 'Browse the Aetheria Grand Bazaar to see combat elixirs and cosmetics.',
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
      'Cold starlight filters through the cracked archways of the Inner Keep. Beside a dying brazier, you steady your breathing, plant your feet, and feel the first pulse of Aether stir within your chest.',
    npcSpeaker: 'Elder Thane',
    npcRole: 'Last Keeper of the Citadel Gate',
    npcDialogue:
      '“You breathe yet, champion. Look upon these ruined flagstones—not with despair, but as foundation stones waiting for steady hands and strong legs. One true habit kindles the first flame.”',
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
      gold: 75,
      attributeBoost: { discipline: 2, resilience: 1 },
      restorationPercent: 20,
    },
  },
  {
    id: 'chapter-2-reclaim-honor',
    number: 2,
    title: 'Chapter II: Reclaim Your Honor',
    subtitle: 'Conditioning Body & Purpose',
    narrationIntro:
      'An oath without action is mere ash. Across the training yard beneath the battlements, the stone ring waits for a fighter disciplined enough to build strength through bodyweight exercise.',
    npcSpeaker: 'Warden Vaelen',
    npcRole: 'Master of the Citadel Yard',
    npcDialogue:
      '“Doubt yields only to sweat and honest cadence. Train your hands and legs, walk the Grand Bazaar, and log your conditioning—then this citadel will recognize its champion once more.”',
    loreDiscovery:
      'Chronicle Fragment II: Every stance and strike in Aetheria draws its power from real-life bodyweight reps and unwavering routines.',
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
      'Chronicle Fragment III: The Five Guardians sealed an accord after The Great Fall—whichever survivor restores body and resolve first shall rally all five orders.',
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
      'Banner silk snaps once more along the high battlements. Builders return to the plaza, torches blaze along every archway, and the broken tower rises toward clear twilight.',
    npcSpeaker: 'Commander Darion',
    npcRole: 'Marshal of the Restored Keep',
    npcDialogue:
      '“Look upward—the masonry binds cleanly again. Three Void strongholds lie shattered, and your six virtues burn with hard-earned endurance.”',
    loreDiscovery:
      'Chronicle Fragment IV: Aetheria’s walls are bound not by mortar alone, but by daily perseverance verified across training and battle.',
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
      '“The Great Fall broke stone and banner, yet failed to extinguish your will. Step onto the sunlit parapet—Aetheria rises whole through everything you built each day.”',
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
    sectionLabel: '1 / 10 · The Castle',
    targetTab: 'dashboard',
    targetSelector: '[data-tutorial-id="castle-courtyard"]',
    description:
      'Your selected 3D hero stands within the ruined citadel of Aetheria. As you complete habits, workouts, and chapters, the courtyard visually restores around you.',
    actionTip: 'Drag anywhere inside the 3D scene to orbit around your hero, or switch camera presets.',
  },
  {
    id: 'tut-character',
    title: 'Hero Level & Six Attributes',
    sectionLabel: '2 / 10 · Character',
    targetTab: 'character',
    targetSelector: '[data-tutorial-id="character-attributes"]',
    description:
      'Track your Level alongside six independent RPG attributes—Strength, Discipline, Intelligence, Vitality, Agility, and Resilience—driven by your real-life bodyweight training and habits.',
    actionTip: 'Inspect your Hands & Legs combat readiness inside your Character Profile.',
  },
  {
    id: 'tut-quests',
    title: 'The Quest Board',
    sectionLabel: '3 / 10 · Quest Board',
    targetTab: 'quests',
    targetSelector: '[data-tutorial-id="quest-board"]',
    description:
      'Daily, weekly, and special bounties convert consistent wellness milestones into Player XP and Gold.',
    actionTip: 'Check back after workouts or habit streaks to claim completed bounties.',
  },
  {
    id: 'tut-shop',
    title: 'The Royal Shop & Cosmetics',
    sectionLabel: '4 / 10 · Shop',
    targetTab: 'store',
    targetSelector: '[data-tutorial-id="shop-bazaar"]',
    description:
      'Spend hard-earned Gold on combat elixirs, recovery tonics, and cosmetic style upgrades.',
    actionTip: 'Visit the Royal Bazaar to fulfill Reclaim Your Honor and stock combat buffs.',
  },
  {
    id: 'tut-habits',
    title: 'Daily & Weekly Discipline Habits',
    sectionLabel: '5 / 10 · Habits',
    targetTab: 'dashboard',
    targetSelector: '[data-tutorial-id="habits-panel"]',
    description:
      'Your daily habits anchor every hero’s restoration. Completing an introductory habit progresses your first quest and increases Discipline.',
    actionTip: 'Click an active habit on the Dashboard to claim its period reward.',
  },
  {
    id: 'tut-fitness',
    title: 'Fitness Log & Aether Vision',
    sectionLabel: '6 / 10 · Fitness',
    targetTab: 'fitness',
    targetSelector: '[data-tutorial-id="fitness-tracker"]',
    description:
      'Log bodyweight strength, cardio, or mobility sessions manually—or use Aether Vision AI motion analysis for verified rep and form XP.',
    actionTip: 'Every workout builds Strength and Agility for unarmed Hands & Legs Boss Battles.',
  },
  {
    id: 'tut-nutrition',
    title: 'Nutrition & Hydration Ledger',
    sectionLabel: '7 / 10 · Nutrition',
    targetTab: 'nutrition',
    targetSelector: '[data-tutorial-id="nutrition-tracker"]',
    description:
      'Track balanced meals and analyze food photos with Aether Vision to boost your Vitality attribute and sustain combat buffs.',
    actionTip: 'Use Aether Vision or log a meal to earn daily nutrition XP.',
  },
  {
    id: 'tut-rewards',
    title: 'Achievements & Heroic Rewards',
    sectionLabel: '8 / 10 · Rewards',
    targetTab: 'achievements',
    targetSelector: '[data-tutorial-id="achievements-rewards"]',
    description:
      'Major milestones across quests, streaks, training, and boss conquests unlock permanent achievements and bonus chests.',
    actionTip: 'Claim unlocked achievements here whenever badges glow gold.',
  },
  {
    id: 'tut-story',
    title: 'The Fallen Knight Campaign',
    sectionLabel: '9 / 10 · Story',
    targetTab: 'storyline',
    targetSelector: '[data-tutorial-id="story-campaign"]',
    description:
      'Follow five story chapters from The Awakening to The Final Ascension—discover lore fragments, meet citadel wardens, and unlock missions.',
    actionTip: 'Complete real-life objectives to claim chapter rewards and restore the Citadel.',
  },
  {
    id: 'tut-kingdom',
    title: 'Rebuild the Five Kingdoms',
    sectionLabel: '10 / 10 · Kingdom',
    targetTab: 'storyline',
    targetSelector: '[data-tutorial-id="kingdom-restoration"]',
    description:
      'Confront the Void Sovereigns across five corrupted provinces using disciplined Hands & Legs bodyweight techniques.',
    actionTip: 'You are ready, Champion. You can replay this tour anytime inside Settings.',
  },
];
