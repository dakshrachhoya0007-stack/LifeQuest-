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
      durationMinutes: sess.durationMinutes,
      repetitions: sess.repetitions || Math.max(10, sess.durationMinutes * 2),
      verifiedWithAetherVision: Boolean(sess.verifiedWithAetherVision),
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
          className="lg:col-span-7 rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-4 shadow-[0_12px_32px_rgba(10,5,24,0.65)]"
        >
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#65A9FF]" />
              Host Real-Time Workout Party
            </h2>
            <p className="text-xs text-[#BEB4D6] mt-0.5">
              Train alongside companions in real time. Verified completions automatically award mutual Friendship XP.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Challenge Preset</label>
              <select
                value={challengeId}
                onChange={e => setChallengeId(e.target.value)}
                className="w-full rounded-xl bg-[#100D1C] border border-[#A875FF]/35 focus:border-[#65A9FF] focus:outline-none px-3 py-2 text-xs text-[#F7F4FF]"
              >
                {WORKOUT_PARTY_TEMPLATES.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.targetValue} {tpl.targetUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Room Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as 'friends' | 'private' | 'public')}
                className="w-full rounded-xl bg-[#100D1C] border border-[#A875FF]/35 focus:border-[#65A9FF] focus:outline-none px-3 py-2 text-xs text-[#F7F4FF]"
              >
                <option value="friends">Friends</option>
                <option value="private">Invite Code Only</option>
                <option value="public">Open Guilds &amp; Realm</option>
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
              className="flex-1 rounded-xl bg-[#100D1C] border border-[#A875FF]/35 focus:border-[#65A9FF] focus:outline-none px-3 py-2 text-xs text-[#F7F4FF] placeholder-[#BEB4D6]/50"
            />
            <button
              type="submit"
              disabled={busyId === 'create-party'}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] text-[#F7F4FF] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(101,169,255,0.3)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Party
            </button>
          </div>
        </form>

        {/* Join via Room Code */}
        <form
          onSubmit={handleJoinCode}
          className="lg:col-span-5 rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 flex flex-col justify-between gap-4 shadow-[0_12px_32px_rgba(10,5,24,0.65)]"
        >
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">Join by Room Code</h3>
            <p className="text-xs text-[#BEB4D6] mt-0.5">
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
              className="flex-1 rounded-xl bg-[#100D1C] border border-[#A875FF]/35 focus:border-[#65A9FF] focus:outline-none px-3 py-2 text-xs font-mono uppercase text-[#F7F4FF] placeholder-[#BEB4D6]/50"
            />
            <button
              type="submit"
              disabled={busyId === 'join-code'}
              className="px-4 py-2 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#A875FF]/40 hover:border-[#65A9FF]/60 text-xs font-bold text-[#65A9FF] hover:text-[#F7F4FF] whitespace-nowrap shrink-0 transition-all cursor-pointer"
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
              ? 'bg-[#35D69A]/15 border-[#35D69A]/45 text-[#35D69A]'
              : 'bg-[#36111F]/85 border-[#F05B70]/45 text-[#F05B70]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Parties */}
      <div className="space-y-4">
        {partiesLoading && workoutParties.length === 0 ? (
          <div className="rounded-2xl bg-[#24143D]/90 border border-[#A875FF]/30 p-8 text-center text-xs text-[#BEB4D6]">
            Loading live workout parties...
          </div>
        ) : workoutParties.length === 0 ? (
          <div className="rounded-2xl bg-[#24143D]/90 border border-[#A875FF]/30 p-8 text-center text-xs text-[#BEB4D6]">
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
                className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/35 p-5 space-y-5 shadow-[0_12px_32px_rgba(10,5,24,0.6)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#A875FF]/25">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#65A9FF]">
                      <span className="font-mono font-bold">Room {party.roomCode}</span>
                      <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                      <span className="capitalize">{party.status}</span>
                      <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
                      <span>Host: {party.hostUsername}</span>
                    </div>
                    <h3 className="font-['Cinzel'] font-bold text-lg text-[#F7F4FF] mt-0.5">
                      {party.title} — {party.challengeName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isHost && party.status === 'lobby' && (
                      <button
                        type="button"
                        onClick={() => void startWorkoutParty(party.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#35D69A] hover:bg-[#49e3a9] text-[#100D1C] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Session
                      </button>
                    )}
                    {party.status === 'completed' && !party.summarySaved && (
                      <button
                        type="button"
                        onClick={() => void saveWorkoutPartySummary(party.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] text-[#F7F4FF] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Save Summary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void leaveWorkoutParty(party.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#19122B] hover:bg-[#36111F]/80 border border-[#A875FF]/30 hover:border-[#F05B70]/50 text-xs text-[#BEB4D6] hover:text-[#F05B70] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave
                    </button>
                  </div>
                </div>

                {/* Combined Target Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#BEB4D6]">Group Goal Progress</span>
                    <span className="font-mono font-bold text-[#65A9FF]">
                      {totalProgress} / {party.targetValue} {party.targetUnit} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#100D1C] border border-[#A875FF]/30 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#6638B8] via-[#A875FF] to-[#65A9FF]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Party Members + Invite */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#65A9FF]">
                      Party Roster ({party.members.length})
                    </h4>
                    <div className="space-y-2">
                      {party.members.map(m => (
                        <div
                          key={m.userId}
                          className="rounded-xl bg-[#19122B] border border-[#A875FF]/25 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Character2DAvatar
                              characterClass={m.characterClass}
                              appearance={m.appearance}
                              size="sm"
                              presenceStatus={getPlayerPresence(m.userId).status}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#F7F4FF] truncate">{m.username}</p>
                              <p className="text-[11px] text-[#BEB4D6] capitalize">
                                Lv.{m.level} · {m.connectionStatus}
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs tabular-nums shrink-0">
                            <span className="text-[#65A9FF] font-bold">
                              {m.progressValue} {party.targetUnit}
                            </span>
                            {m.completed && (
                              <span className="block text-[10px] text-[#35D69A]">Goal Met</span>
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
                          className="flex-1 rounded-xl bg-[#100D1C] border border-[#A875FF]/35 px-3 py-1.5 text-xs text-[#F7F4FF]"
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
                          className="px-3 py-1.5 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#A875FF]/40 hover:border-[#65A9FF]/50 text-xs font-semibold text-[#F7F4FF] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[#65A9FF]" />
                          Invite
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Verified Workout Submission & Party Chat */}
                  <div className="space-y-3">
                    <div className="rounded-xl bg-[#19122B] border border-[#A875FF]/25 p-3.5 space-y-2.5">
                      <h4 className="text-xs font-semibold text-[#F7F4FF] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#35D69A]" />
                        Submit Verified Workout Session
                      </h4>
                      {fitnessSessions.length === 0 ? (
                        <p className="text-xs text-[#BEB4D6]">
                          Complete a workout in Fitness Log to submit verified progress here.
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedSessionId}
                            onChange={e => setSelectedSessionId(e.target.value)}
                            className="flex-1 rounded-lg bg-[#100D1C] border border-[#A875FF]/35 px-2.5 py-1.5 text-xs text-[#F7F4FF]"
                          >
                            {fitnessSessions.slice(0, 8).map(s => (
                              <option key={s.id} value={s.id}>
                                {s.exerciseName} · {s.durationMinutes}m
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === `submit-${party.id}`}
                            onClick={() => void handleLogVerifiedProgress(party.id)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6638B8] to-[#65A9FF] hover:from-[#7849cc] hover:to-[#7bb6ff] text-[#F7F4FF] text-xs font-bold whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(101,169,255,0.28)] cursor-pointer"
                          >
                            Submit Verified
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-[#19122B] border border-[#A875FF]/25 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#BEB4D6]">Party Chat</span>
                        <div className="flex gap-1">
                          {['🔥', '💪', '⚔️'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void sendWorkoutPartyMessage(party.id, emoji, 'reaction')}
                              className="px-2 py-0.5 rounded bg-[#100D1C] hover:bg-[#2F1B4E] border border-[#A875FF]/25 text-xs cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {party.messages.slice(-8).map(msg => (
                          <div key={msg.id}>
                            <span className="font-semibold text-[#65A9FF]">{msg.senderUsername}: </span>
                            <span className="text-[#BEB4D6]">{msg.content}</span>
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
                          className="flex-1 rounded-lg bg-[#100D1C] border border-[#A875FF]/35 px-2.5 py-1.5 text-xs text-[#F7F4FF] placeholder-[#BEB4D6]/50 focus:outline-none focus:border-[#65A9FF]"
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
                          className="px-3 py-1.5 rounded-lg bg-[#100D1C] hover:bg-[#2F1B4E] border border-[#A875FF]/40 text-[#65A9FF] text-xs font-semibold cursor-pointer"
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
        <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#A875FF]/30 p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-2">
            <History className="w-4 h-4 text-[#65A9FF]" />
            Completed Workout Party Archive
          </h3>
          <div className="divide-y divide-[#A875FF]/20 text-xs">
            {workoutPartyHistory.slice(0, 8).map(h => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-2 tabular-nums">
                <span className="text-[#F7F4FF] font-semibold">{h.challengeName}</span>
                <span className="text-[#BEB4D6] font-mono">
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
