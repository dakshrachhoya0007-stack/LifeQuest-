import { getLifequestAuthHeaders } from './unifiedBackendService';
import type {
  CardsStateResponse,
  CollectionCompletionResponse,
  CommunityTournament,
  CompetitiveRivalMode,
  DailyCalendarStateResponse,
  EndorsementCategory,
  FriendshipProgressRecord,
  HiddenAchievementClientView,
  MarketplaceStateResponse,
  PlayerCosmeticState,
  PlayerEndorsementSummary,
  PlayerLoadout,
  PlayerPrestigeState,
  PlayerWalletState,
  RankedDivisionName,
  SeasonalStatsRecap,
  SeasonalStatVisibility,
  SpectatorLiveMatchSummary,
  TrophyShowcaseState,
} from '../types/game';

const safeJson = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

// --- AAA 1: BATTLE PASS RM CHECKOUT DISABLED NOTICE ---
export const purchaseBattlePassRmDisabledServer = async (
  userId: string
): Promise<{ ok: boolean; error?: string; realMoneyCheckoutEnabled?: boolean }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/seasons/purchase-premium-rm', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const parsed = await safeJson(res);
    return {
      ok: parsed.ok,
      error: parsed.data?.error || 'Real-money checkout is disabled until payment settlement is configured.',
      realMoneyCheckoutEnabled: Boolean(parsed.data?.realMoneyCheckoutEnabled),
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 2: COLLECTIBLE CARDS & WALLET ---
export const syncInitialWalletGoldServer = async (
  userId: string,
  gold: number
): Promise<{ ok: boolean; wallet?: PlayerWalletState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/economy/sync-initial-gold', {
      method: 'POST',
      headers,
      body: JSON.stringify({ gold }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to sync wallet.' };
    return { ok: true, wallet: parsed.data.wallet };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchCardsStateServer = async (
  userId: string
): Promise<{ ok: boolean; state?: CardsStateResponse; wallet?: PlayerWalletState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/cards/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Collectible Cards.' };
    return { ok: true, state: parsed.data.state, wallet: parsed.data.wallet };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const openCardPackServer = async (params: {
  userId: string;
  packId: string;
  currency: 'gold' | 'fragments';
}): Promise<{
  ok: boolean;
  drawnCards?: Array<{ cardId: string; isNew: boolean; fragmentsConverted: number }>;
  fragmentsGrantedFromDuplicates?: number;
  wallet?: PlayerWalletState;
  state?: CardsStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/cards/open-pack', {
      method: 'POST',
      headers,
      body: JSON.stringify({ packId: params.packId, currency: params.currency }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not open card pack.' };
    return {
      ok: true,
      drawnCards: parsed.data.drawnCards,
      fragmentsGrantedFromDuplicates: parsed.data.fragmentsGrantedFromDuplicates,
      wallet: parsed.data.wallet,
      state: parsed.data.state,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const setFavoriteCardsServer = async (
  userId: string,
  cardIds: string[]
): Promise<{ ok: boolean; state?: CardsStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cards/favorites', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cardIds }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update favorite cards.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimCardAchievementServer = async (
  userId: string,
  achievementId: string
): Promise<{
  ok: boolean;
  state?: CardsStateResponse;
  wallet?: PlayerWalletState;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/cards/claim-achievement', {
      method: 'POST',
      headers,
      body: JSON.stringify({ achievementId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim card achievement.' };
    return { ok: true, state: parsed.data.state, wallet: parsed.data.wallet };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchPublicFavoriteCardsServer = async (
  targetUserId: string
): Promise<{ ok: boolean; uniqueCount?: number; favoriteCardIds?: string[] }> => {
  try {
    const res = await fetch(`/api/cards/public/${encodeURIComponent(targetUserId)}`);
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false };
    return {
      ok: true,
      uniqueCount: parsed.data.uniqueCount,
      favoriteCardIds: Array.isArray(parsed.data.favoriteCards)
        ? parsed.data.favoriteCards.map((c: any) => c.cardId)
        : [],
    };
  } catch {
    return { ok: false };
  }
};

// --- AAA 3: PLAYER LOADOUTS ---
export const saveLoadoutServer = async (params: {
  userId: string;
  loadout: Partial<PlayerLoadout> & { name: string; context: 'default' | 'competition' };
}): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/loadouts/save', {
      method: 'POST',
      headers,
      body: JSON.stringify(params.loadout),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not save loadout.' };
    }
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const equipLoadoutServer = async (
  userId: string,
  loadoutId: string,
  applyAs: 'default' | 'competition' = 'default'
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/loadouts/equip', {
      method: 'POST',
      headers,
      body: JSON.stringify({ loadoutId, applyAs }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not equip loadout.' };
    }
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const duplicateLoadoutServer = async (
  userId: string,
  loadoutId: string
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/loadouts/duplicate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ loadoutId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not duplicate loadout.' };
    }
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const deleteLoadoutServer = async (
  userId: string,
  loadoutId: string
): Promise<{ ok: boolean; state?: PlayerCosmeticState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/loadouts/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ loadoutId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Could not delete loadout.' };
    }
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 4: FRIENDSHIP LEVELS ---
export const fetchFriendshipsStateServer = async (
  userId: string
): Promise<{ ok: boolean; friendships?: FriendshipProgressRecord[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/friendships/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Friendship Levels.' };
    return { ok: true, friendships: parsed.data.friendships || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimFriendshipCoopMissionServer = async (
  userId: string,
  friendId: string,
  missionId: string
): Promise<{ ok: boolean; xpAwarded?: number; record?: FriendshipProgressRecord; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/friendships/claim-mission', {
      method: 'POST',
      headers,
      body: JSON.stringify({ friendId, missionId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim cooperative mission.' };
    return { ok: true, xpAwarded: parsed.data.xpAwarded, record: parsed.data.record };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const resetFriendshipOnRemovalServer = async (
  userId: string,
  friendId: string
): Promise<{ ok: boolean }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/friendships/reset-on-removal', {
      method: 'POST',
      headers,
      body: JSON.stringify({ friendId }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
};

// --- AAA 5: HIDDEN ACHIEVEMENTS ---
export const fetchTrophiesAndHiddenServer = async (
  userId: string
): Promise<{
  ok: boolean;
  state?: TrophyShowcaseState;
  hiddenAchievements?: HiddenAchievementClientView[];
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/trophies/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to load trophies & hidden achievements.' };
    }
    return {
      ok: true,
      state: parsed.data.state,
      hiddenAchievements: parsed.data.hiddenAchievements || [],
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 6: COSMETIC MARKETPLACE ---
export const fetchMarketplaceStateServer = async (
  userId: string
): Promise<{ ok: boolean; state?: MarketplaceStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/marketplace/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok || !parsed.data?.state) {
      return { ok: false, error: parsed.data?.error || 'Failed to load Marketplace.' };
    }
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const toggleMarketplaceWishlistServer = async (
  userId: string,
  itemId: string
): Promise<{ ok: boolean; state?: MarketplaceStateResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/marketplace/wishlist/toggle', {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update wishlist.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const purchaseMarketplaceItemServer = async (
  userId: string,
  itemId: string,
  currency: 'gold' | 'fragments'
): Promise<{
  ok: boolean;
  state?: MarketplaceStateResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/marketplace/purchase', {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId, currency }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not complete purchase.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const attemptMarketplaceRmCheckoutServer = async (
  userId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/marketplace/checkout-rm', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const parsed = await safeJson(res);
    return {
      ok: parsed.ok,
      error: parsed.data?.error || 'Real-money checkout is disabled until payment settlement is configured.',
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 7 & 13: RANKED DIVISIONS, TOURNAMENTS & SPECTATOR MODE ---
export const claimRankedDivisionRewardServer = async (
  userId: string,
  division: RankedDivisionName
): Promise<{ ok: boolean; rewardTitleName?: string; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/rivals/claim-division-reward', {
      method: 'POST',
      headers,
      body: JSON.stringify({ division }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim division reward.' };
    return { ok: true, rewardTitleName: parsed.data.rewardTitleName };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchTournamentsStateServer = async (
  userId: string
): Promise<{ ok: boolean; tournaments?: CommunityTournament[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/tournaments/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load tournaments.' };
    return { ok: true, tournaments: parsed.data.tournaments || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const createTournamentServer = async (params: {
  userId: string;
  title: string;
  subtitle?: string;
  mode: CompetitiveRivalMode;
  username: string;
}): Promise<{ ok: boolean; tournaments?: CommunityTournament[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/tournaments/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not create tournament.' };
    return { ok: true, tournaments: parsed.data.tournaments || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const joinTournamentServer = async (params: {
  userId: string;
  tournamentId: string;
  username: string;
}): Promise<{ ok: boolean; tournaments?: CommunityTournament[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/tournaments/join', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not join tournament.' };
    return { ok: true, tournaments: parsed.data.tournaments || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const fetchSpectatorMatchesServer = async (
  userId: string
): Promise<{
  ok: boolean;
  matches?: SpectatorLiveMatchSummary[];
  followedCompetitorIds?: string[];
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/spectator/matches', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load spectator matches.' };
    return {
      ok: true,
      matches: parsed.data.matches || [],
      followedCompetitorIds: parsed.data.followedCompetitorIds || [],
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const sendSpectatorCheerServer = async (params: {
  userId: string;
  matchId: string;
  targetUserId: string;
  emoji: string;
  spectatorName: string;
}): Promise<{ ok: boolean; match?: SpectatorLiveMatchSummary; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/spectator/cheer', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send cheer.' };
    return { ok: true, match: parsed.data.match };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const toggleFollowCompetitorServer = async (
  userId: string,
  targetUserId: string
): Promise<{ ok: boolean; following?: boolean; followedCompetitorIds?: string[]; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/spectator/follow', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update follow.' };
    return {
      ok: true,
      following: parsed.data.following,
      followedCompetitorIds: parsed.data.followedCompetitorIds || [],
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 8: COLLECTION COMPLETION ---
export const fetchCollectionCompletionServer = async (
  userId: string
): Promise<{ ok: boolean; state?: CollectionCompletionResponse; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/collection/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load collection completion.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimCollectionMilestoneServer = async (
  userId: string,
  milestoneId: string
): Promise<{
  ok: boolean;
  wallet?: PlayerWalletState;
  state?: CollectionCompletionResponse;
  error?: string;
}> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/collection/claim-milestone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim collection milestone.' };
    return { ok: true, wallet: parsed.data.wallet, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 10: PEER ENDORSEMENTS ---
export const fetchEndorsementsSummaryServer = async (
  viewerId: string | undefined,
  targetUserId: string
): Promise<{ ok: boolean; summary?: PlayerEndorsementSummary; error?: string }> => {
  try {
    const headers = viewerId ? await getLifequestAuthHeaders(viewerId, false) : {};
    const res = await fetch(`/api/endorsements/state/${encodeURIComponent(targetUserId)}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load endorsements.' };
    return { ok: true, summary: parsed.data.summary };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const giveEndorsementServer = async (params: {
  userId: string;
  targetUserId: string;
  category: EndorsementCategory;
  note?: string;
  username?: string;
}): Promise<{ ok: boolean; summary?: PlayerEndorsementSummary; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/endorsements/give', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not send endorsement.' };
    return { ok: true, summary: parsed.data.summary };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const reportEndorsementAbuseServer = async (params: {
  userId: string;
  targetUserId: string;
  endorsementId?: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/endorsements/report', {
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

// --- AAA 11: ADDITIVE PRESTIGE ---
export const fetchPrestigeStateServer = async (
  userId: string
): Promise<{ ok: boolean; state?: PlayerPrestigeState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch('/api/prestige/state', { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Prestige.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const unlockPrestigeTierServer = async (
  userId: string,
  currentHeroLevel: number
): Promise<{ ok: boolean; state?: PlayerPrestigeState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/prestige/unlock', {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentHeroLevel }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not unlock Prestige tier.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimPrestigeChallengeServer = async (
  userId: string,
  challengeId: string
): Promise<{ ok: boolean; state?: PlayerPrestigeState; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/prestige/claim-challenge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ challengeId }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim Prestige challenge.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 12: FLEXIBLE DAILY CALENDAR ---
export const fetchDailyCalendarStateServer = async (
  userId: string,
  timezone?: string
): Promise<{ ok: boolean; state?: DailyCalendarStateResponse; error?: string }> => {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const qs = new URLSearchParams({ timezone: tz });
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch(`/api/calendar/state?${qs.toString()}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Daily Calendar.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimDailyCalendarCheckinServer = async (params: {
  userId: string;
  mode: 'workout' | 'rest_recovery';
  catchUpDayNumber?: number;
  timezone?: string;
}): Promise<{
  ok: boolean;
  dayNumber?: number;
  rewardSummary?: string;
  gracePassUsed?: boolean;
  state?: DailyCalendarStateResponse;
  error?: string;
}> => {
  try {
    const tz = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const headers = await getLifequestAuthHeaders(params.userId, true);
    const res = await fetch('/api/calendar/checkin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: params.mode,
        timezone: tz,
        ...(typeof params.catchUpDayNumber === 'number'
          ? { catchUpDayNumber: params.catchUpDayNumber }
          : {}),
      }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim calendar check-in.' };
    return {
      ok: true,
      dayNumber: parsed.data.dayNumber,
      rewardSummary: parsed.data.rewardSummary,
      gracePassUsed: parsed.data.gracePassUsed,
      state: parsed.data.state,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const claimCalendarWeeklyMilestoneServer = async (
  userId: string,
  milestoneId: string,
  timezone?: string
): Promise<{ ok: boolean; state?: DailyCalendarStateResponse; error?: string }> => {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/calendar/claim-weekly-milestone', {
      method: 'POST',
      headers,
      body: JSON.stringify({ milestoneId, timezone: tz }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not claim weekly milestone.' };
    return { ok: true, state: parsed.data.state };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

// --- AAA 15: SEASONAL STATISTICS RECAP ---
export const fetchSeasonalRecapServer = async (
  userId: string,
  seasonId?: string
): Promise<{ ok: boolean; recap?: SeasonalStatsRecap; error?: string }> => {
  try {
    const qs = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
    const headers = await getLifequestAuthHeaders(userId, false);
    const res = await fetch(`/api/seasons/recap${qs}`, { headers });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Failed to load Seasonal Recap.' };
    return { ok: true, recap: parsed.data.recap };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};

export const updateSeasonalRecapVisibilityServer = async (
  userId: string,
  visibility: SeasonalStatVisibility
): Promise<{ ok: boolean; recap?: SeasonalStatsRecap; error?: string }> => {
  try {
    const headers = await getLifequestAuthHeaders(userId, true);
    const res = await fetch('/api/seasons/recap/visibility', {
      method: 'POST',
      headers,
      body: JSON.stringify({ visibility }),
    });
    const parsed = await safeJson(res);
    if (!parsed.ok) return { ok: false, error: parsed.data?.error || 'Could not update recap privacy.' };
    return { ok: true, recap: parsed.data.recap };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error.' };
  }
};
