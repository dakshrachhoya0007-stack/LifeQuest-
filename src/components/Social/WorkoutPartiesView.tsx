import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { WORKOUT_PARTY_TEMPLATES } from '../../data/expansionData';
import { Character2DAvatar } from '../Character/Character2DAvatar';
import {
  CheckCircle2,
  History,
  LogOut,
  Play,
  Plus,
  Send,
  UserPlus,
  Users,
} from 'lucide-react';

export const WorkoutPartiesView: React.FC = () => {
  const {
    user,
    friends,
    fitnessSessions,
    workoutParties,
    workoutPartyHistory,
    partiesLoading,
    refreshWorkoutParties,
    createWorkoutParty,
    joinWorkoutPartyByCode,
    inviteToWorkoutParty,
    startWorkoutParty,
    saveWorkoutPartySummary,
    leaveWorkoutParty,
    submitWorkoutPartyProgress,
    sendWorkoutPartyMessage,
    getPlayerPresence,
  } = useGame();

  const [challengeId, setChallengeId] = useState(WORKOUT_PARTY_TEMPLATES[0].id);
  const [partyTitle, setPartyTitle] = useState('');
  const [visibility, setVisibility] = useState<'friends' | 'private' | 'public'>('friends');
  const [joinCode, setJoinCode] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [inviteFriendMap, setInviteFriendMap] = useState<Record<string, string>>({});
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshWorkoutParties();
  }, []);

  useEffect(() => {
    if (!selectedSessionId && fitnessSessions.length > 0) {
      setSelectedSessionId(fitnessSessions[0].id);
    }
  }, [fitnessSessions, selectedSessionId]);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3200);
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('create-party');
    const res = await createWorkoutParty({
      title: partyTitle.trim() || undefined,
      challengeId,
      visibility,
    });
    setBusyId(null);
    if (res.success) {
      setPartyTitle('');
      flash('success', `Workout Party created (${res.party?.roomCode}). Share the code with companions!`);
    } else {
      flash('error', res.error || 'Could not create workout party.');
    }
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusyId('join-code');
    const res = await joinWorkoutPartyByCode(joinCode.trim().toUpperCase());
    setBusyId(null);
    if (res.success) {
      setJoinCode('');
      flash('success', 'Joined Workout Party!');
    } else {
      flash('error', res.error || 'Party code not found or restricted.');
    }
  };

  const handleLogVerifiedProgress = async (partyId: string) => {
    const sess = fitnessSessions.find(s => s.id === selectedSessionId) || fitnessSessions[0];
    if (!sess) {
      flash('error', 'Log a verified session in Fitness Log first.');
      return;
    }
    setBusyId(`submit-${partyId}`);
    const res = await submitWorkoutPartyProgress(partyId, sess.id, {
      durationMinutes: sess.duration,
      repetitions: sess.reps || Math.max(10, sess.duration * 2),
      verifiedWithAetherVision: Boolean(sess.verifiedWithVision),
    });
    setBusyId(null);
    if (res.success) flash('success', 'Verified workout recorded toward shared party goal!');
    else flash('error', res.error || 'Could not submit party progress.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Create Party */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 space-y-4"
        >
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C5A15A]" />
              Host Real-Time Workout Party
            </h2>
            <p className="text-xs text-[#D9D2C5]/70 mt-0.5">
              Train alongside companions in real time. Verified completions automatically award mutual Friendship XP.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#D9D2C5]/75 mb-1">Challenge Preset</label>
              <select
                value={challengeId}
                onChange={e => setChallengeId(e.target.value)}
                className="w-full rounded-xl bg-[#08060f] border border-[#C5A15A]/25 px-3 py-2 text-xs text-white"
              >
                {WORKOUT_PARTY_TEMPLATES.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.targetValue} {tpl.targetUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#D9D2C5]/75 mb-1">Room Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as 'friends' | 'private' | 'public')}
                className="w-full rounded-xl bg-[#08060f] border border-[#C5A15A]/25 px-3 py-2 text-xs text-white"
              >
                <option value="friends">Friends</option>
                <option value="private">Invite Code Only</option>
                <option value="public">Open Guilds & Realm</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={partyTitle}
              onChange={e => setPartyTitle(e.target.value)}
              maxLength={60}
              placeholder="Optional room title (e.g. Morning Vanguard Session)"
              className="flex-1 rounded-xl bg-[#08060f] border border-[#C5A15A]/25 px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              disabled={busyId === 'create-party'}
              className="px-4 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914] text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Party
            </button>
          </div>
        </form>

        {/* Join via Room Code */}
        <form
          onSubmit={handleJoinCode}
          className="lg:col-span-5 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 flex flex-col justify-between gap-4"
        >
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-white">Join by Room Code</h3>
            <p className="text-xs text-[#D9D2C5]/70 mt-0.5">
              Enter a 6-character code shared by another adventurer to join their lobby.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="e.g. AQ74KP"
              className="flex-1 rounded-xl bg-[#08060f] border border-[#C5A15A]/25 px-3 py-2 text-xs font-mono uppercase text-white"
            />
            <button
              type="submit"
              disabled={busyId === 'join-code'}
              className="px-4 py-2 rounded-xl bg-[#251638] hover:bg-[#331e4d] border border-[#C5A15A]/40 text-xs font-bold text-[#E8CF96] whitespace-nowrap shrink-0"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Parties */}
      <div className="space-y-4">
        {partiesLoading && workoutParties.length === 0 ? (
          <div className="rounded-2xl bg-[#100D19] border border-white/10 p-8 text-center text-xs text-[#D9D2C5]/65">
            Loading live workout parties...
          </div>
        ) : workoutParties.length === 0 ? (
          <div className="rounded-2xl bg-[#100D19] border border-white/10 p-8 text-center text-xs text-[#D9D2C5]/65">
            No active workout parties. Host one above or enter a room code.
          </div>
        ) : (
          workoutParties.map(party => {
            const isHost = user?.id === party.hostId;
            const totalProgress = party.members.reduce((sum, m) => sum + m.progressValue, 0);
            const pct = Math.min(100, Math.round((totalProgress / Math.max(1, party.targetValue)) * 100));

            return (
              <div
                key={party.id}
                className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/30 p-5 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#C5A15A]">
                      <span className="font-mono font-bold">Room {party.roomCode}</span>
                      <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                      <span className="capitalize">{party.status}</span>
                      <span className="text-[#D9D2C5]/35" aria-hidden="true">·</span>
                      <span>Host: {party.hostUsername}</span>
                    </div>
                    <h3 className="font-['Cinzel'] font-bold text-lg text-white mt-0.5">
                      {party.title} — {party.challengeName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isHost && party.status === 'lobby' && (
                      <button
                        type="button"
                        onClick={() => void startWorkoutParty(party.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Session
                      </button>
                    )}
                    {party.status === 'completed' && !party.summarySaved && (
                      <button
                        type="button"
                        onClick={() => void saveWorkoutPartySummary(party.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#C5A15A] text-[#0c0914] text-xs font-bold whitespace-nowrap shrink-0"
                      >
                        Save Summary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void leaveWorkoutParty(party.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#161124] hover:bg-rose-950/60 border border-white/10 text-xs text-[#D9D2C5] flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave
                    </button>
                  </div>
                </div>

                {/* Combined Target Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#D9D2C5]/75">Group Goal Progress</span>
                    <span className="font-mono font-bold text-[#E8CF96]">
                      {totalProgress} / {party.targetValue} {party.targetUnit} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#08060f] border border-[#C5A15A]/20 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7046A5] to-[#C5A15A]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Party Members + Invite */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#C5A15A]">
                      Party Roster ({party.members.length})
                    </h4>
                    <div className="space-y-2">
                      {party.members.map(m => (
                        <div
                          key={m.userId}
                          className="rounded-xl bg-[#08060f] border border-white/10 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Character2DAvatar
                              characterClass={m.characterClass}
                              appearance={m.appearance}
                              size="sm"
                              presenceStatus={getPlayerPresence(m.userId).status}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{m.username}</p>
                              <p className="text-[11px] text-[#D9D2C5]/60 capitalize">
                                Lv.{m.level} · {m.connectionStatus}
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs tabular-nums shrink-0">
                            <span className="text-[#E8CF96] font-bold">
                              {m.progressValue} {party.targetUnit}
                            </span>
                            {m.completed && (
                              <span className="block text-[10px] text-emerald-300">Goal Met</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {acceptedFriends.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          value={inviteFriendMap[party.id] || ''}
                          onChange={e =>
                            setInviteFriendMap(prev => ({ ...prev, [party.id]: e.target.value }))
                          }
                          className="flex-1 rounded-xl bg-[#08060f] border border-white/15 px-3 py-1.5 text-xs text-white"
                        >
                          <option value="">Invite a friend...</option>
                          {acceptedFriends.map(f => (
                            <option key={f.champion.id} value={f.champion.id}>
                              {f.champion.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = inviteFriendMap[party.id];
                            if (targetId) void inviteToWorkoutParty(party.id, targetId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#251638] text-xs font-semibold text-[#E8CF96] flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Invite
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Verified Workout Submission & Party Chat */}
                  <div className="space-y-3">
                    <div className="rounded-xl bg-[#08060f] border border-white/10 p-3.5 space-y-2.5">
                      <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        Submit Verified Workout Session
                      </h4>
                      {fitnessSessions.length === 0 ? (
                        <p className="text-xs text-[#D9D2C5]/60">
                          Complete a workout in Fitness Log to submit verified progress here.
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedSessionId}
                            onChange={e => setSelectedSessionId(e.target.value)}
                            className="flex-1 rounded-lg bg-[#100D19] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                          >
                            {fitnessSessions.slice(0, 8).map(s => (
                              <option key={s.id} value={s.id}>
                                {s.type} · {s.duration}m
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === `submit-${party.id}`}
                            onClick={() => void handleLogVerifiedProgress(party.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#C5A15A] text-[#0c0914] text-xs font-bold whitespace-nowrap shrink-0"
                          >
                            Submit Verified
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-[#08060f] border border-white/10 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#D9D2C5]/80">Party Chat</span>
                        <div className="flex gap-1">
                          {['🔥', '💪', '⚔️'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void sendWorkoutPartyMessage(party.id, emoji, 'reaction')}
                              className="px-2 py-0.5 rounded bg-[#161124] hover:bg-[#251638] text-xs"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {party.messages.slice(-8).map(msg => (
                          <div key={msg.id}>
                            <span className="font-semibold text-[#C5A15A]">{msg.senderUsername}: </span>
                            <span className="text-[#D9D2C5]/80">{msg.content}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={chatDrafts[party.id] || ''}
                          onChange={e =>
                            setChatDrafts(prev => ({ ...prev, [party.id]: e.target.value }))
                          }
                          placeholder="Encourage the party..."
                          className="flex-1 rounded-lg bg-[#100D19] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const txt = (chatDrafts[party.id] || '').trim();
                            if (!txt) return;
                            void sendWorkoutPartyMessage(party.id, txt, 'message');
                            setChatDrafts(prev => ({ ...prev, [party.id]: '' }));
                          }}
                          aria-label="Send party message"
                          className="px-3 py-1.5 rounded-lg bg-[#251638] text-[#E8CF96] text-xs font-semibold"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Past Party History */}
      {workoutPartyHistory.length > 0 && (
        <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#C5A15A]" />
            Completed Workout Party Archive
          </h3>
          <div className="divide-y divide-white/10 text-xs">
            {workoutPartyHistory.slice(0, 8).map(h => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-2 tabular-nums">
                <span className="text-white font-semibold">{h.challengeName}</span>
                <span className="text-[#D9D2C5]/70 font-mono">
                  {h.groupTotal}/{h.targetValue} {h.targetUnit} · Your part: {h.userProgress} ·{' '}
                  {new Date(h.completedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
