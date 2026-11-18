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
      <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/25 p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-300 font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero Pay-to-Win Guarantee · Strictly Cosmetic & Card Packs</span>
            <span className="text-[#D9D2C5]/40" aria-hidden="true">·</span>
            <span className="text-amber-300 flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              {rotationLabel}
            </span>
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-white">
            COSMETIC MARKETPLACE
          </h2>
          <p className="text-xs text-[#D9D2C5]/75 max-w-2xl">
            Spend earned Gold or Cosmetic Fragments on bespoke frames, banners, auras, outfits, titles, and collectible card packs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="rounded-xl bg-[#08060f] border border-[#C5A15A]/30 px-4 py-2 text-xs tabular-nums">
            <span className="text-[#D9D2C5]/60 block text-[11px]">Gold Wallet</span>
            <span className="font-mono font-bold text-amber-300 text-sm">{goldBalance.toLocaleString()}</span>
          </div>
          <div className="rounded-xl bg-[#08060f] border border-purple-500/35 px-4 py-2 text-xs tabular-nums">
            <span className="text-[#D9D2C5]/60 block text-[11px]">Cosmetic Fragments</span>
            <span className="font-mono font-bold text-purple-300 text-sm">{fragmentBalance.toLocaleString()}</span>
          </div>
          <button
            type="button"
            disabled={busyId === 'rm-check'}
            onClick={() => void handleRmCheckoutAttempt()}
            className="px-3.5 py-2.5 rounded-xl bg-[#161124] border border-white/15 text-xs text-[#D9D2C5]/75 hover:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5 text-amber-300" />
            Payment Checkout Disabled
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : notice.type === 'info'
              ? 'bg-amber-950/55 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Curated Citadel Spotlight */}
      {featuredItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#C5A15A] flex items-center gap-2">
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
                  className="rounded-2xl border border-[#C5A15A]/45 p-5 flex flex-col justify-between gap-4"
                  style={{
                    background: `radial-gradient(circle at top right, ${item.accentHex}20, transparent 58%), #100D19`,
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#E8CF96] font-semibold">{item.featuredCollectionTag || 'Featured'}</span>
                      <span className="text-[#D9D2C5]/60">{item.rarity}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-white">{item.name}</h4>
                    <p className="text-xs text-[#D9D2C5]/75">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => setConfirmItem(item)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap ${
                      owned
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914]'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                category === t.id
                  ? 'bg-[#251638] text-[#C5A15A] border border-[#C5A15A]/45'
                  : 'bg-[#100D19] text-[#D9D2C5]/70 border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#08060f] border border-[#C5A15A]/20">
          <button
            type="button"
            onClick={() => setCurrency('gold')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currency === 'gold' ? 'bg-[#C5A15A] text-[#0c0914]' : 'text-[#D9D2C5]/70'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Pay in Gold
          </button>
          <button
            type="button"
            onClick={() => setCurrency('fragments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currency === 'fragments' ? 'bg-[#7046A5] text-white' : 'text-[#D9D2C5]/70'
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
              className="rounded-2xl bg-[#100D19] border border-white/10 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div
                  className="h-14 rounded-xl border border-white/10 flex items-center justify-between px-4"
                  style={{
                    background: `linear-gradient(135deg, ${item.primaryHex}, #08060f)`,
                  }}
                >
                  <span className="text-xs font-semibold capitalize text-[#D9D2C5]/80">
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
                      className={`p-1.5 rounded-lg border shrink-0 ${
                        wishlisted
                          ? 'bg-rose-950/60 border-rose-500/45 text-rose-300'
                          : 'bg-[#08060f] border-white/10 text-[#D9D2C5]/55 hover:text-white'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#D9D2C5]/75 mt-1">{item.description}</p>
                  <p className="text-[11px] text-[#D9D2C5]/45 mt-2">
                    Ref Tier: {item.realMoneyUsdDisplay}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {owned ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('customization')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Owned · Customize
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => setConfirmItem(item)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap ${
                      canAfford
                        ? 'bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914]'
                        : 'bg-[#161124] border border-white/10 text-[#D9D2C5]/45'
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
        <div className="rounded-2xl bg-[#100D19] border border-[#C5A15A]/20 p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#C5A15A]" />
            Marketplace Order Ledger
          </h3>
          <div className="divide-y divide-white/10 text-xs">
            {marketplaceState.orders.slice(0, 8).map(ord => (
              <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#D9D2C5]/85">{ord.itemName}</span>
                <span className="font-mono text-[#C5A15A] tabular-nums">
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#100D19] border border-[#C5A15A]/50 p-6 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#C5A15A]" />
                Confirm Cosmetic Acquisition
              </h3>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                aria-label="Close confirmation"
                className="text-[#D9D2C5]/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl bg-[#08060f] border border-white/10 p-4 space-y-1">
              <p className="font-['Cinzel'] font-bold text-sm text-[#E8CF96]">{confirmItem.name}</p>
              <p className="text-xs text-[#D9D2C5]/75">{confirmItem.description}</p>
              <p className="text-xs font-mono text-white pt-2 tabular-nums">
                Cost: {currency === 'gold' ? confirmItem.priceGold : confirmItem.priceFragments}{' '}
                {currency === 'gold' ? 'Gold' : 'Cosmetic Fragments'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#D9D2C5]/75 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmItem.id}
                onClick={() => void handleConfirmPurchase()}
                className="px-4 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#0c0914] text-xs font-bold"
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
