import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  Sparkles,
  Flame,
  Shield,
  Eye,
  CheckCircle2,
  Info,
  Zap,
} from 'lucide-react';

export const BuffsView: React.FC = () => {
  const { buffs, activateBuff, setActiveTab } = useGame();

  const getBuffIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return Flame;
      case 'Shield': return Shield;
      case 'Eye': return Eye;
      default: return Sparkles;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1f1035] via-[#120a22] to-[#24133f] border border-purple-900/60 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-700/50 px-2.5 py-0.5 rounded">
                Arcane Synergy
              </span>
              <span className="text-xs text-purple-300 font-semibold">Habit-Powered Abilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              ACTIVE RPG BUFFS & BLESSINGS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Real-world physical workouts, restful recovery, hydration, and discipline manifest as temporary RPG combat enhancements in Aetheria.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('boss-battles')}
            className="px-5 py-2.5 rounded-xl font-bold font-['Cinzel'] text-xs tracking-wider bg-gradient-to-r from-rose-700 to-purple-700 hover:from-rose-600 hover:to-purple-600 text-white shadow-lg transition-all"
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
                  ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-400 shadow-xl'
                  : 'bg-[#0e0a1b] border-purple-950/80 hover:border-purple-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-900/70 text-purple-300 flex items-center justify-center border border-purple-600/50">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-['Cinzel'] font-bold text-base text-white">{buff.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-purple-300">
                        {buff.rarity} Blessings
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                      buff.active
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {buff.active ? 'ACTIVE' : 'READY'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {buff.description}
                </p>

                <div className="bg-[#130f24] p-3 rounded-xl border border-purple-950 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Combat Effect:</span>
                    <span className="font-mono font-bold text-amber-300">
                      +{buff.effectValue}% {buff.effectType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unlock Condition:</span>
                    <span className="text-purple-300">{buff.unlockRequirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-mono text-slate-300">{buff.usesRemaining} Battle Uses Remaining</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => activateBuff(buff.id)}
                className={`w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider transition-colors ${
                  buff.active
                    ? 'bg-purple-900 text-purple-200 border border-purple-600 hover:bg-purple-800'
                    : 'bg-[#15102a] border border-purple-800 text-slate-300 hover:text-white hover:bg-purple-900/50'
                }`}
              >
                {buff.active ? 'DEACTIVATE BUFF' : 'ACTIVATE FOR COMBAT'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/60 text-xs text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <span>
          Buffs represent fictional RPG game mechanics to reward consistency. Recovery and rest habits award Guardian’s Recovery (+10% DEF), ensuring balanced health without encouraging excessive workouts.
        </span>
      </div>
    </div>
  );
};
