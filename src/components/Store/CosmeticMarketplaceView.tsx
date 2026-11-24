import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { MARKETPLACE_ITEMS_CATALOG } from '../../data/aaaGamingData';
import type { MarketplaceCategory, MarketplaceItemDef } from '../../types/game';
import {
  Check,
  Clock,
  Coins,
  Heart,
  History,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';

const CATEGORY_TABS: Array<{ id: MarketplaceCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Cosmetics' },
  { id: 'frame', label: 'Frames' },
  { id: 'banner', label: 'Banners' },
  { id: 'aura', label: 'Auras' },
  { id: 'outfit', label: 'Outfits' },
  { id: 'title', label: 'Titles' },
  { id: 'pack', label: 'Card Packs' },
];

export const CosmeticMarketplaceView: React.FC = () => {
  const {
    stats,
    walletState,
    marketplaceState,
    refreshMarketplaceState,
    toggleMarketplaceWishlist,
    purchaseMarketplaceItem,
    attemptMarketplaceRmCheckout,
    setActiveTab,
  } = useGame();

  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [currency, setCurrency] = useState<'gold' | 'fragments'>('gold');
  const [confirmItem, setConfirmItem] = useState<MarketplaceItemDef | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    void refreshMarketplaceState();
  }, []);

  const flash = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const goldBalance = walletState?.goldBalance ?? marketplaceState?.wallet?.goldBalance ?? stats.gold;
  const fragmentBalance =
    walletState?.cosmeticFragments ?? marketplaceState?.wallet?.cosmeticFragments ?? 0;
  const ownedSet = useMemo(
    () => new Set(marketplaceState?.ownedItemIds || []),
    [marketplaceState?.ownedItemIds]
  );
  const wishlistSet = useMemo(
    () => new Set(marketplaceState?.wishlistIds || []),
    [marketplaceState?.wishlistIds]
  );

  const featuredItems = useMemo(() => {
    const ids = new Set(marketplaceState?.featuredItemIds || []);
    return MARKETPLACE_ITEMS_CATALOG.filter(item => ids.has(item.id) || item.rotating).slice(0, 3);
  }, [marketplaceState?.featuredItemIds]);

  const filteredItems = useMemo(() => {
    return MARKETPLACE_ITEMS_CATALOG.filter(
      item => category === 'all' || item.category === category
    );
  }, [category]);

  const rotationLabel = useMemo(() => {
    if (!marketplaceState?.rotationEndsAt) return 'Rotating Weekly Selection';
    const ms = Math.max(0, Date.parse(marketplaceState.rotationEndsAt) - Date.now());
    const days = Math.floor(ms / 86400000);
    const hrs = Math.floor((ms % 86400000) / 3600000);
    return `Rotates in ${days}d ${hrs}h`;
  }, [marketplaceState?.rotationEndsAt]);

  const handleConfirmPurchase = async () => {
    if (!confirmItem) return;
    setBusyId(confirmItem.id);
    const res = await purchaseMarketplaceItem(confirmItem.id, currency);
    setBusyId(null);
    if (res.success) {
      flash('success', `Acquired ${confirmItem.name}! Ready inside Customization / Cards.`);
      setConfirmItem(null);
    } else {
      flash('error', res.error || 'Could not complete marketplace acquisition.');
    }
  };

  const handleRmCheckoutAttempt = async () => {
    setBusyId('rm-check');
    const res = await attemptMarketplaceRmCheckout();
    setBusyId(null);
    flash(
      'info',
      res.error || 'Real-money checkout is disabled until payment settlement is configured.'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Integrity & Currencies Header */}
      <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/30 p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-[0_12px_32px_rgba(9,9,16,0.75)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#34D399] font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero Pay-to-Win Guarantee · Strictly Cosmetic & Card Packs</span>
            <span className="text-[#A1A1B8]/45" aria-hidden="true">·</span>
            <span className="text-[#D6A84B] flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              {rotationLabel}
            </span>
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-white">
            COSMETIC MARKETPLACE
          </h2>
          <p className="text-xs text-[#A1A1B8] max-w-2xl">
            Spend earned Gold or Cosmetic Fragments on bespoke frames, banners, auras, outfits, titles, and collectible card packs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="rounded-xl bg-[#0E0E17] border border-[#D6A84B]/45 px-4 py-2 text-xs tabular-nums">
            <span className="text-[#A1A1B8] block text-[11px]">Gold Wallet</span>
            <span className="font-mono font-bold text-[#FBBF24] text-sm">{goldBalance.toLocaleString()}</span>
          </div>
          <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/45 px-4 py-2 text-xs tabular-nums">
            <span className="text-[#A1A1B8] block text-[11px]">Cosmetic Fragments</span>
            <span className="font-mono font-bold text-[#C4B5FD] text-sm">{fragmentBalance.toLocaleString()}</span>
          </div>
          <button
            type="button"
            disabled={busyId === 'rm-check'}
            onClick={() => void handleRmCheckoutAttempt()}
            className="px-3.5 py-2.5 rounded-xl bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/35 text-xs text-[#A1A1B8] hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
          >
            <Lock className="w-3.5 h-3.5 text-[#D6A84B]" />
            Payment Checkout Disabled
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-[#34D399]/40 text-emerald-200'
              : notice.type === 'info'
              ? 'bg-amber-950/55 border-[#FBBF24]/40 text-amber-200'
              : 'bg-rose-950/60 border-[#FB7185]/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Curated Citadel Spotlight */}
      {featuredItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#D6A84B] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Citadel Rotating Spotlight
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredItems.map(item => {
              const owned = ownedSet.has(item.id) && item.category !== 'pack';
              const price = currency === 'gold' ? item.priceGold : item.priceFragments;
              return (
                <div
                  key={`spot-${item.id}`}
                  className="rounded-2xl border border-[#8B5CF6]/40 hover:border-[#D6A84B]/60 p-5 flex flex-col justify-between gap-4 transition-all"
                  style={{
                    background: `radial-gradient(circle at top right, ${item.accentHex}20, transparent 58%), #141420`,
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#D6A84B] font-semibold">{item.featuredCollectionTag || 'Featured'}</span>
                      <span className="text-[#A1A1B8]">{item.rarity}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">{item.name}</h4>
                    <p className="text-xs text-[#A1A1B8]">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => setConfirmItem(item)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      owned
                        ? 'bg-emerald-950/60 border border-[#34D399]/40 text-[#34D399]'
                        : 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                    }`}
                  >
                    {owned
                      ? 'Already Owned'
                      : `Acquire (${price} ${currency === 'gold' ? 'Gold' : 'Fragments'})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Currency Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCategory(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                category === t.id
                  ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white border border-[#D6A84B]/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                  : 'bg-[#0E0E17] hover:bg-[#1B1B2B] text-[#A1A1B8] hover:text-white border border-[#8B5CF6]/25'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090910] border border-[#8B5CF6]/30">
          <button
            type="button"
            onClick={() => setCurrency('gold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              currency === 'gold'
                ? 'bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] text-[#090910] font-bold shadow-[0_0_12px_rgba(214,168,75,0.35)]'
                : 'text-[#A1A1B8] hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Pay in Gold
          </button>
          <button
            type="button"
            onClick={() => setCurrency('fragments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              currency === 'fragments'
                ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                : 'text-[#A1A1B8] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pay in Fragments
          </button>
        </div>
      </div>

      {/* Main Catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const owned = ownedSet.has(item.id) && item.category !== 'pack';
          const wishlisted = wishlistSet.has(item.id);
          const price = currency === 'gold' ? item.priceGold : item.priceFragments;
          const canAfford = currency === 'gold' ? goldBalance >= price : fragmentBalance >= price;

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/30 hover:border-[#D6A84B]/50 p-5 flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-3">
                <div
                  className="h-14 rounded-xl border border-white/10 flex items-center justify-between px-4"
                  style={{
                    background: `linear-gradient(135deg, ${item.primaryHex}, #090910)`,
                  }}
                >
                  <span className="text-xs font-semibold capitalize text-white/85">
                    {item.category}
                  </span>
                  <span className="text-xs font-bold" style={{ color: item.accentHex }}>
                    {item.rarity}
                  </span>
                </div>

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-['Cinzel'] font-bold text-sm text-white">{item.name}</h4>
                    <button
                      type="button"
                      onClick={() => void toggleMarketplaceWishlist(item.id)}
                      aria-label={`Wishlist ${item.name}`}
                      className={`p-1.5 rounded-lg border shrink-0 transition-all ${
                        wishlisted
                          ? 'bg-rose-950/60 border-[#FB7185]/45 text-[#FB7185]'
                          : 'bg-[#0E0E17] border-[#8B5CF6]/30 text-[#A1A1B8] hover:text-white'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#A1A1B8] mt-1">{item.description}</p>
                  <p className="text-[11px] text-[#A1A1B8]/70 mt-2">
                    Ref Tier: {item.realMoneyUsdDisplay}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {owned ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('customization')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 border border-[#34D399]/40 text-xs font-semibold text-[#34D399] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Owned · Customize
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => setConfirmItem(item)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                        : 'bg-[#0E0E17] border border-[#8B5CF6]/20 text-[#A1A1B8]/50'
                    }`}
                  >
                    Acquire ({price} {currency === 'gold' ? 'Gold' : 'Fragments'})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order History */}
      {marketplaceState && marketplaceState.orders.length > 0 && (
        <div className="rounded-2xl bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/30 p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#D6A84B]" />
            Marketplace Order Ledger
          </h3>
          <div className="divide-y divide-[#8B5CF6]/20 text-xs">
            {marketplaceState.orders.slice(0, 8).map(ord => (
              <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-white/90">{ord.itemName}</span>
                <span className="font-mono text-[#D6A84B] tabular-nums">
                  -{ord.pricePaid} {ord.currency} · {new Date(ord.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {confirmItem && (
        <div
          className="fixed inset-0 z-50 bg-[#090910]/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#141420] border border-[#D6A84B]/50 p-6 space-y-4 shadow-[0_16px_40px_rgba(9,9,16,0.9)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#D6A84B]" />
                Confirm Cosmetic Acquisition
              </h3>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                aria-label="Close confirmation"
                className="text-[#A1A1B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl bg-[#0E0E17] border border-[#8B5CF6]/30 p-4 space-y-1">
              <p className="font-['Cinzel'] font-bold text-sm text-[#D6A84B]">{confirmItem.name}</p>
              <p className="text-xs text-[#A1A1B8]">{confirmItem.description}</p>
              <p className="text-xs font-mono text-white pt-2 tabular-nums">
                Cost: {currency === 'gold' ? confirmItem.priceGold : confirmItem.priceFragments}{' '}
                {currency === 'gold' ? 'Gold' : 'Cosmetic Fragments'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#A1A1B8] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmItem.id}
                onClick={() => void handleConfirmPurchase()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] hover:brightness-110 text-white text-xs font-bold shadow-[0_0_14px_rgba(139,92,246,0.35)] transition-all"
              >
                {busyId === confirmItem.id ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
