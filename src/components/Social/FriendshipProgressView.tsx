import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  COOP_FRIENDSHIP_MISSIONS,
  FRIENDSHIP_LEVEL_THRESHOLDS,
} from '../../data/aaaGamingData';
import { getRpgAvatarForClass } from '../../assets/images';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { Award, History, ShieldCheck, Users } from 'lucide-react';

export const FriendshipProgressView: React.FC = () => {
  const {
    friendshipLevels,
    refreshFriendshipsExtended,
    claimFriendshipCoopMission,
    openPublicProfile,
    getPlayerPresence,
  } = useGame();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshFriendshipsExtended();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3200);
  };

  const handleClaimCoopMission = async (friendId: string, missionId: string) => {
    const key = `${friendId}-${missionId}`;
    setBusyKey(key);
    const res = await claimFriendshipCoopMission(friendId, missionId);
    setBusyKey(null);
    if (res.success) flash('success', 'Cooperative Friendship Mission claimed!');
    else flash('error', res.error || 'Complete more verified cooperative sessions first.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 p-5 sm:p-6 space-y-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#34D399] font-semibold">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Verified Cooperative Progression Only · Zero Chat/Like Spam &amp; Zero Competitive Rating Impact
        </div>
        <h2 className="font-['Cinzel'] font-black text-xl text-white">
          MUTUAL FRIENDSHIP LEVELS
        </h2>
        <p className="text-xs text-[#A1A1B8] max-w-3xl">
          Build Mutual Friendship Levels (1–6) exclusively through Workout Parties, Shared Friendly Rivalries, and Cooperative Missions. Titles like Oathbound Ally (Lv.3) and Kindred Vanguard (Lv.5) unlock automatically.
        </p>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]'
              : 'bg-[#FB7185]/10 border-[#FB7185]/35 text-[#FB7185]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {friendshipLevels.length === 0 ? (
        <div className="rounded-2xl bg-[#141420]/95 border border-white/10 p-10 text-center space-y-2">
          <Users className="w-7 h-7 text-[#8B5CF6] mx-auto" />
          <p className="font-['Cinzel'] font-bold text-sm text-white">No Mutual Companion Progress Yet</p>
          <p className="text-xs text-[#A1A1B8]">
            Add friends and complete a Workout Party or Rivals duel together to start leveling up your mutual bond.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {friendshipLevels.map(record => {
            const tierMeta =
              FRIENDSHIP_LEVEL_THRESHOLDS.find(t => t.level === record.friendshipLevel) ||
              FRIENDSHIP_LEVEL_THRESHOLDS[0];
            const pct = Math.min(
              100,
              Math.round((record.friendshipXp / Math.max(1, record.nextLevelXp)) * 100)
            );
            const presence = getPlayerPresence(record.friendId).status;

            return (
              <div
                key={record.pairKey}
                className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-white/10 hover:border-[#8B5CF6]/45 p-5 space-y-5 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={getRpgAvatarForClass(record.friendClass)}
                        alt={record.friendUsername}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover object-top border border-[#D6A84B]/55"
                      />
                      <PresenceBadge
                        status={presence}
                        size="xs"
                        className="absolute -bottom-0.5 -right-0.5"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => openPublicProfile(record.friendId)}
                        className="font-['Cinzel'] font-bold text-base text-white hover:text-[#D6A84B] cursor-pointer transition-colors"
                      >
                        {record.friendUsername}
                      </button>
                      <p className="text-xs text-[#D6A84B] font-semibold">
                        Level {record.friendshipLevel} · {tierMeta.title}
                      </p>
                      <p className="text-[11px] text-[#A1A1B8] tabular-nums">
                        {record.totalCoopActivities} Verified Shared Sessions · Unlocks: {tierMeta.rewardLabel}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[220px] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-[#A1A1B8]">Friendship XP</span>
                      <span className="text-[#D6A84B] font-bold">
                        {record.friendshipXp} / {record.nextLevelXp}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#090910] border border-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#D6A84B]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Coop Missions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {COOP_FRIENDSHIP_MISSIONS.map(m => {
                    const claimed = record.completedMissionIds.includes(m.id);
                    const eligible = record.totalCoopActivities >= m.targetActivities && !claimed;
                    const busy = busyKey === `${record.friendId}-${m.id}`;

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl bg-[#0E0E17] border border-white/10 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#D6A84B]">
                            <span className="font-semibold flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              +{m.friendshipXpReward} Bond XP
                            </span>
                            <span className="font-mono tabular-nums text-[#A1A1B8]">
                              {Math.min(record.totalCoopActivities, m.targetActivities)}/{m.targetActivities}
                            </span>
                          </div>
                          <h4 className="font-['Cinzel'] font-bold text-xs text-white mt-1">{m.title}</h4>
                          <p className="text-[11px] text-[#A1A1B8] mt-1">{m.description}</p>
                        </div>

                        <button
                          type="button"
                          disabled={!eligible || busy}
                          onClick={() => void handleClaimCoopMission(record.friendId, m.id)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                            claimed
                              ? 'bg-[#34D399]/10 border border-[#34D399]/40 text-[#34D399]'
                              : eligible
                              ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BFA] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] cursor-pointer'
                              : 'bg-[#090910] border border-white/10 text-[#A1A1B8]/50'
                          }`}
                        >
                          {claimed ? 'Completed' : eligible ? 'Claim Bond XP' : 'In Progress'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bond History */}
                {record.recentHistory.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#A1A1B8] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      Recent Cooperative History
                    </p>
                    <div className="space-y-1 text-xs">
                      {record.recentHistory.slice(0, 4).map(h => (
                        <div key={h.id} className="flex items-center justify-between tabular-nums">
                          <span className="text-[#A1A1B8]">{h.label}</span>
                          <span className="font-mono text-[#34D399]">+{h.xpAwarded} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
