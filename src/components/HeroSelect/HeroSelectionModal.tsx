import React, { useEffect, useMemo, useState } from 'react';
import { PlayableHeroId } from '../../types/game';
import { PLAYABLE_HEROES, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { aetheriaCitadelKingdomImg, getHeroArtwork } from '../../assets/images';
import { AtmosphereParticlesCanvas } from '../Dashboard/world3d/AtmosphereParticlesCanvas';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Lock,
  Shield,
  Sparkles,
  Swords,
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
      className="fixed inset-0 z-50 bg-[#0b0813] text-[#D9D2C5] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Permanent Champion Selection"
    >
      {/* Top Bar */}
      <header className="px-5 py-3.5 border-b border-[#C5A15A]/20 bg-[#100D19] flex items-center justify-between gap-4 shrink-0">
        <div>
          <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] block">
            The Great Fall · One-Time Oath of Aetheria
          </span>
          <h2 className="text-lg sm:text-xl font-black font-['Cinzel'] text-[#D9D2C5]">
            CHOOSE YOUR PERMANENT CHAMPION
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-[#C5A15A] font-medium">
            <Lock className="w-3.5 h-3.5" />
            Permanent One-Time Selection · Cannot Be Changed Later
          </span>
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#191329] hover:bg-[#251638] border border-[#C5A15A]/30 text-[#D9D2C5]"
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
        <div className="lg:col-span-6 relative min-h-[420px] sm:min-h-[520px] bg-[#0d0a16] border-b lg:border-b-0 lg:border-r border-[#C5A15A]/20 flex flex-col justify-between overflow-hidden">
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
                background: `radial-gradient(circle at 50% 42%, ${focusedHero.accentHex}24 0%, rgba(11, 8, 19, 0.85) 64%, #0b0813 100%)`,
              }}
            />
            <AtmosphereParticlesCanvas qualityMode="rich" reducedMotion={false} />
          </div>

          {/* Framed Full-Body Hero Illustration */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-5 sm:p-8">
            <div
              className="relative w-full max-w-[360px] sm:max-w-[410px] aspect-[3/4] rounded-2xl overflow-hidden border border-[#C5A15A]/45 shadow-2xl bg-[#100D19]"
              style={{
                boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px -12px ${focusedHero.accentHex}45`,
              }}
            >
              <img
                key={focusedHero.id}
                src={getHeroArtwork(focusedHero.id)}
                alt={`${focusedHero.name} — ${focusedHero.archetype}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top transition-transform duration-500"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0b0813] via-[#0b0813]/70 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest font-bold block"
                    style={{ color: focusedHero.accentHex }}
                  >
                    {focusedHero.mappedClass} Class · {focusedHero.archetype}
                  </span>
                  <h3 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-[#F5EFE6]">
                    {focusedHero.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-[#100D19]/90 border border-[#C5A15A]/35 text-[#C5A15A] shrink-0">
                  {focusedHero.introFlourishLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Artwork Thumb Strip for Quick Preview */}
          <div className="relative z-10 px-4 py-3 bg-[#100D19]/92 border-t border-[#C5A15A]/20 flex items-center justify-center gap-2.5 overflow-x-auto">
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
                      ? 'bg-[#251638] border-[#C5A15A] shadow-md'
                      : 'bg-[#151024] border-[#C5A15A]/15 hover:border-[#C5A15A]/45 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getHeroArtwork(hero.id)}
                    alt={hero.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-10 rounded-lg object-cover object-top border border-[#C5A15A]/35"
                  />
                  <div className="text-left hidden sm:block">
                    <span className="text-[11px] font-['Cinzel'] font-bold text-[#D9D2C5] block leading-tight">
                      {hero.name.replace(/^The\s+/, '')}
                    </span>
                    <span className="text-[9px] text-[#C5A15A] block leading-tight">
                      {hero.mappedClass}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Hero Dossier, Abilities, Strengths & Permanent Confirmation */}
        <div className="lg:col-span-6 p-5 sm:p-6 lg:p-8 bg-[#100D19] flex flex-col justify-between gap-5 overflow-y-auto">
          <div className="space-y-5">
            {/* Hero Roster Picker Cards */}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#C5A15A] font-semibold block mb-2">
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
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#251638] border-[#C5A15A] shadow-lg'
                          : 'bg-[#151024] border-[#C5A15A]/18 hover:border-[#C5A15A]/45'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-['Cinzel'] font-bold text-[#D9D2C5] block truncate">
                          {hero.name}
                        </span>
                        <span className="text-[10px] text-[#C5A15A] block truncate">
                          {hero.archetype}
                        </span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#C5A15A] shrink-0" />}
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
            <div className="p-5 rounded-2xl bg-[#161124] border border-[#C5A15A]/25 space-y-4">
              <div className="flex items-start justify-between gap-2 flex-wrap border-b border-[#C5A15A]/15 pb-3">
                <div>
                  <h3 className="font-['Cinzel'] font-black text-xl text-[#D9D2C5]">
                    {focusedHero.name}
                  </h3>
                  <p className="text-xs text-[#C5A15A] font-medium mt-0.5">
                    {focusedHero.title}
                  </p>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A15A] font-bold">
                  {focusedHero.mappedClass} Class
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest text-[#D9D2C5]/60 font-semibold block">
                  Origin After The Great Fall
                </span>
                <p className="text-xs text-[#D9D2C5]/90 leading-relaxed">
                  {focusedHero.greatFallOrigin}
                </p>
              </div>

              <p className="text-xs text-[#D9D2C5]/75 leading-relaxed border-t border-[#C5A15A]/15 pt-3">
                {focusedHero.roleSummary}
              </p>

              {/* Signature Abilities */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Signature Abilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {focusedHero.abilities.map(ab => (
                    <div
                      key={ab.name}
                      className="p-3 rounded-xl bg-[#100D19] border border-[#7046A5]/35 space-y-1"
                    >
                      <span className="text-xs font-['Cinzel'] font-bold text-[#D9D2C5] block">
                        {ab.name}
                      </span>
                      <p className="text-[11px] text-[#D9D2C5]/70 leading-snug">
                        {ab.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Strengths, Starting Gear & Attribute Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#100D19] border border-[#7046A5]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                    <Swords className="w-3 h-3" /> Starting Gear
                  </span>
                  <ul className="space-y-1">
                    {focusedHero.startingEquipment.map(item => (
                      <li key={item} className="text-[11px] text-[#D9D2C5]/85 flex items-center gap-1.5">
                        <Shield className="w-2.5 h-2.5 text-[#C5A15A] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[#100D19] border border-[#7046A5]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Attribute Focus
                  </span>
                  <div className="space-y-1">
                    {focusedHero.attributeFocus.map(attrKey => {
                      const meta = RPG_ATTRIBUTE_META.find(m => m.key === attrKey);
                      return (
                        <div key={attrKey} className="text-[11px] flex items-center justify-between">
                          <span className="text-[#D9D2C5]/90 font-medium">{meta?.label || attrKey}</span>
                          <span className="font-mono text-[10px] text-[#C5A15A]">{meta?.shortLabel} +Focus</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Key Strengths List */}
              <div className="p-3 rounded-xl bg-[#100D19] border border-[#C5A15A]/18 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold block">
                  Champion Strengths
                </span>
                <ul className="space-y-1">
                  {focusedHero.strengths.map(s => (
                    <li key={s} className="text-[11px] text-[#D9D2C5]/85 flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-[#C5A15A] shrink-0 mt-0.5" />
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
                <div className="p-3 rounded-xl bg-[#1a132c] border border-[#C5A15A]/30 flex items-start gap-2.5 text-xs text-[#D9D2C5]/85">
                  <Lock className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#C5A15A]">One-Time Account Oath:</strong>{' '}
                    You may preview every hero freely here, but once confirmed, your chosen hero is permanently bound to your account and cannot be changed afterward.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmingFinalLock(true)}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-black text-sm tracking-wider shadow-xl transition-colors"
                >
                  CHOOSE {focusedHero.name.toUpperCase()}
                </button>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-[#1b1126] border-2 border-[#C5A15A] space-y-3 shadow-2xl">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#C5A15A] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-['Cinzel'] font-black text-sm text-[#F5EFE6]">
                      FINAL CONFIRMATION: LOCK {focusedHero.name.toUpperCase()}?
                    </h4>
                    <p className="text-xs text-[#D9D2C5]/85 mt-1 leading-relaxed">
                      Once locked, <strong className="text-[#C5A15A]">{focusedHero.name}</strong> ({focusedHero.mappedClass}) becomes your permanent champion for this account and <strong className="text-[#F5EFE6]">cannot be changed afterward</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setConfirmingFinalLock(false)}
                    className="sm:w-1/2 py-3 px-4 rounded-xl bg-[#100D19] hover:bg-[#251638] border border-[#C5A15A]/30 text-xs font-semibold text-[#D9D2C5] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Go Back &amp; Preview
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleFinalConfirm}
                    className="sm:w-1/2 py-3 px-4 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] disabled:opacity-60 text-[#100D19] font-['Cinzel'] font-black text-xs tracking-wider shadow-xl transition-colors flex items-center justify-center gap-1.5"
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
