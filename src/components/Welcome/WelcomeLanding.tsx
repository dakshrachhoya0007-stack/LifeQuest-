import React, { useState } from 'react';
import {
  aetheriaCitadelKingdomImg,
  aetheriaForegroundTerraceImg,
  bossVoidStalkerImg,
  getHeroArtwork,
  heroAetheriaWorldImg,
} from '../../assets/images';
import { PLAYABLE_HEROES, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { PlayableHeroId } from '../../types/game';
import { AtmosphereParticlesCanvas } from '../Dashboard/AtmosphereParticlesCanvas';
import {
  ArrowDown,
  Award,
  Camera,
  Check,
  Compass,
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Menu,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';

import { GoldenWorldTreeEmblem } from '../Brand/GoldenWorldTreeEmblem';
export { GoldenWorldTreeEmblem };

interface WelcomeLandingProps {
  onStartJourney: () => void;
  onReturningPlayer: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onStartJourney,
  onReturningPlayer,
}) => {
  const [selectedPreviewHeroId, setSelectedPreviewHeroId] = useState<PlayableHeroId>('fallen_knight');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const previewHero =
    PLAYABLE_HEROES.find(h => h.id === selectedPreviewHeroId) || PLAYABLE_HEROES[0];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#061225] text-[#FFFFFF] selection:bg-[#1677FF] selection:text-white">
      {/* Sticky Single-Row Top Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 w-full bg-[#0A1930]/92 backdrop-blur-md border-b border-[#1677FF]/25 shadow-[0_6px_30px_rgba(3,10,24,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Emblem + Wordmark */}
          <a
            href="#top"
            onClick={e => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 shrink-0 group focus:outline-none"
          >
            <GoldenWorldTreeEmblem className="w-9 h-9 transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-['Cinzel'] font-black tracking-[0.18em] text-base sm:text-lg text-[#FFFFFF] group-hover:text-[#FFD978] transition-colors whitespace-nowrap leading-none">
                LIFEQUEST
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#94A8C7] font-semibold whitespace-nowrap mt-1">
                World of Aetheria
              </span>
            </div>
          </a>

          {/* Zone 2: Section Nav Links */}
          <nav
            aria-label="Explore LifeQuest sections"
            className="hidden md:flex items-center gap-7 text-xs font-['Cinzel'] font-bold tracking-widest uppercase text-[#94A8C7]"
          >
            {[
              { id: 'world', label: 'The World' },
              { id: 'heroes', label: 'Heroes' },
              { id: 'quests', label: 'Quests' },
              { id: 'progression', label: 'Progression' },
              { id: 'social', label: 'Social' },
            ].map(link => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="whitespace-nowrap shrink-0 hover:text-[#FFD978] transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary CTA + Mobile Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onReturningPlayer}
              className="hidden sm:inline-block px-3.5 py-2 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/35 hover:border-[#FFD978]/60 text-xs font-['Cinzel'] font-bold tracking-wider uppercase text-white transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartJourney}
              className="px-4 sm:px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 border border-[#FFD978]/45 text-white font-['Cinzel'] font-black text-xs tracking-wider uppercase shadow-[0_4px_18px_rgba(22,119,255,0.45)] hover:shadow-[0_0_24px_rgba(255,217,120,0.45)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg bg-[#102440] border border-[#1677FF]/40 text-[#FFD978]"
              aria-label="Toggle section menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1677FF]/20 bg-[#0A1930] px-4 py-4 flex flex-col gap-3">
            {[
              { id: 'world', label: 'The World' },
              { id: 'heroes', label: 'Heroes' },
              { id: 'quests', label: 'Quests' },
              { id: 'progression', label: 'Progression' },
              { id: 'social', label: 'Social' },
            ].map(link => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFFFFF] hover:text-[#FFD978] py-1"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onReturningPlayer}
              className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#FFD978] pt-2 border-t border-[#1677FF]/20"
            >
              Sign In to Existing Account
            </button>
          </div>
        )}
      </header>

      {/* 1. CINEMATIC HERO SECTION */}
      <section
        id="top"
        className="relative min-h-[88vh] flex items-center justify-center overflow-hidden border-b border-[#1677FF]/20"
      >
        {/* Background Fantasy Artwork + Atmospheric Particles + Midnight Blue Contrast Scrim */}
        <div className="absolute inset-0 bg-[#061225]">
          <img
            src={aetheriaCitadelKingdomImg}
            alt="The Shattered Citadel of Aetheria"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-45 scale-[1.03]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 38%, rgba(22, 119, 255, 0.34) 0%, rgba(10, 25, 48, 0.82) 60%, #061225 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#061225] to-transparent" />
          <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={false} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <GoldenWorldTreeEmblem className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_26px_rgba(255,217,120,0.4)]" />
            <p className="text-[11px] sm:text-xs font-['Cinzel'] font-bold uppercase tracking-[0.28em] text-[#FFD978]">
              Futuristic Life Progression RPG · Chronicles of Aetheria
            </p>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-['Cinzel'] font-black tracking-tight text-[#FFFFFF] leading-[1.06] max-w-4xl">
            FORGE REAL-LIFE DISCIPLINE INTO{' '}
            <span className="bg-gradient-to-r from-[#FFFFFF] via-[#00D9FF] to-[#1677FF] bg-clip-text text-transparent">
              HEROIC LEGEND
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-[#94A8C7] max-w-2xl leading-relaxed font-normal">
            Transform everyday workouts, daily habits, and nourishing meals into character
            progression, bodyweight strength through exercise (hands &amp; legs), and epic kingdom
            victories across the fallen realm of Aetheria.
          </p>

          {/* Primary Public CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={onStartJourney}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 border border-[#FFD978]/50 text-white font-['Cinzel'] font-black text-sm sm:text-base tracking-widest uppercase shadow-[0_8px_28px_rgba(22,119,255,0.45)] hover:shadow-[0_0_32px_rgba(255,217,120,0.45)] transition-all hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('world')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0A1930]/90 hover:bg-[#102440] border border-[#1677FF]/45 hover:border-[#FFD978]/70 text-[#FFFFFF] font-['Cinzel'] font-bold text-sm sm:text-base tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(0,217,255,0.28)] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              EXPLORE LIFEQUEST
              <ArrowDown className="w-4 h-4 text-[#FFD978]" />
            </button>
          </div>

          <p className="mt-6 text-xs text-[#94A8C7]/80 font-medium tracking-wide">
            5 Playable Heroes · Camera Rep Verification · 5 Corrupted Kingdoms · Private by Design
          </p>
        </div>
      </section>

      {/* 2. THE WORLD SECTION */}
      <section
        id="world"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1677FF]/20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#FFD978] block">
              01 · The World
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#FFFFFF] leading-tight">
              REBUILD AETHERIA AFTER THE GREAT FALL
            </h2>
            <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
              Once crowned by spires of eternal wisdom and strength, Aetheria fractured
              beneath Void corruption. Its five realms now lie shadowed by forgotten titans—and
              only through steady daily discipline can its citadel be restored stone by stone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/25 hover:border-[#FFD978]/50 transition-all space-y-1.5 shadow-[0_8px_24px_rgba(3,10,24,0.45)]">
                <Compass className="w-4 h-4 text-[#FFD978]" />
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                  Five Story Chapters
                </h3>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Awaken in the shattered Keep and progress through five narrative chapters that physically restore the citadel.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/25 hover:border-[#FFD978]/50 transition-all space-y-1.5 shadow-[0_8px_24px_rgba(3,10,24,0.45)]">
                <Crown className="w-4 h-4 text-[#FFD978]" />
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                  Five Void Kingdoms
                </h3>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Liberate forest, mountain, ocean, desert, and citadel realms in tactical turn-based boss encounters.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-[#1677FF]/35 bg-[#102440] shadow-[0_20px_50px_rgba(3,10,24,0.7)] aspect-[16/10]">
              <img
                src={heroAetheriaWorldImg}
                alt="Ruins and glowing citadel towers of Aetheria"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061225] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFD978] block">
                    The Citadel Sanctuary
                  </span>
                  <p className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
                    Every Real-Life Effort Restores the Realm
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HEROES SECTION */}
      <section
        id="heroes"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1677FF]/20 space-y-10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#FFD978] block">
              02 · Playable Heroes
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#FFFFFF]">
              CHOOSE YOUR OATH — ONCE AND FOR ALL
            </h2>
            <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
              Five distinct champions survived The Great Fall. Preview their abilities,
              virtues, and bodyweight combat disciplines below before binding one permanently to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartJourney}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/45 hover:border-[#FFD978]/75 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-white hover:shadow-[0_0_18px_rgba(255,217,120,0.28)] transition-all whitespace-nowrap cursor-pointer"
          >
            Claim Your Champion
          </button>
        </div>

        {/* 5 Hero Portrait Selector Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {PLAYABLE_HEROES.map(hero => {
            const isSelected = hero.id === previewHero.id;
            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => setSelectedPreviewHeroId(hero.id)}
                className={`group rounded-2xl overflow-hidden border text-left transition-all bg-[#102440] cursor-pointer ${
                  isSelected
                    ? 'border-[#FFD978] ring-1 ring-[#FFD978]/50 -translate-y-1 shadow-[0_12px_32px_rgba(0,217,255,0.28)]'
                    : 'border-[#1677FF]/25 hover:border-[#FFD978]/60'
                }`}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#0A1930]">
                  <img
                    src={getHeroArtwork(hero.id)}
                    alt={`${hero.name} — ${hero.archetype}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#061225] via-[#061225]/70 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFD978] block">
                      {hero.mappedClass}
                    </span>
                    <span className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF] block truncate">
                      {hero.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Selected Hero Feature Spotlight */}
        <div className="rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/35 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-[0_20px_50px_rgba(3,10,24,0.65)]">
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#FFD978]/45 bg-[#0A1930] shadow-2xl">
              <img
                key={previewHero.id}
                src={getHeroArtwork(previewHero.id)}
                alt={previewHero.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#061225] to-transparent" />
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1677FF]/25 pb-3.5">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#FFFFFF]">
                  {previewHero.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#FFD978] font-medium mt-0.5">
                  {previewHero.title} · {previewHero.archetype}
                </p>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#FFD978]">
                Class: {previewHero.mappedClass}
              </span>
            </div>

            <p className="text-sm text-[#94A8C7] leading-relaxed">
              {previewHero.greatFallOrigin}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewHero.abilities.map(ab => (
                <div
                  key={ab.name}
                  className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 space-y-1"
                >
                  <span className="text-xs font-['Cinzel'] font-bold text-[#FFFFFF] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFD978]" />
                    {ab.name}
                  </span>
                  <p className="text-xs text-[#94A8C7] leading-relaxed">{ab.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFD978] block">
                  Champion Strengths
                </span>
                {previewHero.strengths.map(str => (
                  <p key={str} className="text-[#94A8C7] flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#FFD978] shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFD978] block">
                  Bodyweight Combat &amp; Focus
                </span>
                <p className="text-[#94A8C7]">
                  Hands: {previewHero.bodyweightDisciplines.handsFocus}
                </p>
                <p className="text-[#94A8C7]">
                  Legs: {previewHero.bodyweightDisciplines.legsFocus}
                </p>
                <p className="text-[#FFD978] font-mono">
                  Virtues:{' '}
                  {previewHero.attributeFocus
                    .map(k => RPG_ATTRIBUTE_META.find(m => m.key === k)?.label || k)
                    .join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. QUESTS & REAL-LIFE ADVENTURE SECTION */}
      <section
        id="quests"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1677FF]/20 space-y-10"
      >
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#FFD978] block">
            03 · Quests &amp; Battles
          </span>
          <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#FFFFFF]">
            YOUR DAILY GOALS BECOME EPIC QUESTS
          </h2>
          <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
            Every rep verified, balanced meal logged, and daily routine honored strengthens your champion and opens corrupted gates across Aetheria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <article className="rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#35D69A]/35 hover:border-[#35D69A]/70 transition-all overflow-hidden flex flex-col shadow-[0_12px_32px_rgba(4,12,28,0.55)]">
            <div className="h-44 overflow-hidden bg-[#0A1930] relative">
              <img
                src={aetheriaForegroundTerraceImg}
                alt="Aetheria bodyweight training terrace"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102440] to-transparent" />
              <Camera className="w-5 h-5 text-[#35D69A] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
                Aether Vision Training
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Private on-device camera motion tracking verifies squats, push-ups, lunges, and meal scans to award genuine Player XP and bodyweight combat strength.
              </p>
            </div>
          </article>

          <article className="rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#E7B94F]/35 hover:border-[#FFD978]/70 transition-all overflow-hidden flex flex-col shadow-[0_12px_32px_rgba(4,12,28,0.55)]">
            <div className="h-44 overflow-hidden bg-[#0A1930] relative flex items-center justify-center p-6">
              <div className="grid grid-cols-2 gap-2.5 w-full text-xs">
                <div className="p-2.5 rounded-lg bg-[#102440] border border-[#FFAA45]/40">
                  <Flame className="w-3.5 h-3.5 text-[#FFAA45] mb-1" />
                  <span className="font-semibold text-[#FFFFFF] block">Daily Rituals</span>
                  <span className="text-[10px] text-[#94A8C7]">+25 Player XP</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#102440] border border-[#E7B94F]/40">
                  <Compass className="w-3.5 h-3.5 text-[#FFD978] mb-1" />
                  <span className="font-semibold text-[#FFFFFF] block">Weekly Bounties</span>
                  <span className="text-[10px] text-[#94A8C7]">Timed Reset Cycles</span>
                </div>
              </div>
              <Check className="w-5 h-5 text-[#35D69A] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
                Habit &amp; Quest Boards
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Turn hydration, sleep recovery, mindfulness, and workouts into structured daily and weekly quests with streak multipliers and buff blessings.
              </p>
            </div>
          </article>

          <article className="rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#F05B70]/35 hover:border-[#F05B70]/70 transition-all overflow-hidden flex flex-col shadow-[0_12px_32px_rgba(4,12,28,0.55)]">
            <div className="h-44 overflow-hidden bg-[#0A1930] relative">
              <img
                src={bossVoidStalkerImg}
                alt="Void Sovereign boss encounter"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102440] to-transparent" />
              <Dumbbell className="w-5 h-5 text-[#F05B70] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
                Tactical Boss Encounters
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Read boss telegraphs, strike with trained hands and legs, trigger active wellness buffs, and conquer multi-phase Void Sovereigns across five kingdoms.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* 5. PROGRESSION SECTION */}
      <section
        id="progression"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1677FF]/20 space-y-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#FFD978] block">
              04 · Progression &amp; Mastery
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#FFFFFF]">
              LEVELS, CONDITIONING &amp; SIX VIRTUES
            </h2>
            <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
              Watch real-world consistency evolve every system in your character sheet—without shortcuts or artificial bloat.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/25 flex items-start gap-3">
                <Dumbbell className="w-5 h-5 text-[#FFD978] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                    Hands &amp; Legs Bodyweight Combat
                  </h3>
                  <p className="text-xs text-[#94A8C7] mt-1">
                    Build combat strength naturally through bodyweight exercises—delivering strikes, guard stances, and agile footwork using only hands and legs.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/25 flex items-start gap-3">
                <Award className="w-5 h-5 text-[#FFD978] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                    Achievements &amp; Aether Ranks
                  </h3>
                  <p className="text-xs text-[#94A8C7] mt-1">
                    Earn milestone trophies, Gold Coins, and Aether Rank promotions as your streaks and combat prowess mature.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Six Realm Virtues Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {RPG_ATTRIBUTE_META.map(attr => (
              <div
                key={attr.key}
                className="p-4 rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#1677FF]/25 hover:border-[#FFD978]/45 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-['Cinzel'] font-bold text-sm text-[#FFFFFF]">
                    {attr.label}
                  </span>
                  <span
                    className="font-mono text-xs font-black tracking-wider"
                    style={{ color: attr.accentHex }}
                  >
                    {attr.shortLabel}
                  </span>
                </div>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  {attr.description}
                </p>
                <p className="text-[11px] text-[#FFD978]/85 pt-1 border-t border-[#1677FF]/20">
                  Built through: {attr.realLifeSource}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SOCIAL FELLOWSHIP SECTION */}
      <section
        id="social"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 space-y-10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#65A9FF] block">
              05 · Fellowship &amp; Community
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#FFFFFF]">
              RISE TOGETHER IN GUILDS &amp; STANDINGS
            </h2>
            <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
              Connect with fellow adventurers through supportive guild challenges, friend fellowships, tavern chat, and consistency leaderboards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#65A9FF]/30 hover:border-[#38D9F5]/60 transition-all space-y-3">
            <Trophy className="w-6 h-6 text-[#65A9FF]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
              Realm Leaderboards
            </h3>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              Track global, weekly, monthly, guild, and friend rankings built around positive habit consistency and quest victories.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#65A9FF]/30 hover:border-[#38D9F5]/60 transition-all space-y-3">
            <Users className="w-6 h-6 text-[#38D9F5]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
              Friends &amp; Tavern Chat
            </h3>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              Add allies, celebrate milestone achievements, inspect public champion profiles with granular privacy controls, and coordinate in real time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#102440]/85 backdrop-blur-md border border-[#65A9FF]/30 hover:border-[#38D9F5]/60 transition-all space-y-3">
            <Flag className="w-6 h-6 text-[#FFD978]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#FFFFFF]">
              Guild Halls &amp; Raids
            </h3>
            <p className="text-xs text-[#94A8C7] leading-relaxed">
              Found or join a guild, complete shared weekly quests, and build lasting accountability with companions on the same path.
            </p>
          </div>
        </div>

        {/* Closing Call to Action Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#FFD978]/35 p-8 sm:p-10 text-center space-y-5 shadow-[0_20px_50px_rgba(4,12,28,0.75)]">
          <GoldenWorldTreeEmblem className="w-12 h-12 mx-auto" />
          <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#FFFFFF]">
            AETHERIA AWAITS YOUR FIRST OATH
          </h3>
          <p className="text-sm text-[#94A8C7] max-w-xl mx-auto leading-relaxed">
            Create your account or sign back in to choose your permanent champion and begin restoring the citadel.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onStartJourney}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:brightness-110 border border-[#FFD978]/50 text-white font-['Cinzel'] font-black text-sm tracking-widest uppercase shadow-[0_6px_22px_rgba(22,119,255,0.45)] hover:shadow-[0_0_26px_rgba(255,217,120,0.45)] transition-all whitespace-nowrap cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={onReturningPlayer}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/45 hover:border-[#FFD978]/70 text-white font-['Cinzel'] font-bold text-sm tracking-widest uppercase transition-all hover:shadow-[0_0_18px_rgba(0,217,255,0.28)] whitespace-nowrap cursor-pointer"
            >
              RETURNING PLAYER
            </button>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-[#1677FF]/20 bg-[#0A1930]/60 py-7 px-4 sm:px-6 text-center text-xs text-[#94A8C7]/75">
        <p>LIFEQUEST · World of Aetheria · Real-life habits, workouts &amp; nutrition forged into an RPG adventure.</p>
      </footer>
    </div>
  );
};
