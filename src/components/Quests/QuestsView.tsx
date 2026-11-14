import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { QuestType } from '../../types/game';
import {
  Scroll,
  CheckCircle2,
  Clock,
  Sparkles,
  Hammer,
  History,
  Activity,
  Award,
} from 'lucide-react';

export const QuestsView: React.FC = () => {
  const { quests, claimQuest, transactions } = useGame();
  const [selectedType, setSelectedType] = useState<QuestType | 'all'>('all');

  const filteredQuests = quests.filter(q =>
    selectedType === 'all' ? true : q.type === selectedType
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div
        data-tutorial-id="quest-board"
        className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-purple-400 bg-purple-950/70 border border-purple-800/60 px-2.5 py-0.5 rounded">
                Realm Notice Board
              </span>
              <span className="text-xs text-purple-300 font-semibold">Habit & Fitness Bounties</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              QUEST BOARD & EXPEDITIONS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Fulfill daily habits and fitness challenges to earn Player XP for leveling up and Forge XP for Blacksmith weapon upgrades.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090714] rounded-xl border border-purple-950">
            {(['all', 'daily', 'weekly', 'special'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  selectedType === type
                    ? 'bg-purple-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuests.map(q => {
          const isCompleted = q.completed;
          const isClaimed = q.claimed;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isClaimed
                  ? 'bg-[#0a0814]/60 border-purple-950 text-slate-400'
                  : isCompleted
                  ? 'bg-purple-950/30 border-purple-600/70 ring-1 ring-purple-500/50 shadow-lg'
                  : 'bg-[#0f0c1c] border-purple-950/80 hover:border-purple-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    {q.type} Quest
                  </span>
                  {q.expiresIn && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {q.expiresIn}
                    </span>
                  )}
                </div>

                <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 mb-1">
                  {q.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {q.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-purple-950/70">
                {/* Rewards */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-300 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    +{q.playerXpReward} Player XP
                  </span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Hammer className="w-3.5 h-3.5 text-amber-500" />
                    +{q.forgeXpReward} Forge XP
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                    <span>Progress</span>
                    <span>{q.progress} / {q.maxProgress}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                {isCompleted && !isClaimed ? (
                  <button
                    onClick={() => claimQuest(q.id)}
                    className="w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/60 transition-all"
                  >
                    CLAIM REWARD
                  </button>
                ) : isClaimed ? (
                  <div className="text-center py-2 text-xs font-semibold text-emerald-400/80 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Reward Claimed
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-slate-500 font-medium">
                    In Progress
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History & Audit Ledger */}
      <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-sm">
        <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-purple-400" />
          XP TRANSACTION AUDIT LOG
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#130f24] border border-purple-950/80 text-xs"
            >
              <div>
                <span className="font-semibold text-slate-200">{tx.source}</span>
                <span className="text-[10px] text-slate-500 ml-2 font-mono">{tx.timestamp}</span>
              </div>
              <span
                className={`font-mono font-bold ${
                  tx.type === 'FORGE_XP'
                    ? 'text-amber-400'
                    : tx.type === 'GOLD'
                    ? 'text-yellow-300'
                    : 'text-purple-300'
                }`}
              >
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount}{' '}
                {tx.type === 'FORGE_XP'
                  ? 'Forge XP'
                  : tx.type === 'GOLD'
                  ? 'Gold'
                  : 'Player XP'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
