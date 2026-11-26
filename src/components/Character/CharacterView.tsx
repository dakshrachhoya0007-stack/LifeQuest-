import React from 'react';
import { useGame } from '../../context/GameContext';
import { getHeroById, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import {
  IDENTITY_RARITY_STYLE,
  PLAYER_TITLES_CATALOG,
  RARE_BADGES_CATALOG,
} from '../../data/polish2Data';
import { COLLECTIBLE_CARDS_CATALOG } from '../../data/aaaGamingData';
import {
  Dumbbell,
  Flame,
  Footprints,
  Hand,
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
  Palette,
  Layers,
  Trophy,
  User,
} from 'lucide-react';
import { LegendTitleBadge } from '../Social/LegendTitleBadge';
import { Character2DAvatar, CollectibleCardArtwork } from './Character2DAvatar';
import { CharacterCustomizationView } from './CharacterCustomizationView';
import { CollectibleCardsView } from '../Collection/CollectibleCardsView';
import { TrophyShowcasePanel } from './TrophyShowcasePanel';

const PRESTIGE_ROMANS = ['', 'I', 'II', 'III', 'IV', 'V'];

export const CharacterView: React.FC = () => {
  const {
    user,
    stats,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    rpgAttributes,
    activeBuffs,
    setActiveTab,
    setProgressionSubTab,
    characterSubTab,
    setCharacterSubTab,
    cosmeticsState,
    prestigeState,
    cardsState,
    hallOfLegends,
    equippedLegendMap,
    equipGlobalLegendTitle,
    identityState,
    museumData,
    rivalsState,
    selectIdentityTitle,
    selectSecondaryIdentityTitle,
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
  const equippedSecondaryTitle = identityState?.equippedSecondaryTitleId
    ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedSecondaryTitleId) || null
    : null;
  const effectivePrestigeTier = prestigeState?.prestigeTier ?? identityState?.prestigeTier ?? 0;
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
      showIdentityNotice('success', titleId ? 'Primary title equipped!' : 'Primary title unequipped.');
    } else {
      showIdentityNotice('error', res.error || 'Could not update title.');
    }
    setIdentityBusy(false);
  };

  const handleEquipSecondaryTitle = async (titleId: string | null) => {
    setIdentityBusy(true);
    const res = await selectSecondaryIdentityTitle(titleId);
    if (res.success) {
      showIdentityNotice('success', titleId ? 'Secondary title equipped!' : 'Secondary title cleared.');
    } else {
      showIdentityNotice('error', res.error || 'Could not update secondary title.');
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

  const rawAttack = 18 + Math.round(rpgAttributes.strength * 1.4 + rpgAttributes.agility * 0.6);
  const rawDefense = 12 + Math.round(rpgAttributes.resilience * 1.2 + rpgAttributes.discipline * 0.8);

  // Buff multipliers
  const atkBuff = activeBuffs.find(b => b.effectType === 'attack');
  const defBuff = activeBuffs.find(b => b.effectType === 'defense');
  const critBuff = activeBuffs.find(b => b.effectType === 'crit');

  const totalAttack = Math.round(rawAttack * (1 + (atkBuff ? atkBuff.effectValue / 100 : 0)));
  const totalDefense = Math.round(rawDefense * (1 + (defBuff ? defBuff.effectValue / 100 : 0)));
  const critPercent = Math.min(60, 10 + Math.round(rpgAttributes.agility * 0.25) + (critBuff ? critBuff.effectValue : 0));

  const favoriteCardDefs = (cardsState?.favoriteCardIds || [])
    .map(id => COLLECTIBLE_CARDS_CATALOG.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .slice(0, 3);

  const subTabs: Array<{
    id: 'overview' | 'customization' | 'cards' | 'trophies';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Hero Overview', icon: User },
    { id: 'customization', label: '2D Wardrobe & Loadouts', icon: Palette },
    { id: 'cards', label: 'Card Binder', icon: Layers },
    { id: 'trophies', label: 'Trophies & Prestige', icon: Trophy },
  ];

  const tabSwitcher = (
    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#100D1C] border border-[#6638B8]/35 w-fit">
      {subTabs.map(t => {
        const Icon = t.icon;
        const active = characterSubTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setCharacterSubTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              active
                ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white shadow-[0_0_16px_rgba(168,117,255,0.35)] border border-[#FFD978]/45'
                : 'text-[#BEB4D6] hover:text-[#F7F4FF] hover:bg-[#24143D] border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );

  if (characterSubTab === 'customization') {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <CharacterCustomizationView />
      </div>
    );
  }

  if (characterSubTab === 'cards') {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <CollectibleCardsView />
      </div>
    );
  }

  if (characterSubTab === 'trophies') {
    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {tabSwitcher}
        <TrophyShowcasePanel />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {tabSwitcher}

      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#100D1C] via-[#19122B] to-[#24143D] border border-[#6638B8]/40 p-6 sm:p-8 shadow-[0_12px_32px_rgba(10,6,20,0.6)]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0">
            <Character2DAvatar
              heroId={selectedHeroId}
              characterClass={user?.characterClass}
              appearance={cosmeticsState?.appearance}
              size="lg"
              prestigeTier={effectivePrestigeTier}
              showBannerBackdrop
            />
            <span className="absolute -bottom-2 -right-2 bg-[#19122B] text-[#FFD978] border border-[#FFD978]/60 px-3 py-1 rounded-lg text-xs font-['Cinzel'] font-bold z-20 shadow-[0_0_12px_rgba(255,217,120,0.25)]">
              Level {stats.level}
            </span>
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F7F4FF]">
                {user?.characterName || user?.username || 'Hero'}
              </h1>
              {effectivePrestigeTier > 0 && (
                <span className="text-xs font-['Cinzel'] font-bold px-2.5 py-0.5 rounded bg-[#19122B] text-[#FFD978] border border-[#FFD978]/55">
                  Prestige {PRESTIGE_ROMANS[effectivePrestigeTier] || effectivePrestigeTier}
                </span>
              )}
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
              {equippedSecondaryTitle && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${IDENTITY_RARITY_STYLE[equippedSecondaryTitle.rarity].bg} ${IDENTITY_RARITY_STYLE[equippedSecondaryTitle.rarity].border} ${IDENTITY_RARITY_STYLE[equippedSecondaryTitle.rarity].text}`}
                >
                  {equippedSecondaryTitle.name}
                </span>
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#6638B8]/25 text-[#A875FF] border border-[#A875FF]/45">
                {heroDef.name} · {user?.characterClass || 'Warrior'}
              </span>
            </div>

            <p className="text-xs text-[#E7B94F] font-medium">
              {heroDef.title} · Aether Rank: {stats.aetherRank} · Reputation: {reputationScore.toLocaleString()} ({reputationTier})
              {validJoinedAt ? ` · Joined ${validJoinedAt}` : ''}
            </p>
            <p className="text-xs text-[#BEB4D6] leading-relaxed max-w-2xl">
              {heroDef.greatFallOrigin}
            </p>

            {/* Level XP Bar */}
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-xs text-[#BEB4D6] mb-1 font-mono">
                <span>Player XP Progress</span>
                <span className="font-bold text-[#FFD978] tabular-nums">
                  {stats.playerXP} / {stats.playerXPNextLevel} XP ({xpPercent}%)
                </span>
              </div>
              <div className="w-full bg-[#100D1C] h-2.5 rounded-full overflow-hidden border border-[#6638B8]/40">
                <div
                  className="bg-gradient-to-r from-[#6638B8] via-[#A875FF] to-[#FFD978] h-full transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            {ownedLegends.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] font-['Cinzel'] uppercase tracking-wider text-[#E7B94F] flex items-center gap-1">
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
                          ? 'ring-1 ring-[#FFD978] bg-[#2F1B4E]'
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
                  onClick={() => setActiveTab('hall-of-legends')}
                  className="text-[11px] text-[#E7B94F]/90 hover:text-[#FFD978] underline ml-1"
                >
                  Hall of Legends
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {heroLocked ? (
              <div className="px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl border border-[#6638B8]/40 bg-[#19122B] text-[#FFD978] flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Permanent Champion
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowHeroSelectModal(true)}
                className="px-4 py-2 text-xs font-bold font-['Cinzel'] rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)] flex items-center justify-center gap-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                Choose Champion
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#6638B8]/45 hover:border-[#A875FF]/60 bg-[#19122B] hover:bg-[#2F1B4E] text-[#F7F4FF] flex items-center justify-center gap-1.5 transition-all"
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
        className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(10,6,20,0.6)] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F7F4FF] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD978]" />
              SIX INDEPENDENT HERO ATTRIBUTES
            </h2>
            <p className="text-xs text-[#BEB4D6] mt-0.5">
              Each virtue scales directly from your genuine real-world habits, workouts, meals, hydration, and campaign chapters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-mono text-[#E7B94F]">
              Affinity: {heroDef.attributeFocus.map(k => k.toUpperCase()).join(' · ')}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('skill-tree')}
              className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/45 hover:border-[#FFD978]/55 text-[11px] font-['Cinzel'] font-bold tracking-wider uppercase text-[#F7F4FF] transition-all whitespace-nowrap shrink-0 cursor-pointer"
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
                className={`p-4 rounded-xl border transition-all ${
                  isAffinity
                    ? 'bg-[#19122B] border-[#FFD978]/55 shadow-[0_0_16px_rgba(255,217,120,0.12)]'
                    : 'bg-[#19122B]/80 border-[#6638B8]/30 hover:border-[#A875FF]/45'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div>
                    <span className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF]">
                      {attr.label}
                    </span>
                    {isAffinity && (
                      <span className="ml-2 text-[9px] font-mono uppercase text-[#FFD978]">
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

                <div className="w-full h-2 rounded-full bg-[#100D1C] overflow-hidden mb-2">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: attr.accentHex }}
                  />
                </div>

                <p className="text-[11px] text-[#BEB4D6] leading-relaxed">
                  {attr.description}
                </p>
                <p className="text-[10px] text-[#E7B94F]/85 mt-1">
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
        <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(10,6,20,0.6)] space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#FFD978]" />
            BODYWEIGHT COMBAT ATTRIBUTES
          </h3>

          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/35 text-center">
              <span className="text-[10px] text-[#BEB4D6] uppercase tracking-wider block mb-1">Strike Power</span>
              <span className="text-2xl font-black text-[#F05B70]">+{totalAttack}</span>
              {atkBuff && (
                <span className="text-[10px] text-[#FFAA45] block mt-0.5">+{atkBuff.effectValue}% Buff</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/35 text-center">
              <span className="text-[10px] text-[#BEB4D6] uppercase tracking-wider block mb-1">Body Guard</span>
              <span className="text-2xl font-black text-[#A875FF]">+{totalDefense}</span>
              {defBuff && (
                <span className="text-[10px] text-[#FFAA45] block mt-0.5">+{defBuff.effectValue}% Buff</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/35 text-center">
              <span className="text-[10px] text-[#BEB4D6] uppercase tracking-wider block mb-1">Crit Rate</span>
              <span className="text-2xl font-black text-[#FFD978]">{critPercent}%</span>
              {critBuff && (
                <span className="text-[10px] text-[#FFAA45] block mt-0.5">+{critBuff.effectValue}% Buff</span>
              )}
            </div>
          </div>

          {/* Hands & Legs Bodyweight Training Card */}
          <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#100D1C] border border-[#FFD978]/45 flex items-center justify-center shrink-0 text-[#FFD978]">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#E7B94F]">Hands &amp; Legs Combat</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#6638B8]/25 text-[#A875FF] border border-[#A875FF]/40">
                    Unarmed
                  </span>
                </div>
                <h4 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] truncate">
                  {heroDef.bodyweightDisciplines.conditioningStyle}
                </h4>
                <p className="text-xs text-[#BEB4D6]">
                  Bodyweight training builds strength through exercise.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('store')}
                className="px-3 py-2 rounded-xl bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/45 hover:border-[#FFD978]/55 text-[#F7F4FF] text-xs font-bold flex items-center gap-1 transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#FFD978]" />
                Store
              </button>
              <button
                onClick={() => setActiveTab('fitness')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] text-xs font-semibold shadow-[0_0_16px_rgba(231,185,79,0.35)] transition-all"
              >
                Train
              </button>
            </div>
          </div>

          {/* Hands & Legs Focus Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#100D1C] border border-[#6638B8]/30 flex items-center gap-2.5">
              <Hand className="w-4 h-4 text-[#FFD978] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Hands Technique</span>
                <span className="text-xs font-semibold text-[#F7F4FF] truncate block">
                  {heroDef.bodyweightDisciplines.handsFocus}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#100D1C] border border-[#6638B8]/30 flex items-center gap-2.5">
              <Footprints className="w-4 h-4 text-[#A875FF] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-[#BEB4D6] block">Legs Technique</span>
                <span className="text-xs font-semibold text-[#F7F4FF] truncate block">
                  {heroDef.bodyweightDisciplines.legsFocus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lifetime Record */}
        <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(10,6,20,0.6)] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFD978]" />
              LIFETIME HEROIC RECORD
            </h3>
            {validJoinedAt && (
              <span className="text-[11px] text-[#BEB4D6] flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-[#E7B94F]" />
                Joined {validJoinedAt}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Habit Streak</span>
              <span className="font-mono font-bold text-[#FFAA45] text-sm flex items-center gap-1 tabular-nums">
                <Flame className="w-3.5 h-3.5" /> {stats.currentStreak}d (Best {Math.max(stats.currentStreak, lifetime?.longestStreak ?? 0)}d)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Workouts</span>
              <span className="font-mono font-bold text-[#FFD978] text-sm tabular-nums">
                {Math.max(stats.totalWorkoutsCompleted, lifetime?.totalWorkouts ?? 0)} Sessions
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Aether Vision Reps</span>
              <span className="font-mono font-bold text-[#35D69A] text-sm tabular-nums">
                {Math.max(stats.totalVerifiedReps, lifetime?.totalVerifiedReps ?? 0)} Reps
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Bosses Defeated</span>
              <span className="font-mono font-bold text-[#F05B70] text-sm tabular-nums">
                {Math.max(stats.totalBossesDefeated, lifetime?.totalBossesDefeated ?? 0)} Slain
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Skill Nodes &amp; Boss DMG</span>
              <span className="font-mono font-bold text-[#A875FF] text-sm tabular-nums">
                {lifetime?.skillNodesUnlocked ?? 0} · {(lifetime?.totalBossDamage ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#19122B] border border-[#6638B8]/30 flex items-center justify-between gap-2">
              <span className="text-[#BEB4D6]">Rivalry Wins &amp; Records</span>
              <span className="font-mono font-bold text-[#FFD978] text-sm tabular-nums">
                {authoritativeRivalWins}W · {authoritativePrCount} PRs
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#100D1C] border border-[#6638B8]/30 text-xs text-[#BEB4D6] flex flex-wrap items-center justify-between gap-2">
            <span>
              Wellness Profile: <strong className="text-[#F7F4FF]">{user?.activityLevel || 'Moderate'} activity</strong> · <strong className="text-[#F7F4FF]">{user?.dietaryPreference || 'Vegetarian'} nutrition</strong> · Units: {user?.preferredUnits || 'Metric'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('museum')}
              className="text-[#FFD978] hover:underline font-semibold whitespace-nowrap"
            >
              Inspect {authoritativePrCount} Personal Bests →
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Player Identity: Titles, Rare Badges & Reputation */}
      <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/40 rounded-2xl p-6 shadow-[0_12px_32px_rgba(16,13,28,0.65)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#6638B8]/30">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base sm:text-lg text-[#F7F4FF] flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#FFD978]" />
              ADVANCED PLAYER IDENTITY &amp; REPUTATION
            </h2>
            <p className="text-xs text-[#BEB4D6] mt-0.5">
              Equip verified accomplishments as your active Title, feature up to 4 Rare Badges, and build non-purchasable Realm Reputation.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-[#FFD978] font-semibold block">
              {reputationTier}
            </span>
            <span className="font-mono font-black text-xl text-[#F7F4FF] tabular-nums">
              {reputationScore.toLocaleString()} Rep
            </span>
          </div>
        </div>

        {identityNotice && (
          <div
            className={`p-3 rounded-xl border text-xs text-center ${
              identityNotice.type === 'error'
                ? 'bg-[#36111F]/80 border-[#F05B70]/55 text-[#F7F4FF]'
                : 'bg-[#19122B]/90 border-[#35D69A]/55 text-[#35D69A]'
            }`}
          >
            {identityNotice.text}
          </div>
        )}

        {/* Reputation Breakdown + Active Title Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Reputation Card */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#FFD978] flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Reputation Breakdown
              </span>
              <span className="text-[11px] text-[#BEB4D6]">Verified Effort Only</span>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Workouts & Activity', value: repBreakdown.workoutsScore, max: 350, color: '#38D9F5' },
                { label: 'Consistency & Streaks', value: repBreakdown.consistencyScore, max: 300, color: '#FFAA45' },
                { label: 'Weekly Raid Bosses', value: repBreakdown.bossParticipationScore, max: 350, color: '#F05B70' },
                { label: 'Friend Rivalries', value: repBreakdown.rivalryScore, max: 200, color: '#65A9FF' },
                { label: 'Community Events', value: repBreakdown.communityScore, max: 250, color: '#35D69A' },
                { label: 'Skill Tree Mastery', value: repBreakdown.skillMasteryScore, max: 350, color: '#A875FF' },
                { label: 'Titles & Rare Badges', value: repBreakdown.titlesAndBadgesScore, max: 300, color: '#FFD978' },
              ].map(bar => {
                const pct = Math.min(100, Math.round((bar.value / bar.max) * 100));
                return (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] tabular-nums">
                      <span className="text-[#BEB4D6]">{bar.label}</span>
                      <span className="font-mono font-bold text-[#F7F4FF]">{bar.value}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#100D1C] overflow-hidden">
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
          <div className="lg:col-span-7 p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#A875FF]">
                Earned Player Titles ({unlockedTitleSet.size}/{PLAYER_TITLES_CATALOG.length})
              </span>
              <div className="flex items-center gap-3">
                {equippedIdentityTitle && (
                  <button
                    type="button"
                    disabled={identityBusy}
                    onClick={() => void handleEquipIdentityTitle(null)}
                    className="text-[11px] text-[#BEB4D6] hover:text-[#F7F4FF] underline whitespace-nowrap"
                  >
                    Clear Primary
                  </button>
                )}
                {equippedSecondaryTitle && (
                  <button
                    type="button"
                    disabled={identityBusy}
                    onClick={() => void handleEquipSecondaryTitle(null)}
                    className="text-[11px] text-[#FFD978] hover:text-[#F7F4FF] underline whitespace-nowrap"
                  >
                    Clear Secondary
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {PLAYER_TITLES_CATALOG.map(title => {
                const unlocked = unlockedTitleSet.has(title.id);
                const equippedPrimary = identityState?.equippedTitleId === title.id;
                const equippedSec = identityState?.equippedSecondaryTitleId === title.id;
                const rStyle = IDENTITY_RARITY_STYLE[title.rarity];
                return (
                  <div
                    key={title.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                      equippedPrimary || equippedSec
                        ? 'bg-[#2F1B4E]/85 border-[#E7B94F]/65 shadow-[0_0_16px_rgba(231,185,79,0.18)]'
                        : unlocked
                        ? 'bg-[#24143D] border-[#6638B8]/35'
                        : 'bg-[#100D1C] border-[#6638B8]/20 opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                          {title.rarity}
                        </span>
                        {!unlocked && <Lock className="w-3 h-3 text-[#BEB4D6]/60" />}
                      </div>
                      <p className="font-['Cinzel'] font-bold text-xs text-[#F7F4FF] mt-0.5">
                        {title.name}
                      </p>
                      <p className="text-[11px] text-[#BEB4D6] mt-0.5 leading-snug">
                        {title.unlockRequirement}
                      </p>
                    </div>
                    {unlocked && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={identityBusy}
                          onClick={() => void handleEquipIdentityTitle(equippedPrimary ? null : title.id)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            equippedPrimary
                              ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-[#F7F4FF] shadow-[0_0_12px_rgba(168,117,255,0.35)]'
                              : 'bg-[#19122B] hover:bg-[#2F1B4E] text-[#F7F4FF] border border-[#6638B8]/40'
                          }`}
                        >
                          {equippedPrimary ? 'Primary' : 'Set Primary'}
                        </button>
                        <button
                          type="button"
                          disabled={identityBusy || equippedPrimary}
                          onClick={() => void handleEquipSecondaryTitle(equippedSec ? null : title.id)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            equippedSec
                              ? 'bg-[#E7B94F] text-[#100D1C]'
                              : 'bg-[#100D1C] hover:bg-[#2F1B4E] text-[#FFD978] border border-[#6638B8]/35 disabled:opacity-40'
                          }`}
                        >
                          {equippedSec ? 'Secondary' : 'Set 2nd'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Favorite Collectible Cards 3-Slot Preview */}
        <div className="p-4 rounded-xl bg-[#19122B] border border-[#6638B8]/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FFD978]" />
              FAVORITE COLLECTIBLE CARDS SHOWCASE ({favoriteCardDefs.length}/3)
            </h3>
            <button
              type="button"
              onClick={() => setCharacterSubTab('cards')}
              className="px-3 py-1.5 rounded-lg bg-[#100D1C] hover:bg-[#2F1B4E] border border-[#E7B94F]/40 hover:border-[#FFD978]/60 text-[11px] font-semibold text-[#FFD978] whitespace-nowrap transition-all"
            >
              Open Card Binder →
            </button>
          </div>
          {favoriteCardDefs.length === 0 ? (
            <p className="text-xs text-[#BEB4D6]">
              Open Chronicle Card Packs in your Card Binder and pin up to 3 favorite 2D fantasy cards on your profile.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {favoriteCardDefs.map(card => (
                <div
                  key={card.id}
                  className="p-2.5 rounded-xl bg-[#24143D] border border-[#6638B8]/35 flex items-center gap-3"
                >
                  <CollectibleCardArtwork card={card} compact className="shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-[#FFD978] block">
                      {card.rarity}
                    </span>
                    <p className="font-['Cinzel'] font-bold text-xs text-[#F7F4FF] truncate">
                      {card.name}
                    </p>
                    <p className="text-[11px] text-[#BEB4D6] truncate">{card.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rare Badges Showcase */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#FFD978]" />
              RARE BADGES ({unlockedBadgeSet.size}/{RARE_BADGES_CATALOG.length})
            </h3>
            <span className="text-xs text-[#BEB4D6] tabular-nums">
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
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    featured
                      ? 'bg-[#2F1B4E]/80 border-[#E7B94F]/65 shadow-[0_0_18px_rgba(231,185,79,0.18)]'
                      : unlocked
                      ? 'bg-[#19122B] border-[#6638B8]/40'
                      : 'bg-[#100D1C] border-[#6638B8]/20 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase ${rStyle.text}`}>
                        {badge.rarity}
                        {badge.globalExclusive ? ' · World-First' : ''}
                      </span>
                      {featured ? (
                        <span className="text-[10px] font-semibold text-[#FFD978] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Featured
                        </span>
                      ) : !unlocked ? (
                        <Lock className="w-3 h-3 text-[#BEB4D6]/60" />
                      ) : null}
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] mt-1">
                      {badge.name}
                    </h4>
                    <p className="text-[11px] text-[#BEB4D6] mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                    <p className="text-[10px] text-[#A875FF] mt-1">
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
                      className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        featured
                          ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-[#F7F4FF] shadow-[0_0_12px_rgba(168,117,255,0.35)]'
                          : 'bg-[#100D1C] hover:bg-[#2F1B4E] text-[#F7F4FF] border border-[#6638B8]/40'
                      }`}
                    >
                      {featured ? 'Unfeature Badge' : 'Feature on Profile'}
                    </button>
                  ) : canClaimGlobal ? (
                    <button
                      type="button"
                      disabled={identityBusy}
                      onClick={() => void handleClaimWorldFirstBadge(badge.id)}
                      className="w-full py-1.5 rounded-lg bg-[#F05B70] hover:bg-[#F05B70]/90 text-[#F7F4FF] text-[11px] font-bold transition-colors"
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
