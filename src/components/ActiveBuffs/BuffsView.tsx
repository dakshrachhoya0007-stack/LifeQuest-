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
      <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#1677FF]/30 p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#00D9FF]">
                Arcane Synergy
              </span>
              <span className="text-[#A9B8CC]/40" aria-hidden="true">·</span>
              <span className="text-[#A9B8CC] font-semibold">Habit-Powered Abilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              ACTIVE RPG BUFFS &amp; BLESSINGS
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl mt-1">
              Real-world physical workouts, restful recovery, hydration, and discipline manifest as temporary RPG combat enhancements in Aetheria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('boss-battles')}
            className="px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] transition-all whitespace-nowrap shrink-0"
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
                  ? 'bg-[#102440] border-[#00D9FF]/65 ring-1 ring-[#00D9FF]/30 shadow-[0_12px_32px_rgba(2,8,20,0.6)]'
                  : 'bg-[#102440]/85 border-[#1677FF]/25 hover:border-[#00D9FF]/45'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0A1930] text-[#00D9FF] flex items-center justify-center border border-[#1677FF]/40">
                      <Icon className="w-5 h-5 text-[#00D9FF]" />
                    </div>
                    <div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-white">{buff.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-[#00D9FF]">
                        {buff.rarity} Blessings
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold uppercase ${
                      buff.active ? 'text-emerald-300' : 'text-[#A9B8CC]/70'
                    }`}
                  >
                    {buff.active ? 'Active' : 'Ready'}
                  </span>
                </div>

                <p className="text-xs text-[#A9B8CC] leading-relaxed mb-4">
                  {buff.description}
                </p>

                <div className="bg-[#0A1930] p-3 rounded-xl border border-[#1677FF]/25 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#A9B8CC]">Combat Effect:</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      +{buff.effectValue}% {buff.effectType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A9B8CC]">Unlock Condition:</span>
                    <span className="text-[#00D9FF]">{buff.unlockRequirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A9B8CC]">Duration:</span>
                    <span className="font-mono text-white tabular-nums">{buff.usesRemaining} Battle Uses Remaining</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => activateBuff(buff.id)}
                className={`w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider transition-all ${
                  buff.active
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/50'
                    : 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_14px_rgba(22,119,255,0.3)]'
                }`}
              >
                {buff.active ? 'DEACTIVATE BUFF' : 'ACTIVATE FOR COMBAT'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/25 text-xs text-[#A9B8CC] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
        <span>
          Buffs represent fictional RPG game mechanics to reward consistency. Recovery and rest habits award Guardian&rsquo;s Recovery (+10% DEF), ensuring balanced health without encouraging excessive workouts.
        </span>
      </div>
    </div>
  );
};
