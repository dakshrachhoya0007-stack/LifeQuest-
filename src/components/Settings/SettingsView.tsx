import React, { useState } from 'react';
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
  ProfileVisibility,
} from '../../types/game';
import {
  Settings,
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
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    user?.profileVisibility || 'public'
  );
  const [showAchievements, setShowAchievements] = useState<boolean>(user?.showAchievements ?? true);
  const [showEquipment, setShowEquipment] = useState<boolean>(user?.showEquipment ?? true);
  const [showStats, setShowStats] = useState<boolean>(user?.showStats ?? true);
  const [showGuild, setShowGuild] = useState<boolean>(user?.showGuild ?? true);
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

  const handleManualSync = async () => {
    setManualSyncing(true);
    await triggerManualCloudSave();
    setTimeout(() => setManualSyncing(false), 600);
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
      profileVisibility,
      showAchievements,
      showEquipment,
      showStats,
      showGuild,
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
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-purple-400 bg-purple-950/70 border border-purple-800/60 px-2.5 py-0.5 rounded">
              Hero Preferences
            </span>
            <span className="text-xs text-purple-300 font-semibold">Preferences & Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
            SETTINGS & PRIVACY CHARTER
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Manage your hero archetype, preferences, audio feedback, and cross-platform cloud synchronization.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-xs text-emerald-200 flex items-center justify-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          Settings updated and synced across Web & Mobile!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile & Wellness Settings */}
        <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            HERO PROFILE
          </h3>

          {/* Dual Identity Preview: RPG Character Portrait vs Google Account Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#130f24] border border-purple-900/70">
            <div className="flex items-center gap-3">
              <img
                src={getHeroArtwork(selectedHeroId, characterClass)}
                alt={`${boundHero.name} Portrait`}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover object-top border-2 border-purple-500 shadow"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-purple-300 font-bold block">
                  Bound Champion Portrait
                </span>
                <span className="text-xs font-bold text-white block truncate">
                  {boundHero.name} · {characterClass}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Used across Realm &amp; Combat
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-purple-900/60 sm:pl-3">
              <img
                src={resolveAssetUrl(user?.googleAvatar || user?.avatar, characterWarriorAvatarImg)}
                alt={user?.username || 'Account Photo'}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/70 shadow"
              />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                  Account Profile Photo
                </span>
                <span className="text-xs font-semibold text-slate-200 block truncate">
                  {user?.email || user?.username}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Kept separate from RPG gear
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Hero Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Character Class Archetype</span>
                  {heroLocked && (
                    <span className="text-[10px] text-[#C5A15A] font-semibold inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </label>
                <select
                  value={characterClass}
                  disabled={heroLocked}
                  onChange={e => setCharacterClass(e.target.value as CharacterClass)}
                  className={`w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none ${
                    heroLocked ? 'opacity-65 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="Warrior">Warrior (Physical power, calisthenics)</option>
                  <option value="Mage">Mage (Mindfulness, focus, hydration)</option>
                  <option value="Ranger">Ranger (Walking, running, agility)</option>
                  <option value="Guardian">Guardian (Sleep, recovery, preservation)</option>
                </select>
                {heroLocked && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Permanently bound to {boundHero.name}.
                  </p>
                )}
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={e => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
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
                <label className="block font-medium text-slate-300 mb-1">Preferred Units</label>
                <select
                  value={preferredUnits}
                  onChange={e => setPreferredUnits(e.target.value as UnitSystem)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                >
                  <option value="metric">Metric (cm / kg / km)</option>
                  <option value="imperial">Imperial (ft / lb / mi)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Dietary Preference</label>
                <select
                  value={dietaryPreference}
                  onChange={e => setDietaryPreference(e.target.value as DietaryPreference)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
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
                <label className="block font-medium text-slate-300 mb-1">Age (Years, Optional)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={ageYearsInput}
                  onChange={e => setAgeYearsInput(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Age Group (Optional)</label>
                <select
                  value={ageGroup}
                  onChange={e => setAgeGroup(e.target.value as AgeGroup | '')}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
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
                <label className="block font-medium text-slate-300 mb-1">Reference Sex (Optional)</label>
                <select
                  value={biologicalSex}
                  onChange={e => setBiologicalSex(e.target.value as BiologicalSex | '')}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
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
                <label className="block font-medium text-slate-300 mb-1">Height (Optional)</label>
                <input
                  type="text"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder={preferredUnits === 'metric' ? 'e.g. 175 cm' : 'e.g. 5 ft 9 in'}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Weight (Optional)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder={preferredUnits === 'metric' ? 'e.g. 70 kg' : 'e.g. 154 lb'}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Food Allergies (Comma-separated)</label>
                <input
                  type="text"
                  value={foodAllergiesText}
                  onChange={e => setFoodAllergiesText(e.target.value)}
                  placeholder="e.g. Peanuts, Dairy"
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Intolerances (Comma-separated)</label>
                <input
                  type="text"
                  value={foodIntolerancesText}
                  onChange={e => setFoodIntolerancesText(e.target.value)}
                  placeholder="e.g. Lactose"
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Foods to Avoid</label>
                <input
                  type="text"
                  value={dislikedFoods}
                  onChange={e => setDislikedFoods(e.target.value)}
                  placeholder="e.g. Mushrooms, Olives"
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  placeholder="e.g. Asia/Kolkata"
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-900/70 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#C5A15A]" />
                  Alert &amp; Notification Controls
                </span>
                <label className="flex items-center gap-2 text-[11px] text-[#C5A15A] cursor-pointer">
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
                    className="accent-[#C5A15A] cursor-pointer"
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
                    className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer"
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
                      className="accent-purple-600 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Bio & Public Profile Privacy */}
            <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-900/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Public Profile &amp; Privacy</span>
                <span className="text-[10px] text-slate-400">Email &amp; health fields stay private</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-300">Hero Bio</label>
                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                    {bio.length}/240
                  </span>
                </div>
                <textarea
                  value={bio}
                  maxLength={240}
                  rows={2}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Share your quest ethos, training focus, or guild motto..."
                  className="w-full bg-[#090714] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Profile Visibility</label>
                <select
                  value={profileVisibility}
                  onChange={e => setProfileVisibility(e.target.value as ProfileVisibility)}
                  className="w-full bg-[#090714] border border-purple-900 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="public">Public — Anyone in Aetheria can view</option>
                  <option value="friends_only">Friends Only — Visible after friend acceptance</option>
                  <option value="private">Private — Hidden from discovery &amp; inspection</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <span>Show Achievements</span>
                  <input
                    type="checkbox"
                    checked={showAchievements}
                    onChange={e => setShowAchievements(e.target.checked)}
                    className="accent-purple-600 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <span>Show Equipment</span>
                  <input
                    type="checkbox"
                    checked={showEquipment}
                    onChange={e => setShowEquipment(e.target.checked)}
                    className="accent-purple-600 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <span>Show Stats &amp; Streaks</span>
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={e => setShowStats(e.target.checked)}
                    className="accent-purple-600 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <span>Show Guild</span>
                  <input
                    type="checkbox"
                    checked={showGuild}
                    onChange={e => setShowGuild(e.target.checked)}
                    className="accent-purple-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#130f24] border border-purple-900/70">
              <div>
                <span className="font-semibold text-white block">Show me on Public Leaderboards</span>
                <span className="text-[11px] text-slate-400">
                  Allow other champions to find you in search & public rankings ({timezone || 'UTC'})
                </span>
              </div>
              <input
                type="checkbox"
                checked={leaderboardVisible}
                onChange={e => setLeaderboardVisible(e.target.checked)}
                className="w-4 h-4 accent-purple-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-purple-700 hover:bg-purple-600 text-white shadow flex items-center justify-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </form>
        </div>

        {/* Audio, Privacy & Data Management */}
        <div className="space-y-6">
          {/* Interactive Guided Tutorial & Hero Oath */}
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C5A15A]" />
              GUIDED TUTORIAL &amp; HERO OATH
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {heroLocked
                ? `Replay the interactive 11-step tour of Aetheria at any time without affecting your level, XP, Gold, or equipment. Your champion oath is permanently bound to ${boundHero.name}.`
                : 'Replay the interactive 11-step tour of Aetheria or complete your one-time champion selection to permanently bind your hero to your account.'}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => startTutorial(0)}
                className="px-4 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] text-[#100D19] font-['Cinzel'] font-bold text-xs tracking-wider transition-colors"
              >
                Replay Interactive Tutorial
              </button>
              {heroLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161124] border border-[#C5A15A]/30 text-[#C5A15A] text-xs font-['Cinzel'] font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  Oath Bound: {boundHero.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHeroSelectModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#251638] hover:bg-[#7046A5]/45 border border-[#C5A15A]/40 text-[#C5A15A] font-['Cinzel'] font-bold text-xs tracking-wider transition-colors"
                >
                  Choose Permanent Champion
                </button>
              )}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
              {stats.soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              AUDIO ENGINE
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">RPG Sound Effects</span>
                <span className="text-[11px] text-slate-400">Play sound effects for rep counts, quests, and battle hits</span>
              </div>
              <button
                onClick={toggleSound}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-['Cinzel'] transition-colors ${
                  stats.soundEnabled
                    ? 'bg-purple-800 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {stats.soundEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>
          </div>

          {/* Camera Privacy Charter */}
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              AETHER VISION PRIVACY CHARTER
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Camera access is strictly opt-in and active only during workouts. Movement tracking runs privately on your device—raw video is never stored, uploaded, or used for facial recognition.
            </p>
          </div>

          {/* Cloud Save & Progress Sync */}
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-purple-400" />
                CLOUD SAVE &amp; SYNC
              </h3>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  cloudStatus === 'saved'
                    ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                    : cloudStatus === 'saving'
                    ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                    : cloudStatus === 'error'
                    ? 'bg-rose-950/70 border-rose-600 text-rose-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
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
            <p className="text-xs text-slate-300 leading-relaxed">
              Automatic saving keeps your hero, forged weapons, habit streaks, workouts, and realm progress safely synced across all your devices.
            </p>
            {lastSavedAt && (
              <div className="text-[11px] text-purple-300/80 font-mono tabular-nums">
                Last Saved: {lastSavedAt.toLocaleTimeString()} ({lastSavedAt.toLocaleDateString()})
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={manualSyncing}
                onClick={handleManualSync}
                className="px-3.5 py-2 rounded-xl border border-purple-700/60 bg-purple-950/40 hover:bg-purple-900/50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${manualSyncing ? 'animate-spin' : ''}`} />
                {manualSyncing ? 'Syncing...' : 'Sync Progress'}
              </button>
            </div>
          </div>

          {/* Data Backup & Reset */}
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="font-['Cinzel'] font-bold text-base text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              ACCOUNT &amp; DATA
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl border border-purple-700/60 bg-purple-950/40 text-purple-200 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Progress Backup
              </button>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Progress
              </button>

              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 ml-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0f0c1b] border border-rose-900 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-rose-300">
              RESET ALL REALM PROGRESS?
            </h3>
            <p className="text-xs text-slate-400">
              This will restore all habits, weapons, and levels to default initial values. This action cannot be reversed.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-purple-950 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
