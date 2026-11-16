import React, { useState } from 'react';
import {
  aetheriaCitadelKingdomImg,
  blacksmithForgeImg,
  bossVoidStalkerImg,
  getHeroArtwork,
  heroAetheriaWorldImg,
} from '../../assets/images';
import { PLAYABLE_HEROES, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { PlayableHeroId } from '../../types/game';
import { AtmosphereParticlesCanvas } from '../Dashboard/world3d/AtmosphereParticlesCanvas';
import {
  ArrowDown,
  Award,
  Camera,
  Check,
  Compass,
  Crown,
  Flame,
  Hammer,
  Menu,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';

interface WelcomeLandingProps {
  onStartJourney: () => void;
  onReturningPlayer: () => void;
}

export const GoldenWorldTreeEmblem: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="29" stroke="#C5A15A" strokeWidth="1.75" strokeOpacity="0.85" />
    <circle cx="32" cy="32" r="24" stroke="#C5A15A" strokeWidth="0.75" strokeOpacity="0.4" />
    {/* Roots */}
    <path
      d="M32 45C32 45 27 50 20 51M32 45C32 45 37 50 44 51M32 45V53"
      stroke="#C5A15A"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Trunk */}
    <path d="M32 24V46" stroke="#E5C57D" strokeWidth="2.6" strokeLinecap="round" />
    {/* Branches */}
    <path
      d="M32 32L22 23M32 32L42 23M32 27L25 18M32 27L39 18"
      stroke="#C5A15A"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    {/* Canopy Leaves / Crown Stars */}
    <circle cx="32" cy="14" r="2.6" fill="#F2D89B" />
    <circle cx="21" cy="21" r="2.1" fill="#C5A15A" />
    <circle cx="43" cy="21" r="2.1" fill="#C5A15A" />
    <circle cx="25" cy="16" r="1.7" fill="#E5C57D" />
    <circle cx="39" cy="16" r="1.7" fill="#E5C57D" />
    <circle cx="17" cy="28" r="1.6" fill="#C5A15A" fillOpacity="0.8" />
    <circle cx="47" cy="28" r="1.6" fill="#C5A15A" fillOpacity="0.8" />
  </svg>
);

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
    <div className="min-h-screen bg-[#08060f] text-[#E6DFD3] selection:bg-[#7046A5] selection:text-[#F5EFE6]">
      {/* Sticky Single-Row Top Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 w-full bg-[#0c0915]/92 backdrop-blur-md border-b border-[#C5A15A]/18">
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
              <span className="font-['Cinzel'] font-black tracking-[0.18em] text-base sm:text-lg text-[#F5EFE6] whitespace-nowrap leading-none">
                LIFEQUEST
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A15A]/80 font-semibold whitespace-nowrap mt-1">
                World of Aetheria
              </span>
            </div>
          </a>

          {/* Zone 2: Section Nav Links */}
          <nav
            aria-label="Explore LifeQuest sections"
            className="hidden md:flex items-center gap-7 text-xs font-['Cinzel'] font-bold tracking-widest uppercase text-[#D9D2C5]/75"
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
                className="whitespace-nowrap shrink-0 hover:text-[#C5A15A] transition-colors cursor-pointer"
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
              className="hidden sm:inline-block text-xs font-['Cinzel'] font-bold tracking-wider uppercase text-[#D9D2C5]/80 hover:text-[#C5A15A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onStartJourney}
              className="px-4 sm:px-5 py-2.5 rounded-lg bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-xs tracking-wider uppercase shadow-lg shadow-black/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-lg bg-[#161124] border border-[#C5A15A]/25 text-[#C5A15A]"
              aria-label="Toggle section menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#C5A15A]/15 bg-[#0c0915] px-4 py-4 flex flex-col gap-3">
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
                className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#D9D2C5] hover:text-[#C5A15A] py-1"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onReturningPlayer}
              className="text-left text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A] pt-2 border-t border-[#C5A15A]/15"
            >
              Sign In to Existing Account
            </button>
          </div>
        )}
      </header>

      {/* 1. CINEMATIC HERO SECTION */}
      <section
        id="top"
        className="relative min-h-[88vh] flex items-center justify-center overflow-hidden border-b border-[#C5A15A]/18"
      >
        {/* Background Fantasy Artwork + Atmospheric Particles + Contrast Scrim */}
        <div className="absolute inset-0 bg-[#0b0813]">
          <img
            src={aetheriaCitadelKingdomImg}
            alt="The Shattered Citadel of Aetheria"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-50 scale-[1.03]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 38%, rgba(37, 22, 56, 0.38) 0%, rgba(11, 8, 19, 0.84) 62%, #08060f 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#08060f] to-transparent" />
          <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={false} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center gap-3">
            <GoldenWorldTreeEmblem className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_24px_rgba(197,161,90,0.45)]" />
            <p className="text-[11px] sm:text-xs font-['Cinzel'] font-bold uppercase tracking-[0.28em] text-[#C5A15A]">
              Dark-Fantasy Life Progression RPG · Chronicles of Aetheria
            </p>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-['Cinzel'] font-black tracking-tight text-[#F5EFE6] leading-[1.06] max-w-4xl">
            FORGE REAL-LIFE DISCIPLINE INTO{' '}
            <span className="bg-gradient-to-r from-[#E8C984] via-[#C5A15A] to-[#B08CE6] bg-clip-text text-transparent">
              HEROIC LEGEND
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-[#D9D2C5]/85 max-w-2xl leading-relaxed font-normal">
            Transform everyday workouts, daily habits, and nourishing meals into character
            progression, tempered weaponry, and epic kingdom victories across the fallen
            realm of Aetheria.
          </p>

          {/* Primary Public CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={onStartJourney}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-sm sm:text-base tracking-widest uppercase shadow-2xl shadow-black/60 transition-transform hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('world')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#141022]/90 hover:bg-[#22193a] border border-[#C5A15A]/45 text-[#F5EFE6] font-['Cinzel'] font-bold text-sm sm:text-base tracking-widest uppercase transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              EXPLORE LIFEQUEST
              <ArrowDown className="w-4 h-4 text-[#C5A15A]" />
            </button>
          </div>

          <p className="mt-6 text-xs text-[#D9D2C5]/60 font-medium tracking-wide">
            5 Playable Heroes · Camera Rep Verification · 5 Corrupted Kingdoms · Private by Design
          </p>
        </div>
      </section>

      {/* 2. THE WORLD SECTION */}
      <section
        id="world"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#C5A15A]/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#C5A15A] block">
              01 · The World
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F5EFE6] leading-tight">
              REBUILD AETHERIA AFTER THE GREAT FALL
            </h2>
            <p className="text-sm sm:text-base text-[#D9D2C5]/80 leading-relaxed">
              Once crowned by spires of eternal wisdom and strength, Aetheria fractured
              beneath Void corruption. Its five realms now lie shadowed by forgotten titans—and
              only through steady daily discipline can its citadel be restored stone by stone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#110d1b] border border-[#C5A15A]/22 space-y-1.5">
                <Compass className="w-4 h-4 text-[#C5A15A]" />
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6]">
                  Five Story Chapters
                </h3>
                <p className="text-xs text-[#D9D2C5]/70 leading-relaxed">
                  Awaken in the shattered Keep and progress through five narrative chapters that physically restore the citadel.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#110d1b] border border-[#C5A15A]/22 space-y-1.5">
                <Crown className="w-4 h-4 text-[#C5A15A]" />
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6]">
                  Five Void Kingdoms
                </h3>
                <p className="text-xs text-[#D9D2C5]/70 leading-relaxed">
                  Liberate forest, mountain, ocean, desert, and citadel realms in tactical turn-based boss encounters.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden border border-[#C5A15A]/30 bg-[#100D19] shadow-2xl aspect-[16/10]">
              <img
                src={heroAetheriaWorldImg}
                alt="Ruins and glowing citadel towers of Aetheria"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08060f] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A15A] block">
                    The Citadel Sanctuary
                  </span>
                  <p className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
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
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#C5A15A]/15 space-y-10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#C5A15A] block">
              02 · Playable Heroes
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F5EFE6]">
              CHOOSE YOUR OATH — ONCE AND FOR ALL
            </h2>
            <p className="text-sm sm:text-base text-[#D9D2C5]/75 leading-relaxed">
              Five distinct champions survived The Great Fall. Preview their abilities,
              virtues, and starting armaments below before binding one permanently to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartJourney}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-[#181228] hover:bg-[#251638] border border-[#C5A15A]/45 text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-[#C5A15A] transition-colors whitespace-nowrap cursor-pointer"
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
                className={`group rounded-2xl overflow-hidden border text-left transition-all bg-[#100D19] cursor-pointer ${
                  isSelected
                    ? 'border-[#C5A15A] ring-1 ring-[#C5A15A]/50 -translate-y-1 shadow-2xl'
                    : 'border-[#C5A15A]/18 hover:border-[#C5A15A]/55'
                }`}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#140f24]">
                  <img
                    src={getHeroArtwork(hero.id)}
                    alt={`${hero.name} — ${hero.archetype}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#100D19] via-[#100D19]/65 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A15A] block">
                      {hero.mappedClass}
                    </span>
                    <span className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6] block truncate">
                      {hero.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Selected Hero Feature Spotlight */}
        <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/28 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl">
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#C5A15A]/45 bg-[#140f24] shadow-2xl">
              <img
                key={previewHero.id}
                src={getHeroArtwork(previewHero.id)}
                alt={previewHero.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#100D19] to-transparent" />
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#C5A15A]/15 pb-3.5">
              <div>
                <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F5EFE6]">
                  {previewHero.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#C5A15A] font-medium mt-0.5">
                  {previewHero.title} · {previewHero.archetype}
                </p>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#C5A15A]">
                Class: {previewHero.mappedClass}
              </span>
            </div>

            <p className="text-sm text-[#D9D2C5]/85 leading-relaxed">
              {previewHero.greatFallOrigin}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewHero.abilities.map(ab => (
                <div
                  key={ab.name}
                  className="p-3.5 rounded-xl bg-[#161124] border border-[#7046A5]/35 space-y-1"
                >
                  <span className="text-xs font-['Cinzel'] font-bold text-[#F5EFE6] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
                    {ab.name}
                  </span>
                  <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">{ab.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A15A] block">
                  Champion Strengths
                </span>
                {previewHero.strengths.map(str => (
                  <p key={str} className="text-[#D9D2C5]/80 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#C5A15A] shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A15A] block">
                  Starting Loadout &amp; Focus
                </span>
                <p className="text-[#D9D2C5]/80">
                  Gear: {previewHero.startingEquipment.join(' · ')}
                </p>
                <p className="text-[#C5A15A] font-mono">
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
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#C5A15A]/15 space-y-10"
      >
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#C5A15A] block">
            03 · Quests &amp; Battles
          </span>
          <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F5EFE6]">
            YOUR DAILY GOALS BECOME EPIC QUESTS
          </h2>
          <p className="text-sm sm:text-base text-[#D9D2C5]/75 leading-relaxed">
            Every rep verified, balanced meal logged, and daily routine honored strengthens your champion and opens corrupted gates across Aetheria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <article className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 overflow-hidden flex flex-col">
            <div className="h-44 overflow-hidden bg-[#151022] relative">
              <img
                src={blacksmithForgeImg}
                alt="Blacksmith forge anvil"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] to-transparent" />
              <Camera className="w-5 h-5 text-[#C5A15A] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
                Aether Vision Training
              </h3>
              <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                Private on-device camera motion tracking verifies squats, push-ups, lunges, and meal scans to award genuine Player XP and Forge XP.
              </p>
            </div>
          </article>

          <article className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 overflow-hidden flex flex-col">
            <div className="h-44 overflow-hidden bg-[#151022] relative flex items-center justify-center p-6">
              <div className="grid grid-cols-2 gap-2.5 w-full text-xs">
                <div className="p-2.5 rounded-lg bg-[#19122b] border border-[#C5A15A]/25">
                  <Flame className="w-3.5 h-3.5 text-[#C5A15A] mb-1" />
                  <span className="font-semibold text-[#F5EFE6] block">Daily Rituals</span>
                  <span className="text-[10px] text-[#D9D2C5]/60">+25 XP · +25 Forge</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#19122b] border border-[#C5A15A]/25">
                  <Compass className="w-3.5 h-3.5 text-[#C5A15A] mb-1" />
                  <span className="font-semibold text-[#F5EFE6] block">Weekly Bounties</span>
                  <span className="text-[10px] text-[#D9D2C5]/60">Timed Reset Cycles</span>
                </div>
              </div>
              <Shield className="w-5 h-5 text-[#C5A15A] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
                Habit &amp; Quest Boards
              </h3>
              <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                Turn hydration, sleep recovery, mindfulness, and workouts into structured daily and weekly quests with streak multipliers and buff blessings.
              </p>
            </div>
          </article>

          <article className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 overflow-hidden flex flex-col">
            <div className="h-44 overflow-hidden bg-[#151022] relative">
              <img
                src={bossVoidStalkerImg}
                alt="Void Sovereign boss encounter"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] to-transparent" />
              <Swords className="w-5 h-5 text-[#C5A15A] absolute bottom-3 left-4" />
            </div>
            <div className="p-5 space-y-2 flex-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
                Tactical Boss Encounters
              </h3>
              <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                Read boss telegraphs, exploit elemental weaknesses, trigger active wellness buffs, and conquer multi-phase Void Sovereigns across five kingdoms.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* 5. PROGRESSION SECTION */}
      <section
        id="progression"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-24 border-b border-[#C5A15A]/15 space-y-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#C5A15A] block">
              04 · Progression &amp; Mastery
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F5EFE6]">
              LEVELS, FORGED STEEL &amp; SIX VIRTUES
            </h2>
            <p className="text-sm sm:text-base text-[#D9D2C5]/75 leading-relaxed">
              Watch real-world consistency evolve every system in your character sheet—without shortcuts or artificial bloat.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-[#100D19] border border-[#C5A15A]/22 flex items-start gap-3">
                <Hammer className="w-5 h-5 text-[#C5A15A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6]">
                    Blacksmith Forge &amp; Weapon Evolution
                  </h3>
                  <p className="text-xs text-[#D9D2C5]/70 mt-1">
                    Temper swords, staffs, bows, shields, and armor from Dormant up to Transcendent rarities with unique combat abilities.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#100D19] border border-[#C5A15A]/22 flex items-start gap-3">
                <Award className="w-5 h-5 text-[#C5A15A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6]">
                    Achievements &amp; Aether Ranks
                  </h3>
                  <p className="text-xs text-[#D9D2C5]/70 mt-1">
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
                className="p-4 rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-['Cinzel'] font-bold text-sm text-[#F5EFE6]">
                    {attr.label}
                  </span>
                  <span
                    className="font-mono text-xs font-black tracking-wider"
                    style={{ color: attr.accentHex }}
                  >
                    {attr.shortLabel}
                  </span>
                </div>
                <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                  {attr.description}
                </p>
                <p className="text-[11px] text-[#C5A15A]/85 pt-1 border-t border-[#C5A15A]/10">
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
            <span className="text-xs font-['Cinzel'] font-bold uppercase tracking-[0.24em] text-[#C5A15A] block">
              05 · Fellowship &amp; Community
            </span>
            <h2 className="text-3xl sm:text-4xl font-['Cinzel'] font-black text-[#F5EFE6]">
              RISE TOGETHER IN GUILDS &amp; STANDINGS
            </h2>
            <p className="text-sm sm:text-base text-[#D9D2C5]/75 leading-relaxed">
              Connect with fellow adventurers through supportive guild challenges, friend fellowships, tavern chat, and consistency leaderboards.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 space-y-3">
            <Trophy className="w-6 h-6 text-[#C5A15A]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
              Realm Leaderboards
            </h3>
            <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
              Track global, weekly, monthly, guild, and friend rankings built around positive habit consistency and quest victories.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 space-y-3">
            <Users className="w-6 h-6 text-[#C5A15A]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
              Friends &amp; Tavern Chat
            </h3>
            <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
              Add allies, celebrate milestone achievements, inspect public champion profiles with granular privacy controls, and coordinate in real time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#100D19] border border-[#C5A15A]/22 space-y-3">
            <Shield className="w-6 h-6 text-[#C5A15A]" />
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F5EFE6]">
              Guild Halls &amp; Raids
            </h3>
            <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
              Found or join a guild, complete shared weekly quests, and build lasting accountability with companions on the same path.
            </p>
          </div>
        </div>

        {/* Closing Call to Action Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#171029] via-[#120d1f] to-[#1d1330] border border-[#C5A15A]/35 p-8 sm:p-10 text-center space-y-5 shadow-2xl">
          <GoldenWorldTreeEmblem className="w-12 h-12 mx-auto" />
          <h3 className="font-['Cinzel'] font-black text-2xl sm:text-3xl text-[#F5EFE6]">
            AETHERIA AWAITS YOUR FIRST OATH
          </h3>
          <p className="text-sm text-[#D9D2C5]/80 max-w-xl mx-auto leading-relaxed">
            Create your account or sign back in to choose your permanent champion and begin restoring the citadel.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onStartJourney}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-sm tracking-widest uppercase shadow-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              ENTER THE WORLD
            </button>
            <button
              type="button"
              onClick={onReturningPlayer}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#100D19] hover:bg-[#22193a] border border-[#C5A15A]/40 text-[#D9D2C5] font-['Cinzel'] font-bold text-sm tracking-widest uppercase transition-colors whitespace-nowrap cursor-pointer"
            >
              RETURNING PLAYER
            </button>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-[#C5A15A]/15 py-7 px-4 sm:px-6 text-center text-xs text-[#D9D2C5]/50">
        <p>LIFEQUEST · World of Aetheria · Real-life habits, workouts &amp; nutrition forged into an RPG adventure.</p>
      </footer>
    </div>
  );
};
