import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  characterWarriorAvatarImg,
  getRpgAvatarForClass,
  heroArcaneMageImg,
  heroPaladinImg,
  heroRangerImg,
  resolveAssetUrl,
} from '../../assets/images';
import {
  CharacterClass,
  ActivityLevel,
  AgeGroup,
  BiologicalSex,
  DietaryPreference,
  UnitSystem,
  NotificationPreferences,
} from '../../types/game';
import {
  AetheriaAtmosphericBackdrop,
  AnimatedProgressBar,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Activity,
  Apple,
  User,
  Sliders,
  Bell,
  Volume2,
  VolumeX,
  Plus,
  X,
  Edit3,
  AlertTriangle,
  RefreshCw,
  Globe,
  Dumbbell,
  Heart,
  Sparkles,
  Compass,
} from 'lucide-react';
import { getUserTimezone } from '../../services/unifiedBackendService';

const makeCrestAvatar = (bg1: string, bg2: string, kind: 'solar' | 'arcane', ring: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="120" height="120" rx="24" fill="url(#g)"/><circle cx="60" cy="60" r="44" fill="none" stroke="${ring}" stroke-width="3" opacity="0.75"/>${
      kind === 'solar'
        ? `<path d="M60 24 L74 52 L92 60 L74 68 L60 96 L46 68 L28 60 L46 52 Z" fill="none" stroke="${ring}" stroke-width="3"/>`
        : `<polygon points="60,26 88,60 60,94 32,60" fill="none" stroke="${ring}" stroke-width="3"/><circle cx="60" cy="60" r="10" fill="${ring}" opacity="0.7"/>`
    }</svg>`
  )}`;

const PRESET_AVATARS = [
  { id: 'knight', label: 'Warrior Knight', src: characterWarriorAvatarImg },
  { id: 'mage-portrait', label: 'Astral Mage', src: heroArcaneMageImg },
  { id: 'ranger-portrait', label: 'Verdant Ranger', src: heroRangerImg },
  { id: 'guardian-portrait', label: 'Iron Guardian', src: heroPaladinImg },
  { id: 'warrior-crest', label: 'Solar Crest', src: makeCrestAvatar('#21152F', '#100D18', 'solar', '#E8C777') },
  { id: 'mage-crest', label: 'Arcane Crest', src: makeCrestAvatar('#171220', '#100D18', 'arcane', '#9A72CC') },
];

const COMMON_ALLERGIES = ['Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Sesame'];
const COMMON_INTOLERANCES = ['Lactose', 'Gluten sensitivity', 'Fructose', 'Caffeine sensitivity', 'Histamine'];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export const OnboardingWizard: React.FC = () => {
  const { user, stats, finishOnboarding, logout } = useGame();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 1: Character Profile (keep RPG portrait separate from Google account photo)
  const [username, setUsername] = useState(user?.username || 'Hero');
  const [characterName, setCharacterName] = useState(user?.characterName || user?.username || 'Aetherian Champion');
  const [characterClass, setCharacterClass] = useState<CharacterClass>(user?.characterClass || 'Warrior');
  const [selectedAvatar, setSelectedAvatar] = useState(getRpgAvatarForClass(user?.characterClass || 'Warrior'));

  const avatarOptions = PRESET_AVATARS;

  // Step 2: Fitness Profile
  const [preferredUnits, setPreferredUnits] = useState<UnitSystem>(user?.preferredUnits || 'metric');
  const [ageYearsInput, setAgeYearsInput] = useState(user?.ageYears ? String(user.ageYears) : '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>(user?.ageGroup || '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | ''>(user?.biologicalSex || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(user?.activityLevel || 'moderate');
  const [preferredActivities, setPreferredActivities] = useState<string[]>(
    user?.preferredActivities && user.preferredActivities.length > 0
      ? user.preferredActivities
      : ['Walking', 'Home workouts']
  );
  const [fitnessGoals, setFitnessGoals] = useState<string[]>(
    user?.personalGoals && user.personalGoals.length > 0
      ? user.personalGoals
      : ['Build consistency', 'Improve general fitness']
  );

  // Step 3: Nutrition Preferences
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(user?.dietaryPreference || 'vegetarian');
  const [foodAllergiesList, setFoodAllergiesList] = useState<string[]>(user?.foodAllergiesList || []);
  const [allergyInput, setAllergyInput] = useState('');
  const [foodIntolerances, setFoodIntolerances] = useState<string[]>(user?.foodIntolerances || []);
  const [intoleranceInput, setIntoleranceInput] = useState('');
  const [dislikedFoods, setDislikedFoods] = useState(user?.dislikedFoods || '');

  // Step 4: Preferences
  const detectedTz = getUserTimezone();
  const timezoneOptions = React.useMemo(
    () => (COMMON_TIMEZONES.includes(detectedTz) ? COMMON_TIMEZONES : [detectedTz, ...COMMON_TIMEZONES]),
    [detectedTz]
  );
  const [timezone, setTimezone] = useState(user?.timezone || detectedTz);
  const [soundEnabled, setSoundEnabled] = useState(stats.soundEnabled);
  const [leaderboardVisible, setLeaderboardVisible] = useState(user?.leaderboardVisible ?? true);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    user?.notificationPreferences || {
      dailyReminders: true,
      weeklySummary: true,
      guildUpdates: true,
      questAlerts: true,
    }
  );

  const classes: { id: CharacterClass; title: string; desc: string; Icon: React.FC<{ className?: string }>; perk: string }[] = [
    {
      id: 'Warrior',
      title: 'Warrior',
      desc: 'Steadfast champions of physical conditioning, functional strength, and stamina.',
      Icon: Dumbbell,
      perk: 'Suited for calisthenics, gym sets, and steady strength progression.',
    },
    {
      id: 'Mage',
      title: 'Mage',
      desc: 'Scholars of mindfulness, hydration rituals, mobility, and mental focus.',
      Icon: Sparkles,
      perk: 'Suited for yoga, restorative habits, reading, and clarity quests.',
    },
    {
      id: 'Ranger',
      title: 'Ranger',
      desc: 'Swift pathfinders skilled in walking, running, cycling, and outdoor movement.',
      Icon: Compass,
      perk: 'Suited for active steps, cardio endurance, and sports routines.',
    },
    {
      id: 'Guardian',
      title: 'Guardian',
      desc: 'Protectors devoted to restful sleep, balanced fueling, and long-term resilience.',
      Icon: Heart,
      perk: 'Suited for recovery routines, consistent habits, and steady pacing.',
    },
  ];

  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setList(prev => (prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]));
  };

  const addTag = (
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const cleaned = input.trim();
    if (!cleaned) return;
    if (!list.some(i => i.toLowerCase() === cleaned.toLowerCase())) {
      setList([...list, cleaned]);
    }
    setInput('');
  };

  const validateCurrentStep = (): boolean => {
    setSaveError(null);
    if (currentStep === 1) {
      if (!username.trim()) {
        setSaveError('Please enter a public Hero Username to continue.');
        return false;
      }
      if (!characterName.trim()) {
        setSaveError('Please enter an in-realm Character Name to continue.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep(prev => Math.min(5, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = async () => {
    setSaveError(null);
    setIsSaving(true);
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

    const res = await finishOnboarding(
      {
        username: username.trim(),
        characterName: characterName.trim(),
        characterClass,
        avatar: selectedAvatar,
        preferredUnits,
        ageYears: validAgeYears,
        ageGroup: resolvedAgeGroup,
        biologicalSex: biologicalSex || undefined,
        height: height.trim() || undefined,
        weight: weight.trim() || undefined,
        activityLevel,
        preferredActivities,
        personalGoals: fitnessGoals,
        dietaryPreference,
        foodAllergiesList,
        foodAllergies: foodAllergiesList.join(', ') || undefined,
        foodIntolerances,
        dislikedFoods: dislikedFoods.trim(),
        notificationPreferences: notificationPrefs,
        timezone,
        leaderboardVisible,
      },
      { soundEnabled }
    );
    setIsSaving(false);
    if (!res.success) {
      setSaveError(res.error || 'Could not complete onboarding. Please retry.');
    }
  };

  const stepLabels = [
    { num: 1, label: 'Character', icon: User },
    { num: 2, label: 'Fitness', icon: Activity },
    { num: 3, label: 'Nutrition', icon: Apple },
    { num: 4, label: 'Preferences', icon: Sliders },
    { num: 5, label: 'Confirm', icon: Check },
  ];

  const dietaryLabelMap: Record<DietaryPreference, string> = {
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    eggetarian: 'Eggetarian',
    non_vegetarian: 'Non-Vegetarian',
    other: 'Other / Custom',
  };

  return (
    <div className="min-h-screen bg-[#100D18] text-[#F2EDF7] flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-x-clip">
      <AetheriaAtmosphericBackdrop />

      <div className="relative z-10 max-w-3xl mx-auto w-full">
        {/* Wizard Header & 5-Step Progress */}
        <div className="mb-7 text-center relative">
          <button
            type="button"
            onClick={logout}
            className="lq-btn lq-btn-secondary absolute right-0 top-0 text-[11px] text-[#A69AAF] hover:text-[#F2EDF7] px-2.5 py-1 rounded-lg cursor-pointer"
          >
            Sign Out
          </button>
          <p className="text-xs font-['Cinzel'] uppercase tracking-widest text-[#E8C777] font-bold mb-2">
            Champion Awakening · Step {currentStep} of 5
          </p>
          <AnimatedProgressBar
            percentage={(currentStep / 5) * 100}
            className="w-full h-2.5 rounded-full bg-[#171220] border border-[#362B45] overflow-hidden max-w-lg mx-auto mb-4"
          />

          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {stepLabels.map(s => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isDone = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep || validateCurrentStep()) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#7045A0] border-[#D6A84B]/60 text-[#F2EDF7] shadow-[0_0_16px_rgba(112,69,160,0.45)]'
                      : isDone
                      ? 'bg-[#49B88A]/15 border-[#49B88A]/50 text-[#49B88A]'
                      : 'bg-[#171220] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7] hover:border-[#7045A0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {saveError && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#D65C66]/15 border border-[#D65C66]/55 text-xs text-[#F2EDF7] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D65C66] shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <RpgSubTabTransition tabKey={String(currentStep)}>
          {/* STEP 1: CHARACTER PROFILE */}
          {currentStep === 1 && (
            <div className="lq-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-['Cinzel'] text-[#F2EDF7] mb-1">
                  STEP 1: CHARACTER PROFILE
                </h2>
                <p className="text-sm text-[#A69AAF]">
                  Choose your public hero username, in-realm character name, starting class archetype, and portrait avatar. After completing setup, you will inspect full character artwork and permanently bind your champion.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Hero Username (Public Handle)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. IronVanguard"
                    className="lq-input w-full px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Character Name (In-Realm Title)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={characterName}
                    onChange={e => setCharacterName(e.target.value)}
                    placeholder="e.g. Sir Kaelen of Aetheria"
                    className="lq-input w-full px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Select Champion Avatar
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {avatarOptions.map(av => {
                    const active = selectedAvatar === av.src;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.src)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-[#7045A0]/25 border-[#D6A84B] ring-2 ring-[#D6A84B]/40 shadow-[0_0_16px_rgba(214,168,75,0.24)]'
                            : 'bg-[#100D18] border-[#362B45] hover:border-[#D6A84B]/55'
                        }`}
                      >
                        <img
                          src={resolveAssetUrl(av.src, characterWarriorAvatarImg)}
                          alt={av.label}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover border border-[#362B45]"
                        />
                        <span className="text-[10px] font-medium text-[#A69AAF] truncate max-w-full">
                          {av.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Choose Character Class
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map(c => {
                    const isSelected = characterClass === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCharacterClass(c.id);
                          setSelectedAvatar(getRpgAvatarForClass(c.id));
                        }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#7045A0]/25 border-[#D6A84B] shadow-[0_0_20px_rgba(214,168,75,0.22)] ring-1 ring-[#D6A84B]'
                            : 'bg-[#100D18] border-[#362B45] hover:border-[#D6A84B]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <c.Icon className="w-5 h-5 text-[#E8C777]" />
                          <h4 className="font-['Cinzel'] font-bold text-[#F2EDF7] text-base">{c.title}</h4>
                        </div>
                        <p className="text-xs text-[#A69AAF] mb-1.5">{c.desc}</p>
                        <p className="text-[11px] text-[#E8C777] font-medium">{c.perk}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FITNESS PROFILE */}
          {currentStep === 2 && (
            <div className="lq-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-['Cinzel'] text-[#F2EDF7] mb-1">
                  STEP 2: FITNESS PROFILE
                </h2>
                <p className="text-sm text-[#A69AAF]">
                  Personalize your movement pacing and activity focus. Height and weight are strictly optional and never scored.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Age (Years) <span className="text-[#766D82] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={ageYearsInput}
                    onChange={e => setAgeYearsInput(e.target.value)}
                    placeholder="e.g. 22"
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Age Group <span className="text-[#766D82] font-normal">(Optional)</span>
                  </label>
                  <select
                    value={ageGroup}
                    onChange={e => setAgeGroup(e.target.value as AgeGroup | '')}
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Reference Sex <span className="text-[#766D82] font-normal">(Optional)</span>
                  </label>
                  <select
                    value={biologicalSex}
                    onChange={e => setBiologicalSex(e.target.value as BiologicalSex | '')}
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
                  >
                    <option value="">Prefer not to specify</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Measurement Units
                  </label>
                  <div className="flex p-1 bg-[#100D18] rounded-xl border border-[#362B45]">
                    <button
                      type="button"
                      onClick={() => setPreferredUnits('metric')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        preferredUnits === 'metric' ? 'bg-[#7045A0] text-[#F2EDF7]' : 'text-[#A69AAF]'
                      }`}
                    >
                      Metric
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredUnits('imperial')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        preferredUnits === 'imperial' ? 'bg-[#7045A0] text-[#F2EDF7]' : 'text-[#A69AAF]'
                      }`}
                    >
                      Imperial
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Height <span className="text-[#766D82] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder={preferredUnits === 'metric' ? 'e.g. 175 cm' : 'e.g. 5 ft 9 in'}
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Weight <span className="text-[#766D82] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder={preferredUnits === 'metric' ? 'e.g. 70 kg' : 'e.g. 154 lb'}
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Current Activity Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: 'Mostly Seated' },
                    { id: 'light', label: 'Lightly Active' },
                    { id: 'moderate', label: 'Moderately Active' },
                    { id: 'very_active', label: 'Very Active' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivityLevel(item.id as ActivityLevel)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        activityLevel === item.id
                          ? 'bg-[#7045A0]/25 border-[#D6A84B] text-[#F2EDF7] shadow-[0_0_14px_rgba(214,168,75,0.2)]'
                          : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Preferred Fitness Activities
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Walking', 'Running', 'Gym', 'Home workouts', 'Cycling', 'Sports', 'Yoga', 'Swimming'].map(act => {
                    const isChecked = preferredActivities.includes(act);
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleItem(preferredActivities, setPreferredActivities, act)}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#7045A0]/25 border-[#D6A84B] text-[#F2EDF7]'
                            : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                        }`}
                      >
                        <span>{act}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[#E8C777] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Health-Focused Fitness Goals
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    'Build consistency',
                    'Improve general fitness',
                    'Increase daily mobility & energy',
                    'Build functional strength',
                    'Improve endurance & stamina',
                    'Support healthy sleep & recovery',
                  ].map(goal => {
                    const isChecked = fitnessGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleItem(fitnessGoals, setFitnessGoals, goal)}
                        className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#7045A0]/25 border-[#D6A84B] text-[#F2EDF7]'
                            : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                        }`}
                      >
                        <span>{goal}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[#E8C777] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#100D18] border border-[#362B45] text-xs text-[#A69AAF] flex items-start gap-2">
                <Heart className="w-4 h-4 text-[#E8C777] shrink-0 mt-0.5" />
                <span>
                  LifeQuest promotes sustainable daily movement and vitality at every pace — never restrictive targets or body-image scoring.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: NUTRITION PREFERENCES */}
          {currentStep === 3 && (
            <div className="lq-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-['Cinzel'] text-[#F2EDF7] mb-1">
                  STEP 3: NUTRITION PREFERENCES
                </h2>
                <p className="text-sm text-[#A69AAF]">
                  Help us tailor balanced meal ideas and highlight potential allergens safely. All fields except dietary style are optional.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'vegetarian', label: 'Vegetarian' },
                      { id: 'vegan', label: 'Vegan' },
                      { id: 'eggetarian', label: 'Eggetarian' },
                      { id: 'non_vegetarian', label: 'Non-Veg' },
                      { id: 'other', label: 'Other' },
                    ] as const
                  ).map(diet => (
                    <button
                      key={diet.id}
                      type="button"
                      onClick={() => setDietaryPreference(diet.id)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        dietaryPreference === diet.id
                          ? 'bg-[#7045A0]/25 border-[#D6A84B] text-[#F2EDF7] shadow-[0_0_14px_rgba(214,168,75,0.2)]'
                          : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                      }`}
                    >
                      {diet.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multiple Food Allergies */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Food Allergies <span className="text-[#766D82] font-normal">(Select or add multiple)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {COMMON_ALLERGIES.map(item => {
                    const selected = foodAllergiesList.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(foodAllergiesList, setFoodAllergiesList, item)}
                        className={`px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#D65C66]/20 border-[#D65C66] text-[#F2EDF7]'
                            : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                        }`}
                      >
                        {selected ? `✓ ${item}` : `+ ${item}`}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={allergyInput}
                    onChange={e => setAllergyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(allergyInput, setAllergyInput, foodAllergiesList, setFoodAllergiesList);
                      }
                    }}
                    placeholder="Add custom allergy (e.g. Mustard, Shellfish)..."
                    className="lq-input flex-1 px-3.5 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(allergyInput, setAllergyInput, foodAllergiesList, setFoodAllergiesList)}
                    className="lq-btn lq-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {foodAllergiesList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {foodAllergiesList.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D65C66]/15 border border-[#D65C66]/60 text-[#F2EDF7] text-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setFoodAllergiesList(prev => prev.filter(x => x !== tag))}
                          aria-label={`Remove allergy ${tag}`}
                          className="hover:text-[#D65C66] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Food Intolerances */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2">
                  Food Intolerances <span className="text-[#766D82] font-normal">(Optional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {COMMON_INTOLERANCES.map(item => {
                    const selected = foodIntolerances.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(foodIntolerances, setFoodIntolerances, item)}
                        className={`px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#D6A84B]/20 border-[#D6A84B] text-[#E8C777]'
                            : 'bg-[#100D18] border-[#362B45] text-[#A69AAF] hover:text-[#F2EDF7]'
                        }`}
                      >
                        {selected ? `✓ ${item}` : `+ ${item}`}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={intoleranceInput}
                    onChange={e => setIntoleranceInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(intoleranceInput, setIntoleranceInput, foodIntolerances, setFoodIntolerances);
                      }
                    }}
                    placeholder="Add intolerance (e.g. Sulfites)..."
                    className="lq-input flex-1 px-3.5 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(intoleranceInput, setIntoleranceInput, foodIntolerances, setFoodIntolerances)}
                    className="lq-btn lq-btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                  Foods to Avoid <span className="text-[#766D82] font-normal">(Optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={dislikedFoods}
                  onChange={e => setDislikedFoods(e.target.value)}
                  placeholder="e.g. Mushrooms, Olives, Eggplant"
                  className="lq-input w-full px-4 py-2.5 text-sm"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#D6A84B]/12 border border-[#D6A84B]/45 text-xs text-[#E8C777] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D6A84B] shrink-0 mt-0.5" />
                <span>
                  Allergen Safety Notice: Meal ideas in LifeQuest are general wellness suggestions and are never guaranteed allergen-free. Always verify real ingredients and food labels before eating.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: PREFERENCES */}
          {currentStep === 4 && (
            <div className="lq-card rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-['Cinzel'] text-[#F2EDF7] mb-1">
                  STEP 4: REALM PREFERENCES
                </h2>
                <p className="text-sm text-[#A69AAF]">
                  Configure your daily reset timezone, alerts, sound effects, and public leaderboard privacy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Timezone (For Daily/Weekly Resets)
                  </label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="lq-input w-full px-3.5 py-2.5 text-sm"
                  >
                    {timezoneOptions.map(tz => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-1.5">
                    Preferred Measurement Units
                  </label>
                  <div className="flex p-1 bg-[#100D18] rounded-xl border border-[#362B45]">
                    <button
                      type="button"
                      onClick={() => setPreferredUnits('metric')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        preferredUnits === 'metric' ? 'bg-[#7045A0] text-[#F2EDF7]' : 'text-[#A69AAF]'
                      }`}
                    >
                      Metric (cm / kg / km)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredUnits('imperial')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        preferredUnits === 'imperial' ? 'bg-[#7045A0] text-[#F2EDF7]' : 'text-[#A69AAF]'
                      }`}
                    >
                      Imperial (ft / lb / mi)
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#E8C777] mb-2 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Notification Preferences
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { key: 'dailyReminders', title: 'Daily Habit Reminders', desc: 'Gentle nudges for active daily routines' },
                      { key: 'weeklySummary', title: 'Weekly Progress Digest', desc: 'Recap of workouts, streaks, and XP' },
                      { key: 'guildUpdates', title: 'Guild & Friend Alerts', desc: 'Companion requests and guild raid progress' },
                      { key: 'questAlerts', title: 'Quest & Boss Milestones', desc: 'Notifications when rewards are ready to claim' },
                    ] as const
                  ).map(item => (
                    <label
                      key={item.key}
                      className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-3 cursor-pointer hover:border-[#D6A84B]/50 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-semibold text-[#F2EDF7] block">{item.title}</span>
                        <span className="text-[11px] text-[#A69AAF]">{item.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationPrefs[item.key]}
                        onChange={e =>
                          setNotificationPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="w-4 h-4 accent-[#7045A0] cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-[#E8C777]" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-[#A69AAF]" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-[#F2EDF7] block">RPG Sound Effects</span>
                      <span className="text-[11px] text-[#A69AAF]">Combat &amp; habit chime audio</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(prev => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      soundEnabled
                        ? 'bg-[#7045A0] text-[#F2EDF7]'
                        : 'bg-[#171220] border border-[#362B45] text-[#A69AAF]'
                    }`}
                  >
                    {soundEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <label className="p-3.5 rounded-xl bg-[#100D18] border border-[#362B45] flex items-center justify-between gap-3 cursor-pointer hover:border-[#D6A84B]/50 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-[#F2EDF7] block">Public Leaderboard</span>
                    <span className="text-[11px] text-[#A69AAF]">Show hero username &amp; level on rankings</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={leaderboardVisible}
                    onChange={e => setLeaderboardVisible(e.target.checked)}
                    className="w-4 h-4 accent-[#7045A0] cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMATION */}
          {currentStep === 5 && (
            <div className="lq-card-gold rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <div className="inline-block p-1 rounded-2xl bg-gradient-to-r from-[#7045A0] to-[#D6A84B] mb-3 shadow-[0_0_24px_rgba(214,168,75,0.3)]">
                  <img
                    src={resolveAssetUrl(selectedAvatar, characterWarriorAvatarImg)}
                    alt={characterName}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                </div>
                <h2 className="text-2xl font-black font-['Cinzel'] text-[#F2EDF7]">
                  CONFIRM YOUR CHAMPION PROFILE
                </h2>
                <p className="text-xs text-[#E8C777] mt-1">
                  Review your setup before entering the World of Aetheria. You can edit any preference later in Settings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Summary Card 1 */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['Cinzel'] font-bold text-[#E8C777] uppercase">1. Character</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[#E8C777] hover:text-[#F2EDF7] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[#A69AAF]">Username: <strong className="text-[#F2EDF7]">{username}</strong></p>
                  <p className="text-[#A69AAF]">Character: <strong className="text-[#F2EDF7]">{characterName}</strong></p>
                  <p className="text-[#A69AAF]">Class: <strong className="text-[#E8C777]">{characterClass}</strong></p>
                </div>

                {/* Summary Card 2 */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['Cinzel'] font-bold text-[#E8C777] uppercase">2. Fitness</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-[#E8C777] hover:text-[#F2EDF7] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[#A69AAF]">Activity: <strong className="text-[#F2EDF7] capitalize">{activityLevel.replace('_', ' ')}</strong></p>
                  <p className="text-[#A69AAF]">
                    Activities: <strong className="text-[#F2EDF7]">{preferredActivities.length > 0 ? preferredActivities.join(', ') : 'None selected'}</strong>
                  </p>
                  <p className="text-[#A69AAF]">
                    Goals: <strong className="text-[#F2EDF7]">{fitnessGoals.length > 0 ? fitnessGoals.join(', ') : 'General wellness'}</strong>
                  </p>
                  {(height || weight) && (
                    <p className="text-[#766D82]">
                      Optional Metrics: {height || '—'} · {weight || '—'}
                    </p>
                  )}
                </div>

                {/* Summary Card 3 */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['Cinzel'] font-bold text-[#E8C777] uppercase">3. Nutrition</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-[#E8C777] hover:text-[#F2EDF7] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[#A69AAF]">Diet: <strong className="text-[#F2EDF7]">{dietaryLabelMap[dietaryPreference]}</strong></p>
                  <p className="text-[#A69AAF]">
                    Allergies: <strong className="text-[#D65C66]">{foodAllergiesList.length > 0 ? foodAllergiesList.join(', ') : 'None listed'}</strong>
                  </p>
                  <p className="text-[#A69AAF]">
                    Intolerances: <strong className="text-[#E8C777]">{foodIntolerances.length > 0 ? foodIntolerances.join(', ') : 'None listed'}</strong>
                  </p>
                  {dislikedFoods && (
                    <p className="text-[#766D82]">Avoid: {dislikedFoods}</p>
                  )}
                </div>

                {/* Summary Card 4 */}
                <div className="p-4 rounded-xl bg-[#100D18] border border-[#362B45] space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-['Cinzel'] font-bold text-[#E8C777] uppercase">4. Preferences</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-[#E8C777] hover:text-[#F2EDF7] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[#A69AAF]">Units: <strong className="text-[#F2EDF7] uppercase">{preferredUnits}</strong> · Sound: <strong className="text-[#F2EDF7]">{soundEnabled ? 'On' : 'Muted'}</strong></p>
                  <p className="text-[#A69AAF]">Timezone: <strong className="text-[#F2EDF7]">{timezone}</strong></p>
                  <p className="text-[#A69AAF]">Leaderboard: <strong className="text-[#F2EDF7]">{leaderboardVisible ? 'Visible' : 'Hidden'}</strong></p>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleFinish}
                  className="lq-btn lq-btn-gold w-full sm:w-auto px-10 py-3.5 font-black font-['Cinzel'] tracking-widest text-sm rounded-xl disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      FORGING YOUR PROFILE...
                    </>
                  ) : (
                    'COMPLETE SETUP & ENTER AETHERIA'
                  )}
                </button>
              </div>
            </div>
          )}
        </RpgSubTabTransition>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setCurrentStep(prev => prev - 1);
              }}
              className="lq-btn lq-btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#E8C777]" />
              Previous Step
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 && (
            <button
              type="button"
              onClick={handleNext}
              className="lq-btn lq-btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
