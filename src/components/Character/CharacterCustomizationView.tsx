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
import { FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  RpgScrollReveal,
  RpgStaggerGrid,
  RpgStaggerItem,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';

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
    <div className="space-y-6 pb-12 max-w-[1360px] mx-auto">
      {/* Studio Hero Stage */}
      <div className="lq-card relative rounded-2xl overflow-hidden">
        <img
          src={wardrobeSanctumBgImg}
          alt="Wardrobe Sanctum backdrop"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#061225]/95 via-[#0A1930]/88 to-[#061225]/92"
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
              <div className="text-xs font-['Cinzel'] font-bold uppercase tracking-widest text-[#38D9F5]">
                2D Appearance Studio &amp; Presets
              </div>
              <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2F7FF]">
                {user?.characterName || user?.username || 'Champion'}
              </h2>
              <div className="text-xs text-[#94A8C7] space-y-1">
                <p>
                  Primary Title:{' '}
                  <span className="text-[#FBBF24] font-semibold">
                    {identityState?.equippedTitleId
                      ? PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedTitleId)?.name || 'Equipped'
                      : 'None'}
                  </span>
                </p>
                {identityState?.equippedSecondaryTitleId && (
                  <p>
                    Secondary Title:{' '}
                    <span className="text-[#38D9F5] font-semibold">
                      {PLAYER_TITLES_CATALOG.find(t => t.id === identityState.equippedSecondaryTitleId)?.name}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-xs text-[#94A8C7] tabular-nums pt-1">
                <span>{unlockedSet.size} / {COSMETICS_CATALOG.length} 2D Cosmetics Unlocked</span>
                <span aria-hidden="true" className="mx-2 text-[#647A9E]">·</span>
                <span>{loadouts.length} / {maxLoadoutSlots} Loadout Slots</span>
              </div>
            </div>
          </div>

          <FeatureTabBar
            themeId="character"
            layoutId="wardrobe-studio-pill"
            ariaLabel="Customization studio sections"
            activeId={studioSection}
            onSelect={id => setStudioSection(id)}
            tabs={[
              { id: 'wardrobe', label: '2D Wardrobe', icon: Palette },
              { id: 'loadouts', label: 'Loadout Presets', icon: Layers },
              { id: 'titles', label: 'Title Vault', icon: Crown },
            ]}
          />
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            notice.type === 'success'
              ? 'bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981]'
              : 'bg-[#F43F5E]/12 border-[#F43F5E]/45 text-[#F43F5E]'
          }`}
        >
          {notice.text}
        </div>
      )}

      <RpgSubTabTransition tabKey={studioSection}>
        {/* SECTION 1: 2D WARDROBE & COSMETIC MILESTONES */}
        {studioSection === 'wardrobe' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FeatureTabBar
                themeId="character"
                layoutId="wardrobe-slot-pill"
                ariaLabel="Cosmetic slots"
                activeId={activeSlot}
                onSelect={id => setActiveSlot(id)}
                tabs={SLOT_TABS}
              />

              <button
                type="button"
                disabled={busyId === `unequip-${activeSlot}`}
                onClick={() => void handleUnequipSlot(activeSlot)}
                className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset {activeSlot}
              </button>
            </div>

            <RpgStaggerGrid key={activeSlot} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <RpgStaggerItem key={item.id}>
                    <div
                      className={`${
                        isEquipped ? 'lq-card-gold' : 'lq-card lq-card-interactive'
                      } rounded-2xl p-4 h-full flex flex-col justify-between gap-4`}
                    >
                      <div className="space-y-3">
                        <div
                          className="h-16 rounded-xl border border-[#F2F7FF]/10 flex items-center justify-between px-4"
                          style={{
                            background: `linear-gradient(135deg, ${item.primaryHex}, ${item.secondaryHex})`,
                          }}
                        >
                          <span
                            className="w-6 h-6 rounded-full border border-[#F2F7FF]/30"
                            style={{ backgroundColor: item.accentHex }}
                          />
                          <span className={`text-xs font-semibold ${rStyle.text}`}>{item.rarity}</span>
                        </div>

                        <div>
                          <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">{item.name}</h3>
                          <p className="text-xs text-[#94A8C7] mt-1 leading-relaxed">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-[#38D9F5] mt-2">
                            Source: {item.unlockSource}
                          </p>
                        </div>
                      </div>

                      {owned ? (
                        <button
                          type="button"
                          disabled={isEquipped || busyId === item.id}
                          onClick={() => void handleEquipCosmetic(item.id)}
                          className={`lq-btn w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                            isEquipped
                              ? 'bg-[#1677FF]/25 text-[#38D9F5] border border-[#00D9FF]/50 cursor-default'
                              : 'lq-btn-gold font-bold'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isEquipped ? 'Equipped' : 'Equip Cosmetic'}
                        </button>
                      ) : (
                        <div className="w-full py-2 px-3 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs text-[#647A9E] flex items-center justify-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </div>
                      )}
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>

            {/* Wardrobe Collection Milestones */}
            <RpgScrollReveal className="lq-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#38D9F5]" />
                  Cosmetic Collection Milestones
                </h3>
                <span className="text-xs font-mono text-[#94A8C7] tabular-nums">
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
                      className="lq-surface rounded-xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs text-[#38D9F5] font-semibold tabular-nums">
                          {ms.requiredUnlocked}+ Cosmetics
                        </p>
                        <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] mt-0.5">
                          {ms.title}
                        </h4>
                        <p className="text-xs text-[#94A8C7] mt-1">{ms.rewardLabel}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!ready || busyId === ms.id}
                        onClick={() => void handleClaimMilestone(ms.id)}
                        className={`lq-btn py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          claimed
                            ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/45'
                            : ready
                            ? 'lq-btn-gold font-bold'
                            : 'lq-btn-secondary opacity-50'
                        }`}
                      >
                        {claimed ? 'Claimed' : ready ? 'Claim Reward' : 'In Progress'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </RpgScrollReveal>
          </div>
        )}

        {/* SECTION 2: MULTI-LOADOUT MANAGER (ZERO GAMEPLAY STATS) */}
        {studioSection === 'loadouts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                    Saved Cosmetic Loadouts
                  </h3>
                  <p className="text-xs text-[#94A8C7]">
                    Combine 2D appearance, primary and secondary titles, and up to 4 badges. Strictly cosmetic—zero combat impact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={beginNewLoadout}
                  className="lq-btn lq-btn-gold px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Preset
                </button>
              </div>

              {loadouts.length === 0 ? (
                <div className="lq-surface rounded-2xl p-8 text-center text-xs text-[#94A8C7]">
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
                        className="lq-card lq-card-interactive rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Character2DAvatar
                            heroId={selectedHeroId}
                            characterClass={user?.characterClass}
                            appearance={preset.appearance}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] truncate">
                              {preset.name}
                            </h4>
                            <div className="text-[11px] text-[#94A8C7] flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{preset.context === 'competition' ? 'Competition Context' : 'Profile Default'}</span>
                              <span aria-hidden="true" className="text-[#647A9E]">·</span>
                              <span>{titleName}</span>
                              <span aria-hidden="true" className="text-[#647A9E]">·</span>
                              <span className="tabular-nums">{preset.badgeIds.length} Badges</span>
                            </div>
                            {(isDefaultActive || isCompActive) && (
                              <p className="text-[11px] text-[#10B981] font-semibold mt-1">
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
                            className="lq-btn lq-btn-primary px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Equip Profile
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `eq-${preset.id}`}
                            onClick={() => void handleEquipLoadout(preset.id, 'competition')}
                            className="lq-btn px-2.5 py-1.5 rounded-lg bg-[#0A1930] hover:bg-[#102440] border border-[#1677FF]/55 text-[#38D9F5] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Bind Arena
                          </button>
                          <button
                            type="button"
                            onClick={() => loadPresetForEdit(preset)}
                            className="lq-btn lq-btn-secondary px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void duplicateLoadout(preset.id)}
                            aria-label={`Duplicate ${preset.name}`}
                            className="lq-btn lq-btn-secondary p-1.5 rounded-lg text-[#94A8C7] hover:text-[#F2F7FF] cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteLoadout(preset.id)}
                            aria-label={`Delete ${preset.name}`}
                            className="lq-btn p-1.5 rounded-lg bg-[#0A1930] hover:bg-[#F43F5E]/15 border border-[#1E3A63] hover:border-[#F43F5E]/50 text-[#F43F5E] cursor-pointer"
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
              className="lg:col-span-5 lq-card rounded-2xl p-5 space-y-4 self-start"
            >
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                {editingLoadoutId ? 'Update Loadout Preset' : 'Save Current Look as Loadout'}
              </h3>

              <div>
                <label className="block text-xs text-[#94A8C7] mb-1">Loadout Name</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={loadoutName}
                  onChange={e => setLoadoutName(e.target.value)}
                  placeholder="e.g. Duskwarden Competition"
                  className="lq-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[#94A8C7] mb-1">Target Context</label>
                <select
                  value={loadoutContext}
                  onChange={e => setLoadoutContext(e.target.value as 'default' | 'competition')}
                  className="lq-input w-full px-3 py-2 text-xs"
                >
                  <option value="default">Profile Default</option>
                  <option value="competition">Rivals &amp; Tournament Arena</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#94A8C7] mb-1">Primary Title</label>
                <select
                  value={loadoutPrimaryTitle || ''}
                  onChange={e => setLoadoutPrimaryTitle(e.target.value || null)}
                  className="lq-input w-full px-3 py-2 text-xs"
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
                <label className="block text-xs text-[#94A8C7] mb-1">Secondary Title (Optional)</label>
                <select
                  value={loadoutSecondaryTitle || ''}
                  onChange={e => setLoadoutSecondaryTitle(e.target.value || null)}
                  className="lq-input w-full px-3 py-2 text-xs"
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
                <span className="block text-xs text-[#94A8C7] mb-1.5">
                  Featured Badges ({loadoutBadges.length}/4)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {unlockedBadgeList.length === 0 ? (
                    <span className="text-xs text-[#647A9E]">Unlock badges to attach them here.</span>
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
                          className={`lq-btn px-2.5 py-1.5 rounded-lg text-xs border whitespace-nowrap shrink-0 cursor-pointer ${
                            selected
                              ? 'bg-[#1677FF]/30 border-[#00D9FF]/60 text-[#38D9F5]'
                              : 'lq-btn-secondary text-[#94A8C7]'
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
                className="lq-btn lq-btn-gold w-full py-2.5 px-4 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                {editingLoadoutId ? 'Save Changes' : 'Save Loadout'}
              </button>
            </form>
          </div>
        )}

        {/* SECTION 3: ADVANCED TITLE VAULT (DUAL TITLE SLOTS) */}
        {studioSection === 'titles' && (
          <div className="space-y-4">
            <div className="lq-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                  Player Title Collection ({unlockedTitleSet.size} / {PLAYER_TITLES_CATALOG.length})
                </h3>
                <p className="text-xs text-[#94A8C7] mt-0.5">
                  Equip a Primary Title and an optional Secondary Title to display across Hero Command Center, Social Directory, Leaderboards, and Rivals.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleTitleSlotSelect('primary', null)}
                  className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Clear Primary
                </button>
                <button
                  type="button"
                  onClick={() => void handleTitleSlotSelect('secondary', null)}
                  className="lq-btn lq-btn-secondary px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Clear Secondary
                </button>
              </div>
            </div>

            <RpgStaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLAYER_TITLES_CATALOG.map(title => {
                const unlocked = unlockedTitleSet.has(title.id);
                const isPrimary = identityState?.equippedTitleId === title.id;
                const isSecondary = identityState?.equippedSecondaryTitleId === title.id;
                const style = IDENTITY_RARITY_STYLE[title.rarity];

                return (
                  <RpgStaggerItem key={title.id}>
                    <div
                      className={`${
                        isPrimary || isSecondary ? 'lq-card-gold' : 'lq-card lq-card-interactive'
                      } rounded-2xl p-4 h-full flex flex-col justify-between gap-3`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className={`font-semibold ${style.text}`}>{title.rarity}</span>
                          <span className="text-[#94A8C7] capitalize">{title.category}</span>
                        </div>
                        <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                          {title.name}
                        </h4>
                        <p className="text-xs text-[#94A8C7] mt-1 leading-relaxed">{title.description}</p>
                        <p className="text-[11px] text-[#38D9F5] mt-2">
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
                            className={`lq-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                              isPrimary ? 'lq-btn-primary' : 'lq-btn-secondary'
                            }`}
                          >
                            {isPrimary ? 'Primary Equipped' : 'Set Primary'}
                          </button>
                          <button
                            type="button"
                            disabled={isSecondary || busyId === `title-secondary-${title.id}`}
                            onClick={() => void handleTitleSlotSelect('secondary', title.id)}
                            className={`lq-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                              isSecondary ? 'lq-btn-gold font-bold' : 'lq-btn-secondary text-[#38D9F5]'
                            }`}
                          >
                            {isSecondary ? 'Secondary Equipped' : 'Set Secondary'}
                          </button>
                        </div>
                      ) : (
                        <div className="py-1.5 px-3 rounded-lg bg-[#061225] border border-[#1E3A63] text-xs text-[#647A9E] flex items-center justify-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </div>
                      )}
                    </div>
                  </RpgStaggerItem>
                );
              })}
            </RpgStaggerGrid>
          </div>
        )}
      </RpgSubTabTransition>
    </div>
  );
};
