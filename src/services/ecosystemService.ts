import type { VerifiedActivityMetadata } from '../data/skillTreeData';
import type {
  CommunityEventPlayerState,
  MentorChatMessage,
  MentorRecommendedQuest,
  MentorWeeklyAnalysis,
  MuseumCategory,
  MuseumRecord,
  RivalChallengeType,
  RivalryRecord,
  RivalryScoreEntry,
  RivalryStatsSummary,
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
  rewards?: { xp: number; forgeXp: number; gold: number };
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

// --- PHASE 3: FRIEND RIVAL SYSTEM ---

export interface RivalsStateResponse {
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

export const fetchRivalsStateServer = async (
  userId: string
): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const res = await fetch('/api/rivals/state', {
      headers: { 'x-lifequest-user-id': userId },
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load rivalries.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error loading rivalries.' };
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
  try {
    const res = await fetch('/api/rivals/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send rivalry invitation.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error sending invitation.' };
  }
};

export const respondRivalInviteServer = async (params: {
  userId: string;
  rivalryId: string;
  decision: 'accept' | 'decline';
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const res = await fetch('/api/rivals/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ rivalryId: params.rivalryId, decision: params.decision }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not respond to rivalry.' };
    return { ok: true, data: parsed.data as RivalsStateResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error responding to rivalry.' };
  }
};

export const cancelRivalInviteServer = async (params: {
  userId: string;
  rivalryId: string;
}): Promise<{ ok: boolean; data?: RivalsStateResponse; error?: string }> => {
  try {
    const res = await fetch('/api/rivals/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ rivalryId: params.rivalryId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not cancel invitation.' };
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
    const res = await fetch('/api/rivals/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
      body: JSON.stringify({ rivalryId: params.rivalryId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not end rivalry.' };
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
    const res = await fetch('/api/rivals/block', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': params.userId,
      },
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
  categoryCounts: Record<string, number>;
  totalRecords: number;
  page: number;
  totalPages: number;
}

export const fetchMuseumRecordsServer = async (params: {
  callerUserId: string;
  targetUserId?: string;
  category?: MuseumCategory | 'all';
  search?: string;
  sort?: 'newest' | 'oldest' | 'rarity' | 'value';
  page?: number;
  limit?: number;
}): Promise<{ ok: boolean; data?: MuseumQueryResponse; error?: string }> => {
  try {
    const qs = new URLSearchParams({
      ...(params.targetUserId ? { userId: params.targetUserId } : {}),
      category: params.category || 'all',
      search: params.search || '',
      sort: params.sort || 'newest',
      page: String(params.page || 1),
      limit: String(params.limit || 12),
    });
    const res = await fetch(`/api/museum/records?${qs.toString()}`, {
      headers: { 'x-lifequest-user-id': params.callerUserId },
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load museum records.' };
    return { ok: true, data: parsed.data as MuseumQueryResponse };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const syncMuseumPrivacyServer = async (userId: string, allowPublic: boolean) => {
  try {
    await fetch('/api/museum/privacy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': userId,
      },
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
    const res = await fetch('/api/ecosystem/record-skill-node', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lifequest-user-id': userId,
      },
      body: JSON.stringify({ nodeId }),
    });
    return await safeJson(res);
  } catch {
    return { ok: false, status: 0, data: null };
  }
};
