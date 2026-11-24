import type { VerifiedActivityMetadata } from '../data/skillTreeData';
import { getLifequestAuthHeaders } from './unifiedBackendService';
import type {
  CharacterClass,
  CommunityEventPlayerState,
  CompetitiveLeaderboardEntry,
  CompetitiveMatchRules,
  CompetitiveMatchVisibility,
  CompetitiveRivalMatch,
  CompetitiveRivalMode,
  MentorChatMessage,
  MentorRecommendedQuest,
  MentorWeeklyAnalysis,
  MuseumCategory,
  MuseumRecord,
  RivalChallengeType,
  RivalryRecord,
  RivalryScoreEntry,
  RivalryStatsSummary,
  RivalsArenaStateResponse,
  SkillActivityType,
  SkillAttributeId,
  WeeklyBossStatePayload,
} from '../types/game';

const safeJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

// --- PHASE 2: WEEKLY BOSS BATTLES ---

export const fetchWeeklyBossStateServer = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  timezone?: string
): Promise<{ ok: boolean; data?: WeeklyBossStatePayload; error?: string }> => {
  try {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(timezone ? { timezone } : {}),
    });
    const res = await fetch(`/api/weekly-boss/state?${qs.toString()}`, {
      headers: { 'x-lifequest-user-id': userId },
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Weekly Boss.' };
    return { ok: true, data: parsed.data as WeeklyBossStatePayload };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading Weekly Boss.' };
  }
};

export const claimWeeklyBossRewardServer = async (params: {
  userId: string;
  claimType: 'mission' | 'milestone' | 'participation' | 'defeat' | 'top_contributor';
  claimId: string;
  timezone?: string;
}): Promise<{
  ok: boolean;
  rewards?: { xp: number; gold: number };
  state?: WeeklyBossStatePayload;
  error?: string;
}> => {
  try {
    const res = await fetch('/api/weekly-boss/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        claimType: params.claimType,
        claimId: params.claimId,
        timezone: params.timezone,
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) {
      return { ok: false, error: parsed.data?.error || 'Could not claim boss reward.' };
    }
    return {
      ok: true,
      rewards: parsed.data?.rewards,
      state: parsed.data as WeeklyBossStatePayload,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error claiming boss reward.' };
  }
};

// --- PHASE 2 (COMPETITIVE ARENA): INDEPENDENT RIVALS PLATFORM ---

export interface RivalsStateResponse extends Partial<RivalsArenaStateResponse> {
  rivalries: RivalryRecord[];
  recentScores: RivalryScoreEntry[];
  stats: RivalryStatsSummary;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    rivalryId: string;
    createdAt: string;
  }>;
  blockedIds: string[];
}

export const fetchRivalsArenaStateServer = async (params: {
  userId: string;
  username?: string;
  characterClass?: CharacterClass;
  level?: number;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const qs = new URLSearchParams();
    if (params.username) qs.set('username', params.username);
    if (params.characterClass) qs.set('characterClass', params.characterClass);
    if (typeof params.level === 'number') qs.set('level', String(params.level));
    const headers = await getLifequestAuthHeaders(params.userId, false);
    const res = await fetch(`/api/rivals/state?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Rivals Arena.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading Rivals Arena.' };
  }
};

export const fetchRivalsStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  return fetchRivalsArenaStateServer({ userId });
};

export const fetchRivalsLeaderboardServer = async (params: {
  userId: string;
  scope?: 'global' | 'friends' | 'seasonal' | 'weekly';
  mode?: CompetitiveRivalMode | 'all';
  division?: string;
  friendIds?: string[];
}): Promise<{
  ok: boolean;
  leaderboard?: CompetitiveLeaderboardEntry[];
  error?: string;
}> => {
  try {
    const qs = new URLSearchParams({
      scope: params.scope || 'global',
      mode: params.mode || 'all',
      ...(params.division && params.division !== 'all' ? { division: params.division } : {}),
      ...(params.friendIds?.length ? { friendIds: params.friendIds.join(',') } : {}),
    });
    const headers = await getLifequestAuthHeaders(params.userId, false);
    const res = await fetch(`/api/rivals/leaderboard?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load competitive rankings.' };
    return { ok: true, leaderboard: (parsed.data?.leaderboard || []) as CompetitiveLeaderboardEntry[] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading rankings.' };
  }
};

export const joinRivalsQueueServer = async (params: {
  userId: string;
  mode: CompetitiveRivalMode;
  username?: string;
  characterClass?: CharacterClass;
  level?: number;
}): Promise<{
  ok: boolean;
  matched?: boolean;
  match?: CompetitiveRivalMatch | null;
  data?: RivalsStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/queue/join', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: params.mode,
        username: params.username,
        characterClass: params.characterClass,
        level: params.level,
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not enter matchmaking queue.' };
    return {
      ok: true,
      matched: Boolean(parsed.data?.matched),
      match: (parsed.data?.match as CompetitiveRivalMatch) || null,
      data: parsed.data as RivalsStateResponse,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error joining queue.' };
  }
};

export const cancelRivalsQueueServer = async (
  userId: string
): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/rivals/queue/cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not leave queue.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error cancelling queue.' };
  }
};

export const sendDirectRivalChallengeServer = async (params: {
  userId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  mode?: CompetitiveRivalMode;
  challengeType?: RivalChallengeType;
  isFriend?: boolean;
  visibility?: CompetitiveMatchVisibility;
  rules?: Partial<CompetitiveMatchRules>;
  rematchOfMatchId?: string;
}): Promise<{ ok: boolean; match?: CompetitiveRivalMatch; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/challenge', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send rival challenge.' };
    return {
      ok: true,
      match: parsed.data?.match as CompetitiveRivalMatch,
      data: parsed.data as RivalsStateResponse,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error sending challenge.' };
  }
};

export const inviteRivalServer = async (params: {
  userId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  challengeType: RivalChallengeType;
  isFriend: boolean;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  return sendDirectRivalChallengeServer(params);
};

export const respondRivalInviteServer = async (params: {
  userId: string;
  rivalryId: string;
  decision: 'accept' | 'decline';
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/respond', {
      method: 'POST',
      headers,
      body: JSON.stringify({ matchId: params.rivalryId, rivalryId: params.rivalryId, decision: params.decision }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not respond to challenge.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error responding to challenge.' };
  }
};

export const cancelRivalInviteServer = async (params: {
  userId: string;
  rivalryId: string;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/cancel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ matchId: params.rivalryId, rivalryId: params.rivalryId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not cancel challenge.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const endActiveRivalryServer = async (params: {
  userId: string;
  rivalryId: string;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/end', {
      method: 'POST',
      headers,
      body: JSON.stringify({ matchId: params.rivalryId, rivalryId: params.rivalryId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not conclude match.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const rematchRivalServer = async (params: {
  userId: string;
  matchId: string;
}): Promise<{ ok: boolean; match?: CompetitiveRivalMatch; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/rematch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ matchId: params.matchId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not request rematch.' };
    return {
      ok: true,
      match: parsed.data?.match as CompetitiveRivalMatch,
      data: parsed.data as RivalsStateResponse,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error requesting rematch.' };
  }
};

export const disputeRivalMatchServer = async (params: {
  userId: string;
  matchId: string;
  reason: string;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/dispute', {
      method: 'POST',
      headers,
      body: JSON.stringify({ matchId: params.matchId, reason: params.reason }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not dispute match.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error disputing match.' };
  }
};

export const updateRivalsPrivacyServer = async (params: {
  userId: string;
  allowNonFriendChallenges: boolean;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/privacy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ allowNonFriendChallenges: params.allowNonFriendChallenges }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update challenge privacy.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const blockRivalUserServer = async (params: {
  userId: string;
  targetUserId: string;
  unblock?: boolean;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/rivals/block', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId: params.targetUserId, unblock: Boolean(params.unblock) }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update block setting.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- PHASE 4: AI FITNESS MENTOR ---

export interface AiMentorStateResponse {
  messages: MentorChatMessage[];
  recommendedQuests: MentorRecommendedQuest[];
  latestWeeklyAnalysis: MentorWeeklyAnalysis | null;
}

export const fetchAiMentorStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: AiMentorStateResponse; error?: string }> => {
  try {
    const res = await fetch('/api/mentor/state', {
      headers: { 'x-lifequest-user-id': userId },
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load AI Mentor history.' };
    return { ok: true, data: parsed.data as AiMentorStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading AI Mentor.' };
  }
};

export const sendAiMentorMessageServer = async (params: {
  userId: string;
  message: string;
  playerContext: Record<string, any>;
}): Promise<{
  ok: boolean;
  messages?: MentorChatMessage[];
  recommendedQuests?: MentorRecommendedQuest[];
  error?: string;
}> => {
  try {
    const res = await fetch('/api/mentor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        message: params.message,
        playerContext: params.playerContext,
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'AI Mentor is currently unavailable.' };
    return {
      ok: true,
      messages: parsed.data?.messages,
      recommendedQuests: parsed.data?.recommendedQuests,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error reaching AI Mentor.' };
  }
};

export const requestMentorWeeklyAnalysisServer = async (params: {
  userId: string;
  playerContext: Record<string, any>;
}): Promise<{ ok: boolean; analysis?: MentorWeeklyAnalysis; error?: string }> => {
  try {
    const res = await fetch('/api/mentor/weekly-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ playerContext: params.playerContext }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not generate weekly analysis.' };
    return { ok: true, analysis: parsed.data?.analysis };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error requesting analysis.' };
  }
};

export const acceptMentorQuestServer = async (params: {
  userId: string;
  questId: string;
}): Promise<{
  ok: boolean;
  quest?: MentorRecommendedQuest;
  recommendedQuests?: MentorRecommendedQuest[];
  error?: string;
}> => {
  try {
    const res = await fetch('/api/mentor/accept-quest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ questId: params.questId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not accept quest.' };
    return {
      ok: true,
      quest: parsed.data?.quest,
      recommendedQuests: parsed.data?.recommendedQuests,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- PHASE 5: COMMUNITY EVENTS ---

export const fetchCommunityEventsStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: CommunityEventPlayerState; error?: string }> => {
  try {
    const res = await fetch('/api/community-events/state', {
      headers: { 'x-lifequest-user-id': userId },
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Community Event.' };
    return { ok: true, data: parsed.data as CommunityEventPlayerState };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimCommunityMilestoneServer = async (params: {
  userId: string;
  milestoneId: string;
}): Promise<{
  ok: boolean;
  rewards?: { xp: number; gold: number };
  state?: CommunityEventPlayerState;
  error?: string;
}> => {
  try {
    const res = await fetch('/api/community-events/claim-milestone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ milestoneId: params.milestoneId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim community milestone.' };
    return {
      ok: true,
      rewards: parsed.data?.rewards,
      state: parsed.data as CommunityEventPlayerState,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- PHASE 6: PERSONAL RECORDS MUSEUM ---

export interface MuseumQueryResponse {
  records: MuseumRecord[];
  personalBests: MuseumRecord[];
  personalBestCount: number;
  archiveCount: number;
  allowPublic: boolean;
  categoryCounts: Record<string, number>;
  totalRecords: number;
  page: number;
  totalPages: number;
}

export const fetchMuseumRecordsServer = async (params: {
  callerUserId: string;
  targetUserId?: string;
  category?: MuseumCategory | 'all';
  pbOnly?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'rarity' | 'value';
  page?: number;
  limit?: number;
}): Promise<{ ok: boolean; data?: MuseumQueryResponse; error?: string }> => {
  try {
    const qs = new URLSearchParams({
      ...(params.targetUserId ? { userId: params.targetUserId } : {}),
      category: params.category || 'all',
      pbOnly: params.pbOnly ? 'true' : 'false',
      search: params.search || '',
      sort: params.sort || 'newest',
      page: String(params.page || 1),
      limit: String(params.limit || 12),
    });
    const headers = await getLifequestAuthHeaders(params.callerUserId, false);
    const res = await fetch(`/api/museum/records?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load museum records.' };
    return { ok: true, data: parsed.data as MuseumQueryResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const reconcileMuseumServer = async (params: {
  userId: string;
  workouts: Array<{
    id: string;
    exerciseName: string;
    exerciseType?: string;
    reps?: number;
    durationMinutes?: number;
    date?: string;
  }>;
  currentStreak: number;
}): Promise<{ ok: boolean; reconciledCount?: number; personalBestCount?: number; archiveCount?: number }> => {
  if (!params.userId) return { ok: false };
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/museum/reconcile', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        workouts: params.workouts,
        currentStreak: params.currentStreak,
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false };
    return {
      ok: true,
      reconciledCount: Number(parsed.data?.reconciledCount || 0),
      personalBestCount: Number(parsed.data?.personalBestCount || 0),
      archiveCount: Number(parsed.data?.archiveCount || 0),
    };
  } catch {
    return { ok: false };
  }
};

export const syncMuseumPrivacyServer = async (userId: string, allowPublic: boolean) => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    await fetch('/api/museum/privacy', {
      method: 'POST',
      headers,
      body: JSON.stringify({ allowPublic }),
    });
  } catch {
    // non-fatal
  }
};

// --- PHASE 7: ECOSYSTEM DISPATCHER ---

export const dispatchVerifiedEcosystemActivityServer = async (params: {
  userId: string;
  username: string;
  activityType: SkillActivityType;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  metadata?: VerifiedActivityMetadata & { exerciseName?: string; exerciseType?: string };
  timezone?: string;
  skillLevelUp?: { attributeId: SkillAttributeId; newLevel: number };
}) => {
  try {
    const res = await fetch('/api/ecosystem/dispatch-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({
        username: params.username,
        activityType: params.activityType,
        idempotencyKey: params.idempotencyKey,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        metadata: params.metadata || {},
        timezone: params.timezone || 'UTC',
        skillLevelUp: params.skillLevelUp,
      }),
    });
    return await safeJson(res);
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

export const archiveSkillNodeMuseumServer = async (userId: string, nodeId: string) => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/ecosystem/record-skill-node', {
      method: 'POST',
      headers,
      body: JSON.stringify({ nodeId }),
    });
    return await safeJson(res);
  } catch {
    return { ok: false, status: 0, data: null };
  }
};

export const reconcileSkillTreeServer = async (params: {
  userId: string;
  timezone?: string;
  workouts: Array<{
    id: string;
    exerciseName: string;
    exerciseType?: string;
    reps?: number;
    durationMinutes?: number;
    date?: string;
  }>;
  habits: Array<{
    id: string;
    name: string;
    category?: string;
    completedCount?: number;
    lastCompleted?: string | null;
  }>;
}): Promise<{ ok: boolean; reconciledCount?: number; state?: any; error?: string }> => {
  if (!params.userId) return { ok: false, error: 'Missing player identity.' };
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/skill-tree/reconcile', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        timezone: params.timezone || 'UTC',
        workouts: params.workouts,
        habits: params.habits,
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || parsed.data?.success === false) {
      return { ok: false, error: parsed.data?.error || 'Could not reconcile Skill Tree.' };
    }
    return {
      ok: true,
      reconciledCount: Number(parsed.data?.reconciledCount || 0),
      state: parsed.data?.state,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error reconciling Skill Tree.' };
  }
};
