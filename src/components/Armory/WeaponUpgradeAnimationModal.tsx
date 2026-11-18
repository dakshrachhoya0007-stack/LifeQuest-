import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { AetherRankStage, Weapon, WeaponRarity } from '../../types/game';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import { getRarityStyle, isBeyondMythicRarity } from '../../utils/rarityStyles';
import { sound } from '../../utils/audio';
import { ArrowRight, Check, FastForward, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface WeaponUpgradeAnimationModalProps {
  isOpen: boolean;
  mode: 'upgrade' | 'evolution' | 'ascension';
  weapon: Weapon;
  previousWeaponId?: string;
  previousRarity?: WeaponRarity;
  previousLevel: number;
  previousAttack: number;
  previousDefense: number;
  previousStage?: AetherRankStage;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
}

type AnimationPhase = 'gathering' | 'runes' | 'transforming' | 'revealed';

export const WeaponUpgradeAnimationModal: React.FC<WeaponUpgradeAnimationModalProps> = ({
  isOpen,
  mode,
  weapon,
  previousWeaponId,
  previousRarity,
  previousLevel,
  previousAttack,
  previousDefense,
  previousStage,
  soundEnabled,
  onToggleSound,
  onClose,
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('gathering');
  const rarityStyle = getRarityStyle(weapon.rarity);
  const beyondMythic = isBeyondMythicRarity(weapon.rarity);

  useEffect(() => {
    if (!isOpen) return;

    setPhase('gathering');
    sound.playUpgradeCharge();

    const tRunes = setTimeout(() => {
      setPhase('runes');
    }, 650);

    const tTransform = setTimeout(() => {
      setPhase('transforming');
      sound.playForgeUpgrade();
    }, 1400);

    const tReveal = setTimeout(() => {
      setPhase('revealed');
      if (mode === 'ascension' || mode === 'evolution' || beyondMythic) {
        sound.playRarityAscension(weapon.rarity);
      } else {
        sound.playUpgradeBurst();
      }
      confetti({
        particleCount: mode === 'ascension' ? 165 : mode === 'evolution' ? 130 : 85,
        spread: mode === 'ascension' ? 105 : 85,
        origin: { y: 0.5 },
        colors: [rarityStyle.accentHex, rarityStyle.secondaryHex, '#fbbf24', '#ffffff'],
      });
    }, 2150);

    return () => {
      clearTimeout(tRunes);
      clearTimeout(tTransform);
      clearTimeout(tReveal);
    };
  }, [
    isOpen,
    weapon.id,
    weapon.level,
    weapon.evolutionStage,
    weapon.rarity,
    mode,
    beyondMythic,
    rarityStyle.accentHex,
    rarityStyle.secondaryHex,
  ]);

  if (!isOpen) return null;

  const handleSkip = () => {
    setPhase('revealed');
    if (mode === 'ascension' || beyondMythic) {
      sound.playRarityAscension(weapon.rarity);
    } else {
      sound.playUpgradeBurst();
    }
  };

  const atkGain = Math.max(0, weapon.baseAttack - previousAttack);
  const defGain = Math.max(0, weapon.baseDefense - previousDefense);

  const displayItemId =
    mode === 'ascension' && previousWeaponId && (phase === 'gathering' || phase === 'runes')
      ? previousWeaponId
      : weapon.id;

  const displayRarity =
    mode === 'ascension' && previousRarity && (phase === 'gathering' || phase === 'runes')
      ? previousRarity
      : weapon.rarity;

  const subtitleText =
    mode === 'ascension'
      ? `${weapon.rarity.toUpperCase()} RARITY ASCENSION`
      : mode === 'evolution'
      ? 'AETHERIC RANK EVOLUTION'
      : 'BLACKSMITH TEMPERING COMPLETE';

  const rarityEffectClass =
    weapon.rarity === 'Eternal'
      ? 'animate-eternal-shift'
      : weapon.rarity === 'Celestial'
      ? 'animate-celestial-drift'
      : weapon.rarity === 'Divine'
      ? 'animate-divine-halo'
      : weapon.rarity === 'Ascendant'
      ? 'animate-ascendant-pulse'
      : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Weapon Upgrade Celebration"
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#170e2e] via-[#0b0618] to-[#0f0820] border-2 ${rarityStyle.border} ${rarityStyle.cardGlow} p-6 sm:p-8 text-center shadow-2xl overflow-hidden`}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 42%, ${rarityStyle.accentHex}38 0%, ${rarityStyle.secondaryHex}14 45%, transparent 72%)`,
            opacity: phase === 'transforming' || phase === 'revealed' ? 1 : 0.55,
          }}
        />

        <div className="relative z-20 flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0616]/90 border border-purple-800/70 text-xs font-medium text-purple-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
            title={soundEnabled ? 'Mute upgrade sound FX' : 'Enable upgrade sound FX'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {phase !== 'revealed' && (
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0616]/90 border border-purple-800/70 text-xs font-semibold text-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip Animation</span>
            </button>
          )}
        </div>

        <div className="relative z-10 space-y-1 mb-5">
          <span
            className="text-[11px] uppercase font-bold tracking-widest font-['Cinzel'] block"
            style={{ color: rarityStyle.accentHex }}
          >
            {subtitleText}
          </span>
          <h2 className="font-['Cinzel'] font-black text-xl sm:text-2xl text-white">
            {weapon.name}
          </h2>
        </div>

        <div className="relative z-10 mx-auto w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-2">
          <div
            className={`absolute inset-1 rounded-full border-2 border-dashed transition-all duration-700 animate-spin ${
              phase === 'gathering' ? 'scale-95 opacity-60' : phase === 'runes' ? 'scale-105 opacity-100' : 'scale-110 opacity-90'
            }`}
            style={{
              borderColor: rarityStyle.accentHex,
              animationDuration: phase === 'transforming' ? '2.2s' : '7s',
            }}
          />

          <div
            className={`absolute inset-6 rounded-full border transition-all duration-500 animate-spin ${
              phase === 'runes' || phase === 'transforming' ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
            }`}
            style={{
              borderColor: rarityStyle.secondaryHex,
              animationDirection: 'reverse',
              animationDuration: '5s',
            }}
          >
            {(beyondMythic ? ['✦', '◈', '✧', '❋'] : ['ᚠ', 'ᚱ', 'ᛏ', 'ᛟ']).map((rune, idx) => {
              const positions = [
                'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
                'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
                'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
              ];
              return (
                <span
                  key={rune}
                  className={`absolute ${positions[idx]} w-6 h-6 rounded-full bg-[#090514] border flex items-center justify-center text-xs font-bold shadow`}
                  style={{
                    borderColor: rarityStyle.accentHex,
                    color: rarityStyle.accentHex,
                  }}
                >
                  {rune}
                </span>
              );
            })}
          </div>

          {(phase === 'runes' || phase === 'transforming') && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, idx) => {
                const angle = (idx / 12) * Math.PI * 2;
                const radius = phase === 'transforming' ? 28 : 90;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <span
                    key={idx}
                    className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full transition-all duration-700"
                    style={{
                      transform: `translate(${x - 5}px, ${y - 5}px)`,
                      backgroundColor: idx % 2 === 0 ? rarityStyle.accentHex : rarityStyle.secondaryHex,
                      boxShadow: `0 0 14px ${rarityStyle.accentHex}`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {phase === 'revealed' && (
            <div
              className="absolute inset-4 rounded-full opacity-20 blur-md pointer-events-none transition-opacity duration-500"
              style={{ backgroundColor: rarityStyle.accentHex }}
            />
          )}

          <div
            className={`relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-[#080412]/90 border-2 ${rarityStyle.border} p-3 flex items-center justify-center shadow-2xl transition-all duration-700 ${rarityEffectClass} ${
              phase === 'gathering'
                ? 'scale-95 brightness-90'
                : phase === 'runes'
                ? 'scale-105 brightness-110'
                : phase === 'transforming'
                ? 'scale-115 brightness-150 drop-shadow-[0_0_26px_rgba(251,191,36,0.95)]'
                : 'scale-105 brightness-110'
            }`}
          >
            <EquipmentIllustration
              itemId={displayItemId}
              rarity={displayRarity}
              level={weapon.level}
              evolutionStage={weapon.evolutionStage}
            />
          </div>
        </div>

        {phase !== 'revealed' ? (
          <div className="relative z-10 mt-4 space-y-1.5 min-h-[112px] flex flex-col justify-center">
            <p className="font-['Cinzel'] font-bold text-sm text-amber-300 tracking-wide">
              {phase === 'gathering'
                ? 'GATHERING AETHERIC ENERGY...'
                : phase === 'runes'
                ? mode === 'ascension'
                  ? 'UNSEALING BEYOND-MYTHICAL SIGILS...'
                  : 'BINDING RUNIC INSCRIPTIONS...'
                : mode === 'ascension'
                ? `ASCENDING TO ${weapon.rarity.toUpperCase()} TIER...`
                : 'REFORGING ITEM ESSENCE...'}
            </p>
            <p className="text-xs text-slate-400">
              Channeling your discipline into tempered steel and arcane power.
            </p>
          </div>
        ) : (
          <div className="relative z-10 mt-4 space-y-4 animate-in zoom-in-95">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className={`text-[11px] uppercase px-2.5 py-0.5 rounded ${rarityStyle.badge}`}>
                Tier {rarityStyle.shortTag} · {weapon.rarity}
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-purple-950/90 border border-purple-700 text-purple-200">
                {weapon.evolutionStage} Stage
              </span>
              {weapon.awakened && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-teal-950/90 border border-teal-500 text-teal-200 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Awakened
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#080411]/95 border border-purple-900/70 rounded-2xl p-3.5 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">
                  {mode === 'ascension' ? 'Rarity Tier' : mode === 'evolution' ? 'Stage' : 'Level'}
                </span>
                <div className="flex items-center justify-center gap-1 mt-1 font-bold">
                  <span className="text-slate-400">
                    {mode === 'ascension'
                      ? previousRarity || 'Mythic'
                      : mode === 'evolution'
                      ? previousStage || 'Dormant'
                      : `Lv.${previousLevel}`}
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-300">
                    {mode === 'ascension'
                      ? weapon.rarity
                      : mode === 'evolution'
                      ? weapon.evolutionStage
                      : `Lv.${weapon.level}`}
                  </span>
                </div>
              </div>

              <div className="border-x border-purple-950">
                <span className="text-[10px] uppercase text-slate-400 block">Attack</span>
                <div className="mt-1 font-bold text-purple-300 tabular-nums">
                  +{weapon.baseAttack}{' '}
                  {atkGain > 0 && <span className="text-emerald-400 text-[10px]">(+{atkGain})</span>}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Defense</span>
                <div className="mt-1 font-bold text-indigo-300 tabular-nums">
                  +{weapon.baseDefense}{' '}
                  {defGain > 0 && <span className="text-emerald-400 text-[10px]">(+{defGain})</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-[#080411]/85 border border-purple-950 rounded-xl p-2 text-[10px] font-mono">
              <div>
                <span className="text-slate-500 block">CRIT</span>
                <span className="text-amber-300 font-bold">{weapon.critChance ?? 6}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">CRIT DMG</span>
                <span className="text-rose-300 font-bold">{weapon.critDamage ?? 180}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">SPEED</span>
                <span className="text-cyan-300 font-bold">{weapon.speed ?? 65}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ELEM</span>
                <span className="text-purple-200 font-bold">{weapon.element ?? 'Physical'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-['Cinzel'] font-black text-xs tracking-wider shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-95 whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              CONTINUE WITH {mode === 'ascension' ? weapon.rarity.toUpperCase() : 'UPGRADED'}{' '}
              {weapon.category === 'Shields' ? 'SHIELD' : weapon.category === 'Armour' ? 'ARMOUR' : 'WEAPON'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
