import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ShopItem } from '../../types/game';
import { getRarityStyle } from '../../utils/rarityStyles';
import { sound } from '../../utils/audio';
import {
  Coins,
  Gem,
  Lock,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { CosmeticMarketplaceView } from './CosmeticMarketplaceView';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

type StoreFilterCategory = 'All' | 'Elixirs' | 'Buffs';

export const StoreView: React.FC = () => {
  const {
    shopItems,
    stats,
    storeSubTab,
    setStoreSubTab,
    walletState,
    purchaseShopItem,
  } = useGame();

  const storeMode = storeSubTab === 'marketplace' ? 'marketplace' : 'bazaar';
  const [categoryFilter, setCategoryFilter] = useState<StoreFilterCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shopItems.filter(item => {
      if (item.itemType !== 'elixir' && item.itemType !== 'buff') return false;
      const matchCat =
        categoryFilter === 'All' ||
        (categoryFilter === 'Elixirs' && item.itemType === 'elixir') ||
        (categoryFilter === 'Buffs' && item.itemType === 'buff');
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.itemType.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [shopItems, categoryFilter, searchQuery]);

  const handlePurchase = async (item: ShopItem) => {
    if (buyingId) return;
    setBuyingId(item.id);
    setFeedback(null);

    const res = await purchaseShopItem(item.id);
    setBuyingId(null);

    if (!res.success) {
      setFeedback({
        type: 'error',
        text: res.error || 'Purchase could not be completed right now.',
      });
    } else {
      setFeedback({
        type: 'success',
        text: `Activated ${item.name}! Aura Blessing is now active for your training.`,
      });
    }
  };

  const categoryTabs: { id: StoreFilterCategory; label: string }[] = [
    { id: 'All', label: 'All Tonics & Blessings' },
    { id: 'Elixirs', label: 'Elixirs' },
    { id: 'Buffs', label: 'Aura Blessings' },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-[1360px] mx-auto">
      {/* Header Banner */}
      <FeatureBanner data-tutorial-id="shop-bazaar" themeId="achievements" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5]">
                Aetheria Grand Bazaar
              </span>
              <span className="text-[#647A9E]" aria-hidden="true">·</span>
              <span className="text-[#94A8C7] font-medium tabular-nums">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF] flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-[#38D9F5]" />
              Royal Treasury &amp; Cosmetic Bazaar
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl">
              Acquire restorative Elixirs &amp; Aura Blessings to fuel your bodyweight training and boss battles, or unlock 2D outfits and realm vanity themes.
            </p>
          </div>

          {/* Currencies */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="lq-surface-gold rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-[#FBBF24]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-[#FBBF24] tabular-nums">
                  <AnimatedCounter value={stats.gold} />
                </span>
              </div>
            </div>

            <div className="lq-surface rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Gem className="w-5 h-5 text-[#38D9F5]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#38D9F5] font-bold block">
                  Fragments
                </span>
                <span className="font-mono text-lg font-black text-[#F2F7FF] tabular-nums">
                  <AnimatedCounter value={walletState?.cosmeticFragments ?? 0} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Mode Switcher */}
        <div className="pt-4 border-t border-[#1E3A63] flex flex-wrap items-center justify-between gap-3">
          <FeatureTabBar
            themeId="achievements"
            layoutId="store-mode-pill"
            ariaLabel="Treasury sections"
            activeId={storeMode}
            onSelect={id => {
              setStoreSubTab(id);
              sound.playClick();
            }}
            tabs={[
              { id: 'bazaar', label: 'Elixirs & Aura Bazaar', icon: ShoppingBag },
              { id: 'marketplace', label: 'Cosmetic Marketplace (2D Vanity)', icon: Sparkles },
            ]}
          />
        </div>
      </FeatureBanner>

      <RpgSubTabTransition tabKey={storeMode}>
        {storeMode === 'marketplace' ? (
          <CosmeticMarketplaceView />
        ) : (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="lq-card rounded-2xl p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {categoryTabs.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(tab.id);
                        sound.playClick();
                      }}
                      className={`lq-btn px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === tab.id ? 'lq-btn-primary' : 'lq-btn-secondary text-[#94A8C7]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="w-4 h-4 text-[#94A8C7] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search elixirs, buffs, boosts..."
                    className="lq-input w-full pl-9 pr-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium text-center ${
                  feedback.type === 'error'
                    ? 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
                    : 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="lq-surface rounded-2xl p-10 text-center space-y-2">
                <p className="font-['Cinzel'] font-bold text-[#F2F7FF] text-base">
                  No items match your current filter
                </p>
                <p className="text-xs text-[#94A8C7]">
                  Clear your search or switch category tabs to view more Aetherian wares.
                </p>
              </div>
            ) : (
              <RpgStaggerGrid key={`${categoryFilter}-${searchQuery}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredItems.map(item => {
                  const rStyle = getRarityStyle(item.rarity);
                  const meta = item.metadata || {};
                  const levelMet = stats.level >= item.requiredLevel;
                  const goldMet = stats.gold >= item.priceGold;
                  const canBuy = levelMet && goldMet && buyingId !== item.id;

                  return (
                    <RpgStaggerItem key={item.id}>
                      <div
                        className={`lq-card lq-card-interactive rounded-2xl border ${rStyle.border} p-5 h-full flex flex-col justify-between gap-4`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-14 h-14 rounded-xl bg-[#061225] border ${rStyle.border} shrink-0 flex items-center justify-center text-[#38D9F5]`}
                            >
                              <Sparkles className="w-6 h-6" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className={`font-semibold uppercase tracking-wider ${rStyle.text}`}>
                                  {item.rarity}
                                </span>
                                <span
                                  className={`font-mono tabular-nums ${
                                    levelMet ? 'text-[#94A8C7]' : 'text-[#F43F5E]'
                                  }`}
                                >
                                  Req Lv.{item.requiredLevel}
                                </span>
                              </div>

                              <h3 className="font-['Cinzel'] font-black text-base text-[#F2F7FF] leading-tight">
                                {item.name}
                              </h3>

                              <p className="text-[11px] font-mono text-[#38D9F5]">
                                {item.itemType.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-[#94A8C7] leading-relaxed">{item.description}</p>

                          <div className="bg-[#061225] border border-[#1E3A63] rounded-xl p-2.5 text-xs font-mono">
                            <span className="text-[#10B981] font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />+{Number(meta.uses || 2)} Battle Charges
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-[#1E3A63]">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#94A8C7]">Price:</span>
                            <span
                              className={`font-bold flex items-center gap-1 tabular-nums ${
                                goldMet ? 'text-[#FBBF24]' : 'text-[#F43F5E]'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              {item.priceGold} Gold
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePurchase(item)}
                            disabled={!canBuy}
                            className={`lq-btn w-full py-2.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider flex items-center justify-center gap-2 whitespace-nowrap ${
                              canBuy
                                ? 'lq-btn-gold cursor-pointer'
                                : 'lq-btn-secondary opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {!levelMet ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                REQ LV.{item.requiredLevel}
                              </>
                            ) : buyingId === item.id ? (
                              <span>BUYING...</span>
                            ) : !goldMet ? (
                              <span>NEED GOLD</span>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                PURCHASE
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </RpgStaggerItem>
                  );
                })}
              </RpgStaggerGrid>
            )}
          </div>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
