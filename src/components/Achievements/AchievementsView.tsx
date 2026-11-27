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
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#D6A84B]/35 shadow-[0_14px_34px_-14px_rgba(5,3,10,0.85)] rounded-2xl ${
          embedded
            ? 'bg-[#171220] p-4 sm:p-5'
            : 'bg-gradient-to-r from-[#171220] via-[#21152F] to-[#171220] p-6'
        }`}
      >
        <div>
          <span className="font-['Cinzel'] font-bold text-[11px] uppercase tracking-widest text-[#E8C777] block mb-1">
            Heroic Milestones
          </span>
          <h2 className={`${embedded ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-black font-['Cinzel'] text-[#F2EDF7]`}>
            ACHIEVEMENTS &amp; REWARDS
          </h2>
          <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
            Conquer permanent milestones across habits, training, and exploration to earn trophy XP bounties.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-[#A69AAF] block">Unlocked</span>
            <span className="font-mono font-bold text-[#E8C777]">
              <AnimatedCounter value={unlockedCount} /> / {achievements.length}
            </span>
          </div>
          <div className="w-px h-7 bg-[#362B45]" />
          <div className="text-right">
            <span className="text-[11px] text-[#A69AAF] block">Claimed</span>
            <span className="font-mono font-bold text-[#49B88A]">
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
                    ? 'bg-[#171220]/80 border-[#362B45] text-[#A69AAF]'
                    : isUnlocked
                    ? 'bg-[#21152F] border-[#D6A84B]/70 shadow-[0_0_24px_rgba(214,168,75,0.2)]'
                    : 'bg-[#171220] border-[#362B45] hover:border-[#7045A0]/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        isUnlocked
                          ? 'bg-[#100D18] border-[#D6A84B]/60 text-[#E8C777] shadow-[0_0_14px_rgba(214,168,75,0.22)]'
                          : 'bg-[#100D18] border-[#362B45] text-[#766D82]'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isClaimed
                          ? 'text-[#49B88A]'
                          : isUnlocked
                          ? 'text-[#E8C777]'
                          : 'text-[#766D82]'
                      }`}
                    >
                      {isClaimed ? 'Claimed' : isUnlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>

                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] mb-1">{ach.name}</h3>
                  <p className="text-xs text-[#A69AAF] leading-relaxed mb-4">{ach.description}</p>
                </div>

                <div className="pt-3 border-t border-[#362B45] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-[#E8C777] font-semibold">+{ach.rewardPlayerXp} Player XP</span>
                    <span className="text-[#A69AAF] font-semibold">
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
                    <div className="text-center py-1.5 text-xs font-semibold text-[#49B88A] flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Bounty Claimed
                    </div>
                  ) : (
                    <AnimatedProgressBar
                      percentage={pct}
                      className="w-full bg-[#100D18] h-2 rounded-full overflow-hidden border border-[#362B45]"
                      barClassName="bg-gradient-to-r from-[#7045A0] via-[#9A72CC] to-[#D6A84B]"
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
