import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import {
  DietaryPreference,
  ExerciseType,
  FoodVisionAnalysis,
  MealType,
  WorkoutVisionAnalysis,
} from '../../types/game';
import { createIdempotencyKey } from '../../services/unifiedBackendService';
import {
  getAgeAppropriateActivityGuidance,
  isMinorUser,
  resolveAgeGroupFromUser,
} from '../../utils/nutritionGuidance';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Camera,
  CameraOff,
  Shield,
  Activity,
  Sparkles,
  CheckCircle2,
  Info,
  Flame,
  Zap,
  Upload,
  Video,
  Image as ImageIcon,
  Utensils,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  Coins,
  RefreshCw,
} from 'lucide-react';

type VisionTab = 'workout_media' | 'live_camera' | 'food_photo';

interface ConfirmedRewardState {
  kind: 'workout' | 'meal';
  title: string;
  playerXp: number;
  forgeXp: number;
  gold: number;
  aetherPoints: number;
  buffActivated?: boolean;
  deduplicated?: boolean;
  dailyCapReached?: boolean;
  reps?: number;
  durationMinutes?: number;
  verifiedWithVision?: boolean;
}

const EXERCISE_OPTIONS: {
  id: ExerciseType;
  name: string;
  targetMuscles: string;
  instructions: string;
  forgeXpPerRep: number;
}[] = [
  {
    id: 'squat',
    name: 'Squats',
    targetMuscles: 'Quadriceps, Glutes, Core',
    instructions: 'Stand shoulder-width apart. Lower hips with chest lifted, then press back up smoothly.',
    forgeXpPerRep: 5,
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    targetMuscles: 'Chest, Triceps, Shoulders',
    instructions: 'Keep torso braced in a straight line. Lower chest steadily and press back to extension.',
    forgeXpPerRep: 6,
  },
  {
    id: 'jumping_jack',
    name: 'Jumping Jacks',
    targetMuscles: 'Cardio, Calves, Deltoids',
    instructions: 'Jump while spreading feet and raising arms overhead, then return cleanly.',
    forgeXpPerRep: 3,
  },
  {
    id: 'lunge',
    name: 'Lunges',
    targetMuscles: 'Hamstrings, Glutes, Balance',
    instructions: 'Step forward smoothly, lower back knee with control, and drive back to standing.',
    forgeXpPerRep: 5,
  },
  {
    id: 'knee_raise',
    name: 'Standing Knee Raises',
    targetMuscles: 'Hip Flexors, Core, Balance',
    instructions: 'Stand tall and lift alternating knees toward hip height at a controlled tempo.',
    forgeXpPerRep: 4,
  },
  {
    id: 'walking',
    name: 'Walking',
    targetMuscles: 'Cardiovascular Endurance, Legs',
    instructions: 'Brisk, upright stride with relaxed shoulders and steady arm swing.',
    forgeXpPerRep: 3,
  },
  {
    id: 'running',
    name: 'Running',
    targetMuscles: 'Cardio, Calves, Quads, Stamina',
    instructions: 'Balanced cadence with upright posture and controlled breathing.',
    forgeXpPerRep: 4,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    targetMuscles: 'Quads, Hamstrings, Cardiovascular',
    instructions: 'Smooth pedal cadence with neutral spine alignment.',
    forgeXpPerRep: 4,
  },
  {
    id: 'gym',
    name: 'Strength / Gym Training',
    targetMuscles: 'Full Body / Resistance',
    instructions: 'Controlled eccentric and concentric form through comfortable range of motion.',
    forgeXpPerRep: 5,
  },
  {
    id: 'yoga',
    name: 'Yoga & Mobility',
    targetMuscles: 'Mobility, Balance, Breath, Core',
    instructions: 'Steady nasal breathing and mindful joint alignment without forcing range.',
    forgeXpPerRep: 3,
  },
];

const CAMERA_EXERCISES = EXERCISE_OPTIONS.slice(0, 5);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });

const ConfidenceBadge: React.FC<{ confidence: number; level: 'low' | 'medium' | 'high' }> = ({
  confidence,
  level,
}) => {
  const tone =
    level === 'high'
      ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
      : level === 'medium'
      ? 'bg-amber-950/70 border-amber-700/70 text-amber-300'
      : 'bg-rose-950/70 border-rose-700/70 text-rose-300';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${tone}`}>
      <span>Confidence: {confidence}%</span>
      <span className="uppercase text-[10px] opacity-80">({level})</span>
    </span>
  );
};

export const AetherVisionView: React.FC = () => {
  const { logFitnessSession, logMeal, user, setActiveTab } = useGame();

  const [visionTab, setVisionTab] = useState<VisionTab>('workout_media');

  // Shared confirmation & error banners
  const [confirmedReward, setConfirmedReward] = useState<ConfirmedRewardState | null>(null);

  // ---------------------------------------------------------------------------
  // 1. WORKOUT IMAGE / VIDEO AI VISION STATE
  // ---------------------------------------------------------------------------
  const [workoutMediaPreview, setWorkoutMediaPreview] = useState<string | null>(null);
  const [workoutMediaKind, setWorkoutMediaKind] = useState<'image' | 'video'>('image');
  const [workoutMediaMime, setWorkoutMediaMime] = useState<string>('image/jpeg');
  const [workoutHint, setWorkoutHint] = useState<ExerciseType>('squat');
  const [isAnalyzingWorkout, setIsAnalyzingWorkout] = useState(false);
  const [workoutVisionError, setWorkoutVisionError] = useState<string | null>(null);
  const [workoutAnalysis, setWorkoutAnalysis] = useState<WorkoutVisionAnalysis | null>(null);

  // Editable user confirmation fields before logging workout
  const [confirmExerciseType, setConfirmExerciseType] = useState<ExerciseType>('squat');
  const [confirmExerciseName, setConfirmExerciseName] = useState<string>('Squats');
  const [confirmReps, setConfirmReps] = useState<number>(0);
  const [confirmDurationMin, setConfirmDurationMin] = useState<number>(10);
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [workoutIdempotencyKey, setWorkoutIdempotencyKey] = useState<string>('');
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [workoutSaveError, setWorkoutSaveError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 2. LIVE CAMERA OPTICAL MOTION TRACKING STATE
  // ---------------------------------------------------------------------------
  const [selectedCameraExercise, setSelectedCameraExercise] = useState<ExerciseType>('squat');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSandboxDemo, setIsSandboxDemo] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [motionScore, setMotionScore] = useState(0);
  const [exerciseState, setExerciseState] = useState<'READY' | 'ACTIVE_PHASE' | 'PEAK'>('READY');
  const [feedback, setFeedback] = useState(
    'Frame your upper and lower body clearly. Repetitions are counted from real optical movement cycles.'
  );
  const [workoutDurationSec, setWorkoutDurationSec] = useState(0);
  const [cameraReviewOpen, setCameraReviewOpen] = useState(false);
  const [cameraIdempotencyKey, setCameraIdempotencyKey] = useState<string>('');
  const [cameraSaveError, setCameraSaveError] = useState<string | null>(null);
  const [isSavingCamera, setIsSavingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const smoothedMotionRef = useRef<number>(0);
  const motionStageRef = useRef<'IDLE' | 'MOVING_PEAK'>('IDLE');
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRepTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const directionRef = useRef<number>(1);
  const isTrackingRef = useRef<boolean>(false);

  // ---------------------------------------------------------------------------
  // 3. FOOD & MEAL AI VISION STATE
  // ---------------------------------------------------------------------------
  const [foodImagePreview, setFoodImagePreview] = useState<string | null>(null);
  const [foodMimeType, setFoodMimeType] = useState<string>('image/jpeg');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [foodVisionError, setFoodVisionError] = useState<string | null>(null);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodVisionAnalysis | null>(null);

  // Editable meal confirmation state
  const [editableMealTitle, setEditableMealTitle] = useState('');
  const [editableDietCategory, setEditableDietCategory] = useState<DietaryPreference>(
    user?.dietaryPreference || 'vegetarian'
  );
  const [editableFoodItems, setEditableFoodItems] = useState<string[]>([]);
  const [newFoodItemInput, setNewFoodItemInput] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [mealIdempotencyKey, setMealIdempotencyKey] = useState<string>('');
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [mealSaveError, setMealSaveError] = useState<string | null>(null);

  const userAgeGroup = resolveAgeGroupFromUser(user);
  const minorUser = isMinorUser(user);
  const activityGuide = getAgeAppropriateActivityGuidance(user);
  const currentCameraExercise =
    CAMERA_EXERCISES.find(e => e.id === selectedCameraExercise) || CAMERA_EXERCISES[0];

  // ===========================================================================
  // WORKOUT MEDIA UPLOAD & GEMINI VISION HANDLERS
  // ===========================================================================
  const handleWorkoutFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorkoutVisionError(null);
    setWorkoutSaveError(null);
    setWorkoutAnalysis(null);

    if (file.size > 16 * 1024 * 1024) {
      setWorkoutVisionError(
        'File is larger than 16 MB. Please upload a shorter clip or compressed photo.'
      );
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      setWorkoutVisionError('Please select a valid image (JPG, PNG, WebP) or video (MP4, WebM, MOV).');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setWorkoutMediaPreview(dataUrl);
      setWorkoutMediaKind(isVideo ? 'video' : 'image');
      setWorkoutMediaMime(file.type || (isVideo ? 'video/mp4' : 'image/jpeg'));
    } catch (err: any) {
      setWorkoutVisionError(err?.message || 'Unable to read uploaded file.');
    }
  };

  const handleAnalyzeWorkoutMedia = async () => {
    if (!workoutMediaPreview) return;
    setIsAnalyzingWorkout(true);
    setWorkoutVisionError(null);
    setWorkoutSaveError(null);

    try {
      const resp = await fetch('/api/vision/analyze-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaBase64: workoutMediaPreview,
          mimeType: workoutMediaMime,
          mediaKind: workoutMediaKind,
          selectedExerciseHint: workoutHint,
          userContext: {
            ageYears: user?.ageYears,
            ageGroup: userAgeGroup,
            activityLevel: user?.activityLevel,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setWorkoutVisionError(data?.error || 'Workout AI analysis failed.');
        return;
      }

      const analysis = data as WorkoutVisionAnalysis;
      setWorkoutAnalysis(analysis);
      const mappedType: ExerciseType =
        analysis.exerciseType !== 'unknown' ? analysis.exerciseType : workoutHint;
      setConfirmExerciseType(mappedType);
      setConfirmExerciseName(
        analysis.identified
          ? analysis.exerciseName
          : EXERCISE_OPTIONS.find(o => o.id === mappedType)?.name || 'Physical Activity'
      );
      setConfirmReps(analysis.repsSupported ? analysis.estimatedReps : 0);
      setConfirmDurationMin(
        analysis.durationSupported && analysis.estimatedDurationMinutes > 0
          ? Math.max(1, Math.round(analysis.estimatedDurationMinutes))
          : 10
      );
      setConfirmNotes(
        analysis.observations?.length
          ? `Aether Vision (${analysis.mediaKind}): ${analysis.observations[0]}`
          : ''
      );
      setWorkoutIdempotencyKey(createIdempotencyKey());
    } catch (err: any) {
      setWorkoutVisionError(
        err?.message || 'Network error contacting Aether Vision server.'
      );
    } finally {
      setIsAnalyzingWorkout(false);
    }
  };

  const handleConfirmWorkoutMediaLog = async () => {
    if (!workoutAnalysis) return;
    setIsSavingWorkout(true);
    setWorkoutSaveError(null);

    // Integrity rule: only mark verifiedWithAetherVision=true if Gemini verified real video repetition cycles
    const isVisionRepVerified = Boolean(
      workoutAnalysis.mediaKind === 'video' &&
        workoutAnalysis.repsSupported &&
        confirmReps > 0 &&
        workoutAnalysis.confidence >= 60
    );

    const idemKey = workoutIdempotencyKey || createIdempotencyKey();
    if (!workoutIdempotencyKey) setWorkoutIdempotencyKey(idemKey);

    const result = await logFitnessSession({
      exerciseType: confirmExerciseType,
      exerciseName: confirmExerciseName.trim() || 'Workout Session',
      repetitions: confirmReps > 0 ? confirmReps : undefined,
      durationMinutes: Math.max(1, Math.round(confirmDurationMin || 1)),
      verifiedWithAetherVision: isVisionRepVerified,
      confidence: workoutAnalysis.confidence,
      observations: workoutAnalysis.observations,
      notes:
        confirmNotes.trim() ||
        `Aether Vision ${workoutAnalysis.mediaKind} analysis (Confidence ${workoutAnalysis.confidence}%).`,
      idempotencyKey: idemKey,
    });

    setIsSavingWorkout(false);

    if (!result.success) {
      setWorkoutSaveError(result.error || 'Could not save workout right now. Please try again.');
      return;
    }

    if (!result.deduplicated && !result.dailyCapReached) {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#fbbf24', '#38bdf8'],
      });
    }

    setConfirmedReward({
      kind: 'workout',
      title: confirmExerciseName.trim() || 'Workout Logged',
      playerXp: result.rewards?.playerXp ?? 0,
      forgeXp: result.rewards?.forgeXp ?? 0,
      gold: result.rewards?.gold ?? 0,
      aetherPoints: result.rewards?.aetherPoints ?? 0,
      buffActivated: result.rewards?.buffActivated,
      deduplicated: result.deduplicated,
      dailyCapReached: result.dailyCapReached,
      reps: confirmReps > 0 ? confirmReps : undefined,
      durationMinutes: Math.max(1, Math.round(confirmDurationMin || 1)),
      verifiedWithVision: isVisionRepVerified,
    });
  };

  // ===========================================================================
  // LIVE CAMERA REAL OPTICAL MOTION TRACKING
  // ===========================================================================
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    prevLumaRef.current = null;
    smoothedMotionRef.current = 0;
    motionStageRef.current = 'IDLE';
    isTrackingRef.current = false;
    setIsCameraActive(false);
  }, []);

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setWorkoutDurationSec(prev => prev + 1);
    }, 1000);
  };

  const startOpticalMotionLoop = (sandbox: boolean) => {
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas');
      motionCanvasRef.current.width = 64;
      motionCanvasRef.current.height = 48;
    }

    const renderFrame = () => {
      if (!isTrackingRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const mCanvas = motionCanvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!sandbox && video && video.readyState >= 2) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            // Mirror video feed
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();

            ctx.fillStyle = 'rgba(12, 8, 24, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Real frame-to-frame optical motion analysis on 64x48 grid
            if (mCanvas) {
              const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });
              if (mCtx) {
                mCtx.drawImage(video, 0, 0, 64, 48);
                const imgData = mCtx.getImageData(0, 0, 64, 48).data;
                const totalPixels = 64 * 48;
                const currLuma = new Uint8Array(totalPixels);
                let changedPixels = 0;
                let motionYWeighted = 0;

                for (let i = 0; i < totalPixels; i++) {
                  const idx = i * 4;
                  const luma = (imgData[idx] * 3 + imgData[idx + 1] * 6 + imgData[idx + 2]) / 10;
                  currLuma[i] = luma;
                  if (prevLumaRef.current) {
                    const diff = Math.abs(luma - prevLumaRef.current[i]);
                    if (diff > 22) {
                      changedPixels++;
                      const yRow = Math.floor(i / 64);
                      motionYWeighted += yRow;
                    }
                  }
                }
                prevLumaRef.current = currLuma;

                const motionRatio = changedPixels / totalPixels;
                const pct = Math.min(100, Math.round(motionRatio * 420));
                smoothedMotionRef.current = smoothedMotionRef.current * 0.7 + pct * 0.3;
                const smooth = Math.round(smoothedMotionRef.current);
                setMotionScore(smooth);

                // Visual motion reticle bar
                const barW = Math.min(canvas.width - 32, Math.round((smooth / 100) * (canvas.width - 32)));
                ctx.fillStyle = smooth > 20 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(168, 85, 247, 0.5)';
                ctx.fillRect(16, canvas.height - 14, barW, 6);

                const now = Date.now();
                const avgY = changedPixels > 0 ? motionYWeighted / changedPixels / 48 : 0.5;
                if (smooth >= 26 && motionStageRef.current === 'IDLE') {
                  motionStageRef.current = 'MOVING_PEAK';
                  setExerciseState('PEAK');
                  setFeedback(
                    avgY > 0.5
                      ? 'Active movement detected in lower frame — complete full return!'
                      : 'Strong movement impulse detected — maintain controlled form!'
                  );
                } else if (smooth <= 12 && motionStageRef.current === 'MOVING_PEAK') {
                  motionStageRef.current = 'IDLE';
                  setExerciseState('READY');
                  if (now - lastRepTimeRef.current > 1100) {
                    lastRepTimeRef.current = now;
                    setRepCount(prev => {
                      const next = prev + 1;
                      sound.playRepCount();
                      setFeedback(`Repetition ${next} counted from real camera motion cycle!`);
                      return next;
                    });
                  }
                } else if (smooth > 12 && smooth < 26 && motionStageRef.current === 'IDLE') {
                  setExerciseState('ACTIVE_PHASE');
                }
              }
            }
          } else if (sandbox) {
            // Explicit Sandbox Demonstration Mode (clearly labeled, never counts as AI verified)
            canvas.width = 640;
            canvas.height = 360;
            ctx.fillStyle = '#090714';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            phaseRef.current += 0.025 * directionRef.current;
            if (phaseRef.current >= 1) {
              phaseRef.current = 1;
              directionRef.current = -1;
            } else if (phaseRef.current <= 0) {
              phaseRef.current = 0;
              directionRef.current = 1;
            }
            const t = phaseRef.current;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const dip = selectedCameraExercise === 'squat' ? t * 48 : 0;

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy - 80 + dip, 18, 0, Math.PI * 2);
            ctx.moveTo(cx, cy - 62 + dip);
            ctx.lineTo(cx, cy + 15 + dip);
            ctx.moveTo(cx - 42, cy - 35 + dip);
            ctx.lineTo(cx + 42, cy - 35 + dip);
            ctx.moveTo(cx, cy + 15 + dip);
            ctx.lineTo(cx - 28, cy + 95);
            ctx.moveTo(cx, cy + 15 + dip);
            ctx.lineTo(cx + 28, cy + 95);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              'DEMO PREVIEW ONLY — Practice guide (not eligible for AI Camera Verification bonus)',
              cx,
              28
            );

            const now = Date.now();
            if (t >= 0.88 && exerciseState !== 'PEAK') {
              setExerciseState('PEAK');
            } else if (t <= 0.12 && exerciseState === 'PEAK') {
              if (now - lastRepTimeRef.current > 1200) {
                lastRepTimeRef.current = now;
                setExerciseState('READY');
                setRepCount(prev => prev + 1);
              }
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraReviewOpen(false);
    setCameraSaveError(null);
    setIsSandboxDemo(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          isTrackingRef.current = true;
          startOpticalMotionLoop(false);
          startTimer();
          sound.playClick();
        };
      }
    } catch (err) {
      console.warn('Camera permission or device error:', err);
      setCameraError(
        'Camera permission denied or no camera detected. You can upload a workout photo or video on the first tab instead, or practice with the Demo Preview below.'
      );
    }
  };

  const handleFinishCameraWorkout = () => {
    stopCamera();
    setCameraIdempotencyKey(createIdempotencyKey());
    setCameraSaveError(null);
    setCameraReviewOpen(true);
  };

  const handleConfirmCameraSave = async () => {
    setIsSavingCamera(true);
    setCameraSaveError(null);

    const verifiedLive = !isSandboxDemo && repCount > 0;
    const durMin = Math.max(1, Math.round(workoutDurationSec / 60));
    const idemKey = cameraIdempotencyKey || createIdempotencyKey();
    if (!cameraIdempotencyKey) setCameraIdempotencyKey(idemKey);

    const result = await logFitnessSession({
      exerciseType: selectedCameraExercise,
      exerciseName: currentCameraExercise.name,
      repetitions: repCount > 0 ? repCount : undefined,
      durationMinutes: durMin,
      verifiedWithAetherVision: verifiedLive,
      notes: isSandboxDemo
        ? 'Practice workout logged manually after Demo Preview.'
        : `Live Camera Optical Motion Tracking (${repCount} movement cycles).`,
      idempotencyKey: idemKey,
    });

    setIsSavingCamera(false);
    if (!result.success) {
      setCameraSaveError(result.error || 'Failed to save workout session.');
      return;
    }

    setCameraReviewOpen(false);
    setRepCount(0);
    setWorkoutDurationSec(0);

    setConfirmedReward({
      kind: 'workout',
      title: currentCameraExercise.name,
      playerXp: result.rewards?.playerXp ?? 0,
      forgeXp: result.rewards?.forgeXp ?? 0,
      gold: result.rewards?.gold ?? 0,
      aetherPoints: result.rewards?.aetherPoints ?? 0,
      buffActivated: result.rewards?.buffActivated,
      deduplicated: result.deduplicated,
      dailyCapReached: result.dailyCapReached,
      reps: repCount,
      durationMinutes: durMin,
      verifiedWithVision: verifiedLive,
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ===========================================================================
  // FOOD PHOTO AI VISION HANDLERS
  // ===========================================================================
  const handleFoodFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoodVisionError(null);
    setMealSaveError(null);
    setFoodAnalysis(null);

    if (!file.type.startsWith('image/')) {
      setFoodVisionError('Please select a food photograph (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFoodVisionError('Image file is larger than 12 MB. Please upload a smaller photo.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFoodImagePreview(dataUrl);
      setFoodMimeType(file.type || 'image/jpeg');
    } catch (err: any) {
      setFoodVisionError(err?.message || 'Could not read image file.');
    }
  };

  const handleAnalyzeFoodPhoto = async () => {
    if (!foodImagePreview) return;
    setIsAnalyzingFood(true);
    setFoodVisionError(null);
    setMealSaveError(null);

    const allergies =
      user?.foodAllergiesList && user.foodAllergiesList.length > 0
        ? user.foodAllergiesList
        : user?.foodAllergies
        ? user.foodAllergies.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    try {
      const resp = await fetch('/api/vision/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaBase64: foodImagePreview,
          mimeType: foodMimeType,
          userContext: {
            dietaryPreference: user?.dietaryPreference,
            ageYears: user?.ageYears,
            ageGroup: userAgeGroup,
            allergies,
            intolerances: user?.foodIntolerances || [],
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setFoodVisionError(data?.error || 'Food AI analysis failed.');
        return;
      }

      const analysis = data as FoodVisionAnalysis;
      setFoodAnalysis(analysis);
      setEditableMealTitle(analysis.mealTitle || 'Analyzed Meal');
      setEditableDietCategory(analysis.dietaryCategory || user?.dietaryPreference || 'vegetarian');
      setEditableFoodItems(analysis.items.map(it => `${it.name} (${it.estimatedPortion})`));
      setPortionMultiplier(1);
      setMealIdempotencyKey(createIdempotencyKey());
    } catch (err: any) {
      setFoodVisionError(
        err?.message || 'Network error contacting Aether Vision food analysis.'
      );
    } finally {
      setIsAnalyzingFood(false);
    }
  };

  const scaledTotals = React.useMemo(() => {
    if (!foodAnalysis) return null;
    const scale = (r: { min: number; max: number; mid: number }) => ({
      min: Math.round(r.min * portionMultiplier),
      max: Math.round(r.max * portionMultiplier),
      mid: Math.round(r.mid * portionMultiplier),
    });
    return {
      proteinG: scale(foodAnalysis.estimatedTotals.proteinG),
      carbsG: scale(foodAnalysis.estimatedTotals.carbsG),
      fatG: scale(foodAnalysis.estimatedTotals.fatG),
      fibreG: scale(foodAnalysis.estimatedTotals.fibreG),
      energyKcal: scale(foodAnalysis.estimatedTotals.energyKcal),
    };
  }, [foodAnalysis, portionMultiplier]);

  const handleConfirmLogAnalyzedMeal = async () => {
    if (!foodAnalysis || !scaledTotals) return;
    setIsSavingMeal(true);
    setMealSaveError(null);

    const idemKey = mealIdempotencyKey || createIdempotencyKey();
    if (!mealIdempotencyKey) setMealIdempotencyKey(idemKey);

    const result = await logMeal({
      mealType,
      title: editableMealTitle.trim() || foodAnalysis.mealTitle,
      foodItems: editableFoodItems.filter(Boolean),
      dietaryCategory: editableDietCategory,
      balancedNotes:
        foodAnalysis.educationalExplanation ||
        'Image-based meal analysis logged in Aetheria.',
      nutritionEstimate: {
        isImageEstimate: true,
        confidence: foodAnalysis.confidence,
        confidenceLevel: foodAnalysis.confidenceLevel,
        estimateDisclaimer: foodAnalysis.estimateDisclaimer,
        items: foodAnalysis.items,
        estimatedTotals: scaledTotals,
        foodGroupsRepresented: foodAnalysis.foodGroupsRepresented,
        micronutrients: foodAnalysis.micronutrients,
        nutrientContributors: foodAnalysis.nutrientContributors,
        educationalExplanation: foodAnalysis.educationalExplanation,
        varietyAndBalanceSuggestions: foodAnalysis.varietyAndBalanceSuggestions,
        allergenWatchNotice: foodAnalysis.allergenWatchNotice,
      },
      idempotencyKey: idemKey,
    });

    setIsSavingMeal(false);
    if (!result.success) {
      setMealSaveError(result.error || 'Could not log analyzed meal.');
      return;
    }

    if (!result.deduplicated && !result.dailyCapReached) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#34d399', '#fbbf24'],
      });
    }

    setConfirmedReward({
      kind: 'meal',
      title: editableMealTitle.trim() || foodAnalysis.mealTitle,
      playerXp: result.rewards?.playerXp ?? 0,
      forgeXp: result.rewards?.forgeXp ?? 0,
      gold: result.rewards?.gold ?? 0,
      aetherPoints: result.rewards?.aetherPoints ?? 0,
      deduplicated: result.deduplicated,
      dailyCapReached: result.dailyCapReached,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#170e2f] via-[#100a20] to-[#1a1236] border border-purple-900/60 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-['Cinzel'] font-bold text-xs uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-700/50 px-2.5 py-0.5 rounded">
                AI Vision Sanctuary
              </span>
              <span className="text-xs text-purple-300 font-semibold">
                Honest Recognition · Verified Rewards
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cinzel'] text-white">
              AETHER VISION — WORKOUT & MEAL AI
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Analyze uploaded workout images/videos, track real movement via camera, or break down meal photographs with transparent nutrient estimates and WHO-aligned guidance.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#090714] p-3 rounded-xl border border-purple-950 text-xs max-w-sm">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-400">
              All earned XP, Forge XP, and Gold are verified and safely credited to your hero.
            </span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-purple-900/40">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setVisionTab('workout_media');
            }}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              visionTab === 'workout_media'
                ? 'bg-purple-900/55 border-purple-400 text-white shadow-md'
                : 'bg-[#0e0a1b] border-purple-950 text-slate-300 hover:border-purple-800'
            }`}
          >
            <Video className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold font-['Cinzel']">WORKOUT PHOTO / VIDEO AI</p>
              <p className="text-[11px] text-slate-400">Exercise recognition & reward review</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setVisionTab('live_camera')}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              visionTab === 'live_camera'
                ? 'bg-purple-900/55 border-purple-400 text-white shadow-md'
                : 'bg-[#0e0a1b] border-purple-950 text-slate-300 hover:border-purple-800'
            }`}
          >
            <Camera className="w-5 h-5 text-purple-300 shrink-0" />
            <div>
              <p className="text-xs font-bold font-['Cinzel']">LIVE CAMERA TRACKER</p>
              <p className="text-[11px] text-slate-400">Real-time optical rep cycles</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setVisionTab('food_photo');
            }}
            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              visionTab === 'food_photo'
                ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md'
                : 'bg-[#0e0a1b] border-purple-950 text-slate-300 hover:border-cyan-800'
            }`}
          >
            <Utensils className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs font-bold font-['Cinzel']">FOOD & MEAL AI ANALYSIS</p>
              <p className="text-[11px] text-slate-400">Macros, food groups & education</p>
            </div>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: WORKOUT PHOTO / VIDEO UPLOAD AI                                */}
      {/* ===================================================================== */}
      {visionTab === 'workout_media' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Upload & Hint */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-4">
              <h2 className="font-['Cinzel'] font-bold text-sm text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                UPLOAD WORKOUT IMAGE OR VIDEO
              </h2>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
                  Optional Activity Hint
                </label>
                <select
                  value={workoutHint}
                  onChange={e => setWorkoutHint(e.target.value as ExerciseType)}
                  className="w-full bg-[#130f24] border border-purple-900 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {EXERCISE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  AI Vision always checks actual visual evidence and distinguishes similar movements honestly.
                </p>
              </div>

              <label className="block border-2 border-dashed border-purple-800/70 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer bg-[#130f24]/60 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={handleWorkoutFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center mx-auto mb-3 text-amber-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  Choose a Workout Photo or Video Clip
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Videos enable repetition cycle checks; single photos assess exercise & form only (max 16 MB).
                </p>
              </label>

              {workoutMediaPreview && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-purple-900 bg-black aspect-video flex items-center justify-center">
                    {workoutMediaKind === 'video' ? (
                      <video
                        src={workoutMediaPreview}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={workoutMediaPreview}
                        alt="Uploaded workout preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyzeWorkoutMedia}
                    disabled={isAnalyzingWorkout}
                    className="w-full py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 text-white shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {isAnalyzingWorkout
                      ? 'ANALYZING MOVEMENT...'
                      : 'ANALYZE WITH AETHER VISION'}
                  </button>
                </div>
              )}

              {workoutVisionError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{workoutVisionError}</span>
                </div>
              )}
            </div>

            {/* Age-Appropriate WHO Physical Activity Guidance */}
            <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Activity className="w-4 h-4" />
                <span>{activityGuide.headline}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activityGuide.recommendation}
              </p>
            </div>
          </div>

          {/* Right 7 Cols: Structured Analysis & Review-Before-Save */}
          <div className="lg:col-span-7 space-y-4">
            {!workoutAnalysis ? (
              <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-8 text-center space-y-3 h-full flex flex-col items-center justify-center">
                <Sparkles className="w-10 h-10 text-purple-400" />
                <h3 className="font-['Cinzel'] font-bold text-base text-slate-100">
                  READY FOR MOVEMENT ANALYSIS
                </h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Upload a photo or short workout video on the left. Aether Vision will distinguish similar exercises, explain confidence, note any counting limitations, and let you review and correct details before claiming rewards.
                </p>
              </div>
            ) : (
              <div className="bg-[#0e0a1b] border border-purple-900/70 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-purple-300 font-semibold block">
                      {workoutAnalysis.movementCategory} · {workoutAnalysis.mediaKind.toUpperCase()}
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-xl text-white mt-0.5">
                      {workoutAnalysis.identified
                        ? workoutAnalysis.exerciseName
                        : 'Needs Your Confirmation'}
                    </h3>
                  </div>
                  <ConfidenceBadge
                    confidence={workoutAnalysis.confidence}
                    level={workoutAnalysis.confidenceLevel}
                  />
                </div>

                {/* Counting Limitation & Honesty Notice */}
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 text-xs text-amber-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">
                      {workoutAnalysis.repsSupported
                        ? `Estimated ${workoutAnalysis.estimatedReps} reps (${workoutAnalysis.estimatedSets} set${workoutAnalysis.estimatedSets > 1 ? 's' : ''}) — verify below`
                        : 'Repetitions Not Auto-Invented'}
                    </p>
                    <p className="text-amber-100/90 mt-0.5 leading-relaxed">
                      {workoutAnalysis.countingLimitation}
                    </p>
                  </div>
                </div>

                {/* Distinction & Observations */}
                {workoutAnalysis.similarExerciseDistinction && (
                  <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 text-xs text-slate-300">
                    <span className="font-semibold text-purple-300 block mb-1">
                      Movement Distinction
                    </span>
                    {workoutAnalysis.similarExerciseDistinction}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 text-xs space-y-1.5">
                    <span className="font-semibold text-purple-300 block">Visual Observations</span>
                    <ul className="space-y-1 text-slate-300">
                      {workoutAnalysis.observations.map((obs, i) => (
                        <li key={i}>• {obs}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#130f24] border border-purple-950 text-xs space-y-1.5">
                    <span className="font-semibold text-emerald-300 block">Form & Safety Notes</span>
                    <ul className="space-y-1 text-slate-300">
                      {workoutAnalysis.safetyAndFormNotes.map((note, i) => (
                        <li key={i}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {workoutAnalysis.ageAppropriateGuidance && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200">
                    <span className="font-semibold block mb-0.5">
                      {minorUser ? 'Youth Movement Guidance' : 'Physical Activity Guidance'}
                    </span>
                    {workoutAnalysis.ageAppropriateGuidance}
                  </div>
                )}

                {/* User Review & Manual Correction Before Saving */}
                <div className="pt-4 border-t border-purple-900/60 space-y-4">
                  <h4 className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-amber-300">
                    Review & Correct Before Claiming Rewards
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Confirmed Exercise Category
                      </label>
                      <select
                        value={confirmExerciseType}
                        onChange={e => {
                          const next = e.target.value as ExerciseType;
                          setConfirmExerciseType(next);
                          const opt = EXERCISE_OPTIONS.find(o => o.id === next);
                          if (opt) setConfirmExerciseName(opt.name);
                        }}
                        className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                      >
                        {EXERCISE_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Session Title
                      </label>
                      <input
                        type="text"
                        value={confirmExerciseName}
                        onChange={e => setConfirmExerciseName(e.target.value)}
                        className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={confirmDurationMin}
                        onChange={e => setConfirmDurationMin(Math.max(1, Number(e.target.value || 1)))}
                        className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Repetitions {workoutAnalysis.mediaKind === 'image' ? '(Optional Manual Entry)' : '(Verified / Adjusted)'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={confirmReps}
                        onChange={e => setConfirmReps(Math.max(0, Number(e.target.value || 0)))}
                        className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {workoutSaveError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-xs text-rose-200">
                      {workoutSaveError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      {workoutAnalysis.mediaKind === 'video' && workoutAnalysis.repsSupported && confirmReps > 0
                        ? 'Eligible for Video Rep-Verified XP & Warrior’s Momentum buff.'
                        : 'Saved as standard duration-based session XP (single images cannot verify full reps).'}
                    </span>

                    <button
                      type="button"
                      onClick={handleConfirmWorkoutMediaLog}
                      disabled={isSavingWorkout}
                      className="px-5 py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSavingWorkout ? 'SAVING TO REALM...' : 'CONFIRM & CLAIM REWARDS'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LIVE CAMERA REAL OPTICAL TRACKING                              */}
      {/* ===================================================================== */}
      {visionTab === 'live_camera' && (
        <div className="space-y-6">
          <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-4 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-3">
              Select Exercise Protocol
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {CAMERA_EXERCISES.map(ex => {
                const isSelected = selectedCameraExercise === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setSelectedCameraExercise(ex.id);
                      setExerciseState('READY');
                      phaseRef.current = 0;
                    }}
                    disabled={isCameraActive}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-900/50 border-purple-500 shadow-md ring-1 ring-purple-400'
                        : 'bg-[#130f24] border-purple-950/80 hover:border-purple-800 text-slate-300'
                    } ${isCameraActive ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-xs font-bold text-slate-100">{ex.name}</p>
                    <p className="text-[10px] text-amber-300 font-mono mt-0.5">
                      Real-Time Motion Tracking
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="relative aspect-video rounded-2xl bg-[#090712] border-2 border-purple-900/80 overflow-hidden shadow-2xl flex items-center justify-center">
                <video ref={videoRef} playsInline muted className="hidden" />

                {isCameraActive ? (
                  <canvas ref={canvasRef} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/70 border border-purple-700/60 flex items-center justify-center text-purple-300 mb-4 shadow-lg">
                      <Camera className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="font-['Cinzel'] font-bold text-lg text-slate-100 mb-2">
                      OPTICAL CAMERA TRACKER READY
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      {currentCameraExercise.instructions}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-6 py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 hover:from-purple-500 hover:to-indigo-500 shadow-xl transition-all"
                    >
                      START CAMERA TRACKING
                    </button>
                  </div>
                )}

                {isCameraActive && (
                  <>
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2 bg-[#090714]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-purple-800/60 text-xs font-semibold text-purple-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        <span>
                          {isSandboxDemo
                            ? `DEMO PREVIEW: ${currentCameraExercise.name.toUpperCase()}`
                            : `TRACKING: ${currentCameraExercise.name.toUpperCase()} (${motionScore}% motion)`}
                        </span>
                      </div>

                      <div className="bg-[#090714]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-purple-800/60 text-xs font-mono font-bold text-amber-300">
                        {Math.floor(workoutDurationSec / 60)}:
                        {(workoutDurationSec % 60).toString().padStart(2, '0')}
                      </div>
                    </div>

                    <div className="absolute bottom-5 left-4 bg-[#090714]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-purple-700 shadow-lg">
                      <span className="text-[10px] text-purple-300 uppercase tracking-widest font-bold block">
                        {isSandboxDemo ? 'Demo Cycles' : 'Optical Reps Counted'}
                      </span>
                      <span className="font-mono text-3xl font-black text-amber-400 tabular-nums">
                        {repCount}
                      </span>
                    </div>

                    <div className="absolute bottom-5 right-4">
                      <button
                        type="button"
                        onClick={handleFinishCameraWorkout}
                        className="px-4 py-2 rounded-xl bg-rose-700/90 hover:bg-rose-600 text-white font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        <CameraOff className="w-4 h-4" />
                        Review & Finish
                      </button>
                    </div>
                  </>
                )}
              </div>

              {cameraError && (
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Camera Access Note</p>
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSandboxDemo(true);
                        setIsCameraActive(true);
                        isTrackingRef.current = true;
                        startOpticalMotionLoop(true);
                        startTimer();
                      }}
                      className="mt-2 text-xs font-semibold underline text-purple-300 hover:text-white"
                    >
                      Open Visual Demo Preview (Does NOT grant Vision Bonus XP)
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-[#0e0a1b] border border-purple-950 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center shrink-0 border border-purple-800/50">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold block">
                    Live Movement Feedback
                  </span>
                  <p className="text-xs text-slate-200 font-medium">{feedback}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-3 text-xs">
                <h3 className="font-['Cinzel'] font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  REWARD RULES
                </h3>
                <div className="p-3 rounded-xl bg-[#130f24] border border-purple-950 flex justify-between">
                  <span className="text-slate-300">Vision-Verified Base + Rep XP</span>
                  <span className="font-mono font-bold text-purple-300">
                    max(10, reps) × 4 + 30
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#130f24] border border-purple-950 flex justify-between">
                  <span className="text-slate-300">Forge XP Formula</span>
                  <span className="font-mono font-bold text-amber-300">
                    max(10, reps) × 5 + 40
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#130f24] border border-purple-950 flex justify-between">
                  <span className="text-slate-300">Gold Earned</span>
                  <span className="font-mono font-bold text-amber-400">
                    40 + min(60, reps)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Daily cap: up to 6 rewarded workout sessions per day.
                </p>
              </div>

              <div className="bg-[#0e0a1b] border border-purple-950 rounded-2xl p-5 space-y-2 text-xs">
                <h4 className="font-['Cinzel'] font-bold text-slate-200 uppercase">
                  {currentCameraExercise.name} Form Guide
                </h4>
                <p className="text-slate-400 leading-relaxed">{currentCameraExercise.instructions}</p>
                <p className="text-purple-300 font-semibold pt-1">
                  Target: {currentCameraExercise.targetMuscles}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: FOOD & MEAL PHOTO AI ANALYSIS                                  */}
      {/* ===================================================================== */}
      {visionTab === 'food_photo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Upload Food Photo */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0c1421] border border-cyan-950 rounded-2xl p-5 space-y-4">
              <h2 className="font-['Cinzel'] font-bold text-sm text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-cyan-400" />
                UPLOAD MEAL PHOTOGRAPH
              </h2>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Meal Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMealType(type)}
                      className={`py-2 text-xs font-medium rounded-lg capitalize border ${
                        mealType === type
                          ? 'bg-cyan-800 text-white border-cyan-500'
                          : 'bg-[#09111c] border-cyan-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block border-2 border-dashed border-cyan-800/70 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-[#08101a] transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFoodFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-200">
                  Select a Meal or Snack Photograph
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports home-cooked plates, thalis, bowls, fruits, and snacks (JPG, PNG, WebP).
                </p>
              </label>

              {foodImagePreview && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-cyan-900 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={foodImagePreview}
                      alt="Uploaded meal preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeFoodPhoto}
                    disabled={isAnalyzingFood}
                    className="w-full py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-black shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAnalyzingFood ? 'ANALYZING MEAL...' : 'ANALYZE MEAL NUTRITION'}
                  </button>
                </div>
              )}

              {foodVisionError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{foodVisionError}</span>
                </div>
              )}
            </div>

            <div className="bg-[#0c1421] border border-cyan-950 rounded-2xl p-4 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-cyan-300">Honesty & Educational Nutrition Pledge</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Photo nutrition estimates show approximate ranges and contributing food groups—not laboratory measurements. LifeQuest never shames foods or diagnoses deficiencies.
              </p>
            </div>
          </div>

          {/* Right 7 Cols: Nutritional Breakdown & Confirmation */}
          <div className="lg:col-span-7 space-y-4">
            {!foodAnalysis || !scaledTotals ? (
              <div className="bg-[#0c1421] border border-cyan-950 rounded-2xl p-8 text-center space-y-3 h-full flex flex-col items-center justify-center">
                <Utensils className="w-10 h-10 text-cyan-400" />
                <h3 className="font-['Cinzel'] font-bold text-base text-slate-100">
                  MEAL NUTRITION & EDUCATION ENGINE
                </h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Upload any meal photo to identify visible foods, estimate approximate macro & fibre ranges, discover micronutrient contributors, and review before adding it to your daily nutrition overview.
                </p>
              </div>
            ) : (
              <div className="bg-[#0c1421] border border-cyan-900/70 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-cyan-300 font-semibold block">
                      Image-Based Estimate · Verify Before Logging
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-xl text-white mt-0.5">
                      {foodAnalysis.identified
                        ? editableMealTitle
                        : 'Unclear Meal — Please Confirm Items'}
                    </h3>
                  </div>
                  <ConfidenceBadge
                    confidence={foodAnalysis.confidence}
                    level={foodAnalysis.confidenceLevel}
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-800/50 text-xs text-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-200">{foodAnalysis.estimateDisclaimer}</p>
                    <p className="mt-1 text-amber-100/90">{foodAnalysis.allergenWatchNotice}</p>
                  </div>
                </div>

                {/* Portion Calibration Control */}
                <div className="p-3.5 rounded-xl bg-[#08101a] border border-cyan-950 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-semibold text-cyan-300 block">
                      Adjust Portion Scale (If Plate Was Smaller/Larger)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Scales estimated nutrient ranges transparently
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0.75, 1, 1.25, 1.5].map(mult => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setPortionMultiplier(mult)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                          portionMultiplier === mult
                            ? 'bg-cyan-700 border-cyan-400 text-white'
                            : 'bg-[#0d1828] border-cyan-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Macro & Energy Ranges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                  {[
                    {
                      label: 'Energy (Est.)',
                      val: `${scaledTotals.energyKcal.min}–${scaledTotals.energyKcal.max}`,
                      unit: 'kcal',
                      color: 'text-amber-300',
                    },
                    {
                      label: 'Protein',
                      val: `${scaledTotals.proteinG.min}–${scaledTotals.proteinG.max}`,
                      unit: 'g',
                      color: 'text-cyan-300',
                    },
                    {
                      label: 'Carbohydrates',
                      val: `${scaledTotals.carbsG.min}–${scaledTotals.carbsG.max}`,
                      unit: 'g',
                      color: 'text-purple-300',
                    },
                    {
                      label: 'Healthy Fats',
                      val: `${scaledTotals.fatG.min}–${scaledTotals.fatG.max}`,
                      unit: 'g',
                      color: 'text-emerald-300',
                    },
                    {
                      label: 'Dietary Fibre',
                      val: `${scaledTotals.fibreG.min}–${scaledTotals.fibreG.max}`,
                      unit: 'g',
                      color: 'text-teal-300',
                    },
                  ].map(card => (
                    <div
                      key={card.label}
                      className="p-3 rounded-xl bg-[#08101a] border border-cyan-950"
                    >
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        {card.label}
                      </span>
                      <span className={`font-mono text-sm font-bold ${card.color} block mt-1`}>
                        {card.val}
                      </span>
                      <span className="text-[10px] text-slate-500">{card.unit}</span>
                    </div>
                  ))}
                </div>

                {/* Detected Items & Portion Uncertainty */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Identified Items & Portion Notes
                  </h4>
                  <div className="space-y-2">
                    {foodAnalysis.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#08101a] border border-cyan-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{item.name}</span>
                            <span className="text-[10px] text-cyan-300">
                              · {item.foodGroup} · {item.estimatedPortion}
                            </span>
                          </div>
                          {item.likelyIngredients.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Likely ingredients: {item.likelyIngredients.join(', ')}
                            </p>
                          )}
                          <p className="text-[11px] text-amber-200/80 mt-0.5">
                            {item.uncertaintyNote}
                          </p>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300 shrink-0 text-right">
                          ~{Math.round(item.energyKcal * portionMultiplier)} kcal · P{' '}
                          {Math.round(item.proteinG * portionMultiplier)}g · F{' '}
                          {Math.round(item.fibreG * portionMultiplier)}g fibre
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clarifying Questions */}
                {foodAnalysis.clarifyingQuestions.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#08101a] border border-cyan-950 text-xs space-y-1">
                    <span className="font-semibold text-cyan-300 block">
                      What Could Change This Estimate?
                    </span>
                    <ul className="text-slate-300 space-y-1">
                      {foodAnalysis.clarifyingQuestions.map((q, i) => (
                        <li key={i}>• {q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nutrient Contributors & Micronutrients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#08101a] border border-cyan-950 space-y-1.5">
                    <span className="font-semibold text-cyan-300 block">
                      Food Groups & Macro Contributors
                    </span>
                    <p className="text-slate-300">
                      <strong className="text-slate-200">Protein:</strong>{' '}
                      {foodAnalysis.nutrientContributors.proteinSources.join(', ') || 'Minimal visible'}
                    </p>
                    <p className="text-slate-300">
                      <strong className="text-slate-200">Carbohydrates:</strong>{' '}
                      {foodAnalysis.nutrientContributors.carbSources.join(', ') || 'Minimal visible'}
                    </p>
                    <p className="text-slate-300">
                      <strong className="text-slate-200">Fats:</strong>{' '}
                      {foodAnalysis.nutrientContributors.healthyFatSources.join(', ') || 'Cooking oils / trace'}
                    </p>
                    <p className="text-slate-300">
                      <strong className="text-slate-200">Fibre:</strong>{' '}
                      {foodAnalysis.nutrientContributors.fibreSources.join(', ') || 'Whole plant sources'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#08101a] border border-cyan-950 space-y-1.5">
                    <span className="font-semibold text-emerald-300 block">
                      Key Micronutrients Observed
                    </span>
                    {foodAnalysis.micronutrients.length === 0 ? (
                      <p className="text-slate-400">Pair with fresh produce or whole grains for wider micronutrient variety.</p>
                    ) : (
                      <ul className="space-y-1.5 text-slate-300">
                        {foodAnalysis.micronutrients.slice(0, 4).map((m, i) => (
                          <li key={i}>
                            <strong className="text-slate-100">{m.name}</strong> ({m.qualitativeLevel})
                            {m.contributingFoods.length > 0 && ` via ${m.contributingFoods.join(', ')}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Educational Explanation & Balance Ideas */}
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs space-y-2">
                  <span className="font-semibold text-cyan-200 block">
                    Educational Nutrition Notes (WHO & ICMR–NIN 2024 Aligned)
                  </span>
                  <p className="text-slate-200 leading-relaxed">{foodAnalysis.educationalExplanation}</p>
                  {foodAnalysis.varietyAndBalanceSuggestions.length > 0 && (
                    <ul className="space-y-1 text-cyan-100/90 pt-1">
                      {foodAnalysis.varietyAndBalanceSuggestions.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Editable Confirm & Save Controls */}
                <div className="pt-4 border-t border-cyan-900/60 space-y-3 text-xs">
                  <h4 className="font-['Cinzel'] font-bold uppercase tracking-wider text-cyan-300">
                    Review & Correct Before Logging
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Meal Title</label>
                      <input
                        type="text"
                        value={editableMealTitle}
                        onChange={e => setEditableMealTitle(e.target.value)}
                        className="w-full bg-[#08101a] border border-cyan-900 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Dietary Style</label>
                      <select
                        value={editableDietCategory}
                        onChange={e => setEditableDietCategory(e.target.value as DietaryPreference)}
                        className="w-full bg-[#08101a] border border-cyan-900 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="eggetarian">Eggetarian</option>
                        <option value="non_vegetarian">Non-Vegetarian</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Food Items Logged (Edit or Add Missing Items)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editableFoodItems.map((it, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#08101a] border border-cyan-900 text-slate-200"
                        >
                          <span>{it}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditableFoodItems(prev => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-slate-400 hover:text-rose-400"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFoodItemInput}
                        onChange={e => setNewFoodItemInput(e.target.value)}
                        placeholder="Add missing side, fruit, or drink..."
                        className="flex-1 bg-[#08101a] border border-cyan-900 rounded-xl px-3 py-2 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFoodItemInput.trim()) return;
                          setEditableFoodItems(prev => [...prev, newFoodItemInput.trim()]);
                          setNewFoodItemInput('');
                        }}
                        className="px-3 py-2 rounded-xl bg-cyan-900 hover:bg-cyan-800 text-white font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  {mealSaveError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-xs text-rose-200">
                      {mealSaveError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmLogAnalyzedMeal}
                      disabled={isSavingMeal}
                      className="px-5 py-3 rounded-xl font-['Cinzel'] font-bold text-xs tracking-wider bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black shadow-lg disabled:opacity-60 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSavingMeal ? 'SAVING MEAL...' : 'CONFIRM & LOG MEAL'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LIVE CAMERA REVIEW BEFORE SAVE MODAL                                  */}
      {/* ===================================================================== */}
      {cameraReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0f0c1b] border border-purple-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black font-['Cinzel'] text-white">
              CONFIRM CAMERA WORKOUT SESSION
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isSandboxDemo
                ? 'Demo Preview does not qualify for Vision-verified bonus XP. Adjust your actual workout duration below to save a standard workout log.'
                : `Optical tracking detected ${repCount} movement cycle${repCount === 1 ? '' : 's'} over ${Math.max(1, Math.round(workoutDurationSec / 60))} minute(s). Review before claiming server rewards.`}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Repetitions</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={repCount}
                  onChange={e => setRepCount(Math.max(0, Number(e.target.value || 0)))}
                  className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Duration (Min)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={Math.max(1, Math.round(workoutDurationSec / 60))}
                  onChange={e => setWorkoutDurationSec(Math.max(1, Number(e.target.value || 1)) * 60)}
                  className="w-full bg-[#130f24] border border-purple-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {cameraSaveError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-xs text-rose-200">
                {cameraSaveError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCameraReviewOpen(false);
                  setRepCount(0);
                  setWorkoutDurationSec(0);
                }}
                className="flex-1 py-2.5 rounded-xl border border-purple-800 text-xs text-slate-300 hover:text-white"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmCameraSave}
                disabled={isSavingCamera}
                className="flex-1 py-2.5 rounded-xl font-['Cinzel'] font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-60"
              >
                {isSavingCamera ? 'Saving...' : 'Claim & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AUTHORITATIVE SERVER REWARD CONFIRMATION MODAL                        */}
      {/* ===================================================================== */}
      {confirmedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0f0c1b] border border-purple-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black font-['Cinzel'] text-white">
                {confirmedReward.kind === 'workout' ? 'WORKOUT SAVED!' : 'MEAL LOGGED!'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">{confirmedReward.title}</p>
            </div>

            {confirmedReward.dailyCapReached && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-700 text-xs text-amber-200">
                Daily reward limit reached for this category today — your log was saved cleanly without extra XP/Gold.
              </div>
            )}

            {confirmedReward.deduplicated && (
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700 text-xs text-purple-200 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Duplicate submission prevented — rewards already credited once.</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 bg-[#130f24] p-4 rounded-xl border border-purple-950">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Player XP
                </span>
                <span className="font-mono text-xl font-bold text-purple-300">
                  +{confirmedReward.playerXp}
                </span>
              </div>
              <div className="border-x border-purple-950">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Forge XP
                </span>
                <span className="font-mono text-xl font-bold text-amber-300">
                  +{confirmedReward.forgeXp}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Gold
                </span>
                <span className="font-mono text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
                  <Coins className="w-3.5 h-3.5" />+{confirmedReward.gold}
                </span>
              </div>
            </div>

            {confirmedReward.buffActivated && (
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700/50 text-xs text-purple-200 flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Warrior’s Momentum (+10% ATK) primed for Boss Battles!</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {confirmedReward.kind === 'meal' && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedReward(null);
                    setActiveTab('nutrition');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold font-['Cinzel'] text-xs border border-cyan-600 text-cyan-200 hover:bg-cyan-950 flex items-center justify-center gap-1.5"
                >
                  <span>View Daily Nutrition</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmedReward(null)}
                className="flex-1 py-3 px-4 font-bold font-['Cinzel'] tracking-wider text-xs rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg"
              >
                CONTINUE JOURNEY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
