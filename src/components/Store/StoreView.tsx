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
        text: `Activated ${item.name}! Buff charges added to your Active Buffs.`,
      });
    }
  };

  const categoryTabs: { id: StoreFilterCategory; label: string }[] = [
    { id: 'All', label: 'All Tonics & Blessings' },
    { id: 'Elixirs', label: 'Elixirs' },
    { id: 'Buffs', label: 'Aura Blessings' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Header Banner */}
      <div
        data-tutorial-id="shop-bazaar"
        className="rounded-2xl bg-gradient-to-r from-[#100D1C] via-[#19122B] to-[#24143D] border border-[#6638B8]/40 p-6 shadow-[0_12px_32px_rgba(10,6,20,0.6)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#FFD978] bg-[#19122B] border border-[#E7B94F]/45 px-2.5 py-0.5 rounded">
                Aetheria Grand Bazaar
              </span>
              <span className="text-xs text-[#BEB4D6] font-medium">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F7F4FF] flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-[#FFD978]" />
              ROYAL TREASURY &amp; COSMETIC BAZAAR
            </h1>
            <p className="text-xs sm:text-sm text-[#BEB4D6] max-w-2xl">
              Acquire restorative Elixirs &amp; Aura Blessings to fuel your bodyweight training and boss battles, or unlock 2D outfits and realm vanity themes.
            </p>
          </div>

          {/* Currencies */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#19122B]/95 border border-[#E7B94F]/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-[#FFD978]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#E7B94F] font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-[#FFD978] tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>

            <div className="bg-[#19122B]/95 border border-[#A875FF]/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Gem className="w-5 h-5 text-[#A875FF]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#A875FF] font-bold block">
                  Fragments
                </span>
                <span className="font-mono text-lg font-black text-[#F7F4FF] tabular-nums">
                  {walletState?.cosmeticFragments ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-[#6638B8]/30 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStoreSubTab('bazaar');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'bazaar'
                ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)]'
                : 'bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-[#BEB4D6] hover:text-[#F7F4FF]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Elixirs &amp; Aura Bazaar
          </button>

          <button
            type="button"
            onClick={() => {
              setStoreSubTab('marketplace');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'marketplace'
                ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white shadow-[0_0_16px_rgba(168,117,255,0.35)]'
                : 'bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-[#BEB4D6] hover:text-[#F7F4FF]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Cosmetic Marketplace (2D Vanity)
          </button>
        </div>
      </div>

      {storeMode === 'marketplace' ? (
        <CosmeticMarketplaceView />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 rounded-2xl p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categoryTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(tab.id);
                      sound.playClick();
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                      categoryFilter === tab.id
                        ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white font-bold shadow-[0_0_12px_rgba(168,117,255,0.35)]'
                        : 'bg-[#19122B] hover:bg-[#2F1B4E] text-[#BEB4D6] hover:text-[#F7F4FF] border border-[#6638B8]/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-4 h-4 text-[#BEB4D6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elixirs, buffs, boosts..."
                  className="w-full bg-[#19122B] border border-[#6638B8]/40 rounded-xl pl-9 pr-3 py-2 text-xs text-[#F7F4FF] placeholder-[#BEB4D6]/55 focus:outline-none focus:border-[#FFD978]"
                />
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium text-center animate-in fade-in ${
                feedback.type === 'error'
                  ? 'bg-[#36111F]/80 border-[#F05B70]/50 text-rose-200'
                  : 'bg-emerald-950/80 border-[#35D69A]/50 text-emerald-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="bg-[#24143D]/90 border border-[#6638B8]/35 rounded-2xl p-10 text-center space-y-2">
              <p className="font-['Cinzel'] font-bold text-[#F7F4FF] text-base">
                No items match your current filter
              </p>
              <p className="text-xs text-[#BEB4D6]">
                Clear your search or switch category tabs to view more Aetherian wares.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredItems.map(item => {
                const rStyle = getRarityStyle(item.rarity);
                const meta = item.metadata || {};
                const levelMet = stats.level >= item.requiredLevel;
                const goldMet = stats.gold >= item.priceGold;
                const canBuy = levelMet && goldMet && buyingId !== item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-[#24143D]/90 backdrop-blur-md border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-16 h-16 rounded-xl bg-[#19122B] border-2 ${rStyle.border} shrink-0 flex items-center justify-center text-[#FFD978]`}
                        >
                          <Sparkles className="w-7 h-7" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${rStyle.badge}`}>
                              {item.rarity}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                levelMet
                                  ? 'bg-[#19122B] border-[#6638B8]/40 text-[#BEB4D6]'
                                  : 'bg-[#36111F]/70 border-[#F05B70]/50 text-rose-300'
                              }`}
                            >
                              Req Lv.{item.requiredLevel}
                            </span>
                          </div>

                          <h3 className="font-['Cinzel'] font-black text-base text-[#F7F4FF] leading-tight">
                            {item.name}
                          </h3>

                          <p className="text-[11px] font-mono text-[#E7B94F]">
                            {item.itemType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#BEB4D6] leading-relaxed">{item.description}</p>

                      <div className="bg-[#19122B] border border-[#6638B8]/30 rounded-xl p-2.5 text-xs font-mono">
                        <span className="text-[#35D69A] font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />+{Number(meta.uses || 2)} Battle Charges
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#6638B8]/30">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#BEB4D6]">Price:</span>
                        <span
                          className={`font-bold flex items-center gap-1 tabular-nums ${
                            goldMet ? 'text-[#FFD978]' : 'text-[#F05B70]'
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
                        className={`w-full py-2.5 rounded-xl font-['Cinzel'] font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                          canBuy
                            ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)] hover:scale-[1.01] active:scale-95'
                            : 'bg-[#19122B] text-[#BEB4D6]/50 border border-[#6638B8]/30 cursor-not-allowed'
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
