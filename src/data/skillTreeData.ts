import {
  PlayerAttributeProgress,
  PlayerSkillTreeState,
  SkillActivityType,
  SkillAttributeId,
  SkillMilestoneDefinition,
  SkillNodeDefinition,
  SkillNodeStatus,
  SkillTreeAttributeDefinition,
} from '../types/game';

export const SKILL_ATTRIBUTE_IDS: SkillAttributeId[] = [
  'strength',
  'endurance',
  'discipline',
  'focus',
  'resilience',
  'vitality',
];

/**
 * Configurable 10-level cumulative XP thresholds per attribute (Lv.1 -> Lv.10).
 * Kept strictly independent from general Player XP & Gold progression.
 */
export const SKILL_LEVEL_XP_THRESHOLDS: readonly number[] = [
  0,    // Level 1
  100,  // Level 2
  240,  // Level 3
  420,  // Level 4
  650,  // Level 5
  940,  // Level 6
  1300, // Level 7
  1740, // Level 8
  2260, // Level 9
  2860, // Level 10 (Max)
];

export const MAX_SKILL_ATTRIBUTE_LEVEL = SKILL_LEVEL_XP_THRESHOLDS.length; // 10

/**
 * Daily healthy safety caps per attribute (prevents unsafe overtraining / grinding incentives).
 * Once the daily safety cap is reached, additional workouts still log cleanly in fitness history
 * without granting extra attribute XP that might encourage unhealthy exertion.
 */
export const DAILY_ATTRIBUTE_XP_CAPS: Record<SkillAttributeId, number> = {
  strength: 120,
  endurance: 120,
  discipline: 128,
  focus: 114,
  resilience: 72,
  vitality: 96,
};

export const ACTIVITY_TO_ATTRIBUTE_MAP: Record<SkillActivityType, SkillAttributeId> = {
  strength_workout: 'strength',
  cardio_workout: 'endurance',
  habit_completion: 'discipline',
  study_session: 'focus',
  comeback_activity: 'resilience',
  recovery_habit: 'vitality',
};

export const SKILL_TREE_ATTRIBUTES: SkillTreeAttributeDefinition[] = [
  {
    id: 'strength',
    name: 'Strength',
    subtitle: 'Iron Body & Controlled Power',
    description:
      'Cultivated through verified resistance workouts, bodyweight mastery, and deliberate muscular control.',
    verifiedSources: [
      'Aether Vision strength reps (squats, pushups, lunges)',
      'Verified resistance & strength gym sessions',
      'Fitness-category daily habit completions',
    ],
    accentHex: '#E07A5F',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.strength,
    branches: [
      {
        id: 'str-iron-foundation',
        attributeId: 'strength',
        name: 'Iron Foundation',
        subtitle: 'Posture, Brace & Joint Integrity',
        description: 'Build reliable form and core stability before chasing heavier resistance.',
      },
      {
        id: 'str-titan-force',
        attributeId: 'strength',
        name: 'Titan Force',
        subtitle: 'Progressive Resistance Mastery',
        description: 'Channel steady, injury-free strength output across full-body movements.',
      },
      {
        id: 'str-kinetic-control',
        attributeId: 'strength',
        name: 'Kinetic Control',
        subtitle: 'Tempo, Balance & Isometric Hold',
        description: 'Master slow eccentric tempo and balanced athletic tension.',
      },
    ],
    nodes: [
      {
        id: 'str-1a',
        attributeId: 'strength',
        branchId: 'str-iron-foundation',
        branchName: 'Iron Foundation',
        tier: 1,
        name: 'Grounded Stance',
        tagline: 'Alignment precedes load.',
        description: 'Establish safe joint tracking and breath bracing during your first resistance sessions.',
        realLifePractice: 'Complete any verified bodyweight or gym strength session with controlled form.',
        masteryTitle: 'Initiate of Iron',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'str-1b',
        attributeId: 'strength',
        branchId: 'str-iron-foundation',
        branchName: 'Iron Foundation',
        tier: 2,
        name: 'Pillar Core',
        tagline: 'Unshakeable center under effort.',
        description: 'Stabilize spine and hip hinge mechanics across multi-set resistance work.',
        realLifePractice: 'Accumulate 4 verified strength activities with consistent weekly pacing.',
        masteryTitle: 'Bastion Frame',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['str-1a'], minVerifiedActivities: 4 },
      },
      {
        id: 'str-1c',
        attributeId: 'strength',
        branchId: 'str-iron-foundation',
        branchName: 'Iron Foundation',
        tier: 3,
        name: 'Anvil Sovereign',
        tagline: 'Resilient joints across seasons.',
        description: 'Master lifelong sustainable strength mechanics without sacrificing recovery.',
        realLifePractice: 'Reach Strength Level 7 and sustain balanced training habits.',
        masteryTitle: 'Warden of Iron',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['str-1b'], minVerifiedActivities: 9 },
      },
      {
        id: 'str-2a',
        attributeId: 'strength',
        branchId: 'str-titan-force',
        branchName: 'Titan Force',
        tier: 1,
        name: 'First Forge Lift',
        tagline: 'Every rep leaves an imprint.',
        description: 'Build repeatable pushing and lower-body strength patterns.',
        realLifePractice: 'Log 2 verified strength training sessions.',
        masteryTitle: 'Forge Apprentice',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'str-2b',
        attributeId: 'strength',
        branchId: 'str-titan-force',
        branchName: 'Titan Force',
        tier: 2,
        name: 'Steel Leverage',
        tagline: 'Calm power through full range.',
        description: 'Improve mechanical efficiency across squats, lunges, and upper-body presses.',
        realLifePractice: 'Reach Strength Level 5 with 6 verified resistance sessions.',
        masteryTitle: 'Vanguard Striker',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['str-2a'], minVerifiedActivities: 6 },
      },
      {
        id: 'str-2c',
        attributeId: 'strength',
        branchId: 'str-titan-force',
        branchName: 'Titan Force',
        tier: 3,
        name: 'Colossus Poise',
        tagline: 'Strength tempered by wisdom.',
        description: 'Demonstrate mature compound strength anchored in steady, safe progression.',
        realLifePractice: 'Reach Strength Level 9 and 12 verified strength sessions.',
        masteryTitle: 'Titan Exemplar',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['str-2b'], minVerifiedActivities: 12 },
      },
      {
        id: 'str-3a',
        attributeId: 'strength',
        branchId: 'str-kinetic-control',
        branchName: 'Kinetic Control',
        tier: 1,
        name: 'Measured Tempo',
        tagline: 'Control beats haste.',
        description: 'Slow the lowering phase of every movement to engage stabilizer fibers.',
        realLifePractice: 'Reach Strength Level 2 and complete 2 verified strength activities.',
        masteryTitle: 'Tempo Keeper',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'str-3b',
        attributeId: 'strength',
        branchId: 'str-kinetic-control',
        branchName: 'Kinetic Control',
        tier: 2,
        name: 'Symmetric Drive',
        tagline: 'Balanced output left and right.',
        description: 'Eliminate side-to-side imbalances with unilateral and paused repetitions.',
        realLifePractice: 'Reach Strength Level 5 and unlock Steel Leverage or Measured Tempo.',
        masteryTitle: 'Equilibrium Blade',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['str-3a'], minVerifiedActivities: 5 },
      },
      {
        id: 'str-3c',
        attributeId: 'strength',
        branchId: 'str-kinetic-control',
        branchName: 'Kinetic Control',
        tier: 3,
        name: 'Master of Gravity',
        tagline: 'Effortless command of bodyweight.',
        description: 'Crown your physical strength path with crisp mastery of full-range control.',
        realLifePractice: 'Reach Strength Level 8 and 10 verified strength sessions.',
        masteryTitle: 'Aether Lifter',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['str-3b'], minVerifiedActivities: 10 },
      },
    ],
    milestones: [
      {
        id: 'ms-str-2',
        attributeId: 'strength',
        requiredLevel: 2,
        title: 'Spark of Iron',
        description: 'Completed your opening foundation in verified resistance training.',
        honorSeal: 'Bronze Gauntlet Seal',
      },
      {
        id: 'ms-str-5',
        attributeId: 'strength',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Tempered Vanguard',
        description: 'Reached Strength Level 5 with at least 3 unlocked Strength skill nodes.',
        honorSeal: 'Silver Anvil Crest',
      },
      {
        id: 'ms-str-8',
        attributeId: 'strength',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Citadel Lifter',
        description: 'Demonstrated sustained, safe resistance progression to Level 8.',
        honorSeal: 'Gilded Forge Sigil',
      },
      {
        id: 'ms-str-10',
        attributeId: 'strength',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of Iron',
        description: 'Attained maximum Level 10 mastery in Real-Life Strength.',
        honorSeal: 'Eternal Titan Crown',
      },
    ],
  },
  {
    id: 'endurance',
    name: 'Endurance',
    subtitle: 'Aerobic Stamina & Steady Pace',
    description:
      'Forged through verified walking, running, cycling, and rhythmic cardio conditioning.',
    verifiedSources: [
      'Verified running, walking, cycling & jumping-jack workouts',
      'Cardiovascular duration & distance logs',
    ],
    accentHex: '#38BDF8',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.endurance,
    branches: [
      {
        id: 'end-steady-stride',
        attributeId: 'endurance',
        name: 'Steady Stride',
        subtitle: 'Aerobic Engine & Breath',
        description: 'Cultivate calm nasal breathing and conversational aerobic base.',
      },
      {
        id: 'end-windrunner',
        attributeId: 'endurance',
        name: 'Windrunner',
        subtitle: 'Cadence & Rhythm',
        description: 'Sustain smooth pace transitions without burning out early.',
      },
      {
        id: 'end-horizon-keeper',
        attributeId: 'endurance',
        name: 'Horizon Keeper',
        subtitle: 'Long-Arc Stamina',
        description: 'Extend daily movement capacity sustainably across weeks.',
      },
    ],
    nodes: [
      {
        id: 'end-1a',
        attributeId: 'endurance',
        branchId: 'end-steady-stride',
        branchName: 'Steady Stride',
        tier: 1,
        name: 'Open Road',
        tagline: 'Step outside, find your rhythm.',
        description: 'Anchor your cardiovascular base with accessible walking or light cardio.',
        realLifePractice: 'Log your first verified cardio workout (walk, run, or cycle).',
        masteryTitle: 'Pathfinder',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'end-1b',
        attributeId: 'endurance',
        branchId: 'end-steady-stride',
        branchName: 'Steady Stride',
        tier: 2,
        name: 'Second Wind',
        tagline: 'Breath steadies the miles.',
        description: 'Maintain calm aerobic pacing even when initial fatigue arrives.',
        realLifePractice: 'Reach Endurance Level 4 and log 4 verified cardio sessions.',
        masteryTitle: 'Gale Strider',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['end-1a'], minVerifiedActivities: 4 },
      },
      {
        id: 'end-1c',
        attributeId: 'endurance',
        branchId: 'end-steady-stride',
        branchName: 'Steady Stride',
        tier: 3,
        name: 'Untiring Heart',
        tagline: 'Cardiovascular longevity.',
        description: 'Build an enduring aerobic base that supports daily energy and focus.',
        realLifePractice: 'Reach Endurance Level 7 and log 9 verified cardio sessions.',
        masteryTitle: 'Heartlands Runner',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['end-1b'], minVerifiedActivities: 9 },
      },
      {
        id: 'end-2a',
        attributeId: 'endurance',
        branchId: 'end-windrunner',
        branchName: 'Windrunner',
        tier: 1,
        name: 'Light Footwork',
        tagline: 'Crisp cadence, minimal impact.',
        description: 'Develop elastic stride efficiency across brisk walks or intervals.',
        realLifePractice: 'Reach Endurance Level 2 and complete 2 cardio workouts.',
        masteryTitle: 'Swift Courier',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'end-2b',
        attributeId: 'endurance',
        branchId: 'end-windrunner',
        branchName: 'Windrunner',
        tier: 2,
        name: 'Tempest Cadence',
        tagline: 'Consistent splits without strain.',
        description: 'Hold balanced output across moderate cardio durations.',
        realLifePractice: 'Reach Endurance Level 5 and complete 6 cardio workouts.',
        masteryTitle: 'Zephyr Vanguard',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['end-2a'], minVerifiedActivities: 6 },
      },
      {
        id: 'end-2c',
        attributeId: 'endurance',
        branchId: 'end-windrunner',
        branchName: 'Windrunner',
        tier: 3,
        name: 'Skyline Runner',
        tagline: 'Glide through distance.',
        description: 'Master relaxed speed and rapid cardiovascular recovery between efforts.',
        realLifePractice: 'Reach Endurance Level 9 and complete 12 cardio workouts.',
        masteryTitle: 'Windrunner Sovereign',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['end-2b'], minVerifiedActivities: 12 },
      },
      {
        id: 'end-3a',
        attributeId: 'endurance',
        branchId: 'end-horizon-keeper',
        branchName: 'Horizon Keeper',
        tier: 1,
        name: 'Daily Mileage',
        tagline: 'Small journeys compound.',
        description: 'Turn brief daily movement into a reliable cornerstone of energy.',
        realLifePractice: 'Reach Endurance Level 2 and accumulate 2 verified cardio logs.',
        masteryTitle: 'Trail Initiate',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'end-3b',
        attributeId: 'endurance',
        branchId: 'end-horizon-keeper',
        branchName: 'Horizon Keeper',
        tier: 2,
        name: 'Enduring Pacer',
        tagline: 'Smart pacing wins long arcs.',
        description: 'Respect recovery zones while steadily expanding sustainable stamina.',
        realLifePractice: 'Reach Endurance Level 6 and accumulate 6 verified cardio logs.',
        masteryTitle: 'Horizon Sentinel',
        requirements: { minAttributeLevel: 6, prerequisiteNodeIds: ['end-3a'], minVerifiedActivities: 6 },
      },
      {
        id: 'end-3c',
        attributeId: 'endurance',
        branchId: 'end-horizon-keeper',
        branchName: 'Horizon Keeper',
        tier: 3,
        name: 'Eternal Compass',
        tagline: 'Ready for any journey.',
        description: 'Attain balanced aerobic readiness for long treks and active days.',
        realLifePractice: 'Reach Endurance Level 8 and accumulate 10 verified cardio logs.',
        masteryTitle: 'Grand Explorer',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['end-3b'], minVerifiedActivities: 10 },
      },
    ],
    milestones: [
      {
        id: 'ms-end-2',
        attributeId: 'endurance',
        requiredLevel: 2,
        title: 'First Horizon',
        description: 'Built momentum with verified cardiovascular workouts.',
        honorSeal: 'Wayfarer Compass Seal',
      },
      {
        id: 'ms-end-5',
        attributeId: 'endurance',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Gale Pacer',
        description: 'Reached Endurance Level 5 with 3 Endurance nodes unlocked.',
        honorSeal: 'Azure Pinion Crest',
      },
      {
        id: 'ms-end-8',
        attributeId: 'endurance',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Starstride Warden',
        description: 'Sustained aerobic excellence through Level 8.',
        honorSeal: 'Golden Astrolabe Sigil',
      },
      {
        id: 'ms-end-10',
        attributeId: 'endurance',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of the Horizon',
        description: 'Attained Level 10 mastery in Real-Life Endurance.',
        honorSeal: 'Eternal Wind Crown',
      },
    ],
  },
  {
    id: 'discipline',
    name: 'Discipline',
    subtitle: 'Ritual Consistency & Follow-Through',
    description:
      'Earned by honoring daily commitments, completing verified habits, and finishing planned tasks.',
    verifiedSources: [
      'Verified daily & weekly habit completions',
      'Planned routine consistency streaks',
    ],
    accentHex: '#C5A15A',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.discipline,
    branches: [
      {
        id: 'dis-ritual-anchor',
        attributeId: 'discipline',
        name: 'Ritual Anchor',
        subtitle: 'Morning & Evening Cadence',
        description: 'Replace friction with clear, repeatable daily triggers.',
      },
      {
        id: 'dis-oathkeeper',
        attributeId: 'discipline',
        name: 'Oathkeeper',
        subtitle: 'Streak Integrity',
        description: 'Follow through on the promises you set for yourself.',
      },
      {
        id: 'dis-sovereign-will',
        attributeId: 'discipline',
        name: 'Sovereign Will',
        subtitle: 'Priority Execution',
        description: 'Focus energy on what matters most before distractions intrude.',
      },
    ],
    nodes: [
      {
        id: 'dis-1a',
        attributeId: 'discipline',
        branchId: 'dis-ritual-anchor',
        branchName: 'Ritual Anchor',
        tier: 1,
        name: 'First Oath',
        tagline: 'Keep one promise today.',
        description: 'Initiate your daily anchor routine without waiting for perfect motivation.',
        realLifePractice: 'Complete any verified discipline or routine habit.',
        masteryTitle: 'Oath Initiate',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'dis-1b',
        attributeId: 'discipline',
        branchId: 'dis-ritual-anchor',
        branchName: 'Ritual Anchor',
        tier: 2,
        name: 'Clockwork Dawn',
        tagline: 'Start strong, finish calm.',
        description: 'Lock in reliable daily cue-to-action habits that run smoothly.',
        realLifePractice: 'Reach Discipline Level 4 and verify 5 habit completions.',
        masteryTitle: 'Dawn Keeper',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['dis-1a'], minVerifiedActivities: 5 },
      },
      {
        id: 'dis-1c',
        attributeId: 'discipline',
        branchId: 'dis-ritual-anchor',
        branchName: 'Ritual Anchor',
        tier: 3,
        name: 'Citadel Routine',
        tagline: 'Structure creates freedom.',
        description: 'Turn daily essentials into effortless autopilot.',
        realLifePractice: 'Reach Discipline Level 7 and verify 10 habit completions.',
        masteryTitle: 'Architect of Order',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['dis-1b'], minVerifiedActivities: 10 },
      },
      {
        id: 'dis-2a',
        attributeId: 'discipline',
        branchId: 'dis-oathkeeper',
        branchName: 'Oathkeeper',
        tier: 1,
        name: 'Unbroken Link',
        tagline: 'Respect the chain.',
        description: 'Treat each completed habit as a stone laid in your citadel wall.',
        realLifePractice: 'Reach Discipline Level 2 and complete 2 verified discipline actions.',
        masteryTitle: 'Chainbearer',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'dis-2b',
        attributeId: 'discipline',
        branchId: 'dis-oathkeeper',
        branchName: 'Oathkeeper',
        tier: 2,
        name: 'Steel Calendar',
        tagline: 'Consistency over intensity.',
        description: 'Sustain reliable follow-through across busy weekdays and weekends.',
        realLifePractice: 'Reach Discipline Level 5 and complete 6 verified discipline actions.',
        masteryTitle: 'Oath Warden',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['dis-2a'], minVerifiedActivities: 6 },
      },
      {
        id: 'dis-2c',
        attributeId: 'discipline',
        branchId: 'dis-oathkeeper',
        branchName: 'Oathkeeper',
        tier: 3,
        name: 'Golden Word',
        tagline: 'When spoken, it is done.',
        description: 'Embody trustworthy self-leadership in every daily commitment.',
        realLifePractice: 'Reach Discipline Level 9 and complete 14 verified discipline actions.',
        masteryTitle: 'Sovereign Oathkeeper',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['dis-2b'], minVerifiedActivities: 14 },
      },
      {
        id: 'dis-3a',
        attributeId: 'discipline',
        branchId: 'dis-sovereign-will',
        branchName: 'Sovereign Will',
        tier: 1,
        name: 'Clear Priorities',
        tagline: 'Decide before the noise begins.',
        description: 'Identify the single non-negotiable action each day.',
        realLifePractice: 'Reach Discipline Level 2 and verify 2 habit actions.',
        masteryTitle: 'Vanguard Planner',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'dis-3b',
        attributeId: 'discipline',
        branchId: 'dis-sovereign-will',
        branchName: 'Sovereign Will',
        tier: 2,
        name: 'Friction Breaker',
        tagline: 'Begin within five minutes.',
        description: 'Overcome hesitation and procrastination through immediate small starts.',
        realLifePractice: 'Reach Discipline Level 6 and verify 7 habit actions.',
        masteryTitle: 'Threshold Breaker',
        requirements: { minAttributeLevel: 6, prerequisiteNodeIds: ['dis-3a'], minVerifiedActivities: 7 },
      },
      {
        id: 'dis-3c',
        attributeId: 'discipline',
        branchId: 'dis-sovereign-will',
        branchName: 'Sovereign Will',
        tier: 3,
        name: 'Command of Self',
        tagline: 'Quiet, decisive execution.',
        description: 'Direct your habits and daily plans with calm precision.',
        realLifePractice: 'Reach Discipline Level 8 and verify 11 habit actions.',
        masteryTitle: 'Grand Marshal',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['dis-3b'], minVerifiedActivities: 11 },
      },
    ],
    milestones: [
      {
        id: 'ms-dis-2',
        attributeId: 'discipline',
        requiredLevel: 2,
        title: 'Keeper of Ritual',
        description: 'Proven consistency across your foundational habits.',
        honorSeal: 'Brass Hourglass Seal',
      },
      {
        id: 'ms-dis-5',
        attributeId: 'discipline',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Steadfast Sentinel',
        description: 'Reached Discipline Level 5 with 3 Discipline nodes unlocked.',
        honorSeal: 'Gilded Key Crest',
      },
      {
        id: 'ms-dis-8',
        attributeId: 'discipline',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Ironbound Steward',
        description: 'Maintained high-integrity routines to Discipline Level 8.',
        honorSeal: 'Citadel Ledger Sigil',
      },
      {
        id: 'ms-dis-10',
        attributeId: 'discipline',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of Discipline',
        description: 'Attained maximum Level 10 mastery in Real-Life Discipline.',
        honorSeal: 'Sovereign Laurel Crown',
      },
    ],
  },
  {
    id: 'focus',
    name: 'Focus',
    subtitle: 'Deep Work, Study & Clarity',
    description:
      'Sharpened through verified study sessions, mindfulness habits, and intellectual quest reflections.',
    verifiedSources: [
      'Verified Study & Focus Timer / Reflection sessions',
      'Mindfulness & reading habit completions',
      'Intellectual AI Quest evidence submissions',
    ],
    accentHex: '#A78BFA',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.focus,
    branches: [
      {
        id: 'foc-quiet-mind',
        attributeId: 'focus',
        name: 'Quiet Mind',
        subtitle: 'Stillness & Attention Control',
        description: 'Clear mental static before diving into meaningful work.',
      },
      {
        id: 'foc-deep-scholar',
        attributeId: 'focus',
        name: 'Deep Scholar',
        subtitle: 'Sustained Study Blocks',
        description: 'Extend uninterrupted concentration across meaningful learning.',
      },
      {
        id: 'foc-arcane-clarity',
        attributeId: 'focus',
        name: 'Arcane Clarity',
        subtitle: 'Synthesis & Skill Recall',
        description: 'Reflect, distill, and apply what you study to real problems.',
      },
    ],
    nodes: [
      {
        id: 'foc-1a',
        attributeId: 'focus',
        branchId: 'foc-quiet-mind',
        branchName: 'Quiet Mind',
        tier: 1,
        name: 'Single-Point Gaze',
        tagline: 'One task, full presence.',
        description: 'Silence competing tabs and dedicate unbroken minutes to one objective.',
        realLifePractice: 'Log 1 verified study session or mindfulness habit.',
        masteryTitle: 'Stillwater Seeker',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'foc-1b',
        attributeId: 'focus',
        branchId: 'foc-quiet-mind',
        branchName: 'Quiet Mind',
        tier: 2,
        name: 'Noise Ward',
        tagline: 'Guard the gates of attention.',
        description: 'Notice distraction urges without yielding to impulsive context switching.',
        realLifePractice: 'Reach Focus Level 4 and complete 4 verified focus sessions.',
        masteryTitle: 'Veil Watcher',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['foc-1a'], minVerifiedActivities: 4 },
      },
      {
        id: 'foc-1c',
        attributeId: 'focus',
        branchId: 'foc-quiet-mind',
        branchName: 'Quiet Mind',
        tier: 3,
        name: 'Mirror Lake',
        tagline: 'Undisturbed depth.',
        description: 'Enter deep concentration calmly on demand.',
        realLifePractice: 'Reach Focus Level 7 and complete 8 verified focus sessions.',
        masteryTitle: 'Sage of Stillness',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['foc-1b'], minVerifiedActivities: 8 },
      },
      {
        id: 'foc-2a',
        attributeId: 'focus',
        branchId: 'foc-deep-scholar',
        branchName: 'Deep Scholar',
        tier: 1,
        name: 'Candlelight Study',
        tagline: 'Deliberate blocks beat cramming.',
        description: 'Structure learning into focused 25-to-45 minute study sprints.',
        realLifePractice: 'Reach Focus Level 2 and complete 2 verified study sessions.',
        masteryTitle: 'Archive Reader',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'foc-2b',
        attributeId: 'focus',
        branchId: 'foc-deep-scholar',
        branchName: 'Deep Scholar',
        tier: 2,
        name: 'Scholarly Flow',
        tagline: 'Sustained cognitive endurance.',
        description: 'Stay absorbed in challenging material with structured review breaks.',
        realLifePractice: 'Reach Focus Level 5 and complete 6 verified study sessions.',
        masteryTitle: 'Lorekeeper',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['foc-2a'], minVerifiedActivities: 6 },
      },
      {
        id: 'foc-2c',
        attributeId: 'focus',
        branchId: 'foc-deep-scholar',
        branchName: 'Deep Scholar',
        tier: 3,
        name: 'Grand Codex',
        tagline: 'Mastery of complex craft.',
        description: 'Synthesize deep domains through disciplined daily learning.',
        realLifePractice: 'Reach Focus Level 9 and complete 11 verified study sessions.',
        masteryTitle: 'Archmage of Craft',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['foc-2b'], minVerifiedActivities: 11 },
      },
      {
        id: 'foc-3a',
        attributeId: 'focus',
        branchId: 'foc-arcane-clarity',
        branchName: 'Arcane Clarity',
        tier: 1,
        name: 'Active Recall',
        tagline: 'Test what you learn.',
        description: 'Close the book and summarize key principles in your own words.',
        realLifePractice: 'Reach Focus Level 2 and verify 2 focus reflections.',
        masteryTitle: 'Insight Scribe',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'foc-3b',
        attributeId: 'focus',
        branchId: 'foc-arcane-clarity',
        branchName: 'Arcane Clarity',
        tier: 2,
        name: 'Pattern Weaver',
        tagline: 'Connect ideas across fields.',
        description: 'Spot mental models that accelerate skill acquisition.',
        realLifePractice: 'Reach Focus Level 6 and verify 6 focus sessions.',
        masteryTitle: 'Astrolabe Mind',
        requirements: { minAttributeLevel: 6, prerequisiteNodeIds: ['foc-3a'], minVerifiedActivities: 6 },
      },
      {
        id: 'foc-3c',
        attributeId: 'focus',
        branchId: 'foc-arcane-clarity',
        branchName: 'Arcane Clarity',
        tier: 3,
        name: 'Luminous Intellect',
        tagline: 'Clarity under complexity.',
        description: 'Distill difficult problems into crisp, actionable solutions.',
        realLifePractice: 'Reach Focus Level 8 and verify 10 focus sessions.',
        masteryTitle: 'Luminary Scholar',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['foc-3b'], minVerifiedActivities: 10 },
      },
    ],
    milestones: [
      {
        id: 'ms-foc-2',
        attributeId: 'focus',
        requiredLevel: 2,
        title: 'Lit Lantern',
        description: 'Completed your opening deep-work and study milestones.',
        honorSeal: 'Amethyst Quill Seal',
      },
      {
        id: 'ms-foc-5',
        attributeId: 'focus',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Sanctum Scholar',
        description: 'Reached Focus Level 5 with 3 Focus skill nodes unlocked.',
        honorSeal: 'Arcane Prism Crest',
      },
      {
        id: 'ms-foc-8',
        attributeId: 'focus',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Citadel Sage',
        description: 'Sustained deep concentration mastery through Level 8.',
        honorSeal: 'Astral Tome Sigil',
      },
      {
        id: 'ms-foc-10',
        attributeId: 'focus',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of Focus',
        description: 'Attained maximum Level 10 mastery in Real-Life Focus.',
        honorSeal: 'Eternal Mind Crown',
      },
    ],
  },
  {
    id: 'resilience',
    name: 'Resilience',
    subtitle: 'Comeback Momentum & Grit',
    description:
      'Forged when you return after a missed day, adapt under stress, and rebuild momentum.',
    verifiedSources: [
      'Consistent comeback activity after missed days',
      'Gentle-comeback / reset recovery actions & boss resilience triumphs',
    ],
    accentHex: '#F59E0B',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.resilience,
    branches: [
      {
        id: 'res-ember-rising',
        attributeId: 'resilience',
        name: 'Ember Rising',
        subtitle: 'Never Miss Twice',
        description: 'Turn setbacks into calm restarts without guilt spirals.',
      },
      {
        id: 'res-stoic-bulwark',
        attributeId: 'resilience',
        name: 'Stoic Bulwark',
        subtitle: 'Composure Under Pressure',
        description: 'Stay steady when schedules shift or obstacles test your plans.',
      },
      {
        id: 'res-phoenix-resolve',
        attributeId: 'resilience',
        name: 'Phoenix Resolve',
        subtitle: 'Long-Arc Perseverance',
        description: 'Sustain grit across months, not just lucky weeks.',
      },
    ],
    nodes: [
      {
        id: 'res-1a',
        attributeId: 'resilience',
        branchId: 'res-ember-rising',
        branchName: 'Ember Rising',
        tier: 1,
        name: 'Second Spark',
        tagline: 'Returning is victory.',
        description: 'Show up for a modest action right after a tough or missed day.',
        realLifePractice: 'Record your first verified comeback or resilience check-in.',
        masteryTitle: 'Ember Keeper',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'res-1b',
        attributeId: 'resilience',
        branchId: 'res-ember-rising',
        branchName: 'Ember Rising',
        tier: 2,
        name: 'Never Miss Twice',
        tagline: 'Break the slide early.',
        description: 'Normalize imperfect days and immediately re-anchor the next morning.',
        realLifePractice: 'Reach Resilience Level 4 and record 3 comeback actions.',
        masteryTitle: 'Ashwalker',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['res-1a'], minVerifiedActivities: 3 },
      },
      {
        id: 'res-1c',
        attributeId: 'resilience',
        branchId: 'res-ember-rising',
        branchName: 'Ember Rising',
        tier: 3,
        name: 'Undying Flame',
        tagline: 'Continuity across all seasons.',
        description: 'Keep your long-term compass intact regardless of temporary detours.',
        realLifePractice: 'Reach Resilience Level 7 and record 6 comeback actions.',
        masteryTitle: 'Flamebearer',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['res-1b'], minVerifiedActivities: 6 },
      },
      {
        id: 'res-2a',
        attributeId: 'resilience',
        branchId: 'res-stoic-bulwark',
        branchName: 'Stoic Bulwark',
        tier: 1,
        name: 'Steady Breath',
        tagline: 'Pause before reacting.',
        description: 'Meet daily friction with measured composure and practical adjustments.',
        realLifePractice: 'Reach Resilience Level 2 and complete 2 resilience activities.',
        masteryTitle: 'Calm Sentinel',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'res-2b',
        attributeId: 'resilience',
        branchId: 'res-stoic-bulwark',
        branchName: 'Stoic Bulwark',
        tier: 2,
        name: 'Iron Composure',
        tagline: 'Adapt the plan, keep the mission.',
        description: 'Scale workouts or tasks down intelligently instead of quitting entirely.',
        realLifePractice: 'Reach Resilience Level 5 and complete 4 resilience activities.',
        masteryTitle: 'Bastion Guard',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['res-2a'], minVerifiedActivities: 4 },
      },
      {
        id: 'res-2c',
        attributeId: 'resilience',
        branchId: 'res-stoic-bulwark',
        branchName: 'Stoic Bulwark',
        tier: 3,
        name: 'Unbreakable Shield',
        tagline: 'Storms pass; granite remains.',
        description: 'Demonstrate mature emotional steadiness through prolonged challenges.',
        realLifePractice: 'Reach Resilience Level 9 and complete 8 resilience activities.',
        masteryTitle: 'Aegis Sovereign',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['res-2b'], minVerifiedActivities: 8 },
      },
      {
        id: 'res-3a',
        attributeId: 'resilience',
        branchId: 'res-phoenix-resolve',
        branchName: 'Phoenix Resolve',
        tier: 1,
        name: 'Scaled Comeback',
        tagline: 'Smart restarts protect momentum.',
        description: 'Honor energy limits on return days so habits feel welcoming again.',
        realLifePractice: 'Reach Resilience Level 2 and complete 2 resilience activities.',
        masteryTitle: 'Dawn Initiate',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'res-3b',
        attributeId: 'resilience',
        branchId: 'res-phoenix-resolve',
        branchName: 'Phoenix Resolve',
        tier: 2,
        name: 'Renewal Cycle',
        tagline: 'Rest is part of perseverance.',
        description: 'Balance effort with deliberate recovery so grit lasts for years.',
        realLifePractice: 'Reach Resilience Level 6 and complete 5 resilience activities.',
        masteryTitle: 'Suncrest Warden',
        requirements: { minAttributeLevel: 6, prerequisiteNodeIds: ['res-3a'], minVerifiedActivities: 5 },
      },
      {
        id: 'res-3c',
        attributeId: 'resilience',
        branchId: 'res-phoenix-resolve',
        branchName: 'Phoenix Resolve',
        tier: 3,
        name: 'Phoenix Ascendant',
        tagline: 'Stronger for every return.',
        description: 'Embody durable self-compassion paired with relentless perseverance.',
        realLifePractice: 'Reach Resilience Level 8 and complete 7 resilience activities.',
        masteryTitle: 'Phoenix Champion',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['res-3b'], minVerifiedActivities: 7 },
      },
    ],
    milestones: [
      {
        id: 'ms-res-2',
        attributeId: 'resilience',
        requiredLevel: 2,
        title: 'Rekindled Ember',
        description: 'Proved that setbacks never end your journey.',
        honorSeal: 'Amber Phoenix Seal',
      },
      {
        id: 'ms-res-5',
        attributeId: 'resilience',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Stormbound Defender',
        description: 'Reached Resilience Level 5 with 3 Resilience nodes unlocked.',
        honorSeal: 'Tempered Shield Crest',
      },
      {
        id: 'ms-res-8',
        attributeId: 'resilience',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Unfallen Knight',
        description: 'Demonstrated steady comeback grit through Level 8.',
        honorSeal: 'Sunfire Bulwark Sigil',
      },
      {
        id: 'ms-res-10',
        attributeId: 'resilience',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of Resilience',
        description: 'Attained maximum Level 10 mastery in Real-Life Resilience.',
        honorSeal: 'Immortal Phoenix Crown',
      },
    ],
  },
  {
    id: 'vitality',
    name: 'Vitality',
    subtitle: 'Recovery, Nourishment & Rest',
    description:
      'Nurtured through hydration goals, balanced meals, restorative sleep, and yoga/mobility recovery.',
    verifiedSources: [
      'Balanced nutrition & meal logging',
      'Daily 8-glass hydration goal completions',
      'Sleep, recovery & yoga mobility sessions',
    ],
    accentHex: '#34D399',
    dailySafetyCapXp: DAILY_ATTRIBUTE_XP_CAPS.vitality,
    branches: [
      {
        id: 'vit-living-spring',
        attributeId: 'vitality',
        name: 'Living Spring',
        subtitle: 'Hydration & Cellular Energy',
        description: 'Keep mind and muscles hydrated consistently from morning onward.',
      },
      {
        id: 'vit-verdant-hearth',
        attributeId: 'vitality',
        name: 'Verdant Hearth',
        subtitle: 'Nourishing Fuel',
        description: 'Power training and cognition with mindful, balanced meals.',
      },
      {
        id: 'vit-moonlit-renewal',
        attributeId: 'vitality',
        name: 'Moonlit Renewal',
        subtitle: 'Sleep & Active Recovery',
        description: 'Respect rest, mobility, and restorative sleep as core RPG growth.',
      },
    ],
    nodes: [
      {
        id: 'vit-1a',
        attributeId: 'vitality',
        branchId: 'vit-living-spring',
        branchName: 'Living Spring',
        tier: 1,
        name: 'Pure Wellspring',
        tagline: 'Hydration fuels clarity.',
        description: 'Anchor hydration early in the day to support physical and mental energy.',
        realLifePractice: 'Complete your first recovery, nutrition, or hydration milestone.',
        masteryTitle: 'Spring Keeper',
        requirements: { minAttributeLevel: 1, prerequisiteNodeIds: [], minVerifiedActivities: 1 },
      },
      {
        id: 'vit-1b',
        attributeId: 'vitality',
        branchId: 'vit-living-spring',
        branchName: 'Living Spring',
        tier: 2,
        name: 'Flowing Current',
        tagline: 'Steady energy without crashes.',
        description: 'Maintain consistent daily hydration alongside balanced electrolytes.',
        realLifePractice: 'Reach Vitality Level 4 and record 4 recovery/nutrition actions.',
        masteryTitle: 'Tide Warden',
        requirements: { minAttributeLevel: 4, prerequisiteNodeIds: ['vit-1a'], minVerifiedActivities: 4 },
      },
      {
        id: 'vit-1c',
        attributeId: 'vitality',
        branchId: 'vit-living-spring',
        branchName: 'Living Spring',
        tier: 3,
        name: 'Fountain of Aether',
        tagline: 'Radiant daily readiness.',
        description: 'Sustain effortless hydration habits across every training cycle.',
        realLifePractice: 'Reach Vitality Level 7 and record 9 recovery/nutrition actions.',
        masteryTitle: 'Aether Lifegiver',
        requirements: { minAttributeLevel: 7, prerequisiteNodeIds: ['vit-1b'], minVerifiedActivities: 9 },
      },
      {
        id: 'vit-2a',
        attributeId: 'vitality',
        branchId: 'vit-verdant-hearth',
        branchName: 'Verdant Hearth',
        tier: 1,
        name: 'Mindful Table',
        tagline: 'Fuel with intention.',
        description: 'Track balanced meals with awareness of whole foods and protein.',
        realLifePractice: 'Reach Vitality Level 2 and record 2 nourishment/recovery logs.',
        masteryTitle: 'Hearth Steward',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'vit-2b',
        attributeId: 'vitality',
        branchId: 'vit-verdant-hearth',
        branchName: 'Verdant Hearth',
        tier: 2,
        name: 'Balanced Alchemy',
        tagline: 'Steady blood sugar, steady mood.',
        description: 'Pair micronutrients, fiber, and protein to sustain all-day focus.',
        realLifePractice: 'Reach Vitality Level 5 and record 6 nourishment/recovery logs.',
        masteryTitle: 'Verdant Alchemist',
        requirements: { minAttributeLevel: 5, prerequisiteNodeIds: ['vit-2a'], minVerifiedActivities: 6 },
      },
      {
        id: 'vit-2c',
        attributeId: 'vitality',
        branchId: 'vit-verdant-hearth',
        branchName: 'Verdant Hearth',
        tier: 3,
        name: 'Evergreen Harvest',
        tagline: 'Nourishment as craft.',
        description: 'Live an adaptable, joyful nutrition rhythm that supports lifelong health.',
        realLifePractice: 'Reach Vitality Level 9 and record 12 nourishment/recovery logs.',
        masteryTitle: 'Master Herbalist',
        requirements: { minAttributeLevel: 9, prerequisiteNodeIds: ['vit-2b'], minVerifiedActivities: 12 },
      },
      {
        id: 'vit-3a',
        attributeId: 'vitality',
        branchId: 'vit-moonlit-renewal',
        branchName: 'Moonlit Renewal',
        tier: 1,
        name: 'Gentle Mobility',
        tagline: 'Loosen what tension locks.',
        description: 'Dedicate restorative minutes to yoga, stretching, or evening wind-down.',
        realLifePractice: 'Reach Vitality Level 2 and complete 2 recovery actions.',
        masteryTitle: 'Moonlight Initiate',
        requirements: { minAttributeLevel: 2, prerequisiteNodeIds: [], minVerifiedActivities: 2 },
      },
      {
        id: 'vit-3b',
        attributeId: 'vitality',
        branchId: 'vit-moonlit-renewal',
        branchName: 'Moonlit Renewal',
        tier: 2,
        name: 'Deep Slumber',
        tagline: 'Growth happens in recovery.',
        description: 'Protect consistent sleep routines for hormonal and cognitive restoration.',
        realLifePractice: 'Reach Vitality Level 6 and complete 6 recovery actions.',
        masteryTitle: 'Dream Sanctuary',
        requirements: { minAttributeLevel: 6, prerequisiteNodeIds: ['vit-3a'], minVerifiedActivities: 6 },
      },
      {
        id: 'vit-3c',
        attributeId: 'vitality',
        branchId: 'vit-moonlit-renewal',
        branchName: 'Moonlit Renewal',
        tier: 3,
        name: 'World-Tree Bloom',
        tagline: 'Restored body, serene spirit.',
        description: 'Harmonize training, nourishment, hydration, and deep sleep.',
        realLifePractice: 'Reach Vitality Level 8 and complete 10 recovery actions.',
        masteryTitle: 'Golden Grove Guardian',
        requirements: { minAttributeLevel: 8, prerequisiteNodeIds: ['vit-3b'], minVerifiedActivities: 10 },
      },
    ],
    milestones: [
      {
        id: 'ms-vit-2',
        attributeId: 'vitality',
        requiredLevel: 2,
        title: 'First Sprout',
        description: 'Cultivated foundational hydration, nourishment, and recovery habits.',
        honorSeal: 'Emerald Leaf Seal',
      },
      {
        id: 'ms-vit-5',
        attributeId: 'vitality',
        requiredLevel: 5,
        requiredNodesUnlocked: 3,
        title: 'Grove Tender',
        description: 'Reached Vitality Level 5 with 3 Vitality skill nodes unlocked.',
        honorSeal: 'Living Spring Crest',
      },
      {
        id: 'ms-vit-8',
        attributeId: 'vitality',
        requiredLevel: 8,
        requiredNodesUnlocked: 6,
        title: 'Sanctuary Healer',
        description: 'Mastered balanced nourishment and restorative recovery through Level 8.',
        honorSeal: 'Golden Canopy Sigil',
      },
      {
        id: 'ms-vit-10',
        attributeId: 'vitality',
        requiredLevel: 10,
        requiredNodesUnlocked: 8,
        title: 'Paragon of Vitality',
        description: 'Attained maximum Level 10 mastery in Real-Life Vitality.',
        honorSeal: 'World-Tree Crown',
      },
    ],
  },
];

export const getSkillAttributeById = (
  attributeId: SkillAttributeId
): SkillTreeAttributeDefinition => {
  return (
    SKILL_TREE_ATTRIBUTES.find(a => a.id === attributeId) ||
    SKILL_TREE_ATTRIBUTES[0]
  );
};

export const getSkillNodeById = (nodeId: string): SkillNodeDefinition | undefined => {
  for (const attr of SKILL_TREE_ATTRIBUTES) {
    const found = attr.nodes.find(n => n.id === nodeId);
    if (found) return found;
  }
  return undefined;
};

export const getSkillMilestoneById = (
  milestoneId: string
): SkillMilestoneDefinition | undefined => {
  for (const attr of SKILL_TREE_ATTRIBUTES) {
    const found = attr.milestones.find(m => m.id === milestoneId);
    if (found) return found;
  }
  return undefined;
};

export const computeAttributeLevelFromXp = (xp: number): number => {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  let level = 1;
  for (let i = 0; i < SKILL_LEVEL_XP_THRESHOLDS.length; i++) {
    if (safeXp >= SKILL_LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(MAX_SKILL_ATTRIBUTE_LEVEL, Math.max(1, level));
};

export const computeAttributeProgress = (
  attributeId: SkillAttributeId,
  xp: number,
  totalActivities: number = 0,
  dailyXpEarned: number = 0,
  lastActivityAt: string | null = null
): PlayerAttributeProgress => {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  const level = computeAttributeLevelFromXp(safeXp);
  const currentThreshold = SKILL_LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold =
    level >= MAX_SKILL_ATTRIBUTE_LEVEL
      ? currentThreshold
      : SKILL_LEVEL_XP_THRESHOLDS[level] ?? currentThreshold + 500;

  const xpIntoCurrentLevel = Math.max(0, safeXp - currentThreshold);
  const xpForNextLevel =
    level >= MAX_SKILL_ATTRIBUTE_LEVEL
      ? 0
      : Math.max(1, nextThreshold - currentThreshold);
  const progressPercent =
    level >= MAX_SKILL_ATTRIBUTE_LEVEL
      ? 100
      : Math.min(100, Math.round((xpIntoCurrentLevel / xpForNextLevel) * 100));

  const cap = DAILY_ATTRIBUTE_XP_CAPS[attributeId];
  const safeDaily = Math.max(0, Math.floor(Number.isFinite(dailyXpEarned) ? dailyXpEarned : 0));

  return {
    attributeId,
    xp: safeXp,
    level,
    xpIntoCurrentLevel,
    xpForNextLevel,
    progressPercent,
    totalActivities: Math.max(0, Math.floor(totalActivities || 0)),
    dailyXpEarned: safeDaily,
    dailyCapRemaining: Math.max(0, cap - safeDaily),
    lastActivityAt,
  };
};

export const createEmptySkillTreeState = (): PlayerSkillTreeState => {
  const attributes = {} as Record<SkillAttributeId, PlayerAttributeProgress>;
  for (const attrId of SKILL_ATTRIBUTE_IDS) {
    attributes[attrId] = computeAttributeProgress(attrId, 0, 0, 0, null);
  }
  return {
    attributes,
    unlockedNodeIds: [],
    claimedMilestoneIds: [],
    recentEvents: [],
  };
};

export const evaluateSkillNodeStatus = (
  node: SkillNodeDefinition,
  attrProgress: PlayerAttributeProgress,
  unlockedNodeIds: string[]
): { status: SkillNodeStatus; unmetReasons: string[] } => {
  if (unlockedNodeIds.includes(node.id)) {
    return { status: 'unlocked', unmetReasons: [] };
  }

  const unmetReasons: string[] = [];
  if (attrProgress.level < node.requirements.minAttributeLevel) {
    unmetReasons.push(
      `Requires ${getSkillAttributeById(node.attributeId).name} Level ${node.requirements.minAttributeLevel} (currently Lv.${attrProgress.level})`
    );
  }

  const minActs = node.requirements.minVerifiedActivities ?? 0;
  if (minActs > 0 && attrProgress.totalActivities < minActs) {
    unmetReasons.push(
      `Requires ${minActs} verified ${getSkillAttributeById(node.attributeId).name} ${
        minActs === 1 ? 'activity' : 'activities'
      } (${attrProgress.totalActivities}/${minActs})`
    );
  }

  for (const prereqId of node.requirements.prerequisiteNodeIds) {
    if (!unlockedNodeIds.includes(prereqId)) {
      const prereqNode = getSkillNodeById(prereqId);
      unmetReasons.push(`Requires prerequisite node: ${prereqNode?.name || prereqId}`);
    }
  }

  return {
    status: unmetReasons.length === 0 ? 'available' : 'locked',
    unmetReasons,
  };
};

export interface VerifiedActivityMetadata {
  durationMinutes?: number;
  repetitions?: number;
  distanceKm?: number;
  verifiedWithAetherVision?: boolean;
  streak?: number;
  subAction?: 'meal' | 'hydration_goal' | 'sleep' | 'yoga' | 'reflection' | 'habit' | 'quest';
}

/**
 * Authoritative Skill XP calculation engine (shared by backend & tests).
 * - Never trusts client-provided XP values.
 * - Clamps physiological effort bounds (e.g. max 45m/workout, max 60m/study) so
 *   excessive/unsafe exercise yields ZERO extra advantage.
 * - Enforces daily healthy cap per attribute.
 */
export const calculateSafeVerifiedActivityXp = (
  activityType: SkillActivityType,
  metadata: VerifiedActivityMetadata = {},
  currentDailyXp: number = 0
): {
  attributeId: SkillAttributeId;
  rawXp: number;
  xpAwarded: number;
  safetyCapped: boolean;
} => {
  const attributeId = ACTIVITY_TO_ATTRIBUTE_MAP[activityType];
  const cap = DAILY_ATTRIBUTE_XP_CAPS[attributeId];

  // Clamp inputs strictly to healthy physiological ranges
  const duration = Math.min(45, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  const studyDuration = Math.min(60, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  const reps = Math.min(60, Math.max(0, Math.round(Number(metadata.repetitions) || 0)));
  const distance = Math.min(8, Math.max(0, Number(metadata.distanceKm) || 0));
  const streak = Math.min(14, Math.max(0, Math.round(Number(metadata.streak) || 0)));
  const visionBonus = metadata.verifiedWithAetherVision ? 8 : 0;

  let rawXp = 0;

  switch (activityType) {
    case 'strength_workout': {
      const durPart = Math.min(10, Math.floor(duration / 4));
      const repPart = Math.min(8, Math.floor(reps / 8));
      rawXp = 18 + Math.min(14, durPart + repPart) + visionBonus; // Max 40 XP
      break;
    }
    case 'cardio_workout': {
      const durPart = Math.min(12, Math.floor(duration / 3));
      const distPart = Math.min(8, Math.floor(distance * 2));
      rawXp = 18 + Math.min(14, Math.max(durPart, distPart)) + visionBonus; // Max 40 XP
      break;
    }
    case 'habit_completion': {
      const streakPart = Math.min(10, Math.floor(streak / 2));
      rawXp = 22 + streakPart; // Max 32 XP
      break;
    }
    case 'study_session': {
      const studyPart = studyDuration >= 10 ? Math.min(18, Math.floor(studyDuration / 3)) : 6;
      rawXp = 20 + studyPart; // Max 38 XP
      break;
    }
    case 'comeback_activity': {
      const bounceBonus = metadata.subAction === 'quest' ? 10 : 6;
      rawXp = 26 + bounceBonus; // Max 36 XP
      break;
    }
    case 'recovery_habit': {
      if (metadata.subAction === 'sleep' || metadata.subAction === 'yoga') {
        rawXp = 24 + Math.min(8, Math.floor(duration / 5)); // Max 32 XP
      } else if (metadata.subAction === 'hydration_goal') {
        rawXp = 22;
      } else {
        rawXp = 16; // Balanced meal nourishment
      }
      break;
    }
    default: {
      rawXp = 0;
    }
  }

  const remaining = Math.max(0, cap - Math.max(0, Math.floor(currentDailyXp || 0)));
  const xpAwarded = Math.max(0, Math.min(rawXp, remaining));
  const safetyCapped = xpAwarded < rawXp;

  return {
    attributeId,
    rawXp,
    xpAwarded,
    safetyCapped,
  };
};
