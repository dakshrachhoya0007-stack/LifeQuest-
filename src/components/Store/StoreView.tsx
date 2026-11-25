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
        className="rounded-2xl bg-gradient-to-r from-[#061225] via-[#0A1930] to-[#102440] border border-[#1677FF]/35 p-6 shadow-[0_12px_32px_rgba(2,8,20,0.6)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#00D9FF] bg-[#0A1930] border border-[#00D9FF]/45 px-2.5 py-0.5 rounded">
                Aetheria Grand Bazaar
              </span>
              <span className="text-xs text-[#A9B8CC] font-medium">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-[#00D9FF]" />
              ROYAL TREASURY &amp; COSMETIC BAZAAR
            </h1>
            <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-2xl">
              Acquire restorative Elixirs &amp; Aura Blessings to fuel your bodyweight training and boss battles, or unlock 2D outfits and realm vanity themes.
            </p>
          </div>

          {/* Currencies */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0A1930]/95 border border-amber-400/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-amber-200 tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>

            <div className="bg-[#0A1930]/95 border border-[#00D9FF]/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Gem className="w-5 h-5 text-[#00D9FF]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#00D9FF] font-bold block">
                  Fragments
                </span>
                <span className="font-mono text-lg font-black text-white tabular-nums">
                  {walletState?.cosmeticFragments ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-[#1677FF]/25 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStoreSubTab('bazaar');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'bazaar'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)]'
                : 'bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/35 text-[#A9B8CC] hover:text-white'
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
                ? 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF] text-white shadow-[0_0_16px_rgba(0,217,255,0.35)]'
                : 'bg-[#0A1930] hover:bg-[#16325C] border border-[#1677FF]/35 text-[#A9B8CC] hover:text-white'
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
          <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/30 rounded-2xl p-4">
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
                        ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] text-white font-bold shadow-[0_0_12px_rgba(22,119,255,0.35)]'
                        : 'bg-[#0A1930] hover:bg-[#16325C] text-[#A9B8CC] hover:text-white border border-[#1677FF]/25'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-4 h-4 text-[#A9B8CC] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elixirs, buffs, boosts..."
                  className="w-full bg-[#0A1930] border border-[#1677FF]/35 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#A9B8CC]/55 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium text-center animate-in fade-in ${
                feedback.type === 'error'
                  ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="bg-[#102440]/90 border border-[#1677FF]/30 rounded-2xl p-10 text-center space-y-2">
              <p className="font-['Cinzel'] font-bold text-white text-base">
                No items match your current filter
              </p>
              <p className="text-xs text-[#A9B8CC]">
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
                    className={`rounded-2xl bg-[#102440]/90 backdrop-blur-md border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-16 h-16 rounded-xl bg-[#0A1930] border-2 ${rStyle.border} shrink-0 flex items-center justify-center text-[#00D9FF]`}
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
                                  ? 'bg-[#0A1930] border-[#1677FF]/35 text-[#A9B8CC]'
                                  : 'bg-rose-950/70 border-rose-700 text-rose-300'
                              }`}
                            >
                              Req Lv.{item.requiredLevel}
                            </span>
                          </div>

                          <h3 className="font-['Cinzel'] font-black text-base text-white leading-tight">
                            {item.name}
                          </h3>

                          <p className="text-[11px] font-mono text-[#00D9FF]">
                            {item.itemType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#A9B8CC] leading-relaxed">{item.description}</p>

                      <div className="bg-[#0A1930] border border-[#1677FF]/25 rounded-xl p-2.5 text-xs font-mono">
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />+{Number(meta.uses || 2)} Battle Charges
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#1677FF]/25">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A9B8CC]">Price:</span>
                        <span
                          className={`font-bold flex items-center gap-1 tabular-nums ${
                            goldMet ? 'text-amber-300' : 'text-rose-400'
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
                            ? 'bg-gradient-to-r from-[#1677FF] to-[#0099FF] hover:from-[#2b85ff] hover:to-[#00D9FF] text-white shadow-[0_0_16px_rgba(22,119,255,0.35)] hover:scale-[1.01] active:scale-95'
                            : 'bg-[#0A1930] text-[#A9B8CC]/50 border border-[#1677FF]/25 cursor-not-allowed'
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
