import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = 'gemini-4-hydrogen';

const VALID_EXERCISE_TYPES = new Set([
  'squat',
  'pushup',
  'jumping_jack',
  'lunge',
  'knee_raise',
  'walking',
  'running',
  'cycling',
  'gym',
  'yoga',
  'unknown',
]);

const VALID_DIETARY_CATEGORIES = new Set([
  'vegetarian',
  'vegan',
  'eggetarian',
  'non_vegetarian',
  'other',
]);

const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const stripDataUrlPrefix = (raw: string): string => {
  const commaIdx = raw.indexOf(',');
  if (raw.startsWith('data:') && commaIdx !== -1) {
    return raw.slice(commaIdx + 1).trim();
  }
  return raw.trim();
};

const parseGeminiJson = <T>(text: string | undefined): T => {
  if (!text || !text.trim()) {
    throw new Error('Empty response received from Gemini Vision.');
  }
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
};

const extractErrorStatus = (err: any): { status: number; message: string } => {
  const rawMsg = String(err?.message || 'AI Vision request failed.');
  if (rawMsg.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message: 'Server Gemini API key is not configured. Check Settings > Secrets.',
    };
  }
  const statusCode = Number(err?.status || err?.statusCode || 0);
  if (statusCode === 403 || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API authentication failed. Please verify the configured API key in Settings > Secrets.',
    };
  }
  if (statusCode === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'AI Vision rate limit reached temporarily. Please wait a moment and try again.',
    };
  }
  if (statusCode === 404 || rawMsg.includes('NOT_FOUND')) {
    return {
      status: 502,
      message: `Gemini Vision model (${GEMINI_MODEL}) could not be reached.`,
    };
  }
  return {
    status: 500,
    message: rawMsg,
  };
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // 1. Server-Side Workout Media Vision Analysis (Image or Video)
  app.post('/api/vision/analyze-workout', async (req: Request, res: Response) => {
    try {
      const {
        mediaBase64,
        mimeType,
        mediaKind = 'image',
        selectedExerciseHint,
        userContext,
      } = req.body || {};

      if (!mediaBase64 || typeof mediaBase64 !== 'string') {
        res.status(400).json({ error: 'Missing mediaBase64 payload.' });
        return;
      }
      if (!mimeType || typeof mimeType !== 'string' || (!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))) {
        res.status(400).json({ error: 'Unsupported media MIME type. Upload an image or video.' });
        return;
      }

      const normalizedKind: 'image' | 'video' =
        mediaKind === 'video' || mimeType.startsWith('video/') ? 'video' : 'image';

      const isMinor =
        userContext?.ageGroup === 'child' ||
        userContext?.ageGroup === 'early_teen' ||
        userContext?.ageGroup === 'older_teen' ||
        (typeof userContext?.ageYears === 'number' && userContext.ageYears < 18);

      const ai = getGeminiClient();

      const systemInstruction = [
        'You are Aether Vision, a careful, honest fitness movement analyst.',
        'STRICT ACCURACY RULES:',
        '1. Identify an exercise ONLY when there is clear visual evidence. If unclear, occluded, non-exercise, or ambiguous, set identified=false, exerciseType="unknown", needsUserConfirmation=true, and confidence <= 50.',
        '2. Distinguish carefully between similar movements: squat vs lunge vs deadlift, push-up vs plank vs dip, jumping jack vs standing knee raise, walking vs running, yoga pose vs general stretch.',
        '3. NEVER invent repetitions, sets, duration, or completed workouts.',
        normalizedKind === 'image'
          ? '4. CRITICAL: This input is a SINGLE STILL PHOTOGRAPH. A still photo CANNOT count repetitions, verify sets, or prove workout duration. You MUST set repsSupported=false, estimatedReps=0, estimatedSets=0, durationSupported=false, estimatedDurationMinutes=0, and clearly state in countingLimitation that a single image only captures posture/moment and requires video or live camera tracking to verify repetitions.'
          : '4. This input is a VIDEO. Count repetitions ONLY if full movement cycles (eccentric + concentric return) are clearly visible across frames. If partial or obscured, set repsSupported=false, estimatedReps=0, and explain why in countingLimitation.',
        isMinor
          ? '5. AGE SAFETY (Minor <18): Use supportive WHO youth physical activity guidance (~60 min/day varied joyful movement, play, sports, plus bone/muscle strengthening 3x/week and rest days). NEVER encourage excessive exercise or exercising to compensate for eating.'
          : '5. ADULT GUIDANCE: Use supportive WHO adult physical activity guidance (150-300 min/week moderate or 75-150 min/week vigorous movement, 2+ days/week muscle strengthening, proper rest and recovery). Never promote compensatory exercise.',
        '6. Return concise structured JSON matching the schema.',
      ].join('\n');

      const userPrompt = [
        `Media type: ${normalizedKind}.`,
        selectedExerciseHint ? `User selected hint (do NOT blindly agree if visual evidence differs): ${selectedExerciseHint}.` : '',
        userContext?.ageGroup ? `User age group: ${userContext.ageGroup}.` : '',
        userContext?.activityLevel ? `User activity level: ${userContext.activityLevel}.` : '',
        'Analyze the uploaded media carefully. Map exerciseType to one of: squat, pushup, jumping_jack, lunge, knee_raise, walking, running, cycling, gym, yoga, unknown.',
      ]
        .filter(Boolean)
        .join(' ');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: stripDataUrlPrefix(mediaBase64),
              },
            },
            { text: userPrompt },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identified: { type: Type.BOOLEAN },
              exerciseType: { type: Type.STRING },
              exerciseName: { type: Type.STRING },
              movementCategory: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              confidenceLevel: { type: Type.STRING },
              needsUserConfirmation: { type: Type.BOOLEAN },
              similarExerciseDistinction: { type: Type.STRING },
              repsSupported: { type: Type.BOOLEAN },
              estimatedReps: { type: Type.INTEGER },
              estimatedSets: { type: Type.INTEGER },
              durationSupported: { type: Type.BOOLEAN },
              estimatedDurationMinutes: { type: Type.NUMBER },
              countingLimitation: { type: Type.STRING },
              observations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              safetyAndFormNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              ageAppropriateGuidance: { type: Type.STRING },
            },
            required: [
              'identified',
              'exerciseType',
              'exerciseName',
              'movementCategory',
              'confidence',
              'confidenceLevel',
              'needsUserConfirmation',
              'similarExerciseDistinction',
              'repsSupported',
              'estimatedReps',
              'estimatedSets',
              'durationSupported',
              'estimatedDurationMinutes',
              'countingLimitation',
              'observations',
              'safetyAndFormNotes',
              'ageAppropriateGuidance',
            ],
          },
        },
      });

      const parsed = parseGeminiJson<any>(response.text);

      // Server-side integrity clamping: single photographs never fabricate reps, sets, or full duration
      const safeExerciseType = VALID_EXERCISE_TYPES.has(parsed.exerciseType)
        ? parsed.exerciseType
        : 'unknown';
      const safeConfidence = Math.min(100, Math.max(0, Math.round(Number(parsed.confidence || 0))));
      const safeConfidenceLevel =
        safeConfidence >= 75 ? 'high' : safeConfidence >= 45 ? 'medium' : 'low';

      const isSingleImage = normalizedKind === 'image';
      const repsSupported = isSingleImage ? false : Boolean(parsed.repsSupported) && Number(parsed.estimatedReps) > 0;
      const estimatedReps = repsSupported ? Math.min(300, Math.max(1, Math.round(Number(parsed.estimatedReps)))) : 0;
      const estimatedSets = repsSupported ? Math.min(20, Math.max(1, Math.round(Number(parsed.estimatedSets || 1)))) : 0;
      const durationSupported = isSingleImage ? false : Boolean(parsed.durationSupported) && Number(parsed.estimatedDurationMinutes) > 0;
      const estimatedDurationMinutes = durationSupported
        ? Math.min(180, Math.max(1, Math.round(Number(parsed.estimatedDurationMinutes))))
        : 0;

      const countingLimitation = isSingleImage
        ? 'Single photographs show form or posture at one moment, not completed repetitions or workout duration. Upload a workout video or use Live Motion Tracking for rep verification, or confirm your actual session duration below.'
        : String(parsed.countingLimitation || (repsSupported ? 'Rep count estimated from visible movement cycles; please confirm before saving.' : 'Could not reliably count full movement cycles in this video clip; please confirm reps or duration manually.'));

      res.json({
        mediaKind: normalizedKind,
        identified: Boolean(parsed.identified) && safeExerciseType !== 'unknown',
        exerciseType: safeExerciseType,
        exerciseName: String(parsed.exerciseName || (safeExerciseType === 'unknown' ? 'Unconfirmed Activity' : safeExerciseType)),
        movementCategory: String(parsed.movementCategory || 'Physical Activity'),
        confidence: safeConfidence,
        confidenceLevel: safeConfidenceLevel,
        needsUserConfirmation:
          Boolean(parsed.needsUserConfirmation) ||
          !parsed.identified ||
          safeExerciseType === 'unknown' ||
          safeConfidence < 75 ||
          isSingleImage ||
          !repsSupported,
        similarExerciseDistinction: String(parsed.similarExerciseDistinction || ''),
        repsSupported,
        estimatedReps,
        estimatedSets,
        durationSupported,
        estimatedDurationMinutes,
        countingLimitation,
        observations: Array.isArray(parsed.observations) ? parsed.observations.map(String).slice(0, 6) : [],
        safetyAndFormNotes: Array.isArray(parsed.safetyAndFormNotes) ? parsed.safetyAndFormNotes.map(String).slice(0, 5) : [],
        ageAppropriateGuidance: String(parsed.ageAppropriateGuidance || ''),
      });
    } catch (err: any) {
      const { status, message } = extractErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Server-Side Food & Nutrition Vision Analysis (Image Upload)
  app.post('/api/vision/analyze-food', async (req: Request, res: Response) => {
    try {
      const { mediaBase64, mimeType, userContext } = req.body || {};

      if (!mediaBase64 || typeof mediaBase64 !== 'string') {
        res.status(400).json({ error: 'Missing mediaBase64 payload.' });
        return;
      }
      if (!mimeType || typeof mimeType !== 'string' || !mimeType.startsWith('image/')) {
        res.status(400).json({ error: 'Food analysis requires a valid image file (JPEG, PNG, or WebP).' });
        return;
      }

      const isMinor =
        userContext?.ageGroup === 'child' ||
        userContext?.ageGroup === 'early_teen' ||
        userContext?.ageGroup === 'older_teen' ||
        (typeof userContext?.ageYears === 'number' && userContext.ageYears < 18);

      const ai = getGeminiClient();

      const systemInstruction = [
        'You are Aether Vision, a supportive, educational nutrition analyst grounded in WHO Healthy Diet principles and ICMR-NIN Dietary Guidelines for Indians 2024.',
        'STRICT HONESTY & SAFETY RULES:',
        '1. Identify visible foods and likely ingredients ONLY from visual evidence. If the image is not food or is too unclear, set identified=false, confidence <= 35, and needsUserConfirmation=true.',
        '2. NEVER pretend an image gives exact lab measurements. Express uncertainty honestly in uncertaintyNote, provide sensible approximate gram ranges, and include clarifyingQuestions (e.g., cooking oil/ghee amount, hidden fillings, bowl size).',
        '3. Explain which foods contribute protein, carbohydrates (especially whole grains/millets/pulses/produce), healthy fats, and naturally occurring dietary fibre, plus relevant micronutrients (e.g., iron, calcium, vitamin C, vitamin A/folate) qualitatively with contributing foods.',
        '4. NEVER diagnose nutritional deficiencies, NEVER shame food choices or bodies, NEVER prescribe restrictive calorie targets, weight-loss diets, or aggressive macro targets.',
        isMinor
          ? '5. AGE SAFETY (Minor <18): Do NOT prescribe individual daily gram targets. Explain how protein, carbohydrates, healthy fats, fibre, and micronutrients support growth, energy, school focus, and recovery, and note that needs vary with growth and activity—recommend a qualified dietitian or healthcare professional for personalised targets.'
          : '5. ADULT EDUCATION: Explain balanced nourishment in energy, recovery, and micronutrient variety without shame or restrictive dieting.',
        '6. ALLERGEN SAFETY: NEVER claim any meal is allergen-free. Flag any visible or likely overlap with the user allergies/intolerances if provided.',
      ].join('\n');

      const allergiesText = Array.isArray(userContext?.allergies) && userContext.allergies.length > 0
        ? `User allergies: ${userContext.allergies.join(', ')}.`
        : '';
      const intolerancesText = Array.isArray(userContext?.intolerances) && userContext.intolerances.length > 0
        ? `User intolerances: ${userContext.intolerances.join(', ')}.`
        : '';

      const userPrompt = [
        'Analyze this meal photograph and provide transparent approximate nutritional estimates and educational guidance.',
        userContext?.dietaryPreference ? `User dietary preference: ${userContext.dietaryPreference}.` : '',
        userContext?.ageGroup ? `User age group: ${userContext.ageGroup}.` : '',
        allergiesText,
        intolerancesText,
      ]
        .filter(Boolean)
        .join(' ');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: stripDataUrlPrefix(mediaBase64),
              },
            },
            { text: userPrompt },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identified: { type: Type.BOOLEAN },
              mealTitle: { type: Type.STRING },
              dietaryCategory: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              confidenceLevel: { type: Type.STRING },
              needsUserConfirmation: { type: Type.BOOLEAN },
              clarifyingQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    foodGroup: { type: Type.STRING },
                    likelyIngredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    estimatedPortion: { type: Type.STRING },
                    uncertaintyNote: { type: Type.STRING },
                    proteinG: { type: Type.NUMBER },
                    carbsG: { type: Type.NUMBER },
                    fatG: { type: Type.NUMBER },
                    fibreG: { type: Type.NUMBER },
                    energyKcal: { type: Type.NUMBER },
                  },
                  required: [
                    'name',
                    'foodGroup',
                    'likelyIngredients',
                    'estimatedPortion',
                    'uncertaintyNote',
                    'proteinG',
                    'carbsG',
                    'fatG',
                    'fibreG',
                    'energyKcal',
                  ],
                },
              },
              estimatedTotals: {
                type: Type.OBJECT,
                properties: {
                  proteinMinG: { type: Type.NUMBER },
                  proteinMaxG: { type: Type.NUMBER },
                  carbsMinG: { type: Type.NUMBER },
                  carbsMaxG: { type: Type.NUMBER },
                  fatMinG: { type: Type.NUMBER },
                  fatMaxG: { type: Type.NUMBER },
                  fibreMinG: { type: Type.NUMBER },
                  fibreMaxG: { type: Type.NUMBER },
                  energyMinKcal: { type: Type.NUMBER },
                  energyMaxKcal: { type: Type.NUMBER },
                },
                required: [
                  'proteinMinG',
                  'proteinMaxG',
                  'carbsMinG',
                  'carbsMaxG',
                  'fatMinG',
                  'fatMaxG',
                  'fibreMinG',
                  'fibreMaxG',
                  'energyMinKcal',
                  'energyMaxKcal',
                ],
              },
              foodGroupsRepresented: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              micronutrients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    qualitativeLevel: { type: Type.STRING },
                    contributingFoods: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    note: { type: Type.STRING },
                  },
                  required: ['name', 'qualitativeLevel', 'contributingFoods', 'note'],
                },
              },
              nutrientContributors: {
                type: Type.OBJECT,
                properties: {
                  proteinSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                  carbSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                  healthyFatSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                  fibreSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['proteinSources', 'carbSources', 'healthyFatSources', 'fibreSources'],
              },
              educationalExplanation: { type: Type.STRING },
              varietyAndBalanceSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              allergenWatchNotice: { type: Type.STRING },
            },
            required: [
              'identified',
              'mealTitle',
              'dietaryCategory',
              'confidence',
              'confidenceLevel',
              'needsUserConfirmation',
              'clarifyingQuestions',
              'items',
              'estimatedTotals',
              'foodGroupsRepresented',
              'micronutrients',
              'nutrientContributors',
              'educationalExplanation',
              'varietyAndBalanceSuggestions',
              'allergenWatchNotice',
            ],
          },
        },
      });

      const parsed = parseGeminiJson<any>(response.text);
      const safeConfidence = Math.min(100, Math.max(0, Math.round(Number(parsed.confidence || 0))));
      const safeConfidenceLevel =
        safeConfidence >= 75 ? 'high' : safeConfidence >= 45 ? 'medium' : 'low';
      const safeDietCategory = VALID_DIETARY_CATEGORIES.has(parsed.dietaryCategory)
        ? parsed.dietaryCategory
        : 'vegetarian';

      const items = Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            name: String(item.name || 'Food item'),
            foodGroup: String(item.foodGroup || 'Mixed dish'),
            likelyIngredients: Array.isArray(item.likelyIngredients)
              ? item.likelyIngredients.map(String)
              : [],
            estimatedPortion: String(item.estimatedPortion || '1 serving (estimated)'),
            uncertaintyNote: String(item.uncertaintyNote || 'Visual portion estimate only; hidden oil/ingredients may vary.'),
            proteinG: Math.max(0, Math.round(Number(item.proteinG || 0))),
            carbsG: Math.max(0, Math.round(Number(item.carbsG || 0))),
            fatG: Math.max(0, Math.round(Number(item.fatG || 0))),
            fibreG: Math.max(0, Math.round(Number(item.fibreG || 0))),
            energyKcal: Math.max(0, Math.round(Number(item.energyKcal || 0))),
          }))
        : [];

      const rawTotals = parsed.estimatedTotals || {};
      const clampRange = (minRaw: any, maxRaw: any, itemSum: number) => {
        const minV = Math.max(0, Math.round(Number(minRaw ?? Math.round(itemSum * 0.8))));
        const maxV = Math.max(minV, Math.round(Number(maxRaw ?? Math.round(itemSum * 1.2))));
        return { min: minV, max: maxV, mid: Math.round((minV + maxV) / 2) };
      };

      const itemSums = items.reduce(
        (acc: any, it: any) => ({
          protein: acc.protein + it.proteinG,
          carbs: acc.carbs + it.carbsG,
          fat: acc.fat + it.fatG,
          fibre: acc.fibre + it.fibreG,
          kcal: acc.kcal + it.energyKcal,
        }),
        { protein: 0, carbs: 0, fat: 0, fibre: 0, kcal: 0 }
      );

      res.json({
        identified: Boolean(parsed.identified) && items.length > 0,
        isImageEstimate: true,
        estimateDisclaimer:
          'Visual estimates are approximate ranges based on visible items and standard portions, not exact laboratory nutrition measurements.',
        mealTitle: String(parsed.mealTitle || 'Uploaded Meal'),
        dietaryCategory: safeDietCategory,
        confidence: safeConfidence,
        confidenceLevel: safeConfidenceLevel,
        needsUserConfirmation: true,
        clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions)
          ? parsed.clarifyingQuestions.map(String).slice(0, 4)
          : [],
        items,
        estimatedTotals: {
          proteinG: clampRange(rawTotals.proteinMinG, rawTotals.proteinMaxG, itemSums.protein),
          carbsG: clampRange(rawTotals.carbsMinG, rawTotals.carbsMaxG, itemSums.carbs),
          fatG: clampRange(rawTotals.fatMinG, rawTotals.fatMaxG, itemSums.fat),
          fibreG: clampRange(rawTotals.fibreMinG, rawTotals.fibreMaxG, itemSums.fibre),
          energyKcal: clampRange(rawTotals.energyMinKcal, rawTotals.energyMaxKcal, itemSums.kcal),
        },
        foodGroupsRepresented: Array.isArray(parsed.foodGroupsRepresented)
          ? parsed.foodGroupsRepresented.map(String)
          : [],
        micronutrients: Array.isArray(parsed.micronutrients)
          ? parsed.micronutrients.map((m: any) => ({
              name: String(m.name || 'Micronutrient'),
              qualitativeLevel: String(m.qualitativeLevel || 'moderate source'),
              contributingFoods: Array.isArray(m.contributingFoods) ? m.contributingFoods.map(String) : [],
              note: String(m.note || ''),
            }))
          : [],
        nutrientContributors: {
          proteinSources: Array.isArray(parsed.nutrientContributors?.proteinSources)
            ? parsed.nutrientContributors.proteinSources.map(String)
            : [],
          carbSources: Array.isArray(parsed.nutrientContributors?.carbSources)
            ? parsed.nutrientContributors.carbSources.map(String)
            : [],
          healthyFatSources: Array.isArray(parsed.nutrientContributors?.healthyFatSources)
            ? parsed.nutrientContributors.healthyFatSources.map(String)
            : [],
          fibreSources: Array.isArray(parsed.nutrientContributors?.fibreSources)
            ? parsed.nutrientContributors.fibreSources.map(String)
            : [],
        },
        educationalExplanation: String(parsed.educationalExplanation || ''),
        varietyAndBalanceSuggestions: Array.isArray(parsed.varietyAndBalanceSuggestions)
          ? parsed.varietyAndBalanceSuggestions.map(String).slice(0, 5)
          : [],
        allergenWatchNotice:
          String(parsed.allergenWatchNotice || '').trim() ||
          'Visual recognition cannot guarantee any dish is free from allergens or cross-contact. Verify ingredients directly.',
      });
    } catch (err: any) {
      const { status, message } = extractErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // Dev Vite middleware vs Production static build
  const distDir = path.join(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const useViteDev =
    process.env.NODE_ENV === 'development' ||
    (process.env.NODE_ENV !== 'production' && !fs.existsSync(distIndex));

  if (useViteDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found.' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LifeQuest server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start LifeQuest server:', err);
  process.exit(1);
});
