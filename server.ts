import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { registerSkillTreeRoutes } from './server/skillTreeService.ts';
import { createWeeklyBossService } from './server/weeklyBossService.ts';
import { createRivalService } from './server/rivalService.ts';
import { createCommunityEventsService } from './server/communityEventsService.ts';
import { createRecordsMuseumService } from './server/recordsMuseumService.ts';
import { createAiMentorService } from './server/aiMentorService.ts';
import { registerEcosystemDispatcherRoutes } from './server/ecosystemDispatcher.ts';
import { createNotificationService } from './server/notificationService.ts';
import { createIdentityService } from './server/identityService.ts';
import { createSeasonService } from './server/seasonService.ts';
import { createLeaderboardService } from './server/leaderboardService.ts';
import { attachPresenceAndPrivacySystem } from './server/presenceAndPrivacy.ts';
import { resolveVerifiedCaller } from './server/authGuard.ts';
import { GLOBAL_EXCLUSIVE_ACHIEVEMENTS } from './src/data/globalLegendsData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPort = (): number => {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return Number(process.env.DEFAULT_APP_PORT || 3000);
};

const PORT = getPort();
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
  const rawMsg = String(err?.message || 'AI request failed.');
  if (rawMsg.includes('GEMINI_API_KEY is not configured')) {
    return {
      status: 503,
      message: 'AI Mentor configuration is unavailable on the server right now. Please try again later.',
    };
  }
  const statusCode = Number(err?.status || err?.statusCode || 0);
  if (statusCode === 403 || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'AI service authentication failed. Please verify the configured server key.',
    };
  }
  if (statusCode === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'AI service rate limit reached temporarily. Please wait a moment and try again.',
    };
  }
  if (
    statusCode === 503 ||
    rawMsg.includes('"code":503') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.toLowerCase().includes('high demand') ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('ECONNRESET')
  ) {
    return {
      status: 503,
      message: 'The AI service is temporarily experiencing high demand. Please try again in a moment.',
    };
  }
  if (statusCode === 404 || rawMsg.includes('NOT_FOUND')) {
    return {
      status: 502,
      message: `AI model (${GEMINI_MODEL}) could not be reached right now.`,
    };
  }
  return {
    status: 500,
    message: rawMsg.startsWith('{') ? 'AI request encountered an unexpected server error. Please retry.' : rawMsg,
  };
};

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '25mb' }));

  const presenceHelper = attachPresenceAndPrivacySystem(app, httpServer, __dirname);

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

  // 3. Server-Side AI Dynamic Daily Quest Generator (Feature 10)
  const VALID_QUEST_CATEGORIES = new Set([
    'physical',
    'intellectual',
    'discipline',
    'personal_growth',
    'social',
  ]);
  const VALID_QUEST_DIFFICULTIES = new Set(['easy', 'medium', 'challenging', 'special']);
  const VALID_EVIDENCE_TYPES = new Set([
    'workout_minutes',
    'workout_sessions',
    'vision_reps',
    'habit_completions',
    'meal_logs',
    'water_glasses',
    'friend_interaction',
    'study_or_skill_reflection',
    'personal_reflection',
  ]);

  const defaultEvidenceForCategory = (cat: string): string => {
    switch (cat) {
      case 'physical':
        return 'workout_minutes';
      case 'intellectual':
        return 'study_or_skill_reflection';
      case 'discipline':
        return 'habit_completions';
      case 'personal_growth':
        return 'personal_reflection';
      case 'social':
        return 'friend_interaction';
      default:
        return 'personal_reflection';
    }
  };

  app.post('/api/ai/generate-daily-quests', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const periodKey = String(body.periodKey || new Date().toISOString().split('T')[0]);
      const player = body.player || {};
      const checkIn = body.checkIn || {};
      const recentTitles: string[] = Array.isArray(body.recentQuestTitles)
        ? body.recentQuestTitles.map(String).slice(0, 30)
        : [];

      const streak = Number(player.currentStreak || 0);
      const level = Number(player.level || 1);
      const yCompRate = Number(player.yesterdayCompletionRate ?? 0.5);
      const missedDays = Number(player.missedDaysEstimate || 0);
      const energyLevel = String(checkIn.energyLevel || 'medium');

      let adaptiveTier: 'gentle_comeback' | 'supportive' | 'balanced' | 'escalating' = 'balanced';
      if (missedDays >= 2 || (streak === 0 && yCompRate < 0.25)) {
        adaptiveTier = 'gentle_comeback';
      } else if (yCompRate < 0.45 || energyLevel === 'low') {
        adaptiveTier = 'supportive';
      } else if (streak >= 5 && yCompRate >= 0.75 && energyLevel !== 'low') {
        adaptiveTier = 'escalating';
      }

      const availableMinutes = Math.min(
        180,
        Math.max(10, Math.round(Number(checkIn.availableMinutes || 45)))
      );

      const ai = getGeminiClient();

      const systemInstruction = [
        'You are the Aetheria Quest Architect, an intelligent, empathetic RPG Mentor generating personalized daily real-life quests for LIFEQUEST.',
        'REQUIREMENTS:',
        '1. Generate EXACTLY 5 daily quests covering ALL 5 distinct categories once each: physical, intellectual, discipline, personal_growth, social.',
        '2. Difficulty balance across the 5 quests:',
        '   - 1 easy quest (difficulty="easy", isSpecialChallenge=false)',
        '   - 2 medium quests (difficulty="medium", isSpecialChallenge=false)',
        '   - 1 challenging quest (difficulty="challenging", isSpecialChallenge=false)',
        '   - 1 Special Daily Challenge (difficulty="special", isSpecialChallenge=true)',
        '3. ADAPTIVE DIFFICULTY:',
        `   Current computed adaptive tier: "${adaptiveTier}".`,
        '   - If gentle_comeback: lower friction, short achievable wins (5-15 min), encouraging comeback tone.',
        '   - If supportive: realistic medium steps tied directly to habits/incomplete tasks.',
        '   - If balanced: brisk rewarding routine fitting the player availableMinutes.',
        '   - If escalating: stretch goals with memorable RPG flair, never unsafe or overwhelming.',
        '4. NEVER repeat any quest title from recentQuestTitles.',
        '5. Map evidenceType strictly based on how progress can be verified honestly:',
        '   - Physical workout duration: "workout_minutes" (unitLabel="min", maxProgress 10..60) or "workout_sessions" (unitLabel="session", maxProgress=1..2) or "vision_reps" (unitLabel="reps", maxProgress 15..60)',
        '   - Discipline / habits / hydration / meals: "habit_completions" (unitLabel="habit", maxProgress=1..3), "meal_logs" (unitLabel="meal", maxProgress=1..3), or "water_glasses" (unitLabel="glasses", maxProgress=4..8)',
        '   - Intellectual / study / reading: "study_or_skill_reflection" (unitLabel="session", maxProgress=1)',
        '   - Personal Growth / confidence / planning: "personal_reflection" (unitLabel="milestone", maxProgress=1)',
        '   - Social / real-world connection or fellowship: "friend_interaction" (unitLabel="connection", maxProgress=1) or "personal_reflection" (unitLabel="outreach", maxProgress=1)',
        '6. Tailor each personalizationReason specifically to the player habits, goals, incomplete tasks, energyLevel, and availableMinutes.',
      ].join('\n');

      const userPrompt = JSON.stringify({
        periodKey,
        adaptiveTier,
        checkIn: {
          availableMinutes,
          energyLevel,
          focusNote: String(checkIn.focusNote || '').slice(0, 200),
        },
        playerContext: {
          username: String(player.username || 'Champion'),
          characterClass: String(player.characterClass || 'Warrior'),
          level,
          currentStreak: streak,
          personalGoals: Array.isArray(player.personalGoals) ? player.personalGoals : [],
          preferredActivities: Array.isArray(player.preferredActivities) ? player.preferredActivities : [],
          habits: Array.isArray(player.habits) ? player.habits.slice(0, 12) : [],
          incompleteClassicQuests: Array.isArray(player.incompleteClassicQuests) ? player.incompleteClassicQuests : [],
          recentAchievements: Array.isArray(player.recentAchievements) ? player.recentAchievements : [],
          yesterdaySummary: player.yesterdaySummary || {},
          struggleCategories: Array.isArray(player.struggleCategories) ? player.struggleCategories : [],
          preferredCategories: Array.isArray(player.preferredCategories) ? player.preferredCategories : [],
        },
        recentQuestTitles: recentTitles,
      });

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: [{ text: userPrompt }] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mentorGreeting: { type: Type.STRING },
              quests: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    objectiveLabel: { type: Type.STRING },
                    evidenceType: { type: Type.STRING },
                    maxProgress: { type: Type.INTEGER },
                    unitLabel: { type: Type.STRING },
                    estimatedMinutes: { type: Type.INTEGER },
                    playerXpReward: { type: Type.INTEGER },
                    forgeXpReward: { type: Type.INTEGER },
                    goldReward: { type: Type.INTEGER },
                    isSpecialChallenge: { type: Type.BOOLEAN },
                    personalizationReason: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'description',
                    'category',
                    'difficulty',
                    'objectiveLabel',
                    'evidenceType',
                    'maxProgress',
                    'unitLabel',
                    'estimatedMinutes',
                    'playerXpReward',
                    'forgeXpReward',
                    'goldReward',
                    'isSpecialChallenge',
                    'personalizationReason',
                  ],
                },
              },
            },
            required: ['mentorGreeting', 'quests'],
          },
        },
      });

      const parsed = parseGeminiJson<any>(response.text);
      const rawQuests = Array.isArray(parsed.quests) ? parsed.quests : [];
      if (rawQuests.length === 0) {
        res.status(502).json({ error: 'Quest generation returned an empty slate. Please retry.' });
        return;
      }

      const requiredCategories = ['physical', 'intellectual', 'discipline', 'personal_growth', 'social'];
      const seenTitles = new Set(recentTitles.map(t => t.toLowerCase().trim()));
      let specialAssigned = false;

      const sanitized = rawQuests.slice(0, 5).map((q: any, idx: number) => {
        const category = VALID_QUEST_CATEGORIES.has(q.category)
          ? String(q.category)
          : requiredCategories[idx % requiredCategories.length];

        let isSpecial = Boolean(q.isSpecialChallenge) || q.difficulty === 'special';
        if (isSpecial && specialAssigned) isSpecial = false;
        if (idx === rawQuests.slice(0, 5).length - 1 && !specialAssigned) isSpecial = true;
        if (isSpecial) specialAssigned = true;

        const difficulty = isSpecial
          ? 'special'
          : VALID_QUEST_DIFFICULTIES.has(q.difficulty) && q.difficulty !== 'special'
          ? String(q.difficulty)
          : idx === 0
          ? 'easy'
          : idx >= 3
          ? 'challenging'
          : 'medium';

        let evidenceType = VALID_EVIDENCE_TYPES.has(q.evidenceType)
          ? String(q.evidenceType)
          : defaultEvidenceForCategory(category);

        // Ensure intellectual & personal_growth use genuine reflection evidence unless valid
        if (category === 'intellectual' && !['study_or_skill_reflection', 'personal_reflection'].includes(evidenceType)) {
          evidenceType = 'study_or_skill_reflection';
        }
        if (category === 'personal_growth' && !['personal_reflection', 'study_or_skill_reflection', 'habit_completions'].includes(evidenceType)) {
          evidenceType = 'personal_reflection';
        }

        let maxProgress = Math.max(1, Math.min(200, Math.round(Number(q.maxProgress || 1))));
        if (evidenceType === 'study_or_skill_reflection' || evidenceType === 'personal_reflection') {
          maxProgress = 1;
        } else if (evidenceType === 'habit_completions' || evidenceType === 'meal_logs') {
          maxProgress = Math.min(3, Math.max(1, maxProgress));
        } else if (evidenceType === 'workout_sessions') {
          maxProgress = Math.min(2, Math.max(1, maxProgress));
        } else if (evidenceType === 'workout_minutes') {
          maxProgress = Math.min(Math.max(10, availableMinutes), Math.max(10, maxProgress));
        } else if (evidenceType === 'water_glasses') {
          maxProgress = Math.min(8, Math.max(4, maxProgress));
        }

        const baseMultiplier =
          difficulty === 'special' ? 1.55 : difficulty === 'challenging' ? 1.3 : difficulty === 'medium' ? 1.0 : 0.75;
        const playerXpReward = Math.min(180, Math.max(25, Math.round(Number(q.playerXpReward || 45 * baseMultiplier))));
        const forgeXpReward = Math.min(140, Math.max(15, Math.round(Number(q.forgeXpReward || 30 * baseMultiplier))));
        const goldReward = Math.min(160, Math.max(20, Math.round(Number(q.goldReward || 32 * baseMultiplier))));

        let title = String(q.title || `${category} Daily Trial`).trim().slice(0, 110);
        if (seenTitles.has(title.toLowerCase())) {
          title = `${title} (${periodKey.slice(5)})`;
        }
        seenTitles.add(title.toLowerCase());

        return {
          id: `dq-${periodKey}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
          periodKey,
          title,
          description: String(q.description || 'Complete this personalized real-world objective with integrity.').slice(0, 420),
          category,
          difficulty,
          objectiveLabel: String(q.objectiveLabel || 'Complete today’s objective').slice(0, 160),
          evidenceType,
          progress: 0,
          maxProgress,
          unitLabel: String(q.unitLabel || 'step').slice(0, 32),
          estimatedMinutes: Math.min(90, Math.max(5, Math.round(Number(q.estimatedMinutes || 15)))),
          playerXpReward,
          forgeXpReward,
          goldReward,
          isSpecialChallenge: isSpecial,
          personalizationReason: String(
            q.personalizationReason || 'Tailored to your recent habits, goals, and current momentum.'
          ).slice(0, 260),
          adaptiveTier,
          completed: false,
          claimed: false,
          createdAt: new Date().toISOString(),
        };
      });

      res.json({
        adaptiveTier,
        mentorGreeting: String(
          parsed.mentorGreeting ||
            'Your daily scroll has been forged from your genuine realm chronicle.'
        ).slice(0, 260),
        quests: sanitized,
      });
    } catch (err: any) {
      const { status, message } = extractErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Server-Side AI Daily Quest Report (Feature 11)
  app.post('/api/ai/daily-quest-report', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const reportDate = String(body.reportDate || new Date().toISOString().split('T')[0]);
      const yesterdayDate = String(body.yesterdayDate || reportDate);
      const metrics = body.metrics || {};

      const ai = getGeminiClient();

      const systemInstruction = [
        'You are the Aetheria Royal Chronicler & RPG Mentor writing a Player Daily Quest Report.',
        'STRICT GROUNDING RULES:',
        '1. Base EVERY statement exclusively on the provided real recorded metrics JSON.',
        '2. NEVER invent workouts, quests, XP, achievements, or habits that are 0 or absent in the metrics.',
        '3. When a category had 0 completions or no activity yesterday, acknowledge it honestly and gently offer a low-friction next step—never fabricate progress.',
        '4. Organize into: yesterdayPerformance summary, personalStrengths (at least 1 grounded observation), areasForImprovement (gentle actionable feedback), todayRecommendations (focused & realistic), and dailyRpgEvaluation (warm mentor narrative tying real-life effort to RPG character progression).',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              text: JSON.stringify({
                reportDate,
                yesterdayDate,
                metrics,
              }),
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              adaptiveTone: { type: Type.STRING },
              yesterdaySummary: { type: Type.STRING },
              personalStrengths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ['title', 'detail', 'category'],
                },
              },
              areasForImprovement: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    observation: { type: Type.STRING },
                    gentleAction: { type: Type.STRING },
                  },
                  required: ['area', 'observation', 'gentleAction'],
                },
              },
              todayRecommendations: {
                type: Type.OBJECT,
                properties: {
                  primaryFocus: { type: Type.STRING },
                  realisticGoals: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  specialChallengeAdvice: { type: Type.STRING },
                  suggestedMinutes: { type: Type.INTEGER },
                },
                required: ['primaryFocus', 'realisticGoals', 'specialChallengeAdvice', 'suggestedMinutes'],
              },
              dailyRpgEvaluation: {
                type: Type.OBJECT,
                properties: {
                  mentorTitle: { type: Type.STRING },
                  narrative: { type: Type.STRING },
                  longTermConnection: { type: Type.STRING },
                },
                required: ['mentorTitle', 'narrative', 'longTermConnection'],
              },
            },
            required: [
              'headline',
              'adaptiveTone',
              'yesterdaySummary',
              'personalStrengths',
              'areasForImprovement',
              'todayRecommendations',
              'dailyRpgEvaluation',
            ],
          },
        },
      });

      const parsed = parseGeminiJson<any>(response.text);

      const qComp = Math.max(0, Number(metrics.yesterdayQuestsCompleted || 0));
      const qTot = Math.max(0, Number(metrics.yesterdayQuestsTotal || 0));
      const hComp = Math.max(0, Number(metrics.yesterdayHabitsCompleted || 0));
      const wLogged = Math.max(0, Number(metrics.yesterdayWorkouts || 0));
      const mLogged = Math.max(0, Number(metrics.yesterdayMeals || 0));
      const cScore = Math.min(100, Math.max(0, Math.round(Number(metrics.consistencyScore || 0))));

      res.json({
        reportDate,
        yesterdayDate,
        headline: String(parsed.headline || 'Daily Chronicle of Progression'),
        adaptiveTone: String(parsed.adaptiveTone || 'Balanced Guidance'),
        yesterdayPerformance: {
          questsCompleted: qComp,
          questsTotal: qTot,
          habitsCompleted: hComp,
          workoutsLogged: wLogged,
          mealsLogged: mLogged,
          playerXpEarned: Math.max(0, Number(metrics.yesterdayPlayerXp || 0)),
          forgeXpEarned: Math.max(0, Number(metrics.yesterdayForgeXp || 0)),
          goldEarned: Math.max(0, Number(metrics.yesterdayGold || 0)),
          achievementsUnlocked: Math.max(0, Number(metrics.yesterdayAchievements || 0)),
          consistencyScore: cScore,
          summary: String(parsed.yesterdaySummary || ''),
        },
        personalStrengths: Array.isArray(parsed.personalStrengths)
          ? parsed.personalStrengths.slice(0, 4).map((s: any) => ({
              title: String(s.title || 'Steady Dedication'),
              detail: String(s.detail || ''),
              category: String(s.category || 'Discipline'),
            }))
          : [],
        areasForImprovement: Array.isArray(parsed.areasForImprovement)
          ? parsed.areasForImprovement.slice(0, 4).map((a: any) => ({
              area: String(a.area || 'Daily Balance'),
              observation: String(a.observation || ''),
              gentleAction: String(a.gentleAction || ''),
            }))
          : [],
        todayRecommendations: {
          primaryFocus: String(parsed.todayRecommendations?.primaryFocus || 'Steady Rhythm'),
          realisticGoals: Array.isArray(parsed.todayRecommendations?.realisticGoals)
            ? parsed.todayRecommendations.realisticGoals.map(String).slice(0, 4)
            : [],
          specialChallengeAdvice: String(
            parsed.todayRecommendations?.specialChallengeAdvice || 'Take one deliberate step toward your Special Daily Challenge.'
          ),
          suggestedMinutes: Math.min(
            180,
            Math.max(10, Math.round(Number(parsed.todayRecommendations?.suggestedMinutes || 30)))
          ),
        },
        dailyRpgEvaluation: {
          mentorTitle: String(parsed.dailyRpgEvaluation?.mentorTitle || 'Chronicle Evaluation'),
          narrative: String(parsed.dailyRpgEvaluation?.narrative || ''),
          longTermConnection: String(parsed.dailyRpgEvaluation?.longTermConnection || ''),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const { status, message } = extractErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Server-Side Atomic Ledger for Global Exclusive Achievements (Pre-Migration Fallback)
  const LEDGER_FILE_PATH = path.join(__dirname, '.lifequest_legends_ledger.json');
  interface LegendsLedgerFile {
    claims: Record<string, { achievementId: string; ownerId: string; ownerUsername: string; claimedAt: string }>;
    equippedByUser: Record<string, { achievementId: string; titleTag: string; titleStyle: string; emblemIcon: string }>;
    announcements: Array<{
      id: string;
      achievementId: string;
      achievementName: string;
      titleTag: string;
      titleStyle: string;
      emblemIcon: string;
      rarity: string;
      ownerId: string;
      ownerUsername: string;
      announcedAt: string;
    }>;
  }

  let ledgerLock: Promise<void> = Promise.resolve();
  const withLedgerLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    let release!: () => void;
    const prev = ledgerLock;
    ledgerLock = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const readLedger = (): LegendsLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_FILE_PATH)) {
        const raw = fs.readFileSync(LEDGER_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          claims: parsed?.claims || {},
          equippedByUser: parsed?.equippedByUser || {},
          announcements: Array.isArray(parsed?.announcements) ? parsed.announcements : [],
        };
      }
    } catch {
      // ignore corrupted ledger read
    }
    return { claims: {}, equippedByUser: {}, announcements: [] };
  };

  const writeLedger = (data: LegendsLedgerFile) => {
    fs.writeFileSync(LEDGER_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  app.get('/api/legends/state', async (_req: Request, res: Response) => {
    const ledger = await withLedgerLock(() => readLedger());
    res.json({
      claims: Object.values(ledger.claims),
      equippedByUser: ledger.equippedByUser,
      announcements: ledger.announcements.slice(0, 25),
    });
  });

  const safeJson = (filePath: string): any => {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch {
      // ignore corrupted read
    }
    return null;
  };

  const resolveServerVerifiedLegendMetric = (
    userId: string,
    requirementType: string
  ): number => {
    const socialLedger = safeJson(path.join(__dirname, '.lifequest_social_privacy_state.json'));
    const identityLedger = safeJson(path.join(__dirname, '.lifequest_identity_ledger.json'));
    const bossLedger = safeJson(path.join(__dirname, '.lifequest_weekly_boss.json'));
    const skillLedger = safeJson(path.join(__dirname, '.lifequest_skill_tree_ledger.json'));

    const syncedProfile = socialLedger?.profiles?.[userId] || {};
    const identUser = identityLedger?.users?.[userId];
    const snap = identUser?.verifiedSnapshot || {};
    const skillUser = skillLedger?.users?.[userId];

    const bossContribs = Array.isArray(bossLedger?.contributions)
      ? bossLedger.contributions.filter((c: any) => c.userId === userId)
      : [];
    const defeatedEventsParticipated = Array.isArray(bossLedger?.events)
      ? bossLedger.events.filter(
          (e: any) =>
            e.status === 'defeated' &&
            bossContribs.some((c: any) => c.eventId === e.id)
        ).length
      : 0;

    let skillActivities = 0;
    if (skillUser?.attributes) {
      for (const attr of Object.values(skillUser.attributes) as any[]) {
        skillActivities += Number(attr?.totalActivities || 0);
      }
    }

    switch (requirementType) {
      case 'level':
        return Math.max(Number(syncedProfile.level || 0), Number(snap.level || 0));
      case 'total_xp':
        return Number(syncedProfile.totalXp || 0);
      case 'current_streak':
        return Math.max(
          Number(syncedProfile.currentStreak || 0),
          Number(snap.longestStreak || 0),
          Number(snap.currentStreak || 0)
        );
      case 'total_workouts':
        return Math.max(
          Number(syncedProfile.totalWorkoutsCompleted || 0),
          Number(snap.totalWorkoutsCompleted || 0)
        );
      case 'total_verified_reps':
        return Math.max(
          Number(syncedProfile.totalVerifiedReps || 0),
          Number(snap.totalVerifiedReps || 0)
        );
      case 'total_bosses_defeated':
        return Math.max(
          Number(syncedProfile.totalBossesDefeated || 0),
          Number(snap.totalBossesDefeated || 0),
          defeatedEventsParticipated
        );
      case 'aether_points':
        return Number(syncedProfile.aetherPoints || 0);
      case 'habits_claimed_total':
        return Math.max(Number(snap.totalHabitsCompleted || 0), skillActivities);
      case 'normal_achievements_unlocked':
        return Math.max(
          Number(snap.totalAchievementsUnlocked || 0),
          Array.isArray(syncedProfile.achievements) ? syncedProfile.achievements.length : 0
        );
      case 'unlocked_weapons_count':
        return Number(syncedProfile.unlockedWeaponsCount || 0);
      case 'friends_count':
        return Array.isArray(syncedProfile.friendIds) ? syncedProfile.friendIds.length : 0;
      case 'guild_joined':
        return syncedProfile.guild?.id ? 1 : 0;
      case 'guild_leader':
        return syncedProfile.guild?.role === 'leader' ? 1 : 0;
      default:
        // For specialized counters tracked only in Supabase / pre-migration sync, look up server counters or 0
        return Number((syncedProfile as any)?.[requirementType] || 0);
    }
  };

  app.post('/api/legends/claim', async (req: Request, res: Response) => {
    const body = req.body || {};
    const caller = await resolveVerifiedCaller(req, {
      expectedOwnerId: body.ownerId ? String(body.ownerId) : undefined,
    });
    if (!caller.ok || !caller.userId) {
      res.status(caller.status || 401).json({
        success: false,
        error: caller.error || 'Authentication required.',
      });
      return;
    }

    const achievementId = String(body.achievementId || '').trim();
    if (!achievementId) {
      res.status(400).json({ success: false, error: 'Missing achievementId.' });
      return;
    }

    const achievementDef = GLOBAL_EXCLUSIVE_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievementDef) {
      res.status(400).json({ success: false, error: 'Unknown global exclusive achievement.' });
      return;
    }

    // Never trust client threshold, rewardPlayerXp, title, or inflated unverified progressValue
    if ('threshold' in body || 'rewardPlayerXp' in body) {
      res.status(400).json({
        success: false,
        error: 'Client-supplied thresholds or reward overrides are rejected.',
      });
      return;
    }

    const ownerId = caller.userId;
    const ownerUsername = String(body.ownerUsername || 'Champion').trim().slice(0, 48) || 'Champion';
    const verifiedProg = resolveServerVerifiedLegendMetric(ownerId, achievementDef.requirementType);
    if (verifiedProg < achievementDef.threshold) {
      res.status(400).json({
        success: false,
        error: `Verified requirement not yet met for ${achievementDef.name} (${verifiedProg}/${achievementDef.threshold}).`,
      });
      return;
    }

    const result = await withLedgerLock(() => {
      const ledger = readLedger();
      const existing = ledger.claims[achievementDef.id];
      if (existing) {
        return {
          status: 409,
          payload: {
            success: false,
            alreadyClaimedGlobally: true,
            ownerId: existing.ownerId,
            ownerUsername: existing.ownerUsername,
            claimedAt: existing.claimedAt,
            error: `This Global Exclusive Achievement has already been permanently claimed by ${existing.ownerUsername}.`,
          },
        };
      }

      const claimedAt = new Date().toISOString();
      const claimRecord = {
        achievementId: achievementDef.id,
        ownerId,
        ownerUsername,
        claimedAt,
      };
      ledger.claims[achievementDef.id] = claimRecord;
      ledger.equippedByUser[ownerId] = {
        achievementId: achievementDef.id,
        titleTag: achievementDef.titleTag,
        titleStyle: achievementDef.titleStyle,
        emblemIcon: achievementDef.emblemIcon,
      };
      ledger.announcements.unshift({
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        achievementId: achievementDef.id,
        achievementName: achievementDef.name,
        titleTag: achievementDef.titleTag,
        titleStyle: achievementDef.titleStyle,
        emblemIcon: achievementDef.emblemIcon,
        rarity: achievementDef.rarity,
        ownerId,
        ownerUsername,
        announcedAt: claimedAt,
      });
      ledger.announcements = ledger.announcements.slice(0, 50);
      writeLedger(ledger);

      return {
        status: 200,
        payload: {
          success: true,
          ownership: claimRecord,
          rewards: {
            rewardPlayerXp: 0, // Zero XP leaderboard inflation
            rewardForgeXp: achievementDef.rewardForgeXp,
            rewardGold: achievementDef.rewardGold,
          },
          announcements: ledger.announcements.slice(0, 25),
          equippedByUser: ledger.equippedByUser,
        },
      };
    });

    res.status(result.status).json(result.payload);
  });

  app.post('/api/legends/equip', async (req: Request, res: Response) => {
    const body = req.body || {};
    const caller = await resolveVerifiedCaller(req, {
      expectedOwnerId: body.ownerId ? String(body.ownerId) : undefined,
    });
    if (!caller.ok || !caller.userId) {
      res.status(caller.status || 401).json({
        success: false,
        error: caller.error || 'Authentication required.',
      });
      return;
    }

    const ownerId = caller.userId;
    const achievementId = body.achievementId ? String(body.achievementId).trim() : '';

    const result = await withLedgerLock(() => {
      const ledger = readLedger();
      if (!achievementId) {
        delete ledger.equippedByUser[ownerId];
        writeLedger(ledger);
        return { status: 200, payload: { success: true } };
      }

      const existing = ledger.claims[achievementId];
      if (!existing || existing.ownerId !== ownerId) {
        return {
          status: 403,
          payload: { success: false, error: 'You do not own this Global Exclusive Title.' },
        };
      }

      const def = GLOBAL_EXCLUSIVE_ACHIEVEMENTS.find(a => a.id === achievementId);
      ledger.equippedByUser[ownerId] = {
        achievementId,
        titleTag: def?.titleTag || 'LEGEND',
        titleStyle: def?.titleStyle || 'gold',
        emblemIcon: def?.emblemIcon || 'Crown',
      };
      writeLedger(ledger);
      return { status: 200, payload: { success: true } };
    });

    res.status(result.status).json(result.payload);
  });

  // 6. Real-Life Skill Tree Server-Authoritative Ledger Routes
  registerSkillTreeRoutes(app, __dirname);

  const notificationService = createNotificationService(__dirname);
  const identityService = createIdentityService(__dirname, {
    onIdentityUnlocked: async ({ userId, kind, itemId, itemName, rarity }) => {
      await notificationService.emitNotification({
        userId,
        category: 'player_progression',
        preferenceKey: 'achievement',
        eventKey: `identity_${kind}:${itemId}`,
        type: kind === 'title' ? 'title_unlocked' : 'badge_unlocked',
        title: kind === 'title' ? `New Title Earned: ${itemName}` : `Rare Badge Earned: ${itemName}`,
        body: `Unlocked a ${rarity} ${kind} from your verified real-life accomplishments.`,
        actionTab: 'character',
      });
    },
  });
  const seasonService = createSeasonService(__dirname, {
    onSeasonMilestoneReached: async ({ userId, seasonName, milestoneTitle, rewardLabel, milestoneId }) => {
      await notificationService.emitNotification({
        userId,
        category: 'game_world',
        preferenceKey: 'seasonal',
        eventKey: `season_ms:${milestoneId}`,
        type: 'season_milestone',
        title: `${milestoneTitle} Claimed`,
        body: `Earned ${rewardLabel} in ${seasonName}.`,
        actionTab: 'seasons',
      });
    },
  });
  const leaderboardService = createLeaderboardService(__dirname);

  const recordsMuseumService = createRecordsMuseumService(__dirname, {
    privacyHelper: presenceHelper,
  });
  const weeklyBossService = createWeeklyBossService(__dirname);
  const rivalService = createRivalService(__dirname, {
    getPresenceStatus: (targetUserId, viewerId) =>
      presenceHelper.computeEffectivePresenceForTarget(targetUserId, viewerId).status,
    onRivalryCompleted: async rivalry => {
      if (!rivalry.winnerId || rivalry.isTie) return;
      const winScore =
        rivalry.winnerId === rivalry.challengerId
          ? rivalry.challengerScore
          : rivalry.opponentScore;
      const opponentName =
        rivalry.winnerId === rivalry.challengerId
          ? rivalry.opponentName
          : rivalry.challengerName;
      await recordsMuseumService.archiveDirectMilestone({
        userId: rivalry.winnerId,
        idempotencyKey: `rivalry_win:${rivalry.id}`,
        category: 'rivalry',
        metricKey: `rivalry_win_${rivalry.id}`,
        title: `Rivals Victory: ${rivalry.challengeTitle}`,
        description: `Prevailed against ${opponentName} in a competitive Rivals match.`,
        numericValue: winScore,
        displayValue: `${winScore} pts`,
        trackAsPersonalBest: false,
        sourceActivityRef: `rivalry:${rivalry.id}`,
        rarity: 'Epic',
      });
      await notificationService.emitNotification({
        userId: rivalry.winnerId,
        category: 'social',
        preferenceKey: 'social',
        eventKey: `rival_win:${rivalry.id}`,
        type: 'rivalry_victory',
        title: 'Rivals Match Victory!',
        body: `You prevailed against ${opponentName} in ${rivalry.challengeTitle}.`,
        actionTab: 'rivals',
      });
    },
  });
  const communityEventsService = createCommunityEventsService(__dirname);
  const aiMentorService = createAiMentorService(__dirname, {
    geminiModel: GEMINI_MODEL,
    getGeminiClient,
    parseGeminiJson,
    extractErrorStatus,
  });

  weeklyBossService.registerRoutes(app);
  rivalService.registerRoutes(app);
  communityEventsService.registerRoutes(app);
  recordsMuseumService.registerRoutes(app);
  aiMentorService.registerRoutes(app);
  notificationService.registerRoutes(app);
  identityService.registerRoutes(app);
  seasonService.registerRoutes(app);
  leaderboardService.registerRoutes(app);
  registerEcosystemDispatcherRoutes(app, {
    weeklyBoss: weeklyBossService,
    rivals: rivalService,
    communityEvents: communityEventsService,
    museum: recordsMuseumService,
    seasons: seasonService,
    identity: identityService,
    notifications: notificationService,
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LifeQuest server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start LifeQuest server:', err);
  process.exit(1);
});
