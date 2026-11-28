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
import {
  AnimatedCounter,
  RpgModalWrapper,
  RpgScrollReveal,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';

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
    <div className="space-y-6">
      {/* Integrity & Currencies Header */}
      <div className="lq-card rounded-2xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#38D9F5] font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero Pay-to-Win Guarantee · Strictly Cosmetic &amp; Card Packs</span>
            <span className="text-[#647A9E]" aria-hidden="true">·</span>
            <span className="text-[#38D9F5] flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              {rotationLabel}
            </span>
          </div>
          <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2F7FF]">
            Cosmetic Marketplace
          </h2>
          <p className="text-xs text-[#94A8C7] max-w-2xl">
            Spend earned Gold or Cosmetic Fragments on bespoke frames, banners, auras, outfits, titles, and collectible card packs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="lq-surface-gold rounded-xl px-4 py-2 text-xs tabular-nums">
            <span className="text-[#94A8C7] block text-[11px]">Gold Wallet</span>
            <span className="font-mono font-bold text-[#FBBF24] text-sm">
              <AnimatedCounter value={goldBalance} />
            </span>
          </div>
          <div className="lq-surface rounded-xl px-4 py-2 text-xs tabular-nums">
            <span className="text-[#94A8C7] block text-[11px]">Cosmetic Fragments</span>
            <span className="font-mono font-bold text-[#38D9F5] text-sm">
              <AnimatedCounter value={fragmentBalance} />
            </span>
          </div>
          <button
            type="button"
            disabled={busyId === 'rm-check'}
            onClick={() => void handleRmCheckoutAttempt()}
            className="lq-btn lq-btn-secondary px-3.5 py-2.5 rounded-xl text-xs text-[#94A8C7] hover:text-[#F2F7FF] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#38D9F5]" />
            Payment Checkout Disabled
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
              : notice.type === 'info'
              ? 'bg-[#00D9FF]/10 border-[#00D9FF]/45 text-[#38D9F5]'
              : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Curated Citadel Spotlight */}
      {featuredItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm uppercase tracking-wider text-[#38D9F5] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#38D9F5]" />
            Citadel Rotating Spotlight
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredItems.map(item => {
              const owned = ownedSet.has(item.id) && item.category !== 'pack';
              const price = currency === 'gold' ? item.priceGold : item.priceFragments;
              return (
                <div
                  key={`spot-${item.id}`}
                  className="lq-card lq-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-4"
                  style={{
                    background: `radial-gradient(circle at top right, ${item.accentHex}1e, transparent 60%), linear-gradient(165deg, #102440 0%, #0A1930 100%)`,
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#38D9F5] font-semibold">{item.featuredCollectionTag || 'Featured'}</span>
                      <span className="text-[#94A8C7]">{item.rarity}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">{item.name}</h4>
                    <p className="text-xs text-[#94A8C7]">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => setConfirmItem(item)}
                    className={`lq-btn w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                      owned
                        ? 'bg-[#10B981]/15 border border-[#10B981]/45 text-[#10B981]'
                        : 'lq-btn-gold'
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
              className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                category === t.id ? 'lq-btn-primary' : 'lq-btn-secondary text-[#94A8C7]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#061225] border border-[#1E3A63]">
          <button
            type="button"
            onClick={() => setCurrency('gold')}
            className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              currency === 'gold' ? 'lq-btn-gold font-bold' : 'text-[#94A8C7] hover:text-[#F2F7FF]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Pay in Gold
          </button>
          <button
            type="button"
            onClick={() => setCurrency('fragments')}
            className={`lq-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              currency === 'fragments' ? 'lq-btn-primary' : 'text-[#94A8C7] hover:text-[#F2F7FF]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pay in Fragments
          </button>
        </div>
      </div>

      {/* Main Catalog */}
      <RpgStaggerGrid key={`${category}-${currency}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const owned = ownedSet.has(item.id) && item.category !== 'pack';
          const wishlisted = wishlistSet.has(item.id);
          const price = currency === 'gold' ? item.priceGold : item.priceFragments;
          const canAfford = currency === 'gold' ? goldBalance >= price : fragmentBalance >= price;

          return (
            <RpgStaggerItem key={item.id}>
              <div className="lq-card lq-card-interactive rounded-2xl p-5 h-full flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div
                    className="h-14 rounded-xl border border-[#F2F7FF]/10 flex items-center justify-between px-4"
                    style={{
                      background: `linear-gradient(135deg, ${item.primaryHex}, #061225)`,
                    }}
                  >
                    <span className="text-xs font-semibold capitalize text-[#F2F7FF]/85">
                      {item.category}
                    </span>
                    <span className="text-xs font-bold" style={{ color: item.accentHex }}>
                      {item.rarity}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">{item.name}</h4>
                      <button
                        type="button"
                        onClick={() => void toggleMarketplaceWishlist(item.id)}
                        aria-label={`Wishlist ${item.name}`}
                        className={`lq-btn p-1.5 rounded-lg border shrink-0 cursor-pointer ${
                          wishlisted
                            ? 'bg-[#F43F5E]/15 border-[#F43F5E]/45 text-[#F43F5E]'
                            : 'lq-btn-secondary text-[#94A8C7]'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#94A8C7] mt-1">{item.description}</p>
                    <p className="text-[11px] text-[#647A9E] mt-2">
                      Ref Tier: {item.realMoneyUsdDisplay}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('character')}
                      className="lq-btn w-full py-2 px-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/45 text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Owned · View Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => setConfirmItem(item)}
                      className={`lq-btn w-full py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                        canAfford ? 'lq-btn-gold' : 'lq-btn-secondary opacity-50'
                      }`}
                    >
                      Acquire ({price} {currency === 'gold' ? 'Gold' : 'Fragments'})
                    </button>
                  )}
                </div>
              </div>
            </RpgStaggerItem>
          );
        })}
      </RpgStaggerGrid>

      {/* Order History */}
      {marketplaceState && marketplaceState.orders.length > 0 && (
        <RpgScrollReveal className="lq-card rounded-2xl p-5 space-y-3">
          <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
            <History className="w-4 h-4 text-[#38D9F5]" />
            Marketplace Order Ledger
          </h3>
          <div className="divide-y divide-[#1E3A63] text-xs">
            {marketplaceState.orders.slice(0, 8).map(ord => (
              <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#F2F7FF]">{ord.itemName}</span>
                <span className={`font-mono tabular-nums ${ord.currency === 'gold' ? 'text-[#FBBF24]' : 'text-[#38D9F5]'}`}>
                  -{ord.pricePaid} {ord.currency} · {new Date(ord.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </RpgScrollReveal>
      )}

      {/* Purchase Confirmation Modal */}
      <RpgModalWrapper
        isOpen={Boolean(confirmItem)}
        onClose={() => setConfirmItem(null)}
        panelClassName="w-full max-w-md"
      >
        {confirmItem && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Cosmetic Acquisition"
            className="lq-card-gold rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#38D9F5]" />
                Confirm Cosmetic Acquisition
              </h3>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                aria-label="Close confirmation"
                className="text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="lq-surface rounded-xl p-4 space-y-1">
              <p className="font-['Cinzel'] font-bold text-sm text-[#38D9F5]">{confirmItem.name}</p>
              <p className="text-xs text-[#94A8C7]">{confirmItem.description}</p>
              <p className="text-xs font-mono text-[#F2F7FF] pt-2 tabular-nums">
                Cost: {currency === 'gold' ? confirmItem.priceGold : confirmItem.priceFragments}{' '}
                {currency === 'gold' ? 'Gold' : 'Cosmetic Fragments'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmItem.id}
                onClick={() => void handleConfirmPurchase()}
                className="lq-btn lq-btn-gold px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                {busyId === confirmItem.id ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};
