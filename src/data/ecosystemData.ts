import type {
  CommunityEvent,
  MentorRecommendedQuest,
  MuseumCategory,
  MuseumLockedMilestone,
  RivalChallengeType,
  SkillActivityType,
  WeeklyBossEvent,
  WeeklyBossMission,
} from '../types/game';
import type { VerifiedActivityMetadata } from './skillTreeData';

// --- SAFETY CAPS & CENTRALIZED REWARD BOUNDARIES ---

export const DAILY_BOSS_DAMAGE_CAP = 320;
export const DAILY_RIVAL_SCORE_CAP = 180;
export const DAILY_COMMUNITY_POINTS_CAP = 200;

export const getCurrentWeekKey = (now: Date = new Date()): string => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getCurrentWeekWindow = (now: Date = new Date()): { startsAt: string; endsAt: string } => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // 1 Mon .. 7 Sun
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dayNum - 1));
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  sunday.setUTCHours(0, 0, 0, 0);

  return {
    startsAt: monday.toISOString(),
    endsAt: sunday.toISOString(),
  };
};

// --- PHASE 2: WEEKLY BOSS CONFIG & AUTHORITATIVE DAMAGE ---

export const createDefaultWeeklyBossEvent = (now: Date = new Date()): WeeklyBossEvent => {
  const weekKey = getCurrentWeekKey(now);
  const { startsAt, endsAt } = getCurrentWeekWindow(now);
  return {
    id: `wb-${weekKey}`,
    weekKey,
    bossName: 'Malakor, Titan of the Obsidian Gate',
    bossTitle: 'Weekly Community Raid Boss',
    bossDescription:
      'An armored colossus forged from stagnation and missed promises. Every verified workout, study session, consistency habit, and mindful recovery strike weakens its obsidian plating.',
    artworkKey: 'weekly_boss_titan',
    difficulty: 'Mythic',
    totalHealth: 10000,
    currentHealth: 10000,
    startsAt,
    endsAt,
    status: 'active',
    missions: [
      {
        id: 'wbm-workouts-3',
        title: 'Vanguard Conditioning',
        description: 'Complete 3 verified workouts this week (strength or cardio).',
        activityFilter: 'any_workout',
        targetCount: 3,
        damageReward: 180,
        playerXpReward: 65,
        goldReward: 50,
      },
      {
        id: 'wbm-cardio-2',
        title: 'Horizon Striders',
        description: 'Complete 2 verified cardio sessions (walk, run, or cycling).',
        activityFilter: 'cardio',
        targetCount: 2,
        damageReward: 140,
        playerXpReward: 50,
        goldReward: 40,
      },
      {
        id: 'wbm-habits-5',
        title: 'Oath of Consistency',
        description: 'Log 5 verified daily habit completions across the week.',
        activityFilter: 'habit',
        targetCount: 5,
        damageReward: 160,
        playerXpReward: 60,
        goldReward: 45,
      },
      {
        id: 'wbm-recovery-2',
        title: 'Sanctuary & Mind',
        description: 'Complete 2 recovery, study, hydration, or sleep restoration actions.',
        activityFilter: 'recovery',
        targetCount: 2,
        damageReward: 120,
        playerXpReward: 45,
        goldReward: 35,
      },
    ],
    milestones: [
      {
        id: 'wbmil-150',
        title: 'First Vanguard Strike',
        damageRequired: 150,
        playerXpReward: 40,
        goldReward: 30,
      },
      {
        id: 'wbmil-400',
        title: 'Gatebreaker Oath',
        damageRequired: 400,
        playerXpReward: 75,
        goldReward: 60,
      },
      {
        id: 'wbmil-750',
        title: 'Titanbane Champion',
        damageRequired: 750,
        playerXpReward: 120,
        goldReward: 95,
      },
    ],
    rewards: {
      participationXp: 45,
      participationGold: 35,
      defeatXp: 150,
      defeatForgeXp: 110,
      defeatGold: 120,
      topContributorBonusXp: 90,
      topContributorBonusGold: 80,
    },
    totalParticipants: 0,
    totalHits: 0,
    defeatedAt: null,
  };
};

export const doesActivityMatchBossMission = (
  mission: WeeklyBossMission,
  activityType: SkillActivityType
): boolean => {
  switch (mission.activityFilter) {
    case 'any_workout':
      return activityType === 'strength_workout' || activityType === 'cardio_workout';
    case 'cardio':
      return activityType === 'cardio_workout';
    case 'strength':
      return activityType === 'strength_workout';
    case 'habit':
      return activityType === 'habit_completion' || activityType === 'comeback_activity';
    case 'study':
      return activityType === 'study_session';
    case 'recovery':
      return activityType === 'recovery_habit' || activityType === 'study_session';
    default:
      return false;
  }
};

/**
 * Trusted server-side boss damage computation.
 * - Ignores client damage assertions completely.
 * - Clamps effort inputs to healthy ceilings.
 * - Recovery & rest activities deal supportive Sanctuary Strike damage so rest days never penalize players.
 */
export const calculateSafeBossDamage = (
  activityType: SkillActivityType,
  metadata: VerifiedActivityMetadata = {},
  currentDailyDamage: number = 0
): { rawDamage: number; damageDealt: number; safetyCapped: boolean; actionLabel: string } => {
  const duration = Math.min(45, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  const reps = Math.min(60, Math.max(0, Math.round(Number(metadata.repetitions) || 0)));
  const visionBonus = metadata.verifiedWithAetherVision ? 25 : 0;

  let rawDamage = 45;
  let actionLabel = 'Verified Activity Strike';

  switch (activityType) {
    case 'strength_workout':
      rawDamage = 65 + Math.min(35, Math.floor(duration / 2) + Math.floor(reps / 4)) + visionBonus;
      actionLabel = 'Iron Vanguard Strike';
      break;
    case 'cardio_workout':
      rawDamage = 65 + Math.min(35, Math.floor(duration * 0.8)) + visionBonus;
      actionLabel = 'Tempest Pace Assault';
      break;
    case 'habit_completion':
      rawDamage = 55 + Math.min(20, Math.floor((Number(metadata.streak) || 0) * 2));
      actionLabel = 'Oathkeeper Seal';
      break;
    case 'study_session':
      rawDamage = 55 + Math.min(25, Math.floor(duration / 2));
      actionLabel = 'Arcane Insight Pulse';
      break;
    case 'comeback_activity':
      rawDamage = 75;
      actionLabel = 'Phoenix Comeback Cleave';
      break;
    case 'recovery_habit':
      // Balanced recovery & rest never penalized; grants supportive shield-piercing strike
      rawDamage = 55;
      actionLabel = 'Sanctuary Restoration Ward';
      break;
  }

  const remaining = Math.max(0, DAILY_BOSS_DAMAGE_CAP - Math.max(0, Math.floor(currentDailyDamage)));
  const damageDealt = Math.max(0, Math.min(rawDamage, remaining));
  return {
    rawDamage,
    damageDealt,
    safetyCapped: damageDealt < rawDamage,
    actionLabel,
  };
};

// --- PHASE 3: RIVAL SYSTEM CONFIG & SCORING ---

export const RIVAL_CHALLENGE_CATALOG: Record<
  RivalChallengeType,
  {
    title: string;
    description: string;
    unitLabel: string;
  }
> = {
  weekly_activity_score: {
    title: 'Weekly Activity Score',
    description: 'Balanced 7-day duel across workouts, habits, study focus, and recovery.',
    unitLabel: 'pts',
  },
  workout_consistency: {
    title: 'Workout Consistency',
    description: 'Normalized points for steady workouts and restorative yoga/recovery days.',
    unitLabel: 'pts',
  },
  strength_milestones: {
    title: 'Strength Milestones',
    description: 'Focused 7-day duel on verified resistance & bodyweight sessions.',
    unitLabel: 'pts',
  },
  endurance_achievements: {
    title: 'Endurance Achievements',
    description: 'Focused 7-day duel on verified walks, runs, and cardio pacing.',
    unitLabel: 'pts',
  },
  habit_completion: {
    title: 'Habit Completion',
    description: 'Daily discipline, hydration, and routine consistency duel.',
    unitLabel: 'pts',
  },
};

export const calculateSafeRivalScoreDelta = (
  challengeType: RivalChallengeType,
  activityType: SkillActivityType,
  metadata: VerifiedActivityMetadata = {},
  currentDailyScore: number = 0
): { pointsAwarded: number; safetyCapped: boolean; label: string } => {
  const duration = Math.min(45, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  const visionBonus = metadata.verifiedWithAetherVision ? 8 : 0;

  let rawPoints = 0;
  let label = 'Verified Contribution';

  switch (challengeType) {
    case 'weekly_activity_score':
      if (activityType === 'strength_workout' || activityType === 'cardio_workout') {
        rawPoints = 30 + Math.min(12, Math.floor(duration / 4)) + visionBonus;
        label = 'Verified Training Session';
      } else if (activityType === 'habit_completion' || activityType === 'comeback_activity') {
        rawPoints = 25;
        label = 'Habit Consistency';
      } else {
        rawPoints = 22;
        label = 'Focus & Recovery';
      }
      break;
    case 'workout_consistency':
      if (activityType === 'strength_workout' || activityType === 'cardio_workout') {
        rawPoints = 35 + visionBonus;
        label = 'Workout Session';
      } else if (activityType === 'recovery_habit') {
        rawPoints = 25; // Rest/recovery respected
        label = 'Active Recovery';
      }
      break;
    case 'strength_milestones':
      if (activityType === 'strength_workout') {
        rawPoints = 36 + Math.min(12, Math.floor(duration / 4)) + visionBonus;
        label = 'Strength Training';
      } else if (activityType === 'recovery_habit') {
        rawPoints = 14;
        label = 'Recovery Support';
      }
      break;
    case 'endurance_achievements':
      if (activityType === 'cardio_workout') {
        rawPoints = 36 + Math.min(12, Math.floor(duration / 4)) + visionBonus;
        label = 'Endurance Session';
      } else if (activityType === 'recovery_habit') {
        rawPoints = 14;
        label = 'Hydration & Rest';
      }
      break;
    case 'habit_completion':
      if (activityType === 'habit_completion' || activityType === 'comeback_activity') {
        rawPoints = 32;
        label = 'Verified Habit';
      } else if (activityType === 'recovery_habit' || activityType === 'study_session') {
        rawPoints = 20;
        label = 'Daily Wellness Routine';
      }
      break;
  }

  const remaining = Math.max(0, DAILY_RIVAL_SCORE_CAP - Math.max(0, Math.floor(currentDailyScore)));
  const pointsAwarded = Math.max(0, Math.min(rawPoints, remaining));
  return {
    pointsAwarded,
    safetyCapped: pointsAwarded < rawPoints,
    label,
  };
};

// --- PHASE 5: COMMUNITY EVENTS CONFIG ---

export const createDefaultCommunityEvent = (now: Date = new Date()): CommunityEvent => {
  const weekKey = getCurrentWeekKey(now);
  const { startsAt, endsAt } = getCurrentWeekWindow(now);
  return {
    id: `ce-golden-canopy-${weekKey}`,
    title: 'Festival of the Golden Canopy',
    subtitle: 'Realm-Wide Wellness & Restoration Chronicle',
    description:
      'Every champion across Aetheria contributes verified workouts, mindful study, balanced meals, and daily habits to rekindle the Golden World Tree.',
    themeColor: '#C5A15A',
    status: 'active',
    startsAt,
    endsAt,
    targetGoalPoints: 6000,
    currentGoalPoints: 0,
    participantsCount: 0,
    milestones: [
      {
        id: 'cem-1000',
        title: 'Roots Rekindled',
        targetPoints: 1000,
        rewardXp: 35,
        rewardGold: 25,
      },
      {
        id: 'cem-3000',
        title: 'Boughs of Gold',
        targetPoints: 3000,
        rewardXp: 65,
        rewardGold: 55,
      },
      {
        id: 'cem-6000',
        title: 'Eternal Canopy Bloom',
        targetPoints: 6000,
        rewardXp: 110,
        rewardGold: 95,
      },
    ],
  };
};

export const calculateSafeCommunityPoints = (
  activityType: SkillActivityType,
  metadata: VerifiedActivityMetadata = {},
  currentDailyPoints: number = 0
): { pointsAwarded: number; safetyCapped: boolean } => {
  const duration = Math.min(45, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  let raw = 25;
  if (activityType === 'strength_workout' || activityType === 'cardio_workout') {
    raw = 30 + Math.min(15, Math.floor(duration / 3));
  } else if (activityType === 'comeback_activity') {
    raw = 35;
  } else if (activityType === 'recovery_habit') {
    raw = 25;
  }
  const remaining = Math.max(
    0,
    DAILY_COMMUNITY_POINTS_CAP - Math.max(0, Math.floor(currentDailyPoints))
  );
  const pointsAwarded = Math.max(0, Math.min(raw, remaining));
  return { pointsAwarded, safetyCapped: pointsAwarded < raw };
};

// --- PHASE 4: AI MENTOR VALIDATION ---

const UNSAFE_MENTOR_REGEX =
  /\b(starve|starving|fast for days|purging|purge|laxative|steroid|ephedra|500\s*kcal|800\s*kcal|no rest|ignore pain|train through injury)\b/i;

export const validateMentorRecommendedQuest = (
  raw: any
): { valid: boolean; quest?: Omit<MentorRecommendedQuest, 'id' | 'accepted' | 'createdAt'>; reason?: string } => {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, reason: 'Missing quest payload.' };
  }

  const title = String(raw.title || '').trim().slice(0, 80);
  const description = String(raw.description || '').trim().slice(0, 260);
  const objectiveLabel = String(raw.objectiveLabel || '').trim().slice(0, 120);
  const rationale = String(raw.rationale || '').trim().slice(0, 200);

  if (title.length < 4 || description.length < 10) {
    return { valid: false, reason: 'Quest title or description is incomplete.' };
  }

  if (UNSAFE_MENTOR_REGEX.test(`${title} ${description} ${objectiveLabel}`)) {
    return { valid: false, reason: 'Quest violated safe fitness guidelines.' };
  }

  const validCategories = new Set(['physical', 'intellectual', 'discipline', 'personal_growth', 'social']);
  const category = validCategories.has(raw.category) ? raw.category : 'physical';

  const validDiffs = new Set(['easy', 'medium', 'challenging']);
  const difficulty = validDiffs.has(raw.difficulty) ? raw.difficulty : 'medium';

  const validEvidence = new Set([
    'workout_minutes',
    'workout_sessions',
    'vision_reps',
    'habit_completions',
    'meal_logs',
    'water_glasses',
    'study_or_skill_reflection',
    'personal_reflection',
  ]);
  let evidenceType = validEvidence.has(raw.evidenceType) ? String(raw.evidenceType) : 'workout_sessions';
  let unitLabel = String(raw.unitLabel || 'session').trim().slice(0, 24) || 'session';
  const estimatedMinutes = Math.min(60, Math.max(5, Math.round(Number(raw.estimatedMinutes || 20))));
  let maxProgress = Math.min(60, Math.max(1, Math.round(Number(raw.maxProgress || 1))));

  if (evidenceType === 'workout_sessions' && /min/i.test(unitLabel) && maxProgress >= 10) {
    evidenceType = 'workout_minutes';
    unitLabel = 'min';
  }
  if (evidenceType === 'study_or_skill_reflection' || evidenceType === 'personal_reflection') {
    maxProgress = 1;
  } else if (evidenceType === 'workout_sessions') {
    maxProgress = Math.min(2, Math.max(1, maxProgress));
    unitLabel = 'session';
  } else if (evidenceType === 'workout_minutes') {
    maxProgress = Math.min(60, Math.max(10, maxProgress));
    unitLabel = 'min';
  } else if (evidenceType === 'habit_completions' || evidenceType === 'meal_logs') {
    maxProgress = Math.min(3, Math.max(1, maxProgress));
  } else if (evidenceType === 'water_glasses') {
    maxProgress = Math.min(8, Math.max(4, maxProgress));
    unitLabel = 'glasses';
  }

  // Server-bounded central rewards (AI can NEVER dictate arbitrary/unbounded rewards)
  const playerXpReward = difficulty === 'challenging' ? 55 : difficulty === 'medium' ? 40 : 25;
  const forgeXpReward = difficulty === 'challenging' ? 40 : difficulty === 'medium' ? 28 : 18;
  const goldReward = difficulty === 'challenging' ? 45 : difficulty === 'medium' ? 30 : 20;

  return {
    valid: true,
    quest: {
      title,
      description,
      category,
      difficulty,
      estimatedMinutes,
      objectiveLabel: objectiveLabel || description,
      evidenceType: evidenceType as MentorRecommendedQuest['evidenceType'],
      maxProgress,
      unitLabel,
      playerXpReward,
      forgeXpReward,
      goldReward,
      rationale: rationale || 'Tailored safely to your recent progression and recovery rhythm.',
    },
  };
};

// --- PHASE 6: PERSONAL RECORDS MUSEUM CONFIG ---

export const MUSEUM_CATEGORY_META: Record<
  MuseumCategory,
  { label: string; description: string }
> = {
  fitness: { label: 'Fitness Records', description: 'Verified workout duration and activity milestones.' },
  strength: { label: 'Strength Milestones', description: 'Resistance rep records and Strength Skill Tree mastery.' },
  endurance: { label: 'Endurance Milestones', description: 'Cardio distance, sustained pace, and Endurance Tree mastery.' },
  consistency: { label: 'Consistency', description: 'Habit streaks, comeback surges, and Discipline Tree breakthroughs.' },
  personal_best: { label: 'Personal Bests', description: 'All-time verified personal records preserved with full history.' },
  boss_battle: { label: 'Boss Battles', description: 'Weekly Raid triumphs, top damage strikes, and titan victories.' },
  rivalry: { label: 'Rivalry Victories', description: 'Head-to-head 7-day friend duel triumphs and streaks.' },
  community_event: { label: 'Community Events', description: 'Realm-wide event milestones and collective contributions.' },
  seasonal: { label: 'Seasonal Chronicles', description: 'Limited-window seasonal honors earned across Aetheria.' },
  rare_legendary: { label: 'Rare & Legendary', description: 'Mythic Skill Tree peaks and extraordinary milestones.' },
};

export const MUSEUM_LOCKED_MILESTONES: MuseumLockedMilestone[] = [
  {
    id: 'mlm-first-workout',
    category: 'fitness',
    title: 'First Verified Training',
    description: 'Log any verified workout session in Fitness Log or Aether Vision.',
    requirementText: 'Complete 1 verified workout session',
    rarity: 'Common',
  },
  {
    id: 'mlm-strength-lv3',
    category: 'strength',
    title: 'Tempered Vanguard',
    description: 'Reach Level 3 in the Strength Skill Tree through verified training.',
    requirementText: 'Strength Skill Tree Level 3',
    rarity: 'Rare',
  },
  {
    id: 'mlm-endurance-lv3',
    category: 'endurance',
    title: 'Horizon Strider',
    description: 'Reach Level 3 in Endurance through steady walks, runs, or cycling.',
    requirementText: 'Endurance Skill Tree Level 3',
    rarity: 'Rare',
  },
  {
    id: 'mlm-comeback',
    category: 'consistency',
    title: 'Unfallen Ember',
    description: 'Record a verified comeback activity or unlock a Discipline skill node.',
    requirementText: 'Complete 1 comeback or Discipline breakthrough',
    rarity: 'Rare',
  },
  {
    id: 'mlm-boss-victor',
    category: 'boss_battle',
    title: 'Titanbane Raid Record',
    description: 'Contribute to defeating a Weekly Community Raid Boss.',
    requirementText: 'Defeat 1 Weekly Raid Boss with the realm',
    rarity: 'Epic',
  },
  {
    id: 'mlm-rival-winner',
    category: 'rivalry',
    title: 'Duelist of Honor',
    description: 'Win a completed 7-day Friend Rivalry challenge.',
    requirementText: 'Win 1 Friend Rivalry duel',
    rarity: 'Epic',
  },
  {
    id: 'mlm-community-hero',
    category: 'community_event',
    title: 'Golden Canopy Steward',
    description: 'Contribute verified activities to a realm-wide Community Event.',
    requirementText: 'Earn 100+ Community Event points',
    rarity: 'Rare',
  },
  {
    id: 'mlm-paragon-legend',
    category: 'rare_legendary',
    title: 'World-Tree Paragon',
    description: 'Unlock 12+ Skill Tree nodes across your six core attributes.',
    requirementText: 'Unlock 12 Real-Life Skill Tree nodes',
    rarity: 'Mythic',
  },
];
