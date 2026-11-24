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
        className="rounded-2xl bg-gradient-to-r from-[#1a1030] via-[#0e081c] to-[#1f1229] border-2 border-purple-900/70 p-6 shadow-2xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 rounded">
                Aetheria Grand Bazaar
              </span>
              <span className="text-xs text-purple-300 font-medium">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-amber-400" />
              ROYAL TREASURY &amp; COSMETIC BAZAAR
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Acquire restorative Elixirs &amp; Aura Blessings to fuel your bodyweight training and boss battles, or unlock 2D outfits and realm vanity themes.
            </p>
          </div>

          {/* Currencies */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#090514]/90 border-2 border-yellow-500/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-yellow-200 tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>

            <div className="bg-[#090514]/90 border-2 border-purple-500/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Gem className="w-5 h-5 text-purple-300" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-300 font-bold block">
                  Fragments
                </span>
                <span className="font-mono text-lg font-black text-purple-100 tabular-nums">
                  {walletState?.cosmeticFragments ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-purple-950/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStoreSubTab('bazaar');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'bazaar'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 shadow-lg'
                : 'bg-[#090514] border border-purple-900 text-slate-300 hover:text-white'
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
                ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 text-slate-950 shadow-lg'
                : 'bg-[#090514] border border-purple-500/60 text-purple-200 hover:text-white'
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
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-4">
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
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      categoryFilter === tab.id
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-bold shadow'
                        : 'bg-[#140e24] text-slate-300 hover:text-white border border-purple-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elixirs, buffs, boosts..."
                  className="w-full bg-[#140e24] border border-purple-900/70 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
            <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-10 text-center space-y-2">
              <p className="font-['Cinzel'] font-bold text-slate-200 text-base">
                No items match your current filter
              </p>
              <p className="text-xs text-slate-400">
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
                    className={`rounded-2xl bg-[#110a22]/95 border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-16 h-16 rounded-xl bg-[#07040f] border-2 ${rStyle.border} shrink-0 flex items-center justify-center text-amber-300`}
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
                                  ? 'bg-[#090514] border-purple-800/70 text-slate-300'
                                  : 'bg-rose-950/70 border-rose-700 text-rose-300'
                              }`}
                            >
                              Req Lv.{item.requiredLevel}
                            </span>
                          </div>

                          <h3 className="font-['Cinzel'] font-black text-base text-white leading-tight">
                            {item.name}
                          </h3>

                          <p className="text-[11px] font-mono text-purple-300">
                            {item.itemType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">{item.description}</p>

                      <div className="bg-[#090514]/85 border border-purple-950 rounded-xl p-2.5 text-xs font-mono">
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />+{Number(meta.uses || 2)} Battle Charges
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-purple-950/70">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Price:</span>
                        <span
                          className={`font-bold flex items-center gap-1 tabular-nums ${
                            goldMet ? 'text-yellow-300' : 'text-rose-400'
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
                            ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 shadow-lg hover:scale-[1.01] active:scale-95'
                            : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed'
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
