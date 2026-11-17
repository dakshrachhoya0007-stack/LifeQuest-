import fs from 'fs';
import path from 'path';
import type { Express, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { validateMentorRecommendedQuest } from '../src/data/ecosystemData.ts';
import type {
  MentorChatMessage,
  MentorRecommendedQuest,
  MentorWeeklyAnalysis,
} from '../src/types/game.ts';

interface UserMentorStore {
  messages: MentorChatMessage[];
  recommendedQuests: MentorRecommendedQuest[];
  weeklyAnalyses: MentorWeeklyAnalysis[];
  requestTimestamps: number[];
}

interface AiMentorLedgerFile {
  users: Record<string, UserMentorStore>;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const MEDICAL_RED_FLAG_REGEX =
  /\b(chest pain|heart attack|faint|fainting|dizzy|dizziness|shortness of breath|sharp joint pain|fracture|torn|eating disorder|anorexia|bulimia|diagnose|medication|prescription|suicide|self-harm)\b/i;

export interface MinimizedMentorContext {
  username: string;
  characterClass: string;
  level: number;
  currentStreak: number;
  fitnessGoals: string[];
  recentWorkouts: Array<{ exercise: string; durationMinutes: number; reps?: number }>;
  personalRecords: Array<{ title: string; displayValue: string }>;
  skillTreeLevels: Record<string, number>;
  completedQuestsCount: number;
  recentAchievements: string[];
  waterGlassesToday: number;
  mealsLoggedCount: number;
}

export const sanitizeMentorPlayerContext = (raw: any): MinimizedMentorContext => {
  const ctx = raw && typeof raw === 'object' ? raw : {};
  return {
    username: String(ctx.username || 'Champion').slice(0, 32),
    characterClass: String(ctx.characterClass || 'Warrior').slice(0, 24),
    level: Math.max(1, Math.round(Number(ctx.level || 1))),
    currentStreak: Math.max(0, Math.round(Number(ctx.currentStreak || 0))),
    fitnessGoals: Array.isArray(ctx.fitnessGoals)
      ? ctx.fitnessGoals.map((g: any) => String(g).slice(0, 60)).slice(0, 6)
      : [],
    recentWorkouts: Array.isArray(ctx.recentWorkouts)
      ? ctx.recentWorkouts.slice(0, 8).map((w: any) => ({
          exercise: String(w.exercise || w.exerciseName || 'Workout').slice(0, 36),
          durationMinutes: Math.min(180, Math.max(0, Math.round(Number(w.durationMinutes || 0)))),
          reps: w.reps ? Math.min(500, Math.max(0, Math.round(Number(w.reps)))) : undefined,
        }))
      : [],
    personalRecords: Array.isArray(ctx.personalRecords)
      ? ctx.personalRecords.slice(0, 6).map((p: any) => ({
          title: String(p.title || '').slice(0, 48),
          displayValue: String(p.displayValue || '').slice(0, 24),
        }))
      : [],
    skillTreeLevels:
      ctx.skillTreeLevels && typeof ctx.skillTreeLevels === 'object'
        ? {
            strength: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.strength || 1))),
            endurance: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.endurance || 1))),
            discipline: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.discipline || 1))),
            focus: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.focus || 1))),
            resilience: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.resilience || 1))),
            vitality: Math.max(1, Math.min(10, Number(ctx.skillTreeLevels.vitality || 1))),
          }
        : {},
    completedQuestsCount: Math.max(0, Math.round(Number(ctx.completedQuestsCount || 0))),
    recentAchievements: Array.isArray(ctx.recentAchievements)
      ? ctx.recentAchievements.map((a: any) => String(a).slice(0, 48)).slice(0, 6)
      : [],
    waterGlassesToday: Math.max(0, Math.min(20, Math.round(Number(ctx.waterGlassesToday || 0)))),
    mealsLoggedCount: Math.max(0, Math.min(20, Math.round(Number(ctx.mealsLoggedCount || 0)))),
  };
};

export function createAiMentorService(
  rootDir: string,
  opts: {
    geminiModel: string;
    getGeminiClient: () => GoogleGenAI;
    parseGeminiJson: <T>(text: string | undefined) => T;
    extractErrorStatus: (err: any) => { status: number; message: string };
  }
) {
  const LEDGER_PATH = path.join(rootDir, '.lifequest_ai_mentor.json');
  let queue: Promise<void> = Promise.resolve();

  const withLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
    let release!: () => void;
    const prev = queue;
    queue = new Promise<void>(resolve => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  };

  const readLedger = (): AiMentorLedgerFile => {
    try {
      if (fs.existsSync(LEDGER_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
        if (parsed && typeof parsed === 'object' && parsed.users) {
          return { users: parsed.users };
        }
      }
    } catch {
      // ignore corrupted read
    }
    return { users: {} };
  };

  const writeLedger = (data: AiMentorLedgerFile) => {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), 'utf8');
  };

  const ensureUser = (ledger: AiMentorLedgerFile, userId: string): UserMentorStore => {
    if (!ledger.users[userId]) {
      ledger.users[userId] = {
        messages: [],
        recommendedQuests: [],
        weeklyAnalyses: [],
        requestTimestamps: [],
      };
    }
    return ledger.users[userId];
  };

  const checkAndRecordRateLimit = async (userId: string): Promise<{ allowed: boolean; retryAfterSec?: number }> => {
    return withLock(() => {
      const ledger = readLedger();
      const userStore = ensureUser(ledger, userId);
      const now = Date.now();
      userStore.requestTimestamps = userStore.requestTimestamps.filter(
        ts => now - ts < RATE_LIMIT_WINDOW_MS
      );
      if (userStore.requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        const oldest = userStore.requestTimestamps[0];
        const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000));
        writeLedger(ledger);
        return { allowed: false, retryAfterSec };
      }
      userStore.requestTimestamps.push(now);
      writeLedger(ledger);
      return { allowed: true };
    });
  };

  const registerRoutes = (app: Express) => {
    app.get('/api/mentor/state', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }
      const queryUid = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      if (queryUid && queryUid !== userId) {
        res.status(403).json({ success: false, error: 'Forbidden: mentor conversations are private.' });
        return;
      }

      const state = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, userId);
        return {
          messages: u.messages.slice(-50),
          recommendedQuests: u.recommendedQuests.slice(0, 15),
          latestWeeklyAnalysis: u.weeklyAnalyses[0] || null,
        };
      });

      res.json({ success: true, ...state });
    });

    app.post('/api/mentor/chat', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const message = String(body.message || '').trim();
      if (message.length < 2 || message.length > 1000) {
        res.status(400).json({ success: false, error: 'Please enter a coaching question (2-1000 characters).' });
        return;
      }

      const rate = await checkAndRecordRateLimit(userId);
      if (!rate.allowed) {
        res.status(429).json({
          success: false,
          error: `Mentor rate limit reached. Please wait ${rate.retryAfterSec}s before sending another message.`,
        });
        return;
      }

      const hasMedicalFlag = MEDICAL_RED_FLAG_REGEX.test(message);
      const safeContext = sanitizeMentorPlayerContext(body.playerContext);

      try {
        const ai = opts.getGeminiClient();

        const recentHistory = await withLock(() => {
          const ledger = readLedger();
          const u = ensureUser(ledger, userId);
          return u.messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
        });

        const systemInstruction = [
          'You are Master Eldric, the wise, practical AI Fitness & Life-Progression Mentor inside LIFEQUEST.',
          'STRICT BOUNDARIES & INTEGRITY:',
          '1. Ground every observation strictly in the caller playerContext JSON provided. Never invent workouts, PRs, or XP the player has not logged.',
          '2. NEVER provide medical diagnosis, prescribe treatment, or recommend extreme calorie restriction, dehydration, or unsafe overtraining.',
          hasMedicalFlag
            ? '3. CRITICAL SAFETY NOTICE: The player mentioned potential pain, injury, or medical symptoms. Express empathy, advise pausing strenuous activity for that symptom, and clearly recommend consulting a qualified physician or licensed healthcare professional. Do NOT prescribe exercises for pain/injury.'
            : '3. Emphasize balanced progressive consistency, form quality, sleep/hydration recovery, and realistic weekly habits.',
          '4. You CANNOT directly award XP, Gold, Rank, or Boss damage. You may optionally propose ONE safe, realistic recommendedQuest when helpful; if inappropriate (e.g. injury/rest), set includeQuest=false.',
          '5. Keep advice warm, concise, structured, and genuinely tailored to the player.',
        ].join('\n');

        const response = await ai.models.generateContent({
          model: opts.geminiModel,
          contents: {
            parts: [
              {
                text: JSON.stringify({
                  playerMessage: message,
                  playerContext: safeContext,
                  recentHistory,
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
                reply: { type: Type.STRING },
                focusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                recoveryAdvice: { type: Type.STRING },
                safetyNotice: { type: Type.STRING },
                includeQuest: { type: Type.BOOLEAN },
                recommendedQuest: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    estimatedMinutes: { type: Type.INTEGER },
                    objectiveLabel: { type: Type.STRING },
                    evidenceType: { type: Type.STRING },
                    maxProgress: { type: Type.INTEGER },
                    unitLabel: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                },
              },
              required: ['reply', 'focusAreas', 'recoveryAdvice', 'includeQuest'],
            },
          },
        });

        const parsed = opts.parseGeminiJson<any>(response.text);
        if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
          res.status(502).json({ success: false, error: 'AI Mentor returned an invalid or empty response.' });
          return;
        }

        let validatedQuest: MentorRecommendedQuest | null = null;
        if (parsed.includeQuest && !hasMedicalFlag && parsed.recommendedQuest) {
          const check = validateMentorRecommendedQuest(parsed.recommendedQuest);
          if (check.valid && check.quest) {
            validatedQuest = {
              ...check.quest,
              id: `mq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accepted: false,
              createdAt: new Date().toISOString(),
            };
          }
        }

        const nowIso = new Date().toISOString();
        const userMsg: MentorChatMessage = {
          id: `mmsg-u-${Date.now()}`,
          role: 'user',
          content: message,
          createdAt: nowIso,
        };

        const safetyNotice = hasMedicalFlag
          ? String(
              parsed.safetyNotice ||
                'For pain, dizziness, or medical symptoms, pause strenuous exercise and consult a qualified healthcare professional.'
            )
          : parsed.safetyNotice
          ? String(parsed.safetyNotice).slice(0, 220)
          : undefined;

        const mentorMsg: MentorChatMessage = {
          id: `mmsg-m-${Date.now() + 1}`,
          role: 'mentor',
          content: String(parsed.reply).trim().slice(0, 1800),
          focusAreas: Array.isArray(parsed.focusAreas)
            ? parsed.focusAreas.map((f: any) => String(f).slice(0, 48)).slice(0, 4)
            : [],
          recoveryAdvice: parsed.recoveryAdvice ? String(parsed.recoveryAdvice).slice(0, 300) : undefined,
          safetyNotice,
          recommendedQuest: validatedQuest,
          createdAt: new Date().toISOString(),
        };

        const persistedState = await withLock(() => {
          const ledger = readLedger();
          const u = ensureUser(ledger, userId);
          u.messages.push(userMsg, mentorMsg);
          if (u.messages.length > 80) u.messages = u.messages.slice(-80);
          if (validatedQuest) {
            u.recommendedQuests.unshift(validatedQuest);
            if (u.recommendedQuests.length > 30) u.recommendedQuests = u.recommendedQuests.slice(0, 30);
          }
          writeLedger(ledger);
          return {
            messages: u.messages.slice(-50),
            recommendedQuests: u.recommendedQuests.slice(0, 15),
          };
        });

        res.json({
          success: true,
          mentorMessage: mentorMsg,
          ...persistedState,
        });
      } catch (err: any) {
        const { status, message: errMsg } = opts.extractErrorStatus(err);
        res.status(status).json({ success: false, error: errMsg });
      }
    });

    app.post('/api/mentor/weekly-analysis', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const rate = await checkAndRecordRateLimit(userId);
      if (!rate.allowed) {
        res.status(429).json({
          success: false,
          error: `Mentor rate limit reached. Please wait ${rate.retryAfterSec}s before requesting weekly analysis.`,
        });
        return;
      }

      const safeContext = sanitizeMentorPlayerContext(req.body?.playerContext);

      try {
        const ai = opts.getGeminiClient();
        const systemInstruction = [
          'You are Master Eldric conducting a Weekly Fitness & Progression Review for LIFEQUEST.',
          'Base every insight strictly on the real playerContext provided. Never fabricate workouts or records.',
          'Provide honest strengths, constructive improvement areas, a realistic 3-step plan for the coming week, and supportive recovery guidance.',
        ].join('\n');

        const response = await ai.models.generateContent({
          model: opts.geminiModel,
          contents: { parts: [{ text: JSON.stringify({ playerContext: safeContext }) }] },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                realisticPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
                recoveryRecommendation: { type: Type.STRING },
              },
              required: ['summary', 'strengths', 'improvementAreas', 'realisticPlan', 'recoveryRecommendation'],
            },
          },
        });

        const parsed = opts.parseGeminiJson<any>(response.text);
        if (!parsed || typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
          res.status(502).json({ success: false, error: 'Weekly analysis returned an invalid payload.' });
          return;
        }

        const analysis: MentorWeeklyAnalysis = {
          summary: String(parsed.summary).slice(0, 600),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 4) : [],
          improvementAreas: Array.isArray(parsed.improvementAreas)
            ? parsed.improvementAreas.map(String).slice(0, 4)
            : [],
          realisticPlan: Array.isArray(parsed.realisticPlan)
            ? parsed.realisticPlan.map(String).slice(0, 4)
            : [],
          recoveryRecommendation: String(parsed.recoveryRecommendation || '').slice(0, 320),
          generatedAt: new Date().toISOString(),
        };

        await withLock(() => {
          const ledger = readLedger();
          const u = ensureUser(ledger, userId);
          u.weeklyAnalyses.unshift(analysis);
          if (u.weeklyAnalyses.length > 10) u.weeklyAnalyses = u.weeklyAnalyses.slice(0, 10);
          writeLedger(ledger);
        });

        res.json({ success: true, analysis });
      } catch (err: any) {
        const { status, message: errMsg } = opts.extractErrorStatus(err);
        res.status(status).json({ success: false, error: errMsg });
      }
    });

    app.post('/api/mentor/accept-quest', async (req: Request, res: Response) => {
      const userId = String(req.headers['x-lifequest-user-id'] || '').trim();
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
      }

      const questId = String(req.body?.questId || '').trim();
      if (!questId) {
        res.status(400).json({ success: false, error: 'Missing questId.' });
        return;
      }

      const outcome = await withLock(() => {
        const ledger = readLedger();
        const u = ensureUser(ledger, userId);
        const q = u.recommendedQuests.find(item => item.id === questId);
        if (!q) {
          return { status: 404, payload: { success: false, error: 'Recommended quest not found.' } };
        }
        if (q.accepted) {
          return { status: 409, payload: { success: false, error: 'Quest already accepted onto your board.' } };
        }
        const recheck = validateMentorRecommendedQuest(q);
        if (!recheck.valid) {
          return { status: 400, payload: { success: false, error: recheck.reason || 'Quest failed safety validation.' } };
        }
        q.accepted = true;
        writeLedger(ledger);
        return {
          status: 200,
          payload: {
            success: true,
            quest: q,
            recommendedQuests: u.recommendedQuests.slice(0, 15),
          },
        };
      });

      res.status(outcome.status).json(outcome.payload);
    });
  };

  return { registerRoutes };
}
