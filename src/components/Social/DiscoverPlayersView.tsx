import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRpgAvatarForClass } from '../../assets/images';
import { ChampionSummary, CharacterClass } from '../../types/game';
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

type SocialSection = 'discover' | 'friends' | 'received' | 'sent' | 'blocked';

export const DiscoverPlayersView: React.FC = () => {
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
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-300 mb-1">
              Social Directory · Verified Players
            </p>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              DISCOVER & FRIENDS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Find active Aetheria champions, inspect public RPG profiles, manage friend requests, and keep your social circle safe.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 shrink-0 tabular-nums">
            <div>
              <span className="text-[11px] text-slate-400 block">Friends</span>
              <span className="text-lg font-bold text-white font-mono">{acceptedFriends.length}</span>
            </div>
            <div className="w-px h-8 bg-purple-900/70" />
            <div>
              <span className="text-[11px] text-slate-400 block">Incoming</span>
              <span className="text-lg font-bold text-amber-300 font-mono">{pendingIncoming.length}</span>
            </div>
            <div className="w-px h-8 bg-purple-900/70" />
            <div>
              <span className="text-[11px] text-slate-400 block">Sent</span>
              <span className="text-lg font-bold text-purple-300 font-mono">{pendingOutgoing.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0e0a1b] border border-purple-950 rounded-xl w-fit">
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
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              section === tab.id
                ? 'bg-purple-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
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
              ? 'bg-rose-950/70 border-rose-700 text-rose-200'
              : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!unifiedBackendReady && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          Connect to your Supabase backend and apply the database migrations to discover live players and manage friend requests.
        </div>
      )}

      {/* DISCOVER PLAYERS */}
      {section === 'discover' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0e0a1b] border border-purple-950 rounded-2xl p-4"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username, character name, or class..."
                className="w-full bg-[#130f24] border border-purple-900/70 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value as 'All' | CharacterClass)}
              className="bg-[#130f24] border border-purple-900/70 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
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
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </form>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-400 bg-[#0e0a1b] border border-purple-950 rounded-2xl">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <span>Searching Aetheria champions...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-[#0e0a1b] border border-rose-900/60 text-center space-y-3">
              <p className="text-xs text-rose-300">{error}</p>
              <button
                onClick={() => loadDirectory(searchQuery)}
                className="px-4 py-2 rounded-lg bg-purple-800 text-white text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          ) : enrichedChampions.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#0e0a1b] border border-purple-950 text-center space-y-2">
              <Users className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No matching players found</p>
              <p className="text-xs text-slate-400">
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
                    className="p-4 rounded-2xl bg-[#0e0a1b] border border-purple-950/90 hover:border-purple-800/80 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(champ.id)}
                        className="shrink-0 focus:outline-none group"
                        title={`View ${champ.username}'s profile`}
                      >
                        <img
                          src={getRpgAvatarForClass(champ.characterClass)}
                          alt={`${champ.characterClass} Portrait`}
                          className="w-14 h-14 rounded-xl object-cover object-top border border-purple-600/70 group-hover:border-purple-400 transition-colors"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openPublicProfile(champ.id)}
                            className="text-sm font-bold text-white hover:text-purple-300 truncate text-left transition-colors"
                          >
                            {champ.username}
                          </button>
                          <span
                            className={`text-[11px] font-medium shrink-0 ${
                              rel === 'friends'
                                ? 'text-emerald-400'
                                : rel === 'request_sent' || rel === 'request_received'
                                ? 'text-amber-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-xs text-purple-300 mt-0.5 tabular-nums">
                          Lv.{champ.level} · {champ.characterClass} · {champ.aetherRank}
                        </p>
                        {champ.guildName && (
                          <p className="text-[11px] text-slate-400 mt-1 truncate">
                            [{champ.guildTag}] {champ.guildName}
                          </p>
                        )}
                        {champ.bio && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                            {champ.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-purple-950/60">
                      <button
                        type="button"
                        onClick={() => openPublicProfile(champ.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#161029] hover:bg-purple-950/70 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        View Profile
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {rel === 'none' && (
                          <button
                            disabled={busyId === champ.id}
                            onClick={() => handleSendRequest(champ)}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Send Request
                          </button>
                        )}
                        {rel === 'request_sent' && champ.friendshipId && (
                          <button
                            disabled={busyId === champ.friendshipId}
                            onClick={() => handleCancelRequest(champ.friendshipId!, champ.username)}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
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
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={busyId === champ.friendshipId}
                              onClick={() => handleRespond(champ.friendshipId!, false, champ.username)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap"
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
                            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
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
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
          {acceptedFriends.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Users className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No friends added yet</p>
              <p className="text-xs text-slate-400">
                Use Discover Players to find active champions and send a friend request.
              </p>
              <button
                onClick={() => setSection('discover')}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold"
              >
                Browse Players
              </button>
            </div>
          ) : (
            acceptedFriends.map(f => (
              <div
                key={f.friendshipId}
                className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="shrink-0 focus:outline-none"
                  >
                    <img
                      src={getRpgAvatarForClass(f.champion.characterClass)}
                      alt={f.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-purple-600/70"
                    />
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openPublicProfile(f.champion.id)}
                      className="text-sm font-bold text-white hover:text-purple-300 truncate block"
                    >
                      {f.champion.username}
                    </button>
                    <p className="text-xs text-slate-400 tabular-nums">
                      Lv.{f.champion.level} · {f.champion.characterClass} · {f.champion.currentStreak}d streak
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openPublicProfile(f.champion.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#0a0714] hover:bg-purple-950/60 text-slate-200 text-xs font-medium whitespace-nowrap"
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
                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs font-medium whitespace-nowrap"
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950/40"
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
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
          {pendingIncoming.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Inbox className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No incoming friend requests</p>
              <p className="text-xs text-slate-400">
                When another player sends you a request, it will appear here.
              </p>
            </div>
          ) : (
            pendingIncoming.map(req => (
              <div
                key={req.friendshipId}
                className="p-3.5 rounded-xl bg-[#130f24] border border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-purple-600/70"
                    />
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openPublicProfile(req.champion.id)}
                      className="text-sm font-bold text-white hover:text-purple-300 truncate block"
                    >
                      {req.champion.username}
                    </button>
                    <p className="text-xs text-purple-300 tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Wants to connect
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, true, req.champion.username)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    disabled={busyId === req.friendshipId}
                    onClick={() => handleRespond(req.friendshipId, false, req.champion.username)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
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
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
          {pendingOutgoing.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No pending sent requests</p>
              <p className="text-xs text-slate-400">
                Requests you send to other champions appear here until accepted or cancelled.
              </p>
            </div>
          ) : (
            pendingOutgoing.map(req => (
              <div
                key={req.friendshipId}
                className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => openPublicProfile(req.champion.id)}
                    className="shrink-0"
                  >
                    <img
                      src={getRpgAvatarForClass(req.champion.characterClass)}
                      alt={req.champion.username}
                      className="w-11 h-11 rounded-xl object-cover object-top border border-purple-700/60"
                    />
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openPublicProfile(req.champion.id)}
                      className="text-sm font-bold text-white hover:text-purple-300 truncate block"
                    >
                      {req.champion.username}
                    </button>
                    <p className="text-xs text-slate-400 tabular-nums">
                      Lv.{req.champion.level} · {req.champion.characterClass} · Awaiting response
                    </p>
                  </div>
                </div>
                <button
                  disabled={busyId === req.friendshipId}
                  onClick={() => handleCancelRequest(req.friendshipId, req.champion.username)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0"
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
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3">
          {blockedUsers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Ban className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No blocked users</p>
              <p className="text-xs text-slate-400">
                Players you block cannot send you friend requests, chat whispers, or view your profile.
              </p>
            </div>
          ) : (
            blockedUsers.map(b => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={getRpgAvatarForClass(b.characterClass)}
                    alt={b.username}
                    className="w-10 h-10 rounded-xl object-cover object-top border border-slate-700 grayscale"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{b.username}</p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      Lv.{b.level} · {b.characterClass}
                    </p>
                  </div>
                </div>
                <button
                  disabled={busyId === b.id}
                  onClick={() => handleUnblock(b.id, b.username)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0f0c1b] border border-rose-900/70 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-['Cinzel'] font-bold text-base">
                {pendingConfirm.kind === 'block' ? 'Block Player?' : 'Remove Friend?'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingConfirm.kind === 'block'
                ? `Block ${pendingConfirm.username}? Existing friendship links will be removed and neither of you will see each other in discovery or leaderboards.`
                : `Remove ${pendingConfirm.username} from your friends list? You can send a new friend request later if you change your mind.`}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={busyId === pendingConfirm.targetUserId}
                onClick={executeConfirmedAction}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
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
