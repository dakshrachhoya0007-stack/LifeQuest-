import React, { useEffect, useMemo, useState } from 'react';
import { PlayableHeroId } from '../../types/game';
import { PLAYABLE_HEROES, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { aetheriaCitadelKingdomImg, getHeroArtwork } from '../../assets/images';
import { AtmosphereParticlesCanvas } from '../Dashboard/AtmosphereParticlesCanvas';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Dumbbell,
  Footprints,
  Hand,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';

interface HeroSelectionModalProps {
  isOpen: boolean;
  initialHeroId: PlayableHeroId;
  heroLocked?: boolean;
  canClose?: boolean;
  onConfirm: (heroId: PlayableHeroId) => Promise<{ success: boolean; error?: string } | void>;
  onClose?: () => void;
}

export const HeroSelectionModal: React.FC<HeroSelectionModalProps> = ({
  isOpen,
  initialHeroId,
  heroLocked = false,
  canClose = false,
  onConfirm,
  onClose,
}) => {
  const [focusedHeroId, setFocusedHeroId] = useState<PlayableHeroId>(initialHeroId);
  const [confirmingFinalLock, setConfirmingFinalLock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const focusedHero = useMemo(
    () => PLAYABLE_HEROES.find(h => h.id === focusedHeroId) || PLAYABLE_HEROES[0],
    [focusedHeroId]
  );

  useEffect(() => {
    if (isOpen) {
      setFocusedHeroId(initialHeroId);
      setConfirmingFinalLock(false);
      setErrorMsg(null);
    }
  }, [isOpen, initialHeroId]);

  if (!isOpen || heroLocked) return null;

  const handleFinalConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await onConfirm(focusedHeroId);
      if (res && res.success === false) {
        setErrorMsg(res.error || 'Could not confirm your champion right now.');
        setConfirmingFinalLock(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save your champion selection.');
      setConfirmingFinalLock(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#061225] text-[#FFFFFF] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Permanent Champion Selection"
    >
      {/* Top Bar */}
      <header className="px-5 py-3.5 border-b border-[#1677FF]/25 bg-[#0A1930] flex items-center justify-between gap-4 shrink-0">
        <div>
          <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#00D9FF] block">
            The Great Fall · One-Time Oath of Aetheria
          </span>
          <h2 className="text-lg sm:text-xl font-black font-['Cinzel'] text-[#FFFFFF]">
            CHOOSE YOUR PERMANENT CHAMPION
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-[#00D9FF] font-medium">
            <Lock className="w-3.5 h-3.5" />
            Permanent One-Time Selection · Cannot Be Changed Later
          </span>
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#102440] hover:bg-[#1677FF]/25 border border-[#1677FF]/40 text-white"
              aria-label="Close hero selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left / Center: High-Resolution Character Artwork Showcase */}
        <div className="lg:col-span-6 relative min-h-[420px] sm:min-h-[520px] bg-[#061225] border-b lg:border-b-0 lg:border-r border-[#1677FF]/25 flex flex-col justify-between overflow-hidden">
          {/* Atmospheric Citadel Backdrop */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={aetheriaCitadelKingdomImg}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-20 scale-105 filter blur-[1px]"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 42%, ${focusedHero.accentHex}24 0%, rgba(10, 25, 48, 0.85) 64%, #061225 100%)`,
              }}
            />
            <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={false} />
          </div>

          {/* Framed Full-Body Hero Illustration */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-5 sm:p-8">
            <div
              className="relative w-full max-w-[360px] sm:max-w-[410px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#00D9FF]/45 shadow-2xl bg-[#102440]"
              style={{
                boxShadow: `0 25px 60px -15px rgba(2, 8, 20, 0.9), 0 0 40px -12px ${focusedHero.accentHex}45`,
              }}
            >
              <img
                key={focusedHero.id}
                src={getHeroArtwork(focusedHero.id)}
                alt={`${focusedHero.name} — ${focusedHero.archetype}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top transition-transform duration-500"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#061225] via-[#061225]/70 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest font-bold block"
                    style={{ color: focusedHero.accentHex }}
                  >
                    {focusedHero.mappedClass} Class · {focusedHero.archetype}
                  </span>
                  <h3 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-[#FFFFFF]">
                    {focusedHero.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-[#0A1930]/90 border border-[#00D9FF]/35 text-[#00D9FF] shrink-0">
                  {focusedHero.introFlourishLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Artwork Thumb Strip for Quick Preview */}
          <div className="relative z-10 px-4 py-3 bg-[#0A1930]/95 border-t border-[#1677FF]/25 flex items-center justify-center gap-2.5 overflow-x-auto">
            {PLAYABLE_HEROES.map(hero => {
              const active = hero.id === focusedHeroId;
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => {
                    setFocusedHeroId(hero.id);
                    setConfirmingFinalLock(false);
                    setErrorMsg(null);
                  }}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 ${
                    active
                      ? 'bg-[#102440] border-[#00D9FF] shadow-[0_0_16px_rgba(0,217,255,0.22)]'
                      : 'bg-[#061225] border-[#1677FF]/25 hover:border-[#00D9FF]/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getHeroArtwork(hero.id)}
                    alt={hero.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-10 rounded-lg object-cover object-top border border-[#1677FF]/40"
                  />
                  <div className="text-left hidden sm:block">
                    <span className="text-[11px] font-['Cinzel'] font-bold text-[#FFFFFF] block leading-tight">
                      {hero.name.replace(/^The\s+/, '')}
                    </span>
                    <span className="text-[9px] text-[#00D9FF] block leading-tight">
                      {hero.mappedClass}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Hero Dossier, Abilities, Strengths & Permanent Confirmation */}
        <div className="lg:col-span-6 p-5 sm:p-6 lg:p-8 bg-[#0A1930] flex flex-col justify-between gap-5 overflow-y-auto">
          <div className="space-y-5">
            {/* Hero Roster Picker Cards */}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#00D9FF] font-semibold block mb-2">
                Preview All 5 Champions Before Binding Your Account
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {PLAYABLE_HEROES.map(hero => {
                  const selected = hero.id === focusedHeroId;
                  return (
                    <button
                      key={hero.id}
                      type="button"
                      onClick={() => {
                        setFocusedHeroId(hero.id);
                        setConfirmingFinalLock(false);
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#102440] border-[#00D9FF] shadow-[0_0_16px_rgba(0,217,255,0.18)]'
                          : 'bg-[#061225] border-[#1677FF]/25 hover:border-[#00D9FF]/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-['Cinzel'] font-bold text-[#FFFFFF] block truncate">
                          {hero.name}
                        </span>
                        <span className="text-[10px] text-[#A9B8CC] block truncate">
                          {hero.archetype}
                        </span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#00D9FF] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/75 border border-rose-700/70 text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selected Hero Lore, Abilities, Strengths & Loadout */}
            <div className="p-5 rounded-2xl bg-[#102440]/90 border border-[#1677FF]/35 space-y-4">
              <div className="flex items-start justify-between gap-2 flex-wrap border-b border-[#1677FF]/25 pb-3">
                <div>
                  <h3 className="font-['Cinzel'] font-black text-xl text-[#FFFFFF]">
                    {focusedHero.name}
                  </h3>
                  <p className="text-xs text-[#00D9FF] font-medium mt-0.5">
                    {focusedHero.title}
                  </p>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#00D9FF] font-bold">
                  {focusedHero.mappedClass} Class
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest text-[#A9B8CC] font-semibold block">
                  Origin After The Great Fall
                </span>
                <p className="text-xs text-[#FFFFFF]/90 leading-relaxed">
                  {focusedHero.greatFallOrigin}
                </p>
              </div>

              <p className="text-xs text-[#A9B8CC] leading-relaxed border-t border-[#1677FF]/20 pt-3">
                {focusedHero.roleSummary}
              </p>

              {/* Signature Abilities */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Signature Abilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {focusedHero.abilities.map(ab => (
                    <div
                      key={ab.name}
                      className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 space-y-1"
                    >
                      <span className="text-xs font-['Cinzel'] font-bold text-[#FFFFFF] block">
                        {ab.name}
                      </span>
                      <p className="text-[11px] text-[#A9B8CC] leading-snug">
                        {ab.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Bodyweight Combat & Attribute Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" /> Bodyweight Combat
                  </span>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-[#FFFFFF]/90 flex items-center gap-1.5">
                      <Hand className="w-2.5 h-2.5 text-[#00D9FF] shrink-0" />
                      <span>Hands: {focusedHero.bodyweightDisciplines.handsFocus}</span>
                    </li>
                    <li className="text-[11px] text-[#FFFFFF]/90 flex items-center gap-1.5">
                      <Footprints className="w-2.5 h-2.5 text-[#00D9FF] shrink-0" />
                      <span>Legs: {focusedHero.bodyweightDisciplines.legsFocus}</span>
                    </li>
                  </ul>
                  <p className="text-[10px] text-[#A9B8CC] leading-snug pt-0.5">
                    {focusedHero.bodyweightDisciplines.conditioningStyle}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Attribute Focus
                  </span>
                  <div className="space-y-1">
                    {focusedHero.attributeFocus.map(attrKey => {
                      const meta = RPG_ATTRIBUTE_META.find(m => m.key === attrKey);
                      return (
                        <div key={attrKey} className="text-[11px] flex items-center justify-between">
                          <span className="text-[#FFFFFF]/90 font-medium">{meta?.label || attrKey}</span>
                          <span className="font-mono text-[10px] text-[#00D9FF]">{meta?.shortLabel} +Focus</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Key Strengths List */}
              <div className="p-3 rounded-xl bg-[#0A1930] border border-[#1677FF]/25 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold block">
                  Champion Strengths
                </span>
                <ul className="space-y-1">
                  {focusedHero.strengths.map(s => (
                    <li key={s} className="text-[11px] text-[#A9B8CC] flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-[#00D9FF] shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step 1 -> Step 2 Permanent Lock Confirmation */}
          <div className="pt-2 space-y-3">
            {!confirmingFinalLock ? (
              <>
                <div className="p-3 rounded-xl bg-[#102440] border border-[#1677FF]/35 flex items-start gap-2.5 text-xs text-[#A9B8CC]">
                  <Lock className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#00D9FF]">One-Time Account Oath:</strong>{' '}
                    You may preview every hero freely here, but once confirmed, your chosen hero is permanently bound to your account and cannot be changed afterward.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmingFinalLock(true)}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2684FF] hover:to-[#00D9FF] border border-[#00D9FF]/45 text-white font-['Cinzel'] font-black text-sm tracking-wider shadow-[0_6px_22px_rgba(22,119,255,0.4)] hover:shadow-[0_0_24px_rgba(0,217,255,0.5)] transition-all"
                >
                  CHOOSE {focusedHero.name.toUpperCase()}
                </button>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-[#102440] border-2 border-[#00D9FF] space-y-3 shadow-[0_0_32px_rgba(0,217,255,0.2)]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#00D9FF] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-['Cinzel'] font-black text-sm text-[#FFFFFF]">
                      FINAL CONFIRMATION: LOCK {focusedHero.name.toUpperCase()}?
                    </h4>
                    <p className="text-xs text-[#A9B8CC] mt-1 leading-relaxed">
                      Once locked, <strong className="text-[#00D9FF]">{focusedHero.name}</strong> ({focusedHero.mappedClass}) becomes your permanent champion for this account and <strong className="text-[#FFFFFF]">cannot be changed afterward</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setConfirmingFinalLock(false)}
                    className="sm:w-1/2 py-3 px-4 rounded-xl bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/45 hover:border-[#00D9FF]/70 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Go Back &amp; Preview
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleFinalConfirm}
                    className="sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2684FF] hover:to-[#00D9FF] disabled:opacity-60 border border-[#00D9FF]/50 text-white font-['Cinzel'] font-black text-xs tracking-wider shadow-[0_6px_20px_rgba(22,119,255,0.4)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {saving ? 'BINDING OATH...' : 'CONFIRM PERMANENT HERO'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
