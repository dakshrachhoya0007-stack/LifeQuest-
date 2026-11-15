import React, { useMemo, useState } from 'react';
import { Hammer, Shield, Sparkles, Swords, User, Users } from 'lucide-react';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import {
  Buff,
  EquippedGear,
  PlayableHeroId,
  PlayerStats,
  RpgAttributes,
  UserAccount,
  Weapon,
} from '../../types/game';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { getRarityStyle } from '../../utils/rarityStyles';
import {
  AetheriaRelicCanvas,
  probeWebGLCapabilities,
} from './world3d/AetheriaRelicCanvas';

interface ChampionArsenalShowcaseProps {
  user: UserAccount | null;
  stats: PlayerStats;
  selectedHeroId: PlayableHeroId;
  heroLocked?: boolean;
  rpgAttributes: RpgAttributes;
  weapons: Weapon[];
  equippedWeapon: Weapon;
  equippedGear: EquippedGear;
  activeBuffs: Buff[];
  onNavigate: (tab: string) => void;
  onOpenHeroSelect: () => void;
}

export const ChampionArsenalShowcase: React.FC<ChampionArsenalShowcaseProps> = ({
  user,
  stats,
  selectedHeroId,
  heroLocked = true,
  rpgAttributes,
  weapons,
  equippedWeapon,
  equippedGear,
  activeBuffs,
  onNavigate,
  onOpenHeroSelect,
}) => {
  const gpuProbe = useMemo(() => probeWebGLCapabilities(), []);
  const [relicWebglFailed, setRelicWebglFailed] = useState(!gpuProbe.webglAvailable);
  const heroDef = useMemo(() => getHeroById(selectedHeroId), [selectedHeroId]);

  const offHand = equippedGear.offHandId
    ? weapons.find(w => w.id === equippedGear.offHandId && w.id !== equippedWeapon.id)
    : undefined;
  const armour = equippedGear.armourId
    ? weapons.find(w => w.id === equippedGear.armourId)
    : undefined;
  const helmet = equippedGear.helmetId
    ? weapons.find(w => w.id === equippedGear.helmetId)
    : undefined;
  const accessory = equippedGear.accessoryId
    ? weapons.find(w => w.id === equippedGear.accessoryId)
    : undefined;

  const equippedList = [equippedWeapon, offHand, armour, helmet, accessory].filter(
    (item): item is Weapon => Boolean(item)
  );

  const rawAtk = equippedList.reduce((sum, item) => sum + item.baseAttack, 0);
  const rawDef = equippedList.reduce((sum, item) => sum + item.baseDefense, 0);
  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const totalAttack = Math.round(rawAtk * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDef * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critChance = 10 + (equippedWeapon.critChance ?? 5);

  const rarityStyle = getRarityStyle(equippedWeapon.rarity);

  return (
    <section
      aria-label="Six Independent Champion Attributes and Equipped Armament"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5"
    >
      {/* LEFT (7 cols): Hero Dossier & Six Independent Attributes */}
      <div className="xl:col-span-7 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A15A]/15 pb-3.5">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#C5A15A] font-semibold block">
                {heroDef.name} · {heroDef.title}
              </span>
              <h2 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#D9D2C5]">
                {user?.characterName || user?.username || 'Champion'} · Six Realm Virtues
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!heroLocked && (
                <button
                  type="button"
                  onClick={onOpenHeroSelect}
                  className="px-3 py-1.5 rounded-lg bg-[#251638] hover:bg-[#7046A5]/45 border border-[#C5A15A]/35 text-[11px] font-semibold text-[#C5A15A] flex items-center gap-1.5 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  Choose Hero
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('character')}
                className="px-3 py-1.5 rounded-lg bg-[#161124] hover:bg-[#251638] border border-[#7046A5]/40 text-[11px] font-semibold text-[#D9D2C5] flex items-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#C5A15A]" />
                Full Sheet
              </button>
            </div>
          </div>

          {/* Six Independent RPG Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RPG_ATTRIBUTE_META.map(attr => {
              const val = rpgAttributes[attr.key];
              const pct = Math.min(100, Math.round((val / 40) * 100));
              const isFocus = heroDef.attributeFocus.includes(attr.key);
              return (
                <div
                  key={attr.key}
                  className={`p-3 rounded-xl border transition-colors ${
                    isFocus
                      ? 'bg-[#1a132c] border-[#C5A15A]/45'
                      : 'bg-[#151023] border-[#C5A15A]/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-['Cinzel'] font-bold text-[#D9D2C5] flex items-center gap-1.5">
                      {attr.label}
                      {isFocus && (
                        <span className="text-[9px] font-mono uppercase text-[#C5A15A]">
                          Affinity
                        </span>
                      )}
                    </span>
                    <span
                      className="font-mono text-sm font-black tabular-nums"
                      style={{ color: attr.accentHex }}
                    >
                      {val}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#251638] overflow-hidden mb-1.5">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: attr.accentHex }}
                    />
                  </div>
                  <p className="text-[10px] text-[#D9D2C5]/60 leading-snug">
                    {attr.realLifeSource}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combat Summary & Secondary Equipment Strip */}
        <div className="space-y-3 pt-2 border-t border-[#C5A15A]/15">
          <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
            <div className="p-2.5 rounded-xl bg-[#251638]/40 border border-[#7046A5]/25">
              <span className="text-[10px] text-[#D9D2C5]/60 uppercase block">Total ATK</span>
              <span className="text-sm font-bold text-[#D9D2C5] tabular-nums">+{totalAttack}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#251638]/40 border border-[#7046A5]/25">
              <span className="text-[10px] text-[#D9D2C5]/60 uppercase block">Total DEF</span>
              <span className="text-sm font-bold text-[#D9D2C5] tabular-nums">+{totalDefense}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#251638]/40 border border-[#7046A5]/25">
              <span className="text-[10px] text-[#D9D2C5]/60 uppercase block">Crit Rate</span>
              <span className="text-sm font-bold text-[#C5A15A] tabular-nums">{critChance}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Off-Hand', item: offHand },
              { label: 'Armour', item: armour },
              { label: 'Helm', item: helmet },
              { label: 'Relic', item: accessory },
            ].map(slot => (
              <button
                key={slot.label}
                type="button"
                onClick={() => onNavigate(slot.item ? 'armory' : 'store')}
                className="p-2 rounded-lg bg-[#161124] hover:bg-[#251638]/70 border border-[#C5A15A]/15 hover:border-[#C5A15A]/45 flex items-center gap-2 text-left transition-colors min-w-0"
                title={slot.item ? `${slot.label}: ${slot.item.name}` : `Equip ${slot.label}`}
              >
                <div className="w-7 h-7 rounded bg-[#100D19] border border-[#7046A5]/30 p-0.5 shrink-0 flex items-center justify-center">
                  {slot.item ? (
                    <EquipmentIllustration
                      itemId={slot.item.id}
                      rarity={slot.item.rarity}
                      level={slot.item.level}
                    />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#D9D2C5]/35" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase text-[#D9D2C5]/50 block leading-tight">
                    {slot.label}
                  </span>
                  <span className="text-[10px] font-medium text-[#D9D2C5]/90 truncate block">
                    {slot.item ? slot.item.name : 'Empty'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT (5 cols): Interactive 3D PBR Equipped Weapon & Relic Pedestal */}
      <div className="xl:col-span-5 rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 shadow-xl flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-[#C5A15A] font-semibold flex items-center gap-1.5">
              <Swords className="w-3 h-3" />
              Equipped Armament · 3D Inspect
            </span>
            <h3 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#D9D2C5] truncate mt-0.5">
              {equippedWeapon.name}
            </h3>
            <p className="text-[11px] text-[#D9D2C5]/65">
              {equippedWeapon.category} · Lv.{equippedWeapon.level}/{equippedWeapon.maxLevel} ·{' '}
              {equippedWeapon.evolutionStage}
            </p>
          </div>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${rarityStyle.badge}`}>
            {equippedWeapon.rarity}
          </span>
        </div>

        {/* Interactive 3D PBR Canvas Stage OR Illustrated Fallback */}
        <div className="relative h-56 sm:h-60 rounded-xl bg-radial from-[#251638]/55 via-[#130e20] to-[#0b0812] border border-[#C5A15A]/20 overflow-hidden">
          {!relicWebglFailed ? (
            <AetheriaRelicCanvas
              category={equippedWeapon.category}
              rarity={equippedWeapon.rarity}
              level={equippedWeapon.level}
              isSoftwareGl={gpuProbe.isSoftwareGl}
              onWebglError={() => setRelicWebglFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="w-36 h-36">
                <EquipmentIllustration
                  itemId={equippedWeapon.id}
                  rarity={equippedWeapon.rarity}
                  level={equippedWeapon.level}
                  evolutionStage={equippedWeapon.evolutionStage}
                />
              </div>
            </div>
          )}

          {!relicWebglFailed && (
            <span className="pointer-events-none absolute bottom-2 right-2.5 text-[10px] text-[#D9D2C5]/50 font-mono">
              Drag to rotate · Scroll to zoom
            </span>
          )}
          <span className="pointer-events-none absolute top-2.5 left-3 text-[10px] font-semibold text-[#C5A15A]/85 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {equippedWeapon.element || 'Physical'} Mastery Lv.{equippedWeapon.masteryLevel}
          </span>
        </div>

        {/* Weapon Stats & Armory Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-xs font-mono text-[#D9D2C5] tabular-nums">
            <span>
              ATK <strong className="text-[#C5A15A]">+{equippedWeapon.baseAttack}</strong>
            </span>
            <span>
              DEF <strong className="text-[#D9D2C5]">+{equippedWeapon.baseDefense}</strong>
            </span>
            <span>
              SPD <strong className="text-[#D9D2C5]">{equippedWeapon.speed ?? 65}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('armory')}
            className="px-3.5 py-2 rounded-lg bg-[#251638] hover:bg-[#7046A5]/45 border border-[#C5A15A]/35 text-xs font-semibold text-[#D9D2C5] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Hammer className="w-3.5 h-3.5 text-[#C5A15A]" />
            Forge Upgrade ({equippedWeapon.upgradeForgeCost} Forge XP)
          </button>
        </div>
      </div>
    </section>
  );
};
