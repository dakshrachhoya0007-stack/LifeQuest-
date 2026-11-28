import React, { useState } from 'react';
import { useReducedMotion } from 'motion/react';
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
import { RpgScrollReveal } from '../Motion/RpgMotionPrimitives';
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
  const prefersReduced = useReducedMotion();

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
    <div className="min-h-screen bg-[#061225] text-[#F2F7FF] selection:bg-[#1677FF] selection:text-[#F2F7FF]">
      {/* Sticky Single-Row Top Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 w-full bg-[#0A1930]/92 backdrop-blur-md border-b border-[#1E3A63] shadow-[0_6px_30px_rgba(2,8,20,0.7)]">
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
              <span className="font-['Cinzel'] font-black tracking-[0.18em] text-base sm:text-lg text-[#F2F7FF] group-hover:text-[#38D9F5] transition-colors whitespace-nowrap leading-none">
                FITNESSFIGHT
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#94A8C7] font-semibold whitespace-nowrap mt-1">
                World of Aetheria
              </span>
            </div>
          </a>

          {/* Zone 2: Section Nav Links */}
          <nav
            aria-label="Explore FITNESSFIGHT sections"
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
                className="whitespace-nowrap shrink-0 hover:text-[#38D9F5] transition-colors cursor-pointer"
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
              className="lq-btn lq-btn-secondary hidden sm:inline-block px-3.5 py-2 rounded-lg text-xs font-['Cinzel'] font-bold tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartJourney}
              className="lq-btn lq-btn-gold px-4 sm:px-5 py-2.5 rounded-lg font-['Cinzel'] font-black text-xs tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg bg-[#102440] border border-[#1E3A63] text-[#38D9F5] cursor-pointer"
              aria-label="Toggle section menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1E3A63] bg-[#0A1930] px-4 py-4 flex flex-col gap-3">
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
                className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#F2F7FF] hover:text-[#38D9F5] py-1 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onReturningPlayer}
              className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5] pt-2 border-t border-[#1E3A63] cursor-pointer"
            >
              Sign In to Existing Account
            </button>
          </div>
        )}
      </header>

      {/* 1. CINEMATIC HERO SECTION */}
      <section
        id="top"
        className="relative min-h-[88vh] flex items-center justify-center overflow-hidden border-b border-[#1E3A63]"
      >
        {/* Background Fantasy Artwork + Atmospheric Particles + Midnight Navy Scrim */}
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
                'radial-gradient(circle at 50% 38%, rgba(22, 119, 255, 0.34) 0%, rgba(10, 25, 48, 0.84) 60%, #061225 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#061225] to-transparent" />
          <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={Boolean(prefersReduced)} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <GoldenWorldTreeEmblem className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_26px_rgba(0,217,255,0.4)]" />
            <p className="text-[11px] sm:text-xs font-['Cinzel'] font-bold uppercase tracking-[0.28em] text-[#38D9F5]">
              Fitness RPG Progression · Chronicles of Aetheria
            </p>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-['Cinzel'] font-black tracking-tight text-[#F2F7FF] leading-[1.06] max-w-4xl">
            FORGE REAL-LIFE DISCIPLINE INTO{' '}
            <span className="bg-gradient-to-r from-[#F2F7FF] via-[#38D9F5] to-[#1677FF] bg-clip-text text-transparent">
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
              className="lq-btn lq-btn-gold w-full sm:w-auto px-8 py-4 rounded-xl font-['Cinzel'] font-black text-sm sm:text-base tracking-widest uppercase hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('world')}
              className="lq-btn lq-btn-secondary w-full sm:w-auto px-8 py-4 rounded-xl font-['Cinzel'] font-bold text-sm sm:text-base tracking-widest uppercase flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              EXPLORE FITNESSFIGHT
              <ArrowDown className="w-4 h-4 text-[#38D9F5]" />
            </button>
          </div>

          <p className="mt-6 text-xs text-[#94A8C7]/85 font-medium tracking-wide">
            5 Playable Heroes · Camera Rep Verification · 5 Corrupted Kingdoms · Private by Design
          </p>
        </div>
      </section>

      {/* 2. THE WORLD SECTION */}
      <section
        id="world"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1E3A63]"
      >
        <RpgScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#38D9F5] block">
                01 · The World
              </span>
              <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F2F7FF] leading-tight">
                REBUILD AETHERIA AFTER THE GREAT FALL
              </h2>
              <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
                Once crowned by spires of eternal wisdom and strength, Aetheria fractured
                beneath Void corruption. Its five realms now lie shadowed by forgotten titans—and
                only through steady daily discipline can its citadel be restored stone by stone.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="lq-card lq-card-interactive p-4 rounded-xl space-y-1.5">
                  <Compass className="w-4 h-4 text-[#38D9F5]" />
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                    Five Story Chapters
                  </h3>
                  <p className="text-xs text-[#94A8C7] leading-relaxed">
                    Awaken in the shattered Keep and progress through five narrative chapters that physically restore the citadel.
                  </p>
                </div>
                <div className="lq-card lq-card-interactive p-4 rounded-xl space-y-1.5">
                  <Crown className="w-4 h-4 text-[#FBBF24]" />
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                    Five Void Kingdoms
                  </h3>
                  <p className="text-xs text-[#94A8C7] leading-relaxed">
                    Liberate forest, mountain, ocean, desert, and citadel realms in tactical turn-based boss encounters.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-[#1677FF]/45 bg-[#0A1930] shadow-[0_20px_50px_rgba(2,8,20,0.85)] aspect-[16/10]">
                <img
                  src={heroAetheriaWorldImg}
                  alt="Ruins and glowing citadel towers of Aetheria"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#061225] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#38D9F5] block">
                      The Citadel Sanctuary
                    </span>
                    <p className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                      Every Real-Life Effort Restores the Realm
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RpgScrollReveal>
      </section>

      {/* 3. HEROES SECTION */}
      <section
        id="heroes"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1E3A63] space-y-10"
      >
        <RpgScrollReveal className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#38D9F5] block">
                02 · Playable Heroes
              </span>
              <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F2F7FF]">
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
              className="lq-btn lq-btn-secondary self-start md:self-auto px-5 py-2.5 rounded-xl text-xs font-['Cinzel'] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer"
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
                  className={`group rounded-2xl overflow-hidden border text-left transition-all bg-[#0A1930] cursor-pointer ${
                    isSelected
                      ? 'border-[#00D9FF] ring-1 ring-[#00D9FF]/50 -translate-y-1 shadow-[0_12px_32px_rgba(0,217,255,0.28)]'
                      : 'border-[#1E3A63] hover:border-[#00D9FF]/60'
                  }`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#061225]">
                    <img
                      src={getHeroArtwork(hero.id)}
                      alt={`${hero.name} — ${hero.archetype}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#061225] via-[#061225]/75 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#38D9F5] block">
                        {hero.mappedClass}
                      </span>
                      <span className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] block truncate">
                        {hero.name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Selected Hero Feature Spotlight */}
          <div className="lq-card rounded-2xl p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#00D9FF]/45 bg-[#061225] shadow-2xl">
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
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#1E3A63] pb-3.5">
                <div>
                  <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F2F7FF]">
                    {previewHero.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#38D9F5] font-medium mt-0.5">
                    {previewHero.title} · {previewHero.archetype}
                  </p>
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#38D9F5]">
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
                    className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-1"
                  >
                    <span className="text-xs font-['Cinzel'] font-bold text-[#F2F7FF] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#00D9FF]" />
                      {ab.name}
                    </span>
                    <p className="text-xs text-[#94A8C7] leading-relaxed">{ab.description}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#38D9F5] block">
                    Champion Strengths
                  </span>
                  {previewHero.strengths.map(str => (
                    <p key={str} className="text-[#94A8C7] flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </p>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#38D9F5] block">
                    Bodyweight Combat &amp; Focus
                  </span>
                  <p className="text-[#94A8C7]">
                    Hands: {previewHero.bodyweightDisciplines.handsFocus}
                  </p>
                  <p className="text-[#94A8C7]">
                    Legs: {previewHero.bodyweightDisciplines.legsFocus}
                  </p>
                  <p className="text-[#38D9F5] font-mono">
                    Virtues:{' '}
                    {previewHero.attributeFocus
                      .map(k => RPG_ATTRIBUTE_META.find(m => m.key === k)?.label || k)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RpgScrollReveal>
      </section>

      {/* 4. QUESTS & REAL-LIFE ADVENTURE SECTION */}
      <section
        id="quests"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1E3A63] space-y-10"
      >
        <RpgScrollReveal className="space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#38D9F5] block">
              03 · Quests &amp; Battles
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F2F7FF]">
              YOUR DAILY GOALS BECOME EPIC QUESTS
            </h2>
            <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
              Every rep verified, balanced meal logged, and daily routine honored strengthens your champion and opens corrupted gates across Aetheria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="lq-card lq-card-interactive rounded-2xl border border-[#10B981]/35 hover:border-[#10B981]/70 overflow-hidden flex flex-col">
              <div className="h-44 overflow-hidden bg-[#061225] relative">
                <img
                  src={aetheriaForegroundTerraceImg}
                  alt="Aetheria bodyweight training terrace"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1930] to-transparent" />
                <Camera className="w-5 h-5 text-[#10B981] absolute bottom-3 left-4" />
              </div>
              <div className="p-5 space-y-2 flex-1">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  Aether Vision Training
                </h3>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Private on-device camera motion tracking verifies squats, push-ups, lunges, and meal scans to award genuine Player XP and bodyweight combat strength.
                </p>
              </div>
            </article>

            <article className="lq-card lq-card-interactive rounded-2xl border border-[#00D9FF]/35 hover:border-[#38D9F5]/70 overflow-hidden flex flex-col">
              <div className="h-44 overflow-hidden bg-[#061225] relative flex items-center justify-center p-6">
                <div className="grid grid-cols-2 gap-2.5 w-full text-xs">
                  <div className="p-2.5 rounded-lg bg-[#0A1930] border border-[#00D9FF]/40">
                    <Flame className="w-3.5 h-3.5 text-[#38D9F5] mb-1" />
                    <span className="font-semibold text-[#F2F7FF] block">Daily Rituals</span>
                    <span className="text-[10px] text-[#94A8C7]">+25 Player XP</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/50">
                    <Compass className="w-3.5 h-3.5 text-[#00D9FF] mb-1" />
                    <span className="font-semibold text-[#F2F7FF] block">Weekly Bounties</span>
                    <span className="text-[10px] text-[#94A8C7]">Timed Reset Cycles</span>
                  </div>
                </div>
                <Check className="w-5 h-5 text-[#10B981] absolute bottom-3 left-4" />
              </div>
              <div className="p-5 space-y-2 flex-1">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  Habit &amp; Quest Boards
                </h3>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Turn hydration, sleep recovery, mindfulness, and workouts into structured daily and weekly quests with streak multipliers and buff blessings.
                </p>
              </div>
            </article>

            <article className="lq-card lq-card-interactive rounded-2xl border border-[#F43F5E]/35 hover:border-[#F43F5E]/70 overflow-hidden flex flex-col">
              <div className="h-44 overflow-hidden bg-[#061225] relative">
                <img
                  src={bossVoidStalkerImg}
                  alt="Void Sovereign boss encounter"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1930] to-transparent" />
                <Dumbbell className="w-5 h-5 text-[#F43F5E] absolute bottom-3 left-4" />
              </div>
              <div className="p-5 space-y-2 flex-1">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  Tactical Boss Encounters
                </h3>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Read boss telegraphs, strike with trained hands and legs, trigger active wellness buffs, and conquer multi-phase Void Sovereigns across five kingdoms.
                </p>
              </div>
            </article>
          </div>
        </RpgScrollReveal>
      </section>

      {/* 5. PROGRESSION SECTION */}
      <section
        id="progression"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#1E3A63] space-y-10"
      >
        <RpgScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#38D9F5] block">
                04 · Progression &amp; Mastery
              </span>
              <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F2F7FF]">
                LEVELS, CONDITIONING &amp; SIX VIRTUES
              </h2>
              <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
                Watch real-world consistency evolve every system in your character sheet—without shortcuts or artificial bloat.
              </p>

              <div className="space-y-3 pt-2">
                <div className="lq-card p-4 rounded-xl flex items-start gap-3">
                  <Dumbbell className="w-5 h-5 text-[#00D9FF] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                      Hands &amp; Legs Bodyweight Combat
                    </h3>
                    <p className="text-xs text-[#94A8C7] mt-1">
                      Build combat strength naturally through bodyweight exercises—delivering strikes, guard stances, and agile footwork using only hands and legs.
                    </p>
                  </div>
                </div>
                <div className="lq-card p-4 rounded-xl flex items-start gap-3">
                  <Award className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
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
                  className="lq-card lq-card-interactive p-4 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
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
                  <p className="text-[11px] text-[#38D9F5]/90 pt-1 border-t border-[#1E3A63]">
                    Built through: {attr.realLifeSource}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </RpgScrollReveal>
      </section>

      {/* 6. SOCIAL FELLOWSHIP SECTION */}
      <section
        id="social"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 space-y-10"
      >
        <RpgScrollReveal className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#00D9FF] block">
                05 · Fellowship &amp; Community
              </span>
              <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F2F7FF]">
                RISE TOGETHER IN GUILDS &amp; STANDINGS
              </h2>
              <p className="text-sm sm:text-base text-[#94A8C7] leading-relaxed">
                Connect with fellow adventurers through supportive guild challenges, friend fellowships, tavern chat, and consistency leaderboards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="lq-card lq-card-interactive p-6 rounded-2xl space-y-3">
              <Trophy className="w-6 h-6 text-[#FBBF24]" />
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                Realm Leaderboards
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Track global, weekly, monthly, guild, and friend rankings built around positive habit consistency and quest victories.
              </p>
            </div>

            <div className="lq-card lq-card-interactive p-6 rounded-2xl space-y-3">
              <Users className="w-6 h-6 text-[#00D9FF]" />
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                Friends &amp; Tavern Chat
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Add allies, celebrate milestone achievements, inspect public champion profiles with granular privacy controls, and coordinate in real time.
              </p>
            </div>

            <div className="lq-card lq-card-interactive p-6 rounded-2xl space-y-3">
              <Flag className="w-6 h-6 text-[#38D9F5]" />
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                Guild Halls &amp; Raids
              </h3>
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Found or join a guild, complete shared weekly quests, and build lasting accountability with companions on the same path.
              </p>
            </div>
          </div>

          {/* Closing Call to Action Banner */}
          <div className="lq-card rounded-2xl p-8 sm:p-10 text-center space-y-5">
            <GoldenWorldTreeEmblem className="w-12 h-12 mx-auto" />
            <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F2F7FF]">
              AETHERIA AWAITS YOUR FIRST OATH
            </h3>
            <p className="text-sm text-[#94A8C7] max-w-xl mx-auto leading-relaxed">
              Create your account or sign back in to choose your permanent champion and begin restoring the citadel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartJourney}
                className="lq-btn lq-btn-gold w-full sm:w-auto px-8 py-3.5 rounded-xl font-['Cinzel'] font-black text-sm tracking-widest uppercase whitespace-nowrap cursor-pointer"
              >
                ENTER THE WORLD
              </button>
              <button
                type="button"
                onClick={onReturningPlayer}
                className="lq-btn lq-btn-secondary w-full sm:w-auto px-8 py-3.5 rounded-xl font-['Cinzel'] font-bold text-sm tracking-widest uppercase whitespace-nowrap cursor-pointer"
              >
                RETURNING PLAYER
              </button>
            </div>
          </div>
        </RpgScrollReveal>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-[#1E3A63] bg-[#0A1930]/70 py-7 px-4 sm:px-6 text-center text-xs text-[#647A9E]">
        <p>FITNESSFIGHT · World of Aetheria · Real-life habits, workouts &amp; nutrition forged into an RPG adventure.</p>
      </footer>
    </div>
  );
};
