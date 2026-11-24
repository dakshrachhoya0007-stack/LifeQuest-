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
        className="rounded-2xl bg-gradient-to-r from-[#090910] via-[#0E0E17] to-[#141420] border border-[#8B5CF6]/35 p-6 shadow-[0_12px_32px_rgba(9,9,16,0.75)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#D6A84B] bg-[#0E0E17] border border-[#D6A84B]/45 px-2.5 py-0.5 rounded">
                Aetheria Grand Bazaar
              </span>
              <span className="text-xs text-[#A1A1B8] font-medium">
                Hero Level {stats.level} · {stats.aetherRank} Rank
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white flex items-center gap-2.5">
              <ShoppingBag className="w-7 h-7 text-[#D6A84B]" />
              ROYAL TREASURY &amp; COSMETIC BAZAAR
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1B8] max-w-2xl">
              Acquire restorative Elixirs &amp; Aura Blessings to fuel your bodyweight training and boss battles, or unlock 2D outfits and realm vanity themes.
            </p>
          </div>

          {/* Currencies */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0E0E17]/95 border border-[#D6A84B]/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Coins className="w-5 h-5 text-[#FBBF24]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#D6A84B] font-bold block">
                  Gold
                </span>
                <span className="font-mono text-lg font-black text-[#FBBF24] tabular-nums">
                  {stats.gold}
                </span>
              </div>
            </div>

            <div className="bg-[#0E0E17]/95 border border-[#8B5CF6]/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <Gem className="w-5 h-5 text-[#8B5CF6]" />
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#C4B5FD] font-bold block">
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
        <div className="mt-5 pt-4 border-t border-[#8B5CF6]/25 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStoreSubTab('bazaar');
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-['Cinzel'] font-black flex items-center gap-2 transition-all whitespace-nowrap ${
              storeMode === 'bazaar'
                ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)] border border-[#D6A84B]/45'
                : 'bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/30 text-[#A1A1B8] hover:text-white'
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
                ? 'bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] text-[#090910] shadow-[0_0_16px_rgba(214,168,75,0.35)]'
                : 'bg-[#0E0E17] hover:bg-[#1B1B2B] border border-[#8B5CF6]/30 text-[#A1A1B8] hover:text-white'
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
          <div className="bg-[#141420]/95 backdrop-blur-md border border-[#8B5CF6]/30 rounded-2xl p-4">
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
                        ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                        : 'bg-[#0E0E17] hover:bg-[#1B1B2B] text-[#A1A1B8] hover:text-white border border-[#8B5CF6]/25'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64 shrink-0">
                <Search className="w-4 h-4 text-[#A1A1B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elixirs, buffs, boosts..."
                  className="w-full bg-[#0E0E17] border border-[#8B5CF6]/35 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#A1A1B8]/55 focus:outline-none focus:border-[#D6A84B]"
                />
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium text-center animate-in fade-in ${
                feedback.type === 'error'
                  ? 'bg-rose-950/80 border-[#FB7185] text-rose-200'
                  : 'bg-emerald-950/80 border-[#34D399] text-emerald-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="bg-[#141420]/95 border border-[#8B5CF6]/30 rounded-2xl p-10 text-center space-y-2">
              <p className="font-['Cinzel'] font-bold text-white text-base">
                No items match your current filter
              </p>
              <p className="text-xs text-[#A1A1B8]">
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
                    className={`rounded-2xl bg-[#141420]/95 backdrop-blur-md border-2 ${rStyle.border} ${rStyle.cardGlow} ${rStyle.ringClass} p-5 flex flex-col justify-between gap-4 transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-16 h-16 rounded-xl bg-[#0E0E17] border-2 ${rStyle.border} shrink-0 flex items-center justify-center text-[#D6A84B]`}
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
                                  ? 'bg-[#0E0E17] border-[#8B5CF6]/35 text-[#A1A1B8]'
                                  : 'bg-rose-950/70 border-[#FB7185] text-rose-300'
                              }`}
                            >
                              Req Lv.{item.requiredLevel}
                            </span>
                          </div>

                          <h3 className="font-['Cinzel'] font-black text-base text-white leading-tight">
                            {item.name}
                          </h3>

                          <p className="text-[11px] font-mono text-[#8B5CF6]">
                            {item.itemType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#A1A1B8] leading-relaxed">{item.description}</p>

                      <div className="bg-[#0E0E17] border border-[#8B5CF6]/25 rounded-xl p-2.5 text-xs font-mono">
                        <span className="text-[#34D399] font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />+{Number(meta.uses || 2)} Battle Charges
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#8B5CF6]/25">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A1A1B8]">Price:</span>
                        <span
                          className={`font-bold flex items-center gap-1 tabular-nums ${
                            goldMet ? 'text-[#FBBF24]' : 'text-[#FB7185]'
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
                            ? 'bg-gradient-to-r from-[#D6A84B] to-[#FBBF24] hover:brightness-110 text-[#090910] shadow-[0_0_16px_rgba(214,168,75,0.3)] hover:scale-[1.01] active:scale-95'
                            : 'bg-[#0E0E17] text-[#A1A1B8]/50 border border-[#8B5CF6]/25 cursor-not-allowed'
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
