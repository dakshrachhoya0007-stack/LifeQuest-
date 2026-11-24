import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Award,
  Scroll,
  Flame,
  Dumbbell,
  Camera,
  Compass,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const AchievementsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { achievements, claimAchievement } = useGame();

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scroll': return Scroll;
      case 'Flame': return Flame;
      case 'Dumbbell':
      case 'Hammer':
      case 'Swords':
        return Dumbbell;
      case 'Camera': return Camera;
      case 'Compass': return Compass;
      case 'Users': return Users;
      default: return Award;
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const claimedCount = achievements.filter(a => a.claimed).length;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner / Progress Toolbar */}
      {embedded ? (
        <div
          data-tutorial-id="achievements-rewards"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141420]/90 backdrop-blur-md border border-[#8B5CF6]/30 shadow-[0_12px_32px_rgba(9,9,16,0.65)] rounded-2xl p-4"
        >
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white">
              Achievements &amp; Milestones
            </h2>
            <p className="text-xs text-[#A1A1B8] mt-0.5">
              Conquer heroic milestones across habits, training, and exploration to earn trophy bounties.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-[#A1A1B8] block">Unlocked</span>
              <span className="font-mono font-bold text-[#FBBF24]">{unlockedCount} / {achievements.length}</span>
            </div>
            <div className="w-px h-7 bg-[#8B5CF6]/30" />
            <div className="text-right">
              <span className="text-[11px] text-[#A1A1B8] block">Claimed</span>
              <span className="font-mono font-bold text-[#34D399]">{claimedCount} / {achievements.length}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          data-tutorial-id="achievements-rewards"
          className="rounded-2xl bg-gradient-to-r from-[#0E0E17] via-[#141420] to-[#0E0E17] border border-[#D6A84B]/30 p-6 shadow-[0_12px_32px_rgba(9,9,16,0.65)] backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#D6A84B] bg-[#0E0E17] border border-[#D6A84B]/40 px-2.5 py-0.5 rounded">
                  Heroic Pantheon
                </span>
                <span className="text-xs text-[#A1A1B8] font-semibold">{unlockedCount} of {achievements.length} Unlocked</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                ACHIEVEMENTS & REWARDS
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl mt-1">
                Earn permanent badges of distinction and substantial Player XP by conquering healthy milestones across real life and the realm.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(ach => {
          const Icon = getAchievementIcon(ach.icon);
          const isUnlocked = ach.unlocked;
          const isClaimed = ach.claimed;

          return (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isClaimed
                  ? 'bg-[#0E0E17]/75 border-[#34D399]/25 text-[#A1A1B8]'
                  : isUnlocked
                  ? 'bg-[#141420] border-[#D6A84B]/60 shadow-[0_0_20px_rgba(214,168,75,0.14)]'
                  : 'bg-[#141420]/85 border-[#8B5CF6]/25 hover:border-[#D6A84B]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      isUnlocked
                        ? 'bg-[#0E0E17] border-[#D6A84B]/50 text-[#D6A84B] shadow-[0_0_12px_rgba(214,168,75,0.2)]'
                        : 'bg-[#090910] border-[#8B5CF6]/25 text-[#A1A1B8]/60'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isClaimed
                        ? 'bg-[#34D399]/15 border-[#34D399]/40 text-[#34D399]'
                        : isUnlocked
                        ? 'bg-[#D6A84B]/15 border-[#D6A84B]/50 text-[#D6A84B]'
                        : 'bg-[#090910] border-[#8B5CF6]/25 text-[#A1A1B8]/70'
                    }`}
                  >
                    {isClaimed ? 'CLAIMED' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>

                <h3 className="font-['Cinzel'] font-bold text-base text-white mb-1">{ach.name}</h3>
                <p className="text-xs text-[#A1A1B8] leading-relaxed mb-4">{ach.description}</p>
              </div>

              <div className="pt-3 border-t border-[#8B5CF6]/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#FBBF24] font-semibold">+{ach.rewardPlayerXp} Player XP</span>
                  <span className="text-[#A1A1B8] font-semibold">
                    {ach.progress} / {ach.maxProgress}
                  </span>
                </div>

                {isUnlocked && !isClaimed ? (
                  <button
                    onClick={() => claimAchievement(ach.id)}
                    className="w-full py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] hover:brightness-110 text-[#090910] shadow-[0_0_18px_rgba(214,168,75,0.35)] transition-all"
                  >
                    CLAIM TROPHY BOUNTY
                  </button>
                ) : isClaimed ? (
                  <div className="text-center py-1.5 text-xs font-semibold text-[#34D399] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Bounty Claimed
                  </div>
                ) : (
                  <div className="w-full bg-[#090910] h-2 rounded-full overflow-hidden border border-[#8B5CF6]/20">
                    <div
                      className="bg-gradient-to-r from-[#8B5CF6] to-[#FBBF24] h-full transition-all"
                      style={{ width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
