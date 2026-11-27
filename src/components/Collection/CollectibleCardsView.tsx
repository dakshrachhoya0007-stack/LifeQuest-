import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  CARD_COLLECTION_ACHIEVEMENTS,
  CARD_PACKS_CATALOG,
  COLLECTIBLE_CARDS_CATALOG,
  DUPLICATE_CARD_FRAGMENT_RATES,
} from '../../data/aaaGamingData';
import type {
  CollectibleCardCategory,
  CollectibleCardDef,
  CollectibleCardRarity,
} from '../../types/game';
import { CollectibleCardArtwork } from '../Character/Character2DAvatar';
import {
  Award,
  Coins,
  Eye,
  Heart,
  Layers,
  PackageOpen,
  Sparkles,
  X,
} from 'lucide-react';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  RpgModalWrapper,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

const RARITY_COLORS: Record<CollectibleCardRarity, string> = {
  Common: 'text-[#A69AAF]',
  Rare: 'text-[#9A72CC]',
  Epic: 'text-[#E8C777]',
  Legendary: 'text-[#D6A84B]',
  Mythic: 'text-[#D65C66]',
};

const CATEGORY_LABELS: Record<CollectibleCardCategory | 'all', string> = {
  all: 'All Categories',
  fitness_milestone: 'Fitness Milestones',
  seasonal_theme: 'Seasonal',
  community_event: 'Community Events',
  mythic_hero: 'Mythic Heroes',
};

export const CollectibleCardsView: React.FC = () => {
  const {
    stats,
    walletState,
    cardsState,
    refreshCardsState,
    openCardPack,
    setFavoriteCards,
    claimCardAchievement,
  } = useGame();

  const [subTab, setSubTab] = useState<'binder' | 'packs' | 'achievements'>('binder');
  const [categoryFilter, setCategoryFilter] = useState<CollectibleCardCategory | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<CollectibleCardRarity | 'all'>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'unowned'>('all');
  const [currency, setCurrency] = useState<'gold' | 'fragments'>('gold');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inspectedCard, setInspectedCard] = useState<CollectibleCardDef | null>(null);
  const [drawnModalCards, setDrawnModalCards] = useState<Array<{
    card: CollectibleCardDef;
    isNew: boolean;
    fragmentsConverted: number;
  }> | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void refreshCardsState();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3400);
  };

  const ownedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of cardsState?.ownedCards || []) {
      map.set(entry.cardId, entry.quantity);
    }
    return map;
  }, [cardsState?.ownedCards]);

  const favoriteIds = cardsState?.favoriteCardIds || [];
  const goldBalance = walletState?.goldBalance ?? stats.gold;
  const fragmentBalance = walletState?.cosmeticFragments ?? 0;

  const rarityBreakdown = useMemo(() => {
    return (['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as CollectibleCardRarity[]).map(r => {
      const total = COLLECTIBLE_CARDS_CATALOG.filter(c => c.rarity === r).length;
      const owned = COLLECTIBLE_CARDS_CATALOG.filter(c => c.rarity === r && ownedMap.has(c.id)).length;
      return { rarity: r, owned, total };
    });
  }, [ownedMap]);

  const filteredCards = useMemo(() => {
    return COLLECTIBLE_CARDS_CATALOG.filter(c => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
      const isOwned = ownedMap.has(c.id);
      if (ownershipFilter === 'owned' && !isOwned) return false;
      if (ownershipFilter === 'unowned' && isOwned) return false;
      return true;
    });
  }, [categoryFilter, rarityFilter, ownershipFilter, ownedMap]);

  const handleToggleFavorite = async (cardId: string) => {
    if (!ownedMap.has(cardId)) return;
    const exists = favoriteIds.includes(cardId);
    if (!exists && favoriteIds.length >= 3) {
      flash('error', 'Profile showcase supports up to 3 favorite cards. Remove one first.');
      return;
    }
    const next = exists ? favoriteIds.filter(id => id !== cardId) : [...favoriteIds, cardId];
    setBusyId(`fav-${cardId}`);
    const res = await setFavoriteCards(next);
    setBusyId(null);
    if (res.success) flash('success', exists ? 'Removed from favorite showcase.' : 'Added to favorite showcase!');
    else flash('error', res.error || 'Could not update favorites.');
  };

  const handleOpenPack = async (packId: string) => {
    setBusyId(`pack-${packId}`);
    const res = await openCardPack(packId, currency);
    setBusyId(null);
    if (!res.success || !res.drawnCards) {
      flash('error', res.error || 'Could not open card pack.');
      return;
    }
    const resolved = res.drawnCards
      .map(d => {
        const card = COLLECTIBLE_CARDS_CATALOG.find(c => c.id === d.cardId);
        return card ? { card, isNew: d.isNew, fragmentsConverted: d.fragmentsConverted } : null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    setDrawnModalCards(resolved);
    if ((res.fragmentsGrantedFromDuplicates || 0) > 0) {
      flash('success', `Converted duplicate draws into +${res.fragmentsGrantedFromDuplicates} Cosmetic Fragments.`);
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    setBusyId(`ach-${achievementId}`);
    const res = await claimCardAchievement(achievementId);
    setBusyId(null);
    if (res.success) flash('success', 'Card collection achievement claimed!');
    else flash('error', res.error || 'Requirements not met yet.');
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1360px] mx-auto">
      {/* Header Summary */}
      <FeatureBanner
        themeId="character"
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-5"
      >
        <div className="space-y-2">
          <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#D6A84B]">
            2D Collectible Chronicle Binder
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2EDF7]">
            Fantasy Card Collection
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#A69AAF] tabular-nums">
            <span>
              <strong className="text-[#F2EDF7]">
                <AnimatedCounter value={ownedMap.size} />
              </strong>{' '}
              / {COLLECTIBLE_CARDS_CATALOG.length} Cards Owned ({cardsState?.completionPercent || 0}%)
            </span>
            <span aria-hidden="true" className="text-[#766D82]">·</span>
            <span className="text-[#E8C777] font-mono">
              <AnimatedCounter value={goldBalance} /> Gold
            </span>
            <span aria-hidden="true" className="text-[#766D82]">·</span>
            <span className="text-[#9A72CC] font-mono">
              <AnimatedCounter value={fragmentBalance} /> Fragments
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums">
            {rarityBreakdown.map(r => (
              <span key={r.rarity} className={RARITY_COLORS[r.rarity]}>
                {r.rarity}: {r.owned}/{r.total}
              </span>
            ))}
          </div>
        </div>

        <FeatureTabBar
          themeId="character"
          layoutId="cards-subtab-pill"
          ariaLabel="Card collection sections"
          activeId={subTab}
          onSelect={id => setSubTab(id)}
          tabs={[
            { id: 'binder', label: 'Card Binder', icon: Layers },
            { id: 'packs', label: 'Card Packs', icon: PackageOpen },
            { id: 'achievements', label: 'Deck Honors', icon: Award },
          ]}
        />
      </FeatureBanner>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#49B88A]/10 border-[#49B88A]/45 text-[#49B88A]'
              : 'bg-[#D65C66]/12 border-[#D65C66]/45 text-[#D65C66]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <RpgSubTabTransition tabKey={subTab}>
        {/* BINDER TAB */}
        {subTab === 'binder' && (
          <div className="space-y-5">
            {/* Favorites Showcase Strip */}
            <div className="lq-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#D65C66]" />
                  Pinned Profile Favorite Cards ({favoriteIds.length} / 3)
                </h3>
                <span className="text-xs text-[#A69AAF]">Shown on your Public Champion Profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map(slot => {
                  const cid = favoriteIds[slot];
                  const card = cid ? COLLECTIBLE_CARDS_CATALOG.find(c => c.id === cid) : null;
                  return card ? (
                    <div
                      key={card.id}
                      className="lq-surface-gold rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold ${RARITY_COLORS[card.rarity]}`}>{card.rarity}</p>
                        <p className="font-['Cinzel'] font-bold text-xs text-[#F2EDF7] truncate">{card.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite(card.id)}
                        className="lq-btn px-2.5 py-1 rounded-lg bg-[#100D18] hover:bg-[#D65C66]/15 border border-[#362B45] hover:border-[#D65C66]/50 text-[11px] text-[#D65C66] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      key={slot}
                      className="rounded-xl bg-[#100D18]/70 border border-dashed border-[#362B45] p-3 text-xs text-[#766D82] flex items-center justify-center"
                    >
                      Favorite Slot {slot + 1} Empty
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'fitness_milestone', 'seasonal_theme', 'community_event', 'mythic_hero'] as const).map(
                  cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat ? 'lq-btn-primary' : 'lq-btn-secondary text-[#A69AAF]'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={rarityFilter}
                  onChange={e => setRarityFilter(e.target.value as CollectibleCardRarity | 'all')}
                  className="lq-input px-3 py-1.5 text-xs"
                >
                  <option value="all">All Rarities</option>
                  {(['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as CollectibleCardRarity[]).map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  value={ownershipFilter}
                  onChange={e => setOwnershipFilter(e.target.value as 'all' | 'owned' | 'unowned')}
                  className="lq-input px-3 py-1.5 text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="owned">Owned Only</option>
                  <option value="unowned">Missing Only</option>
                </select>
              </div>
            </div>

            {/* Card Grid */}
            <RpgStaggerGrid
              key={`${categoryFilter}-${rarityFilter}-${ownershipFilter}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {filteredCards.map(card => {
                const qty = ownedMap.get(card.id) || 0;
                const isOwned = qty > 0;
                const isFav = favoriteIds.includes(card.id);
                return (
                  <RpgStaggerItem key={card.id}>
                    <div
                      className={`${
                        isOwned
                          ? isFav
                            ? 'lq-card-gold lq-card-interactive'
                            : 'lq-card lq-card-interactive'
                          : 'lq-surface opacity-75'
                      } rounded-2xl p-4 h-full flex flex-col justify-between gap-3`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-semibold ${RARITY_COLORS[card.rarity]}`}>{card.rarity}</span>
                          <span className="text-[#A69AAF] font-mono tabular-nums">
                            {isOwned ? `Owned x${qty}` : 'Unowned'}
                          </span>
                        </div>

                        <CollectibleCardArtwork card={card} size="sm" />

                        <div>
                          <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7] truncate">{card.name}</h4>
                          <p className="text-[11px] text-[#A69AAF] mt-0.5">
                            {card.subtitle}
                            {card.limitedEdition ? ' · Limited' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setInspectedCard(card)}
                          className="lq-btn lq-btn-secondary flex-1 py-1.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                        {isOwned && (
                          <button
                            type="button"
                            disabled={busyId === `fav-${card.id}`}
                            onClick={() => void handleToggleFavorite(card.id)}
                            className={`lq-btn py-1.5 px-2.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer ${
                              isFav
                                ? 'bg-[#7045A0]/30 border border-[#D6A84B]/60 text-[#E8C777]'
                                : 'lq-btn-secondary text-[#A69AAF]'
                            }`}
                          >
                            {isFav ? 'Pinned' : 'Pin'}
                          </button>
                        )}
                      </div>
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>
          </div>
        )}

        {/* PACKS TAB */}
        {subTab === 'packs' && (
          <div className="space-y-6">
            <div className="lq-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7]">
                  Transparent Card Packs · Earned Currency Only
                </h3>
                <p className="text-xs text-[#A69AAF]">
                  Every pack displays exact rarity odds summing to 100%. Duplicate draws automatically convert into Cosmetic Fragments (Common {DUPLICATE_CARD_FRAGMENT_RATES.Common}, Rare {DUPLICATE_CARD_FRAGMENT_RATES.Rare}, Epic {DUPLICATE_CARD_FRAGMENT_RATES.Epic}, Legendary {DUPLICATE_CARD_FRAGMENT_RATES.Legendary}, Mythic {DUPLICATE_CARD_FRAGMENT_RATES.Mythic}).
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#100D18] border border-[#362B45] shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency('gold')}
                  className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    currency === 'gold' ? 'lq-btn-gold font-bold' : 'text-[#A69AAF] hover:text-[#F2EDF7]'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  Use Gold
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('fragments')}
                  className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    currency === 'fragments' ? 'lq-btn-primary' : 'text-[#A69AAF] hover:text-[#F2EDF7]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use Fragments
                </button>
              </div>
            </div>

            <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CARD_PACKS_CATALOG.map(pack => {
                const price = currency === 'gold' ? pack.priceGold : pack.priceFragments;
                const canAfford = currency === 'gold' ? goldBalance >= price : fragmentBalance >= price;
                return (
                  <RpgStaggerItem key={pack.id}>
                    <div className="lq-card lq-card-interactive rounded-2xl p-5 h-full flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#E8C777]">{pack.cardCount} Cards Inside</span>
                          <span className="text-[#A69AAF]">Min {pack.guaranteedMinRarity}</span>
                        </div>
                        <h4 className="font-['Cinzel'] font-bold text-lg text-[#F2EDF7]">{pack.name}</h4>
                        <p className="text-xs text-[#A69AAF] leading-relaxed">{pack.description}</p>

                        <div className="pt-2 border-t border-[#362B45] space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#A69AAF]">Disclosed Drop Odds (100%)</p>
                          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono tabular-nums">
                            {(['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as CollectibleCardRarity[]).map(r => (
                              <div key={r} className="flex items-center justify-between pr-2">
                                <span className={RARITY_COLORS[r]}>{r}</span>
                                <span className="text-[#F2EDF7]">{pack.dropRates[r]}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford || busyId === `pack-${pack.id}`}
                        onClick={() => void handleOpenPack(pack.id)}
                        className={`lq-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                          canAfford ? 'lq-btn-gold' : 'lq-btn-secondary opacity-50'
                        }`}
                      >
                        {busyId === `pack-${pack.id}`
                          ? 'Opening Pack...'
                          : `Open Pack (${price} ${currency === 'gold' ? 'Gold' : 'Fragments'})`}
                      </button>
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>
          </div>
        )}

        {/* CARD ACHIEVEMENTS TAB */}
        {subTab === 'achievements' && (
          <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARD_COLLECTION_ACHIEVEMENTS.map(ach => {
              const claimed = cardsState?.claimedCollectionAchievements?.includes(ach.id);
              const currentCount = ach.requiredRarity
                ? COLLECTIBLE_CARDS_CATALOG.filter(c => c.rarity === ach.requiredRarity && ownedMap.has(c.id))
                    .length
                : ownedMap.size;
              const eligible = currentCount >= ach.requiredUniqueCards && !claimed;

              return (
                <RpgStaggerItem key={ach.id}>
                  <div className="lq-card lq-card-interactive rounded-2xl p-5 flex items-center justify-between gap-4 h-full">
                    <div className="space-y-1">
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2EDF7]">{ach.title}</h4>
                      <p className="text-xs text-[#A69AAF]">{ach.description}</p>
                      <p className="text-xs text-[#E8C777] font-mono tabular-nums pt-1">
                        Progress: {Math.min(currentCount, ach.requiredUniqueCards)} / {ach.requiredUniqueCards} · +{ach.rewardGold} Gold · <span className="text-[#9A72CC]">+{ach.rewardFragments} Fragments</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!eligible || busyId === `ach-${ach.id}`}
                      onClick={() => void handleClaimAchievement(ach.id)}
                      className={`lq-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        claimed
                          ? 'bg-[#49B88A]/15 border border-[#49B88A]/45 text-[#49B88A]'
                          : eligible
                          ? 'lq-btn-gold font-bold'
                          : 'lq-btn-secondary opacity-50'
                      }`}
                    >
                      {claimed ? 'Claimed' : eligible ? 'Claim' : 'Locked'}
                    </button>
                  </div>
                </RpgStaggerItem>
              );
            })}
          </RpgStaggerGrid>
        )}
      </RpgSubTabTransition>

      {/* Card Detail Inspection Modal */}
      <RpgModalWrapper
        isOpen={Boolean(inspectedCard)}
        onClose={() => setInspectedCard(null)}
        panelClassName="w-full max-w-md"
      >
        {inspectedCard && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={inspectedCard.name}
            className="lq-card-gold rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${RARITY_COLORS[inspectedCard.rarity]}`}>
                {inspectedCard.rarity} · {CATEGORY_LABELS[inspectedCard.category]}
              </span>
              <button
                type="button"
                onClick={() => setInspectedCard(null)}
                aria-label="Close card preview"
                className="text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CollectibleCardArtwork card={inspectedCard} size="lg" />
            <div>
              <h3 className="font-['Cinzel'] font-black text-xl text-[#F2EDF7]">{inspectedCard.name}</h3>
              <p className="text-xs text-[#D6A84B] mt-0.5">{inspectedCard.subtitle}</p>
              <p className="text-xs text-[#A69AAF] mt-3 leading-relaxed">{inspectedCard.lore}</p>
            </div>
            <div className="pt-3 border-t border-[#362B45] flex items-center justify-between text-xs">
              <span className="text-[#A69AAF]">{inspectedCard.flavorStatLabel}</span>
              <span className="font-bold text-[#E8C777]">{inspectedCard.flavorStatValue}</span>
            </div>
          </div>
        )}
      </RpgModalWrapper>

      {/* Pack Reveal Modal */}
      <RpgModalWrapper
        isOpen={Boolean(drawnModalCards)}
        onClose={() => setDrawnModalCards(null)}
        panelClassName="w-full max-w-2xl"
      >
        {drawnModalCards && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cards Drawn From Pack"
            className="lq-card-gold rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-black text-lg text-[#E8C777]">
                Cards Drawn From Pack
              </h3>
              <button
                type="button"
                onClick={() => setDrawnModalCards(null)}
                className="lq-btn lq-btn-gold px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {drawnModalCards.map((d, i) => (
                <div
                  key={`${d.card.id}-${i}`}
                  className="lq-surface rounded-xl p-3 space-y-2.5"
                >
                  <CollectibleCardArtwork card={d.card} size="sm" />
                  <div>
                    <p className={`text-[11px] font-bold ${RARITY_COLORS[d.card.rarity]}`}>
                      {d.card.rarity} · {d.isNew ? 'New Card' : `+${d.fragmentsConverted} Fragments`}
                    </p>
                    <h4 className="font-['Cinzel'] font-bold text-xs text-[#F2EDF7] mt-0.5">
                      {d.card.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};
