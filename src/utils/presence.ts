import {
  FieldVisibilityLevel,
  GranularPrivacySettings,
  PresenceStatus,
  PrivacyFieldKey,
  ProfileVisibility,
  UserAccount,
} from '../types/game';

export interface PresenceStatusMeta {
  status: PresenceStatus;
  label: string;
  shortLabel: string;
  description: string;
  dotColor: string;
  ringColor: string;
  glowShadow: string;
  textColor: string;
  borderColor: string;
}

export const PRESENCE_STATUS_META: Record<PresenceStatus, PresenceStatusMeta> = {
  online: {
    status: 'online',
    label: 'Online',
    shortLabel: 'Online',
    description: 'Active in Aetheria and visible to permitted companions.',
    dotColor: '#22C55E',
    ringColor: 'rgba(34, 197, 94, 0.32)',
    glowShadow: '0 0 10px rgba(34, 197, 94, 0.72)',
    textColor: '#86EFAC',
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  away: {
    status: 'away',
    label: 'Away',
    shortLabel: 'Away',
    description: 'Stepped away from the realm or idle.',
    dotColor: '#F59E0B',
    ringColor: 'rgba(245, 158, 11, 0.28)',
    glowShadow: '0 0 10px rgba(245, 158, 11, 0.65)',
    textColor: '#FCD34D',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  busy: {
    status: 'busy',
    label: 'Busy',
    shortLabel: 'Busy',
    description: 'Locked in training, deep focus, or a boss encounter.',
    dotColor: '#A855F7',
    ringColor: 'rgba(168, 85, 247, 0.3)',
    glowShadow: '0 0 10px rgba(168, 85, 247, 0.7)',
    textColor: '#D8B4FE',
    borderColor: 'rgba(168, 85, 247, 0.48)',
  },
  dnd: {
    status: 'dnd',
    label: 'Do Not Disturb',
    shortLabel: 'DND',
    description: 'Silence interruptions while forging discipline.',
    dotColor: '#EF4444',
    ringColor: 'rgba(239, 68, 68, 0.3)',
    glowShadow: '0 0 10px rgba(239, 68, 68, 0.7)',
    textColor: '#FCA5A5',
    borderColor: 'rgba(239, 68, 68, 0.48)',
  },
  offline: {
    status: 'offline',
    label: 'Offline',
    shortLabel: 'Offline',
    description: 'Appear offline across Aetheria without broadcasting live presence.',
    dotColor: '#64748B',
    ringColor: 'rgba(100, 116, 139, 0.22)',
    glowShadow: 'none',
    textColor: '#94A3B8',
    borderColor: 'rgba(100, 116, 139, 0.38)',
  },
};

export const PRESENCE_OPTIONS: PresenceStatus[] = ['online', 'away', 'busy', 'dnd', 'offline'];

export const DEFAULT_GRANULAR_PRIVACY_SETTINGS: GranularPrivacySettings = {
  privateByDefault: false,
  usernameAvatar: 'everyone',
  level: 'everyone',
  xpProgression: 'everyone',
  achievements: 'everyone',
  fitnessStats: 'everyone',
  workoutHistory: 'friends',
  personalRecords: 'friends',
  dailyActivity: 'friends',
  onlineStatus: 'everyone',
  lastActive: 'friends',
  bio: 'everyone',
  showEquipment: true,
  showGuild: true,
};

export const PRIVACY_FIELD_DEFINITIONS: Array<{
  key: PrivacyFieldKey;
  label: string;
  description: string;
}> = [
  {
    key: 'usernameAvatar',
    label: 'Username & Avatar',
    description: 'Controls who can see your champion name, title, and character portrait.',
  },
  {
    key: 'level',
    label: 'Player Level',
    description: 'Controls visibility of your numeric level and Aether Rank tier.',
  },
  {
    key: 'xpProgression',
    label: 'XP & Progression',
    description: 'Controls visibility of your total XP, level bar, and Aether points.',
  },
  {
    key: 'achievements',
    label: 'Achievements & Trophies',
    description: 'Controls who can view unlocked achievements and global exclusive trophies.',
  },
  {
    key: 'fitnessStats',
    label: 'Fitness Statistics',
    description: 'Controls visibility of workout count, verified reps, active minutes, and streaks.',
  },
  {
    key: 'workoutHistory',
    label: 'Workout History',
    description: 'Controls access to your recent logged training sessions.',
  },
  {
    key: 'personalRecords',
    label: 'Personal Records',
    description: 'Controls visibility of your best reps, durations, and distance milestones.',
  },
  {
    key: 'dailyActivity',
    label: 'Daily Activity',
    description: 'Controls visibility of today’s completed habits, active minutes, and hydration.',
  },
  {
    key: 'onlineStatus',
    label: 'Online / Presence Status',
    description: 'Controls who sees whether you are Online, Away, Busy, or Do Not Disturb.',
  },
  {
    key: 'lastActive',
    label: 'Last Active Information',
    description: 'Controls who can see when you were last active in the realm.',
  },
  {
    key: 'bio',
    label: 'Player Bio',
    description: 'Controls visibility of your custom hero biography.',
  },
];

export const PRIVATE_BY_DEFAULT_PRESET: GranularPrivacySettings = {
  privateByDefault: true,
  usernameAvatar: 'friends',
  level: 'nobody',
  xpProgression: 'nobody',
  achievements: 'nobody',
  fitnessStats: 'nobody',
  workoutHistory: 'nobody',
  personalRecords: 'nobody',
  dailyActivity: 'nobody',
  onlineStatus: 'nobody',
  lastActive: 'nobody',
  bio: 'nobody',
  showEquipment: false,
  showGuild: false,
};

export const FRIENDS_ONLY_PRESET: GranularPrivacySettings = {
  privateByDefault: false,
  usernameAvatar: 'everyone',
  level: 'friends',
  xpProgression: 'friends',
  achievements: 'friends',
  fitnessStats: 'friends',
  workoutHistory: 'friends',
  personalRecords: 'friends',
  dailyActivity: 'friends',
  onlineStatus: 'friends',
  lastActive: 'friends',
  bio: 'friends',
  showEquipment: true,
  showGuild: true,
};

export const PUBLIC_CHAMPION_PRESET: GranularPrivacySettings = {
  privateByDefault: false,
  usernameAvatar: 'everyone',
  level: 'everyone',
  xpProgression: 'everyone',
  achievements: 'everyone',
  fitnessStats: 'everyone',
  workoutHistory: 'everyone',
  personalRecords: 'everyone',
  dailyActivity: 'everyone',
  onlineStatus: 'everyone',
  lastActive: 'everyone',
  bio: 'everyone',
  showEquipment: true,
  showGuild: true,
};

export const normalizeGranularPrivacySettings = (
  raw?: Partial<GranularPrivacySettings> | null,
  legacyUser?: Partial<UserAccount> | null
): GranularPrivacySettings => {
  const validLevel = (v: unknown, fallback: FieldVisibilityLevel): FieldVisibilityLevel =>
    v === 'everyone' || v === 'friends' || v === 'nobody' ? v : fallback;

  const legacyVis: ProfileVisibility | undefined = legacyUser?.profileVisibility;
  const baseFallback: FieldVisibilityLevel =
    legacyVis === 'private' ? 'nobody' : legacyVis === 'friends_only' ? 'friends' : 'everyone';

  const privateByDefault =
    typeof raw?.privateByDefault === 'boolean'
      ? raw.privateByDefault
      : legacyVis === 'private';

  const defaultForStats: FieldVisibilityLevel =
    legacyUser?.showStats === false ? 'nobody' : baseFallback;
  const defaultForAchievements: FieldVisibilityLevel =
    legacyUser?.showAchievements === false ? 'nobody' : baseFallback;

  return {
    privateByDefault,
    usernameAvatar: validLevel(raw?.usernameAvatar, privateByDefault ? 'nobody' : 'everyone'),
    level: validLevel(raw?.level, privateByDefault ? 'nobody' : baseFallback),
    xpProgression: validLevel(raw?.xpProgression, privateByDefault ? 'nobody' : defaultForStats),
    achievements: validLevel(raw?.achievements, privateByDefault ? 'nobody' : defaultForAchievements),
    fitnessStats: validLevel(raw?.fitnessStats, privateByDefault ? 'nobody' : defaultForStats),
    workoutHistory: validLevel(
      raw?.workoutHistory,
      privateByDefault ? 'nobody' : legacyVis === 'public' ? 'friends' : baseFallback
    ),
    personalRecords: validLevel(
      raw?.personalRecords,
      privateByDefault ? 'nobody' : legacyVis === 'public' ? 'friends' : baseFallback
    ),
    dailyActivity: validLevel(
      raw?.dailyActivity,
      privateByDefault ? 'nobody' : legacyVis === 'public' ? 'friends' : baseFallback
    ),
    onlineStatus: validLevel(raw?.onlineStatus, privateByDefault ? 'nobody' : 'everyone'),
    lastActive: validLevel(raw?.lastActive, privateByDefault ? 'nobody' : 'friends'),
    bio: validLevel(raw?.bio, privateByDefault ? 'nobody' : baseFallback),
    showEquipment:
      typeof raw?.showEquipment === 'boolean'
        ? raw.showEquipment
        : legacyUser?.showEquipment ?? !privateByDefault,
    showGuild:
      typeof raw?.showGuild === 'boolean'
        ? raw.showGuild
        : legacyUser?.showGuild ?? !privateByDefault,
  };
};

export const deriveLegacyVisibilityFromGranular = (
  privacy: GranularPrivacySettings
): {
  profileVisibility: ProfileVisibility;
  showAchievements: boolean;
  showStats: boolean;
  showEquipment: boolean;
  showGuild: boolean;
} => {
  const publicValues: FieldVisibilityLevel[] = [
    privacy.level,
    privacy.xpProgression,
    privacy.achievements,
    privacy.fitnessStats,
    privacy.workoutHistory,
    privacy.personalRecords,
    privacy.dailyActivity,
    privacy.bio,
  ];
  const hasEveryone = publicValues.some(v => v === 'everyone');
  const hasFriends = publicValues.some(v => v === 'friends');

  const profileVisibility: ProfileVisibility =
    privacy.privateByDefault && !hasEveryone && !hasFriends
      ? 'private'
      : !hasEveryone && hasFriends
      ? 'friends_only'
      : hasEveryone
      ? 'public'
      : 'private';

  return {
    profileVisibility,
    showAchievements: privacy.achievements !== 'nobody',
    showStats:
      privacy.xpProgression !== 'nobody' ||
      privacy.fitnessStats !== 'nobody' ||
      privacy.dailyActivity !== 'nobody',
    showEquipment: privacy.showEquipment ?? !privacy.privateByDefault,
    showGuild: privacy.showGuild ?? !privacy.privateByDefault,
  };
};

export const canViewerSeePrivacyField = (
  privacy: GranularPrivacySettings,
  field: PrivacyFieldKey,
  relation: 'self' | 'friends' | 'none' | 'blocked'
): boolean => {
  if (relation === 'self') return true;
  if (relation === 'blocked') return false;
  const level = privacy[field];
  if (level === 'everyone') return true;
  if (level === 'friends') return relation === 'friends';
  return false;
};

export const formatLastActiveRelative = (isoString?: string | null): string => {
  if (!isoString) return 'Recently';
  const ts = new Date(isoString).getTime();
  if (Number.isNaN(ts)) return 'Recently';
  const diffMs = Math.max(0, Date.now() - ts);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString();
};
