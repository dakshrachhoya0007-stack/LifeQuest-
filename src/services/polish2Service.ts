import type {
  AdvancedLeaderboardResponse,
  AppNotification,
  LeaderboardEntry,
  LeaderboardScope,
  NotificationCategory,
  PlayerIdentityState,
  PlayerSeasonStateResponse,
  PlayerWalletState,
  ServerNotificationPreferences,
} from '../types/game';

import { getLifequestAuthHeaders } from './unifiedBackendService';

const safeJson = async (res: Response) => {
  try {
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: res.status, data: null };
  }
};

// --- PHASE 1: ADVANCED PLAYER IDENTITY ---

export const fetchIdentityStateServer = async (
  userId: string
): Promise<{ ok: boolean; state?: PlayerIdentityState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/identity/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to load player identity.' };
    }
    return { ok: true, state: parsed.data.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const syncVerifiedIdentitySnapshotServer = async (params: {
  userId: string;
  snapshot: {
    level?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalWorkoutsCompleted?: number;
    totalVerifiedReps?: number;
    totalActiveMinutes?: number;
    totalHabitsCompleted?: number;
    totalAchievementsUnlocked?: number;
    totalBossesDefeated?: number;
    joinedAt?: string | null;
  };
}): Promise<{ ok: boolean; state?: PlayerIdentityState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/identity/sync-verified', {
      method: 'POST',
      headers,
      body: JSON.stringify({ snapshot: params.snapshot }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to sync player identity.' };
    }
    return { ok: true, state: parsed.data.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const selectIdentityTitleServer = async (
  userId: string,
  titleId: string | null
): Promise<{ ok: boolean; state?: PlayerIdentityState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/identity/select-title', {
      method: 'POST',
      headers,
      body: JSON.stringify({ titleId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not equip title.' };
    }
    return { ok: true, state: parsed.data.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const selectSecondaryIdentityTitleServer = async (
  userId: string,
  titleId: string | null
): Promise<{ ok: boolean; state?: PlayerIdentityState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/identity/select-secondary-title', {
      method: 'POST',
      headers,
      body: JSON.stringify({ titleId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not equip secondary title.' };
    }
    return { ok: true, state: parsed.data.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const featureIdentityBadgesServer = async (
  userId: string,
  badgeIds: string[]
): Promise<{ ok: boolean; state?: PlayerIdentityState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/identity/feature-badges', {
      method: 'POST',
      headers,
      body: JSON.stringify({ badgeIds }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not update featured badges.' };
    }
    return { ok: true, state: parsed.data.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimGlobalRareBadgeServer = async (
  userId: string,
  badgeId: string,
  username: string
): Promise<{
  ok: boolean;
  alreadyClaimedGlobally?: boolean;
  state?: PlayerIdentityState;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/identity/claim-global-badge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ badgeId, username }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) {
      return {
        ok: false,
        alreadyClaimedGlobally: Boolean(parsed.data?.alreadyClaimedGlobally),
        error: parsed.data?.error || 'Could not claim global rare badge.',
      };
    }
    return { ok: true, state: parsed.data?.state as PlayerIdentityState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchPublicIdentitySummaryServer = async (targetUserId: string): Promise<{
  ok: boolean;
  identity?: {
    equippedIdentityTitle: { id: string; name: string; rarity: string } | null;
    equippedSecondaryTitle?: { id: string; name: string; rarity: string } | null;
    prestigeTier?: number;
    featuredBadges: Array<{
      id: string;
      name: string;
      rarity: string;
      iconName: string;
      description: string;
    }>;
    reputationScore: number;
    reputationTier: string;
    joinedAt: string | null;
  } | null;
}> => {
  try {
    const res = await fetch(`/api/identity/public/${encodeURIComponent(targetUserId)}`);
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, identity: null };
    return { ok: true, identity: parsed.data?.identity || null };
  } catch {
    return { ok: false, identity: null };
  }
};

// --- PHASE 2: INTELLIGENT NOTIFICATIONS ---

export interface NotificationsStatePayload {
  notifications: AppNotification[];
  unreadCount: number;
  categoryCounts: Record<string, { total: number; unread: number }>;
  preferences: ServerNotificationPreferences;
}

export const fetchNotificationsStateServer = async (
  userId: string,
  category: NotificationCategory | 'all' = 'all'
): Promise<{ ok: boolean; data?: NotificationsStatePayload; error?: string }> => {
  try {
    const qs = new URLSearchParams({ category });
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch(`/api/notifications/state?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data) {
      return { ok: false, error: parsed.data?.error || 'Failed to load notifications.' };
    }
    return { ok: true, data: parsed.data as NotificationsStatePayload };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchNotificationPreferencesServer = async (
  userId: string
): Promise<{ ok: boolean; preferences?: ServerNotificationPreferences; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/notifications/preferences', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.preferences) {
      return { ok: false, error: parsed.data?.error || 'Failed to load preferences.' };
    }
    return { ok: true, preferences: parsed.data.preferences as ServerNotificationPreferences };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const saveNotificationPreferencesServer = async (
  userId: string,
  prefs: Partial<ServerNotificationPreferences>
): Promise<{ ok: boolean; preferences?: ServerNotificationPreferences; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers,
      body: JSON.stringify(prefs),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.preferences) {
      return { ok: false, error: parsed.data?.error || 'Failed to save notification preferences.' };
    }
    return { ok: true, preferences: parsed.data.preferences as ServerNotificationPreferences };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const markNotificationReadApiServer = async (
  userId: string,
  notificationId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers,
      body: JSON.stringify({ notificationId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.data?.error || 'Could not mark notification read.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const markAllNotificationsReadApiServer = async (
  userId: string,
  category: NotificationCategory | 'all' = 'all'
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers,
      body: JSON.stringify({ category }),
    });
    const parsed = await safeJson(res);
    return parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.data?.error || 'Could not mark all notifications read.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const dismissNotificationApiServer = async (
  userId: string,
  notificationId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/notifications/dismiss', {
      method: 'POST',
      headers,
      body: JSON.stringify({ notificationId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.data?.error || 'Could not dismiss notification.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- PHASE 3: SEASONAL PROGRESSION ---

export const fetchSeasonStateServer = async (
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ ok: boolean; data?: PlayerSeasonStateResponse; error?: string }> => {
  try {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch(`/api/seasons/state?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.season) {
      return { ok: false, error: parsed.data?.error || 'Failed to load seasonal progression.' };
    }
    return { ok: true, data: parsed.data as PlayerSeasonStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimSeasonChallengeServer = async (
  userId: string,
  challengeId: string
): Promise<{
  ok: boolean;
  seasonXpAwarded?: number;
  data?: PlayerSeasonStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/seasons/claim-challenge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ challengeId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.season) {
      return { ok: false, error: parsed.data?.error || 'Could not claim seasonal challenge.' };
    }
    return {
      ok: true,
      seasonXpAwarded: parsed.data.seasonXpAwarded,
      data: parsed.data as PlayerSeasonStateResponse,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const unlockSeasonEliteServer = async (
  userId: string
): Promise<{
  ok: boolean;
  data?: PlayerSeasonStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/seasons/unlock-elite', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.season) {
      return { ok: false, error: parsed.data?.error || 'Could not unlock Elite Cosmetic Track.' };
    }
    return { ok: true, data: parsed.data as PlayerSeasonStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimSeasonMilestoneServer = async (
  userId: string,
  milestoneId: string,
  track: 'free' | 'elite' = 'free'
): Promise<{
  ok: boolean;
  rewardLabel?: string;
  wallet?: PlayerWalletState;
  data?: PlayerSeasonStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/seasons/claim-milestone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId, track }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.season) {
      return { ok: false, error: parsed.data?.error || 'Could not claim seasonal milestone.' };
    }
    return {
      ok: true,
      rewardLabel: parsed.data.rewardLabel,
      wallet: parsed.data.wallet,
      data: parsed.data as PlayerSeasonStateResponse,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- PHASE 4: ADVANCED LEADERBOARDS ---

export const queryAdvancedLeaderboardServer = async (params: {
  userId: string;
  scope: LeaderboardScope;
  page?: number;
  limit?: number;
  supabaseEntries?: LeaderboardEntry[];
}): Promise<{ ok: boolean; data?: AdvancedLeaderboardResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/leaderboards/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        scope: params.scope,
        page: params.page || 1,
        limit: params.limit || 20,
        supabaseEntries: params.supabaseEntries || [],
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.entries) {
      return { ok: false, error: parsed.data?.error || 'Failed to load leaderboard.' };
    }
    return { ok: true, data: parsed.data as AdvancedLeaderboardResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};
