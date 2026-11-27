import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { ChampionSummary, CharacterClass } from '../../types/game';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { formatLastActiveRelative } from '../../utils/presence';
import {
  Search,
  UserPlus,
  Users,
  Check,
  X,
  UserMinus,
  Ban,
  Loader2,
  Eye,
  AlertTriangle,
  Clock,
  Inbox,
} from 'lucide-react';
import { LegendTitleBadge } from './LegendTitleBadge';

type SocialSection = 'discover' | 'friends' | 'received' | 'sent' | 'blocked';

export const DiscoverPlayersView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    friends,
    blockedUsers,
    unifiedBackendReady,
    searchChampions,
    sendFriendRequest,
    cancelFriendRequest,
    respondFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    openPublicProfile,
    equippedLegendMap,
    getPlayerPresence,
    queryPresencesBatch,
  } = useGame();

  const [section, setSection] = useState<SocialSection>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'All' | CharacterClass>('All');
  const [champions, setChampions] = useState<ChampionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: 'remove' | 'block';
    targetUserId: string;
    friendshipId?: string;
    username: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadDirectory = async (q = searchQuery) => {
    if (!unifiedBackendReady) {
      setChampions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await searchChampions(q.trim(), 50, 0);
      setChampions(list);
    } catch (e: any) {
      setError(e?.message || 'Unable to load champion directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDirectory('');
  }, [unifiedBackendReady]);

  useEffect(() => {
    const ids = new Set<string>();
    champions.forEach(c => ids.add(c.id));
    friends.forEach(f => ids.add(f.champion.id));
    if (ids.size > 0) {
      void queryPresencesBatch(Array.from(ids));
    }
  }, [champions.length, friends.length]);

  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === 'accepted'),
    [friends]
  );
  const pendingIncoming = useMemo(
    () => friends.filter(f => f.status === 'pending' && f.direction === 'incoming'),
    [friends]
  );
  const pendingOutgoing = useMemo(
    () => friends.filter(f => f.status === 'pending' && f.direction === 'outgoing'),
    [friends]
  );

  // Merge live friendship state onto discovered champions so state stays consistent immediately
  const enrichedChampions = useMemo(() => {
    return champions
      .filter(c => classFilter === 'All' || c.characterClass === classFilter)
      .map(champ => {
        const localFriend = friends.find(f => f.champion.id === champ.id);
        if (!localFriend) return champ;
        const derivedStatus =
          localFriend.status === 'accepted'
            ? ('friends' as const)
            : localFriend.direction === 'outgoing'
            ? ('request_sent' as const)
            : ('request_received' as const);
        return {
          ...champ,
          relationshipStatus: derivedStatus,
          friendshipId: localFriend.friendshipId,
        };
      });
  }, [champions, friends, classFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadDirectory(searchQuery);
  };

  const handleSendRequest = async (champ: ChampionSummary) => {
    setBusyId(champ.id);
    const res = await sendFriendRequest(champ.id);
    if (!res.success) {
      showNotice('error', res.error || 'Could not send friend request.');
    } else {
      showNotice('success', `Friend request sent to ${champ.username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  const handleCancelRequest = async (friendshipId: string, username: string) => {
    setBusyId(friendshipId);
    const res = await cancelFriendRequest(friendshipId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not cancel request.');
    } else {
      showNotice('success', `Cancelled friend request to ${username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  const handleRespond = async (friendshipId: string, accept: boolean, username: string) => {
    setBusyId(friendshipId);
    await respondFriendRequest(friendshipId, accept);
    showNotice(
      'success',
      accept ? `${username} is now your friend!` : `Declined request from ${username}.`
    );
    await loadDirectory(searchQuery);
    setBusyId(null);
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setBusyId(pendingConfirm.targetUserId);
    if (pendingConfirm.kind === 'remove' && pendingConfirm.friendshipId) {
      await removeFriend(pendingConfirm.friendshipId);
      showNotice('success', `Removed ${pendingConfirm.username} from friends.`);
    } else if (pendingConfirm.kind === 'block') {
      const res = await blockUser(pendingConfirm.targetUserId);
      if (!res.success) {
        showNotice('error', res.error || 'Could not block user.');
      } else {
        showNotice('success', `Blocked ${pendingConfirm.username}.`);
      }
    }
    setPendingConfirm(null);
    await loadDirectory(searchQuery);
    setBusyId(null);
  };

  const handleUnblock = async (userId: string, username: string) => {
    setBusyId(userId);
    const res = await unblockUser(userId);
    if (!res.success) {
      showNotice('error', res.error || 'Could not unblock user.');
    } else {
      showNotice('success', `Unblocked ${username}.`);
      await loadDirectory(searchQuery);
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      {!embedded && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0A1930] via-[#102440] to-[#152E52] border border-[#65A9FF]/35 p-6 shadow-[0_12px_32px_rgba(4,12,28,0.72)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#65A9FF] mb-1">
                Social Directory · Verified Players
              </p>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
                DISCOVER &amp; FRIENDS
              </h1>
              <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
                Find active Aetheria champions, inspect public RPG profiles, manage friend requests, and keep your social circle safe.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs text-[#94A8C7] shrink-0 tabular-nums">
              <div>
                <span className="text-[11px] text-[#94A8C7]/75 block">Friends</span>
                <span className="text-lg font-bold text-[#F2F7FF] font-mono">{acceptedFriends.length}</span>
              </div>
              <div className="w-px h-8 bg-[#00D9FF]/30" />
              <div>
                <span className="text-[11px] text-[#94A8C7]/75 block">Incoming</span>
                <span className="text-lg font-bold text-[#65A9FF] font-mono">{pendingIncoming.length}</span>
              </div>
              <div className="w-px h-8 bg-[#00D9FF]/30" />
              <div>
                <span className="text-[11px] text-[#94A8C7]/75 block">Sent</span>
                <span className="text-lg font-bold text-[#00D9FF] font-mono">{pendingOutgoing.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0A1930] border border-[#00D9FF]/30 rounded-xl w-fit">
        {(
          [
            { id: 'discover', label: 'Discover Players' },
            { id: 'friends', label: `Friends (${acceptedFriends.length})` },
            { id: 'received', label: `Received (${pendingIncoming.length})` },
            { id: 'sent', label: `Sent (${pendingOutgoing.length})` },
            { id: 'blocked', label: `Blocked (${blockedUsers.length})` },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              section === tab.id
                ? 'bg-gradient-to-r from-[#1677FF] to-[#65A9FF] text-[#F2F7FF] shadow-[0_0_12px_rgba(101,169,255,0.35)]'
                : 'text-[#94A8C7] hover:text-[#F2F7FF] hover:bg-[#102440]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs ${
            notice.type === 'error'
              ? 'bg-[#36111F]/85 border-[#F05B70]/45 text-[#F05B70]'
              : 'bg-[#35D69A]/15 border-[#35D69A]/45 text-[#35D69A]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!unifiedBackendReady && (
        <div className="p-4 rounded-xl bg-[#FFAA45]/10 border border-[#FFAA45]/40 text-xs text-[#FFAA45]">
          Player discovery and friend requests are currently offline. Please check your connection or try again shortly.
        </div>
      )}

      {/* DISCOVER PLAYERS */}
      {section === 'discover' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 rounded-2xl p-4"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A8C7] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username, character name, or class..."
                className="w-full bg-[#061225] border border-[#00D9FF]/35 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F2F7FF] placeholder-[#94A8C7]/50 focus:outline-none focus:border-[#65A9FF]"
              />
            </div>

            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value as 'All' | CharacterClass)}
              className="bg-[#061225] border border-[#00D9FF]/35 rounded-xl px-3.5 py-2.5 text-xs text-[#F2F7FF] focus:outline-none focus:border-[#65A9FF]"
              aria-label="Filter by character class"
            >
              <option value="All">All Classes</option>
              <option value="Warrior">Warrior</option>
              <option value="Mage">Mage</option>
              <option value="Ranger">Ranger</option>
              <option value="Guardian">Guardian</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#65A9FF] hover:from-[#0099FF] hover:to-[#7bb6ff] text-[#F2F7FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_14px_rgba(101,169,255,0.35)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </form>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#94A8C7] bg-[#102440]/95 border border-[#00D9FF]/30 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-[#65A9FF]" />
              <span>Searching Aetheria champions...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-[#102440]/95 border border-[#F05B70]/45 text-center space-y-3">
              <p className="text-xs text-[#F05B70]">{error}</p>
              <button
                onClick={() => loadDirectory(searchQuery)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1677FF] to-[#65A9FF] text-[#F2F7FF] text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : enrichedChampions.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#102440]/95 border border-[#00D9FF]/30 text-center space-y-2">
              <Users className="w-7 h-7 text-[#65A9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No matching players found</p>
              <p className="text-xs text-[#94A8C7]">
                Try another username or clear your class filter to view all public champions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrichedChampions.map(champ => {
                const rel = champ.relationshipStatus || 'none';
                const statusLabel =
                  rel === 'friends'
                    ? 'Already friends'
                    : rel === 'request_sent'
                    ? 'Request sent'
                    : rel === 'request_received'
                    ? 'Request received'
                    : rel === 'blocked'
                    ? 'Blocked'
                    : 'Not friends';

                return (
                  <div
                    key={champ.id}
                    className="p-4 rounded-2xl bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 hover:border-[#65A9FF]/50 transition-all shadow-[0_8px_24px_rgba(4,12,28,0.55)] flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(champ.id)}
                        className="shrink-0 focus:outline-none group cursor-pointer"
                        title={`View ${champ.username}'s profile`}
                      >
                        <img
                          src={getRpgAvatarForClass(champ.characterClass)}
                          alt={`${champ.characterClass} Portrait`}
                          className="w-14 h-14 rounded-xl object-cover object-top border border-[#00D9FF]/55 group-hover:border-[#65A9FF] transition-colors"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {(() => {
                              const liveP = getPlayerPresence(champ.id);
                              const effectiveStatus = liveP.hidden
                                ? 'offline'
                                : champ.presenceStatus || liveP.status;
                              return !liveP.hidden ? (
                                <PresenceBadge status={effectiveStatus} size="xs" />
                              ) : null;
                            })()}
                            <button
                              type="button"
                              onClick={() => openPublicProfile(champ.id)}
                              className="text-sm font-bold text-[#F2F7FF] hover:text-[#65A9FF] truncate text-left transition-colors cursor-pointer"
                            >
                              {champ.username}
                            </button>
                            <LegendTitleBadge
                              title={champ.legendTitle || equippedLegendMap[champ.id]?.titleTag}
                              style={champ.legendTitleStyle || equippedLegendMap[champ.id]?.titleStyle}
                              emblemIcon={champ.legendEmblem || equippedLegendMap[champ.id]?.emblemIcon}
                              size="xs"
                            />
                          </div>
                          <span
                            className={`text-[11px] font-medium shrink-0 ${
                              rel === 'friends'
                                ? 'text-[#35D69A]'
                                : rel === 'request_sent' || rel === 'request_received'
                                ? 'text-[#65A9FF]'
                                : 'text-[#94A8C7]/70'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-[#65A9FF] mt-0.5 tabular-nums">
                          {champ.levelHidden ? 'Level Private' : `Lv.${champ.level}`} · {champ.characterClass} · {champ.aetherRank}
                          {(() => {
                            const liveP = getPlayerPresence(champ.id);
                            if (liveP.hidden || liveP.status === 'online') return '';
                            const ts = champ.lastActiveAt || liveP.lastActiveAt;
                            return ts ? ` · Last active ${formatLastActiveRelative(ts)}` : '';
                          })()}
                        </p>
                        {champ.guildName && (
                          <p className="text-[11px] text-[#94A8C7] mt-1 truncate">
                            [{champ.guildTag}] {champ.guildName}
                          </p>
                        )}
                        {champ.bio && (
                          <p className="text-xs text-[#94A8C7] mt-1.5 line-clamp-2">
                            {champ.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#00D9FF]/20">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(champ.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#152E52] border border-[#00D9FF]/35 hover:border-[#65A9FF]/50 text-[#F2F7FF] text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#65A9FF]" />
                        View Profile
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {rel === 'none' && (
                          <button
                            disabled={busyId === champ.id}
                            onClick={() => handleSendRequest(champ)}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#1677FF] to-[#65A9FF] hover:from-[#0099FF] hover:to-[#7bb6ff] text-[#F2F7FF] text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(101,169,255,0.3)] transition-all whitespace-nowrap cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Send Request
                          </button>
                        )}
                        {rel === 'request_sent' && champ.friendshipId && (
                          <button
                            disabled={busyId === champ.friendshipId}
                            onClick={() => handleCancelRequest(champ.friendshipId!, champ.username)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#94A8C7] hover:text-[#F2F7FF] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )}
                        {rel === 'request_received' && champ.friendshipId && (
                          <>
                            <button
                              disabled={busyId === champ.friendshipId}
                              onClick={() => handleRespond(champ.friendshipId!, true, champ.username)}
                              className="px-3 py-1.5 rounded-lg bg-[#35D69A] hover:bg-[#49e3a9] text-[#061225] text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={busyId === champ.friendshipId}
                              onClick={() => handleRespond(champ.friendshipId!, false, champ.username)}
                              className="px-3 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#94A8C7] hover:text-[#F2F7FF] text-xs font-semibold whitespace-nowrap cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {rel === 'friends' && champ.friendshipId && (
                          <button
                            onClick={() =>
                              setPendingConfirm({
                                kind: 'remove',
                                targetUserId: champ.id,
                                friendshipId: champ.friendshipId!,
                                username: champ.username,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-[#94A8C7] hover:text-[#F05B70] hover:bg-[#36111F]/60 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FRIENDS LIST */}
      {section === 'friends' && (
        <div className="bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 rounded-2xl p-5 space-y-3 shadow-[0_12px_32px_rgba(4,12,28,0.6)]">
          {acceptedFriends.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Users className="w-7 h-7 text-[#65A9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No friends added yet</p>
              <p className="text-xs text-[#94A8C7]">
                Use Discover Players to find active champions and send a friend request.
              </p>
              <button
                onClick={() => setSection('discover')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#65A9FF] hover:from-[#0099FF] hover:to-[#7bb6ff] text-[#F2F7FF] text-xs font-semibold shadow-[0_0_14px_rgba(101,169,255,0.35)] cursor-pointer"
              >
                Browse Players
              </button>
            </div>
          ) : (
            acceptedFriends.map(f => (
              <div
                key={f.friendshipId}
                className="p-3.5 rounded-xl bg-[#0A1930] border border-[#00D9FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="shrink-0 focus:outline-none cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(f.champion.characterClass)}
                      alt={f.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#65A9FF]/50"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(() => {
                        const liveP = getPlayerPresence(f.champion.id);
                        return !liveP.hidden ? (
                          <PresenceBadge status={f.champion.presenceStatus || liveP.status} size="xs" />
                        ) : null;
                      })()}
                      <button
                        type="button"
                        onClick={() => openPublicProfile(f.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#65A9FF] truncate block cursor-pointer"
                      >
                        {f.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={f.champion.legendTitle || equippedLegendMap[f.champion.id]?.titleTag}
                        style={f.champion.legendTitleStyle || equippedLegendMap[f.champion.id]?.titleStyle}
                        emblemIcon={f.champion.legendEmblem || equippedLegendMap[f.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{f.champion.level} · {f.champion.characterClass} · {f.champion.currentStreak}d streak
                      {(() => {
                        const liveP = getPlayerPresence(f.champion.id);
                        if (liveP.hidden) return '';
                        if (liveP.status === 'online') return ' · Online now';
                        const ts = f.champion.lastActiveAt || liveP.lastActiveAt;
                        return ts ? ` · Last active ${formatLastActiveRelative(ts)}` : '';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#061225] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#F2F7FF] text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() =>
                      setPendingConfirm({
                        kind: 'remove',
                        targetUserId: f.champion.id,
                        friendshipId: f.friendshipId,
                        username: f.champion.username,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-[#94A8C7] hover:text-[#F05B70] hover:bg-[#36111F]/60 text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() =>
                      setPendingConfirm({
                        kind: 'block',
                        targetUserId: f.champion.id,
                        username: f.champion.username,
                      })
                    }
                    className="p-1.5 rounded-lg text-[#94A8C7] hover:text-[#F05B70] hover:bg-[#36111F]/60 cursor-pointer"
                    title="Block user"
                    aria-label={`Block ${f.champion.username}`}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RECEIVED REQUESTS */}
      {section === 'received' && (
        <div className="bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 rounded-2xl p-5 space-y-3 shadow-[0_12px_32px_rgba(4,12,28,0.6)]">
          {pendingIncoming.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Inbox className="w-7 h-7 text-[#65A9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No incoming friend requests</p>
              <p className="text-xs text-[#94A8C7]">
                When another player sends you a request, it will appear here.
              </p>
            </div>
          ) : (
            pendingIncoming.map(req => (
              <div
                key={req.friendshipId}
                className="p-3.5 rounded-xl bg-[#0A1930] border border-[#00D9FF]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#65A9FF]/50"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(req.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#65A9FF] truncate block cursor-pointer"
                      >
                        {req.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={req.champion.legendTitle || equippedLegendMap[req.champion.id]?.titleTag}
                        style={req.champion.legendTitleStyle || equippedLegendMap[req.champion.id]?.titleStyle}
                        emblemIcon={req.champion.legendEmblem || equippedLegendMap[req.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#65A9FF] tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Wants to connect
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, true, req.champion.username)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#35D69A] hover:bg-[#49e3a9] text-[#061225] text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, false, req.champion.username)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#061225] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#94A8C7] hover:text-[#F2F7FF] text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SENT REQUESTS */}
      {section === 'sent' && (
        <div className="bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 rounded-2xl p-5 space-y-3 shadow-[0_12px_32px_rgba(4,12,28,0.6)]">
          {pendingOutgoing.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="w-7 h-7 text-[#65A9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No pending sent requests</p>
              <p className="text-xs text-[#94A8C7]">
                Requests you send to other champions appear here until accepted or cancelled.
              </p>
            </div>
          ) : (
            pendingOutgoing.map(req => (
              <div
                key={req.friendshipId}
                className="p-3.5 rounded-xl bg-[#0A1930] border border-[#00D9FF]/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0 cursor-pointer"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-[#00D9FF]/50"
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(req.champion.id)}
                        className="text-sm font-bold text-[#F2F7FF] hover:text-[#65A9FF] truncate block cursor-pointer"
                      >
                        {req.champion.username}
                      </button>
                      <LegendTitleBadge
                        title={req.champion.legendTitle || equippedLegendMap[req.champion.id]?.titleTag}
                        style={req.champion.legendTitleStyle || equippedLegendMap[req.champion.id]?.titleStyle}
                        emblemIcon={req.champion.legendEmblem || equippedLegendMap[req.champion.id]?.emblemIcon}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Awaiting response
                    </p>
                  </div>
                </div>
                <button
                  disabled={busyId === req.friendshipId}
                  onClick={() => handleCancelRequest(req.friendshipId, req.champion.username)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#061225] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#94A8C7] hover:text-[#F2F7FF] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* BLOCKED USERS */}
      {section === 'blocked' && (
        <div className="bg-[#102440]/95 backdrop-blur-md border border-[#00D9FF]/30 rounded-2xl p-5 space-y-3 shadow-[0_12px_32px_rgba(4,12,28,0.6)]">
          {blockedUsers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Ban className="w-7 h-7 text-[#65A9FF] mx-auto" />
              <p className="text-sm font-semibold text-[#F2F7FF]">No blocked users</p>
              <p className="text-xs text-[#94A8C7]">
                Players you block cannot send you friend requests, chat whispers, or view your profile.
              </p>
            </div>
          ) : (
            blockedUsers.map(b => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-[#0A1930] border border-[#00D9FF]/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={getRpgAvatarForClass(b.characterClass)}
                    alt={b.username}
                    className="w-10 h-10 rounded-xl object-cover object-top border border-[#00D9FF]/30 grayscale"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#F2F7FF] truncate">{b.username}</p>
                    <p className="text-xs text-[#94A8C7] tabular-nums">
                      Lv.{b.level} · {b.characterClass}
                    </p>
                  </div>
                </div>
                <button
                  disabled={busyId === b.id}
                  onClick={() => handleUnblock(b.id, b.username)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#061225] hover:bg-[#152E52] border border-[#00D9FF]/35 text-[#F2F7FF] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal for Remove Friend / Block User */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061225]/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="w-full max-w-sm bg-[#102440] border border-[#F05B70]/50 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#F05B70]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-['Cinzel'] font-bold text-base">
                {pendingConfirm.kind === 'block' ? 'Block Player?' : 'Remove Friend?'}
              </h3>
            </div>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              {pendingConfirm.kind === 'block'
                ? `Block ${pendingConfirm.username}? Existing friendship links will be removed and neither of you will see each other in discovery or leaderboards.`
                : `Remove ${pendingConfirm.username} from your friends list? You can send a new friend request later if you change your mind.`}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busyId === pendingConfirm.targetUserId}
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-[#F05B70] hover:bg-[#f47587] text-[#061225] text-xs font-bold cursor-pointer"
              >
                {pendingConfirm.kind === 'block' ? 'Block User' : 'Remove Friend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
