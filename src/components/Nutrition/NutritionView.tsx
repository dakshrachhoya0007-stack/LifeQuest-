import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  AgeGroup,
  BiologicalSex,
  DietaryPreference,
  MealType,
} from '../../types/game';
import { BALANCED_MEAL_IDEAS } from '../../data/initialData';
import {
  computeDailyNutritionPlan,
  summarizeDailyNutrition,
} from '../../utils/nutritionGuidance';
import { createIdempotencyKey } from '../../services/unifiedBackendService';
import {
  Apple,
  Droplets,
  Plus,
  Sparkles,
  CheckCircle2,
  Heart,
  AlertTriangle,
  RotateCcw,
  Camera,
  Info,
  Shield,
  BookOpen,
  Utensils,
} from 'lucide-react';

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  dairy: ['paneer', 'curd', 'dahi', 'feta', 'milk', 'cheese', 'butter', 'ghee', 'yogurt'],
  lactose: ['paneer', 'curd', 'dahi', 'feta', 'milk', 'cheese', 'yogurt'],
  peanuts: ['peanut', 'peanuts', 'groundnut'],
  'tree nuts': ['walnut', 'walnuts', 'almond', 'almonds', 'cashew', 'cashews', 'pistachio', 'nut'],
  gluten: ['roti', 'rotis', 'wheat', 'dosa', 'barley', 'rye'],
  'gluten sensitivity': ['roti', 'rotis', 'wheat'],
  soy: ['soy', 'tofu', 'soya'],
  eggs: ['egg', 'eggs'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish'],
  sesame: ['sesame', 'tahini', 'hummus'],
};

const ageGroupFromYears = (years: number): AgeGroup => {
  if (years <= 9) return 'child';
  if (years <= 13) return 'early_teen';
  if (years <= 17) return 'older_teen';
  if (years >= 60) return 'older_adult';
  return 'adult';
};

export const NutritionView: React.FC = () => {
  const {
    meals,
    logMeal,
    waterGlasses,
    addWaterGlass,
    resetWaterGlasses,
    user,
    updateUser,
    setActiveTab,
  } = useGame();

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealTitle, setMealTitle] = useState('');
  const [foodItemsText, setFoodItemsText] = useState('');
  const [balancedNotes, setBalancedNotes] = useState('');
  const [dietaryCategory, setDietaryCategory] = useState<DietaryPreference>(
    user?.dietaryPreference || 'vegetarian'
  );
  const [dietFilter, setDietFilter] = useState<'all' | 'matching'>('all');
  const [logStatusMessage, setLogStatusMessage] = useState<string | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);

  // Inline completion state for ONLY missing nutrition profile fields
  const [inlineAgeYears, setInlineAgeYears] = useState<string>(
    user?.ageYears ? String(user.ageYears) : ''
  );
  const [inlineAgeGroup, setInlineAgeGroup] = useState<AgeGroup | ''>(
    user?.ageGroup || ''
  );
  const [inlineSex, setInlineSex] = useState<BiologicalSex | ''>(
    user?.biologicalSex || ''
  );
  const [inlineHeight, setInlineHeight] = useState<string>(user?.height || '');
  const [inlineWeight, setInlineWeight] = useState<string>(user?.weight || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);

  const dailyPlan = React.useMemo(() => computeDailyNutritionPlan(user), [user]);
  const dailySummary = React.useMemo(
    () => summarizeDailyNutrition(meals, user?.timezone),
    [meals, user?.timezone]
  );

  const userAllergies = React.useMemo(() => {
    if (user?.foodAllergiesList && user.foodAllergiesList.length > 0) return user.foodAllergiesList;
    if (user?.foodAllergies) {
      return user.foodAllergies.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [user?.foodAllergiesList, user?.foodAllergies]);

  const userIntolerances = user?.foodIntolerances || [];
  const dislikedTerms = React.useMemo(
    () => (user?.dislikedFoods || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    [user?.dislikedFoods]
  );

  const checkMealMatchesProfile = (meal: (typeof BALANCED_MEAL_IDEAS)[0]) => {
    const pref = user?.dietaryPreference;
    if (!pref || pref === 'non_vegetarian' || pref === 'other') return true;
    if (pref === 'vegan') return meal.category === 'vegan';
    if (pref === 'vegetarian' || pref === 'eggetarian') {
      return meal.category === 'vegetarian' || meal.category === 'vegan';
    }
    return true;
  };

  const getMealFlags = (meal: (typeof BALANCED_MEAL_IDEAS)[0]): string[] => {
    const haystack = `${meal.title} ${meal.items.join(' ')}`.toLowerCase();
    const flags: string[] = [];

    const checkTerms = (label: string, kind: string) => {
      const key = label.toLowerCase();
      const terms = [key, ...(ALLERGEN_SYNONYMS[key] || [])];
      if (terms.some(t => t && haystack.includes(t))) {
        flags.push(`${kind}: ${label}`);
      }
    };

    userAllergies.forEach(a => checkTerms(a, 'Allergy watch'));
    userIntolerances.forEach(i => checkTerms(i, 'Intolerance'));
    dislikedTerms.forEach(d => {
      if (d && haystack.includes(d)) flags.push(`Avoid: ${d}`);
    });
    return flags;
  };

  const visibleMeals =
    dietFilter === 'matching'
      ? BALANCED_MEAL_IDEAS.filter(checkMealMatchesProfile)
      : BALANCED_MEAL_IDEAS;

  const handleSaveMissingProfileFields = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveMsg(null);

    const parsedAge = inlineAgeYears.trim() ? Number(inlineAgeYears.trim()) : undefined;
    const validAge =
      parsedAge && !Number.isNaN(parsedAge) && parsedAge >= 5 && parsedAge <= 120
        ? Math.round(parsedAge)
        : undefined;
    const resolvedGroup = validAge
      ? ageGroupFromYears(validAge)
      : inlineAgeGroup || user?.ageGroup;

    const res = await updateUser({
      ...(validAge ? { ageYears: validAge } : {}),
      ...(resolvedGroup ? { ageGroup: resolvedGroup } : {}),
      ...(inlineSex ? { biologicalSex: inlineSex } : {}),
      ...(inlineHeight.trim() ? { height: inlineHeight.trim() } : {}),
      ...(inlineWeight.trim() ? { weight: inlineWeight.trim() } : {}),
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileSaveMsg('Profile details saved — daily nutrition guidance updated!');
      setTimeout(() => setProfileSaveMsg(null), 3000);
    } else {
      setProfileSaveMsg(res.error || 'Could not update profile details.');
    }
  };

  const handleCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealTitle.trim() || isLoggingMeal) return;

    setIsLoggingMeal(true);
    setLogStatusMessage(null);
    const res = await logMeal({
      mealType,
      title: mealTitle.trim(),
      foodItems: foodItemsText.split(',').map(s => s.trim()).filter(Boolean),
      dietaryCategory,
      balancedNotes: balancedNotes || 'Wholesome nourishing meal fuel for Aetheria.',
      idempotencyKey: createIdempotencyKey(),
    });
    setIsLoggingMeal(false);

    if (!res.success) {
      setLogStatusMessage(res.error || 'Unable to log meal right now.');
      return;
    }

    setMealTitle('');
    setFoodItemsText('');
    setBalancedNotes('');
    setLogStatusMessage(
      res.dailyCapReached
        ? 'Meal saved cleanly (daily XP reward cap of 5 meals reached today).'
        : `Meal logged! +${res.rewards?.playerXp ?? 0} Player XP, +${res.rewards?.gold ?? 0} Gold.`
    );
  };

  const handleLogPreset = async (preset: (typeof BALANCED_MEAL_IDEAS)[0]) => {
    if (isLoggingMeal) return;
    setIsLoggingMeal(true);
    setLogStatusMessage(null);
    const res = await logMeal({
      mealType,
      title: preset.title,
      foodItems: preset.items,
      dietaryCategory: preset.category,
      balancedNotes: preset.notes,
      idempotencyKey: createIdempotencyKey(),
    });
    setIsLoggingMeal(false);
    if (res.success) {
      setLogStatusMessage(
        res.dailyCapReached
          ? `${preset.title} logged cleanly (daily meal XP cap reached today).`
          : `${preset.title} logged! +${res.rewards?.playerXp ?? 0} Player XP & +${res.rewards?.gold ?? 0} Gold.`
      );
    } else {
      setLogStatusMessage(res.error || 'Unable to log preset meal.');
    }
  };

  const quantitativeProgressRows = [
    {
      id: 'energy' as const,
      label: 'Energy (kcal)',
      loggedMid: dailySummary.energyMid,
      loggedRange: `${dailySummary.energyMin}–${dailySummary.energyMax} kcal`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'energy')?.targetMid,
      targetText: dailyPlan.nutrients.find(n => n.id === 'energy')?.recommendedRange || '',
      barColor: 'bg-[#FFAA45]',
    },
    {
      id: 'protein' as const,
      label: 'Protein',
      loggedMid: dailySummary.proteinMid,
      loggedRange: `${dailySummary.proteinMin}–${dailySummary.proteinMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'protein')?.targetMid || 55,
      targetText: `${dailyPlan.nutrients.find(n => n.id === 'protein')?.recommendedRange || '45–60'} g`,
      barColor: 'bg-[#38D9F5]',
    },
    {
      id: 'carbs' as const,
      label: 'Carbohydrates',
      loggedMid: dailySummary.carbsMid,
      loggedRange: `${dailySummary.carbsMin}–${dailySummary.carbsMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'carbs')?.targetMid || 240,
      targetText: dailyPlan.nutrients.find(n => n.id === 'carbs')?.recommendedRange || '45–60% energy',
      barColor: 'bg-[#65A9FF]',
    },
    {
      id: 'fats' as const,
      label: 'Dietary Fats',
      loggedMid: dailySummary.fatMid,
      loggedRange: `${dailySummary.fatMin}–${dailySummary.fatMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'fats')?.targetMid || 60,
      targetText: dailyPlan.nutrients.find(n => n.id === 'fats')?.recommendedRange || '20–30% energy',
      barColor: 'bg-[#35D69A]',
    },
    {
      id: 'fibre' as const,
      label: 'Dietary Fibre',
      loggedMid: dailySummary.fibreMid,
      loggedRange: `${dailySummary.fibreMin}–${dailySummary.fibreMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'fibre')?.targetMid || 25,
      targetText: `${dailyPlan.nutrients.find(n => n.id === 'fibre')?.recommendedRange || '25–35'} g`,
      barColor: 'bg-[#00D9FF]',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Banner */}
      <div
        data-tutorial-id="nutrition-tracker"
        className="rounded-2xl bg-gradient-to-r from-[#0A1930] via-[#102440] to-[#0A1930] border border-[#35D69A]/35 p-6 shadow-[0_12px_32px_rgba(4,12,28,0.65)] backdrop-blur-md"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-[#35D69A] bg-[#061225]/80 border border-[#35D69A]/40 px-2.5 py-0.5 rounded">
                Ocean of Balance
              </span>
              <span className="text-xs text-[#94A8C7] font-semibold">
                WHO & ICMR–NIN 2024 Educational Nutrition
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-[#F2F7FF]">
              PERSONALIZED DAILY NUTRITION
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl mt-1">
              Explore educational daily nourishment ranges tailored to your profile, track meal variety and hydration without guilt or restriction, or snap a meal photo in Aether Vision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('aether-vision')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#35D69A] to-[#38D9F5] hover:brightness-110 text-[#061225] font-['Cinzel'] font-bold text-xs tracking-wider shadow-[0_0_18px_rgba(53,214,154,0.35)] flex items-center gap-2 transition-all"
            >
              <Camera className="w-4 h-4" />
              ANALYZE MEAL PHOTO (AI VISION)
            </button>
          </div>
        </div>
      </div>

      {/* Inline Missing Profile Fields Prompt (Only asks fields not yet set) */}
      {dailyPlan.missingFields.length > 0 && (
        <form
          onSubmit={handleSaveMissingProfileFields}
          className="bg-[#102440]/90 backdrop-blur-md border border-[#FFAA45]/45 rounded-2xl p-5 shadow-md space-y-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#FFAA45] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                REFINE YOUR DAILY NUTRITION REFERENCE
              </h2>
              <p className="text-xs text-[#94A8C7] mt-0.5">
                Add only the missing profile details below so we can provide appropriate WHO / ICMR–NIN 2024 age-group or adult educational guidance. Already saved details are preserved automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {dailyPlan.missingFields.includes('age') && (
              <>
                <div>
                  <label className="block text-[#35D69A] font-semibold mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min={5}
                    max={110}
                    value={inlineAgeYears}
                    onChange={e => setInlineAgeYears(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-[#0A1930] border border-[#1677FF]/40 focus:border-[#35D69A] focus:outline-none rounded-xl px-3 py-2 text-[#F2F7FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#35D69A] font-semibold mb-1">Or Age Group</label>
                  <select
                    value={inlineAgeGroup}
                    onChange={e => setInlineAgeGroup(e.target.value as AgeGroup | '')}
                    className="w-full bg-[#0A1930] border border-[#1677FF]/40 focus:border-[#35D69A] focus:outline-none rounded-xl px-3 py-2 text-[#F2F7FF]"
                  >
                    <option value="">Select group</option>
                    <option value="child">Child (5–9 yrs)</option>
                    <option value="early_teen">Early Teen (10–13 yrs)</option>
                    <option value="older_teen">Older Teen (14–17 yrs)</option>
                    <option value="adult">Adult (18–59 yrs)</option>
                    <option value="older_adult">Older Adult (60+ yrs)</option>
                  </select>
                </div>
              </>
            )}

            {dailyPlan.missingFields.includes('biologicalSex') && (
              <div>
                <label className="block text-[#35D69A] font-semibold mb-1">
                  Reference Physiology (Adult Calc)
                </label>
                <select
                  value={inlineSex}
                  onChange={e => setInlineSex(e.target.value as BiologicalSex | '')}
                  className="w-full bg-[#0A1930] border border-[#1677FF]/40 focus:border-[#35D69A] focus:outline-none rounded-xl px-3 py-2 text-[#F2F7FF]"
                >
                  <option value="">Select option</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary (general range)</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            )}

            {dailyPlan.missingFields.includes('height') && (
              <div>
                <label className="block text-[#35D69A] font-semibold mb-1">
                  Height ({user?.preferredUnits === 'imperial' ? 'ft/in' : 'cm'})
                </label>
                <input
                  type="text"
                  value={inlineHeight}
                  onChange={e => setInlineHeight(e.target.value)}
                  placeholder={user?.preferredUnits === 'imperial' ? 'e.g. 5 ft 8 in' : 'e.g. 170 cm'}
                  className="w-full bg-[#0A1930] border border-[#1677FF]/40 focus:border-[#35D69A] focus:outline-none rounded-xl px-3 py-2 text-[#F2F7FF]"
                />
              </div>
            )}

            {dailyPlan.missingFields.includes('weight') && (
              <div>
                <label className="block text-[#35D69A] font-semibold mb-1">
                  Weight ({user?.preferredUnits === 'imperial' ? 'lb' : 'kg'})
                </label>
                <input
                  type="text"
                  value={inlineWeight}
                  onChange={e => setInlineWeight(e.target.value)}
                  placeholder={user?.preferredUnits === 'imperial' ? 'e.g. 150 lb' : 'e.g. 68 kg'}
                  className="w-full bg-[#0A1930] border border-[#1677FF]/40 focus:border-[#35D69A] focus:outline-none rounded-xl px-3 py-2 text-[#F2F7FF]"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {profileSaveMsg ? (
              <span className="text-xs text-[#35D69A]">{profileSaveMsg}</span>
            ) : (
              <span className="text-[11px] text-[#94A8C7]">
                Optional for privacy: if omitted, safe general reference ranges are shown.
              </span>
            )}
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#35D69A] to-[#38D9F5] hover:brightness-110 text-[#061225] font-bold text-xs disabled:opacity-60 shadow-[0_0_12px_rgba(53,214,154,0.3)]"
            >
              {isSavingProfile ? 'Saving...' : 'Save Nutrition Details'}
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* TODAY'S NOURISHMENT SUMMARY + FOOD GROUPS + MEAL-BY-MEAL BREAKDOWN    */}
      {/* ===================================================================== */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(4,12,28,0.55)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#35D69A]" />
              TODAY&apos;S NOURISHMENT & PROGRESS OVERVIEW
            </h2>
            <p className="text-xs text-[#38D9F5] mt-0.5">{dailyPlan.profileSummaryText}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#94A8C7]">
            <Heart className="w-4 h-4 text-[#35D69A] shrink-0" />
            <span>Calm educational tracking — no shame, no restrictive scoring.</span>
          </div>
        </div>

        {/* Minor Safeguard Banner */}
        {dailyPlan.isMinor && (
          <div className="p-3.5 rounded-xl bg-[#0A1930]/90 border border-[#35D69A]/50 text-xs text-[#F2F7FF] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#35D69A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#35D69A]">Youth Growth-Safe Guidance Active</p>
              <p className="mt-0.5 leading-relaxed text-[#94A8C7]">{dailyPlan.clinicalGuidanceNote}</p>
            </div>
          </div>
        )}

        {/* Calm Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {quantitativeProgressRows.map(row => {
            const pct =
              row.targetMid && row.targetMid > 0
                ? Math.min(100, Math.round((row.loggedMid / row.targetMid) * 100))
                : 0;
            return (
              <div
                key={row.id}
                className="p-3.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F2F7FF]">{row.label}</span>
                  <span className="font-mono text-[11px] text-[#35D69A]">
                    {dailySummary.hasAnyEstimatedMacros ? row.loggedRange : '0 logged'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#061225] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${row.barColor}`}
                    style={{ width: `${dailySummary.hasAnyEstimatedMacros ? Math.max(4, pct) : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#94A8C7]">
                  Reference: {row.targetText}
                </p>
              </div>
            );
          })}
        </div>

        {/* Food Groups & Today's Meals Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
          <div className="lg:col-span-5 p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#35D69A]">
              Food Groups Represented Today ({dailySummary.foodGroupsToday.length})
            </h3>
            {dailySummary.foodGroupsToday.length === 0 ? (
              <p className="text-xs text-[#94A8C7] leading-relaxed">
                Log a meal or analyze a meal photo to see your daily food-group variety (whole grains, pulses/protein, produce, healthy fats).
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dailySummary.foodGroupsToday.map(fg => (
                  <span
                    key={fg}
                    className="px-2.5 py-1 rounded-lg bg-[#061225] border border-[#35D69A]/35 text-xs text-[#35D69A]"
                  >
                    {fg}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#94A8C7] pt-1">
              {dailySummary.imageEstimatedMealsCount > 0
                ? `${dailySummary.imageEstimatedMealsCount} meal(s) today use visual image-based estimates (approximate ranges).`
                : 'Tip: Use Aether Vision meal photo analysis for approximate macro, fibre, and micronutrient breakdowns.'}
            </p>
          </div>

          <div className="lg:col-span-7 p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#38D9F5]">
                Today&apos;s Meal-by-Meal Breakdown ({dailySummary.mealsToday.length})
              </h3>
              <span className="text-[11px] text-[#94A8C7]">
                Hydration: {waterGlasses} glasses today
              </span>
            </div>
            {dailySummary.mealsToday.length === 0 ? (
              <p className="text-xs text-[#94A8C7]">No meals recorded yet today.</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {dailySummary.mealsToday.map(m => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-[#102440] border border-[#1677FF]/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#F2F7FF]">{m.title}</span>
                        <span className="text-[10px] uppercase text-[#35D69A]">{m.mealType}</span>
                        {m.nutritionEstimate?.isImageEstimate && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#061225] border border-[#FFAA45]/50 text-[#FFAA45]">
                            Image-based estimate
                          </span>
                        )}
                      </div>
                      {m.foodItems?.length > 0 && (
                        <p className="text-[11px] text-[#94A8C7] truncate max-w-md">
                          {m.foodItems.join(', ')}
                        </p>
                      )}
                    </div>
                    {m.nutritionEstimate && (
                      <span className="text-[11px] font-mono text-[#38D9F5] shrink-0">
                        ~{m.nutritionEstimate.estimatedTotals.energyKcal.min}–
                        {m.nutritionEstimate.estimatedTotals.energyKcal.max} kcal · P{' '}
                        {m.nutritionEstimate.estimatedTotals.proteinG.min}–
                        {m.nutritionEstimate.estimatedTotals.proteinG.max}g
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EDUCATIONAL DAILY REFERENCE MATRIX (WHO & ICMR-NIN 2024)              */}
      {/* ===================================================================== */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(4,12,28,0.55)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#35D69A]" />
              DAILY NUTRIENT EDUCATIONAL REFERENCES ({dailyPlan.ageGroupLabel})
            </h2>
            <p className="text-xs text-[#94A8C7] mt-0.5">
              {dailyPlan.referenceSources.join(' · ')}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[#38D9F5]">
            {dailyPlan.isAdultIndividualized
              ? 'Personalized adult estimate + public health references'
              : 'General age-group reference ranges'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dailyPlan.nutrients.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 space-y-1.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#F2F7FF] text-sm">{item.label}</h3>
                  <span className="text-[11px] text-[#94A8C7]">{item.sourceAndAgeGroup}</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                    item.estimateKind === 'individualized_estimate'
                      ? 'bg-[#35D69A]/15 border-[#35D69A]/45 text-[#35D69A]'
                      : 'bg-[#061225] border-[#1677FF]/35 text-[#94A8C7]'
                  }`}
                >
                  {item.estimateKind === 'individualized_estimate'
                    ? 'Individualized Estimate'
                    : 'General Reference'}
                </span>
              </div>

              <p className="font-mono font-bold text-[#38D9F5] text-sm">
                {item.recommendedRange}{' '}
                <span className="text-xs font-sans font-normal text-[#94A8C7]">{item.unit}</span>
              </p>

              <p className="text-[#94A8C7] leading-relaxed">{item.whyItMatters}</p>
              <p className="text-[11px] text-[#94A8C7]/80 leading-relaxed pt-0.5">
                Limitation: {item.confidenceAndLimitations}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#94A8C7] pt-1">{dailyPlan.clinicalGuidanceNote}</p>
      </div>

      {/* Hydration Sanctuary */}
      <div className="bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(4,12,28,0.55)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Droplets className="w-5 h-5 text-[#38D9F5]" />
              DAILY HYDRATION ELIXIR
            </h3>
            <p className="text-xs text-[#94A8C7]">
              Target 8 glasses of pure water daily to prime the Nature’s Blessing buff (+10% quest XP).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-[#38D9F5] tabular-nums">
              {waterGlasses} / 8 <span className="text-xs text-[#94A8C7] font-normal">Glasses</span>
            </span>
            <button
              onClick={addWaterGlass}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#35D69A] to-[#38D9F5] hover:brightness-110 text-[#061225] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(53,214,154,0.35)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Drink Glass
            </button>
            <button
              onClick={resetWaterGlasses}
              className="p-2 rounded-xl bg-[#0A1930] border border-[#1677FF]/40 text-[#94A8C7] hover:text-[#F2F7FF] hover:border-[#38D9F5]/50 transition-colors"
              title="Reset Daily Hydration"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-center transition-all ${
                i < waterGlasses
                  ? 'bg-[#38D9F5]/15 border-[#38D9F5]/60 text-[#38D9F5] shadow-[0_0_12px_rgba(56,217,245,0.18)]'
                  : 'bg-[#0A1930] border-[#1677FF]/30 text-[#94A8C7]/50'
              }`}
            >
              <Droplets
                className={`w-5 h-5 mx-auto mb-1 ${i < waterGlasses ? 'text-[#38D9F5]' : 'text-[#94A8C7]/30'}`}
              />
              <span className="text-[10px] font-mono font-semibold block">Glass {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Balanced Meal Ideas & Log Meal Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#35D69A]" />
              BALANCED MEAL SUGGESTIONS
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#38D9F5] capitalize">
                Diet: {(user?.dietaryPreference || 'vegetarian').replace('_', '-')}
              </span>
              <div className="flex p-0.5 rounded-lg bg-[#0A1930] border border-[#1677FF]/40">
                <button
                  type="button"
                  onClick={() => setDietFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    dietFilter === 'all' ? 'bg-[#35D69A] text-[#061225] font-bold' : 'text-[#94A8C7]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('matching')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    dietFilter === 'matching' ? 'bg-[#35D69A] text-[#061225] font-bold' : 'text-[#94A8C7]'
                  }`}
                >
                  Fits My Diet
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0A1930]/90 border border-[#FFAA45]/45 text-[11px] text-[#F2F7FF] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFAA45] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#94A8C7]">
                Meal ideas are informational and are never guaranteed allergen-free. Always check ingredients carefully.
              </span>
              {(userAllergies.length > 0 || userIntolerances.length > 0) && (
                <span className="block mt-1 text-[#FFAA45] font-medium">
                  Active Profile Watchlist: {[...userAllergies, ...userIntolerances].join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleMeals.map((meal, idx) => {
              const flags = getMealFlags(meal);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl bg-[#102440]/90 backdrop-blur-md border transition-all flex flex-col justify-between ${
                    flags.length > 0 ? 'border-[#FFAA45]/60' : 'border-[#1677FF]/35 hover:border-[#35D69A]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#0A1930] text-[#35D69A] border border-[#35D69A]/35">
                        {meal.cuisine}
                      </span>
                      <span className="text-[10px] text-[#94A8C7] capitalize">{meal.category}</span>
                    </div>
                    <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] mb-2">{meal.title}</h4>
                    {flags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {flags.map(f => (
                          <span
                            key={f}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#061225] border border-[#FFAA45]/55 text-[#FFAA45] font-medium"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    <ul className="text-xs text-[#94A8C7] space-y-0.5 mb-3">
                      {meal.items.map((it, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-[#35D69A] text-[10px]">·</span> {it}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-[#38D9F5] italic leading-relaxed mb-3">
                      {meal.notes}
                    </p>
                  </div>

                  <button
                    onClick={() => handleLogPreset(meal)}
                    disabled={isLoggingMeal}
                    className="w-full py-2 rounded-xl bg-[#0A1930] hover:bg-[#152E52] border border-[#35D69A]/40 hover:border-[#35D69A] text-[#F2F7FF] text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#35D69A]" />
                    Log Wholesome Meal (+25 XP · +20 Gold)
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Custom Meal Logger */}
        <div className="lg:col-span-5 bg-[#102440]/90 backdrop-blur-md border border-[#1677FF]/35 rounded-2xl p-6 shadow-[0_12px_32px_rgba(4,12,28,0.55)] space-y-4">
          <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
            <Apple className="w-4 h-4 text-[#35D69A]" />
            LOG A MEAL
          </h3>

          {logStatusMessage && (
            <div className="p-3 rounded-xl bg-[#0A1930] border border-[#35D69A]/50 text-xs text-[#35D69A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#35D69A] shrink-0" />
              <span>{logStatusMessage}</span>
            </div>
          )}

          <form onSubmit={handleCustomLog} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#35D69A] mb-1">
                Meal Category
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMealType(type)}
                    className={`py-2 text-xs font-medium rounded-lg capitalize border transition-all ${
                      mealType === type
                        ? 'bg-gradient-to-r from-[#35D69A] to-[#38D9F5] text-[#061225] font-bold border-[#35D69A]'
                        : 'bg-[#0A1930] border-[#1677FF]/30 text-[#94A8C7] hover:text-[#F2F7FF]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#35D69A] mb-1">
                Meal Name / Dish
              </label>
              <input
                type="text"
                value={mealTitle}
                onChange={e => setMealTitle(e.target.value)}
                placeholder="e.g. Dal Tadka, 2 Whole-Wheat Rotis, Cucumber Raita"
                className="w-full bg-[#0A1930] border border-[#1677FF]/40 rounded-xl px-3 py-2.5 text-xs text-[#F2F7FF] focus:outline-none focus:border-[#35D69A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#35D69A] mb-1">
                Food Components (Comma-separated)
              </label>
              <input
                type="text"
                value={foodItemsText}
                onChange={e => setFoodItemsText(e.target.value)}
                placeholder="e.g. Lentils, Whole wheat, Curd, Cucumber"
                className="w-full bg-[#0A1930] border border-[#1677FF]/40 rounded-xl px-3 py-2.5 text-xs text-[#F2F7FF] focus:outline-none focus:border-[#35D69A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#35D69A] mb-1">
                Dietary Category
              </label>
              <select
                value={dietaryCategory}
                onChange={e => setDietaryCategory(e.target.value as DietaryPreference)}
                className="w-full bg-[#0A1930] border border-[#1677FF]/40 rounded-xl px-3 py-2 text-xs text-[#F2F7FF] focus:outline-none focus:border-[#35D69A]"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoggingMeal}
              className="w-full py-3 font-bold font-['Cinzel'] tracking-wider text-xs rounded-xl bg-gradient-to-r from-[#35D69A] to-[#38D9F5] hover:brightness-110 text-[#061225] shadow-[0_0_18px_rgba(53,214,154,0.35)] transition-all disabled:opacity-60"
            >
              {isLoggingMeal ? 'SAVING MEAL...' : 'RECORD MEAL (+25 XP · +20 GOLD)'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#1677FF]/30">
            <h4 className="text-xs font-bold text-[#94A8C7] uppercase tracking-wider mb-2">
              Recent Fuel History ({meals.length})
            </h4>
            {meals.length === 0 ? (
              <p className="text-xs text-[#94A8C7]/70">No meals logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {meals.map(m => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-[#0A1930] border border-[#1677FF]/30 text-xs">
                    <div className="flex justify-between font-semibold text-[#F2F7FF] gap-2">
                      <span>{m.title}</span>
                      <span className="text-[10px] uppercase text-[#35D69A] shrink-0">{m.mealType}</span>
                    </div>
                    <p className="text-[11px] text-[#94A8C7] mt-0.5 line-clamp-2">{m.balancedNotes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
