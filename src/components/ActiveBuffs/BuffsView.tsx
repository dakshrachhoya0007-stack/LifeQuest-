import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Sparkles,
  Flame,
  Shield,
  Eye,
  Info,
} from 'lucide-react';

export const BuffsView: React.FC = () => {
  const { buffs, activateBuff, setActiveTab } = useGame();

  const getBuffIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return Flame;
      case 'Shield':
        return Shield;
      case 'Eye':
        return Eye;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#36111F] via-[#24143D] to-[#19122B] border border-[#F05B70]/40 p-6 shadow-[0_12px_32px_rgba(16,13,28,0.65)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFAA45]">
                Arcane Synergy
              </span>
              <span className="text-[#BEB4D6]/40" aria-hidden="true">·</span>
              <span className="text-[#BEB4D6] font-semibold">Habit-Powered Abilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F7F4FF]">
              ACTIVE RPG BUFFS &amp; BLESSINGS
            </h1>
            <p className="text-xs sm:text-sm text-[#BEB4D6] max-w-2xl mt-1">
              Real-world physical workouts, restful recovery, hydration, and discipline manifest as temporary RPG combat enhancements in Aetheria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('boss-battles')}
            className="px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#ff6b80] hover:to-[#FFD978] text-[#100D1C] shadow-[0_0_16px_rgba(240,91,112,0.35)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Deploy in Boss Battle
          </button>
        </div>
      </div>

      {/* Buffs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buffs.map(buff => {
          const Icon = getBuffIcon(buff.iconName);

          return (
            <div
              key={buff.id}
              className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                buff.active
                  ? 'bg-[#24143D] border-[#FFAA45]/70 ring-1 ring-[#FFAA45]/35 shadow-[0_12px_32px_rgba(16,13,28,0.65)]'
                  : 'bg-[#24143D]/85 border-[#6638B8]/35 hover:border-[#F05B70]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#19122B] text-[#FFAA45] flex items-center justify-center border border-[#F05B70]/40">
                      <Icon className="w-5 h-5 text-[#FFAA45]" />
                    </div>
                    <div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">{buff.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-[#A875FF]">
                        {buff.rarity} Blessings
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold uppercase ${
                      buff.active ? 'text-[#35D69A]' : 'text-[#BEB4D6]/70'
                    }`}
                  >
                    {buff.active ? 'Active' : 'Ready'}
                  </span>
                </div>

                <p className="text-xs text-[#BEB4D6] leading-relaxed mb-4">
                  {buff.description}
                </p>

                <div className="bg-[#19122B] p-3 rounded-xl border border-[#6638B8]/30 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#BEB4D6]">Combat Effect:</span>
                    <span className="font-mono font-bold text-[#FFD978] tabular-nums">
                      +{buff.effectValue}% {buff.effectType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#BEB4D6]">Unlock Condition:</span>
                    <span className="text-[#FFAA45]">{buff.unlockRequirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#BEB4D6]">Duration:</span>
                    <span className="font-mono text-[#F7F4FF] tabular-nums">{buff.usesRemaining} Battle Uses Remaining</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => activateBuff(buff.id)}
                className={`w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider transition-all cursor-pointer ${
                  buff.active
                    ? 'bg-[#35D69A]/15 text-[#35D69A] border border-[#35D69A]/50 hover:bg-[#35D69A]/25'
                    : 'bg-gradient-to-r from-[#F05B70] to-[#FFAA45] hover:from-[#ff6b80] hover:to-[#FFD978] text-[#100D1C] shadow-[0_0_14px_rgba(240,91,112,0.3)]'
                }`}
              >
                {buff.active ? 'DEACTIVATE BUFF' : 'ACTIVATE FOR COMBAT'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/35 text-xs text-[#BEB4D6] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#FFAA45] shrink-0 mt-0.5" />
        <span>
          Buffs represent fictional RPG game mechanics to reward consistency. Recovery and rest habits award Guardian&rsquo;s Recovery (+10% DEF), ensuring balanced health without encouraging excessive workouts.
        </span>
      </div>
    </div>
  );
};
