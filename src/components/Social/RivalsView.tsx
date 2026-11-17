import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { RIVAL_CHALLENGE_CATALOG } from '../../data/ecosystemData';
import type { RivalChallengeType } from '../../types/game';
import {
  Award,
  Ban,
  Check,
  Clock,
  Shield,
  Swords,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';

const formatRemainingDays = (endsAt: string): string => {
  const diff = Math.max(0, Date.parse(endsAt) - Date.now());
  if (diff === 0) return 'Ending now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h left`;
};

export const RivalsView: React.FC = () => {
  const {
    user,
    friends,
    rivalsState,
    rivalsLoading,
    refreshRivalsState,
    sendRivalInvite,
    respondRivalInvite,
    cancelRivalInvite,
    endActiveRivalry,
    blockRivalUser,
  } = useGame();

  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [selectedChallenge, setSelectedChallenge] = useState<RivalChallengeType>('weekly_activity_score');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void refreshRivalsState();
  }, []);

  const blockedSet = new Set(rivalsState?.blockedIds || []);
  const acceptedFriends = friends.filter(
    f => f.status === 'accepted' && !blockedSet.has(f.champion.id)
  );

  useEffect(() => {
    if (!selectedFriendId && acceptedFriends.length > 0) {
      setSelectedFriendId(acceptedFriends[0].champion.id);
    }
  }, [acceptedFriends, selectedFriendId]);

  const rivalries = rivalsState?.rivalries || [];
  const stats = rivalsState?.stats || {
    wins: 0,
    losses: 0,
    ties: 0,
    activeCount: 0,
    pendingIncomingCount: 0,
    titlesUnlocked: [],
    achievementsUnlocked: [],
  };

  const incomingInvites = rivalries.filter(
    r => r.status === 'pending' && r.opponentId === user?.id
  );
  const outgoingInvites = rivalries.filter(
    r => r.status === 'pending' && r.challengerId === user?.id
  );
  const activeDuels = rivalries.filter(r => r.status === 'active');
  const historyDuels = rivalries.filter(
    r => r.status === 'completed' || r.status === 'declined' || r.status === 'cancelled' || r.status === 'expired'
  );

  const handleSendInvite = async () => {
    const friend = acceptedFriends.find(f => f.champion.id === selectedFriendId);
    if (!friend) {
      setFeedback({ type: 'error', text: 'Select an accepted friend to challenge.' });
      return;
    }
    setBusyId('send');
    setFeedback(null);
    try {
      const res = await sendRivalInvite(
        friend.champion.id,
        friend.champion.username,
        selectedChallenge
      );
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Sent a 7-day ${RIVAL_CHALLENGE_CATALOG[selectedChallenge].title} challenge to ${friend.champion.username}.`,
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Could not send challenge.' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRespond = async (rivalryId: string, decision: 'accept' | 'decline') => {
    setBusyId(rivalryId);
    setFeedback(null);
    try {
      const res = await respondRivalInvite(rivalryId, decision);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.success
          ? decision === 'accept'
            ? 'Rivalry accepted! Your verified workouts and habits now count toward the 7-day duel.'
            : 'Rivalry invitation declined.'
          : res.error || 'Action failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Rivalry Record & Titles Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#100D19] border border-[#C5A15A]/20 p-4">
          <span className="text-[11px] text-[#D9D2C5]/60 block">Duel Record (W-L-T)</span>
          <span className="text-lg font-bold font-mono text-white tabular-nums">
            {stats.wins}-{stats.losses}-{stats.ties}
          </span>
        </div>
        <div className="rounded-xl bg-[#100D19] border border-[#C5A15A]/20 p-4">
          <span className="text-[11px] text-[#D9D2C5]/60 block">Active Rivalries</span>
          <span className="text-lg font-bold font-mono text-[#C5A15A] tabular-nums">
            {stats.activeCount}
          </span>
        </div>
        <div className="rounded-xl bg-[#100D19] border border-[#C5A15A]/20 p-4">
          <span className="text-[11px] text-[#D9D2C5]/60 block">Unlocked Rivalry Titles</span>
          <span className="text-xs font-semibold text-purple-200 mt-1 block truncate">
            {stats.titlesUnlocked.length > 0 ? stats.titlesUnlocked.join(' · ') : 'Win 1 duel to earn title'}
          </span>
        </div>
        <div className="rounded-xl bg-[#100D19] border border-[#C5A15A]/20 p-4">
          <span className="text-[11px] text-[#D9D2C5]/60 block">Achievements</span>
          <span className="text-xs font-semibold text-emerald-300 mt-1 block truncate">
            {stats.achievementsUnlocked.length > 0 ? stats.achievementsUnlocked.join(' · ') : 'None unlocked yet'}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Issue 7-Day Friend Challenge */}
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#C5A15A]" />
              Challenge an Accepted Friend (7-Day Duel)
            </h2>
            <p className="text-xs text-[#D9D2C5]/65 mt-0.5">
              Scores are normalized on the server from your verified workouts, habits, and recovery routines.
            </p>
          </div>
          {rivalsLoading && <span className="text-xs text-[#C5A15A]">Syncing...</span>}
        </div>

        {acceptedFriends.length === 0 ? (
          <div className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-4 text-xs text-[#D9D2C5]/70 flex items-center gap-3">
            <UserPlus className="w-4 h-4 text-[#C5A15A] shrink-0" />
            Add and accept at least one friend in the Friends tab to start a friendly 7-day rivalry.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] text-[#D9D2C5]/70 font-semibold block">
                Select Companion
              </label>
              <select
                value={selectedFriendId}
                onChange={e => setSelectedFriendId(e.target.value)}
                className="w-full rounded-xl bg-[#151022] border border-[#C5A15A]/25 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A15A]"
              >
                {acceptedFriends.map(f => (
                  <option key={f.champion.id} value={f.champion.id}>
                    {f.champion.username} (Lv.{f.champion.level} · {f.champion.characterClass})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 space-y-1">
              <label className="text-[11px] text-[#D9D2C5]/70 font-semibold block">
                Challenge Focus
              </label>
              <select
                value={selectedChallenge}
                onChange={e => setSelectedChallenge(e.target.value as RivalChallengeType)}
                className="w-full rounded-xl bg-[#151022] border border-[#C5A15A]/25 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C5A15A]"
              >
                {(Object.keys(RIVAL_CHALLENGE_CATALOG) as RivalChallengeType[]).map(key => (
                  <option key={key} value={key}>
                    {RIVAL_CHALLENGE_CATALOG[key].title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="button"
                disabled={busyId === 'send'}
                onClick={() => void handleSendInvite()}
                className="w-full px-4 py-2.5 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] disabled:opacity-50 text-[#0c0914] font-bold text-xs transition-colors whitespace-nowrap"
              >
                {busyId === 'send' ? 'Sending...' : 'Send Rivalry Challenge'}
              </button>
            </div>
          </div>
        )}
        <p className="text-[11px] text-[#D9D2C5]/55">
          {RIVAL_CHALLENGE_CATALOG[selectedChallenge].description}
        </p>
      </div>

      {/* Pending Invitations */}
      {(incomingInvites.length > 0 || outgoingInvites.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {incomingInvites.length > 0 && (
            <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-4 space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-sm text-[#C5A15A]">
                Incoming Rivalry Invitations ({incomingInvites.length})
              </h3>
              {incomingInvites.map(inv => (
                <div
                  key={inv.id}
                  className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {inv.challengerName} · {inv.challengeTitle}
                    </p>
                    <p className="text-[11px] text-[#D9D2C5]/60">7-day friendly challenge</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === inv.id}
                      onClick={() => void handleRespond(inv.id, 'accept')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === inv.id}
                      onClick={() => void handleRespond(inv.id, 'decline')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#231938] hover:bg-rose-950/60 text-rose-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoingInvites.length > 0 && (
            <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-4 space-y-3">
              <h3 className="font-['Cinzel'] font-bold text-sm text-white">
                Outgoing Invitations ({outgoingInvites.length})
              </h3>
              {outgoingInvites.map(inv => (
                <div
                  key={inv.id}
                  className="rounded-xl bg-[#151022] border border-[#C5A15A]/15 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      To {inv.opponentName} · {inv.challengeTitle}
                    </p>
                    <p className="text-[11px] text-[#D9D2C5]/60">Awaiting response</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancelRivalInvite(inv.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#231938] hover:bg-rose-950/50 text-xs text-rose-200 font-semibold shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Head-to-Head Duels */}
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-4">
        <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#C5A15A]" />
          Active Head-to-Head Rivalries
        </h3>

        {activeDuels.length === 0 ? (
          <p className="text-xs text-[#D9D2C5]/60">
            No active rivalries right now. Send a challenge above to begin a 7-day comparison duel.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDuels.map(r => {
              const amChallenger = r.challengerId === user?.id;
              const myScore = amChallenger ? r.challengerScore : r.opponentScore;
              const theirScore = amChallenger ? r.opponentScore : r.challengerScore;
              const theirName = amChallenger ? r.opponentName : r.challengerName;
              const theirId = amChallenger ? r.opponentId : r.challengerId;
              const total = Math.max(1, myScore + theirScore);
              const myShare = Math.round((myScore / total) * 100);

              return (
                <div
                  key={r.id}
                  className="rounded-xl bg-[#151022] border border-[#C5A15A]/25 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-['Cinzel'] font-bold text-[#C5A15A]">
                        {r.challengeTitle}
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        You vs {theirName}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-[#D9D2C5]/65 flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" /> {formatRemainingDays(r.endsAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-mono font-bold tabular-nums">
                    <span className="text-emerald-300">
                      {myScore} pts <span className="text-[10px] font-sans font-normal text-[#D9D2C5]/60">(You)</span>
                    </span>
                    <span className="text-purple-300">
                      {theirScore} pts <span className="text-[10px] font-sans font-normal text-[#D9D2C5]/60">({theirName})</span>
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-purple-950 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${myShare}%` }} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void endActiveRivalry(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#231938] hover:bg-[#31224d] text-[11px] text-[#D9D2C5]/80 font-semibold"
                    >
                      End Duel
                    </button>
                    <button
                      type="button"
                      onClick={() => void blockRivalUser(theirId)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-950 text-[11px] text-rose-300 font-semibold flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" /> Block
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Head-to-Head History */}
      {historyDuels.length > 0 && (
        <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#C5A15A]" />
            Rivalry History
          </h3>
          <div className="space-y-2">
            {historyDuels.slice(0, 12).map(r => {
              const amChallenger = r.challengerId === user?.id;
              const myScore = amChallenger ? r.challengerScore : r.opponentScore;
              const theirScore = amChallenger ? r.opponentScore : r.challengerScore;
              const theirName = amChallenger ? r.opponentName : r.challengerName;
              const verdict =
                r.status === 'completed'
                  ? r.isTie
                    ? 'Tie'
                    : r.winnerId === user?.id
                    ? 'Victory'
                    : 'Defeat'
                  : r.status.toUpperCase();

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#151022] border border-[#C5A15A]/10 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{r.challengeTitle}</span>
                    <span className="text-[#D9D2C5]/60"> vs {theirName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-[#D9D2C5]/80">
                      {myScore} - {theirScore}
                    </span>
                    <span
                      className={`font-bold ${
                        verdict === 'Victory'
                          ? 'text-emerald-300'
                          : verdict === 'Defeat'
                          ? 'text-rose-300'
                          : 'text-[#C5A15A]'
                      }`}
                    >
                      {verdict}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
