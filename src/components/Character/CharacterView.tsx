import React from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroArtwork } from '../../assets/images';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import { getRarityStyle } from '../../utils/rarityStyles';
import {
  Shield,
  Swords,
  Flame,
  Award,
  Edit,
  ShoppingBag,
  Users,
  Sparkles,
  Lock,
  Crown,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';

export const CharacterView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    rpgAttributes,
    weapons,
    equippedWeapon,
    equippedGear,
    activeBuffs,
    setActiveTab,
    setProgressionSubTab,
    hallOfLegends,
    equippedLegendMap,
    equipGlobalLegendTitle,
  } = useGame();

  const equippedLegend = user
    ? user.legendTitle
      ? {
          achievementId:
            hallOfLegends.find(h => h.ownedByCurrentUser && h.titleTag === user.legendTitle)?.id || '',
          titleTag: user.legendTitle,
          titleStyle: user.legendTitleStyle || ('gold' as const),
          emblemIcon: user.legendEmblem || 'Crown',
        }
      : equippedLegendMap[user.id]
    : undefined;
  const ownedLegends = hallOfLegends.filter(h => h.ownedByCurrentUser);

  const heroDef = getHeroById(selectedHeroId);
  const xpPercent = Math.min(100, Math.round((stats.playerXP / stats.playerXPNextLevel) * 100));

  const offHandGear = equippedGear.offHandId
    ? weapons.find(w => w.id === equippedGear.offHandId && w.id !== equippedWeapon.id)
    : undefined;
  const armourGear = equippedGear.armourId ? weapons.find(w => w.id === equippedGear.armourId) : undefined;
  const helmetGear = equippedGear.helmetId ? weapons.find(w => w.id === equippedGear.helmetId) : undefined;
  const accessoryGear = equippedGear.accessoryId ? weapons.find(w => w.id === equippedGear.accessoryId) : undefined;

  const equippedGearItems = [equippedWeapon, offHandGear, armourGear, helmetGear, accessoryGear].filter(
    (item): item is NonNullable<typeof item> => Boolean(item)
  );
  const rawAttack = equippedGearItems.reduce((sum, item) => sum + item.baseAttack, 0);
  const rawDefense = equippedGearItems.reduce((sum, item) => sum + item.baseDefense, 0);

  // Buff multipliers
  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const critBuff = activeBuffs.find(b => b.effectType === 'crit');

  const totalAttack = Math.round(rawAttack * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDefense * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critPercent = 10 + (equippedWeapon.critChance ?? 5) + (critBuff ? critBuff.effectValue : 0);
  const mainRarityStyle = getRarityStyle(equippedWeapon.rarity);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-[#C5A15A]/25 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0">
            <img
              src={getHeroArtwork(selectedHeroId, user?.characterClass)}
              alt={`${heroDef.name} Emblem`}
              referrerPolicy="no-referrer"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover object-top border-2 border-[#C5A15A]/70 shadow-2xl"
            />
            <span className="absolute -bottom-2 -right-2 bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/60 px-3 py-1 rounded-lg text-xs font-['Cinzel'] font-bold">
              Level {stats.level}
            </span>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#D9D2C5]">
                {user?.characterName || user?.username || 'Hero'}
              </h1>
              {equippedLegend && (
                <LegendTitleBadge
                  title={equippedLegend.titleTag}
                  style={equippedLegend.titleStyle}
                  emblemIcon={equippedLegend.emblemIcon}
                  size="md"
                />
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45">
                {heroDef.name} · {user?.characterClass || 'Warrior'}
              </span>
            </div>

            <p className="text-xs text-[#C5A15A]/90 font-medium">
              {heroDef.title} · Aether Rank: {stats.aetherRank}
            </p>
            <p className="text-xs text-[#D9D2C5]/75 leading-relaxed max-w-2xl">
              {heroDef.greatFallOrigin}
            </p>

            {/* Level XP Bar */}
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-xs text-[#D9D2C5]/80 mb-1 font-mono">
                <span>Player XP Progress</span>
                <span className="font-bold text-[#C5A15A] tabular-nums">
                  {stats.playerXP} / {stats.playerXPNextLevel} XP ({xpPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#251638] h-2.5 rounded-full overflow-hidden border border-[#7046A5]/40">
                <div
                  className="bg-gradient-to-r from-[#7046A5] to-[#C5A15A] h-full transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {ownedLegends.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#C5A15A] flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  Worldwide Titles:
                </span>
                {ownedLegends.map(entry => {
                  const isEquipped = equippedLegend?.titleTag === entry.titleTag;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() =>
                        void equipGlobalLegendTitle(isEquipped ? null : entry.id)
                      }
                      title={
                        isEquipped
                          ? 'Click to unequip title'
                          : `Equip [${entry.titleTag}] across the realm`
                      }
                      className={`inline-flex items-center gap-1 rounded-lg p-0.5 transition-all ${
                        isEquipped
                          ? 'ring-1 ring-[#C5A15A] bg-[#251638]'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <LegendTitleBadge
                        title={entry.titleTag}
                        style={entry.titleStyle}
                        emblemIcon={entry.emblemIcon}
                        size="xs"
                      />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setProgressionSubTab('hall-of-legends');
                    setActiveTab('progression');
                  }}
                  className="text-[11px] text-[#C5A15A]/80 hover:text-[#C5A15A] underline ml-1"
                >
                  Hall of Legends
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {heroLocked ? (
              <div className="px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl border border-[#C5A15A]/35 bg-[#191229] text-[#C5A15A] flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Permanent Champion
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowHeroSelectModal(true)}
                className="px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                Choose Champion
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#7046A5]/60 bg-[#251638]/60 text-[#D9D2C5] hover:text-white flex items-center justify-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Six Independent RPG Attributes Section */}
      <div
        data-tutorial-id="character-attributes"
        className="bg-[#100D19] border border-[#C5A15A]/25 rounded-2xl p-6 shadow-xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#D9D2C5] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A15A]" />
              SIX INDEPENDENT HERO ATTRIBUTES
            </h2>
            <p className="text-xs text-[#D9D2C5]/65 mt-0.5">
              Each virtue scales directly from your genuine real-world habits, workouts, meals, hydration, and campaign chapters.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#C5A15A]">
            Affinity: {heroDef.attributeFocus.map(k => k.toUpperCase()).join(' · ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RPG_ATTRIBUTE_META.map(attr => {
            const val = rpgAttributes[attr.key];
            const pct = Math.min(100, Math.round((val / 40) * 100));
            const isAffinity = heroDef.attributeFocus.includes(attr.key);
            return (
              <div
                key={attr.key}
                className={`p-4 rounded-xl border transition-colors ${
                  isAffinity
                    ? 'bg-[#1a132c] border-[#C5A15A]/45'
                    : 'bg-[#151023] border-[#C5A15A]/15'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div>
                    <span className="font-['Cinzel'] font-bold text-sm text-[#D9D2C5]">
                      {attr.label}
                    </span>
                    {isAffinity && (
                      <span className="ml-2 text-[9px] font-mono uppercase text-[#C5A15A]">
                        Hero Focus
                      </span>
                    )}
                  </div>
                  <span
                    className="font-mono text-xl font-black tabular-nums"
                    style={{ color: attr.accentHex }}
                  >
                    {val}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-[#251638] overflow-hidden mb-2">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: attr.accentHex }}
                  />
                </div>

                <p className="text-[11px] text-[#D9D2C5]/80 leading-relaxed">
                  {attr.description}
                </p>
                <p className="text-[10px] text-[#C5A15A]/80 mt-1">
                  Source: {attr.realLifeSource}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid: Combat Power & Wellness Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combat Stats */}
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
            <Swords className="w-4 h-4 text-purple-400" />
            COMBAT ATTRIBUTES
          </h3>

          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Attack</span>
              <span className="text-2xl font-black text-purple-300">+{totalAttack}</span>
              {atkBuff && (
                <span className="text-[10px] text-amber-400 block mt-0.5">+{atkBuff.effectValue}% Buff</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Defense</span>
              <span className="text-2xl font-black text-indigo-300">+{totalDefense}</span>
              {defBuff && (
                <span className="text-[10px] text-amber-400 block mt-0.5">+{defBuff.effectValue}% Buff</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#130f24] border border-purple-950 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Crit Rate</span>
              <span className="text-2xl font-black text-amber-400">{critPercent}%</span>
              {critBuff && (
                <span className="text-[10px] text-amber-400 block mt-0.5">+{critBuff.effectValue}% Buff</span>
              )}
            </div>
          </div>

          {/* Equipped Weapon Card */}
          <div className={`p-4 rounded-xl bg-[#130f24] border ${mainRarityStyle.border} flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-14 h-14 rounded-xl bg-[#080511] border ${mainRarityStyle.border} p-1.5 shrink-0`}>
                <EquipmentIllustration
                  itemId={equippedWeapon.id}
                  rarity={equippedWeapon.rarity}
                  level={equippedWeapon.level}
                  evolutionStage={equippedWeapon.evolutionStage}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-purple-400">Main Hand</span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${mainRarityStyle.badge}`}>
                    {equippedWeapon.rarity}
                  </span>
                </div>
                <h4 className="font-['Cinzel'] font-bold text-base text-white truncate">{equippedWeapon.name}</h4>
                <p className="text-xs text-slate-400">
                  {equippedWeapon.category} · Lv.{equippedWeapon.level} · {equippedWeapon.element || 'Physical'} · SPD {equippedWeapon.speed ?? 65}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('store')}
                className="px-3 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Store
              </button>
              <button
                onClick={() => setActiveTab('armory')}
                className="px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                Armory
              </button>
            </div>
          </div>

          {/* Secondary Equipped Gear Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {[
              { label: 'Off-Hand', item: offHandGear },
              { label: 'Armour', item: armourGear },
              { label: 'Helmet', item: helmetGear },
              { label: 'Relic', item: accessoryGear },
            ].map(slot => {
              const slotStyle = slot.item ? getRarityStyle(slot.item.rarity) : null;
              return (
                <div
                  key={slot.label}
                  onClick={() => setActiveTab(slot.item ? 'armory' : 'store')}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2 transition-colors ${
                    slot.item && slotStyle
                      ? `bg-[#120d22] ${slotStyle.border}`
                      : 'bg-[#090613] border-purple-950/70 hover:border-purple-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#07040e] border border-purple-950 p-0.5 shrink-0 flex items-center justify-center">
                    {slot.item ? (
                      <EquipmentIllustration itemId={slot.item.id} rarity={slot.item.rarity} level={slot.item.level} />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase text-slate-400 block">{slot.label}</span>
                    <span className="text-[10px] font-semibold text-slate-200 truncate block">
                      {slot.item ? slot.item.name : 'Empty'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lifetime Record */}
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            LIFETIME HEROIC RECORD
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between">
              <span className="text-slate-400">Habit Consistency Streak</span>
              <span className="font-mono font-bold text-amber-400 text-sm flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {stats.currentStreak} Days
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between">
              <span className="text-slate-400">Total Workouts Completed</span>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {stats.totalWorkoutsCompleted} Sessions
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between">
              <span className="text-slate-400">Aether Vision Reps</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {stats.totalVerifiedReps} Reps
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between">
              <span className="text-slate-400">Void Bosses Defeated</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {stats.totalBossesDefeated} Slain
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/50 text-xs text-slate-400">
            Wellness Profile: <strong className="text-slate-200">{user?.activityLevel || 'Moderate'} activity</strong> · <strong className="text-slate-200">{user?.dietaryPreference || 'Vegetarian'} nutrition</strong> · Units: {user?.preferredUnits || 'Metric'}
          </div>
        </div>
      </div>
    </div>
  );
};
