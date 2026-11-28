import React, { useState } from 'react';
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
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';

export const AchievementsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { achievements, claimAchievement } = useGame();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scroll':
        return Scroll;
      case 'Flame':
        return Flame;
      case 'Dumbbell':
      case 'Hammer':
      case 'Swords':
        return Dumbbell;
      case 'Camera':
        return Camera;
      case 'Compass':
        return Compass;
      case 'Users':
        return Users;
      default:
        return Award;
    }
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await claimAchievement(id);
    } finally {
      setClaimingId(null);
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const claimedCount = achievements.filter(a => a.claimed).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Banner / Progress Toolbar */}
      <div
        data-tutorial-id="achievements-rewards"
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#00D9FF]/35 shadow-[0_14px_34px_-14px_rgba(3,10,24,0.85)] rounded-2xl ${
          embedded
            ? 'bg-[#0A1930] p-4 sm:p-5'
            : 'bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] p-6'
        }`}
      >
        <div>
          <span className="font-['Cinzel'] font-bold text-[11px] uppercase tracking-widest text-[#38D9F5] block mb-1">
            Heroic Milestones
          </span>
          <h2 className={`${embedded ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-black font-['Cinzel'] text-[#F2F7FF]`}>
            ACHIEVEMENTS &amp; REWARDS
          </h2>
          <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
            Conquer permanent milestones across habits, training, and exploration to earn trophy XP bounties.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-[#94A8C7] block">Unlocked</span>
            <span className="font-mono font-bold text-[#FBBF24]">
              <AnimatedCounter value={unlockedCount} /> / {achievements.length}
            </span>
          </div>
          <div className="w-px h-7 bg-[#1E3A63]" />
          <div className="text-right">
            <span className="text-[11px] text-[#94A8C7] block">Claimed</span>
            <span className="font-mono font-bold text-[#10B981]">
              <AnimatedCounter value={claimedCount} /> / {achievements.length}
            </span>
          </div>
        </div>
      </div>

      {/* Achievement Cards Grid */}
      <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(ach => {
          const Icon = getAchievementIcon(ach.icon);
          const isUnlocked = ach.unlocked;
          const isClaimed = ach.claimed;
          const pct = Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100));

          return (
            <RpgStaggerItem key={ach.id}>
              <div
                className={`h-full p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isClaimed
                    ? 'bg-[#0A1930]/80 border-[#1E3A63] text-[#94A8C7]'
                    : isUnlocked
                    ? 'bg-[#102440] border-[#F59E0B]/70 shadow-[0_0_24px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0A1930] border-[#1E3A63] hover:border-[#1677FF]/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        isUnlocked
                          ? 'bg-[#061225] border-[#F59E0B]/60 text-[#FBBF24] shadow-[0_0_14px_rgba(245,158,11,0.22)]'
                          : 'bg-[#061225] border-[#1E3A63] text-[#647A9E]'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isClaimed
                          ? 'text-[#10B981]'
                          : isUnlocked
                          ? 'text-[#FBBF24]'
                          : 'text-[#647A9E]'
                      }`}
                    >
                      {isClaimed ? 'Claimed' : isUnlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>

                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] mb-1">{ach.name}</h3>
                  <p className="text-xs text-[#94A8C7] leading-relaxed mb-4">{ach.description}</p>
                </div>

                <div className="pt-3 border-t border-[#1E3A63] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-[#38D9F5] font-semibold">+{ach.rewardPlayerXp} Player XP</span>
                    <span className="text-[#94A8C7] font-semibold">
                      {ach.progress} / {ach.maxProgress}
                    </span>
                  </div>

                  {isUnlocked && !isClaimed ? (
                    <button
                      type="button"
                      disabled={claimingId === ach.id}
                      onClick={() => handleClaim(ach.id)}
                      className="lq-btn lq-btn-gold w-full py-2.5 font-['Cinzel'] font-bold text-xs tracking-wider"
                    >
                      {claimingId === ach.id ? 'CLAIMING...' : 'CLAIM TROPHY BOUNTY'}
                    </button>
                  ) : isClaimed ? (
                    <div className="text-center py-1.5 text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Bounty Claimed
                    </div>
                  ) : (
                    <AnimatedProgressBar
                      percentage={pct}
                      className="w-full bg-[#061225] h-2 rounded-full overflow-hidden border border-[#1E3A63]"
                      barClassName="bg-gradient-to-r from-[#1677FF] via-[#00D9FF] to-[#38D9F5]"
                    />
                  )}
                </div>
              </div>
            </RpgStaggerItem>
          );
        })}
      </RpgStaggerGrid>
    </div>
  );
};
