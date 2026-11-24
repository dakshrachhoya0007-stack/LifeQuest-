import React from 'react';
import {
  CharacterClass,
  EquippedGear,
  EquipmentSlotType,
  PlayableHeroId,
  Weapon,
  WeaponCategory,
} from '../../types/game';
import { getHeroArtwork } from '../../assets/images';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import { getRarityStyle, isBeyondMythicRarity } from '../../utils/rarityStyles';
import { Plus, Shield, Sparkles, Swords } from 'lucide-react';

interface RpgCharacterStageProps {
  heroId?: PlayableHeroId;
  characterClass: CharacterClass;
  characterName: string;
  level: number;
  weapons: Weapon[];
  equippedGear: EquippedGear;
  activeWeaponId?: string;
  stance: 'heroic' | 'combat';
  onChangeStance: (stance: 'heroic' | 'combat') => void;
  onSelectItem: (weaponId: string) => void;
  onOpenStore?: (categoryFilter?: WeaponCategory | 'All') => void;
}

const CLASS_ATMOSPHERE: Record<CharacterClass, { accent: string; badge: string; aura: string }> = {
  Warrior: {
    accent: 'text-amber-300',
    badge: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
    aura: 'from-amber-500/20 via-rose-600/15 to-transparent',
  },
  Mage: {
    accent: 'text-[#38BDF8]',
    badge: 'bg-indigo-950/80 border-[#8B5CF6]/60 text-[#C4B5FD]',
    aura: 'from-[#8B5CF6]/20 via-[#38BDF8]/15 to-transparent',
  },
  Ranger: {
    accent: 'text-emerald-300',
    badge: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
    aura: 'from-emerald-500/20 via-teal-600/15 to-transparent',
  },
  Guardian: {
    accent: 'text-sky-300',
    badge: 'bg-slate-900/90 border-sky-400/60 text-sky-300',
    aura: 'from-sky-500/20 via-amber-500/15 to-transparent',
  },
};

export const RpgCharacterStage: React.FC<RpgCharacterStageProps> = ({
  heroId,
  characterClass,
  characterName,
  level,
  weapons,
  equippedGear,
  activeWeaponId,
  stance,
  onChangeStance,
  onSelectItem,
  onOpenStore,
}) => {
  const portraitSrc = getHeroArtwork(heroId, characterClass);
  const classTheme = CLASS_ATMOSPHERE[characterClass] || CLASS_ATMOSPHERE.Warrior;

  const mainWeapon =
    weapons.find(w => w.id === equippedGear.mainWeaponId) ||
    weapons.find(w => w.equipped) ||
    weapons[0];
  const offHand = equippedGear.offHandId
    ? weapons.find(w => w.id === equippedGear.offHandId && w.id !== mainWeapon?.id)
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

  const equippedList = [mainWeapon, offHand, armour, helmet, accessory].filter(
    (item): item is Weapon => Boolean(item)
  );
  const totalAttack = equippedList.reduce((sum, item) => sum + item.baseAttack, 0);
  const totalDefense = equippedList.reduce((sum, item) => sum + item.baseDefense, 0);
  const effectiveCrit = 10 + (mainWeapon?.critChance ?? 5);
  const weaponSpeed = mainWeapon?.speed ?? 65;
  const gearRating = Math.round(
    totalAttack * 3.5 + totalDefense * 2.5 + effectiveCrit * 4 + weaponSpeed + level * 50
  );

  const mainRarityStyle = getRarityStyle(mainWeapon?.rarity || 'Common');
  const mainIsBeyondMythic = mainWeapon ? isBeyondMythicRarity(mainWeapon.rarity) : false;
  const mainRarityAnimClass =
    mainWeapon?.rarity === 'Eternal'
      ? 'animate-eternal-shift'
      : mainWeapon?.rarity === 'Celestial'
      ? 'animate-celestial-drift'
      : mainWeapon?.rarity === 'Divine'
      ? 'animate-divine-halo'
      : mainWeapon?.rarity === 'Ascendant'
      ? 'animate-ascendant-pulse'
      : '';

  const renderSocket = (
    slot: EquipmentSlotType,
    label: string,
    storeCategory: WeaponCategory,
    item?: Weapon
  ) => {
    const rStyle = item ? getRarityStyle(item.rarity) : null;
    const isInspecting = item && activeWeaponId === item.id;

    return (
      <button
        type="button"
        onClick={() => {
          if (item) {
            onSelectItem(item.id);
          } else if (onOpenStore) {
            onOpenStore(storeCategory);
          }
        }}
        title={
          item
            ? `${label}: ${item.name} (+${item.level})`
            : `Empty ${label} slot — Browse Store`
        }
        className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 flex items-center justify-center p-1 transition-all cursor-pointer ${
          item && rStyle
            ? `bg-[#0a0616] ${rStyle.border} ${rStyle.ringClass} ${
                isInspecting ? 'ring-2 ring-amber-400 scale-105' : 'hover:scale-105'
              }`
            : 'bg-[#090512]/90 border-dashed border-purple-800/70 hover:border-amber-400/70'
        }`}
      >
        {item ? (
          <>
            <EquipmentIllustration
              itemId={item.id}
              rarity={item.rarity}
              level={item.level}
              evolutionStage={item.evolutionStage}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
            />
            <span className="absolute -bottom-1.5 inset-x-0.5 bg-[#07040e]/95 border border-purple-800/80 rounded px-1 text-[8px] font-mono font-bold text-slate-200 truncate text-center">
              {label}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 text-slate-500 group-hover:text-amber-300">
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[8px] font-mono uppercase">{label}</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="bg-gradient-to-b from-[#141420] via-[#0E0E17] to-[#090910] border-2 border-[#8B5CF6]/35 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[660px]">
      {/* Class Ambient Glow */}
      <div
        className={`absolute inset-0 bg-radial ${classTheme.aura} opacity-80 pointer-events-none`}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-purple-950/80 pb-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">
            RPG Hero Equipment Stage
          </span>
          <h3 className="font-['Cinzel'] font-black text-sm text-white flex items-center gap-2">
            <span>{characterName}</span>
            <span
              className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded border ${classTheme.badge}`}
            >
              {characterClass}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#07040e] p-1 rounded-xl border border-purple-950">
          <button
            type="button"
            onClick={() => onChangeStance('heroic')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
              stance === 'heroic'
                ? 'bg-purple-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Heroic
          </button>
          <button
            type="button"
            onClick={() => onChangeStance('combat')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
              stance === 'combat'
                ? 'bg-amber-600 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Combat
          </button>
        </div>
      </div>

      {/* Central Interactive Paperdoll */}
      <div className="relative z-10 my-4 flex-1 flex items-center justify-center">
        {/* Runic Floor Pedestal */}
        <div className="absolute bottom-5 w-56 h-16 rounded-full border-2 border-dashed border-purple-500/40 bg-radial from-purple-900/35 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 w-40 h-10 rounded-full border border-amber-400/40 pointer-events-none" />

        {/* Left Equipment Sockets: Helmet, Armour, Accessory */}
        <div className="absolute left-0 sm:left-1 top-3 bottom-3 flex flex-col justify-around z-30">
          {renderSocket('helmet', 'Helm', 'Helmets', helmet)}
          {renderSocket('armour', 'Armour', 'Armour', armour)}
          {renderSocket('accessory', 'Relic', 'Accessories', accessory)}
        </div>

        {/* Center Character Portrait with Visual Equipment Layering */}
        <div className="relative z-20 flex flex-col items-center">
          {/* Crown / Helmet Visual Mount */}
          {helmet && (
            <div
              onClick={() => onSelectItem(helmet.id)}
              title={`Equipped Helm: ${helmet.name}`}
              className="relative -mb-4 z-30 w-14 h-14 rounded-full bg-[#090514]/90 border-2 border-amber-400/70 p-1 shadow-xl cursor-pointer hover:scale-110 transition-transform"
            >
              <EquipmentIllustration
                itemId={helmet.id}
                rarity={helmet.rarity}
                level={helmet.level}
                evolutionStage={helmet.evolutionStage}
              />
            </div>
          )}

          {/* Hero Frame + Visual Main/Off-Hand Layer */}
          <div className="relative flex items-center justify-center">
            {/* Visual Off-Hand Shield Overlay */}
            {offHand && (
              <div
                onClick={() => onSelectItem(offHand.id)}
                title={`Off-Hand Guard: ${offHand.name}`}
                className={`absolute -left-7 bottom-8 z-30 w-20 h-20 drop-shadow-[0_10px_18px_rgba(0,0,0,0.9)] cursor-pointer transition-transform duration-300 ${
                  stance === 'combat' ? '-translate-x-1 -rotate-6 scale-110' : 'rotate-3'
                }`}
              >
                <EquipmentIllustration
                  itemId={offHand.id}
                  rarity={offHand.rarity}
                  level={offHand.level}
                  evolutionStage={offHand.evolutionStage}
                />
              </div>
            )}

            {/* RPG Class Portrait */}
            <div
              className={`relative w-44 h-56 sm:w-52 sm:h-64 rounded-2xl overflow-hidden border-2 ${mainRarityStyle.border} ${mainRarityStyle.cardGlow} ${mainRarityAnimClass} shadow-2xl transition-all duration-300 ${
                stance === 'combat' ? 'scale-105 ring-2 ring-amber-400/40' : 'scale-100'
              }`}
            >
              {mainIsBeyondMythic && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-45"
                  style={{
                    background: `radial-gradient(circle at 50% 25%, ${mainRarityStyle.accentHex}38 0%, transparent 70%)`,
                  }}
                />
              )}
              <img
                src={portraitSrc}
                alt={`${characterClass} Champion`}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090514] via-transparent to-transparent opacity-80" />

              {/* Armour Crest Plate Overlay when Chest Armour Equipped */}
              {armour && (
                <div
                  onClick={() => onSelectItem(armour.id)}
                  title={`Equipped Armour: ${armour.name}`}
                  className="absolute bottom-14 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-[#090514]/85 border border-amber-400/60 p-1 shadow-lg cursor-pointer hover:scale-110 transition-transform"
                >
                  <EquipmentIllustration
                    itemId={armour.id}
                    rarity={armour.rarity}
                    level={armour.level}
                    evolutionStage={armour.evolutionStage}
                  />
                </div>
              )}

              {/* Accessory Relic Gem Badge when Equipped */}
              {accessory && (
                <div
                  onClick={() => onSelectItem(accessory.id)}
                  title={`Equipped Relic: ${accessory.name}`}
                  className="absolute top-2.5 right-2.5 w-10 h-10 rounded-full bg-[#090514]/90 border border-purple-400/70 p-1 shadow-lg cursor-pointer hover:scale-110 transition-transform"
                >
                  <EquipmentIllustration
                    itemId={accessory.id}
                    rarity={accessory.rarity}
                    level={accessory.level}
                    evolutionStage={accessory.evolutionStage}
                  />
                </div>
              )}

              {/* Equipped Main Hand Banner */}
              <div className="absolute bottom-2 inset-x-2 bg-[#090514]/92 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-purple-700/60 text-center">
                <span className="text-[9px] uppercase font-bold text-amber-400 font-['Cinzel'] block">
                  {mainWeapon?.evolutionStage || 'Dormant'} Main Hand
                </span>
                <span className="text-xs font-black text-white truncate block">
                  {mainWeapon?.name} (+{mainWeapon?.level})
                </span>
              </div>
            </div>

            {/* Visual Main Weapon Overlay */}
            {mainWeapon && (
              <div
                onClick={() => onSelectItem(mainWeapon.id)}
                title={`Main Weapon: ${mainWeapon.name}`}
                className={`absolute -right-8 bottom-8 z-30 w-24 h-24 drop-shadow-[0_12px_20px_rgba(0,0,0,0.95)] cursor-pointer transition-transform duration-300 ${
                  stance === 'combat' ? 'translate-x-1 rotate-12 scale-115' : '-rotate-6'
                }`}
              >
                <EquipmentIllustration
                  itemId={mainWeapon.id}
                  rarity={mainWeapon.rarity}
                  level={mainWeapon.level}
                  evolutionStage={mainWeapon.evolutionStage}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Equipment Sockets: Main Weapon & Off-Hand Shield */}
        <div className="absolute right-0 sm:right-1 top-8 bottom-8 flex flex-col justify-center gap-6 z-30">
          {renderSocket('mainWeapon', 'Weapon', 'Swords', mainWeapon)}
          {renderSocket('offHand', 'Shield', 'Shields', offHand)}
        </div>
      </div>

      {/* Equipped Summary Chips */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 mb-3 text-[10px]">
        <span className="px-2 py-0.5 rounded bg-[#0c0718] border border-purple-900/70 text-slate-300 flex items-center gap-1">
          <Swords className="w-3 h-3 text-amber-400" />
          {mainWeapon?.name}
        </span>
        {offHand && (
          <span className="px-2 py-0.5 rounded bg-[#0E0E17] border border-[#38BDF8]/45 text-[#38BDF8] flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#38BDF8]" />
            {offHand.name}
          </span>
        )}
        {armour && (
          <span className="px-2 py-0.5 rounded bg-[#0c0718] border border-indigo-900/70 text-indigo-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            {armour.name}
          </span>
        )}
      </div>

      {/* Combined Stats Bar */}
      <div className="relative z-10 bg-[#080410]/95 border border-purple-950 rounded-xl p-3 space-y-2 font-mono">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Total ATK</span>
            <span className="text-base font-black text-purple-300 tabular-nums">+{totalAttack}</span>
          </div>
          <div className="border-x border-purple-950">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Total DEF</span>
            <span className="text-base font-black text-indigo-300 tabular-nums">+{totalDefense}</span>
          </div>
          <div>
            <span className="text-[10px] text-amber-400 uppercase tracking-widest block">Gear Rating</span>
            <span className="text-base font-black text-amber-300 tabular-nums">{gearRating}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-950/70 text-center text-[10px]">
          <div>
            <span className="text-slate-500">CRIT </span>
            <span className="text-amber-300 font-bold">{effectiveCrit}%</span>
          </div>
          <div>
            <span className="text-slate-500">SPD </span>
            <span className="text-[#38BDF8] font-bold">{weaponSpeed}</span>
          </div>
          <div>
            <span className="text-slate-500">ELEM </span>
            <span className="text-purple-200 font-bold">{mainWeapon?.element || 'Physical'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
