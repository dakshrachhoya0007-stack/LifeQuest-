import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Award,
  Scroll,
  Flame,
  Hammer,
  Swords,
  Camera,
  Compass,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const AchievementsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { achievements, claimAchievement } = useGame();

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scroll': return Scroll;
      case 'Flame': return Flame;
      case 'Hammer': return Hammer;
      case 'Swords': return Swords;
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
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e0a1b] border border-purple-950/90 rounded-2xl p-4"
        >
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-white">
              Achievements &amp; Milestones
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Conquer heroic milestones across habits, training, and exploration to earn trophy bounties.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Unlocked</span>
              <span className="font-mono font-bold text-amber-300">{unlockedCount} / {achievements.length}</span>
            </div>
            <div className="w-px h-7 bg-purple-900/60" />
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Claimed</span>
              <span className="font-mono font-bold text-emerald-300">{claimedCount} / {achievements.length}</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          data-tutorial-id="achievements-rewards"
          className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-700/50 px-2.5 py-0.5 rounded">
                  Heroic Pantheon
                </span>
                <span className="text-xs text-purple-300 font-semibold">{unlockedCount} of {achievements.length} Unlocked</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
                ACHIEVEMENTS & REWARDS
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
                Earn permanent badges of distinction and substantial Player XP and Forge XP by conquering healthy milestones across real life and the realm.
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
                  ? 'bg-[#0a0814]/70 border-purple-950 text-slate-400'
                  : isUnlocked
                  ? 'bg-purple-950/40 border-amber-500/70 shadow-lg shadow-purple-950/60'
                  : 'bg-[#0e0a1b] border-purple-950/70 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      isUnlocked
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-purple-950/40 border-purple-900 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isClaimed
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : isUnlocked
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isClaimed ? 'CLAIMED' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>

                <h3 className="font-['Cinzel'] font-bold text-base text-white mb-1">{ach.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{ach.description}</p>
              </div>

              <div className="pt-3 border-t border-purple-950/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-300 font-semibold">+{ach.rewardPlayerXp} Player XP</span>
                  <span className="text-amber-400 font-semibold">+{ach.rewardForgeXp} Forge XP</span>
                </div>

                {isUnlocked && !isClaimed ? (
                  <button
                    onClick={() => claimAchievement(ach.id)}
                    className="w-full py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow transition-all"
                  >
                    CLAIM TROPHY BOUNTY
                  </button>
                ) : isClaimed ? (
                  <div className="text-center py-1.5 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Bounty Claimed
                  </div>
                ) : (
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all"
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
