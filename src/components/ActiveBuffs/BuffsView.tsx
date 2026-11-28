import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Sparkles,
  Flame,
  Shield,
  Eye,
  Info,
} from 'lucide-react';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import { RpgStaggerGrid, RpgStaggerItem } from '../Motion/RpgMotionPrimitives';

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
    <div className="space-y-6 pb-12 max-w-[1360px] mx-auto">
      {/* Banner */}
      <FeatureBanner themeId="boss-battles">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5]">
                Arcane Synergy
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] font-semibold">Habit-Powered Abilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
              Active RPG Buffs &amp; Blessings
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
              Real-world physical workouts, restful recovery, hydration, and discipline manifest as temporary RPG combat enhancements in Aetheria.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('boss-battles')}
            className="lq-btn lq-btn-gold px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider whitespace-nowrap shrink-0 cursor-pointer"
          >
            Deploy in Boss Battle
          </button>
        </div>
      </FeatureBanner>

      {/* Buffs Cards */}
      <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buffs.map(buff => {
          const Icon = getBuffIcon(buff.iconName);

          return (
            <RpgStaggerItem key={buff.id}>
              <div
                className={`p-6 rounded-2xl h-full flex flex-col justify-between ${
                  buff.active ? 'lq-card-gold' : 'lq-card lq-card-interactive'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#061225] text-[#38D9F5] flex items-center justify-center border border-[#1E3A63]">
                        <Icon className="w-5 h-5 text-[#38D9F5]" />
                      </div>
                      <div>
                        <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">{buff.name}</h3>
                        <span className="text-[10px] uppercase font-bold text-[#38D9F5]">
                          {buff.rarity} Blessings
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold uppercase ${
                        buff.active ? 'text-[#10B981]' : 'text-[#647A9E]'
                      }`}
                    >
                      {buff.active ? 'Active' : 'Ready'}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A8C7] leading-relaxed mb-4">
                    {buff.description}
                  </p>

                  <div className="lq-surface p-3 rounded-xl space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between">
                      <span className="text-[#94A8C7]">Combat Effect:</span>
                      <span className="font-mono font-bold text-[#38D9F5] tabular-nums">
                        +{buff.effectValue}% {buff.effectType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A8C7]">Unlock Condition:</span>
                      <span className="text-[#38D9F5]">{buff.unlockRequirement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A8C7]">Duration:</span>
                      <span className="font-mono text-[#F2F7FF] tabular-nums">{buff.usesRemaining} Battle Uses Remaining</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => activateBuff(buff.id)}
                  className={`lq-btn w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider cursor-pointer ${
                    buff.active
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/45 hover:bg-[#10B981]/25'
                      : 'lq-btn-gold'
                  }`}
                >
                  {buff.active ? 'DEACTIVATE BUFF' : 'ACTIVATE FOR COMBAT'}
                </button>
              </div>
            </RpgStaggerItem>
          );
        })}
      </RpgStaggerGrid>

      <div className="lq-surface p-4 rounded-xl text-xs text-[#94A8C7] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#38D9F5] shrink-0 mt-0.5" />
        <span>
          Buffs represent fictional RPG game mechanics to reward consistency. Recovery and rest habits award Guardian&rsquo;s Recovery (+10% DEF), ensuring balanced health without encouraging excessive workouts.
        </span>
      </div>
    </div>
  );
};
