import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { wardrobeSanctumBgImg } from '../../assets/images';
import {
  COSMETICS_CATALOG,
  COSMETIC_MILESTONES,
  COSMETIC_RARITY_STYLE,
} from '../../data/expansionData';
import {
  IDENTITY_RARITY_STYLE,
  PLAYER_TITLES_CATALOG,
  RARE_BADGES_CATALOG,
} from '../../data/polish2Data';
import type { CosmeticSlot, PlayerLoadout } from '../../types/game';
import { Character2DAvatar } from './Character2DAvatar';
import {
  Award,
  Check,
  Copy,
  Crown,
  Layers,
  Lock,
  Palette,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

const SLOT_TABS: Array<{ id: CosmeticSlot; label: string }> = [
  { id: 'frame', label: 'Frames' },
  { id: 'banner', label: 'Banners' },
  { id: 'aura', label: 'Auras' },
  { id: 'outfit', label: 'Outfits' },
  { id: 'hairstyle', label: 'Hairstyles' },
  { id: 'color', label: 'Colors' },
];

export const CharacterCustomizationView: React.FC = () => {
  const {
    user,
    selectedHeroId,
    cosmeticsState,
    identityState,
    prestigeState,
    myEffectivePresence,
    refreshCosmeticsState,
    equipCosmetic,
    unequipCosmeticSlot,
    claimCosmeticMilestone,
    saveLoadout,
    equipLoadout,
    duplicateLoadout,
    deleteLoadout,
    selectIdentityTitle,
    selectSecondaryIdentityTitle,
  } = useGame();

  const [studioSection, setStudioSection] = useState<'wardrobe' | 'loadouts' | 'titles'>('wardrobe');
  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>('frame');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Loadout editor state
  const [editingLoadoutId, setEditingLoadoutId] = useState<string | null>(null);
  const [loadoutName, setLoadoutName] = useState('');
  const [loadoutContext, setLoadoutContext] = useState<'default' | 'competition'>('default');
  const [loadoutPrimaryTitle, setLoadoutPrimaryTitle] = useState<string | null>(null);
  const [loadoutSecondaryTitle, setLoadoutSecondaryTitle] = useState<string | null>(null);
  const [loadoutBadges, setLoadoutBadges] = useState<string[]>([]);

  useEffect(() => {
    void refreshCosmeticsState();
  }, []);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3200);
  };

  const unlockedSet = useMemo(
    () => new Set(cosmeticsState?.unlockedIds || []),
    [cosmeticsState?.unlockedIds]
  );
  const appearance = cosmeticsState?.appearance || {
    hairstyleId: 'hair_warden_crest',
    outfitId: 'outfit_novice_tunic',
    colorId: 'color_obsidian_gold',
    frameId: 'frame_bronze_crest',
    bannerId: 'banner_nightfall_keep',
    auraId: 'aura_none_embers',
  };

  const slotItems = useMemo(
    () => COSMETICS_CATALOG.filter(item => item.slot === activeSlot),
    [activeSlot]
  );

  const unlockedTitleSet = useMemo(
    () => new Set(identityState?.unlockedTitles.map(t => t.titleId) || []),
    [identityState?.unlockedTitles]
  );
  const unlockedBadgeList = useMemo(
    () =>
      (identityState?.unlockedBadges || [])
        .map(b => RARE_BADGES_CATALOG.find(def => def.id === b.badgeId))
        .filter((d): d is NonNullable<typeof d> => Boolean(d)),
    [identityState?.unlockedBadges]
  );

  const loadouts: PlayerLoadout[] = cosmeticsState?.loadouts || [];
  const maxLoadoutSlots = cosmeticsState?.unlockedLoadoutSlots || 3;

  const handleEquipCosmetic = async (cosmeticId: string) => {
    setBusyId(cosmeticId);
    const res = await equipCosmetic(cosmeticId);
    setBusyId(null);
    if (res.success) flash('success', '2D cosmetic appearance updated.');
    else flash('error', res.error || 'Could not equip cosmetic.');
  };

  const handleUnequipSlot = async (slot: CosmeticSlot) => {
    setBusyId(`unequip-${slot}`);
    const res = await unequipCosmeticSlot(slot);
    setBusyId(null);
    if (res.success) flash('success', `Reset ${slot} slot.`);
    else flash('error', res.error || 'Could not reset slot.');
  };

  const handleClaimMilestone = async (milestoneId: string) => {
    setBusyId(milestoneId);
    const res = await claimCosmeticMilestone(milestoneId);
    setBusyId(null);
    if (res.success) flash('success', 'Wardrobe milestone cosmetic unlocked!');
    else flash('error', res.error || 'Could not claim milestone.');
  };

  const beginNewLoadout = () => {
    setEditingLoadoutId(null);
    setLoadoutName(`Vanguard Preset ${loadouts.length + 1}`);
    setLoadoutContext('default');
    setLoadoutPrimaryTitle(identityState?.equippedTitleId || null);
    setLoadoutSecondaryTitle(identityState?.equippedSecondaryTitleId || null);
    setLoadoutBadges(identityState?.featuredBadgeIds?.slice(0, 4) || []);
  };

  const loadPresetForEdit = (l: PlayerLoadout) => {
    setEditingLoadoutId(l.id);
    setLoadoutName(l.name);
    setLoadoutContext(l.context);
    setLoadoutPrimaryTitle(l.titleId);
    setLoadoutSecondaryTitle(l.secondaryTitleId);
    setLoadoutBadges(l.badgeIds.slice(0, 4));
  };

  const handleSaveLoadout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadoutName.trim()) return;
    setBusyId('save-loadout');
    const res = await saveLoadout({
      id: editingLoadoutId || undefined,
      name: loadoutName.trim(),
      context: loadoutContext,
      appearance,
      titleId: loadoutPrimaryTitle,
      secondaryTitleId: loadoutSecondaryTitle,
      badgeIds: loadoutBadges,
    });
    setBusyId(null);
    if (res.success) {
      flash('success', 'Loadout saved to your cosmetic vault.');
      setEditingLoadoutId(null);
      setLoadoutName('');
    } else {
      flash('error', res.error || 'Could not save loadout.');
    }
  };

  const handleEquipLoadout = async (loadoutId: string, context: 'default' | 'competition') => {
    setBusyId(`eq-${loadoutId}`);
    const res = await equipLoadout(loadoutId, context);
    setBusyId(null);
    if (res.success) {
      flash(
        'success',
        context === 'competition'
          ? 'Competition loadout bound for Rivals Arena.'
          : 'Default profile loadout equipped.'
      );
    } else {
      flash('error', res.error || 'Could not equip loadout.');
    }
  };

  const handleTitleSlotSelect = async (slot: 'primary' | 'secondary', titleId: string | null) => {
    setBusyId(`title-${slot}-${titleId || 'none'}`);
    const res =
      slot === 'primary'
        ? await selectIdentityTitle(titleId)
        : await selectSecondaryIdentityTitle(titleId);
    setBusyId(null);
    if (res.success) flash('success', 'Player title updated.');
    else flash('error', res.error || 'Could not update title.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Studio Hero Stage */}
      <div className="relative rounded-2xl overflow-hidden border border-[#6638B8]/40 bg-[#24143D] shadow-[0_12px_32px_rgba(10,6,20,0.6)]">
        <img
          src={wardrobeSanctumBgImg}
          alt="Wardrobe Sanctum backdrop"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#100D1C]/95 via-[#19122B]/88 to-[#100D1C]/92"
        />

        <div className="relative z-10 p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Character2DAvatar
              heroId={selectedHeroId}
              characterClass={user?.characterClass}
              appearance={appearance}
              size="xl"
              presenceStatus={myEffectivePresence}
              prestigeTier={prestigeState?.prestigeTier || 0}
              showBannerBackdrop
            />
            <div className="space-y-2 text-center sm:text-left">
              <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#E7B94F]">
                2D Appearance Studio & Presets
              </div>
              <h2 className="text-2xl font-black font-['Cinzel'] text-[#F7F4FF]">
                {user?.characterName || user?.username || 'Champion'}
              </h2>
              <div className="text-xs text-[#BEB4D6] space-y-1">
                <p>
                  Primary Title:{' '}
                  <span className="text-[#FFD978] font-semibold">
                    {identityState?.equippedTitleId
                      ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedTitleId)?.name || 'Equipped'
                      : 'None'}
                  </span>
                </p>
                {identityState?.equippedSecondaryTitleId && (
                  <p>
                    Secondary Title:{' '}
                    <span className="text-[#A875FF] font-semibold">
                      {PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedSecondaryTitleId)?.name}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-xs text-[#BEB4D6] tabular-nums pt-1">
                <span>{unlockedSet.size} / {COSMETICS_CATALOG.length} 2D Cosmetics Unlocked</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>{loadouts.length} / {maxLoadoutSlots} Loadout Slots</span>
              </div>
            </div>
          </div>

          {/* Studio Mode Tabs */}
          <div
            role="tablist"
            aria-label="Customization studio sections"
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#100D1C]/95 border border-[#6638B8]/35"
          >
            {[
              { id: 'wardrobe', label: '2D Wardrobe', icon: Palette },
              { id: 'loadouts', label: 'Loadout Presets', icon: Layers },
              { id: 'titles', label: 'Title Vault', icon: Crown },
            ].map(tab => {
              const Icon = tab.icon;
              const active = studioSection === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setStudioSection(tab.id as typeof studioSection)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white shadow-[0_0_16px_rgba(168,117,255,0.35)] border border-[#FFD978]/45'
                      : 'text-[#BEB4D6] hover:text-[#F7F4FF] hover:bg-[#24143D] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-emerald-950/60 border-[#35D69A]/45 text-emerald-200'
              : 'bg-[#36111F]/70 border-[#F05B70]/45 text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* SECTION 1: 2D WARDROBE & COSMETIC MILESTONES */}
      {studioSection === 'wardrobe' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#100D1C] border border-[#6638B8]/35">
              {SLOT_TABS.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setActiveSlot(slot.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    activeSlot === slot.id
                      ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white shadow-[0_0_12px_rgba(168,117,255,0.35)] border border-[#FFD978]/45'
                      : 'text-[#BEB4D6] hover:text-[#F7F4FF] hover:bg-[#24143D] border border-transparent'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={busyId === `unequip-${activeSlot}`}
              onClick={() => void handleUnequipSlot(activeSlot)}
              className="px-3.5 py-2 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 hover:border-[#A875FF]/55 text-xs text-[#F7F4FF] whitespace-nowrap shrink-0 transition-all"
            >
              Reset {activeSlot}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotItems.map(item => {
              const owned = unlockedSet.has(item.id);
              const equippedId =
                activeSlot === 'frame'
                  ? appearance.frameId
                  : activeSlot === 'banner'
                  ? appearance.bannerId
                  : activeSlot === 'aura'
                  ? appearance.auraId
                  : activeSlot === 'outfit'
                  ? appearance.outfitId
                  : activeSlot === 'hairstyle'
                  ? appearance.hairstyleId
                  : appearance.colorId;
              const isEquipped = equippedId === item.id;
              const rStyle = COSMETIC_RARITY_STYLE[item.rarity];

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-4 ${
                    isEquipped
                      ? 'bg-[#24143D] border-[#FFD978]/60 shadow-[0_0_20px_rgba(255,217,120,0.16)]'
                      : 'bg-[#24143D]/90 border-[#6638B8]/30 hover:border-[#A875FF]/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className="h-16 rounded-xl border border-white/10 flex items-center justify-between px-4"
                      style={{
                        background: `linear-gradient(135deg, ${item.primaryHex}, ${item.secondaryHex})`,
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-white/30"
                        style={{ backgroundColor: item.accentHex }}
                      />
                      <span className={`text-xs font-semibold ${rStyle.text}`}>{item.rarity}</span>
                    </div>

                    <div>
                      <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF]">{item.name}</h3>
                      <p className="text-xs text-[#BEB4D6] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-[#E7B94F]/90 mt-2">
                        Source: {item.unlockSource}
                      </p>
                    </div>
                  </div>

                  {owned ? (
                    <button
                      type="button"
                      disabled={isEquipped || busyId === item.id}
                      onClick={() => void handleEquipCosmetic(item.id)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                        isEquipped
                          ? 'bg-[#6638B8]/25 text-[#FFD978] border border-[#FFD978]/55 cursor-default'
                          : 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isEquipped ? 'Equipped' : 'Equip Cosmetic'}
                    </button>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-[#19122B] border border-[#6638B8]/25 text-xs text-[#BEB4D6]/60 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Wardrobe Collection Milestones */}
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD978]" />
                Cosmetic Collection Milestones
              </h3>
              <span className="text-xs font-mono text-[#BEB4D6] tabular-nums">
                {unlockedSet.size} Cosmetics Owned
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COSMETIC_MILESTONES.map(ms => {
                const claimed = cosmeticsState?.claimedMilestoneIds?.includes(ms.id);
                const ready = unlockedSet.size >= ms.requiredUnlocked && !claimed;
                return (
                  <div
                    key={ms.id}
                    className="rounded-xl bg-[#19122B] border border-[#6638B8]/30 p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs text-[#E7B94F] font-semibold tabular-nums">
                        {ms.requiredUnlocked}+ Cosmetics
                      </p>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] mt-0.5">
                        {ms.title}
                      </h4>
                      <p className="text-xs text-[#BEB4D6] mt-1">{ms.rewardLabel}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!ready || busyId === ms.id}
                      onClick={() => void handleClaimMilestone(ms.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                        claimed
                          ? 'bg-emerald-950/60 text-[#35D69A] border border-[#35D69A]/45'
                          : ready
                          ? 'bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)]'
                          : 'bg-[#100D1C] text-[#BEB4D6]/50 border border-[#6638B8]/25'
                      }`}
                    >
                      {claimed ? 'Claimed' : ready ? 'Claim Reward' : 'In Progress'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MULTI-LOADOUT MANAGER (ZERO GAMEPLAY STATS) */}
      {studioSection === 'loadouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">
                  Saved Cosmetic Loadouts
                </h3>
                <p className="text-xs text-[#BEB4D6]">
                  Combine 2D appearance, primary and secondary titles, and up to 4 badges. Strictly cosmetic—zero combat impact.
                </p>
              </div>
              <button
                type="button"
                onClick={beginNewLoadout}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                New Preset
              </button>
            </div>

            {loadouts.length === 0 ? (
              <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-8 text-center text-xs text-[#BEB4D6]">
                No saved loadouts yet. Snapshot your current 2D appearance and titles using the editor.
              </div>
            ) : (
              <div className="space-y-3">
                {loadouts.map(preset => {
                  const isDefaultActive = cosmeticsState?.activeLoadoutId === preset.id;
                  const isCompActive = cosmeticsState?.competitionLoadoutId === preset.id;
                  const titleName = preset.titleId
                    ? PLAYER_TITLES_CATALOG.find(t => t.id === preset.titleId)?.name
                    : 'No Primary Title';

                  return (
                    <div
                      key={preset.id}
                      className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 hover:border-[#A875FF]/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Character2DAvatar
                          heroId={selectedHeroId}
                          characterClass={user?.characterClass}
                          appearance={preset.appearance}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <h4 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] truncate">
                            {preset.name}
                          </h4>
                          <div className="text-[11px] text-[#BEB4D6] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{preset.context === 'competition' ? 'Competition Context' : 'Profile Default'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{titleName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{preset.badgeIds.length} Badges</span>
                          </div>
                          {(isDefaultActive || isCompActive) && (
                            <p className="text-[11px] text-[#35D69A] font-semibold mt-1">
                              {[isDefaultActive && 'Active Default', isCompActive && 'Active Competition']
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={busyId === `eq-${preset.id}`}
                          onClick={() => void handleEquipLoadout(preset.id, 'default')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#6638B8]/25 hover:bg-[#6638B8]/40 border border-[#A875FF]/45 text-[#FFD978] text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                        >
                          Equip Profile
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `eq-${preset.id}`}
                          onClick={() => void handleEquipLoadout(preset.id, 'competition')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#E7B94F]/40 text-[#E7B94F] text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                        >
                          Bind Arena
                        </button>
                        <button
                          type="button"
                          onClick={() => loadPresetForEdit(preset)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/30 text-xs text-[#F7F4FF] whitespace-nowrap shrink-0 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void duplicateLoadout(preset.id)}
                          aria-label={`Duplicate ${preset.name}`}
                          className="p-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/30 text-[#BEB4D6] hover:text-[#F7F4FF] transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLoadout(preset.id)}
                          aria-label={`Delete ${preset.name}`}
                          className="p-1.5 rounded-lg bg-[#19122B] hover:bg-[#36111F]/70 border border-[#6638B8]/30 text-[#F05B70] transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSaveLoadout}
            className="lg:col-span-5 rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 space-y-4 self-start"
          >
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">
              {editingLoadoutId ? 'Update Loadout Preset' : 'Save Current Look as Loadout'}
            </h3>

            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Loadout Name</label>
              <input
                type="text"
                required
                maxLength={40}
                value={loadoutName}
                onChange={e => setLoadoutName(e.target.value)}
                placeholder="e.g. Duskwarden Competition"
                className="w-full rounded-xl bg-[#19122B] border border-[#6638B8]/40 px-3 py-2 text-xs text-[#F7F4FF] placeholder-[#BEB4D6]/50 focus:outline-none focus:border-[#FFD978]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Target Context</label>
              <select
                value={loadoutContext}
                onChange={e => setLoadoutContext(e.target.value as 'default' | 'competition')}
                className="w-full rounded-xl bg-[#19122B] border border-[#6638B8]/40 px-3 py-2 text-xs text-[#F7F4FF] focus:outline-none focus:border-[#FFD978]"
              >
                <option value="default">Profile Default</option>
                <option value="competition">Rivals & Tournament Arena</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Primary Title</label>
              <select
                value={loadoutPrimaryTitle || ''}
                onChange={e => setLoadoutPrimaryTitle(e.target.value || null)}
                className="w-full rounded-xl bg-[#19122B] border border-[#6638B8]/40 px-3 py-2 text-xs text-[#F7F4FF] focus:outline-none focus:border-[#FFD978]"
              >
                <option value="">None</option>
                {PLAYER_TITLES_CATALOG.filter(t => unlockedTitleSet.has(t.id)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rarity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#BEB4D6] mb-1">Secondary Title (Optional)</label>
              <select
                value={loadoutSecondaryTitle || ''}
                onChange={e => setLoadoutSecondaryTitle(e.target.value || null)}
                className="w-full rounded-xl bg-[#19122B] border border-[#6638B8]/40 px-3 py-2 text-xs text-[#F7F4FF] focus:outline-none focus:border-[#FFD978]"
              >
                <option value="">None</option>
                {PLAYER_TITLES_CATALOG.filter(t => unlockedTitleSet.has(t.id)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rarity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs text-[#BEB4D6] mb-1.5">
                Featured Badges ({loadoutBadges.length}/4)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unlockedBadgeList.length === 0 ? (
                  <span className="text-xs text-[#BEB4D6]/60">Unlock badges to attach them here.</span>
                ) : (
                  unlockedBadgeList.map(badge => {
                    const selected = loadoutBadges.includes(badge.id);
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setLoadoutBadges(prev => prev.filter(id => id !== badge.id));
                          } else if (loadoutBadges.length < 4) {
                            setLoadoutBadges(prev => [...prev, badge.id]);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all whitespace-nowrap shrink-0 ${
                          selected
                            ? 'bg-[#6638B8]/30 border-[#FFD978]/60 text-[#FFD978]'
                            : 'bg-[#19122B] border-[#6638B8]/30 text-[#BEB4D6] hover:text-[#F7F4FF]'
                        }`}
                      >
                        {badge.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={busyId === 'save-loadout'}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E7B94F] to-[#FFD978] hover:from-[#FFD978] hover:to-[#ffe6a3] text-[#100D1C] shadow-[0_0_16px_rgba(231,185,79,0.35)] text-xs font-bold whitespace-nowrap transition-all"
            >
              {editingLoadoutId ? 'Save Changes' : 'Save Loadout'}
            </button>
          </form>
        </div>
      )}

      {/* SECTION 3: ADVANCED TITLE VAULT (DUAL TITLE SLOTS) */}
      {studioSection === 'titles' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#24143D]/90 backdrop-blur-md border border-[#6638B8]/35 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F7F4FF]">
                Player Title Collection ({unlockedTitleSet.size} / {PLAYER_TITLES_CATALOG.length})
              </h3>
              <p className="text-xs text-[#BEB4D6] mt-0.5">
                Equip a Primary Title and an optional Secondary Title to display across Hero Command Center, Social Directory, Leaderboards, and Rivals.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleTitleSlotSelect('primary', null)}
                className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-xs text-[#F7F4FF] whitespace-nowrap shrink-0 transition-all"
              >
                Clear Primary
              </button>
              <button
                type="button"
                onClick={() => void handleTitleSlotSelect('secondary', null)}
                className="px-3 py-1.5 rounded-lg bg-[#19122B] hover:bg-[#2F1B4E] border border-[#6638B8]/40 text-xs text-[#F7F4FF] whitespace-nowrap shrink-0 transition-all"
              >
                Clear Secondary
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLAYER_TITLES_CATALOG.map(title => {
              const unlocked = unlockedTitleSet.has(title.id);
              const isPrimary = identityState?.equippedTitleId === title.id;
              const isSecondary = identityState?.equippedSecondaryTitleId === title.id;
              const style = IDENTITY_RARITY_STYLE[title.rarity];

              return (
                <div
                  key={title.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-all ${
                    isPrimary || isSecondary
                      ? 'bg-[#24143D] border-[#FFD978]/60 shadow-[0_0_20px_rgba(255,217,120,0.16)]'
                      : 'bg-[#24143D]/90 border-[#6638B8]/30 hover:border-[#A875FF]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className={`font-semibold ${style.text}`}>{title.rarity}</span>
                      <span className="text-[#BEB4D6] capitalize">{title.category}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-[#F7F4FF] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#FFD978] shrink-0" />
                      {title.name}
                    </h4>
                    <p className="text-xs text-[#BEB4D6] mt-1 leading-relaxed">{title.description}</p>
                    <p className="text-[11px] text-[#E7B94F]/90 mt-2">
                      Unlock: {title.unlockRequirement}
                      {title.limitedEdition ? ' · Limited Edition' : ''}
                    </p>
                  </div>

                  {unlocked ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isPrimary || busyId === `title-primary-${title.id}`}
                        onClick={() => void handleTitleSlotSelect('primary', title.id)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                          isPrimary
                            ? 'bg-gradient-to-r from-[#6638B8] to-[#A875FF] text-white shadow-[0_0_12px_rgba(168,117,255,0.35)]'
                            : 'bg-[#19122B] hover:bg-[#2F1B4E] text-[#F7F4FF] border border-[#6638B8]/40'
                        }`}
                      >
                        {isPrimary ? 'Primary Equipped' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        disabled={isSecondary || busyId === `title-secondary-${title.id}`}
                        onClick={() => void handleTitleSlotSelect('secondary', title.id)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                          isSecondary
                            ? 'bg-[#FFD978] text-[#100D1C]'
                            : 'bg-[#100D1C] hover:bg-[#2F1B4E] text-[#FFD978] border border-[#6638B8]/40'
                        }`}
                      >
                        {isSecondary ? 'Secondary Equipped' : 'Set Secondary'}
                      </button>
                    </div>
                  ) : (
                    <div className="py-1.5 px-3 rounded-lg bg-[#19122B] border border-[#6638B8]/25 text-xs text-[#BEB4D6]/60 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
