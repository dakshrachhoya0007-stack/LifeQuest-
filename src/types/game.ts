export type CharacterClass = 'Warrior' | 'Mage' | 'Ranger' | 'Guardian';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';
export type DietaryPreference = 'vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian' | 'other';
export type UnitSystem = 'metric' | 'imperial';
export type AgeGroup = 'child' | 'early_teen' | 'older_teen' | 'adult' | 'older_adult';
export type BiologicalSex = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export interface NotificationPreferences {
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

export type LeaderboardScope = 'global' | 'weekly' | 'monthly' | 'guild' | 'friends';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  characterClass: CharacterClass;
  level: number;
  aetherRank: AetherRankStage;
  streak: number;
  score: number;
  isCurrent?: boolean;
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
}

export interface PublicPlayerProfile {
  accessible: boolean;
  restrictedReason?: 'private' | 'friends_only';
  blocked?: boolean;
  blockedByMe?: boolean;
  error?: string;
  player?: {
    id: string;
    username: string;
    characterName?: string;
    characterClass: CharacterClass;
    level?: number;
    totalXp?: number | null;
    aetherRank?: AetherRankStage;
    aetherPoints?: number | null;
    currentStreak?: number | null;
    totalWorkoutsCompleted?: number | null;
    totalVerifiedReps?: number | null;
    totalBossesDefeated?: number | null;
    bio?: string;
    profileVisibility?: ProfileVisibility;
    showAchievements?: boolean;
    showEquipment?: boolean;
    showStats?: boolean;
    showGuild?: boolean;
    relationshipStatus: RelationshipStatus;
    friendshipId?: string | null;
    equippedWeapon?: {
      weaponId: string;
      name: string;
      category: WeaponCategory;
      rarity: WeaponRarity;
      level: number;
      evolutionStage: AetherRankStage;
      masteryLevel: number;
      element: ElementType;
    } | null;
    unlockedWeaponsCount?: number | null;
    guild?: {
      id: string;
      name: string;
      tag: string;
      level: number;
      role: GuildRole;
    } | null;
    achievements?: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      icon: string;
      unlocked: boolean;
    }>;
    lastActiveAt?: string;
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

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, any>;
  readAt: string | null;
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
