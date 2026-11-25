export type CharacterClass = 'Warrior' | 'Mage' | 'Ranger' | 'Guardian';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';
export type DietaryPreference = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian' | 'other';
export type UnitSystem = 'metric' | 'imperial';
export type AgeGroup = 'child' | 'early_teen' | 'older_teen' | 'adult' | 'older_adult';
export type BiologicalSex = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'dnd';

export type FieldVisibilityLevel = 'everyone' | 'friends' | 'nobody';

export type PrivacyFieldKey =
  | 'usernameAvatar'
  | 'level'
  | 'xpProgression'
  | 'achievements'
  | 'fitnessStats'
  | 'workoutHistory'
  | 'personalRecords'
  | 'dailyActivity'
  | 'onlineStatus'
  | 'lastActive'
  | 'bio';

export interface GranularPrivacySettings {
  privateByDefault: boolean;
  usernameAvatar: FieldVisibilityLevel;
  level: FieldVisibilityLevel;
  xpProgression: FieldVisibilityLevel;
  achievements: FieldVisibilityLevel;
  fitnessStats: FieldVisibilityLevel;
  workoutHistory: FieldVisibilityLevel;
  personalRecords: FieldVisibilityLevel;
  dailyActivity: FieldVisibilityLevel;
  onlineStatus: FieldVisibilityLevel;
  lastActive: FieldVisibilityLevel;
  bio: FieldVisibilityLevel;
  showEquipment?: boolean;
  showGuild?: boolean;
}

export interface PresenceSettings {
  manualStatus: PresenceStatus;
  effectiveStatus: PresenceStatus;
  autoAwayEnabled: boolean;
  autoAwayMinutes: number;
  isAutoAway: boolean;
  lastActiveAt: string;
}

export interface PlayerPresenceInfo {
  userId: string;
  status: PresenceStatus;
  lastActiveAt?: string | null;
  hidden?: boolean;
}

export interface NotificationPreferences {
  masterEnabled?: boolean;
  fitness?: boolean;
  social?: boolean;
  achievement?: boolean;
  boss?: boolean;
  community?: boolean;
  seasonal?: boolean;
  dailyReminders: boolean;
  weeklySummary: boolean;
  guildUpdates: boolean;
  questAlerts: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  characterName?: string;
  email: string;
  avatar: string;
  googleAvatar?: string;
  characterClass: CharacterClass;
  bio?: string;
  profileVisibility?: ProfileVisibility;
  showAchievements?: boolean;
  showEquipment?: boolean;
  showStats?: boolean;
  showGuild?: boolean;
  presenceStatus?: PresenceStatus;
  autoAwayEnabled?: boolean;
  autoAwayMinutes?: number;
  privacySettings?: GranularPrivacySettings;
  ageYears?: number;
  ageGroup?: AgeGroup;
  biologicalSex?: BiologicalSex;
  ageRange?: string;
  height?: string;
  weight?: string;
  preferredUnits: UnitSystem;
  activityLevel: ActivityLevel;
  preferredActivities: string[];
  experienceLevel: ExperienceLevel;
  dietaryPreference: DietaryPreference;
  foodAllergies?: string;
  foodAllergiesList?: string[];
  foodIntolerances?: string[];
  dietaryRestrictions?: string;
  preferredCuisine?: string;
  dislikedFoods?: string;
  selectedHabits: string[];
  personalGoals: string[];
  notificationPreferences?: NotificationPreferences;
  timezone?: string;
  leaderboardVisible?: boolean;
  createdAt: string;
  isOnboarded: boolean;
  legendTitle?: string | null;
  legendTitleStyle?: GlobalTitleStyle | null;
  legendEmblem?: string | null;
  legendAchievementId?: string | null;
}

export interface PlayerStats {
  level: number;
  playerXP: number;
  playerXPNextLevel: number;
  gold: number;
  currentKingdomId: string;
  currentChapterId: string;
  soundEnabled: boolean;
  totalWorkoutsCompleted: number;
  totalVerifiedReps: number;
  totalBossesDefeated: number;
  currentStreak: number;
  aetherRank: AetherRankStage;
  aetherPoints: number;
  aetherPointsNextRank: number;
}

export type HabitFrequency = 'daily' | 'weekly' | 'once' | 'weekdays' | 'weekends' | 'custom';

export interface Habit {
  id: string;
  name: string;
  category: 'fitness' | 'nutrition' | 'mindfulness' | 'sleep' | 'discipline' | 'custom';
  frequency: HabitFrequency;
  iconName: string;
  playerXpReward: number;
  goldReward?: number;
  completedToday: boolean;
  streak: number;
  history: string[]; // ISO date or period key strings
  lastCompletedDate?: string;
  lastPeriodKey?: string;
}

export type QuestType = 'daily' | 'weekly' | 'special';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  category: 'fitness' | 'habit' | 'boss' | 'nutrition';
  progress: number;
  maxProgress: number;
  playerXpReward: number;
  completed: boolean;
  claimed: boolean;
  expiresIn?: string;
}

export type ItemRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Mythic'
  | 'Ascendant'
  | 'Divine'
  | 'Celestial'
  | 'Eternal';

export type AetherRankStage = 'Dormant' | 'Awakened' | 'Ascended' | 'Mythic' | 'Transcendent';
export type MasteryPath = 'Strength' | 'Endurance' | 'Focus' | 'Recovery';
export type ElementType =
  | 'Fire'
  | 'Water'
  | 'Ice'
  | 'Lightning'
  | 'Earth'
  | 'Wind'
  | 'Shadow'
  | 'Light'
  | 'Arcane'
  | 'Cosmic'
  | 'Nature'
  | 'Physical'
  | 'Void';

export type BodyweightLimb = 'hands' | 'legs' | 'both';

export interface BodyweightTechnique {
  id: string;
  name: string;
  limb: BodyweightLimb;
  exerciseInspiration: string;
  description: string;
  combatEffect: string;
  element: ElementType;
  unlockLevel: number;
  damageMultiplier: number;
  defenseBoost?: number;
  critBonus?: number;
  staminaCost: number;
}

export type BuffEffectType = 'attack' | 'defense' | 'crit' | 'xp';

export interface Buff {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  effectType: BuffEffectType;
  effectValue: number; // percentage e.g. 10 for +10%
  unlockRequirement: string;
  earnedSource: string;
  durationBattles: number;
  usesRemaining: number;
  active: boolean;
  iconName: string;
}

export type CameraTrackableExercise =
  | 'squat'
  | 'pushup'
  | 'lunge'
  | 'jumping_jack'
  | 'plank'
  | 'knee_raise'
  | 'bicep_curl'
  | 'shoulder_press';

export type ExerciseType =
  | CameraTrackableExercise
  | 'walking'
  | 'running'
  | 'cycling'
  | 'gym'
  | 'yoga';

export interface NutrientRange {
  min: number;
  max: number;
  mid: number;
}

export interface FoodAnalysisItem {
  name: string;
  foodGroup: string;
  likelyIngredients: string[];
  estimatedPortion: string;
  uncertaintyNote: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  energyKcal: number;
}

export interface MicronutrientEstimate {
  name: string;
  qualitativeLevel: string;
  contributingFoods: string[];
  note: string;
}

export interface MealNutritionEstimate {
  isImageEstimate: boolean;
  confidence?: number;
  confidenceLevel?: 'low' | 'medium' | 'high';
  estimateDisclaimer?: string;
  items?: FoodAnalysisItem[];
  estimatedTotals: {
    proteinG: NutrientRange;
    carbsG: NutrientRange;
    fatG: NutrientRange;
    fibreG: NutrientRange;
    energyKcal: NutrientRange;
  };
  foodGroupsRepresented: string[];
  micronutrients?: MicronutrientEstimate[];
  nutrientContributors?: {
    proteinSources: string[];
    carbSources: string[];
    healthyFatSources: string[];
    fibreSources: string[];
  };
  educationalExplanation?: string;
  varietyAndBalanceSuggestions?: string[];
  allergenWatchNotice?: string;
}

export interface WorkoutVisionAnalysis {
  mediaKind: 'image' | 'video';
  identified: boolean;
  exerciseType: ExerciseType | 'unknown';
  exerciseName: string;
  movementCategory: string;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  needsUserConfirmation: boolean;
  similarExerciseDistinction: string;
  repsSupported: boolean;
  estimatedReps: number;
  estimatedSets: number;
  durationSupported: boolean;
  estimatedDurationMinutes: number;
  countingLimitation: string;
  observations: string[];
  safetyAndFormNotes: string[];
  ageAppropriateGuidance: string;
}

export interface FoodVisionAnalysis {
  identified: boolean;
  isImageEstimate: boolean;
  estimateDisclaimer: string;
  mealTitle: string;
  dietaryCategory: DietaryPreference;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  needsUserConfirmation: boolean;
  clarifyingQuestions: string[];
  items: FoodAnalysisItem[];
  estimatedTotals: {
    proteinG: NutrientRange;
    carbsG: NutrientRange;
    fatG: NutrientRange;
    fibreG: NutrientRange;
    energyKcal: NutrientRange;
  };
  foodGroupsRepresented: string[];
  micronutrients: MicronutrientEstimate[];
  nutrientContributors: {
    proteinSources: string[];
    carbSources: string[];
    healthyFatSources: string[];
    fibreSources: string[];
  };
  educationalExplanation: string;
  varietyAndBalanceSuggestions: string[];
  allergenWatchNotice: string;
}

export interface FitnessSession {
  id: string;
  exerciseType: ExerciseType;
  exerciseName: string;
  repetitions?: number;
  durationMinutes: number;
  distanceKm?: number;
  verifiedWithAetherVision: boolean;
  timestamp: string;
  playerXpEarned: number;
  goldEarned?: number;
  aetherPointsEarned?: number;
  confidence?: number;
  observations?: string[];
  notes?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  mealType: MealType;
  title: string;
  foodItems: string[];
  dietaryCategory: DietaryPreference;
  balancedNotes: string;
  timestamp: string;
  waterGlasses?: number;
  nutritionEstimate?: MealNutritionEstimate;
}

export interface BossWeakness {
  element: ElementType;
  description: string;
  damageMultiplier: number;
  discovered: boolean;
  clue: string;
}

export interface BossResistance {
  element: ElementType;
  description: string;
  damageReductionPercent: number;
}

export interface BossSignatureAttack {
  name: string;
  description: string;
  warningText: string;
  powerMultiplier: number;
  defenseResponse: 'dodge' | 'defend';
  cooldownTurns: number;
}

export interface BossDefensiveMechanic {
  name: string;
  description: string;
  shieldValue?: number;
  maxShieldValue?: number;
  damageReductionPercent: number;
  breakRequirement: string;
}

export interface BossPhase {
  phaseNumber: number;
  name: string;
  thresholdPercent: number; // e.g., 66 for Phase 2, 33 for Phase 3
  description: string;
  attackMultiplier: number;
  auraColor: string;
}

export interface Boss {
  id: string;
  name: string;
  title: string;
  kingdomId: string;
  difficulty: 'Novice' | 'Challenging' | 'Heroic' | 'Nightmare' | 'Mythic';
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  specialAbility: string;
  specialAbilityDesc: string;
  rewardPlayerXp: number;
  image: string;
  defeated: boolean;
  lore: string;
  // Strategic Combat Systems
  weakness: BossWeakness;
  resistance: BossResistance;
  signatureAttack: BossSignatureAttack;
  defensiveMechanic: BossDefensiveMechanic;
  phases: BossPhase[];
}

export interface Kingdom {
  id: string;
  name: string;
  subtitle: string;
  theme: string;
  description: string;
  unlocked: boolean;
  cleared: boolean;
  boss: Boss;
  loreIntro: string;
  colorGradient: string;
}

export type GuildRole = 'leader' | 'officer' | 'member';

export interface Guild {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  level: number;
  guildXp?: number;
  membersCount: number;
  maxMembers: number;
  description: string;
  weeklyQuestName: string;
  weeklyQuestProgress: number;
  weeklyQuestMax: number;
  isMember: boolean;
  myRole?: GuildRole | null;
  ownerId?: string | null;
  isPublic?: boolean;
  minLevel?: number;
  hasPendingRequest?: boolean;
  hasPendingInvite?: boolean;
}

export interface GuildMemberRecord {
  userId: string;
  username: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  role: GuildRole;
  weeklyContribution: number;
  joinedAt: string;
  legendTitle?: string | null;
  legendTitleStyle?: GlobalTitleStyle | null;
  legendEmblem?: string | null;
  presenceStatus?: PresenceStatus;
  lastActiveAt?: string | null;
}

export interface GuildChallengeRecord {
  id: string;
  title: string;
  periodKey: string;
  targetValue: number;
  currentValue: number;
  rewardGold: number;
  rewardPlayerXp: number;
  completed: boolean;
}

export interface GuildJoinRequestRecord {
  id: string;
  userId: string;
  username: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  message: string;
  createdAt: string;
}

export interface GuildInviteRecord {
  id: string;
  inviteeId: string;
  inviteeName: string;
  inviteeClass: CharacterClass;
  inviteeLevel: number;
  createdAt: string;
}

export interface MyGuildInviteRecord {
  inviteId: string;
  guildId: string;
  guildName: string;
  guildTag: string;
  guildLevel: number;
  inviterName: string;
  createdAt: string;
}

export interface GuildDetailsData {
  guild: Guild;
  members: GuildMemberRecord[];
  challenges: GuildChallengeRecord[];
  joinRequests: GuildJoinRequestRecord[];
  pendingInvites: GuildInviteRecord[];
}

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderAvatar: string;
  senderClass: CharacterClass;
  text: string;
  timestamp: string;
  channel: 'guild' | 'general' | 'whisper';
  isCurrentUser?: boolean;
  senderLegendTitle?: string | null;
  senderLegendStyle?: GlobalTitleStyle | null;
  senderLegendEmblem?: string | null;
  senderPresenceStatus?: PresenceStatus;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'quests' | 'consistency' | 'combat' | 'exploration' | 'multiplayer';
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  claimed: boolean;
  rewardPlayerXp: number;
  rewardGold?: number;
}

export interface Transaction {
  id: string;
  type: 'PLAYER_XP' | 'GOLD' | 'AETHER_POINTS';
  source: string;
  amount: number;
  timestamp: string;
}

export interface ShopItem {
  id: string;
  itemType: 'buff' | 'elixir' | 'cosmetic';
  name: string;
  description: string;
  rarity: ItemRarity;
  priceGold: number;
  requiredLevel: number;
  metadata?: Record<string, any>;
}

export type LeaderboardScope =
  | 'global'
  | 'weekly'
  | 'monthly'
  | 'seasonal'
  | 'guild'
  | 'friends'
  | 'strength'
  | 'endurance'
  | 'consistency'
  | 'discipline'
  | 'community'
  | 'boss_battle';

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number | null;
  rankDelta?: number | null;
  userId: string;
  name: string;
  avatar: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  streak: number;
  score: number;
  scoreLabel?: string;
  isCurrent?: boolean;
  equippedTitleName?: string | null;
  equippedTitleRarity?: IdentityRarity | null;
  reputationScore?: number;
  legendTitle?: string | null;
  legendTitleStyle?: GlobalTitleStyle | null;
  legendEmblem?: string | null;
  presenceStatus?: PresenceStatus;
  lastActiveAt?: string | null;
  identityHidden?: boolean;
  levelHidden?: boolean;
}

export type RelationshipStatus =
  | 'none'
  | 'friends'
  | 'request_sent'
  | 'request_received'
  | 'blocked'
  | 'self';

export interface ChampionSummary {
  id: string;
  username: string;
  avatarUrl: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  currentStreak: number;
  bio?: string;
  profileVisibility?: ProfileVisibility;
  relationshipStatus?: RelationshipStatus;
  friendshipId?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  guildTag?: string | null;
  achievementCount?: number;
  legendTitle?: string | null;
  legendTitleStyle?: GlobalTitleStyle | null;
  legendEmblem?: string | null;
  presenceStatus?: PresenceStatus;
  lastActiveAt?: string | null;
  identityHidden?: boolean;
  levelHidden?: boolean;
}

export interface ProfileWorkoutHistoryItem {
  id: string;
  exerciseName: string;
  exerciseType: string;
  durationMinutes: number;
  repetitions?: number;
  distanceKm?: number;
  verifiedWithAetherVision: boolean;
  timestamp: string;
}

export interface ProfilePersonalRecord {
  exerciseName: string;
  bestReps?: number;
  bestDurationMinutes?: number;
  bestDistanceKm?: number;
  achievedAt: string;
}

export interface ProfileDailyActivitySummary {
  habitsCompletedToday: number;
  habitsTotal: number;
  workoutsToday: number;
  activeMinutesToday: number;
  mealsLoggedToday: number;
  waterGlassesToday: number;
  currentStreak: number;
}

export interface PublicPlayerProfile {
  accessible: boolean;
  restrictedReason?: 'private' | 'friends_only' | 'restricted';
  blocked?: boolean;
  blockedByMe?: boolean;
  previewMode?: 'public' | 'friend' | 'restricted';
  error?: string;
  permittedFields?: PrivacyFieldKey[];
  player?: {
    id: string;
    username?: string;
    characterName?: string;
    characterClass?: CharacterClass;
    avatarUrl?: string;
    heroName?: string;
    level?: number;
    playerXP?: number;
    playerXPNextLevel?: number;
    totalXp?: number;
    aetherRank?: AetherRankStage;
    aetherPoints?: number;
    aetherPointsNextRank?: number;
    currentStreak?: number;
    totalWorkoutsCompleted?: number;
    totalVerifiedReps?: number;
    totalBossesDefeated?: number;
    totalActiveMinutes?: number;
    bio?: string;
    profileVisibility?: ProfileVisibility;
    showStats?: boolean;
    showEquipment?: boolean;
    showAchievements?: boolean;
    showGuild?: boolean;
    relationshipStatus: RelationshipStatus;
    friendshipId?: string | null;
    presenceStatus?: PresenceStatus;
    lastActiveAt?: string | null;
    hiddenFields?: PrivacyFieldKey[];
    guild?: {
      id: string;
      name: string;
      tag: string;
      level: number;
      role: GuildRole;
    };
    achievements?: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      icon: string;
      unlocked: boolean;
    }>;
    workoutHistory?: ProfileWorkoutHistoryItem[];
    personalRecords?: ProfilePersonalRecord[];
    dailyActivity?: ProfileDailyActivitySummary;
    legendTitle?: string | null;
    legendTitleStyle?: GlobalTitleStyle | null;
    legendEmblem?: string | null;
    legendAchievementId?: string | null;
    legendTitles?: Array<{
      achievementId: string;
      name: string;
      titleTag: string;
      titleStyle: GlobalTitleStyle;
      emblemIcon: string;
      rarity: GlobalAchievementRarity;
      claimedAt: string;
    }>;
    equippedIdentityTitle?: {
      id: string;
      name: string;
      rarity: IdentityRarity;
    } | null;
    featuredBadges?: Array<{
      id: string;
      name: string;
      rarity: IdentityRarity;
      iconName: string;
      description: string;
    }>;
    reputationScore?: number;
    reputationTier?: string;
    joinedAt?: string | null;
  };
}

export interface BlockedUserSummary {
  id: string;
  username: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  blockedAt: string;
}

export interface FriendRecord {
  friendshipId: string;
  status: 'pending' | 'accepted' | 'blocked';
  direction: 'incoming' | 'outgoing';
  champion: ChampionSummary;
  createdAt: string;
}

export type NotificationCategory =
  | 'player_progression'
  | 'social'
  | 'game_world'
  | 'fitness';

export interface AppNotification {
  id: string;
  category?: NotificationCategory;
  preferenceKey?: 'fitness' | 'social' | 'achievement' | 'boss' | 'community' | 'seasonal';
  eventKey?: string;
  type: string;
  title: string;
  body: string;
  actionTab?: string | null;
  actionSubTab?: string | null;
  payload?: Record<string, any>;
  readAt: string | null;
  dismissedAt?: string | null;
  createdAt: string;
}

// --- THE FALLEN KNIGHT: 3D HEROES, ATTRIBUTES, CAMPAIGN & TUTORIAL ---

export type PlayableHeroId =
  | 'fallen_knight'
  | 'shadowblade'
  | 'arcane_mage'
  | 'ranger'
  | 'paladin';

export type RpgAttributeKey =
  | 'strength'
  | 'discipline'
  | 'intelligence'
  | 'vitality'
  | 'agility'
  | 'resilience';

export type RpgAttributes = Record<RpgAttributeKey, number>;

export interface HeroAbilitySummary {
  name: string;
  description: string;
}

export interface HeroBodyweightDisciplines {
  handsFocus: string;
  legsFocus: string;
  conditioningStyle: string;
}

export interface PlayableHeroDefinition {
  id: PlayableHeroId;
  name: string;
  title: string;
  mappedClass: CharacterClass;
  archetype: string;
  greatFallOrigin: string;
  roleSummary: string;
  bodyweightDisciplines: HeroBodyweightDisciplines;
  attributeFocus: RpgAttributeKey[];
  abilities: HeroAbilitySummary[];
  strengths: string[];
  accentHex: string;
  secondaryHex: string;
  introFlourishLabel: string;
}

export type ReclaimHonorObjectiveId =
  | 'visit_fitness'
  | 'visit_shop'
  | 'open_quest_board'
  | 'view_attributes'
  | 'complete_habit'
  | 'return_castle';

export interface ReclaimHonorQuestState {
  objectives: Record<ReclaimHonorObjectiveId, boolean>;
  completed: boolean;
  claimed: boolean;
  claimedAt?: string;
}

export interface CampaignChapterDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  narrationIntro: string;
  npcSpeaker: string;
  npcRole: string;
  npcDialogue: string;
  loreDiscovery: string;
  missionTitle: string;
  missionSummary: string;
  requirements: {
    minLevel?: number;
    minHabitsCompleted?: number;
    minWorkouts?: number;
    minMealsLogged?: number;
    minBossesDefeated?: number;
    requireReclaimHonor?: boolean;
    attributeKey?: RpgAttributeKey;
    minAttributeValue?: number;
  };
  rewards: {
    playerXp: number;
    gold: number;
    attributeBoost?: Partial<RpgAttributes>;
    restorationPercent: number;
  };
}

export interface CampaignProgressState {
  activeChapterId: string;
  completedChapterIds: string[];
  claimedChapterIds: string[];
}

export interface TutorialState {
  isOpen: boolean;
  stepIndex: number;
  completed: boolean;
  skipped: boolean;
}

// --- 10. AI-POWERED DYNAMIC QUEST GENERATOR ---

export type DynamicQuestCategory =
  | 'physical'
  | 'intellectual'
  | 'discipline'
  | 'personal_growth'
  | 'social';

export type DynamicQuestDifficulty = 'easy' | 'medium' | 'challenging' | 'special';

export type AdaptiveDifficultyTier =
  | 'gentle_comeback'
  | 'supportive'
  | 'balanced'
  | 'escalating';

export type DynamicQuestEvidenceType =
  | 'workout_minutes'
  | 'workout_sessions'
  | 'vision_reps'
  | 'habit_completions'
  | 'meal_logs'
  | 'water_glasses'
  | 'friend_interaction'
  | 'study_or_skill_reflection'
  | 'personal_reflection';

export interface DynamicDailyQuest {
  id: string;
  periodKey: string; // YYYY-MM-DD in player timezone
  title: string;
  description: string;
  category: DynamicQuestCategory;
  difficulty: DynamicQuestDifficulty;
  objectiveLabel: string;
  evidenceType: DynamicQuestEvidenceType;
  progress: number;
  maxProgress: number;
  unitLabel: string;
  estimatedMinutes: number;
  playerXpReward: number;
  goldReward: number;
  isSpecialChallenge: boolean;
  personalizationReason: string;
  adaptiveTier: AdaptiveDifficultyTier;
  completed: boolean;
  claimed: boolean;
  evidenceNote?: string;
  completedAt?: string;
  claimedAt?: string;
  createdAt: string;
}

export interface DynamicQuestHistoryEntry {
  id: string;
  periodKey: string;
  title: string;
  category: DynamicQuestCategory;
  difficulty: DynamicQuestDifficulty;
  completed: boolean;
  claimed: boolean;
  playerXpReward: number;
  goldReward: number;
  evidenceNote?: string;
  recordedAt: string;
}

export interface AiQuestMentorMemory {
  recentQuestTitles: string[];
  preferredCategories: DynamicQuestCategory[];
  struggleCategories: DynamicQuestCategory[];
  lastAdaptiveTier: AdaptiveDifficultyTier;
  mentorNotes: string;
  reportsGeneratedCount: number;
  lastGeneratedDate?: string;
}

// --- 11. DAILY QUEST REPORT (PERSONAL RPG PROGRESSION ANALYSIS) ---

export interface DailyQuestReportData {
  reportDate: string; // YYYY-MM-DD
  yesterdayDate: string;
  headline: string;
  adaptiveTone: string;
  yesterdayPerformance: {
    questsCompleted: number;
    questsTotal: number;
    habitsCompleted: number;
    workoutsLogged: number;
    mealsLogged: number;
    playerXpEarned: number;
    goldEarned: number;
    achievementsUnlocked: number;
    consistencyScore: number; // 0-100
    summary: string;
  };
  personalStrengths: Array<{
    title: string;
    detail: string;
    category: string;
  }>;
  areasForImprovement: Array<{
    area: string;
    observation: string;
    gentleAction: string;
  }>;
  todayRecommendations: {
    primaryFocus: string;
    realisticGoals: string[];
    specialChallengeAdvice: string;
    suggestedMinutes: number;
  };
  dailyRpgEvaluation: {
    mentorTitle: string;
    narrative: string;
    longTermConnection: string;
  };
  generatedAt: string;
}

// --- 12. GLOBAL EXCLUSIVE ACHIEVEMENTS & HALL OF LEGENDS ---

export type GlobalAchievementCategory =
  | 'legendary_discipline'
  | 'master_of_knowledge'
  | 'physical_excellence'
  | 'unbreakable_consistency'
  | 'exploration_and_discovery'
  | 'social_legends'
  | 'ultimate_challenges'
  | 'special_hidden_achievements';

export type GlobalAchievementRarity =
  | 'Epic'
  | 'Legendary'
  | 'Mythic'
  | 'Ascendant'
  | 'Celestial'
  | 'Eternal';

export type GlobalTitleStyle =
  | 'gold'
  | 'celestial'
  | 'crimson'
  | 'emerald'
  | 'arcane'
  | 'prismatic';

export type GlobalRequirementType =
  | 'level'
  | 'total_xp'
  | 'current_streak'
  | 'total_workouts'
  | 'total_verified_reps'
  | 'total_bosses_defeated'
  | 'aether_points'
  | 'habits_claimed_total'
  | 'meals_logged_total'
  | 'water_glasses_current'
  | 'hydration_goals_total'
  | 'quests_claimed_total'
  | 'dynamic_quests_claimed_total'
  | 'dynamic_physical_claimed'
  | 'dynamic_intellectual_claimed'
  | 'dynamic_discipline_claimed'
  | 'dynamic_personal_growth_claimed'
  | 'dynamic_social_claimed'
  | 'normal_achievements_unlocked'
  | 'friends_count'
  | 'guild_joined'
  | 'guild_leader'
  | 'chat_messages_sent'
  | 'story_chapters_claimed'
  | 'all_kingdoms_cleared'
  | 'honor_reclaimed'
  | 'daily_reports_generated'
  | 'gold_balance';

export interface GlobalExclusiveAchievement {
  id: string;
  name: string;
  story: string;
  category: GlobalAchievementCategory;
  rarity: GlobalAchievementRarity;
  difficulty: 'Hard' | 'Extreme' | 'Pinnacle' | 'Secret';
  titleTag: string;
  titleStyle: GlobalTitleStyle;
  emblemIcon: string;
  requirementSummary: string;
  requirementType: GlobalRequirementType;
  threshold: number;
  rewardPlayerXp: number;
  rewardGold: number;
  isHidden?: boolean;
  hint?: string;
}

export interface GlobalAchievementOwnership {
  achievementId: string;
  ownerId: string;
  ownerUsername: string;
  claimedAt: string;
}

export interface GlobalLegendAnnouncement {
  id: string;
  achievementId: string;
  achievementName: string;
  titleTag: string;
  titleStyle: GlobalTitleStyle;
  emblemIcon: string;
  rarity: GlobalAchievementRarity;
  ownerId: string;
  ownerUsername: string;
  announcedAt: string;
}

export type HallOfLegendsStatus = 'unclaimed' | 'locked_for_you' | 'claimed';

export interface HallOfLegendsEntry extends GlobalExclusiveAchievement {
  ownership: GlobalAchievementOwnership | null;
  status: HallOfLegendsStatus;
  userProgress: number;
  eligibleToClaim: boolean;
  ownedByCurrentUser: boolean;
}

// --- PHASE 1: AAA EXPLORABLE 3D RPG WORLD (THE HEARTLANDS) ---

export type WorldRegionId =
  | 'heartlands'
  | 'emerald_wilds'
  | 'frozen_crown'
  | 'ashen_expanse'
  | 'celestial_reach';

export type GoldenTreeStage =
  | 'fallen'
  | 'awakening'
  | 'growing'
  | 'radiant'
  | 'eternal';

export type LandmarkId =
  | 'ancient_castle'
  | 'forgotten_village'
  | 'ancient_bridge'
  | 'sacred_shrine';

export type LandmarkRestorationStage =
  | 'ruined'
  | 'repaired'
  | 'restored'
  | 'flourishing'
  | 'legendary';

export type WorldGraphicsQuality = 'high' | 'low';

export interface WorldLandmarkState {
  id: LandmarkId;
  stage: LandmarkRestorationStage;
  restorationPercent: number;
}

export interface WorldPlayerPosition {
  x: number;
  y: number;
  z: number;
}

export interface WorldPersistenceState {
  hasEnteredWorld: boolean;
  selectedRegionId: WorldRegionId;
  goldenTreeStage: GoldenTreeStage;
  landmarks: Record<LandmarkId, WorldLandmarkState>;
  graphicsQuality: WorldGraphicsQuality;
  lastPlayerPosition?: WorldPlayerPosition;
}

// --- PHASE 1: REAL-LIFE SKILL TREE ---

export type SkillAttributeId =
  | 'strength'
  | 'endurance'
  | 'discipline'
  | 'focus'
  | 'resilience'
  | 'vitality';

export type SkillNodeStatus = 'locked' | 'available' | 'unlocked';

export type SkillActivityType =
  | 'strength_workout'
  | 'cardio_workout'
  | 'habit_completion'
  | 'study_session'
  | 'comeback_activity'
  | 'recovery_habit';

export interface SkillNodeRequirements {
  minAttributeLevel: number;
  prerequisiteNodeIds: string[];
  minVerifiedActivities?: number;
}

export interface SkillNodeDefinition {
  id: string;
  attributeId: SkillAttributeId;
  branchId: string;
  branchName: string;
  tier: 1 | 2 | 3;
  name: string;
  tagline: string;
  description: string;
  realLifePractice: string;
  masteryTitle: string;
  requirements: SkillNodeRequirements;
}

export interface SkillBranchDefinition {
  id: string;
  attributeId: SkillAttributeId;
  name: string;
  subtitle: string;
  description: string;
}

export interface SkillMilestoneDefinition {
  id: string;
  attributeId: SkillAttributeId;
  requiredLevel: number;
  requiredNodesUnlocked?: number;
  title: string;
  description: string;
  honorSeal: string;
}

export interface SkillTreeAttributeDefinition {
  id: SkillAttributeId;
  name: string;
  subtitle: string;
  description: string;
  verifiedSources: string[];
  accentHex: string;
  dailySafetyCapXp: number;
  branches: SkillBranchDefinition[];
  nodes: SkillNodeDefinition[];
  milestones: SkillMilestoneDefinition[];
}

export interface PlayerAttributeProgress {
  attributeId: SkillAttributeId;
  xp: number;
  level: number; // 1..10
  xpIntoCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  totalActivities: number;
  dailyXpEarned: number;
  dailyCapRemaining: number;
  lastActivityAt: string | null;
}

export interface SkillActivityLedgerEntry {
  id: string;
  idempotencyKey: string;
  activityType: SkillActivityType;
  attributeId: SkillAttributeId;
  sourceType: string;
  sourceId: string;
  xpAwarded: number;
  safetyCapped: boolean;
  dailyBucket: string;
  createdAt: string;
}

export interface SkillTreeDailyPoint {
  date: string;
  totalXp: number;
  strength: number;
  endurance: number;
  discipline: number;
  focus: number;
  resilience: number;
  vitality: number;
  activitiesCount: number;
}

export interface SkillTreeAnalyticsPayload {
  totalSkillXp: number;
  totalActivities: number;
  reconciledCount?: number;
  attributeDistribution: Record<SkillAttributeId, { xp: number; percent: number; level: number }>;
  dailySeries7d: SkillTreeDailyPoint[];
  dailySeries30d: SkillTreeDailyPoint[];
  lastUpdatedAt: string;
}

export interface PlayerSkillTreeState {
  attributes: Record<SkillAttributeId, PlayerAttributeProgress>;
  unlockedNodeIds: string[];
  claimedMilestoneIds: string[];
  recentEvents: SkillActivityLedgerEntry[];
  analytics?: SkillTreeAnalyticsPayload;
}

export interface SkillActivityAwardResult {
  success: boolean;
  duplicate?: boolean;
  safetyCapped?: boolean;
  attributeId?: SkillAttributeId;
  xpAwarded?: number;
  previousLevel?: number;
  newLevel?: number;
  leveledUp?: boolean;
  state?: PlayerSkillTreeState;
  error?: string;
}

// --- PHASE 2: WEEKLY BOSS BATTLES ---

export type WeeklyBossDifficulty = 'Heroic' | 'Mythic' | 'Cataclysmic';
export type WeeklyBossStatus = 'scheduled' | 'active' | 'defeated' | 'expired' | 'resolved';

export interface WeeklyBossMission {
  id: string;
  title: string;
  description: string;
  activityFilter: 'any_workout' | 'cardio' | 'strength' | 'habit' | 'study' | 'recovery';
  targetCount: number;
  damageReward: number;
  playerXpReward: number;
  goldReward: number;
}

export interface WeeklyBossMilestone {
  id: string;
  title: string;
  damageRequired: number;
  playerXpReward: number;
  goldReward: number;
}

export interface WeeklyBossRewardConfig {
  participationXp: number;
  participationGold: number;
  defeatXp: number;
  defeatGold: number;
  topContributorBonusXp: number;
  topContributorBonusGold: number;
}

export interface WeeklyBossEvent {
  id: string;
  weekKey: string;
  bossName: string;
  bossTitle: string;
  bossDescription: string;
  artworkKey: string;
  difficulty: WeeklyBossDifficulty;
  totalHealth: number;
  currentHealth: number;
  startsAt: string;
  endsAt: string;
  status: WeeklyBossStatus;
  missions: WeeklyBossMission[];
  milestones: WeeklyBossMilestone[];
  rewards: WeeklyBossRewardConfig;
  totalParticipants: number;
  totalHits: number;
  defeatedAt: string | null;
}

export interface WeeklyBossContributionEntry {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  idempotencyKey: string;
  activityType: SkillActivityType;
  actionLabel: string;
  damageDealt: number;
  safetyCapped: boolean;
  createdAt: string;
}

export interface WeeklyBossLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalDamage: number;
  contributionsCount: number;
  missionsCompleted: number;
}

export interface WeeklyBossPlayerSummary {
  totalDamage: number;
  contributionsCount: number;
  dailyDamageDealt: number;
  dailyDamageCap: number;
  missionProgress: Record<string, { current: number; target: number; completed: boolean; claimed: boolean }>;
  claimedMilestones: string[];
  participationClaimed: boolean;
  defeatRewardClaimed: boolean;
  topContributorClaimed: boolean;
}

export interface WeeklyBossStatePayload {
  event: WeeklyBossEvent;
  playerSummary: WeeklyBossPlayerSummary;
  leaderboard: WeeklyBossLeaderboardEntry[];
  leaderboardPage: number;
  leaderboardTotalPages: number;
  recentContributions: WeeklyBossContributionEntry[];
}

// --- PHASE 2 (COMPETITIVE ARENA): INDEPENDENT RIVALS PLATFORM ---

export type CompetitiveRivalMode =
  | 'strength'
  | 'endurance'
  | 'consistency'
  | 'discipline'
  | 'overall_fitness'
  | 'custom';

export type CompetitiveTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'
  | 'Legendary';

export type CompetitiveMatchStatus =
  | 'pending'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed';

export type CompetitiveMatchVisibility = 'friends' | 'public' | 'private';

export interface CompetitiveMatchRules {
  durationDays: number;
  targetScore: number;
  allowRestDays: boolean;
  ranked: boolean;
  customFocusNote?: string;
}

export interface CompetitiveRivalProfile {
  userId: string;
  username: string;
  characterClass: CharacterClass;
  level: number;
  rating: number;
  ratingDeviation: number;
  volatility: number;
  kFactor: number;
  tier: CompetitiveTier;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  peakRating: number;
  seasonalRating: number;
  allowNonFriendChallenges: boolean;
  presenceStatus?: PresenceStatus;
  placementMatchesPlayed?: number;
  placementCompleted?: boolean;
  demotionShieldRemaining?: number;
  currentDivisionIndex?: number;
  updatedAt: string;
}

export interface CompetitiveRivalMatch {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerRatingSnapshot?: number;
  challengerTierSnapshot?: CompetitiveTier;
  opponentId: string;
  opponentName: string;
  opponentRatingSnapshot?: number;
  opponentTierSnapshot?: CompetitiveTier;
  mode: CompetitiveRivalMode;
  challengeType: RivalChallengeType; // legacy compatibility mapping
  challengeTitle: string;
  rules: CompetitiveMatchRules;
  visibility: CompetitiveMatchVisibility;
  status: CompetitiveMatchStatus;
  isRanked: boolean;
  challengerScore: number;
  opponentScore: number;
  winnerId: string | null;
  isTie: boolean;
  challengerRatingBefore?: number | null;
  challengerRatingAfter?: number | null;
  challengerRatingDelta?: number | null;
  opponentRatingBefore?: number | null;
  opponentRatingAfter?: number | null;
  opponentRatingDelta?: number | null;
  rematchOfMatchId?: string | null;
  disputeReason?: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CompetitiveH2HRecord {
  opponentId: string;
  opponentName: string;
  opponentRating: number;
  opponentTier: CompetitiveTier;
  wins: number;
  losses: number;
  ties: number;
  totalMatches: number;
  lastPlayedAt: string | null;
}

export interface CompetitiveLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  characterClass: CharacterClass;
  rating: number;
  seasonalRating: number;
  tier: CompetitiveTier;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  currentStreak: number;
  peakRating: number;
  presenceStatus?: PresenceStatus;
  isCurrent?: boolean;
}

export interface MatchmakingQueueEntry {
  id: string;
  userId: string;
  mode: CompetitiveRivalMode;
  ratingSnapshot: number;
  minRating: number;
  maxRating: number;
  status: 'searching' | 'matched' | 'cancelled' | 'expired';
  matchedMatchId?: string | null;
  createdAt: string;
  expiresAt: string;
}

export type RivalChallengeType =
  | 'weekly_activity_score'
  | 'workout_consistency'
  | 'strength_milestones'
  | 'endurance_achievements'
  | 'habit_completion';

export type RivalryStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'expired';

export interface RivalryScoreEntry {
  id: string;
  rivalryId: string;
  userId: string;
  idempotencyKey: string;
  activityType: SkillActivityType;
  label: string;
  pointsAwarded: number;
  safetyCapped: boolean;
  createdAt: string;
}

export interface RivalryRecord {
  id: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  challengeType: RivalChallengeType;
  challengeTitle: string;
  status: RivalryStatus;
  challengerScore: number;
  opponentScore: number;
  winnerId: string | null;
  isTie: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface RivalryStatsSummary {
  wins: number;
  losses: number;
  ties: number;
  activeCount: number;
  pendingIncomingCount: number;
  titlesUnlocked: string[];
  achievementsUnlocked: string[];
}

export interface RivalsArenaStateResponse {
  profile: CompetitiveRivalProfile;
  queueEntry: MatchmakingQueueEntry | null;
  matches: CompetitiveRivalMatch[];
  events: RivalryScoreEntry[];
  h2hRecords: CompetitiveH2HRecord[];
  leaderboard: CompetitiveLeaderboardEntry[];
  candidates: CompetitiveRivalProfile[];
  // Legacy-compatible projection
  rivalries: RivalryRecord[];
  summary: RivalryStatsSummary;
}

// --- PHASE 4: AI FITNESS MENTOR ---

export type MentorMessageRole = 'user' | 'mentor';

export interface MentorRecommendedQuest {
  id: string;
  title: string;
  description: string;
  category: DynamicQuestCategory;
  difficulty: DynamicQuestDifficulty;
  estimatedMinutes: number;
  objectiveLabel: string;
  evidenceType: DynamicQuestEvidenceType;
  maxProgress: number;
  unitLabel: string;
  playerXpReward: number;
  goldReward: number;
  rationale: string;
  accepted: boolean;
  createdAt: string;
}

export interface MentorChatMessage {
  id: string;
  role: MentorMessageRole;
  content: string;
  focusAreas?: string[];
  recoveryAdvice?: string;
  safetyNotice?: string;
  recommendedQuest?: MentorRecommendedQuest | null;
  createdAt: string;
}

export interface MentorWeeklyAnalysis {
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  realisticPlan: string[];
  recoveryRecommendation: string;
  generatedAt: string;
}

// --- PHASE 5: COMMUNITY EVENTS ---

export type CommunityEventStatus = 'upcoming' | 'active' | 'completed';

export interface CommunityEventMilestone {
  id: string;
  title: string;
  targetPoints: number;
  rewardXp: number;
  rewardGold: number;
  rewardCardId?: string;
  rewardTitleId?: string;
  rewardCosmeticId?: string;
}

export interface CommunityEventAnnouncement {
  id: string;
  eventId: string;
  title: string;
  message: string;
  severity: 'info' | 'milestone' | 'alert';
  createdAt: string;
}

export interface CommunityEventChallenge {
  id: string;
  title: string;
  description: string;
  metric: 'verified_activities' | 'workouts' | 'cardio' | 'habits' | 'study' | 'recovery_habit';
  targetCount: number;
  rewardXp: number;
  rewardGold: number;
  minLevel?: number;
  rewardCardId?: string;
  rewardTitleId?: string;
  rewardCosmeticId?: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  themeColor: string;
  status: CommunityEventStatus;
  startsAt: string;
  endsAt: string;
  targetGoalPoints: number;
  currentGoalPoints: number;
  participantsCount: number;
  milestones: CommunityEventMilestone[];
  limitedChallenges?: CommunityEventChallenge[];
  minLevelRequired?: number;
}

export interface CommunityEventHistoryEntry {
  id: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  finalPoints: number;
  targetGoalPoints: number;
  participantsCount: number;
  completedMilestonesCount: number;
  endedAt: string;
}

export interface CommunityEventPlayerState {
  event: CommunityEvent;
  upcomingEvents?: CommunityEvent[];
  eventHistory?: CommunityEventHistoryEntry[];
  announcements?: CommunityEventAnnouncement[];
  playerPoints: number;
  playerContributionsCount: number;
  claimedMilestoneIds: string[];
  claimedChallengeIds?: string[];
  challengeProgress?: Record<string, { current: number; target: number; completed: boolean; claimed: boolean }>;
  topContributors: Array<{ rank: number; userId: string; username: string; points: number }>;
}

// --- PHASE 6: PERSONAL RECORDS MUSEUM ---

export type MuseumCategory =
  | 'fitness'
  | 'strength'
  | 'endurance'
  | 'consistency'
  | 'personal_best'
  | 'boss_battle'
  | 'rivalry'
  | 'community_event'
  | 'seasonal'
  | 'rare_legendary';

export type MuseumRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface MuseumRecord {
  id: string;
  userId: string;
  idempotencyKey: string;
  category: MuseumCategory;
  metricKey: string;
  title: string;
  description: string;
  numericValue: number;
  displayValue: string;
  isPersonalBest: boolean;
  achievedAt: string;
  sourceActivityRef: string;
  verified: boolean;
  rarity: MuseumRarity;
}

export interface MuseumLockedMilestone {
  id: string;
  category: MuseumCategory;
  title: string;
  description: string;
  requirementText: string;
  rarity: MuseumRarity;
}

// --- AAA POLISH 2.0: PHASE 1 (ADVANCED PLAYER IDENTITY) ---

export type IdentityRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Mythic';

export interface PlayerTitleDefinition {
  id: string;
  name: string;
  rarity: IdentityRarity;
  description: string;
  unlockRequirement: string;
  limitedEdition?: boolean;
  category:
    | 'discipline'
    | 'endurance'
    | 'strength'
    | 'consistency'
    | 'boss'
    | 'social'
    | 'seasonal'
    | 'rivals'
    | 'collection'
    | 'prestige'
    | 'event';
  conditionType:
    | 'streak_days'
    | 'workouts_total'
    | 'verified_reps_total'
    | 'boss_hits_total'
    | 'bosses_defeated'
    | 'skill_level_any'
    | 'skill_nodes_unlocked'
    | 'achievements_unlocked'
    | 'rivalry_wins'
    | 'community_points'
    | 'player_level'
    | 'season_tier'
    | 'cards_collected'
    | 'collection_percent'
    | 'prestige_tier'
    | 'friendship_level'
    | 'ranked_division'
    | 'marketplace_unlock'
    | 'event_milestone';
  threshold: number;
}

export interface PlayerUnlockedTitle {
  titleId: string;
  unlockedAt: string;
  sourceRef: string;
}

export interface RareBadgeDefinition {
  id: string;
  name: string;
  rarity: IdentityRarity;
  iconName: string;
  description: string;
  unlockRequirement: string;
  globalExclusive?: boolean;
  conditionType:
    | 'workouts_total'
    | 'verified_reps_total'
    | 'streak_days'
    | 'boss_damage_total'
    | 'bosses_defeated'
    | 'skill_nodes_unlocked'
    | 'rivalry_wins'
    | 'community_points'
    | 'museum_records'
    | 'season_tier'
    | 'reputation_score';
  threshold: number;
}

export interface PlayerUnlockedBadge {
  badgeId: string;
  unlockedAt: string;
  sourceRef: string;
  globalClaimOrder?: number | null;
}

export interface ReputationBreakdown {
  workoutsScore: number;
  consistencyScore: number;
  bossParticipationScore: number;
  rivalryScore: number;
  communityScore: number;
  skillMasteryScore: number;
  titlesAndBadgesScore: number;
}

export interface PlayerLifetimeStatistics {
  totalActivities: number;
  totalWorkouts: number;
  totalVerifiedReps: number;
  totalActiveMinutes: number;
  totalHabitsCompleted: number;
  longestStreak: number;
  totalAchievementsUnlocked: number;
  totalPersonalRecords: number;
  totalBossDamage: number;
  totalBossesDefeated: number;
  rivalryWins: number;
  communityPoints: number;
  skillNodesUnlocked: number;
  joinedAt: string | null;
}

export interface PlayerIdentityState {
  userId: string;
  equippedTitleId: string | null;
  equippedSecondaryTitleId?: string | null;
  prestigeTier?: number;
  featuredBadgeIds: string[];
  unlockedTitles: PlayerUnlockedTitle[];
  unlockedBadges: PlayerUnlockedBadge[];
  reputationScore: number;
  reputationTier: string;
  reputationBreakdown: ReputationBreakdown;
  lifetimeStats: PlayerLifetimeStatistics;
  globalBadgeOwners: Record<
    string,
    { badgeId: string; ownerId: string; ownerUsername: string; claimedAt: string }
  >;
}

// --- AAA POLISH 2.0: PHASE 2 (INTELLIGENT NOTIFICATION PREFERENCES) ---

export interface ServerNotificationPreferences {
  masterEnabled: boolean;
  fitness: boolean;
  social: boolean;
  achievement: boolean;
  boss: boolean;
  community: boolean;
  seasonal: boolean;
  updatedAt?: string;
}

// --- AAA POLISH 2.0: PHASE 3 (SEASONAL PROGRESSION SYSTEM) ---

export type SeasonStatus = 'upcoming' | 'active' | 'archived';

export interface SeasonChallengeDefinition {
  id: string;
  cadence: 'weekly' | 'season';
  title: string;
  description: string;
  metric:
    | 'verified_activities'
    | 'workouts'
    | 'habit_completions'
    | 'boss_hits'
    | 'community_points'
    | 'rivalry_matches'
    | 'study_sessions';
  targetCount: number;
  seasonalXpReward: number;
}

export interface SeasonMilestoneReward {
  tier: number;
  id: string;
  title: string;
  requiredSeasonXp: number;
  rewardType: 'cosmetic_crest' | 'title' | 'badge' | 'achievement' | 'card' | 'fragments' | 'gold';
  rewardLabel: string;
  rewardRefId?: string;
  rewardCardId?: string;
  rewardTitleId?: string;
  rewardGold?: number;
  rewardFragments?: number;
  track?: 'free' | 'elite' | 'premium';
  eliteRewardType?: 'cosmetic_crest' | 'title' | 'badge' | 'card' | 'fragments' | 'gold';
  eliteRewardLabel?: string;
  eliteCosmeticId?: string;
  eliteCardId?: string;
  eliteTitleId?: string;
  eliteGold?: number;
  eliteFragments?: number;
}

export interface SeasonDefinition {
  id: string;
  seasonNumber: number;
  name: string;
  theme: string;
  subtitle: string;
  description: string;
  accentHex: string;
  startsAt: string;
  endsAt: string;
  status: SeasonStatus;
  challenges: SeasonChallengeDefinition[];
  milestones: SeasonMilestoneReward[];
  dailyXpCap?: number;
}

export interface SeasonLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  characterClass: CharacterClass;
  seasonXp: number;
  currentTier: number;
  completionPercent: number;
}

export interface ArchivedSeasonSummary {
  seasonId: string;
  seasonNumber: number;
  name: string;
  theme: string;
  startsAt: string;
  endsAt: string;
  archivedAt: string;
  totalParticipants: number;
  topPlayers: SeasonLeaderboardEntry[];
  playerSummary?: {
    rank: number | null;
    seasonXp: number;
    tierReached: number;
    completionPercent: number;
    claimedRewardTitles: string[];
  } | null;
}

export interface SeasonalCosmeticRecord {
  seasonId: string;
  seasonName: string;
  rewardId: string;
  rewardLabel: string;
  track: 'free' | 'elite';
  earnedAt: string;
}

export interface PlayerSeasonStateResponse {
  season: SeasonDefinition;
  playerProgress: {
    seasonXp: number;
    currentTier: number;
    completionPercent: number;
    challengeProgress: Record<
      string,
      { current: number; target: number; completed: boolean; claimed: boolean }
    >;
    claimedMilestoneIds: string[];
    claimedEliteMilestoneIds?: string[];
    unlockedCosmetics: string[];
    eliteUnlocked?: boolean;
    verifiedActivitiesCount?: number;
    dailyXpEarnedToday?: number;
    dailyXpCap?: number;
  };
  cosmeticCollection?: SeasonalCosmeticRecord[];
  leaderboard: SeasonLeaderboardEntry[];
  leaderboardPage: number;
  leaderboardTotalPages: number;
  history: ArchivedSeasonSummary[];
}

// --- AAA POLISH 2.0: PHASE 4 (ADVANCED LEADERBOARDS) ---

export interface AdvancedLeaderboardResponse {
  scope: LeaderboardScope;
  periodKey: string;
  resetLabel: string;
  resetAt: string | null;
  scoreUnit: string;
  page: number;
  limit: number;
  totalEntries: number;
  totalPages: number;
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  historicalSnapshots: Array<{
    periodKey: string;
    scope: LeaderboardScope;
    capturedAt: string;
    topThree: Array<{ rank: number; userId: string; name: string; score: number }>;
  }>;
}

// ==============================================================================
// LIFEQUEST EXPANSION 3.0: SOCIAL, PARTIES, 2D COSMETICS, DECISIONS,
// TROPHY SHOWCASE & TERRITORY WARS
// ==============================================================================

// --- 1. ADVENTURER'S ACTIVITY FEED ---

export type FeedPostCategory =
  | 'workout'
  | 'record'
  | 'achievement'
  | 'competition'
  | 'milestone'
  | 'level_up';

export type FeedFilter = 'all' | 'friends' | 'achievements' | 'workouts' | 'competitions';
export type FeedCommentPermission = 'everyone' | 'friends' | 'nobody';
export type FeedReactionKey = 'like' | '🔥' | '⚔️' | '🏆' | '💪';

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorUsername: string;
  authorClass: CharacterClass;
  authorLevel: number;
  category: FeedPostCategory;
  eventKey: string;
  title: string;
  summary: string;
  highlightValue?: string | null;
  privacyScope: 'everyone' | 'friends' | 'nobody';
  commentPermission: FeedCommentPermission;
  canComment: boolean;
  verified: boolean;
  reactions: Record<FeedReactionKey, number>;
  myReactions: FeedReactionKey[];
  comments: FeedComment[];
  createdAt: string;
}

export interface FeedListResponse {
  posts: FeedPost[];
  page: number;
  limit: number;
  totalPosts: number;
  hasMore: boolean;
}

// --- 2. WORKOUT PARTIES ---

export type WorkoutPartyStatus = 'lobby' | 'countdown' | 'active' | 'completed' | 'expired';

export interface WorkoutPartyChallengeTemplate {
  id: string;
  title: string;
  description: string;
  activityType: SkillActivityType;
  targetValue: number;
  targetUnit: string;
  minVerifiedMinutes: number;
  minVerifiedReps?: number;
}

export interface WorkoutPartyMember {
  userId: string;
  username: string;
  characterClass: CharacterClass;
  level: number;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  progressValue: number;
  completed: boolean;
  verifiedSubmissionRef?: string | null;
  joinedAt: string;
  lastHeartbeatAt: string;
  appearance?: CharacterAppearance;
}

export interface WorkoutPartyMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  kind: 'message' | 'reaction' | 'system';
  content: string;
  createdAt: string;
}

export interface WorkoutParty {
  id: string;
  roomCode: string;
  hostId: string;
  hostUsername: string;
  title: string;
  challengeId: string;
  challengeName: string;
  activityType: SkillActivityType;
  targetValue: number;
  targetUnit: string;
  visibility: 'friends' | 'private' | 'public';
  status: WorkoutPartyStatus;
  countdownEndsAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  expiresAt: string;
  summarySaved: boolean;
  members: WorkoutPartyMember[];
  messages: WorkoutPartyMessage[];
  invitedUserIds: string[];
  createdAt: string;
}

export interface WorkoutPartyHistoryEntry {
  id: string;
  partyId: string;
  userId?: string;
  challengeId: string;
  challengeName: string;
  targetValue: number;
  targetUnit: string;
  groupTotal: number;
  userProgress: number;
  participantsCount: number;
  completedAt: string;
}

// --- 3. 2D CHARACTER CUSTOMIZATION & COSMETICS ---

export type CosmeticSlot = 'hairstyle' | 'outfit' | 'color' | 'frame' | 'banner' | 'aura';
export type CosmeticRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface CosmeticItemDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  unlockSource: string;
  unlockRule: {
    type: 'starter' | 'level' | 'workouts' | 'habits' | 'achievements' | 'season' | 'territory' | 'milestone';
    threshold: number;
  };
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  patternTag: string;
}

export interface CharacterAppearance {
  hairstyleId: string | null;
  outfitId: string | null;
  colorId: string | null;
  frameId: string | null;
  bannerId: string | null;
  auraId: string | null;
}

export interface CosmeticCollectionMilestone {
  id: string;
  title: string;
  requiredUnlocked: number;
  rewardCosmeticId: string;
  rewardLabel: string;
}

export interface PlayerCosmeticState {
  userId: string;
  unlockedIds: string[];
  unlockedDetails: Record<string, { unlockedAt: string; sourceRef: string }>;
  appearance: CharacterAppearance;
  claimedMilestoneIds: string[];
  loadouts?: PlayerLoadout[];
  activeLoadoutId?: string | null;
  competitionLoadoutId?: string | null;
  unlockedLoadoutSlots?: number;
  maxLoadoutSlots?: number;
}

// --- 4. COMMUNITY DECISIONS ---

export type CommunityPollCategory =
  | 'community_event'
  | 'boss_theme'
  | 'seasonal_reward'
  | 'challenge_category';

export type CommunityPollType = 'single_choice' | 'multiple_choice';
export type CommunityPollStatus = 'active' | 'closed' | 'cancelled' | 'published';

export interface CommunityPollOption {
  id: string;
  label: string;
  description?: string;
  voteCount: number;
}

export interface CommunityPoll {
  id: string;
  title: string;
  description: string;
  category: CommunityPollCategory;
  pollType: CommunityPollType;
  maxChoices: number;
  status: CommunityPollStatus;
  showLiveResults: boolean;
  options: CommunityPollOption[];
  totalVotes: number;
  mySelectedOptionIds: string[];
  publishedOutcome?: string | null;
  closesAt: string;
  createdAt: string;
  closedAt?: string | null;
  reportCount?: number;
}

export interface CommunityPollReport {
  id: string;
  pollId: string;
  reporterId: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

// --- 5. TROPHY SHOWCASE ---

export type TrophyCategoryFilter = 'all' | 'achievements' | 'competitions' | 'fitness' | 'seasons';

export interface TrophyShowcaseItem {
  id: string;
  sourceKind: 'achievement' | 'global_legend' | 'museum' | 'badge' | 'season';
  category: Exclude<TrophyCategoryFilter, 'all'>;
  title: string;
  description: string;
  requirement: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Eternal';
  unlockedAt: string;
  isGlobalExclusive?: boolean;
  globalClaimOrder?: number | null;
  pinned: boolean;
}

export interface TrophyShowcaseState {
  userId: string;
  trophies: TrophyShowcaseItem[];
  pinnedIds: string[];
  totalAvailableCount: number;
  unlockedCount: number;
  completionPercent: number;
}

export interface HiddenAchievementClientView {
  id: string;
  discovered: boolean;
  revealed?: boolean;
  unlockedByCaller?: boolean;
  name: string;
  maskedTitle: string;
  maskedHint: string;
  hint?: string;
  rarity: GlobalAchievementRarity;
  emblemIcon?: string;
  story?: string;
  titleTag?: string;
  requirementSummary?: string;
  globalFirstOwnerName?: string | null;
  unlockedAt?: string | null;
}

// --- 6. TERRITORY WARS (GUILD VS GUILD, 2D FICTIONAL MAP) ---

export type TerritoryMissionStance = 'offensive' | 'defensive';

export interface TerritoryRegion {
  id: string;
  name: string;
  subtitle: string;
  regionTheme: string;
  mapX: number; // percentage 0..100
  mapY: number; // percentage 0..100
  bonusCosmeticId: string;
  bonusCosmeticName: string;
  ownerGuildId: string | null;
  ownerGuildName: string | null;
  ownerGuildTag: string | null;
  guildScores: Record<string, { guildId: string; guildName: string; guildTag: string; points: number }>;
  totalPoints: number;
}

export interface TerritoryGuildStanding {
  rank: number;
  guildId: string;
  guildName: string;
  guildTag: string;
  territoriesControlled: number;
  totalPoints: number;
  contributorsCount: number;
}

export interface TerritoryWarHistoryEntry {
  id: string;
  campaignId: string;
  territoryId: string;
  territoryName: string;
  winningGuildId: string | null;
  winningGuildName: string | null;
  winningGuildTag: string | null;
  totalPoints: number;
  resolvedAt: string;
}

export interface TerritoryWarsStateResponse {
  campaign: {
    id: string;
    title: string;
    seasonNumber: number;
    status: 'scheduled' | 'active' | 'resolved';
    minGuildMembers: number;
    startsAt: string;
    endsAt: string;
  };
  territories: TerritoryRegion[];
  standings: TerritoryGuildStanding[];
  history: TerritoryWarHistoryEntry[];
  playerStatus: {
    guildId: string | null;
    guildName: string | null;
    guildTag: string | null;
    eligible: boolean;
    eligibilityReason?: string;
    selectedTerritoryId: string;
    selectedStance: TerritoryMissionStance;
    playerPoints: number;
    dailyPointsToday: number;
    dailyPointsCap: number;
  };
}

// ==============================================================================
// LIFEQUEST AAA 15-FEATURE SUITE TYPES
// ==============================================================================

// --- AAA 1: 50-LEVEL BATTLE PASS EXTENSIONS ---
export type BattlePassRewardType =
  | 'cosmetic_crest'
  | 'cosmetic_frame'
  | 'cosmetic_banner'
  | 'cosmetic_outfit'
  | 'cosmetic_aura'
  | 'title'
  | 'badge'
  | 'collectible_card'
  | 'card_pack'
  | 'fragments'
  | 'gold'
  | 'achievement';

// --- AAA 2: COLLECTIBLE CARD SYSTEM ---
export type CollectibleCardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
export type CollectibleCardCategory = 'fitness_milestone' | 'seasonal_theme' | 'community_event' | 'mythic_hero';

export interface CollectibleCardDef {
  id: string;
  name: string;
  subtitle: string;
  rarity: CollectibleCardRarity;
  category: CollectibleCardCategory;
  seasonTag?: string;
  limitedEdition?: boolean;
  lore: string;
  motif: 'flame' | 'stride' | 'crown' | 'canopy' | 'fist' | 'star' | 'wave' | 'titan';
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  flavorStatLabel: string;
  flavorStatValue: string;
}

export interface PlayerCollectibleCardEntry {
  cardId: string;
  quantity: number;
  firstObtainedAt: string;
  isFavorite: boolean;
  favoriteSlot: number | null;
  sourceRef: string;
}

export interface CardPackDef {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  priceGold: number;
  priceFragments: number;
  guaranteedMinRarity: CollectibleCardRarity;
  dropRates: Record<CollectibleCardRarity, number>; // sums to 100
  accentHex: string;
  featuredCategory?: CollectibleCardCategory;
}

export interface CardCollectionAchievementDef {
  id: string;
  title: string;
  description: string;
  requiredUniqueCards: number;
  requiredRarity?: CollectibleCardRarity;
  rewardGold: number;
  rewardFragments: number;
  rewardTitleId?: string;
}

export interface CardsStateResponse {
  userId: string;
  ownedCards: PlayerCollectibleCardEntry[];
  favoriteCardIds: string[];
  uniqueOwnedCount: number;
  totalCatalogCount: number;
  completionPercent: number;
  packHistory: Array<{
    id: string;
    packId: string;
    packName: string;
    cardsDrawn: Array<{ cardId: string; isNew: boolean; fragmentsConverted: number }>;
    totalFragmentsGranted: number;
    openedAt: string;
  }>;
  claimedCollectionAchievements: string[];
  duplicateFragmentRates: Record<CollectibleCardRarity, number>;
}

// --- AAA 3: PLAYER LOADOUT SYSTEM (STRICTLY COSMETIC) ---
export interface PlayerLoadout {
  id: string;
  name: string;
  context: 'default' | 'competition';
  appearance: CharacterAppearance;
  titleId: string | null;
  secondaryTitleId: string | null;
  badgeIds: string[];
  showcaseCardIds?: string[];
  updatedAt: string;
}

// --- AAA 4: FRIENDSHIP LEVELS ---
export interface FriendshipProgressRecord {
  pairKey: string;
  friendId: string;
  friendUsername: string;
  friendClass: CharacterClass;
  friendLevel: number;
  friendshipXp: number;
  friendshipLevel: number;
  nextLevelXp: number;
  totalCoopActivities: number;
  completedMissionIds: string[];
  unlockedRewardIds: string[];
  recentHistory: Array<{
    id: string;
    sourceType: 'workout_party' | 'coop_mission' | 'shared_rivalry' | 'milestone_support';
    label: string;
    xpAwarded: number;
    createdAt: string;
  }>;
  updatedAt: string;
}

export interface CoopFriendshipMissionDef {
  id: string;
  title: string;
  description: string;
  targetActivities: number;
  friendshipXpReward: number;
  badgeLabel: string;
}

// --- AAA 6: COSMETIC MARKETPLACE & WALLET ---
export type MarketplaceCategory = 'frame' | 'banner' | 'title' | 'aura' | 'outfit' | 'pack';

export interface MarketplaceItemDef {
  id: string;
  category: MarketplaceCategory;
  name: string;
  description: string;
  rarity: IdentityRarity;
  priceGold: number;
  priceFragments: number;
  realMoneyUsdDisplay: string; // display-only while real-money checkout is disabled
  linkedCosmeticId?: string;
  linkedTitleId?: string;
  linkedPackId?: string;
  featuredCollectionTag?: string;
  rotating?: boolean;
  primaryHex: string;
  accentHex: string;
}

export interface PlayerWalletState {
  userId: string;
  goldBalance: number;
  cosmeticFragments: number;
  recentTransactions: Array<{
    id: string;
    currency: 'gold' | 'fragments';
    delta: number;
    source: string;
    createdAt: string;
  }>;
}

export interface MarketplaceStateResponse {
  wallet: PlayerWalletState;
  ownedItemIds: string[];
  wishlistIds: string[];
  featuredItemIds: string[];
  rotationEndsAt: string;
  realMoneyCheckoutEnabled: boolean;
  realMoneyStatusNotice: string;
  orders: Array<{
    id: string;
    itemId: string;
    itemName: string;
    currency: 'gold' | 'fragments';
    pricePaid: number;
    createdAt: string;
  }>;
}

// --- AAA 7: RANKED DIVISIONS & AAA 13: TOURNAMENTS + SPECTATOR MODE ---
export type RankedDivisionName =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster';

export interface RankedDivisionDef {
  division: RankedDivisionName;
  minRating: number;
  maxRating: number | null;
  accentHex: string;
  rewardTitleId: string;
  rewardTitleName: string;
  rewardFrameId: string;
}

export interface CommunityTournamentMatch {
  id: string;
  roundNumber: number;
  roundLabel: string;
  playerAId: string;
  playerAName: string;
  playerARating: number;
  playerBId: string | null;
  playerBName: string;
  playerBRating: number | null;
  playerAScore: number;
  playerBScore: number;
  winnerId: string | null;
  status: 'upcoming' | 'live' | 'completed';
}

export interface CommunityTournament {
  id: string;
  title: string;
  subtitle: string;
  mode: CompetitiveRivalMode;
  status: 'upcoming' | 'active' | 'completed';
  startsAt: string;
  endsAt: string;
  participants: Array<{
    userId: string;
    username: string;
    rating: number;
    division: RankedDivisionName;
  }>;
  matches: CommunityTournamentMatch[];
}

export interface SpectatorLiveMatchSummary {
  matchId: string;
  challengeTitle: string;
  mode: CompetitiveRivalMode;
  isRanked: boolean;
  visibility: CompetitiveMatchVisibility;
  status: CompetitiveMatchStatus;
  challengerId: string;
  challengerName: string;
  challengerRating: number;
  challengerDivision: RankedDivisionName;
  challengerScore: number;
  challengerLoadoutSummary?: string;
  opponentId: string;
  opponentName: string;
  opponentRating: number;
  opponentDivision: RankedDivisionName;
  opponentScore: number;
  opponentLoadoutSummary?: string;
  targetScore: number;
  endsAt: string;
  cheerCounts: Record<string, number>;
  recentCheers: Array<{
    id: string;
    spectatorName: string;
    targetUserId: string;
    emoji: string;
    createdAt: string;
  }>;
}

// --- AAA 8: COLLECTION COMPLETION SYSTEM ---
export interface CollectionCompletionResponse {
  userId: string;
  categories: Array<{
    key: 'trophies' | 'cards' | 'cosmetics' | 'seasonal';
    label: string;
    ownedCount: number;
    totalCount: number;
    undiscoveredCount: number;
    percent: number;
    items: Array<{
      id: string;
      name: string;
      rarity: string;
      status: 'owned' | 'unowned' | 'undiscovered';
      hint: string;
      discontinued?: boolean;
      seasonalTag?: string;
    }>;
  }>;
  overallOwnedCount: number;
  overallTotalCount: number;
  overallPercent: number;
  milestones: Array<{
    thresholdPercent: 25 | 50 | 75 | 100;
    id: string;
    title: string;
    rewardLabel: string;
    rewardTitleId: string;
    rewardCosmeticId?: string;
    rewardFragments: number;
    unlocked: boolean;
    claimed: boolean;
  }>;
}

// --- AAA 10: PEER REPUTATION & ENDORSEMENTS ---
export type EndorsementCategory = 'helpfulness' | 'sportsmanship' | 'consistency' | 'encouragement';

export interface PlayerEndorsementSummary {
  targetUserId: string;
  totalEndorsements: number;
  countsByCategory: Record<EndorsementCategory, number>;
  unlockedMilestoneIds: string[];
  canEndorseToday: boolean;
  cooldownReason?: string | null;
  recentEndorsements: Array<{
    id: string;
    fromUserId: string;
    fromUsername: string;
    category: EndorsementCategory;
    note?: string | null;
    createdAt: string;
  }>;
}

// --- AAA 11: ADDITIVE PRESTIGE SYSTEM (ZERO RESETS) ---
export interface PlayerPrestigeState {
  userId: string;
  prestigeTier: number;
  eligibleForNextPrestige: boolean;
  requiredLevelForNext: number;
  currentHeroLevel: number;
  prestigeTitle: string;
  nextPrestigeTitle: string | null;
  completedChallengeIds: string[];
  unlockedRewardIds: string[];
  history: Array<{
    tier: number;
    tierRoman: string;
    ascendedAt: string;
    heroLevelAtAscension: number;
    rewardLabel: string;
  }>;
  neverResetsGuarantee: string;
}

// --- AAA 12: FLEXIBLE DAILY REWARD CALENDAR ---
export interface DailyCalendarDayState {
  dayNumber: number;
  rewardType: 'fragments' | 'gold' | 'quest_bonus' | 'card' | 'card_pack';
  rewardLabel: string;
  amount: number;
  isWeeklyMilestone: boolean;
  claimed: boolean;
  claimedMode?: 'workout' | 'rest_recovery' | 'grace_catchup' | null;
  claimedAt?: string | null;
}

export interface DailyCalendarStateResponse {
  userId: string;
  monthKey: string;
  todayDateKey: string;
  claimedToday: boolean;
  totalClaimedThisMonth: number;
  activeParticipationDays: number;
  gracePassesRemaining: number;
  missedDaysRecoverable: number[];
  weeklyMilestones: Array<{
    id: string;
    dayTarget: number;
    title: string;
    rewardLabel: string;
    unlocked: boolean;
    claimed: boolean;
  }>;
  days: DailyCalendarDayState[];
}

// --- AAA 15: SEASONAL STATISTICS RECAP ---
export interface SeasonalStatVisibility {
  workouts: boolean;
  activeDays: boolean;
  personalRecords: boolean;
  xpAndLevels: boolean;
  questsAndAchievements: boolean;
  rivals: boolean;
  guildAndCommunity: boolean;
  rarestMilestone: boolean;
}

export interface SeasonalStatsRecap {
  seasonId: string;
  seasonName: string;
  seasonNumber: number;
  isArchived: boolean;
  generatedAt: string;
  verifiedWorkouts: number;
  activeDays: number;
  personalRecordsSet: number;
  seasonXpGained: number;
  tierReached: number;
  questsCompleted: number;
  achievementsUnlocked: number;
  rivalsWins: number;
  rivalsLosses: number;
  rivalsRatingDelta: number;
  guildAndCommunityPoints: number;
  rarestMilestoneTitle: string;
  rarestMilestoneRarity: string;
  visibility: SeasonalStatVisibility;
  previousSeasonComparison?: {
    previousSeasonName: string;
    workoutsDelta: number;
    activeDaysDelta: number;
    seasonXpDelta: number;
    rivalsRatingDelta: number;
  } | null;
}
