import {
  ActivityLevel,
  AgeGroup,
  BiologicalSex,
  Meal,
  UserAccount,
} from '../types/game';

export type EstimateKind = 'individualized_estimate' | 'general_age_reference';

export interface DailyNutrientGuidanceItem {
  id:
    | 'energy'
    | 'protein'
    | 'carbs'
    | 'fats'
    | 'fibre'
    | 'fruits_vegetables'
    | 'hydration'
    | 'calcium'
    | 'iron'
    | 'vitamin_d';
  label: string;
  recommendedRange: string;
  unit: string;
  whyItMatters: string;
  sourceAndAgeGroup: string;
  estimateKind: EstimateKind;
  confidenceAndLimitations: string;
  targetMin?: number;
  targetMax?: number;
  targetMid?: number;
  isQuantitativeLoggable: boolean;
}

export interface DailyNutritionPlan {
  hasEssentialProfile: boolean;
  missingFields: Array<'age' | 'biologicalSex' | 'height' | 'weight'>;
  resolvedAgeGroup: AgeGroup;
  ageGroupLabel: string;
  isMinor: boolean;
  isAdultIndividualized: boolean;
  profileSummaryText: string;
  bmrKcal?: number;
  tdeeRange?: [number, number];
  nutrients: DailyNutrientGuidanceItem[];
  clinicalGuidanceNote: string;
  referenceSources: string[];
}

export interface DailyLoggedNutritionSummary {
  mealsToday: Meal[];
  imageEstimatedMealsCount: number;
  proteinMin: number;
  proteinMax: number;
  proteinMid: number;
  carbsMin: number;
  carbsMax: number;
  carbsMid: number;
  fatMin: number;
  fatMax: number;
  fatMid: number;
  fibreMin: number;
  fibreMax: number;
  fibreMid: number;
  energyMin: number;
  energyMax: number;
  energyMid: number;
  foodGroupsToday: string[];
  produceMentionsCount: number;
  hasAnyEstimatedMacros: boolean;
}

export const resolveAgeGroupFromUser = (user?: UserAccount | null): AgeGroup | null => {
  if (!user) return null;
  if (typeof user.ageYears === 'number' && !Number.isNaN(user.ageYears) && user.ageYears > 0) {
    if (user.ageYears <= 9) return 'child';
    if (user.ageYears <= 13) return 'early_teen';
    if (user.ageYears <= 17) return 'older_teen';
    if (user.ageYears >= 60) return 'older_adult';
    return 'adult';
  }
  return user.ageGroup || null;
};

export const isMinorUser = (user?: UserAccount | null): boolean => {
  if (typeof user?.ageYears === 'number' && user.ageYears > 0) {
    return user.ageYears < 18;
  }
  const g = resolveAgeGroupFromUser(user);
  return g === 'child' || g === 'early_teen' || g === 'older_teen';
};

export const getAgeGroupDisplayLabel = (ageGroup: AgeGroup | null, ageYears?: number): string => {
  if (typeof ageYears === 'number' && ageYears > 0) {
    if (ageYears <= 9) return `Child (${ageYears} yrs · 5–9 group)`;
    if (ageYears <= 13) return `Early Teen (${ageYears} yrs · 10–13 group)`;
    if (ageYears <= 17) return `Older Teen (${ageYears} yrs · 14–17 group)`;
    if (ageYears >= 60) return `Older Adult (${ageYears} yrs · 60+ group)`;
    return `Adult (${ageYears} yrs · 18–59 group)`;
  }
  switch (ageGroup) {
    case 'child':
      return 'Child (5–9 years)';
    case 'early_teen':
      return 'Early Teen (10–13 years)';
    case 'older_teen':
      return 'Older Teen (14–17 years)';
    case 'older_adult':
      return 'Older Adult (60+ years)';
    case 'adult':
      return 'Adult (18–59 years)';
    default:
      return 'Age not set yet';
  }
};

export const parseHeightCm = (raw?: string): number | null => {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim().toLowerCase();

  // Matches formats like 5'9", 5 ft 9 in, 5ft 10
  const ftInMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:ft|'|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:in|"|inch|inches)?)?/);
  if (ftInMatch) {
    const feet = Number(ftInMatch[1]);
    const inches = Number(ftInMatch[2] || 0);
    if (!Number.isNaN(feet) && feet >= 3 && feet <= 8) {
      return Math.round((feet * 12 + inches) * 2.54);
    }
  }

  // Matches meters like 1.75 m
  const meterMatch = s.match(/^(\d(?:\.\d+)?)\s*m$/);
  if (meterMatch) {
    const m = Number(meterMatch[1]);
    if (m >= 0.8 && m <= 2.5) return Math.round(m * 100);
  }

  const num = Number(s.replace(/[^\d.]/g, ''));
  if (!Number.isNaN(num) && num >= 90 && num <= 240) {
    return Math.round(num);
  }
  return null;
};

export const parseWeightKg = (raw?: string, preferredUnits: 'metric' | 'imperial' = 'metric'): number | null => {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim().toLowerCase();
  const num = Number(s.replace(/[^\d.]/g, ''));
  if (Number.isNaN(num) || num <= 0) return null;

  const isLbs = s.includes('lb') || s.includes('pound') || (!s.includes('kg') && preferredUnits === 'imperial' && num > 65);
  const kg = isLbs ? num * 0.453592 : num;
  if (kg >= 15 && kg <= 260) {
    return Math.round(kg * 10) / 10;
  }
  return null;
};

const ACTIVITY_FACTOR_RANGE: Record<ActivityLevel, [number, number]> = {
  sedentary: [1.2, 1.3],
  light: [1.35, 1.45],
  moderate: [1.5, 1.65],
  very_active: [1.7, 1.9],
};

const getRepresentativeAdultAge = (ageGroup: AgeGroup, ageYears?: number): number => {
  if (typeof ageYears === 'number' && ageYears >= 18) return ageYears;
  return ageGroup === 'older_adult' ? 66 : 30;
};

export const computeDailyNutritionPlan = (user?: UserAccount | null): DailyNutritionPlan => {
  const resolvedGroup = resolveAgeGroupFromUser(user);
  const ageYears = typeof user?.ageYears === 'number' && user.ageYears > 0 ? user.ageYears : undefined;
  const missingFields: DailyNutritionPlan['missingFields'] = [];

  if (!resolvedGroup) {
    missingFields.push('age');
  }

  const isMinor = resolvedGroup === 'child' || resolvedGroup === 'early_teen' || resolvedGroup === 'older_teen' || (ageYears !== undefined && ageYears < 18);
  const effectiveGroup: AgeGroup = resolvedGroup || 'adult';

  const heightCm = parseHeightCm(user?.height);
  const weightKg = parseWeightKg(user?.weight, user?.preferredUnits || 'metric');
  const sex: BiologicalSex | undefined = user?.biologicalSex;

  if (!isMinor) {
    if (!sex || sex === 'prefer_not_to_say' || sex === 'non_binary') {
      if (!sex) missingFields.push('biologicalSex');
    }
    if (!heightCm) missingFields.push('height');
    if (!weightKg) missingFields.push('weight');
  }

  const canIndividualizeAdult = Boolean(
    !isMinor &&
      resolvedGroup &&
      heightCm &&
      weightKg &&
      (sex === 'male' || sex === 'female')
  );

  // Minor-safe pathway: NEVER compute adult BMI, Mifflin-St Jeor calorie formulas, or weight-multiplied gram targets for minors (<18).
  if (isMinor) {
    const label = getAgeGroupDisplayLabel(effectiveGroup, ageYears);
    const minorEnergyRange: [number, number] =
      effectiveGroup === 'child'
        ? [1350, 1800]
        : effectiveGroup === 'early_teen'
        ? [1800, 2400]
        : [2200, 2900];
    const minorProteinNote =
      effectiveGroup === 'child'
        ? '23–30 g (general age reference; includes dal, milk/curd, eggs, nuts/seeds)'
        : effectiveGroup === 'early_teen'
        ? '32–45 g (general age reference; varies with growth & activity)'
        : '45–56 g (general teen reference; varies with growth spurt & sports)';
    const minorProduceRange =
      effectiveGroup === 'child' ? '300–400' : '400+';
    const minorFibreRange =
      effectiveGroup === 'child' ? '18–22' : '25–30';
    const minorCalcium =
      effectiveGroup === 'child' ? '650' : effectiveGroup === 'early_teen' ? '850' : '1050';
    const minorIron =
      effectiveGroup === 'child'
        ? '13–15'
        : effectiveGroup === 'early_teen'
        ? '16–22'
        : sex === 'female'
        ? '26–30'
        : '22–26';
    const minorWaterGlasses = effectiveGroup === 'child' ? '5–7 glasses (~1.2–1.6 L)' : '7–9 glasses (~1.7–2.2 L)';

    return {
      hasEssentialProfile: Boolean(resolvedGroup),
      missingFields: resolvedGroup ? [] : ['age'],
      resolvedAgeGroup: effectiveGroup,
      ageGroupLabel: label,
      isMinor: true,
      isAdultIndividualized: false,
      profileSummaryText: `Youth Educational Reference · ${label}. Individualized adult body-weight or calorie equations are intentionally disabled for under-18 champions.`,
      nutrients: [
        {
          id: 'energy',
          label: 'Estimated Daily Energy Reference',
          recommendedRange: `${minorEnergyRange[0]}–${minorEnergyRange[1]}`,
          unit: 'kcal / day (general range)',
          whyItMatters: 'Supports steady growth, brain focus for learning, physical play, and post-activity recovery.',
          sourceAndAgeGroup: `ICMR–NIN 2024 & WHO Youth · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Broad developmental reference only—growth spurts, puberty timing, and sports change actual needs substantially.',
          targetMin: minorEnergyRange[0],
          targetMax: minorEnergyRange[1],
          targetMid: Math.round((minorEnergyRange[0] + minorEnergyRange[1]) / 2),
          isQuantitativeLoggable: true,
        },
        {
          id: 'protein',
          label: 'Daily Protein Focus',
          recommendedRange: minorProteinNote.split(' ')[0],
          unit: 'g / day (age-band guide)',
          whyItMatters: 'Builds growing muscles, tissues, immune defenses, enzymes, and sustains fullness across school and play.',
          sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Age-band reference only (never weight-multiplied for minors). Pair cereals with pulses/dal, dairy/soy, eggs, nuts, or fish.',
          isQuantitativeLoggable: true,
        },
        {
          id: 'carbs',
          label: 'Unrefined Carbohydrate Energy',
          recommendedRange: '45–60% of daily energy (whole grains, millets, fruits, pulses)',
          unit: '% energy · food quality focus',
          whyItMatters: 'Primary fuel for school concentration and active movement; WHO advises carbs mainly from whole grains, vegetables, fruits, and pulses, keeping free sugars <10% of energy.',
          sourceAndAgeGroup: `WHO Healthy Diet & ICMR–NIN 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Prioritizes whole-food quality (roti/brown rice/oats/millets/pulses) over rigid gram counting.',
          isQuantitativeLoggable: true,
        },
        {
          id: 'fats',
          label: 'Healthy Dietary Fats',
          recommendedRange: '25–35% of daily energy (nuts, seeds, cold-pressed oils, dairy/fish)',
          unit: '% energy · brain & vitamin support',
          whyItMatters: 'Supports brain and hormone development and absorbs fat-soluble vitamins A, D, E, and K. Keep saturated fats <10% and avoid industrial trans fats.',
          sourceAndAgeGroup: `WHO Healthy Diet & ICMR–NIN 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'General proportional guidance; emphasizes unsaturated sources like walnuts, almonds, groundnuts, mustard/olive/soy oils.',
          isQuantitativeLoggable: true,
        },
        {
          id: 'fibre',
          label: 'Naturally Occurring Dietary Fibre',
          recommendedRange: minorFibreRange,
          unit: 'g / day',
          whyItMatters: 'Feeds beneficial gut microbes, supports regular digestion, and promotes steady energy release.',
          sourceAndAgeGroup: effectiveGroup === 'child' ? `WHO Youth Guideline · ${label}` : `WHO (≥25 g/day for age >10) · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Obtained from whole grains, dals, vegetables, fruits, and seeds rather than processed supplements.',
          targetMin: effectiveGroup === 'child' ? 18 : 25,
          targetMax: effectiveGroup === 'child' ? 22 : 30,
          targetMid: effectiveGroup === 'child' ? 20 : 25,
          isQuantitativeLoggable: true,
        },
        {
          id: 'fruits_vegetables',
          label: 'Vegetables & Whole Fruits',
          recommendedRange: minorProduceRange,
          unit: 'g / day (~4–5 varied servings)',
          whyItMatters: 'Delivers protective phytonutrients, potassium, vitamin C, and natural fibre across the day.',
          sourceAndAgeGroup: `WHO Healthy Diet (≥400 g/day for age >10) & ICMR–NIN · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Tracked via produce variety and balanced meal plates; whole fruits are preferred over juices.',
          isQuantitativeLoggable: false,
        },
        {
          id: 'hydration',
          label: 'Daily Hydration',
          recommendedRange: minorWaterGlasses,
          unit: 'water & plain fluids / day',
          whyItMatters: 'Maintains focus, body temperature regulation during movement, and comfortable digestion.',
          sourceAndAgeGroup: `ICMR–NIN & AAP Youth Hydration · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Increase fluids in warm weather or during active sports play.',
          isQuantitativeLoggable: false,
        },
        {
          id: 'calcium',
          label: 'Calcium',
          recommendedRange: minorCalcium,
          unit: 'mg / day (RDA reference)',
          whyItMatters: 'Crucial during childhood and adolescence when peak bone mass is actively built.',
          sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Visual meal logs estimate qualitative calcium sources (curd, milk, ragi, sesame, tofu, greens) rather than exact mg.',
          isQuantitativeLoggable: false,
        },
        {
          id: 'iron',
          label: 'Iron',
          recommendedRange: minorIron,
          unit: 'mg / day (RDA reference)',
          whyItMatters: 'Carries oxygen in red blood cells for energy, endurance, and attention; pair plant iron (palak, lentils, chana) with vitamin C (lemon, amla, citrus).',
          sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'General age reference; never diagnoses deficiency from diet logs—a clinician evaluates iron status.',
          isQuantitativeLoggable: false,
        },
        {
          id: 'vitamin_d',
          label: 'Vitamin D',
          recommendedRange: '600 (15 mcg)',
          unit: 'IU / day (RDA reference)',
          whyItMatters: 'Works with calcium for healthy bone mineralization, muscle function, and immune resilience.',
          sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
          estimateKind: 'general_age_reference',
          confidenceAndLimitations: 'Safe outdoor morning sunlight, fortified milk/foods, or clinician-advised supplementation contribute substantially alongside food.',
          isQuantitativeLoggable: false,
        },
      ],
      clinicalGuidanceNote:
        'Growth, puberty timing, and daily sports alter youth nutrient requirements rapidly. Treat these figures as general educational reference ranges, and consult a qualified pediatric dietitian or healthcare professional for personalized dietary guidance.',
      referenceSources: [
        'WHO Healthy Diet Fact Sheet & Youth Physical Activity Guidelines',
        'ICMR–NIN Dietary Guidelines for Indians (2024) & Recommended Dietary Allowances',
      ],
    };
  }

  // Adult pathway (18+): Individualized estimate when sex + height + weight + age are available, otherwise general adult reference
  const label = getAgeGroupDisplayLabel(effectiveGroup, ageYears);
  const actLevel: ActivityLevel = user?.activityLevel || 'moderate';
  const [actLow, actHigh] = ACTIVITY_FACTOR_RANGE[actLevel] || [1.5, 1.65];

  let bmr: number | undefined;
  let kcalMin = 1700;
  let kcalMax = 2400;
  let proteinMin = 50;
  let proteinMax = 75;
  let estimateKind: EstimateKind = 'general_age_reference';
  let energyLimitation = 'General adult reference range used because height, weight, or biological sex is not filled in yet.';

  if (canIndividualizeAdult && heightCm && weightKg && (sex === 'male' || sex === 'female')) {
    const repAge = getRepresentativeAdultAge(effectiveGroup, ageYears);
    const sexOffset = sex === 'male' ? 5 : -161;
    // Mifflin-St Jeor equation (adults 18+ only)
    bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * repAge + sexOffset);
    kcalMin = Math.round((bmr * actLow) / 50) * 50;
    kcalMax = Math.round((bmr * actHigh) / 50) * 50;

    // ICMR-NIN / WHO safe adult protein band: ~0.83 to 1.2 g/kg depending on activity (up to 1.3 for very active)
    const proteinHighFactor = actLevel === 'very_active' ? 1.35 : actLevel === 'moderate' ? 1.15 : 1.0;
    proteinMin = Math.round(weightKg * 0.83);
    proteinMax = Math.round(weightKg * proteinHighFactor);
    estimateKind = 'individualized_estimate';
    energyLimitation = `Estimated via adult Mifflin–St Jeor (BMR ~${bmr} kcal/day) scaled by ${actLevel.replace('_', ' ')} activity (${actLow}–${actHigh}x). Individual metabolism varies by ~10–15%.`;
  } else if (resolvedGroup && weightKg) {
    // Adult with weight but non-binary/prefer_not_to_say or missing height
    kcalMin = sex === 'male' ? 2000 : 1700;
    kcalMax = sex === 'male' ? 2600 : 2250;
    proteinMin = Math.round(weightKg * 0.83);
    proteinMax = Math.round(weightKg * 1.1);
    energyLimitation = 'Protein incorporates body weight (0.83–1.1 g/kg adult reference), while energy remains a general adult range until height and reference sex are specified.';
  } else if (sex === 'male') {
    kcalMin = 2100;
    kcalMax = 2650;
    proteinMin = 54;
    proteinMax = 78;
  } else if (sex === 'female') {
    kcalMin = 1750;
    kcalMax = 2250;
    proteinMin = 46;
    proteinMax = 68;
  }

  // Carb & Fat AMDR aligned with WHO Healthy Diet & ICMR–NIN 2024 (45–60% carbs, 20–30% fats)
  const carbsMin = Math.round((kcalMin * 0.45) / 4);
  const carbsMax = Math.round((kcalMax * 0.60) / 4);
  const fatMin = Math.round((kcalMin * 0.20) / 9);
  const fatMax = Math.round((kcalMax * 0.30) / 9);

  const calciumRef = effectiveGroup === 'older_adult' ? '1000–1200' : '1000';
  const ironRef =
    sex === 'female' && effectiveGroup !== 'older_adult'
      ? '29'
      : sex === 'male' || effectiveGroup === 'older_adult'
      ? '19'
      : '19–29';
  const hydrationRef =
    sex === 'male'
      ? '10–13 glasses (~2.5–3.2 L)'
      : '8–11 glasses (~2.0–2.7 L)';

  return {
    hasEssentialProfile: Boolean(resolvedGroup) && (canIndividualizeAdult || !isMinor),
    missingFields,
    resolvedAgeGroup: effectiveGroup,
    ageGroupLabel: label,
    isMinor: false,
    isAdultIndividualized: canIndividualizeAdult,
    profileSummaryText: canIndividualizeAdult
      ? `Adult Individualized Estimate · ${label} · ${heightCm} cm · ${weightKg} kg · ${actLevel.replace('_', ' ')} activity`
      : `Adult General Reference · ${label}. Add ${missingFields.join(', ')} for a tailored adult energy & protein band.`,
    bmrKcal: bmr,
    tdeeRange: [kcalMin, kcalMax],
    nutrients: [
      {
        id: 'energy',
        label: 'Estimated Daily Energy Range',
        recommendedRange: `${kcalMin}–${kcalMax}`,
        unit: 'kcal / day',
        whyItMatters: 'Sustains resting organ function, daily movement, cognitive focus, and tissue repair without under-fueling.',
        sourceAndAgeGroup: `WHO Energy & Mifflin–St Jeor · ${label}`,
        estimateKind,
        confidenceAndLimitations: energyLimitation,
        targetMin: kcalMin,
        targetMax: kcalMax,
        targetMid: Math.round((kcalMin + kcalMax) / 2),
        isQuantitativeLoggable: true,
      },
      {
        id: 'protein',
        label: 'Daily Protein Range',
        recommendedRange: `${proteinMin}–${proteinMax}`,
        unit: 'g / day',
        whyItMatters: 'Preserves and repairs muscle tissue, supports immunity, and provides steady satiety across meals.',
        sourceAndAgeGroup: `ICMR–NIN 2024 (0.83–1.2 g/kg adult ref) · ${label}`,
        estimateKind: weightKg ? 'individualized_estimate' : 'general_age_reference',
        confidenceAndLimitations: weightKg
          ? 'Based on ICMR–NIN adult safe intake (0.83 g/kg) up to active recovery needs. Combine pulses/dal + grains, dairy/soy, eggs, or fish.'
          : 'General adult RDA range; add body weight for a weight-calibrated adult protein range.',
        targetMin: proteinMin,
        targetMax: proteinMax,
        targetMid: Math.round((proteinMin + proteinMax) / 2),
        isQuantitativeLoggable: true,
      },
      {
        id: 'carbs',
        label: 'Complex Carbohydrate Range',
        recommendedRange: `${carbsMin}–${carbsMax}`,
        unit: 'g / day (45–60% energy)',
        whyItMatters: 'WHO emphasizes obtaining carbohydrates mainly from whole grains, vegetables, fruits, and pulses while keeping free sugars below 10% of total energy.',
        sourceAndAgeGroup: `WHO Healthy Diet & ICMR–NIN 2024 · ${label}`,
        estimateKind,
        confidenceAndLimitations: 'Focus on minimally processed grains, millets, dals, and produce rather than refined starches.',
        targetMin: carbsMin,
        targetMax: carbsMax,
        targetMid: Math.round((carbsMin + carbsMax) / 2),
        isQuantitativeLoggable: true,
      },
      {
        id: 'fats',
        label: 'Dietary Fat Range',
        recommendedRange: `${fatMin}–${fatMax}`,
        unit: 'g / day (20–30% energy)',
        whyItMatters: 'Provides essential fatty acids and enables absorption of vitamins A, D, E, and K. Keep saturated fats <10% of energy and avoid trans fats.',
        sourceAndAgeGroup: `WHO Healthy Diet & ICMR–NIN 2024 · ${label}`,
        estimateKind,
        confidenceAndLimitations: 'Prefer nuts, seeds, mustard/groundnut/olive/rice-bran oils, and fatty fish over ultra-processed fried snacks.',
        targetMin: fatMin,
        targetMax: fatMax,
        targetMid: Math.round((fatMin + fatMax) / 2),
        isQuantitativeLoggable: true,
      },
      {
        id: 'fibre',
        label: 'Naturally Occurring Dietary Fibre',
        recommendedRange: '25–35',
        unit: 'g / day (WHO minimum ≥25 g)',
        whyItMatters: 'Supports gut microbiome diversity, stable blood glucose, lipid balance, and digestive comfort.',
        sourceAndAgeGroup: `WHO Healthy Diet Guideline (≥25 g/day) & ICMR–NIN 2024`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'WHO adult minimum is ≥25 g/day from whole plant foods (pulses, millets, whole wheat, vegetables, fruits, seeds).',
        targetMin: 25,
        targetMax: 35,
        targetMid: 30,
        isQuantitativeLoggable: true,
      },
      {
        id: 'fruits_vegetables',
        label: 'Fruits & Vegetables',
        recommendedRange: '≥400',
        unit: 'g / day (~5 servings)',
        whyItMatters: 'Delivers potassium, folate, vitamin C, antioxidants, and natural fibre associated with long-term cardiovascular and metabolic health.',
        sourceAndAgeGroup: `WHO Healthy Diet Guideline & ICMR–NIN 2024`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'Excludes starchy tubers like potatoes; aim for varied colors across meals.',
        isQuantitativeLoggable: false,
      },
      {
        id: 'hydration',
        label: 'Daily Hydration',
        recommendedRange: hydrationRef,
        unit: 'total fluids / day',
        whyItMatters: 'Supports circulation, thermoregulation during workouts, cognition, and kidney function.',
        sourceAndAgeGroup: `ICMR–NIN Water Reference · ${label}`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'Climate, humidity, and workout sweat rate raise fluid needs.',
        isQuantitativeLoggable: false,
      },
      {
        id: 'calcium',
        label: 'Calcium',
        recommendedRange: calciumRef,
        unit: 'mg / day (ICMR–NIN RDA)',
        whyItMatters: 'Maintains bone mineral density, nerve signaling, and smooth muscle contraction.',
        sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'Meal photo analysis tracks qualitative calcium contributors (curd, paneer, ragi, sesame, soy/tofu, leafy greens).',
        isQuantitativeLoggable: false,
      },
      {
        id: 'iron',
        label: 'Iron',
        recommendedRange: ironRef,
        unit: 'mg / day (ICMR–NIN RDA)',
        whyItMatters: 'Essential for haemoglobin oxygen transport and cellular energy metabolism; vitamin C improves plant-iron absorption.',
        sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'Educational reference only; iron status can only be assessed via medical blood tests.',
        isQuantitativeLoggable: false,
      },
      {
        id: 'vitamin_d',
        label: 'Vitamin D',
        recommendedRange: '600 (15 mcg)',
        unit: 'IU / day (ICMR–NIN RDA)',
        whyItMatters: 'Facilitates calcium absorption, skeletal strength, and immune function.',
        sourceAndAgeGroup: `ICMR–NIN RDA 2024 · ${label}`,
        estimateKind: 'general_age_reference',
        confidenceAndLimitations: 'Food alone often supplies only part of Vitamin D; sunlight exposure and clinician-guided testing help confirm status.',
        isQuantitativeLoggable: false,
      },
    ],
    clinicalGuidanceNote:
      'These numbers are educational estimates grounded in WHO and ICMR–NIN 2024 guidance—not medical prescriptions. If you have a health condition, pregnancy, or specific athletic goals, consult a qualified dietitian or clinician.',
    referenceSources: [
      'WHO Healthy Diet Fact Sheet & Carbohydrate/Fibre Guidelines',
      'ICMR–NIN Dietary Guidelines for Indians (2024) & Recommended Dietary Allowances',
    ],
  };
};

export const getAgeAppropriateActivityGuidance = (user?: UserAccount | null): {
  headline: string;
  recommendation: string;
  isMinor: boolean;
} => {
  const minor = isMinorUser(user);
  if (minor) {
    return {
      headline: 'WHO Youth Movement Guidance (Ages 5–17)',
      recommendation:
        'Aim for an average of 60 minutes per day of varied, enjoyable moderate-to-vigorous activity across the week—including playful aerobic movement and muscle/bone-strengthening activities at least 3 days a week—with restful sleep and recovery days.',
      isMinor: true,
    };
  }
  return {
    headline: 'WHO Adult Physical Activity Guidance',
    recommendation:
      'Aim for 150–300 minutes of moderate-intensity (or 75–150 minutes vigorous) aerobic activity weekly, plus muscle-strengthening movement on 2 or more days per week, balanced with rest and hydration.',
    isMinor: false,
  };
};

const getLocalDateKey = (dateInput: string | Date, timezone?: string): string => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
};

export const summarizeDailyNutrition = (
  meals: Meal[],
  timezone?: string
): DailyLoggedNutritionSummary => {
  const todayKey = getLocalDateKey(new Date(), timezone);
  const mealsToday = meals.filter(m => getLocalDateKey(m.timestamp, timezone) === todayKey);

  let imageEstimatedMealsCount = 0;
  let proteinMin = 0;
  let proteinMax = 0;
  let carbsMin = 0;
  let carbsMax = 0;
  let fatMin = 0;
  let fatMax = 0;
  let fibreMin = 0;
  let fibreMax = 0;
  let energyMin = 0;
  let energyMax = 0;
  let hasAnyEstimatedMacros = false;
  let produceMentionsCount = 0;
  const foodGroupsSet = new Set<string>();

  for (const m of mealsToday) {
    const est = m.nutritionEstimate;
    if (est) {
      hasAnyEstimatedMacros = true;
      if (est.isImageEstimate) imageEstimatedMealsCount += 1;
      proteinMin += est.estimatedTotals.proteinG.min || 0;
      proteinMax += est.estimatedTotals.proteinG.max || 0;
      carbsMin += est.estimatedTotals.carbsG.min || 0;
      carbsMax += est.estimatedTotals.carbsG.max || 0;
      fatMin += est.estimatedTotals.fatG.min || 0;
      fatMax += est.estimatedTotals.fatG.max || 0;
      fibreMin += est.estimatedTotals.fibreG.min || 0;
      fibreMax += est.estimatedTotals.fibreG.max || 0;
      energyMin += est.estimatedTotals.energyKcal.min || 0;
      energyMax += est.estimatedTotals.energyKcal.max || 0;
      for (const fg of est.foodGroupsRepresented || []) {
        if (fg.trim()) foodGroupsSet.add(fg.trim());
        if (/fruit|veg|salad|greens|produce/i.test(fg)) produceMentionsCount += 1;
      }
    } else {
      // Heuristic food-group tagging for manually logged/preset meals without fabricating exact macros
      const text = `${m.title} ${(m.foodItems || []).join(' ')}`.toLowerCase();
      if (/dal|lentil|chickpea|chana|rajma|paneer|tofu|egg|chicken|fish|soy|yogurt|curd|milk/.test(text)) {
        foodGroupsSet.add('Protein-rich foods');
      }
      if (/roti|rice|quinoa|oat|millet|ragi|dosa|idli|bread|wheat|poha/.test(text)) {
        foodGroupsSet.add('Whole grains & cereals');
      }
      if (/salad|spinach|palak|broccoli|cucumber|tomato|apple|banana|berry|vegetable|sabzi|fruit|avocado/.test(text)) {
        foodGroupsSet.add('Vegetables & fruits');
        produceMentionsCount += 1;
      }
      if (/nut|almond|walnut|seed|flax|ghee|olive|peanut/.test(text)) {
        foodGroupsSet.add('Nuts, seeds & healthy fats');
      }
    }
  }

  return {
    mealsToday,
    imageEstimatedMealsCount,
    proteinMin,
    proteinMax,
    proteinMid: Math.round((proteinMin + proteinMax) / 2),
    carbsMin,
    carbsMax,
    carbsMid: Math.round((carbsMin + carbsMax) / 2),
    fatMin,
    fatMax,
    fatMid: Math.round((fatMin + fatMax) / 2),
    fibreMin,
    fibreMax,
    fibreMid: Math.round((fibreMin + fibreMax) / 2),
    energyMin,
    energyMax,
    energyMid: Math.round((energyMin + energyMax) / 2),
    foodGroupsToday: Array.from(foodGroupsSet),
    produceMentionsCount,
    hasAnyEstimatedMacros,
  };
};
