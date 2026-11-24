import type {
  CommunityEvent,
  DuelExerciseDefinition,
  DuelExerciseId,
  MentorRecommendedQuest,
  MuseumCategory,
  MuseumLockedMilestone,
  RivalChallengeType,
  SkillActivityType,
  WeeklyBossEvent,
  WeeklyBossMission,
} from '../types/game.ts';
import type { VerifiedActivityMetadata } from './skillTreeData.ts';

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

// --- PHASE 2 (COMPETITIVE ARENA): REAL-LIFE 1v1 SAME-EXERCISE DUEL CONFIG ---

export const DEFAULT_DUEL_DURATION_SECONDS = 180; // 3 minutes default
export const MIN_DUEL_DURATION_SECONDS = 60;      // 1 minute minimum
export const MAX_DUEL_DURATION_SECONDS = 300;     // 5 minutes absolute maximum

export const DUEL_EXERCISE_IDS: DuelExerciseId[] = [
  'pushup',
  'squat',
  'situp',
  'jumping_jack',
  'lunge',
  'knee_raise',
];

export const DUEL_EXERCISES_CATALOG: Record<DuelExerciseId, DuelExerciseDefinition> = {
  pushup: {
    id: 'pushup',
    name: 'Push-ups',
    shortTag: '3 pts / rep',
    pointsPerRep: 3,
    minRepIntervalMs: 620,
    maxRepsPerMinute: 55,
    description:
      'Lower your chest steadily in a straight plank line until elbows bend cleanly, then press back to full extension.',
    cameraSetupTip: 'Place your camera at floor or low-table height angled 45° to show shoulders, elbows, hips, and knees.',
    warmupGuidance: 'Warm up with 15–20 seconds of shoulder circles, wrist rolls, and 3 slow practice push-ups.',
    accessibleModification: 'Knees-down or wall/incline push-ups with full elbow flexion are valid and welcome.',
    formCues: [
      'Keep your core braced and torso aligned.',
      'Reach ~98° or deeper elbow bend at the bottom.',
      'Lock out arms smoothly at the top to credit each rep.',
    ],
  },
  squat: {
    id: 'squat',
    name: 'Squats',
    shortTag: '2 pts / rep',
    pointsPerRep: 2,
    minRepIntervalMs: 700,
    maxRepsPerMinute: 50,
    description:
      'Stand shoulder-width apart, hinge hips back with chest lifted until knees bend cleanly, then drive back to standing.',
    cameraSetupTip: 'Step back 1.8–2.5m so your head, hips, knees, and ankles fit inside the frame.',
    warmupGuidance: 'Warm up with 20 seconds of hip circles, ankle tilts, and 3 gentle bodyweight quarter-squats.',
    accessibleModification: 'Chair-touch or box squats at a comfortable knee angle count cleanly.',
    formCues: [
      'Keep heels planted and chest tall.',
      'Lower until knees bend past ~112°.',
      'Return fully upright (~152°+) between repetitions.',
    ],
  },
  situp: {
    id: 'situp',
    name: 'Sit-ups',
    shortTag: '2 pts / rep',
    pointsPerRep: 2,
    minRepIntervalMs: 750,
    maxRepsPerMinute: 45,
    description:
      'Lie back with knees bent and feet planted, curl your torso upward smoothly toward your knees, and lower with control.',
    cameraSetupTip: 'Position the camera to your side at mat level so shoulder, hip, and knee angles are clearly visible.',
    warmupGuidance: 'Warm up with gentle cat-cow spine mobility and 2–3 controlled half-crunches before starting.',
    accessibleModification: 'Avoid pulling on your neck—crisp arms-crossed crunches or partial curls count safely.',
    formCues: [
      'Keep knees bent throughout every rep.',
      'Flex torso toward knees (~82° or less hip angle).',
      'Lower shoulder blades back toward the mat (~118°+) to reset.',
    ],
  },
  jumping_jack: {
    id: 'jumping_jack',
    name: 'Jumping Jacks',
    shortTag: '1 pt / rep',
    pointsPerRep: 1,
    minRepIntervalMs: 400,
    maxRepsPerMinute: 85,
    description:
      'Sweep both arms cleanly overhead while stepping or jumping wide, then bring arms back beside your thighs.',
    cameraSetupTip: 'Face the camera straight-on with overhead arm clearance visible in frame.',
    warmupGuidance: 'Start with 15 seconds of easy arm swings and calf raises to warm ankles and shoulders.',
    accessibleModification: 'Low-impact side step-jacks with full overhead arm sweeps track accurately without jumping.',
    formCues: [
      'Raise both arms clearly overhead (~118°+ abduction).',
      'Return arms cleanly down beside your sides (<52°).',
      'Maintain steady rhythmic breathing.',
    ],
  },
  lunge: {
    id: 'lunge',
    name: 'Lunges',
    shortTag: '3 pts / rep',
    pointsPerRep: 3,
    minRepIntervalMs: 750,
    maxRepsPerMinute: 45,
    description:
      'Step into a balanced split stance, lower hips with control until your lead knee bends cleanly, then drive back upright.',
    cameraSetupTip: 'Stand at a slight 45° angle 2m from the camera so both legs remain unclipped.',
    warmupGuidance: 'Take 20 seconds for hip flexor stretches and 2 light alternating step-backs per leg.',
    accessibleModification: 'Hold near a wall or chair for balance and use a comfortable split depth.',
    formCues: [
      'Keep your torso tall over your hips.',
      'Bend knee smoothly past ~116°.',
      'Press back to tall standing posture (~152°+) between reps.',
    ],
  },
  knee_raise: {
    id: 'knee_raise',
    name: 'High Knees',
    shortTag: '1 pt / rep',
    pointsPerRep: 1,
    minRepIntervalMs: 320,
    maxRepsPerMinute: 100,
    description:
      'Drive alternating knees briskly toward hip height with upright posture and controlled rhythm.',
    cameraSetupTip: 'Stand 2m back facing or slightly angled toward the camera with full legs visible.',
    warmupGuidance: 'Begin with 15 seconds of gentle marching and ankle circles.',
    accessibleModification: 'Crisp standing marches without hopping count every full knee drive safely.',
    formCues: [
      'Keep spine tall without leaning backward.',
      'Lift knee above ~108° flexion angle.',
      'Return foot to standing (~150°+) before the next drive.',
    ],
  },
};

export const pickAutoDuelExercise = (avoidExercise?: DuelExerciseId | null): DuelExerciseId => {
  const pool = avoidExercise
    ? DUEL_EXERCISE_IDS.filter(id => id !== avoidExercise)
    : DUEL_EXERCISE_IDS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] || 'squat';
};

export const validateServerDuelRep = (params: {
  exerciseId: DuelExerciseId;
  peakAngleDeg: number;
  resetAngleDeg: number;
  durationMs: number;
  confidence: number;
  landmarksVisible: boolean;
  cameraStable: boolean;
  msSinceLastRep: number;
  elapsedSeconds: number;
  currentRepCount: number;
}): { valid: boolean; reason?: string } => {
  const def = DUEL_EXERCISES_CATALOG[params.exerciseId];
  if (!def) return { valid: false, reason: 'Unsupported duel exercise.' };
  if (!params.landmarksVisible) return { valid: false, reason: 'Pose landmarks were not visible.' };
  if (!params.cameraStable) return { valid: false, reason: 'Camera feed was unstable.' };
  if (params.confidence < 60) return { valid: false, reason: 'Pose tracking confidence too low.' };

  if (params.msSinceLastRep < def.minRepIntervalMs) {
    return { valid: false, reason: 'Repetition interval faster than safe biomechanical minimum.' };
  }
  if (params.durationMs < Math.min(240, Math.floor(def.minRepIntervalMs * 0.6))) {
    return { valid: false, reason: 'Movement duration too brief to represent full range.' };
  }

  // Physiological rate bound over elapsed match time (with small 3-rep burst allowance at start)
  const allowedByPace = Math.ceil((Math.max(10, params.elapsedSeconds) / 60) * def.maxRepsPerMinute) + 3;
  if (params.currentRepCount + 1 > allowedByPace) {
    return { valid: false, reason: 'Repetition pace exceeds safe physiological ceiling.' };
  }

  const peak = Number(params.peakAngleDeg);
  const reset = Number(params.resetAngleDeg);
  if (!Number.isFinite(peak) || !Number.isFinite(reset)) {
    return { valid: false, reason: 'Missing valid joint angle telemetry.' };
  }

  switch (params.exerciseId) {
    case 'pushup':
      if (peak > 112 || reset < 135) {
        return { valid: false, reason: 'Incomplete push-up elbow range of motion.' };
      }
      break;
    case 'squat':
    case 'lunge':
      if (peak > 125 || reset < 142) {
        return { valid: false, reason: 'Incomplete knee flexion/extension depth.' };
      }
      break;
    case 'situp':
      if (peak > 92 || reset < 110) {
        return { valid: false, reason: 'Incomplete sit-up hip flexion range.' };
      }
      break;
    case 'jumping_jack':
      if (peak < 105 || reset > 62) {
        return { valid: false, reason: 'Incomplete overhead arm sweep range.' };
      }
      break;
    case 'knee_raise':
      if (peak > 120 || reset < 140) {
        return { valid: false, reason: 'Incomplete high-knee lift range.' };
      }
      break;
  }

  return { valid: true };
};

export const COMPETITIVE_TIERS: Array<{
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Legendary';
  minRating: number;
  maxRating: number | null;
  accentHex: string;
}> = [
  { tier: 'Bronze', minRating: 0, maxRating: 1099, accentHex: '#CD7F32' },
  { tier: 'Silver', minRating: 1100, maxRating: 1299, accentHex: '#CBD5E1' },
  { tier: 'Gold', minRating: 1300, maxRating: 1499, accentHex: '#E8CF96' },
  { tier: 'Platinum', minRating: 1500, maxRating: 1699, accentHex: '#38BDF8' },
  { tier: 'Diamond', minRating: 1700, maxRating: 1899, accentHex: '#A78BFA' },
  { tier: 'Master', minRating: 1900, maxRating: 2099, accentHex: '#F472B6' },
  { tier: 'Grandmaster', minRating: 2100, maxRating: null, accentHex: '#FBBF24' },
];

export const computeCompetitiveTier = (
  rating: number
): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Legendary' => {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1700) return 'Diamond';
  if (rating >= 1500) return 'Platinum';
  if (rating >= 1300) return 'Gold';
  if (rating >= 1100) return 'Silver';
  return 'Bronze';
};

export const mapRivalModeToLegacyType = (
  mode: string
): RivalChallengeType => {
  switch (mode) {
    case 'strength':
      return 'strength_milestones';
    case 'endurance':
      return 'endurance_achievements';
    case 'consistency':
      return 'workout_consistency';
    case 'discipline':
      return 'habit_completion';
    default:
      return 'weekly_activity_score';
  }
};

export const mapLegacyTypeToRivalMode = (
  challengeType: string
): 'strength' | 'endurance' | 'consistency' | 'discipline' | 'overall_fitness' | 'custom' => {
  switch (challengeType) {
    case 'strength_milestones':
      return 'strength';
    case 'endurance_achievements':
      return 'endurance';
    case 'workout_consistency':
      return 'consistency';
    case 'habit_completion':
      return 'discipline';
    case 'custom':
      return 'custom';
    default:
      return 'overall_fitness';
  }
};

/**
 * Pure Elo/Glicko-inspired Competitive Rating calculation.
 * Never touches Player XP, Gold, or Boss Battle rewards.
 */
export const calculateCompetitiveRatingChange = (params: {
  ratingA: number;
  ratingB: number;
  rdA?: number;
  rdB?: number;
  actualScoreA: 1 | 0.5 | 0;
  kFactorA?: number;
  kFactorB?: number;
}): {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
  newRdA: number;
  newRdB: number;
} => {
  const rA = Math.max(100, Math.min(4000, Math.round(params.ratingA)));
  const rB = Math.max(100, Math.min(4000, Math.round(params.ratingB)));
  const rdA = Math.max(40, Math.min(350, Number(params.rdA ?? 200)));
  const rdB = Math.max(40, Math.min(350, Number(params.rdB ?? 200)));

  // RD uncertainty scaling (closer to Glicko uncertainty weighting while staying clean & bounded)
  const kBaseA = params.kFactorA ?? (rdA >= 160 ? 36 : rdA >= 90 ? 28 : 22);
  const kBaseB = params.kFactorB ?? (rdB >= 160 ? 36 : rdB >= 90 ? 28 : 22);

  const expectedA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const expectedB = 1 - expectedA;
  const actualB = 1 - params.actualScoreA;

  const deltaA = Math.round(kBaseA * (params.actualScoreA - expectedA));
  const deltaB = Math.round(kBaseB * (actualB - expectedB));

  const newRatingA = Math.max(100, Math.min(4000, rA + deltaA));
  const newRatingB = Math.max(100, Math.min(4000, rB + deltaB));
  const newRdA = Math.max(50, Math.round((rdA * 0.9) * 10) / 10);
  const newRdB = Math.max(50, Math.round((rdB * 0.9) * 10) / 10);

  return {
    newRatingA,
    newRatingB,
    deltaA: newRatingA - rA,
    deltaB: newRatingB - rB,
    newRdA,
    newRdB,
  };
};

// Legacy alias kept for safe compatibility across imports
export const RIVAL_CHALLENGE_CATALOG: Record<
  RivalChallengeType,
  {
    title: string;
    description: string;
    unitLabel: string;
  }
> = {
  weekly_activity_score: {
    title: 'Overall Fitness Duel',
    description: 'Balanced 7-day duel across workouts, habits, study focus, and recovery.',
    unitLabel: 'pts',
  },
  workout_consistency: {
    title: 'Consistency Duel',
    description: 'Normalized points for steady workouts and restorative yoga/recovery days.',
    unitLabel: 'pts',
  },
  strength_milestones: {
    title: 'Strength Duel',
    description: 'Focused 7-day duel on verified resistance & bodyweight sessions.',
    unitLabel: 'pts',
  },
  endurance_achievements: {
    title: 'Endurance Duel',
    description: 'Focused 7-day duel on verified walks, runs, and cardio pacing.',
    unitLabel: 'pts',
  },
  habit_completion: {
    title: 'Discipline Duel',
    description: 'Daily discipline, hydration, and routine consistency duel.',
    unitLabel: 'pts',
  },
};

export const calculateSafeRivalScoreDelta = (
  challengeTypeOrMode: RivalChallengeType | string,
  activityType: SkillActivityType,
  metadata: VerifiedActivityMetadata = {},
  currentDailyScore: number = 0
): { pointsAwarded: number; safetyCapped: boolean; label: string } => {
  const normalizedType =
    challengeTypeOrMode === 'strength' || challengeTypeOrMode === 'strength_milestones'
      ? 'strength_milestones'
      : challengeTypeOrMode === 'endurance' || challengeTypeOrMode === 'endurance_achievements'
      ? 'endurance_achievements'
      : challengeTypeOrMode === 'consistency' || challengeTypeOrMode === 'workout_consistency'
      ? 'workout_consistency'
      : challengeTypeOrMode === 'discipline' || challengeTypeOrMode === 'habit_completion'
      ? 'habit_completion'
      : 'weekly_activity_score';

  const duration = Math.min(45, Math.max(0, Math.round(Number(metadata.durationMinutes) || 0)));
  const visionBonus = metadata.verifiedWithAetherVision ? 8 : 0;

  let rawPoints = 0;
  let label = 'Verified Contribution';

  switch (normalizedType) {
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
        rawPoints = 25;
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
    themeColor: '#D6A84B',
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
