import React from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroArtwork } from '../../assets/images';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { EquipmentIllustration } from '../../assets/equipmentArtwork';
import { getRarityStyle } from '../../utils/rarityStyles';
import {
  IDENTITY_RARITY_STYLE,
  PLAYER_TITLES_CATALOG,
  RARE_BADGES_CATALOG,
} from '../../data/polish2Data';
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
  Star,
  Check,
  Calendar,
  Landmark,
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
    identityState,
    museumData,
    rivalsState,
    selectIdentityTitle,
    featureIdentityBadges,
    claimGlobalRareBadge,
    syncVerifiedIdentitySnapshot,
  } = useGame();

  const authoritativePrCount =
    museumData?.personalBestCount ??
    museumData?.personalBests.length ??
    identityState?.lifetimeStats.totalPersonalRecords ??
    0;
  const authoritativeRivalWins =
    rivalsState?.profile?.wins ??
    rivalsState?.stats?.wins ??
    identityState?.lifetimeStats.rivalryWins ??
    0;

  const [identityBusy, setIdentityBusy] = React.useState(false);
  const [identityNotice, setIdentityNotice] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    void syncVerifiedIdentitySnapshot();
  }, []);

  const showIdentityNotice = (type: 'success' | 'error', text: string) => {
    setIdentityNotice({ type, text });
    setTimeout(() => setIdentityNotice(null), 3200);
  };

  const equippedIdentityTitle = identityState?.equippedTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedTitleId) || null
    : null;
  const unlockedTitleSet = new Set(identityState?.unlockedTitles.map(t => t.titleId) || []);
  const unlockedBadgeSet = new Set(identityState?.unlockedBadges.map(b => b.badgeId) || []);
  const featuredBadgeIds = identityState?.featuredBadgeIds || [];
  const reputationScore = identityState?.reputationScore ?? 0;
  const reputationTier = identityState?.reputationTier || 'Aspiring Traveler';
  const repBreakdown = identityState?.reputationBreakdown || {
    workoutsScore: 0,
    consistencyScore: 0,
    bossParticipationScore: 0,
    rivalryScore: 0,
    communityScore: 0,
    skillMasteryScore: 0,
    titlesAndBadgesScore: 0,
  };
  const lifetime = identityState?.lifetimeStats;
  const validJoinedAt =
    lifetime?.joinedAt && !Number.isNaN(new Date(lifetime.joinedAt).getTime())
      ? new Date(lifetime.joinedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

  const handleEquipIdentityTitle = async (titleId: string | null) => {
    setIdentityBusy(true);
    const res = await selectIdentityTitle(titleId);
    if (res.success) {
      showIdentityNotice('success', titleId ? 'Player title equipped!' : 'Title unequipped.');
    } else {
      showIdentityNotice('error', res.error || 'Could not update title.');
    }
    setIdentityBusy(false);
  };

  const handleToggleFeaturedBadge = async (badgeId: string) => {
    if (!unlockedBadgeSet.has(badgeId)) return;
    const isFeatured = featuredBadgeIds.includes(badgeId);
    if (!isFeatured && featuredBadgeIds.length >= 4) {
      showIdentityNotice('error', 'You can feature up to 4 badges on your profile.');
      return;
    }
    const nextList = isFeatured
      ? featuredBadgeIds.filter(id => id !== badgeId)
      : [...featuredBadgeIds, badgeId];
    setIdentityBusy(true);
    const res = await featureIdentityBadges(nextList);
    if (res.success) {
      showIdentityNotice('success', isFeatured ? 'Removed from featured showcase.' : 'Added to featured showcase!');
    } else {
      showIdentityNotice('error', res.error || 'Could not update featured badges.');
    }
    setIdentityBusy(false);
  };

  const handleClaimWorldFirstBadge = async (badgeId: string) => {
    setIdentityBusy(true);
    const res = await claimGlobalRareBadge(badgeId);
    if (res.success) {
      showIdentityNotice('success', 'World-First Rare Badge claimed and inscribed!');
    } else {
      showIdentityNotice('error', res.error || 'Could not claim rare badge.');
    }
    setIdentityBusy(false);
  };

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
              {equippedIdentityTitle && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded border ${IDENTITY_RARITY_STYLE[equippedIdentityTitle.rarity].bg} ${IDENTITY_RARITY_STYLE[equippedIdentityTitle.rarity].border} ${IDENTITY_RARITY_STYLE[equippedIdentityTitle.rarity].text}`}
                >
                  {equippedIdentityTitle.name}
                </span>
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45">
                {heroDef.name} · {user?.characterClass || 'Warrior'}
              </span>
            </div>

            <p className="text-xs text-[#C5A15A]/90 font-medium">
              {heroDef.title} · Aether Rank: {stats.aetherRank} · Reputation: {reputationScore.toLocaleString()} ({reputationTier})
              {validJoinedAt ? ` · Joined ${validJoinedAt}` : ''}
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-mono text-[#C5A15A]">
              Affinity: {heroDef.attributeFocus.map(k => k.toUpperCase()).join(' · ')}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('skill-tree')}
              className="px-3 py-1.5 rounded-lg bg-[#251638] hover:bg-[#321f4b] border border-[#C5A15A]/45 text-[11px] font-['Cinzel'] font-bold tracking-wider uppercase text-[#C5A15A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Skill Tree
            </button>
          </div>
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              LIFETIME HEROIC RECORD
            </h3>
            {validJoinedAt && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-[#C5A15A]" />
                Joined {validJoinedAt}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Habit Streak</span>
              <span className="font-mono font-bold text-amber-400 text-sm flex items-center gap-1 tabular-nums">
                <Flame className="w-3.5 h-3.5" /> {stats.currentStreak}d (Best {Math.max(stats.currentStreak, lifetime?.longestStreak ?? 0)}d)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Workouts</span>
              <span className="font-mono font-bold text-purple-300 text-sm tabular-nums">
                {Math.max(stats.totalWorkoutsCompleted, lifetime?.totalWorkouts ?? 0)} Sessions
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Aether Vision Reps</span>
              <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                {Math.max(stats.totalVerifiedReps, lifetime?.totalVerifiedReps ?? 0)} Reps
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Bosses Defeated</span>
              <span className="font-mono font-bold text-rose-400 text-sm tabular-nums">
                {Math.max(stats.totalBossesDefeated, lifetime?.totalBossesDefeated ?? 0)} Slain
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Skill Nodes &amp; Boss DMG</span>
              <span className="font-mono font-bold text-sky-300 text-sm tabular-nums">
                {lifetime?.skillNodesUnlocked ?? 0} · {(lifetime?.totalBossDamage ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 flex items-center justify-between gap-2">
              <span className="text-slate-400">Rivalry Wins &amp; Records</span>
              <span className="font-mono font-bold text-amber-300 text-sm tabular-nums">
                {authoritativeRivalWins}W · {authoritativePrCount} PRs
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/50 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>
              Wellness Profile: <strong className="text-slate-200">{user?.activityLevel || 'Moderate'} activity</strong> · <strong className="text-slate-200">{user?.dietaryPreference || 'Vegetarian'} nutrition</strong> · Units: {user?.preferredUnits || 'Metric'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('museum')}
              className="text-[#C5A15A] hover:underline font-semibold whitespace-nowrap"
            >
              Inspect {authoritativePrCount} Personal Bests →
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Player Identity: Titles, Rare Badges & Reputation */}
      <div className="bg-[#100D19] border border-[#C5A15A]/25 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#C5A15A]/15">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#D9D2C5] flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#C5A15A]" />
              ADVANCED PLAYER IDENTITY &amp; REPUTATION
            </h2>
            <p className="text-xs text-[#D9D2C5]/65 mt-0.5">
              Equip verified accomplishments as your active Title, feature up to 4 Rare Badges, and build non-purchasable Realm Reputation.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-[#C5A15A] font-semibold block">
              {reputationTier}
            </span>
            <span className="font-mono font-black text-xl text-white tabular-nums">
              {reputationScore.toLocaleString()} Rep
            </span>
          </div>
        </div>

        {identityNotice && (
          <div
            className={`p-3 rounded-xl border text-xs text-center ${
              identityNotice.type === 'error'
                ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                : 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
            }`}
          >
            {identityNotice.text}
          </div>
        )}

        {/* Reputation Breakdown + Active Title Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Reputation Card */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-[#0b0816] border border-purple-950/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#C5A15A] flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Reputation Breakdown
              </span>
              <span className="text-[11px] text-[#D9D2C5]/60">Verified Effort Only</span>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Workouts & Activity', value: repBreakdown.workoutsScore, max: 350, color: '#38BDF8' },
                { label: 'Consistency & Streaks', value: repBreakdown.consistencyScore, max: 300, color: '#F59E0B' },
                { label: 'Weekly Raid Bosses', value: repBreakdown.bossParticipationScore, max: 350, color: '#FB7185' },
                { label: 'Friend Rivalries', value: repBreakdown.rivalryScore, max: 200, color: '#A855F7' },
                { label: 'Community Events', value: repBreakdown.communityScore, max: 250, color: '#34D399' },
                { label: 'Skill Tree Mastery', value: repBreakdown.skillMasteryScore, max: 350, color: '#C5A15A' },
                { label: 'Titles & Rare Badges', value: repBreakdown.titlesAndBadgesScore, max: 300, color: '#E8CF96' },
              ].map(bar => {
                const pct = Math.min(100, Math.round((bar.value / bar.max) * 100));
                return (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] tabular-nums">
                      <span className="text-[#D9D2C5]/80">{bar.label}</span>
                      <span className="font-mono font-bold text-white">{bar.value}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#171128] overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: bar.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player Titles Selector */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#0b0816] border border-purple-950/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#C5A15A]">
                Earned Player Titles ({unlockedTitleSet.size}/{PLAYER_TITLES_CATALOG.length})
              </span>
              {equippedIdentityTitle && (
                <button
                  type="button"
                  disabled={identityBusy}
                  onClick={() => void handleEquipIdentityTitle(null)}
                  className="text-[11px] text-slate-400 hover:text-white underline whitespace-nowrap"
                >
                  Unequip Title
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {PLAYER_TITLES_CATALOG.map(title => {
                const unlocked = unlockedTitleSet.has(title.id);
                const equipped = identityState?.equippedTitleId === title.id;
                const rStyle = IDENTITY_RARITY_STYLE[title.rarity];
                return (
                  <div
                    key={title.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                      equipped
                        ? 'bg-[#21153b] border-[#C5A15A]'
                        : unlocked
                        ? 'bg-[#130e24] border-purple-900/70'
                        : 'bg-[#090714] border-purple-950/50 opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                          {title.rarity}
                        </span>
                        {!unlocked && <Lock className="w-3 h-3 text-slate-500" />}
                      </div>
                      <p className="font-['Cinzel'] font-bold text-xs text-white mt-0.5">
                        {title.name}
                      </p>
                      <p className="text-[11px] text-[#D9D2C5]/65 mt-0.5 leading-snug">
                        {title.unlockRequirement}
                      </p>
                    </div>
                    {unlocked && (
                      <button
                        type="button"
                        disabled={identityBusy}
                        onClick={() => void handleEquipIdentityTitle(equipped ? null : title.id)}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                          equipped
                            ? 'bg-[#C5A15A] text-[#100D19]'
                            : 'bg-[#251638] hover:bg-[#331e4d] text-[#E8CF96] border border-[#C5A15A]/30'
                        }`}
                      >
                        {equipped ? 'Equipped' : 'Equip Title'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rare Badges Showcase */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#D9D2C5] flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#C5A15A]" />
              RARE BADGES ({unlockedBadgeSet.size}/{RARE_BADGES_CATALOG.length})
            </h3>
            <span className="text-xs text-[#D9D2C5]/65 tabular-nums">
              Featured on Profile: {featuredBadgeIds.length}/4
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RARE_BADGES_CATALOG.map(badge => {
              const unlocked = unlockedBadgeSet.has(badge.id);
              const featured = featuredBadgeIds.includes(badge.id);
              const rStyle = IDENTITY_RARITY_STYLE[badge.rarity];
              const globalOwner = identityState?.globalBadgeOwners?.[badge.id];
              const canClaimGlobal =
                Boolean(badge.globalExclusive) &&
                !globalOwner &&
                (stats.totalBossesDefeated > 0 || (lifetime?.totalBossesDefeated ?? 0) > 0);

              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-2.5 ${
                    featured
                      ? 'bg-[#1c1333] border-[#C5A15A]'
                      : unlocked
                      ? 'bg-[#130e24] border-purple-900/70'
                      : 'bg-[#090714] border-purple-950/50 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                        {badge.rarity}
                        {badge.globalExclusive ? ' · World-First' : ''}
                      </span>
                      {featured ? (
                        <span className="text-[10px] font-semibold text-[#C5A15A] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Featured
                        </span>
                      ) : !unlocked ? (
                        <Lock className="w-3 h-3 text-slate-500" />
                      ) : null}
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-white mt-1">
                      {badge.name}
                    </h4>
                    <p className="text-[11px] text-[#D9D2C5]/75 mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <p className="text-[10px] text-[#C5A15A]/80 mt-1">
                      {globalOwner
                        ? `Claimed globally by ${globalOwner.ownerUsername}`
                        : badge.unlockRequirement}
                    </p>
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      disabled={identityBusy}
                      onClick={() => void handleToggleFeaturedBadge(badge.id)}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        featured
                          ? 'bg-[#C5A15A] text-[#100D19]'
                          : 'bg-[#251638] hover:bg-[#331e4d] text-[#E8CF96] border border-[#C5A15A]/30'
                      }`}
                    >
                      {featured ? 'Unfeature Badge' : 'Feature on Profile'}
                    </button>
                  ) : canClaimGlobal ? (
                    <button
                      type="button"
                      disabled={identityBusy}
                      onClick={() => void handleClaimWorldFirstBadge(badge.id)}
                      className="w-full py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold transition-colors"
                    >
                      Claim World-First Badge
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
