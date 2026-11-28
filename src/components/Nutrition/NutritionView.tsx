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
import { FeatureBanner } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  AnimatedProgressBar,
  RpgScrollReveal,
  RpgStaggerGrid,
  RpgStaggerItem,
} from '../Motion/RpgMotionPrimitives';
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
      barClass: 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]',
    },
    {
      id: 'protein' as const,
      label: 'Protein',
      loggedMid: dailySummary.proteinMid,
      loggedRange: `${dailySummary.proteinMin}–${dailySummary.proteinMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'protein')?.targetMid || 55,
      targetText: `${dailyPlan.nutrients.find(n => n.id === 'protein')?.recommendedRange || '45–60'} g`,
      barClass: 'bg-gradient-to-r from-[#1677FF] to-[#38D9F5]',
    },
    {
      id: 'carbs' as const,
      label: 'Carbohydrates',
      loggedMid: dailySummary.carbsMid,
      loggedRange: `${dailySummary.carbsMin}–${dailySummary.carbsMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'carbs')?.targetMid || 240,
      targetText: dailyPlan.nutrients.find(n => n.id === 'carbs')?.recommendedRange || '45–60% energy',
      barClass: 'bg-gradient-to-r from-[#1677FF] to-[#00D9FF]',
    },
    {
      id: 'fats' as const,
      label: 'Dietary Fats',
      loggedMid: dailySummary.fatMid,
      loggedRange: `${dailySummary.fatMin}–${dailySummary.fatMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'fats')?.targetMid || 60,
      targetText: dailyPlan.nutrients.find(n => n.id === 'fats')?.recommendedRange || '20–30% energy',
      barClass: 'bg-gradient-to-r from-[#059669] to-[#10B981]',
    },
    {
      id: 'fibre' as const,
      label: 'Dietary Fibre',
      loggedMid: dailySummary.fibreMid,
      loggedRange: `${dailySummary.fibreMin}–${dailySummary.fibreMax} g`,
      targetMid: dailyPlan.nutrients.find(n => n.id === 'fibre')?.targetMid || 25,
      targetText: `${dailyPlan.nutrients.find(n => n.id === 'fibre')?.recommendedRange || '25–35'} g`,
      barClass: 'bg-gradient-to-r from-[#10B981] to-[#38D9F5]',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <FeatureBanner themeId="fitness" data-tutorial-id="nutrition-tracker">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A8C7]">
              <span className="font-['Cinzel'] font-semibold text-[#10B981] uppercase tracking-widest">
                Ocean of Balance
              </span>
              <span aria-hidden="true">·</span>
              <span>WHO &amp; ICMR–NIN 2024 Educational Nutrition</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Cinzel'] text-[#F2F7FF]">
              Personalized Daily Nutrition
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl leading-relaxed">
              Explore educational daily nourishment ranges tailored to your profile, track meal
              variety and hydration without guilt or restriction, or snap a meal photo in Aether Vision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('aether-vision')}
              className="lq-btn lq-btn-gold px-4 py-2.5 text-xs whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              <span>Analyze Meal Photo</span>
            </button>
          </div>
        </div>
      </FeatureBanner>

      {/* Inline Missing Profile Fields Prompt */}
      {dailyPlan.missingFields.length > 0 && (
        <RpgScrollReveal>
          <form
            onSubmit={handleSaveMissingProfileFields}
            className="lq-card-gold p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#38D9F5] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF]">
                  Refine Your Daily Nutrition Reference
                </h2>
                <p className="text-xs text-[#94A8C7] mt-0.5 leading-relaxed">
                  Add only the missing profile details below so we can provide appropriate WHO /
                  ICMR–NIN 2024 age-group or adult educational guidance. Already saved details are
                  preserved automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {dailyPlan.missingFields.includes('age') && (
                <>
                  <div>
                    <label className="block text-[#10B981] font-semibold mb-1.5">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={110}
                      value={inlineAgeYears}
                      onChange={e => setInlineAgeYears(e.target.value)}
                      placeholder="e.g. 24"
                      className="lq-input font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[#10B981] font-semibold mb-1.5">
                      Or Age Group
                    </label>
                    <select
                      value={inlineAgeGroup}
                      onChange={e => setInlineAgeGroup(e.target.value as AgeGroup | '')}
                      className="lq-input"
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
                  <label className="block text-[#10B981] font-semibold mb-1.5">
                    Reference Physiology (Adult Calc)
                  </label>
                  <select
                    value={inlineSex}
                    onChange={e => setInlineSex(e.target.value as BiologicalSex | '')}
                    className="lq-input"
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
                  <label className="block text-[#10B981] font-semibold mb-1.5">
                    Height ({user?.preferredUnits === 'imperial' ? 'ft/in' : 'cm'})
                  </label>
                  <input
                    type="text"
                    value={inlineHeight}
                    onChange={e => setInlineHeight(e.target.value)}
                    placeholder={user?.preferredUnits === 'imperial' ? 'e.g. 5 ft 8 in' : 'e.g. 170 cm'}
                    className="lq-input"
                  />
                </div>
              )}

              {dailyPlan.missingFields.includes('weight') && (
                <div>
                  <label className="block text-[#10B981] font-semibold mb-1.5">
                    Weight ({user?.preferredUnits === 'imperial' ? 'lb' : 'kg'})
                  </label>
                  <input
                    type="text"
                    value={inlineWeight}
                    onChange={e => setInlineWeight(e.target.value)}
                    placeholder={user?.preferredUnits === 'imperial' ? 'e.g. 150 lb' : 'e.g. 68 kg'}
                    className="lq-input"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {profileSaveMsg ? (
                <span className="text-xs text-[#10B981]">{profileSaveMsg}</span>
              ) : (
                <span className="text-[11px] text-[#94A8C7]">
                  Optional for privacy: if omitted, safe general reference ranges are shown.
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="lq-btn lq-btn-primary px-4 py-2 text-xs disabled:opacity-60"
              >
                {isSavingProfile ? 'Saving...' : 'Save Nutrition Details'}
              </button>
            </div>
          </form>
        </RpgScrollReveal>
      )}

      {/* Today's Nourishment Summary + Food Groups + Meal-by-Meal Breakdown */}
      <RpgScrollReveal>
        <div className="lq-card p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#10B981]" />
                <span>Today&apos;s Nourishment &amp; Progress Overview</span>
              </h2>
              <p className="text-xs text-[#38D9F5] mt-0.5">{dailyPlan.profileSummaryText}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#94A8C7]">
              <Heart className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>Calm educational tracking — no shame, no restrictive scoring.</span>
            </div>
          </div>

          {dailyPlan.isMinor && (
            <div className="p-3.5 rounded-xl bg-[#061225] border border-[#10B981]/40 text-xs text-[#F2F7FF] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#10B981]">Youth Growth-Safe Guidance Active</p>
                <p className="mt-0.5 leading-relaxed text-[#94A8C7]">
                  {dailyPlan.clinicalGuidanceNote}
                </p>
              </div>
            </div>
          )}

          {/* Macro & Energy Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {quantitativeProgressRows.map(row => {
              const pct =
                row.targetMid && row.targetMid > 0
                  ? Math.min(100, Math.round((row.loggedMid / row.targetMid) * 100))
                  : 0;
              return (
                <div
                  key={row.id}
                  className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs gap-1">
                    <span className="font-semibold text-[#F2F7FF] truncate">{row.label}</span>
                    <span className="font-mono text-[11px] text-[#10B981] tabular-nums shrink-0">
                      {dailySummary.hasAnyEstimatedMacros ? row.loggedRange : '0 logged'}
                    </span>
                  </div>
                  <AnimatedProgressBar
                    percentage={dailySummary.hasAnyEstimatedMacros ? Math.max(4, pct) : 0}
                    className="w-full h-2 rounded-full bg-[#0A1930] border border-[#1E3A63] overflow-hidden"
                    barClassName={row.barClass}
                    shimmer={false}
                  />
                  <p className="text-[11px] text-[#94A8C7] tabular-nums">
                    Reference: {row.targetText}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Food Groups & Today's Meals Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                Food Groups Represented Today ({dailySummary.foodGroupsToday.length})
              </h3>
              {dailySummary.foodGroupsToday.length === 0 ? (
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  Log a meal or analyze a meal photo to see your daily food-group variety (whole
                  grains, pulses/protein, produce, healthy fats).
                </p>
              ) : (
                <p className="text-xs text-[#F2F7FF] leading-relaxed">
                  {dailySummary.foodGroupsToday.join(' · ')}
                </p>
              )}
              <p className="text-[11px] text-[#94A8C7] pt-1 leading-relaxed">
                {dailySummary.imageEstimatedMealsCount > 0
                  ? `${dailySummary.imageEstimatedMealsCount} meal(s) today use visual image-based estimates (approximate ranges).`
                  : 'Tip: Use Aether Vision meal photo analysis for approximate macro, fibre, and micronutrient breakdowns.'}
              </p>
            </div>

            <div className="lg:col-span-7 p-4 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#38D9F5]">
                  Today&apos;s Meal-by-Meal Breakdown ({dailySummary.mealsToday.length})
                </h3>
                <span className="text-[11px] text-[#94A8C7] font-mono tabular-nums">
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
                      className="p-2.5 rounded-lg bg-[#0A1930] border border-[#1E3A63] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#F2F7FF]">{m.title}</span>
                          <span aria-hidden="true" className="text-[#647A9E]">·</span>
                          <span className="text-[11px] capitalize text-[#10B981]">
                            {m.mealType}
                          </span>
                          {m.nutritionEstimate?.isImageEstimate && (
                            <>
                              <span aria-hidden="true" className="text-[#647A9E]">·</span>
                              <span className="text-[11px] text-[#38D9F5]">
                                Image-based estimate
                              </span>
                            </>
                          )}
                        </div>
                        {m.foodItems?.length > 0 && (
                          <p className="text-[11px] text-[#94A8C7] truncate max-w-md mt-0.5">
                            {m.foodItems.join(', ')}
                          </p>
                        )}
                      </div>
                      {m.nutritionEstimate && (
                        <span className="text-[11px] font-mono text-[#38D9F5] tabular-nums shrink-0">
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
      </RpgScrollReveal>

      {/* Educational Daily Reference Matrix */}
      <RpgScrollReveal>
        <div className="lq-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#10B981]" />
                <span>Daily Nutrient Educational References ({dailyPlan.ageGroupLabel})</span>
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
                className="p-4 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-1.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#F2F7FF] text-sm">{item.label}</h3>
                    <span className="text-[11px] text-[#94A8C7]">{item.sourceAndAgeGroup}</span>
                  </div>
                  <span
                    className={`text-[11px] font-medium shrink-0 ${
                      item.estimateKind === 'individualized_estimate'
                        ? 'text-[#10B981]'
                        : 'text-[#94A8C7]'
                    }`}
                  >
                    {item.estimateKind === 'individualized_estimate'
                      ? 'Individualized'
                      : 'General Reference'}
                  </span>
                </div>

                <p className="font-mono font-bold text-[#38D9F5] text-sm tabular-nums">
                  {item.recommendedRange}{' '}
                  <span className="text-xs font-sans font-normal text-[#94A8C7]">
                    {item.unit}
                  </span>
                </p>

                <p className="text-[#94A8C7] leading-relaxed">{item.whyItMatters}</p>
                <p className="text-[11px] text-[#647A9E] leading-relaxed pt-0.5">
                  Limitation: {item.confidenceAndLimitations}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#94A8C7] pt-1 leading-relaxed">
            {dailyPlan.clinicalGuidanceNote}
          </p>
        </div>
      </RpgScrollReveal>

      {/* Hydration Sanctuary */}
      <RpgScrollReveal>
        <div className="lq-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
                <Droplets className="w-5 h-5 text-[#10B981]" />
                <span>Daily Hydration Elixir</span>
              </h3>
              <p className="text-xs text-[#94A8C7] mt-0.5">
                Target 8 glasses of pure water daily to prime Nature’s Blessing (+10% quest XP).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-2xl font-bold text-[#38D9F5] tabular-nums mr-1">
                <AnimatedCounter value={waterGlasses} /> / 8{' '}
                <span className="text-xs text-[#94A8C7] font-normal">Glasses</span>
              </span>
              <button
                type="button"
                onClick={addWaterGlass}
                className="lq-btn lq-btn-primary px-4 py-2 text-xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Drink Glass</span>
              </button>
              <button
                type="button"
                onClick={resetWaterGlasses}
                className="lq-btn lq-btn-secondary p-2"
                title="Reset Daily Hydration"
                aria-label="Reset Daily Hydration"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const filled = i < waterGlasses;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    filled
                      ? 'bg-[#10B981]/12 border-[#10B981]/50 text-[#10B981]'
                      : 'bg-[#061225] border-[#1E3A63] text-[#647A9E]'
                  }`}
                >
                  <Droplets
                    className={`w-5 h-5 mx-auto mb-1 ${
                      filled ? 'text-[#10B981]' : 'text-[#647A9E]/50'
                    }`}
                  />
                  <span className="text-[10px] font-mono font-semibold block tabular-nums">
                    Glass {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </RpgScrollReveal>

      {/* Balanced Meal Ideas & Custom Meal Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#38D9F5]" />
              <span>Balanced Meal Suggestions</span>
            </h3>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-[#94A8C7] capitalize">
                Diet: {(user?.dietaryPreference || 'vegetarian').replace('_', '-')}
              </span>
              <div className="flex p-0.5 rounded-lg bg-[#061225] border border-[#1E3A63]">
                <button
                  type="button"
                  onClick={() => setDietFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dietFilter === 'all'
                      ? 'bg-[#1677FF] text-[#F2F7FF] font-semibold'
                      : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDietFilter('matching')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    dietFilter === 'matching'
                      ? 'bg-[#1677FF] text-[#F2F7FF] font-semibold'
                      : 'text-[#94A8C7] hover:text-[#F2F7FF]'
                  }`}
                >
                  Fits My Diet
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#061225] border border-[#F59E0B]/40 text-xs text-[#F2F7FF] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#94A8C7] leading-relaxed">
                Meal ideas are informational and are never guaranteed allergen-free. Always check
                ingredients carefully.
              </span>
              {(userAllergies.length > 0 || userIntolerances.length > 0) && (
                <span className="block mt-1 text-[#FBBF24] font-medium">
                  Active Profile Watchlist: {[...userAllergies, ...userIntolerances].join(', ')}
                </span>
              )}
            </div>
          </div>

          <RpgStaggerGrid className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleMeals.map((meal, idx) => {
              const flags = getMealFlags(meal);
              return (
                <RpgStaggerItem key={idx}>
                  <div
                    className={`lq-card p-4 h-full flex flex-col justify-between transition-colors ${
                      flags.length > 0
                        ? 'border-[#F59E0B]/55'
                        : 'hover:border-[#10B981]/45'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-[#10B981] uppercase tracking-wider">
                          {meal.cuisine}
                        </span>
                        <span className="text-[#94A8C7] capitalize">{meal.category}</span>
                      </div>
                      <h4 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] mb-2">
                        {meal.title}
                      </h4>
                      {flags.length > 0 && (
                        <p className="mb-2 text-[11px] text-[#FBBF24] font-medium">
                          {flags.join(' · ')}
                        </p>
                      )}
                      <ul className="text-xs text-[#94A8C7] space-y-1 mb-3">
                        {meal.items.map((it, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-[#10B981]" aria-hidden="true">·</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-[#38D9F5]/90 italic leading-relaxed mb-3">
                        {meal.notes}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogPreset(meal)}
                      disabled={isLoggingMeal}
                      className="lq-btn lq-btn-secondary w-full py-2 text-xs disabled:opacity-60"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Log Meal (+25 XP · +20 Gold)</span>
                    </button>
                  </div>
                </RpgStaggerItem>
              );
            })}
          </RpgStaggerGrid>
        </div>

        {/* Right 5 Cols: Custom Meal Logger */}
        <div className="lg:col-span-5">
          <div className="lq-card p-6 space-y-4">
            <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF] flex items-center gap-2">
              <Apple className="w-4 h-4 text-[#10B981]" />
              <span>Log a Meal</span>
            </h3>

            {logStatusMessage && (
              <div className="p-3 rounded-xl bg-[#061225] border border-[#10B981]/45 text-xs text-[#10B981] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{logStatusMessage}</span>
              </div>
            )}

            <form onSubmit={handleCustomLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
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
                          ? 'bg-[#1677FF] border-[#00D9FF]/70 text-[#F2F7FF] font-semibold'
                          : 'bg-[#061225] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
                  Meal Name / Dish
                </label>
                <input
                  type="text"
                  value={mealTitle}
                  onChange={e => setMealTitle(e.target.value)}
                  placeholder="e.g. Dal Tadka, 2 Whole-Wheat Rotis, Cucumber Raita"
                  className="lq-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
                  Food Components (Comma-separated)
                </label>
                <input
                  type="text"
                  value={foodItemsText}
                  onChange={e => setFoodItemsText(e.target.value)}
                  placeholder="e.g. Lentils, Whole wheat, Curd, Cucumber"
                  className="lq-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
                  Dietary Category
                </label>
                <select
                  value={dietaryCategory}
                  onChange={e => setDietaryCategory(e.target.value as DietaryPreference)}
                  className="lq-input"
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
                className="lq-btn lq-btn-gold w-full py-3 text-xs disabled:opacity-60"
              >
                {isLoggingMeal ? 'Saving Meal...' : 'Record Meal (+25 XP · +20 Gold)'}
              </button>
            </form>

            <div className="pt-4 border-t border-[#1E3A63]">
              <h4 className="text-xs font-bold text-[#94A8C7] uppercase tracking-wider mb-2.5">
                Recent Fuel History ({meals.length})
              </h4>
              {meals.length === 0 ? (
                <p className="text-xs text-[#647A9E]">No meals logged yet.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {meals.map(m => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs"
                    >
                      <div className="flex justify-between font-semibold text-[#F2F7FF] gap-2">
                        <span className="truncate">{m.title}</span>
                        <span className="text-[11px] capitalize text-[#10B981] shrink-0">
                          {m.mealType}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A8C7] mt-0.5 line-clamp-2">
                        {m.balancedNotes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
