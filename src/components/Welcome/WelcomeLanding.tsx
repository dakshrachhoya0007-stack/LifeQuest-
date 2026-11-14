import React from 'react';
import { heroAetheriaWorldImg } from '../../assets/images';
import {
  Shield,
  Activity,
  Hammer,
  Sparkles,
  Camera,
  Swords,
  Users,
  Award,
} from 'lucide-react';

interface WelcomeLandingProps {
  onStartJourney: () => void;
  onReturningPlayer: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onStartJourney,
  onReturningPlayer,
}) => {
  return (
    <div className="relative min-h-screen bg-[#07050d] text-slate-100 overflow-hidden flex flex-col justify-between">
      {/* Background Image Scrim with Atmospheric Depth */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroAetheriaWorldImg}
          alt="Aetheria Fantasy Realm"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-35 filter brightness-75 scale-105 animate-pulse duration-10000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07050d] via-[#090714]/80 to-[#07050d]/70" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 p-0.5 shadow-lg flex items-center justify-center">
            <span className="font-['Cinzel'] font-bold text-xl text-white">⚔</span>
          </div>
          <span className="font-['Cinzel'] font-black tracking-widest text-xl text-slate-100">
            LIFEQUEST
          </span>
        </div>

        <button
          onClick={onReturningPlayer}
          className="px-5 py-2 text-xs font-bold font-['Cinzel'] tracking-wider rounded-xl border border-purple-600/50 bg-purple-950/40 text-purple-200 hover:bg-purple-900/60 hover:text-white transition-all shadow-md"
        >
          RETURNING PLAYER
        </button>
      </header>

      {/* Hero Core */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center flex flex-col items-center justify-center my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/60 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          The Realm of Aetheria
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-['Cinzel'] tracking-tight text-white mb-6 leading-tight drop-shadow-2xl">
          YOUR REAL LIFE.<br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
            YOUR EPIC QUEST.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Build better habits. Complete quests. Become the hero of your own story.
          Transform real-world workouts, nutrition, and daily consistency into character levels, forged weapons, and kingdom triumphs.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-16">
          <button
            onClick={onStartJourney}
            className="w-full sm:w-auto px-8 py-4 font-black font-['Cinzel'] tracking-widest text-sm sm:text-base rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-950/80 transition-all hover:scale-105 active:scale-95"
          >
            START YOUR JOURNEY
          </button>
          <button
            onClick={onReturningPlayer}
            className="w-full sm:w-auto px-8 py-4 font-bold font-['Cinzel'] tracking-widest text-sm sm:text-base rounded-xl bg-[#140f26]/80 hover:bg-[#1f173b] border border-purple-800/80 text-purple-200 hover:text-white transition-all shadow-md"
          >
            RETURNING PLAYER
          </button>
        </div>

        {/* 4 Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
          <div className="p-4 rounded-xl bg-[#0e0a1b]/80 border border-purple-950/80 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center mb-3 border border-purple-800/40">
              <Camera className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-['Cinzel'] font-bold text-sm text-slate-100 mb-1">Aether Vision AI</h3>
            <p className="text-xs text-slate-400">
              Private on-device camera pose tracking counts squats and push-ups with verified rep XP rewards.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0a1b]/80 border border-purple-950/80 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center mb-3 border border-purple-800/40">
              <Hammer className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-['Cinzel'] font-bold text-sm text-slate-100 mb-1">The Blacksmith Forge</h3>
            <p className="text-xs text-slate-400">
              Spend earned Forge XP to temper swords, staffs, bows, and shields through five distinct rarity tiers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0a1b]/80 border border-purple-950/80 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center mb-3 border border-purple-800/40">
              <Swords className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-['Cinzel'] font-bold text-sm text-slate-100 mb-1">Turn-Based Battles</h3>
            <p className="text-xs text-slate-400">
              Prepare active buffs earned through healthy habits and battle corrupted Void bosses across 5 kingdoms.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0a1b]/80 border border-purple-950/80 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center mb-3 border border-purple-800/40">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-['Cinzel'] font-bold text-sm text-slate-100 mb-1">Guilds & Community</h3>
            <p className="text-xs text-slate-400">
              Join guilds, chat in taverns, and accomplish collective raid goals without toxic body rankings.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-950/70 py-6 px-6 text-center text-xs text-slate-500">
        <p>LIFEQUEST · World of Aetheria · Healthy habits, fitness, and nutrition gamified with privacy-first AI.</p>
      </footer>
    </div>
  );
};
