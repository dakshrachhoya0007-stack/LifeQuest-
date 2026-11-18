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
  Lock,
  PackageOpen,
  Sparkles,
  X,
} from 'lucide-react';

const RARITY_COLORS: Record<CollectibleCardRarity, string> = {
  Common: 'text-slate-300',
  Rare: 'text-sky-300',
  Epic: 'text-purple-300',
  Legendary: 'text-[#E8CF96]',
  Mythic: 'text-rose-300',
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
    <div className="space-y-6 animate-in fade-in">
      {/* Header Summary */}
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-2">
          <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#C5A15A]">
            2D Collectible Chronicle Binder
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-white">
            FANTASY CARD COLLECTION
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#D9D2C5]/75 tabular-nums">
            <span>
              <strong className="text-white">{ownedMap.size}</strong> / {COLLECTIBLE_CARDS_CATALOG.length} Cards Owned ({cardsState?.completionPercent || 0}%)
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300 font-mono">{goldBalance.toLocaleString()} Gold</span>
            <span aria-hidden="true">·</span>
            <span className="text-purple-300 font-mono">{fragmentBalance.toLocaleString()} Fragments</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] tabular-nums">
            {rarityBreakdown.map(r => (
              <span key={r.rarity} className={RARITY_COLORS[r.rarity]}>
                {r.rarity}: {r.owned}/{r.total}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#08060f] border border-[#C5A15A]/20 self-start xl:self-auto">
          {[
            { id: 'binder', label: 'Card Binder', icon: Layers },
            { id: 'packs', label: 'Card Packs', icon: PackageOpen },
            { id: 'achievements', label: 'Deck Honors', icon: Award },
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as typeof subTab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                    : 'text-[#D9D2C5]/65 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* BINDER TAB */}
      {subTab === 'binder' && (
        <div className="space-y-5">
          {/* Favorites Showcase Strip */}
          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-300" />
                Pinned Profile Favorite Cards ({favoriteIds.length} / 3)
              </h3>
              <span className="text-xs text-[#D9D2C5]/60">Shown on your Public Champion Profile</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map(slot => {
                const cid = favoriteIds[slot];
                const card = cid ? COLLECTIBLE_CARDS_CATALOG.find(c => c.id === cid) : null;
                return card ? (
                  <div
                    key={card.id}
                    className="rounded-xl bg-[#08060f] border border-[#C5A15A]/30 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold ${RARITY_COLORS[card.rarity]}`}>{card.rarity}</p>
                      <p className="font-['Cinzel'] font-bold text-xs text-white truncate">{card.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(card.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#161124] hover:bg-rose-950/60 text-[11px] text-rose-200 whitespace-nowrap shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    key={slot}
                    className="rounded-xl bg-[#08060f]/60 border border-dashed border-white/10 p-3 text-xs text-[#D9D2C5]/45 flex items-center justify-center"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                        : 'bg-[#100D19] text-[#D9D2C5]/70 border border-white/10'
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
                className="rounded-lg bg-[#08060f] border border-[#C5A15A]/25 px-3 py-1.5 text-xs text-white"
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
                className="rounded-lg bg-[#08060f] border border-[#C5A15A]/25 px-3 py-1.5 text-xs text-white"
              >
                <option value="all">All Status</option>
                <option value="owned">Owned Only</option>
                <option value="unowned">Missing Only</option>
              </select>
            </div>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCards.map(card => {
              const qty = ownedMap.get(card.id) || 0;
              const isOwned = qty > 0;
              const isFav = favoriteIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-colors ${
                    isOwned ? 'bg-[#100D19] border-[#C5A15A]/30' : 'bg-[#0b0813] border-white/10 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${RARITY_COLORS[card.rarity]}`}>{card.rarity}</span>
                      <span className="text-[#D9D2C5]/60 font-mono tabular-nums">
                        {isOwned ? `Owned x${qty}` : 'Unowned'}
                      </span>
                    </div>

                    <CollectibleCardArtwork card={card} size="sm" />

                    <div>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-white truncate">{card.name}</h4>
                      <p className="text-[11px] text-[#D9D2C5]/65 mt-0.5">
                        {card.subtitle}
                        {card.limitedEdition ? ' · Limited' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setInspectedCard(card)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#161124] hover:bg-[#251638] border border-white/10 text-xs text-[#D9D2C5] flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>
                    {isOwned && (
                      <button
                        type="button"
                        disabled={busyId === `fav-${card.id}`}
                        onClick={() => void handleToggleFavorite(card.id)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs border whitespace-nowrap shrink-0 ${
                          isFav
                            ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                            : 'bg-[#161124] border-white/10 text-[#D9D2C5]/75 hover:text-white'
                        }`}
                      >
                        {isFav ? 'Pinned' : 'Pin'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PACKS TAB */}
      {subTab === 'packs' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-['Cinzel'] font-bold text-base text-white">
                Transparent Card Packs · Earned Currency Only
              </h3>
              <p className="text-xs text-[#D9D2C5]/75">
                Every pack displays exact rarity odds summing to 100%. Duplicate draws automatically convert into Cosmetic Fragments (Common {DUPLICATE_CARD_FRAGMENT_RATES.Common}, Rare {DUPLICATE_CARD_FRAGMENT_RATES.Rare}, Epic {DUPLICATE_CARD_FRAGMENT_RATES.Epic}, Legendary {DUPLICATE_CARD_FRAGMENT_RATES.Legendary}, Mythic {DUPLICATE_CARD_FRAGMENT_RATES.Mythic}).
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#08060f] border border-[#C5A15A]/20 shrink-0">
              <button
                type="button"
                onClick={() => setCurrency('gold')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  currency === 'gold' ? 'bg-[#C5A15A] text-[#0c0914]' : 'text-[#D9D2C5]/70'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Use Gold
              </button>
              <button
                type="button"
                onClick={() => setCurrency('fragments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  currency === 'fragments' ? 'bg-[#7046A5] text-white' : 'text-[#D9D2C5]/70'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use Fragments
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CARD_PACKS_CATALOG.map(pack => {
              const price = currency === 'gold' ? pack.priceGold : pack.priceFragments;
              const canAfford = currency === 'gold' ? goldBalance >= price : fragmentBalance >= price;
              return (
                <div
                  key={pack.id}
                  className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#C5A15A]">{pack.cardCount} Cards Inside</span>
                      <span className="text-[#D9D2C5]/65">Min {pack.guaranteedMinRarity}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-lg text-white">{pack.name}</h4>
                    <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">{pack.description}</p>

                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <p className="text-[11px] font-semibold text-[#D9D2C5]/70">Disclosed Drop Odds (100%)</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono tabular-nums">
                        {(['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'] as CollectibleCardRarity[]).map(r => (
                          <div key={r} className="flex items-center justify-between pr-2">
                            <span className={RARITY_COLORS[r]}>{r}</span>
                            <span className="text-[#D9D2C5]/80">{pack.dropRates[r]}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford || busyId === `pack-${pack.id}`}
                    onClick={() => void handleOpenPack(pack.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold whitespace-nowrap ${
                      canAfford
                        ? 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914]'
                        : 'bg-[#161124] text-[#D9D2C5]/45 border border-white/10'
                    }`}
                  >
                    {busyId === `pack-${pack.id}`
                      ? 'Opening Pack...'
                      : `Open Pack (${price} ${currency === 'gold' ? 'Gold' : 'Fragments'})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARD ACHIEVEMENTS TAB */}
      {subTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CARD_COLLECTION_ACHIEVEMENTS.map(ach => {
            const claimed = cardsState?.claimedCollectionAchievements?.includes(ach.id);
            const currentCount = ach.requiredRarity
              ? COLLECTIBLE_CARDS_CATALOG.filter(c => c.rarity === ach.requiredRarity && ownedMap.has(c.id))
                  .length
              : ownedMap.size;
            const eligible = currentCount >= ach.requiredUniqueCards && !claimed;

            return (
              <div
                key={ach.id}
                className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <h4 className="font-['Cinzel'] font-bold text-sm text-white">{ach.title}</h4>
                  <p className="text-xs text-[#D9D2C5]/75">{ach.description}</p>
                  <p className="text-xs text-[#C5A15A] font-mono tabular-nums pt-1">
                    Progress: {Math.min(currentCount, ach.requiredUniqueCards)} / {ach.requiredUniqueCards} · +{ach.rewardGold} Gold · +{ach.rewardFragments} Fragments
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!eligible || busyId === `ach-${ach.id}`}
                  onClick={() => void handleClaimAchievement(ach.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 ${
                    claimed
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : eligible
                      ? 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914]'
                      : 'bg-[#161124] border border-white/10 text-[#D9D2C5]/45'
                  }`}
                >
                  {claimed ? 'Claimed' : eligible ? 'Claim' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Card Detail Inspection Modal */}
      {inspectedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInspectedCard(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#100D19] border border-[#C5A15A]/50 p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${RARITY_COLORS[inspectedCard.rarity]}`}>
                {inspectedCard.rarity} · {CATEGORY_LABELS[inspectedCard.category]}
              </span>
              <button
                type="button"
                onClick={() => setInspectedCard(null)}
                aria-label="Close card preview"
                className="text-[#D9D2C5]/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CollectibleCardArtwork card={inspectedCard} size="lg" />
            <div>
              <h3 className="font-['Cinzel'] font-black text-xl text-white">{inspectedCard.name}</h3>
              <p className="text-xs text-[#C5A15A] mt-0.5">{inspectedCard.subtitle}</p>
              <p className="text-xs text-[#D9D2C5]/80 mt-3 leading-relaxed">{inspectedCard.lore}</p>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#D9D2C5]/60">{inspectedCard.flavorStatLabel}</span>
              <span className="font-bold text-[#E8CF96]">{inspectedCard.flavorStatValue}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pack Reveal Modal */}
      {drawnModalCards && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDrawnModalCards(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#100D19] border border-[#C5A15A]/55 p-6 space-y-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-black text-lg text-[#E8CF96]">
                Cards Drawn From Pack
              </h3>
              <button
                type="button"
                onClick={() => setDrawnModalCards(null)}
                className="px-3 py-1.5 rounded-lg bg-[#C5A15A] text-[#0c0914] text-xs font-bold"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {drawnModalCards.map((d, i) => (
                <div
                  key={`${d.card.id}-${i}`}
                  className="rounded-xl bg-[#08060f] border border-[#C5A15A]/30 p-3 space-y-2.5"
                >
                  <CollectibleCardArtwork card={d.card} size="sm" />
                  <div>
                    <p className={`text-[11px] font-bold ${RARITY_COLORS[d.card.rarity]}`}>
                      {d.card.rarity} · {d.isNew ? 'New Card' : `+${d.fragmentsConverted} Fragments`}
                    </p>
                    <h4 className="font-['Cinzel'] font-bold text-xs text-white mt-0.5">
                      {d.card.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
