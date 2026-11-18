import { getLifequestAuthHeaders } from './unifiedBackendService';
import type {
  CharacterAppearance,
  CommunityEvent,
  CommunityEventPlayerState,
  CommunityPoll,
  CommunityPollCategory,
  CommunityPollType,
  CosmeticSlot,
  FeedCommentPermission,
  FeedFilter,
  FeedListResponse,
  FeedPost,
  FeedReactionKey,
  PlayerCosmeticState,
  SkillActivityType,
  TerritoryMissionStance,
  TerritoryWarsStateResponse,
  TrophyShowcaseState,
  WorkoutParty,
  WorkoutPartyHistoryEntry,
} from '../types/game';

const safeJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

// ==============================================================================
// 1. ADVENTURER'S ACTIVITY FEED
// ==============================================================================

export const fetchFeedPostsServer = async (params: {
  userId: string;
  filter?: FeedFilter;
  page?: number;
  limit?: number;
}): Promise<{ ok: boolean; data?: FeedListResponse; error?: string }> => {
  try {
    const qs = new URLSearchParams({
      filter: params.filter || 'all',
      page: String(params.page || 1),
      limit: String(params.limit || 12),
    });
    const headers = await getLifequestAuthHeaders(params.userId, false);
    const res = await fetch(`/api/feed/list?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Activity Feed.' };
    return {
      ok: true,
      data: {
        posts: parsed.data.posts || [],
        page: parsed.data.page || 1,
        limit: parsed.data.limit || 12,
        totalPosts: parsed.data.totalPosts || 0,
        hasMore: Boolean(parsed.data.hasMore),
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading Activity Feed.' };
  }
};

export const shareFeedWorkoutNoteServer = async (params: {
  userId: string;
  username: string;
  verifiedRef: string;
  title: string;
  summary: string;
  highlightValue?: string;
  commentPermission?: FeedCommentPermission;
}): Promise<{ ok: boolean; postId?: string; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/feed/share-note', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not share training reflection.' };
    return { ok: true, postId: parsed.data?.postId };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const reactToFeedPostServer = async (params: {
  userId: string;
  username: string;
  postId: string;
  emoji: FeedReactionKey;
}): Promise<{ ok: boolean; post?: FeedPost; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/feed/react', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not react to post.' };
    return { ok: true, post: parsed.data?.post };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const commentOnFeedPostServer = async (params: {
  userId: string;
  username: string;
  postId: string;
  body: string;
}): Promise<{ ok: boolean; post?: FeedPost; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/feed/comment', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not add comment.' };
    return { ok: true, post: parsed.data?.post };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const updateFeedCommentPermissionServer = async (params: {
  userId: string;
  postId: string;
  commentPermission: FeedCommentPermission;
}): Promise<{ ok: boolean; post?: FeedPost; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/feed/permissions', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update comment settings.' };
    return { ok: true, post: parsed.data?.post };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const deleteFeedPostServer = async (
  userId: string,
  postId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/feed/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ postId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.data?.error || 'Could not delete post.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// ==============================================================================
// 2. WORKOUT PARTIES
// ==============================================================================

export interface WorkoutPartiesStatePayload {
  parties: WorkoutParty[];
  invitedParties: WorkoutParty[];
  history: WorkoutPartyHistoryEntry[];
}

export const fetchWorkoutPartiesStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: WorkoutPartiesStatePayload; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/parties/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Workout Parties.' };
    return {
      ok: true,
      data: {
        parties: parsed.data.parties || [],
        invitedParties: parsed.data.invitedParties || [],
        history: parsed.data.history || [],
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const createWorkoutPartyServer = async (params: {
  userId: string;
  username: string;
  title?: string;
  challengeId: string;
  visibility?: 'friends' | 'private' | 'public';
  inviteFriendIds?: string[];
}): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/parties/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not create party.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const joinWorkoutPartyServer = async (params: {
  userId: string;
  username: string;
  partyId?: string;
  roomCode?: string;
}): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/parties/join', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not join party.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const inviteToWorkoutPartyServer = async (params: {
  userId: string;
  partyId: string;
  friendId: string;
}): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/parties/invite', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send invite.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const startWorkoutPartyServer = async (
  userId: string,
  partyId: string
): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/parties/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ partyId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not start workout party.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const heartbeatWorkoutPartyServer = async (
  userId: string,
  partyId: string
): Promise<{ ok: boolean; party?: WorkoutParty }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/parties/heartbeat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ partyId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok ? { ok: true, party: parsed.data.party } : { ok: false };
  } catch {
    return { ok: false };
  }
};

export const submitWorkoutPartyProgressServer = async (params: {
  userId: string;
  partyId: string;
  verifiedSessionId: string;
  durationMinutes?: number;
  repetitions?: number;
  verifiedWithAetherVision?: boolean;
}): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/parties/submit-workout', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not submit verified workout.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const sendWorkoutPartyMessageServer = async (params: {
  userId: string;
  username: string;
  partyId: string;
  kind: 'message' | 'reaction';
  content: string;
}): Promise<{ ok: boolean; party?: WorkoutParty; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/parties/message', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send message.' };
    return { ok: true, party: parsed.data.party };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const saveWorkoutPartySummaryServer = async (
  userId: string,
  partyId: string
): Promise<{ ok: boolean; party?: WorkoutParty; history?: WorkoutPartyHistoryEntry[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/parties/save-summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({ partyId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not save summary.' };
    return { ok: true, party: parsed.data.party, history: parsed.data.history };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const leaveWorkoutPartyServer = async (
  userId: string,
  partyId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/parties/leave', {
      method: 'POST',
      headers,
      body: JSON.stringify({ partyId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok ? { ok: true } : { ok: false, error: parsed.data?.error };
  } catch {
    return { ok: false };
  }
};

// ==============================================================================
// 3. 2D CHARACTER CUSTOMIZATION & COSMETICS
// ==============================================================================

export const fetchCosmeticsStateServer = async (
  userId: string
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/cosmetics/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to load cosmetics.' };
    }
    return { ok: true, state: parsed.data.state as PlayerCosmeticState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const syncVerifiedCosmeticsServer = async (
  userId: string
): Promise<{ ok: boolean; newlyUnlockedIds?: string[]; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cosmetics/sync-verified', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to sync cosmetics.' };
    }
    return {
      ok: true,
      newlyUnlockedIds: parsed.data.newlyUnlockedIds || [],
      state: parsed.data.state as PlayerCosmeticState,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const equipCosmeticServer = async (
  userId: string,
  cosmeticId: string
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cosmetics/equip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cosmeticId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not equip cosmetic.' };
    }
    return { ok: true, state: parsed.data.state as PlayerCosmeticState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const unequipCosmeticSlotServer = async (
  userId: string,
  slot: CosmeticSlot
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cosmetics/unequip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ slot }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not reset slot.' };
    }
    return { ok: true, state: parsed.data.state as PlayerCosmeticState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimCosmeticMilestoneServer = async (
  userId: string,
  milestoneId: string
): Promise<{ ok: boolean; rewardLabel?: string; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cosmetics/claim-milestone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not claim collection milestone.' };
    }
    return {
      ok: true,
      rewardLabel: parsed.data.rewardLabel,
      state: parsed.data.state as PlayerCosmeticState,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchPublicCosmeticsServer = async (
  targetUserId: string
): Promise<{ ok: boolean; appearance?: CharacterAppearance; unlockedCount?: number }> => {
  try {
    const res = await fetch(`/api/cosmetics/public/${encodeURIComponent(targetUserId)}`);
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false };
    return {
      ok: true,
      appearance: parsed.data.appearance,
      unlockedCount: parsed.data.unlockedCount,
    };
  } catch {
    return { ok: false };
  }
};

// ==============================================================================
// 4. COMMUNITY DECISIONS
// ==============================================================================

export const fetchCommunityDecisionsServer = async (
  userId: string
): Promise<{ ok: boolean; activePolls?: CommunityPoll[]; archivePolls?: CommunityPoll[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/decisions/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Community Decisions.' };
    return {
      ok: true,
      activePolls: parsed.data.activePolls || [],
      archivePolls: parsed.data.archivePolls || [],
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const castCommunityDecisionVoteServer = async (params: {
  userId: string;
  pollId: string;
  optionIds: string[];
}): Promise<{ ok: boolean; poll?: CommunityPoll; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/decisions/vote', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not submit vote.' };
    return { ok: true, poll: parsed.data.poll };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const reportCommunityDecisionPollServer = async (params: {
  userId: string;
  pollId: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/decisions/report', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    return parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.data?.error || 'Could not submit report.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const adminCreateDecisionPollServer = async (params: {
  adminKey: string;
  title: string;
  description: string;
  category: CommunityPollCategory;
  pollType: CommunityPollType;
  maxChoices?: number;
  durationDays?: number;
  options: Array<{ label: string; description?: string }>;
}): Promise<{ ok: boolean; poll?: CommunityPoll; error?: string }> => {
  try {
    const res = await fetch('/api/admin/decisions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-admin-key': params.adminKey,
      },
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Admin poll creation failed.' };
    return { ok: true, poll: parsed.data.poll };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const adminActionDecisionPollServer = async (params: {
  adminKey: string;
  pollId: string;
  action: 'close' | 'cancel' | 'publish';
  publishedOutcome?: string;
}): Promise<{ ok: boolean; poll?: CommunityPoll; error?: string }> => {
  try {
    const res = await fetch('/api/admin/decisions/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-admin-key': params.adminKey,
      },
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Admin action failed.' };
    return { ok: true, poll: parsed.data.poll };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// ==============================================================================
// 5. TROPHY SHOWCASE
// ==============================================================================

export const fetchTrophyShowcaseServer = async (
  userId: string
): Promise<{ ok: boolean; state?: TrophyShowcaseState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/trophies/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to load Trophy Showcase.' };
    }
    return { ok: true, state: parsed.data.state as TrophyShowcaseState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchPublicTrophyShowcaseServer = async (
  viewerId: string,
  targetUserId: string
): Promise<{ ok: boolean; restricted?: boolean; state?: TrophyShowcaseState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(viewerId, false);
    const res = await fetch(`/api/trophies/public/${encodeURIComponent(targetUserId)}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Unavailable.' };
    return {
      ok: true,
      restricted: Boolean(parsed.data.restricted),
      state: parsed.data.state as TrophyShowcaseState,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const updatePinnedTrophiesServer = async (
  userId: string,
  pinnedIds: string[]
): Promise<{ ok: boolean; state?: TrophyShowcaseState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/trophies/pin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pinnedIds }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not update pinned trophies.' };
    }
    return { ok: true, state: parsed.data.state as TrophyShowcaseState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// ==============================================================================
// 6. TERRITORY WARS
// ==============================================================================

export const fetchTerritoryWarsStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: TerritoryWarsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/territory-wars/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Territory Wars.' };
    return { ok: true, data: parsed.data as TerritoryWarsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const registerGuildTerritoryWarServer = async (params: {
  userId: string;
  guildId: string;
  guildName: string;
  guildTag: string;
  membersCount: number;
}): Promise<{ ok: boolean; data?: TerritoryWarsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/territory-wars/register-guild', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not register guild.' };
    return { ok: true, data: parsed.data as TerritoryWarsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const selectTerritoryMissionServer = async (params: {
  userId: string;
  territoryId: string;
  stance: TerritoryMissionStance;
}): Promise<{ ok: boolean; data?: TerritoryWarsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/territory-wars/select-mission', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not select mission.' };
    return { ok: true, data: parsed.data as TerritoryWarsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// ==============================================================================
// 7. LIVE COMMUNITY MOMENTS EXTENSIONS
// ==============================================================================

export const claimCommunityChallengeServer = async (
  userId: string,
  challengeId: string
): Promise<{
  ok: boolean;
  rewards?: { xp: number; gold: number };
  data?: CommunityEventPlayerState;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/community-events/claim-challenge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ challengeId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim challenge.' };
    return { ok: true, rewards: parsed.data.rewards, data: parsed.data as CommunityEventPlayerState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const adminCreateCommunityEventServer = async (params: {
  adminKey: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'upcoming' | 'active';
  targetGoalPoints: number;
  durationDays: number;
}): Promise<{ ok: boolean; event?: CommunityEvent; error?: string }> => {
  try {
    const res = await fetch('/api/admin/community-events/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-admin-key': params.adminKey,
      },
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to schedule event.' };
    return { ok: true, event: parsed.data.event };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const adminAnnounceCommunityMomentServer = async (params: {
  adminKey: string;
  title: string;
  message: string;
  severity?: 'info' | 'milestone' | 'alert';
}): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/admin/community-events/announce', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-admin-key': params.adminKey,
      },
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    return parsed.ok ? { ok: true } : { ok: false, error: parsed.data?.error || 'Failed to announce.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const adminEndCommunityEventServer = async (
  adminKey: string,
  eventId?: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/admin/community-events/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-admin-key': adminKey,
      },
      body: JSON.stringify({ eventId }),
    });
    const parsed = await safeJson(res);
    return parsed.ok ? { ok: true } : { ok: false, error: parsed.data?.error || 'Failed to end event.' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// Re-export SkillActivityType if consumers import from expansionService
export type { SkillActivityType };
