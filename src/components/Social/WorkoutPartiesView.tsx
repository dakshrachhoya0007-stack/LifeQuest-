import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { WORKOUT_PARTY_TEMPLATES } from '../../data/expansionData';
import { Character2DAvatar } from '../Character/Character2DAvatar';
import { AnimatedProgressBar } from '../Motion/RpgMotionPrimitives';
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Create Party */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-7 lq-surface rounded-2xl p-5 space-y-4"
        >
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00D9FF]" />
              Host Real-Time Workout Party
            </h2>
            <p className="text-xs text-[#94A8C7] mt-0.5">
              Train alongside companions in real time. Verified completions automatically award mutual Friendship XP.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#94A8C7] mb-1">Challenge Preset</label>
              <select
                value={challengeId}
                onChange={e => setChallengeId(e.target.value)}
                className="lq-input py-2 px-3 text-xs w-full"
              >
                {WORKOUT_PARTY_TEMPLATES.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.targetValue} {tpl.targetUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A8C7] mb-1">Room Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as 'friends' | 'private' | 'public')}
                className="lq-input py-2 px-3 text-xs w-full"
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
              className="lq-input flex-1 py-2 px-3 text-xs"
            />
            <button
              type="submit"
              disabled={busyId === 'create-party'}
              className="lq-btn lq-btn-primary py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Party
            </button>
          </div>
        </form>

        {/* Join via Room Code */}
        <form
          onSubmit={handleJoinCode}
          className="lg:col-span-5 lq-surface rounded-2xl p-5 flex flex-col justify-between gap-4"
        >
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">Join by Room Code</h3>
            <p className="text-xs text-[#94A8C7] mt-0.5">
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
              className="lq-input flex-1 py-2 px-3 text-xs font-mono uppercase"
            />
            <button
              type="submit"
              disabled={busyId === 'join-code'}
              className="lq-btn lq-btn-secondary py-2 px-4 rounded-xl text-xs text-[#38D9F5] whitespace-nowrap shrink-0 cursor-pointer"
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
              ? 'bg-[#10B981]/15 border-[#10B981]/45 text-[#10B981]'
              : 'bg-[#F43F5E]/15 border-[#F43F5E]/45 text-[#FB7185]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Parties */}
      <div className="space-y-4">
        {partiesLoading && workoutParties.length === 0 ? (
          <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
            Loading live workout parties...
          </div>
        ) : workoutParties.length === 0 ? (
          <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
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
                className="lq-card rounded-2xl p-5 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E3A63]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#38D9F5]">
                      <span className="font-mono font-bold">Room {party.roomCode}</span>
                      <span className="text-[#647A9E]" aria-hidden="true">·</span>
                      <span className="capitalize text-[#94A8C7]">{party.status}</span>
                      <span className="text-[#647A9E]" aria-hidden="true">·</span>
                      <span className="text-[#94A8C7]">Host: {party.hostUsername}</span>
                    </div>
                    <h3 className="font-['Cinzel'] font-bold text-lg text-[#F2F7FF] mt-0.5">
                      {party.title} — {party.challengeName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isHost && party.status === 'lobby' && (
                      <button
                        type="button"
                        onClick={() => void startWorkoutParty(party.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#10B981] hover:brightness-110 text-[#061225] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Session
                      </button>
                    )}
                    {party.status === 'completed' && !party.summarySaved && (
                      <button
                        type="button"
                        onClick={() => void saveWorkoutPartySummary(party.id)}
                        className="lq-btn lq-btn-primary py-1.5 px-3.5 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Save Summary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void leaveWorkoutParty(party.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#061225] hover:bg-[#F43F5E]/15 border border-[#1E3A63] hover:border-[#F43F5E]/50 text-xs text-[#94A8C7] hover:text-[#FB7185] flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave
                    </button>
                  </div>
                </div>

                {/* Combined Target Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#94A8C7]">Group Goal Progress</span>
                    <span className="font-mono font-bold text-[#00D9FF]">
                      {totalProgress} / {party.targetValue} {party.targetUnit} ({pct}%)
                    </span>
                  </div>
                  <AnimatedProgressBar
                    percentage={pct}
                    className="h-2.5 rounded-full bg-[#061225] border border-[#1E3A63] overflow-hidden"
                    barClassName="bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#10B981]"
                  />
                </div>

                {/* Party Members + Invite */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#1E3A63]/60">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#38D9F5]">
                      Party Roster ({party.members.length})
                    </h4>
                    <div className="divide-y divide-[#1E3A63]/60">
                      {party.members.map(m => (
                        <div
                          key={m.userId}
                          className="py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Character2DAvatar
                              characterClass={m.characterClass}
                              appearance={m.appearance}
                              size="sm"
                              presenceStatus={getPlayerPresence(m.userId).status}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#F2F7FF] truncate">{m.username}</p>
                              <p className="text-[11px] text-[#94A8C7] capitalize">
                                Lv.{m.level} · {m.connectionStatus}
                              </p>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs tabular-nums shrink-0">
                            <span className="text-[#38D9F5] font-bold">
                              {m.progressValue} {party.targetUnit}
                            </span>
                            {m.completed && (
                              <span className="block text-[10px] text-[#10B981]">Goal Met</span>
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
                          className="lq-input flex-1 py-1.5 px-3 text-xs"
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
                          className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[#00D9FF]" />
                          Invite
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Verified Workout Submission & Party Chat */}
                  <div className="space-y-4 md:border-l md:border-[#1E3A63]/60 md:pl-5">
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-[#F2F7FF] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        Submit Verified Workout Session
                      </h4>
                      {fitnessSessions.length === 0 ? (
                        <p className="text-xs text-[#94A8C7]">
                          Complete a workout in Fitness Log to submit verified progress here.
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedSessionId}
                            onChange={e => setSelectedSessionId(e.target.value)}
                            className="lq-input flex-1 py-1.5 px-2.5 text-xs"
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
                            className="lq-btn lq-btn-primary py-1.5 px-3 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Submit Verified
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#1E3A63]/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#94A8C7]">Party Chat</span>
                        <div className="flex gap-1">
                          {['🔥', '💪', '⚔️'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => void sendWorkoutPartyMessage(party.id, emoji, 'reaction')}
                              className="px-2 py-0.5 rounded bg-[#061225] hover:bg-[#1677FF]/30 border border-[#1E3A63] text-xs cursor-pointer transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-xs">
                        {party.messages.slice(-8).map(msg => (
                          <div key={msg.id}>
                            <span className="font-semibold text-[#38D9F5]">{msg.senderUsername}: </span>
                            <span className="text-[#94A8C7]">{msg.content}</span>
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
                          className="lq-input flex-1 py-1.5 px-2.5 text-xs"
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
                          className="lq-btn lq-btn-secondary py-1.5 px-3 rounded-lg text-[#00D9FF] text-xs cursor-pointer"
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
        <div className="lq-surface rounded-2xl p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
            <History className="w-4 h-4 text-[#00D9FF]" />
            Completed Workout Party Archive
          </h3>
          <div className="divide-y divide-[#1E3A63] text-xs">
            {workoutPartyHistory.slice(0, 8).map(h => (
              <div key={h.id} className="py-2 flex items-center justify-between gap-2 tabular-nums">
                <span className="text-[#F2F7FF] font-semibold">{h.challengeName}</span>
                <span className="text-[#94A8C7] font-mono">
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

