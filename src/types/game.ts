export type CharacterClass = 'Warrior' | 'Mage' | 'Ranger' | 'Guardian';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';
export type DietaryPreference = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian' | 'other';
export type UnitSystem = 'metric' | 'imperial';
export type AgeGroup = 'child' | 'early_teen' | 'older_teen' | 'adult' | 'older_adult';
export type BiologicalSex = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'dnd';

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
  forgeXP: number;
  gold: number;
  currentKingdomId: string;
  currentChapterId: string;
  equippedWeaponId: string;
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
  forgeXpReward: number;
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
  category: 'fitness' | 'habit' | 'boss' | 'nutrition' | 'armory';
  progress: number;
  maxProgress: number;
  playerXpReward: number;
  forgeXpReward: number;
  completed: boolean;
  claimed: boolean;
  expiresIn?: string;
}

export type EquipmentSlotType = 'mainWeapon' | 'offHand' | 'armour' | 'helmet' | 'accessory';

export interface EquippedGear {
  mainWeaponId: string;
  offHandId?: string | null;
  armourId?: string | null;
  helmetId?: string | null;
  accessoryId?: string | null;
}

export type WeaponCategory =
  | 'Swords'
  | 'Greatswords'
  | 'Daggers'
  | 'Dual Blades'
  | 'Bows'
  | 'Crossbows'
  | 'Magic Staffs'
  | 'Wands'
  | 'Spears'
  | 'Axes'
  | 'War Hammers'
  | 'Scythes'
  | 'Shields'
  | 'Armour'
  | 'Helmets'
  | 'Accessories';

export type WeaponRarity =
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

export type WeaponObtainMethod =
  | 'starter'
  | 'shop'
  | 'quest_unlock'
  | 'boss_trophy'
  | 'achievement'
  | 'evolution';

export interface WeaponUnlockRequirement {
  summary: string;
  minLevel?: number;
  minAetherRank?: AetherRankStage;
  requiredKingdomCleared?: string;
  minBossesDefeated?: number;
  minStreakDays?: number;
  minWorkouts?: number;
  minVerifiedReps?: number;
  forgeXpCost?: number;
  goldCost?: number;
  achievementId?: string;
  sourceWeaponId?: string;
}

export interface WeaponEvolutionPath {
  nextWeaponId: string;
  nextName: string;
  nextRarity: WeaponRarity;
  reqWeaponLevel: number;
  reqMasteryLevel: number;
  reqAetherRank: AetherRankStage;
  reqPlayerLevel?: number;
  requiredKingdomCleared?: string;
  minBossesDefeated?: number;
  forgeXpCost: number;
  goldCost: number;
  description: string;
  visualTransformation: string;
  unlockedAbilityName?: string;
}

export interface WeaponAbility {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockRequirement: string;
  unlockMasteryLevel: number;
  combatEffect: string;
  unlocked: boolean;
  damageMultiplier?: number;
  defenseBoost?: number;
  critBonus?: number;
  element?: ElementType;
  staminaCost?: number;
}

export interface Weapon {
  id: string;
  name: string;
  category: WeaponCategory;
  rarity: WeaponRarity;
  level: number;
  maxLevel: number;
  baseAttack: number;
  attackPerLevel: number;
  baseDefense: number;
  defensePerLevel: number;
  critChance?: number; // bonus % added in combat (e.g. 8 => +8%)
  critDamage?: number; // crit multiplier % (e.g. 180 => 1.8x, 220 => 2.2x)
  speed?: number; // 1-100 agility rating: improves stamina efficiency & dodge grace
  element?: ElementType;
  abilityPower?: number; // % bonus scaling on active combat abilities
  specialAbilityName?: string;
  specialAbilitySummary?: string;
  combatIntegrationStatus?: 'active_in_combat' | 'passive_stat' | 'visual_only';
  obtainMethod?: WeaponObtainMethod;
  unlockRequirement?: WeaponUnlockRequirement;
  evolutionPath?: WeaponEvolutionPath;
  awakened?: boolean;
  awakeningLevel?: number;
  upgradeForgeCost: number;
  unlocked: boolean;
  equipped: boolean;
  description: string;
  lore: string;
  illustration?: string;
  // Hybrid Weapon Evolution System
  evolutionStage: AetherRankStage;
  masteryLevel: number;
  masteryXP: number;
  masteryXPNextLevel: number;
  masteryPath: MasteryPath;
  abilities: WeaponAbility[];
  evolutionVisual?: {
    glowColor: string;
    auraStyle: string;
    runeSymbol: string;
    titlePrefix: string;
  };
}

export type BuffEffectType = 'attack' | 'defense' | 'crit' | 'xp';

export interface Buff {
  id: string;
  name: string;
  description: string;
  rarity: WeaponRarity;
  effectType: BuffEffectType;
  effectValue: number; // percentage e.g. 10 for +10%
  unlockRequirement: string;
  earnedSource: string;
  durationBattles: number;
  usesRemaining: number;
  active: boolean;
  iconName: string;
}

export type ExerciseType = 
  | 'squat' 
  | 'pushup' 
  | 'jumping_jack' 
  | 'lunge' 
  | 'knee_raise' 
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
  forgeXpEarned: number;
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
  rewardForgeXp: number;
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
  category: 'quests' | 'consistency' | 'armory' | 'combat' | 'exploration' | 'multiplayer';
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  claimed: boolean;
  rewardPlayerXp: number;
  rewardForgeXp: number;
  rewardGold?: number;
}

export interface Transaction {
  id: string;
  type: 'PLAYER_XP' | 'FORGE_XP' | 'GOLD' | 'AETHER_POINTS';
  source: string;
  amount: number;
  timestamp: string;
}

export interface ShopItem {
  id: string;
  itemType: 'weapon' | 'shield' | 'armour' | 'helmet' | 'accessory' | 'buff' | 'elixir' | 'catalyst' | 'cosmetic';
  name: string;
  description: string;
  rarity: WeaponRarity;
  priceGold: number;
  priceForgeXp: number;
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
    equippedWeapon?: {
      weaponId: string;
      name: string;
      category: WeaponCategory;
      rarity: WeaponRarity;
      level: number;
      evolutionStage: AetherRankStage;
      masteryLevel: number;
      element: ElementType;
    };
    unlockedWeaponsCount?: number;
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

export interface PlayableHeroDefinition {
  id: PlayableHeroId;
  name: string;
  title: string;
  mappedClass: CharacterClass;
  archetype: string;
  greatFallOrigin: string;
  roleSummary: string;
  startingEquipment: string[];
  attributeFocus: RpgAttributeKey[];
  abilities: HeroAbilitySummary[];
  strengths: string[];
  accentHex: string;
  secondaryHex: string;
  introFlourishLabel: string;
}

export type ReclaimHonorObjectiveId =
  | 'visit_armory'
  | 'inspect_equipment'
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
    forgeXp: number;
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
  forgeXpReward: number;
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
  forgeXpReward: number;
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
    forgeXpEarned: number;
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
  | 'quests_claimed_total'
  | 'dynamic_quests_claimed_total'
  | 'dynamic_physical_claimed'
  | 'dynamic_intellectual_claimed'
  | 'dynamic_discipline_claimed'
  | 'dynamic_personal_growth_claimed'
  | 'dynamic_social_claimed'
  | 'normal_achievements_unlocked'
  | 'unlocked_weapons_count'
  | 'max_weapon_level'
  | 'friends_count'
  | 'guild_joined'
  | 'guild_leader'
  | 'chat_messages_sent'
  | 'story_chapters_claimed'
  | 'all_kingdoms_cleared'
  | 'honor_reclaimed'
  | 'daily_reports_generated'
  | 'gold_balance'
  | 'forge_xp_balance';

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
  rewardForgeXp: number;
  rewardGold: number;
  isHidden?: boolean;
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

export interface PlayerSkillTreeState {
  attributes: Record<SkillAttributeId, PlayerAttributeProgress>;
  unlockedNodeIds: string[];
  claimedMilestoneIds: string[];
  recentEvents: SkillActivityLedgerEntry[];
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
  defeatForgeXp: number;
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

// --- PHASE 3: FRIEND RIVAL SYSTEM ---

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
  forgeXpReward: number;
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
}

export interface CommunityEventPlayerState {
  event: CommunityEvent;
  playerPoints: number;
  playerContributionsCount: number;
  claimedMilestoneIds: string[];
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
  category: 'discipline' | 'endurance' | 'strength' | 'consistency' | 'boss' | 'social' | 'seasonal';
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
    | 'season_tier';
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
  rewardType: 'cosmetic_crest' | 'title' | 'badge' | 'achievement';
  rewardLabel: string;
  rewardRefId?: string;
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
    unlockedCosmetics: string[];
  };
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



