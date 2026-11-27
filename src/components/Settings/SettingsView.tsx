import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  characterWarriorAvatarImg,
  getHeroArtwork,
  resolveAssetUrl,
} from '../../assets/images';
import { getHeroById } from '../../data/heroesData';
import {
  CharacterClass,
  UnitSystem,
  DietaryPreference,
  ActivityLevel,
  AgeGroup,
  BiologicalSex,
  FieldVisibilityLevel,
  GranularPrivacySettings,
} from '../../types/game';
import {
  FRIENDS_ONLY_PRESET,
  MANUAL_PRESENCE_OPTIONS,
  PRESENCE_STATUS_META,
  PRIVACY_FIELD_DEFINITIONS,
  PRIVATE_BY_DEFAULT_PRESET,
  PUBLIC_CHAMPION_PRESET,
  deriveLegacyVisibilityFromGranular,
  normalizeGranularPrivacySettings,
} from '../../utils/presence';
import { PresenceBadge } from '../Brand/PresenceBadge';
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import { RpgModalWrapper } from '../Motion/RpgMotionPrimitives';
import {
  User,
  Shield,
  Volume2,
  VolumeX,
  Camera,
  Download,
  Trash2,
  LogOut,
  Save,
  Check,
  Cloud,
  RefreshCw,
  Lock,
  Bell,
  Eye,
  Radio,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    user,
    stats,
    updateUser,
    toggleSound,
    resetAllData,
    exportData,
    logout,
    cloudStatus,
    lastSavedAt,
    triggerManualCloudSave,
    startTutorial,
    selectedHeroId,
    heroLocked,
    setShowHeroSelectModal,
    notificationPreferences,
    saveServerNotificationPreferences,
    myManualPresence,
    myEffectivePresence,
    autoAwayEnabled,
    autoAwayMinutes,
    setManualPresenceStatus,
    updatePresencePreferences,
    previewPublicProfileAs,
  } = useGame();
  const boundHero = getHeroById(selectedHeroId);

  const [username, setUsername] = useState(user?.username || '');
  const [characterName, setCharacterName] = useState(user?.characterName || user?.username || '');
  const [characterClass, setCharacterClass] = useState<CharacterClass>(user?.characterClass || 'Warrior');
  const [preferredUnits, setPreferredUnits] = useState<UnitSystem>(user?.preferredUnits || 'metric');
  const [ageYearsInput, setAgeYearsInput] = useState(user?.ageYears ? String(user.ageYears) : '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>(user?.ageGroup || '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | ''>(user?.biologicalSex || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(user?.dietaryPreference || 'vegetarian');
  const [foodAllergiesText, setFoodAllergiesText] = useState(
    user?.foodAllergiesList?.join(', ') || user?.foodAllergies || ''
  );
  const [foodIntolerancesText, setFoodIntolerancesText] = useState(
    user?.foodIntolerances?.join(', ') || ''
  );
  const [dislikedFoods, setDislikedFoods] = useState(user?.dislikedFoods || '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(user?.activityLevel || 'moderate');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(user?.leaderboardVisible ?? true);
  const [bio, setBio] = useState(user?.bio || '');
  const [privacySettings, setPrivacySettings] = useState<GranularPrivacySettings>(() =>
    normalizeGranularPrivacySettings(user?.privacySettings, user)
  );
  const [previewMode, setPreviewMode] = useState<'public' | 'friend' | 'restricted' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [notifPrefs, setNotifPrefs] = useState(
    user?.notificationPreferences || {
      dailyReminders: true,
      weeklySummary: true,
      guildUpdates: true,
      questAlerts: true,
    }
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);

  useEffect(() => {
    if (!showResetConfirm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResetConfirm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showResetConfirm]);

  const handleManualSync = async () => {
    setManualSyncing(true);
    await triggerManualCloudSave();
    setTimeout(() => setManualSyncing(false), 600);
  };

  const handleRunPreview = async (mode: 'public' | 'friend' | 'restricted') => {
    setPreviewMode(mode);
    setPreviewLoading(true);
    const derived = deriveLegacyVisibilityFromGranular(privacySettings);
    await updateUser({
      privacySettings,
      ...derived,
    });
    const res = await previewPublicProfileAs(mode);
    setPreviewResult(res);
    setPreviewLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const allergiesArr = foodAllergiesText.split(',').map(s => s.trim()).filter(Boolean);
    const intolerancesArr = foodIntolerancesText.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAge = ageYearsInput.trim() ? Number(ageYearsInput.trim()) : undefined;
    const validAgeYears =
      parsedAge && !Number.isNaN(parsedAge) && parsedAge >= 5 && parsedAge <= 120
        ? Math.round(parsedAge)
        : undefined;
    const resolvedAgeGroup: AgeGroup | undefined = validAgeYears
      ? validAgeYears <= 9
        ? 'child'
        : validAgeYears <= 13
        ? 'early_teen'
        : validAgeYears <= 17
        ? 'older_teen'
        : validAgeYears >= 60
        ? 'older_adult'
        : 'adult'
      : ageGroup || undefined;

    const derivedLegacy = deriveLegacyVisibilityFromGranular(privacySettings);

    await updateUser({
      username: username.trim() || 'Hero',
      characterName: characterName.trim() || username.trim() || 'Hero',
      characterClass,
      preferredUnits,
      ageYears: validAgeYears,
      ageGroup: resolvedAgeGroup,
      biologicalSex: biologicalSex || undefined,
      height: height.trim() || undefined,
      weight: weight.trim() || undefined,
      dietaryPreference,
      foodAllergiesList: allergiesArr,
      foodAllergies: allergiesArr.join(', ') || undefined,
      foodIntolerances: intolerancesArr,
      dislikedFoods: dislikedFoods.trim(),
      activityLevel,
      timezone: timezone.trim() || 'UTC',
      notificationPreferences: notifPrefs,
      leaderboardVisible,
      bio: bio.trim(),
      privacySettings,
      ...derivedLegacy,
    });
    await saveServerNotificationPreferences(notificationPreferences);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifequest_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <FeatureBanner themeId="dashboard">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
            <span className="font-['Cinzel'] font-bold uppercase tracking-widest text-[#E8C777]">
              Hero Preferences
            </span>
            <span className="text-[#A69AAF]/45" aria-hidden="true">·</span>
            <span className="text-[#A69AAF] font-medium">Preferences &amp; Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2EDF7]">
            SETTINGS &amp; PRIVACY CHARTER
          </h1>
          <p className="text-xs sm:text-sm text-[#A69AAF] max-w-2xl mt-1">
            Manage your hero archetype, preferences, audio feedback, and cross-platform cloud synchronization.
          </p>
        </div>
      </FeatureBanner>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-[#49B88A]/15 border border-[#49B88A]/45 text-xs text-[#49B88A] flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          Settings updated and synced across Web &amp; Mobile!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile & Wellness Settings */}
        <div className="lq-card rounded-2xl p-6 space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
            <User className="w-4 h-4 text-[#E8C777]" />
            HERO PROFILE
          </h3>

          {/* Dual Identity Preview: RPG Character Portrait vs Google Account Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#100D18] border border-[#362B45]">
            <div className="flex items-center gap-3">
              <img
                src={getHeroArtwork(selectedHeroId, characterClass)}
                alt={`${boundHero.name} Portrait`}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover object-top border-2 border-[#D6A84B] shadow"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#E8C777] font-bold block">
                  Bound Champion Portrait
                </span>
                <span className="text-xs font-bold text-[#F2EDF7] block truncate">
                  {boundHero.name} · {characterClass}
                </span>
                <span className="text-[10px] text-[#A69AAF] block">
                  Used across Realm &amp; Combat
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-[#362B45] sm:pl-3">
              <img
                src={resolveAssetUrl(user?.googleAvatar || user?.avatar, characterWarriorAvatarImg)}
                alt={user?.username || 'Account Photo'}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#9A72CC]/80 shadow"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#9A72CC] font-bold block">
                  Account Profile Photo
                </span>
                <span className="text-xs font-semibold text-[#F2EDF7] block truncate">
                  {user?.email || user?.username}
                </span>
                <span className="text-[10px] text-[#A69AAF] block">
                  Kept separate from RPG portrait
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Hero Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Character Name</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1 flex items-center justify-between">
                  <span>Character Class Archetype</span>
                  {heroLocked && (
                    <span className="text-[10px] text-[#E8C777] font-semibold inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </label>
                <select
                  value={characterClass}
                  disabled={heroLocked}
                  onChange={e => setCharacterClass(e.target.value as CharacterClass)}
                  className={`lq-input w-full px-3 py-2.5 ${
                    heroLocked ? 'opacity-65 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="Warrior">Warrior (Physical power, calisthenics)</option>
                  <option value="Mage">Mage (Mindfulness, focus, hydration)</option>
                  <option value="Ranger">Ranger (Walking, running, agility)</option>
                  <option value="Guardian">Guardian (Sleep, recovery, preservation)</option>
                </select>
                {heroLocked && (
                  <p className="text-[10px] text-[#A69AAF] mt-1">
                    Permanently bound to {boundHero.name}.
                  </p>
                )}
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                  className="lq-input w-full px-3 py-2.5"
                >
                  <option value="sedentary">Mostly Seated</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Preferred Units</label>
                <select
                  value={preferredUnits}
                  onChange={e => setPreferredUnits(e.target.value as UnitSystem)}
                  className="lq-input w-full px-3 py-2.5"
                >
                  <option value="metric">Metric (cm / kg / km)</option>
                  <option value="imperial">Imperial (ft / lb / mi)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Dietary Preference</label>
                <select
                  value={dietaryPreference}
                  onChange={e => setDietaryPreference(e.target.value as DietaryPreference)}
                  className="lq-input w-full px-3 py-2.5"
                >
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Age (Years, Optional)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={ageYearsInput}
                  onChange={e => setAgeYearsInput(e.target.value)}
                  placeholder="e.g. 24"
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Age Group (Optional)</label>
                <select
                  value={ageGroup}
                  onChange={e => setAgeGroup(e.target.value as AgeGroup | '')}
                  className="lq-input w-full px-3 py-2.5"
                >
                  <option value="">Auto from age</option>
                  <option value="child">Child (5–9 yrs)</option>
                  <option value="early_teen">Early Teen (10–13 yrs)</option>
                  <option value="older_teen">Older Teen (14–17 yrs)</option>
                  <option value="adult">Adult (18–59 yrs)</option>
                  <option value="older_adult">Older Adult (60+ yrs)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Reference Sex (Optional)</label>
                <select
                  value={biologicalSex}
                  onChange={e => setBiologicalSex(e.target.value as BiologicalSex | '')}
                  className="lq-input w-full px-3 py-2.5"
                >
                  <option value="">Prefer not to specify</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Height (Optional)</label>
                <input
                  type="text"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder={preferredUnits === 'metric' ? 'e.g. 175 cm' : 'e.g. 5 ft 9 in'}
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Weight (Optional)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder={preferredUnits === 'metric' ? 'e.g. 70 kg' : 'e.g. 154 lb'}
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Food Allergies (Comma-separated)</label>
                <input
                  type="text"
                  value={foodAllergiesText}
                  onChange={e => setFoodAllergiesText(e.target.value)}
                  placeholder="e.g. Peanuts, Dairy"
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Intolerances (Comma-separated)</label>
                <input
                  type="text"
                  value={foodIntolerancesText}
                  onChange={e => setFoodIntolerancesText(e.target.value)}
                  placeholder="e.g. Lactose"
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Foods to Avoid</label>
                <input
                  type="text"
                  value={dislikedFoods}
                  onChange={e => setDislikedFoods(e.target.value)}
                  placeholder="e.g. Mushrooms, Olives"
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block font-medium text-[#A69AAF] mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  placeholder="e.g. Asia/Kolkata"
                  className="lq-input w-full px-3 py-2.5"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#F2EDF7] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#E8C777]" />
                  Alert &amp; Notification Controls
                </span>
                <label className="flex items-center gap-2 text-[11px] text-[#E8C777] cursor-pointer">
                  <span>All Enabled</span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.masterEnabled}
                    onChange={e =>
                      void saveServerNotificationPreferences({
                        ...notificationPreferences,
                        masterEnabled: e.target.checked,
                      })
                    }
                    className="accent-[#7045A0] cursor-pointer"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'fitness', label: 'Fitness & PRs' },
                    { key: 'achievement', label: 'Titles & Badges' },
                    { key: 'social', label: 'Social & Rivals' },
                    { key: 'boss', label: 'Weekly Bosses' },
                    { key: 'community', label: 'Community Events' },
                    { key: 'seasonal', label: 'Seasonal Track' },
                  ] as const
                ).map(item => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 text-[11px] text-[#A69AAF] cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      disabled={!notificationPreferences.masterEnabled}
                      checked={notificationPreferences[item.key]}
                      onChange={e =>
                        void saveServerNotificationPreferences({
                          ...notificationPreferences,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="accent-[#7045A0] cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Bio & Granular 11-Field Privacy Matrix */}
            <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#E8C777] block">
                    Granular Profile Privacy Matrix
                  </span>
                  <span className="text-[11px] text-[#A69AAF]">
                    Choose Everyone, Friends Only, or Nobody per category. Email &amp; private health details never leave your account.
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setPrivacySettings(PUBLIC_CHAMPION_PRESET)}
                    className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
                  >
                    Public Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacySettings(FRIENDS_ONLY_PRESET)}
                    className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
                  >
                    Friends Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacySettings(PRIVATE_BY_DEFAULT_PRESET)}
                    className="lq-btn lq-btn-secondary px-2.5 py-1 rounded-lg text-[11px] text-[#A69AAF] hover:text-[#F2EDF7] cursor-pointer"
                  >
                    Private Preset
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-[#A69AAF]">Hero Bio</label>
                  <span className="text-[10px] text-[#766D82] font-mono tabular-nums">
                    {bio.length}/240
                  </span>
                </div>
                <textarea
                  value={bio}
                  maxLength={240}
                  rows={2}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share your quest ethos, training focus, or guild motto..."
                  className="lq-input w-full px-3 py-2 resize-none"
                />
              </div>

              <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#171220] border border-[#362B45] cursor-pointer hover:border-[#7045A0] transition-colors">
                <div>
                  <span className="font-semibold text-[#F2EDF7] block">Private-by-Default Mode</span>
                  <span className="text-[10px] text-[#A69AAF]">
                    Restrict default profile discovery and treat non-public fields strictly.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.privateByDefault}
                  onChange={e =>
                    setPrivacySettings(prev => ({
                      ...prev,
                      privateByDefault: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#7045A0] cursor-pointer"
                />
              </label>

              <div className="divide-y divide-[#362B45] border border-[#362B45] rounded-xl overflow-hidden bg-[#171220]">
                {PRIVACY_FIELD_DEFINITIONS.map(field => {
                  const val = privacySettings[field.key];
                  return (
                    <div
                      key={field.key}
                      className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#F2EDF7] block">{field.label}</span>
                        <span className="text-[10px] text-[#A69AAF] block">
                          {field.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#100D18] border border-[#362B45] shrink-0">
                        {(['everyone', 'friends', 'nobody'] as FieldVisibilityLevel[]).map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setPrivacySettings(prev => ({
                                ...prev,
                                [field.key]: opt,
                              }))
                            }
                            className={`px-2 py-1 rounded text-[10px] font-semibold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                              val === opt
                                ? 'bg-[#7045A0] text-[#F2EDF7]'
                                : 'text-[#A69AAF] hover:text-[#F2EDF7]'
                            }`}
                          >
                            {opt === 'everyone' ? 'Everyone' : opt === 'friends' ? 'Friends' : 'Nobody'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center justify-between gap-2 text-[11px] text-[#A69AAF] cursor-pointer p-2 rounded-lg bg-[#171220] border border-[#362B45]">
                  <span>Show Combat Stance</span>
                  <input
                    type="checkbox"
                    checked={privacySettings.showEquipment !== false}
                    onChange={e =>
                      setPrivacySettings(prev => ({ ...prev, showEquipment: e.target.checked }))
                    }
                    className="accent-[#7045A0] cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px] text-[#A69AAF] cursor-pointer p-2 rounded-lg bg-[#171220] border border-[#362B45]">
                  <span>Show Guild Affiliation</span>
                  <input
                    type="checkbox"
                    checked={privacySettings.showGuild !== false}
                    onChange={e =>
                      setPrivacySettings(prev => ({ ...prev, showGuild: e.target.checked }))
                    }
                    className="accent-[#7045A0] cursor-pointer"
                  />
                </label>
              </div>

              {/* Preview Public Profile As */}
              <div className="pt-2 border-t border-[#362B45] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#E8C777] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Preview Profile As Visitor
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'public', label: 'Public Stranger' },
                        { id: 'friend', label: 'Friend' },
                        { id: 'restricted', label: 'Blocked / Restricted' },
                      ] as const
                    ).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={previewLoading}
                        onClick={() => void handleRunPreview(m.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                          previewMode === m.id
                            ? 'bg-[#7045A0] border-[#D6A84B]/50 text-[#F2EDF7]'
                            : 'bg-[#171220] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {previewMode && (
                  <div className="rounded-lg bg-[#171220] border border-[#362B45] p-3 text-[11px] text-[#A69AAF] space-y-1">
                    {previewLoading ? (
                      <span>Verifying server privacy filter...</span>
                    ) : previewResult ? (
                      <>
                        <div className="font-semibold text-[#F2EDF7]">
                          Viewing as <span className="text-[#E8C777] capitalize">{previewMode}</span>:{' '}
                          {previewResult.accessible === false
                            ? 'Profile restricted / inaccessible'
                            : `${previewResult.player?.username || 'Hidden Champion'} · Level ${
                                previewResult.player?.level ?? 'Hidden'
                              }`}
                        </div>
                        <div className="text-[10px] text-[#A69AAF]/85">
                          Visible sections:{' '}
                          {previewResult.permittedFields?.length
                            ? previewResult.permittedFields.join(', ')
                            : previewResult.accessible === false
                            ? 'None (Restricted)'
                            : 'Minimal public identity'}
                        </div>
                      </>
                    ) : (
                      <span>Server preview ready once profile saves.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#100D18] border border-[#362B45]">
              <div>
                <span className="font-semibold text-[#F2EDF7] block">Show me on Public Leaderboards</span>
                <span className="text-[11px] text-[#A69AAF]">
                  Allow other champions to find you in search &amp; public rankings ({timezone || 'UTC'})
                </span>
              </div>
              <input
                type="checkbox"
                checked={leaderboardVisible}
                onChange={e => setLeaderboardVisible(e.target.checked)}
                className="w-4 h-4 accent-[#7045A0] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="lq-btn lq-btn-primary w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#E8C777]" />
              Save Changes
            </button>
          </form>
        </div>

        {/* Right Column: Live Presence, Audio, Privacy & Data Management */}
        <div className="space-y-6">
          {/* Online Presence Status & Auto-Away Card (4 Discord-style statuses: Online / Away / DND / Offline) */}
          <div className="lq-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#E8C777]" />
                ONLINE PRESENCE STATUS
              </h3>
              <PresenceBadge status={myEffectivePresence} showLabel size="md" />
            </div>
            <p className="text-xs text-[#A69AAF] leading-relaxed">
              Your real-time presence updates across Friends, Guilds, Rivals, Chat, and Leaderboards via live heartbeat. Offline sets automatically when you close Aetheria or log out.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {MANUAL_PRESENCE_OPTIONS.map(opt => {
                const meta = PRESENCE_STATUS_META[opt];
                const selected = myManualPresence === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => void setManualPresenceStatus(opt)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#7045A0]/25 border-[#D6A84B] shadow-[0_0_12px_rgba(214,168,75,0.2)]'
                        : 'bg-[#100D18] border-[#362B45] hover:border-[#D6A84B]/50'
                    }`}
                  >
                    <PresenceBadge status={opt} showLabel size="sm" />
                    <span className="text-[10px] text-[#A69AAF] block mt-1 leading-snug">
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#362B45] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 text-[#A69AAF] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAwayEnabled}
                  onChange={e =>
                    void updatePresencePreferences({ autoAwayEnabled: e.target.checked })
                  }
                  className="accent-[#7045A0] cursor-pointer"
                />
                <span>Auto-mark Away after inactivity</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#A69AAF]">Idle timeout:</span>
                <select
                  disabled={!autoAwayEnabled}
                  value={autoAwayMinutes}
                  onChange={e =>
                    void updatePresencePreferences({ autoAwayMinutes: Number(e.target.value) })
                  }
                  className="lq-input px-2.5 py-1 text-xs disabled:opacity-45"
                >
                  {[3, 5, 10, 15, 30].map(mins => (
                    <option key={mins} value={mins}>
                      {mins} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Guided Tutorial & Hero Oath */}
          <div className="lq-card rounded-2xl p-6 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#E8C777]" />
              GUIDED TUTORIAL &amp; HERO OATH
            </h3>
            <p className="text-xs text-[#A69AAF] leading-relaxed">
              {heroLocked
                ? `Replay the interactive 11-step tour of Aetheria at any time without affecting your level, XP, Gold, or training progress. Your champion oath is permanently bound to ${boundHero.name}.`
                : 'Replay the interactive 11-step tour of Aetheria or complete your one-time champion selection to permanently bind your hero to your account.'}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => startTutorial(0)}
                className="lq-btn lq-btn-primary px-4 py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider cursor-pointer"
              >
                Replay Interactive Tutorial
              </button>
              {heroLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#100D18] border border-[#D6A84B]/40 text-[#E8C777] text-xs font-['Cinzel'] font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  Oath Bound: {boundHero.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHeroSelectModal(true)}
                  className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider cursor-pointer"
                >
                  Choose Permanent Champion
                </button>
              )}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="lq-card rounded-2xl p-6 space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
              {stats.soundEnabled ? <Volume2 className="w-4 h-4 text-[#E8C777]" /> : <VolumeX className="w-4 h-4 text-[#A69AAF]" />}
              AUDIO ENGINE
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#F2EDF7] block">RPG Sound Effects</span>
                <span className="text-[11px] text-[#A69AAF]">Play sound effects for rep counts, quests, and battle hits</span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-['Cinzel'] transition-all cursor-pointer ${
                  stats.soundEnabled
                    ? 'lq-btn lq-btn-primary'
                    : 'lq-btn lq-btn-secondary text-[#A69AAF]'
                }`}
              >
                {stats.soundEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>
          </div>

          {/* Camera Privacy Charter */}
          <div className="lq-card rounded-2xl p-6 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#49B88A]" />
              AETHER VISION PRIVACY CHARTER
            </h3>
            <p className="text-xs text-[#A69AAF] leading-relaxed">
              Camera access is strictly opt-in and active only during workouts. Movement tracking runs privately on your device—raw video is never stored, uploaded, or used for facial recognition.
            </p>
          </div>

          {/* Cloud Save & Progress Sync */}
          <div className="lq-card rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#E8C777]" />
                CLOUD SAVE &amp; SYNC
              </h3>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  cloudStatus === 'saved'
                    ? 'text-[#49B88A]'
                    : cloudStatus === 'saving'
                    ? 'text-[#E8C777]'
                    : cloudStatus === 'error'
                    ? 'text-[#D65C66]'
                    : 'text-[#A69AAF]'
                }`}
              >
                {cloudStatus === 'saved'
                  ? 'Saved'
                  : cloudStatus === 'saving'
                  ? 'Saving...'
                  : cloudStatus === 'error'
                  ? 'Sync Issue'
                  : 'Offline Mode'}
              </span>
            </div>
            <p className="text-xs text-[#A69AAF] leading-relaxed">
              Automatic saving keeps your hero, bodyweight strength, habit streaks, workouts, and realm progress safely synced across all your devices.
            </p>
            {lastSavedAt && (
              <div className="text-[11px] text-[#E8C777]/90 font-mono tabular-nums">
                Last Saved: {lastSavedAt.toLocaleTimeString()} ({lastSavedAt.toLocaleDateString()})
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={manualSyncing}
                onClick={handleManualSync}
                className="lq-btn lq-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#E8C777] ${manualSyncing ? 'animate-spin' : ''}`} />
                {manualSyncing ? 'Syncing...' : 'Sync Progress'}
              </button>
            </div>
          </div>

          {/* Data Backup & Reset */}
          <div className="lq-card rounded-2xl p-6 space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2EDF7] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#E8C777]" />
              ACCOUNT &amp; DATA
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E8C777]" />
                Download Progress Backup
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-xl border border-[#D65C66]/50 bg-[#D65C66]/12 text-[#D65C66] hover:bg-[#D65C66] hover:text-[#100D18] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Progress
              </button>

              <button
                type="button"
                onClick={logout}
                className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-[#A69AAF] hover:text-[#F2EDF7] text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <RpgModalWrapper
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        panelClassName="w-full max-w-sm"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          className="lq-card rounded-2xl border border-[#D65C66]/60 p-6 text-center space-y-4"
        >
          <h3 id="reset-confirm-title" className="font-['Cinzel'] font-bold text-base text-[#D65C66]">
            RESET ALL REALM PROGRESS?
          </h3>
          <p className="text-xs text-[#A69AAF]">
            This will restore all habits, workouts, and levels to default initial values. This action cannot be reversed.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="lq-btn lq-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                resetAllData();
                setShowResetConfirm(false);
              }}
              className="px-4 py-2 rounded-xl bg-[#D65C66] hover:brightness-110 text-[#100D18] text-xs font-bold transition-all cursor-pointer"
            >
              Yes, Reset All
            </button>
          </div>
        </div>
      </RpgModalWrapper>
    </div>
  );
};
