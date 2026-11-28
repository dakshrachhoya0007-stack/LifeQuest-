import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useGame } from '../../context/GameContext';
import {
  CameraTrackableExercise,
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
import {
  AetherMotionEngine,
  computeBackgroundMotionStability,
  MOTION_EXERCISE_LABELS,
  MotionEngineOutput,
  POSE_IDX,
  POSE_SKELETON_CONNECTIONS,
  PoseLandmark,
  SupportedMotionExercise,
} from '../../utils/aetherMotionEngine';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { FeatureBanner, FeatureTabBar } from '../Theme/FeatureThemePrimitives';
import {
  AnimatedCounter,
  RpgModalWrapper,
  RpgSubTabTransition,
} from '../Motion/RpgMotionPrimitives';
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
}[] = [
  {
    id: 'squat',
    name: 'Squats',
    targetMuscles: 'Quadriceps, Glutes, Core',
    instructions: 'Stand shoulder-width apart. Lower hips with chest lifted until knees bend past 112°, then press back up smoothly.',
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    targetMuscles: 'Chest, Triceps, Shoulders',
    instructions: 'Keep torso braced in a straight plank line. Lower chest steadily until elbows bend below 108° and press back to lockout.',
  },
  {
    id: 'lunge',
    name: 'Lunges',
    targetMuscles: 'Hamstrings, Glutes, Balance',
    instructions: 'Step into a split stance, lower back knee with control until front/back knee bends below 116°, and drive back to standing.',
  },
  {
    id: 'jumping_jack',
    name: 'Jumping Jacks',
    targetMuscles: 'Cardio, Calves, Deltoids',
    instructions: 'Jump while spreading feet wide and sweeping arms cleanly overhead, then return to standing.',
  },
  {
    id: 'plank',
    name: 'Planks',
    targetMuscles: 'Core, Deep Abdominals, Spine Stability',
    instructions: 'Hold a straight horizontal body line from shoulders through hips to ankles. Every 5 verified seconds earns an endurance point.',
  },
  {
    id: 'knee_raise',
    name: 'High Knees',
    targetMuscles: 'Hip Flexors, Core, Cardio',
    instructions: 'Stand tall and drive alternating knees sharply toward hip height at a brisk, controlled tempo.',
  },
  {
    id: 'bicep_curl',
    name: 'Bicep Curls',
    targetMuscles: 'Biceps, Forearms, Elbow Control',
    instructions: 'Pin elbows gently beside your torso and curl forearms up smoothly without swinging your shoulders.',
  },
  {
    id: 'shoulder_press',
    name: 'Shoulder Presses',
    targetMuscles: 'Deltoids, Triceps, Upper Back',
    instructions: 'Start with hands racked at shoulder height and press smoothly overhead to full elbow extension, then lower with control.',
  },
  {
    id: 'walking',
    name: 'Walking',
    targetMuscles: 'Cardiovascular Endurance, Legs',
    instructions: 'Brisk, upright stride with relaxed shoulders and steady arm swing.',
  },
  {
    id: 'running',
    name: 'Running',
    targetMuscles: 'Cardio, Calves, Quads, Stamina',
    instructions: 'Balanced cadence with upright posture and controlled breathing.',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    targetMuscles: 'Quads, Hamstrings, Cardiovascular',
    instructions: 'Smooth pedal cadence with neutral spine alignment.',
  },
  {
    id: 'gym',
    name: 'Strength / Gym Training',
    targetMuscles: 'Full Body / Resistance',
    instructions: 'Controlled eccentric and concentric form through comfortable range of motion.',
  },
  {
    id: 'yoga',
    name: 'Yoga & Mobility',
    targetMuscles: 'Mobility, Balance, Breath, Core',
    instructions: 'Steady nasal breathing and mindful joint alignment without forcing range.',
  },
];

const CAMERA_EXERCISES = EXERCISE_OPTIONS.slice(0, 8) as Array<{
  id: CameraTrackableExercise;
  name: string;
  targetMuscles: string;
  instructions: string;
}>;

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
      ? 'text-[#10B981]'
      : level === 'medium'
      ? 'text-[#F59E0B]'
      : 'text-[#F43F5E]';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums ${tone}`}>
      <span>Confidence: {confidence}%</span>
      <span aria-hidden="true" className="text-[#647A9E]">·</span>
      <span className="capitalize font-sans">{level}</span>
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
  // 2. LIVE CAMERA BIOMECHANICAL POSE TRACKING (MediaPipe + AetherMotionEngine)
  // ---------------------------------------------------------------------------
  const [selectedCameraProtocol, setSelectedCameraProtocol] = useState<
    SupportedMotionExercise | 'auto'
  >('auto');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isSandboxDemo, setIsSandboxDemo] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [incompleteRepCount, setIncompleteRepCount] = useState(0);
  const [motionScore, setMotionScore] = useState(0);
  const [motionOutput, setMotionOutput] = useState<MotionEngineOutput | null>(null);
  const [feedback, setFeedback] = useState(
    'Step into frame so your full shoulders, hips, and legs are clearly visible. Pose landmarks verify every repetition.'
  );
  const [workoutDurationSec, setWorkoutDurationSec] = useState(0);
  const [cameraReviewOpen, setCameraReviewOpen] = useState(false);
  const [confirmCameraExercise, setConfirmCameraExercise] =
    useState<CameraTrackableExercise>('squat');
  const [cameraIdempotencyKey, setCameraIdempotencyKey] = useState<string>('');
  const [cameraSaveError, setCameraSaveError] = useState<string | null>(null);
  const [isSavingCamera, setIsSavingCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const poseModelPromiseRef = useRef<Promise<PoseLandmarker> | null>(null);
  const motionEngineRef = useRef<AetherMotionEngine>(
    new AetherMotionEngine({ targetExercise: 'auto' })
  );
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTimestampRef = useRef<number>(0);
  const lastUiSyncRef = useRef<number>(0);
  const prevRepCountRef = useRef<number>(0);
  const lastDetectedExerciseRef = useRef<SupportedMotionExercise | null>(null);
  const demoStageRef = useRef<'READY' | 'PEAK'>('READY');
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastRepTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const directionRef = useRef<number>(1);
  const isTrackingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

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
  const activeDisplayExerciseId: CameraTrackableExercise =
    selectedCameraProtocol !== 'auto'
      ? selectedCameraProtocol
      : motionOutput?.classifiedExercise ||
        motionOutput?.candidateExercise ||
        lastDetectedExerciseRef.current ||
        'squat';
  const currentCameraExercise =
    CAMERA_EXERCISES.find(e => e.id === activeDisplayExerciseId) || CAMERA_EXERCISES[0];

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
        colors: ['#10B981', '#F59E0B', '#38D9F5', '#F2F7FF'],
      });
    }

    setConfirmedReward({
      kind: 'workout',
      title: confirmExerciseName.trim() || 'Workout Logged',
      playerXp: result.rewards?.playerXp ?? 0,
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
  // LIVE CAMERA REAL BIOMECHANICAL POSE TRACKING (MediaPipe PoseLandmarker)
  // ===========================================================================
  const ensurePoseLandmarker = useCallback(async (): Promise<PoseLandmarker> => {
    if (poseLandmarkerRef.current) return poseLandmarkerRef.current;
    if (poseModelPromiseRef.current) return poseModelPromiseRef.current;

    const loadPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      let landmarker: PoseLandmarker;
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
      if (!isMountedRef.current) {
        landmarker.close();
        throw new Error('Component unmounted before pose model finished loading.');
      }
      poseLandmarkerRef.current = landmarker;
      return landmarker;
    })();

    poseModelPromiseRef.current = loadPromise;
    try {
      return await loadPromise;
    } catch (err) {
      poseModelPromiseRef.current = null;
      throw err;
    }
  }, []);

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
    lastVideoTimeRef.current = -1;
    isTrackingRef.current = false;
    setIsCameraActive(false);
  }, []);

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setWorkoutDurationSec(prev => prev + 1);
    }, 1000);
  };

  const drawPoseOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    output: MotionEngineOutput
  ) => {
    const lms = output.smoothedLandmarks;
    if (!lms || lms.length < 29) return;

    const strokeColor = output.cameraUnstable
      ? '#F43F5E'
      : output.phase === 'PEAK'
      ? '#10B981'
      : output.confidenceLevel === 'high'
      ? '#00D9FF'
      : output.confidenceLevel === 'medium'
      ? '#F59E0B'
      : '#38D9F5';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2.5, Math.round(width / 180));

    for (const [idxA, idxB] of POSE_SKELETON_CONNECTIONS) {
      const a = lms[idxA];
      const b = lms[idxB];
      if (!a || !b || (a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue;
      // Video canvas is drawn horizontally mirrored
      const ax = (1 - a.x) * width;
      const ay = a.y * height;
      const bx = (1 - b.x) * width;
      const by = b.y * height;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    const keyJoints = [
      POSE_IDX.NOSE,
      POSE_IDX.LEFT_SHOULDER,
      POSE_IDX.RIGHT_SHOULDER,
      POSE_IDX.LEFT_ELBOW,
      POSE_IDX.RIGHT_ELBOW,
      POSE_IDX.LEFT_WRIST,
      POSE_IDX.RIGHT_WRIST,
      POSE_IDX.LEFT_HIP,
      POSE_IDX.RIGHT_HIP,
      POSE_IDX.LEFT_KNEE,
      POSE_IDX.RIGHT_KNEE,
      POSE_IDX.LEFT_ANKLE,
      POSE_IDX.RIGHT_ANKLE,
    ];
    const jointRadius = Math.max(3.5, Math.round(width / 145));
    for (const idx of keyJoints) {
      const lm = lms[idx];
      if (!lm || (lm.visibility ?? 1) < 0.35) continue;
      const x = (1 - lm.x) * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#061225';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
    ctx.restore();
  };

  const startOpticalMotionLoop = (sandbox: boolean) => {
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas');
      motionCanvasRef.current.width = 64;
      motionCanvasRef.current.height = 48;
    }

    let lastOutput: MotionEngineOutput = motionEngineRef.current.getSnapshot();

    const renderFrame = () => {
      if (!isTrackingRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const mCanvas = motionCanvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!sandbox && video && video.readyState >= 2 && video.videoWidth > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
            }

            // Mirror video feed
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();

            ctx.fillStyle = 'rgba(6, 18, 37, 0.18)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Process new video frames through MediaPipe PoseLandmarker + AetherMotionEngine
            if (video.currentTime !== lastVideoTimeRef.current && poseLandmarkerRef.current) {
              lastVideoTimeRef.current = video.currentTime;
              const nowMs = Math.max(lastTimestampRef.current + 1, performance.now());
              lastTimestampRef.current = nowMs;

              let cameraUnstable = false;
              if (mCanvas) {
                const mCtx = mCanvas.getContext('2d', { willReadFrequently: true });
                if (mCtx) {
                  mCtx.drawImage(video, 0, 0, 64, 48);
                  const imgData = mCtx.getImageData(0, 0, 64, 48).data;
                  const totalPixels = 64 * 48;
                  const currLuma = new Uint8Array(totalPixels);
                  for (let i = 0; i < totalPixels; i++) {
                    const idx = i * 4;
                    currLuma[i] = (imgData[idx] * 3 + imgData[idx + 1] * 6 + imgData[idx + 2]) / 10;
                  }
                  const stability = computeBackgroundMotionStability(
                    currLuma,
                    prevLumaRef.current,
                    64,
                    48
                  );
                  cameraUnstable = stability.cameraUnstable;
                  prevLumaRef.current = currLuma;
                }
              }

              let rawLandmarks: PoseLandmark[] | undefined;
              try {
                const poseRes = poseLandmarkerRef.current.detectForVideo(video, nowMs);
                rawLandmarks = poseRes.landmarks?.[0] as PoseLandmark[] | undefined;
              } catch (detectErr) {
                console.warn('PoseLandmarker frame detection error:', detectErr);
              }

              const output = motionEngineRef.current.processPoseFrame(rawLandmarks, nowMs, {
                cameraUnstable,
              });

              const repChanged = output.repCount > prevRepCountRef.current;
              const criticalChanged =
                repChanged ||
                output.holdSeconds !== lastOutput.holdSeconds ||
                output.phase !== lastOutput.phase ||
                output.confidenceLevel !== lastOutput.confidenceLevel ||
                output.classifiedExercise !== lastOutput.classifiedExercise ||
                output.protocolMismatch !== lastOutput.protocolMismatch ||
                output.cameraUnstable !== lastOutput.cameraUnstable ||
                output.landmarksVisible !== lastOutput.landmarksVisible;

              if (repChanged) {
                prevRepCountRef.current = output.repCount;
                sound.playRepCount();
              }
              if (output.classifiedExercise) {
                lastDetectedExerciseRef.current = output.classifiedExercise;
              }
              lastOutput = output;

              if (criticalChanged || nowMs - lastUiSyncRef.current >= 100) {
                lastUiSyncRef.current = nowMs;
                setMotionOutput(output);
                setRepCount(output.repCount);
                setHoldSeconds(output.holdSeconds);
                setIncompleteRepCount(output.incompleteRepCount);
                setMotionScore(output.motionIntensity);
                setFeedback(output.feedback);
              }
            }

            // Draw real-time smoothed BlazePose skeleton overlay
            drawPoseOverlay(ctx, canvas.width, canvas.height, lastOutput);

            // Visual motion intensity bar
            const barW = Math.min(
              canvas.width - 32,
              Math.round((lastOutput.motionIntensity / 100) * (canvas.width - 32))
            );
            ctx.fillStyle = lastOutput.cameraUnstable
              ? 'rgba(244, 63, 94, 0.85)'
              : lastOutput.confidenceLevel === 'high'
              ? 'rgba(16, 185, 129, 0.85)'
              : 'rgba(0, 217, 255, 0.75)';
            ctx.fillRect(16, canvas.height - 14, Math.max(8, barW), 6);
          } else if (sandbox) {
            // Explicit Sandbox Demonstration Mode (clearly labeled, never counts as AI verified)
            canvas.width = 640;
            canvas.height = 360;
            ctx.fillStyle = '#061225';
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
            const dip = activeDisplayExerciseId === 'squat' || activeDisplayExerciseId === 'lunge' ? t * 48 : 0;

            ctx.strokeStyle = '#38D9F5';
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

            ctx.fillStyle = '#94A8C7';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              'DEMO PREVIEW ONLY — Practice guide (not eligible for AI Camera Verification bonus)',
              cx,
              28
            );

            const now = Date.now();
            if (t >= 0.88 && demoStageRef.current !== 'PEAK') {
              demoStageRef.current = 'PEAK';
            } else if (t <= 0.12 && demoStageRef.current === 'PEAK') {
              if (now - lastRepTimeRef.current > 1200) {
                lastRepTimeRef.current = now;
                demoStageRef.current = 'READY';
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
    setIsModelLoading(true);

    motionEngineRef.current.setTargetExercise(selectedCameraProtocol);
    motionEngineRef.current.reset();
    prevRepCountRef.current = 0;
    lastDetectedExerciseRef.current = null;
    lastVideoTimeRef.current = -1;
    prevLumaRef.current = null;
    setRepCount(0);
    setHoldSeconds(0);
    setIncompleteRepCount(0);
    setMotionScore(0);
    setMotionOutput(motionEngineRef.current.getSnapshot());
    setFeedback('Loading on-device pose landmark model...');

    try {
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        }),
        ensurePoseLandmarker(),
      ]);

      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch {
            // ignore autoplay rejection if muted inline handles it
          }
          if (!isMountedRef.current) return;
          setIsModelLoading(false);
          setIsCameraActive(true);
          isTrackingRef.current = true;
          setFeedback(
            selectedCameraProtocol === 'auto'
              ? 'Pose tracker active (Auto-Detect). Perform clear full-range repetitions in view.'
              : `Pose tracker active (${MOTION_EXERCISE_LABELS[selectedCameraProtocol]}). Assume starting position in view.`
          );
          startOpticalMotionLoop(false);
          startTimer();
          sound.playClick();
        };
      } else {
        setIsModelLoading(false);
      }
    } catch (err: any) {
      console.warn('Camera or pose model initialization error:', err);
      setIsModelLoading(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('wasm') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('model')) {
        setCameraError(
          'Could not initialize the local pose tracking model. Please refresh and try again, or upload a workout clip on the first tab.'
        );
      } else {
        setCameraError(
          'Camera permission denied or no camera detected. You can upload a workout photo or video on the first tab instead, or practice with the Demo Preview below.'
        );
      }
    }
  };

  const handleFinishCameraWorkout = () => {
    const snap = motionEngineRef.current.getSnapshot();
    const resolvedExercise: CameraTrackableExercise =
      selectedCameraProtocol !== 'auto'
        ? selectedCameraProtocol
        : lastDetectedExerciseRef.current ||
          snap.classifiedExercise ||
          snap.candidateExercise ||
          'squat';
    stopCamera();
    setConfirmCameraExercise(resolvedExercise);
    setRepCount(snap.repCount);
    setHoldSeconds(snap.holdSeconds);
    setCameraIdempotencyKey(createIdempotencyKey());
    setCameraSaveError(null);
    setCameraReviewOpen(true);
  };

  const handleConfirmCameraSave = async () => {
    setIsSavingCamera(true);
    setCameraSaveError(null);

    const verifiedLive =
      !isSandboxDemo &&
      (repCount > 0 || (confirmCameraExercise === 'plank' && holdSeconds >= 5));
    const durMin = Math.max(1, Math.round(workoutDurationSec / 60));
    const idemKey = cameraIdempotencyKey || createIdempotencyKey();
    if (!cameraIdempotencyKey) setCameraIdempotencyKey(idemKey);

    const resolvedName =
      CAMERA_EXERCISES.find(e => e.id === confirmCameraExercise)?.name ||
      MOTION_EXERCISE_LABELS[confirmCameraExercise] ||
      'Workout';

    const result = await logFitnessSession({
      exerciseType: confirmCameraExercise,
      exerciseName: resolvedName,
      repetitions: repCount > 0 ? repCount : undefined,
      durationMinutes: durMin,
      verifiedWithAetherVision: verifiedLive,
      confidence: motionOutput?.confidence,
      notes: isSandboxDemo
        ? 'Practice workout logged manually after Demo Preview.'
        : confirmCameraExercise === 'plank' && holdSeconds > 0
        ? `Live Pose Landmark Tracking (${holdSeconds}s verified plank hold, ${repCount} endurance points).`
        : `Live Pose Landmark Tracking (${repCount} verified repetitions).`,
      idempotencyKey: idemKey,
    });

    setIsSavingCamera(false);
    if (!result.success) {
      setCameraSaveError(result.error || 'Failed to save workout session.');
      return;
    }

    setCameraReviewOpen(false);
    setRepCount(0);
    setHoldSeconds(0);
    setIncompleteRepCount(0);
    setWorkoutDurationSec(0);
    setMotionOutput(null);

    setConfirmedReward({
      kind: 'workout',
      title: resolvedName,
      playerXp: result.rewards?.playerXp ?? 0,
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
      if (poseLandmarkerRef.current) {
        try {
          poseLandmarkerRef.current.close();
        } catch {
          // ignore
        }
        poseLandmarkerRef.current = null;
      }
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
        colors: ['#10B981', '#F59E0B', '#38D9F5', '#FBBF24'],
      });
    }

    setConfirmedReward({
      kind: 'meal',
      title: editableMealTitle.trim() || foodAnalysis.mealTitle,
      playerXp: result.rewards?.playerXp ?? 0,
      gold: result.rewards?.gold ?? 0,
      aetherPoints: result.rewards?.aetherPoints ?? 0,
      deduplicated: result.deduplicated,
      dailyCapReached: result.dailyCapReached,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <FeatureBanner themeId="fitness">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A8C7]">
              <span className="font-['Cinzel'] font-semibold text-[#10B981] uppercase tracking-widest">
                AI Vision Sanctuary
              </span>
              <span aria-hidden="true">·</span>
              <span>Honest Recognition · Verified Rewards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Cinzel'] text-[#F2F7FF]">
              Aether Vision — Workout &amp; Meal AI
            </h1>
            <p className="text-xs sm:text-sm text-[#94A8C7] max-w-2xl leading-relaxed">
              Analyze uploaded workout images/videos, track real movement via camera, or break down
              meal photographs with transparent nutrient estimates and WHO-aligned guidance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-[#061225] p-3.5 rounded-xl border border-[#10B981]/35 text-xs max-w-sm">
            <Shield className="w-4 h-4 text-[#10B981] shrink-0" />
            <span className="text-[#94A8C7]">
              All earned Player XP and Gold are verified and safely credited to your hero.
            </span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-[#1E3A63]">
          <FeatureTabBar
            themeId="fitness"
            layoutId="aether-vision-mode-pill"
            ariaLabel="Aether Vision modes"
            activeId={visionTab}
            onSelect={nextTab => {
              if (nextTab !== 'live_camera') stopCamera();
              setVisionTab(nextTab);
            }}
            tabs={[
              { id: 'workout_media', label: 'Workout Photo / Video AI', icon: Video },
              { id: 'live_camera', label: 'Live Camera Tracker', icon: Camera },
              { id: 'food_photo', label: 'Food & Meal AI Analysis', icon: Utensils },
            ]}
          />
        </div>
      </FeatureBanner>

      <RpgSubTabTransition tabKey={visionTab}>
        {/* =================================================================== */}
        {/* TAB 1: WORKOUT PHOTO / VIDEO UPLOAD AI                              */}
        {/* =================================================================== */}
        {visionTab === 'workout_media' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Upload & Hint */}
            <div className="lg:col-span-5 space-y-4">
              <div className="lq-card p-5 space-y-4">
                <h2 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#10B981]" />
                  <span>Upload Workout Image or Video</span>
                </h2>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
                    Optional Activity Hint
                  </label>
                  <select
                    value={workoutHint}
                    onChange={e => setWorkoutHint(e.target.value as ExerciseType)}
                    className="lq-input"
                  >
                    {EXERCISE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#94A8C7] mt-1.5">
                    AI Vision checks actual visual evidence and distinguishes similar movements honestly.
                  </p>
                </div>

                <label className="block border-2 border-dashed border-[#10B981]/40 hover:border-[#10B981] rounded-2xl p-6 text-center cursor-pointer bg-[#061225] transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={handleWorkoutFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-[#0A1930] border border-[#10B981]/40 flex items-center justify-center mx-auto mb-3 text-[#10B981]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-[#F2F7FF]">
                    Choose a Workout Photo or Video Clip
                  </p>
                  <p className="text-[11px] text-[#94A8C7] mt-1">
                    Videos enable repetition cycle checks; single photos assess exercise &amp; form
                    only (max 16 MB).
                  </p>
                </label>

                {workoutMediaPreview && (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-[#1E3A63] bg-[#061225] aspect-video flex items-center justify-center">
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
                      className="lq-btn lq-btn-gold w-full py-3 text-xs disabled:opacity-60"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isAnalyzingWorkout
                          ? 'Analyzing Movement...'
                          : 'Analyze with Aether Vision'}
                      </span>
                    </button>
                  </div>
                )}

                {workoutVisionError && (
                  <div className="p-3.5 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/45 text-xs text-[#F2F7FF] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                    <span>{workoutVisionError}</span>
                  </div>
                )}
              </div>

              {/* Age-Appropriate WHO Physical Activity Guidance */}
              <div className="lq-card p-5 space-y-2 border-[#10B981]/35">
                <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
                  <Activity className="w-4 h-4" />
                  <span>{activityGuide.headline}</span>
                </div>
                <p className="text-xs text-[#94A8C7] leading-relaxed">
                  {activityGuide.recommendation}
                </p>
              </div>
            </div>

            {/* Right 7 Cols: Structured Analysis & Review-Before-Save */}
            <div className="lg:col-span-7 space-y-4">
              {!workoutAnalysis ? (
                <div className="lq-card p-8 text-center space-y-3 h-full flex flex-col items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#10B981]" />
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                    Ready for Movement Analysis
                  </h3>
                  <p className="text-xs text-[#94A8C7] max-w-md leading-relaxed">
                    Upload a photo or short workout video on the left. Aether Vision will
                    distinguish similar exercises, explain confidence, note any counting limitations,
                    and let you review and correct details before claiming rewards.
                  </p>
                </div>
              ) : (
                <div className="lq-card-gold p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-[#10B981] font-semibold block">
                        {workoutAnalysis.movementCategory} ·{' '}
                        {workoutAnalysis.mediaKind.toUpperCase()}
                      </span>
                      <h3 className="font-['Cinzel'] font-bold text-xl text-[#F2F7FF] mt-0.5">
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
                  <div className="p-3.5 rounded-xl bg-[#061225] border border-[#38D9F5]/45 text-xs text-[#F2F7FF] flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#38D9F5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#38D9F5]">
                        {workoutAnalysis.repsSupported
                          ? `Estimated ${workoutAnalysis.estimatedReps} reps (${workoutAnalysis.estimatedSets} set${workoutAnalysis.estimatedSets > 1 ? 's' : ''}) — verify below`
                          : 'Repetitions Not Auto-Invented'}
                      </p>
                      <p className="text-[#94A8C7] mt-0.5 leading-relaxed">
                        {workoutAnalysis.countingLimitation}
                      </p>
                    </div>
                  </div>

                  {workoutAnalysis.similarExerciseDistinction && (
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs text-[#94A8C7]">
                      <span className="font-semibold text-[#38D9F5] block mb-1">
                        Movement Distinction
                      </span>
                      {workoutAnalysis.similarExerciseDistinction}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs space-y-1.5">
                      <span className="font-semibold text-[#38D9F5] block">Visual Observations</span>
                      <ul className="space-y-1 text-[#94A8C7]">
                        {workoutAnalysis.observations.map((obs, i) => (
                          <li key={i}>• {obs}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#10B981]/30 text-xs space-y-1.5">
                      <span className="font-semibold text-[#10B981] block">
                        Form &amp; Safety Notes
                      </span>
                      <ul className="space-y-1 text-[#94A8C7]">
                        {workoutAnalysis.safetyAndFormNotes.map((note, i) => (
                          <li key={i}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {workoutAnalysis.ageAppropriateGuidance && (
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#10B981]/40 text-xs text-[#F2F7FF]">
                      <span className="font-semibold text-[#10B981] block mb-0.5">
                        {minorUser ? 'Youth Movement Guidance' : 'Physical Activity Guidance'}
                      </span>
                      <span className="text-[#94A8C7]">
                        {workoutAnalysis.ageAppropriateGuidance}
                      </span>
                    </div>
                  )}

                  {/* User Review & Manual Correction Before Saving */}
                  <div className="pt-4 border-t border-[#1E3A63] space-y-4">
                    <h4 className="font-['Cinzel'] font-bold text-xs uppercase tracking-wider text-[#10B981]">
                      Review &amp; Correct Before Claiming Rewards
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">
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
                          className="lq-input"
                        >
                          {EXERCISE_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">
                          Session Title
                        </label>
                        <input
                          type="text"
                          value={confirmExerciseName}
                          onChange={e => setConfirmExerciseName(e.target.value)}
                          className="lq-input"
                        />
                      </div>

                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={confirmDurationMin}
                          onChange={e =>
                            setConfirmDurationMin(Math.max(1, Number(e.target.value || 1)))
                          }
                          className="lq-input font-mono tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">
                          Repetitions{' '}
                          {workoutAnalysis.mediaKind === 'image'
                            ? '(Optional Manual Entry)'
                            : '(Verified / Adjusted)'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={300}
                          value={confirmReps}
                          onChange={e => setConfirmReps(Math.max(0, Number(e.target.value || 0)))}
                          className="lq-input font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    {workoutSaveError && (
                      <div className="p-3 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/50 text-xs text-[#F2F7FF]">
                        {workoutSaveError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-[#94A8C7]">
                        {workoutAnalysis.mediaKind === 'video' &&
                        workoutAnalysis.repsSupported &&
                        confirmReps > 0
                          ? 'Eligible for Video Rep-Verified XP & Warrior’s Momentum buff.'
                          : 'Saved as standard duration-based session XP (single images cannot verify full reps).'}
                      </span>

                      <button
                        type="button"
                        onClick={handleConfirmWorkoutMediaLog}
                        disabled={isSavingWorkout}
                        className="lq-btn lq-btn-gold px-5 py-3 text-xs shrink-0 disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isSavingWorkout ? 'Saving to Realm...' : 'Confirm & Claim Rewards'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: LIVE CAMERA REAL BIOMECHANICAL POSE TRACKING                 */}
        {/* =================================================================== */}
        {visionTab === 'live_camera' && (
          <div className="space-y-6">
            <div className="lq-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#10B981]">
                  Select Exercise Protocol
                </label>
                <span className="text-[11px] text-[#94A8C7]">
                  33-point BlazePose Landmark Tracking · Strict Form Thresholds
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCameraProtocol('auto');
                    motionEngineRef.current.setTargetExercise('auto');
                  }}
                  disabled={isCameraActive || isModelLoading}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCameraProtocol === 'auto'
                      ? 'bg-[#10B981]/12 border-[#10B981] ring-1 ring-[#10B981]/60'
                      : 'bg-[#061225] border-[#1E3A63] hover:border-[#10B981]/45 text-[#94A8C7]'
                  } ${isCameraActive || isModelLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <p className="text-xs font-bold text-[#10B981] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Auto-Detect</span>
                  </p>
                  <p className="text-[10px] text-[#94A8C7] font-mono mt-0.5">
                    Multi-Exercise Classifier
                  </p>
                </button>

                {CAMERA_EXERCISES.map(ex => {
                  const isSelected = selectedCameraProtocol === ex.id;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedCameraProtocol(ex.id);
                        motionEngineRef.current.setTargetExercise(ex.id);
                      }}
                      disabled={isCameraActive || isModelLoading}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#1677FF]/25 border-[#00D9FF]/70 ring-1 ring-[#00D9FF]/40'
                          : 'bg-[#061225] border-[#1E3A63] hover:border-[#38D9F5]/55 text-[#94A8C7]'
                      } ${isCameraActive || isModelLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <p className="text-xs font-bold text-[#F2F7FF]">{ex.name}</p>
                      <p className="text-[10px] text-[#38D9F5] font-mono mt-0.5">
                        {ex.id === 'plank' ? 'Isometric Hold Timer' : 'Pose Rep Verification'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="relative aspect-video rounded-2xl bg-[#061225] border-2 border-[#10B981]/40 overflow-hidden shadow-[0_16px_40px_rgba(3,10,24,0.85)] flex items-center justify-center">
                  <video ref={videoRef} playsInline muted className="hidden" />

                  {isCameraActive ? (
                    <canvas ref={canvasRef} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-8 max-w-md">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0A1930] border border-[#10B981]/45 flex items-center justify-center text-[#10B981] mb-4">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h3 className="font-['Cinzel'] font-bold text-lg text-[#F2F7FF] mb-2">
                        Pose Landmark Tracker Ready
                      </h3>
                      <p className="text-xs text-[#94A8C7] leading-relaxed mb-6">
                        {selectedCameraProtocol === 'auto'
                          ? 'Auto-Detect classifies Squats, Push-ups, Lunges, Jumping Jacks, Planks, High Knees, Bicep Curls, and Shoulder Presses from live joint kinematics.'
                          : currentCameraExercise.instructions}
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={isModelLoading}
                        className="lq-btn lq-btn-gold px-6 py-3 text-xs disabled:opacity-60"
                      >
                        {isModelLoading ? 'Initializing Pose Model...' : 'Start Camera Tracking'}
                      </button>
                    </div>
                  )}

                  {isCameraActive && (
                    <>
                      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                        <div className="flex items-center gap-2 bg-[#061225]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#10B981]/45 text-xs font-semibold text-[#F2F7FF]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              motionOutput?.cameraUnstable
                                ? 'bg-[#F43F5E]'
                                : motionOutput?.landmarksVisible
                                ? 'bg-[#10B981]'
                                : 'bg-[#F59E0B]'
                            }`}
                          />
                          <span>
                            {isSandboxDemo
                              ? `DEMO PREVIEW: ${currentCameraExercise.name.toUpperCase()}`
                              : selectedCameraProtocol === 'auto'
                              ? motionOutput?.classifiedExercise
                                ? `DETECTED: ${MOTION_EXERCISE_LABELS[motionOutput.classifiedExercise].toUpperCase()} (${motionOutput.confidence}%)`
                                : `ANALYZING MOVEMENT (${motionOutput?.confidence ?? 0}%)`
                              : `TRACKING: ${MOTION_EXERCISE_LABELS[selectedCameraProtocol].toUpperCase()} (${motionOutput?.confidence ?? 0}%)`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isSandboxDemo && motionOutput && (
                            <ConfidenceBadge
                              confidence={motionOutput.confidence}
                              level={motionOutput.confidenceLevel}
                            />
                          )}
                          <div className="bg-[#061225]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00D9FF]/45 text-xs font-mono font-bold text-[#38D9F5] tabular-nums">
                            {Math.floor(workoutDurationSec / 60)}:
                            {(workoutDurationSec % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-5 left-4 flex items-end gap-2">
                        <div className="bg-[#061225]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#10B981]/60 shadow-lg">
                          <span className="text-[10px] text-[#10B981] uppercase tracking-widest font-bold block">
                            {isSandboxDemo
                              ? 'Demo Cycles'
                              : activeDisplayExerciseId === 'plank'
                              ? 'Endurance Units (5s)'
                              : 'Verified Reps'}
                          </span>
                          <span className="font-mono text-3xl font-bold text-[#F2F7FF] tabular-nums">
                            {repCount}
                          </span>
                        </div>

                        {!isSandboxDemo && activeDisplayExerciseId === 'plank' && (
                          <div className="bg-[#061225]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#00D9FF]/60 shadow-lg">
                            <span className="text-[10px] text-[#38D9F5] uppercase tracking-widest font-bold block">
                              Aligned Hold
                            </span>
                            <span className="font-mono text-2xl font-bold text-[#38D9F5] tabular-nums">
                              {holdSeconds}s
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-5 right-4">
                        <button
                          type="button"
                          onClick={handleFinishCameraWorkout}
                          className="lq-btn bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-[#F2F7FF] px-4 py-2 text-xs shadow-lg"
                        >
                          <CameraOff className="w-4 h-4" />
                          <span>Review &amp; Finish</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isCameraActive && !isSandboxDemo && motionOutput && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="lq-card px-3 py-2.5">
                      <span className="text-[10px] uppercase text-[#94A8C7] block">Rep Phase</span>
                      <span className="font-mono font-bold text-[#38D9F5]">{motionOutput.phase}</span>
                    </div>
                    <div className="lq-card px-3 py-2.5">
                      <span className="text-[10px] uppercase text-[#94A8C7] block">
                        Knee / Elbow
                      </span>
                      <span className="font-mono font-bold text-[#F2F7FF] tabular-nums">
                        {motionOutput.angles.primaryKneeDeg != null
                          ? `${motionOutput.angles.primaryKneeDeg}°`
                          : '—'}{' '}
                        /{' '}
                        {motionOutput.angles.primaryElbowDeg != null
                          ? `${motionOutput.angles.primaryElbowDeg}°`
                          : '—'}
                      </span>
                    </div>
                    <div className="lq-card px-3 py-2.5">
                      <span className="text-[10px] uppercase text-[#94A8C7] block">
                        Motion Intensity
                      </span>
                      <span className="font-mono font-bold text-[#10B981] tabular-nums">
                        {motionScore}%
                      </span>
                    </div>
                    <div className="lq-card px-3 py-2.5">
                      <span className="text-[10px] uppercase text-[#94A8C7] block">
                        Partial Reps Ignored
                      </span>
                      <span className="font-mono font-bold text-[#38D9F5] tabular-nums">
                        {incompleteRepCount}
                      </span>
                    </div>
                  </div>
                )}

                {motionOutput?.protocolMismatch && isCameraActive && !isSandboxDemo && (
                  <div className="p-3.5 rounded-xl bg-[#061225] border border-[#F59E0B]/55 text-xs text-[#FBBF24] flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{motionOutput.feedback}</span>
                  </div>
                )}

                {cameraError && (
                  <div className="p-4 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/45 text-xs text-[#F2F7FF] flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#F43F5E] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Camera Access Note</p>
                      <p className="text-[#94A8C7] mt-0.5">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSandboxDemo(true);
                          setIsCameraActive(true);
                          isTrackingRef.current = true;
                          startOpticalMotionLoop(true);
                          startTimer();
                        }}
                        className="mt-2 text-xs font-semibold underline text-[#38D9F5] hover:text-[#F2F7FF]"
                      >
                        Open Visual Demo Preview (Does NOT grant Vision Bonus XP)
                      </button>
                    </div>
                  </div>
                )}

                <div className="lq-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#061225] text-[#10B981] flex items-center justify-center shrink-0 border border-[#10B981]/40">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#10B981] font-bold block">
                      Live Biomechanical Feedback
                    </span>
                    <p className="text-xs text-[#F2F7FF] font-medium mt-0.5">{feedback}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="lq-card-gold p-5 space-y-3 text-xs">
                  <h3 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#10B981]" />
                    <span>Reward Rules</span>
                  </h3>
                  <div className="p-3 rounded-xl bg-[#061225] border border-[#1E3A63] flex justify-between gap-2">
                    <span className="text-[#94A8C7]">Vision-Verified Base + Rep XP</span>
                    <span className="font-mono font-bold text-[#10B981] tabular-nums">
                      max(10, reps) × 4 + 30
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#061225] border border-[#1E3A63] flex justify-between gap-2">
                    <span className="text-[#94A8C7]">Gold Earned</span>
                    <span className="font-mono font-bold text-[#FBBF24] tabular-nums">
                      40 + min(60, reps)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A8C7] leading-relaxed">
                    Daily cap: up to 6 rewarded workout sessions per day. Only full range-of-motion
                    reps verified at high pose confidence count.
                  </p>
                </div>

                <div className="lq-card p-5 space-y-2 text-xs">
                  <h4 className="font-['Cinzel'] font-bold text-[#F2F7FF]">
                    {currentCameraExercise.name} Form Guide
                  </h4>
                  <p className="text-[#94A8C7] leading-relaxed">
                    {currentCameraExercise.instructions}
                  </p>
                  <p className="text-[#10B981] font-semibold pt-1">
                    Target: {currentCameraExercise.targetMuscles}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: FOOD & MEAL PHOTO AI ANALYSIS                                */}
        {/* =================================================================== */}
        {visionTab === 'food_photo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Upload Food Photo */}
            <div className="lg:col-span-5 space-y-4">
              <div className="lq-card p-5 space-y-4">
                <h2 className="font-['Cinzel'] font-bold text-sm text-[#F2F7FF] flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#10B981]" />
                  <span>Upload Meal Photograph</span>
                </h2>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#10B981] mb-1.5">
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
                            ? 'bg-[#1677FF] border-[#00D9FF]/60 text-[#F2F7FF] font-semibold'
                            : 'bg-[#061225] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block border-2 border-dashed border-[#10B981]/40 hover:border-[#10B981] rounded-2xl p-6 text-center cursor-pointer bg-[#061225] transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFoodFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-[#0A1930] border border-[#10B981]/40 flex items-center justify-center mx-auto mb-3 text-[#10B981]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-[#F2F7FF]">
                    Select a Meal or Snack Photograph
                  </p>
                  <p className="text-[11px] text-[#94A8C7] mt-1">
                    Supports home-cooked plates, thalis, bowls, fruits, and snacks (JPG, PNG, WebP).
                  </p>
                </label>

                {foodImagePreview && (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-[#1E3A63] bg-[#061225] aspect-video flex items-center justify-center">
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
                      className="lq-btn lq-btn-gold w-full py-3 text-xs disabled:opacity-60"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isAnalyzingFood ? 'Analyzing Meal...' : 'Analyze Meal Nutrition'}
                      </span>
                    </button>
                  </div>
                )}

                {foodVisionError && (
                  <div className="p-3.5 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/45 text-xs text-[#F2F7FF] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                    <span>{foodVisionError}</span>
                  </div>
                )}
              </div>

              <div className="lq-card p-4 text-xs text-[#94A8C7] space-y-1.5">
                <p className="font-semibold text-[#10B981]">
                  Honesty &amp; Educational Nutrition Pledge
                </p>
                <p className="text-[11px] text-[#94A8C7] leading-relaxed">
                  Photo nutrition estimates show approximate ranges and contributing food groups—not
                  laboratory measurements. LifeQuest never shames foods or diagnoses deficiencies.
                </p>
              </div>
            </div>

            {/* Right 7 Cols: Nutritional Breakdown & Confirmation */}
            <div className="lg:col-span-7 space-y-4">
              {!foodAnalysis || !scaledTotals ? (
                <div className="lq-card p-8 text-center space-y-3 h-full flex flex-col items-center justify-center">
                  <Utensils className="w-10 h-10 text-[#10B981]" />
                  <h3 className="font-['Cinzel'] font-bold text-base text-[#F2F7FF]">
                    Meal Nutrition &amp; Education Engine
                  </h3>
                  <p className="text-xs text-[#94A8C7] max-w-md leading-relaxed">
                    Upload any meal photo to identify visible foods, estimate approximate macro
                    &amp; fibre ranges, discover micronutrient contributors, and review before adding
                    it to your daily nutrition overview.
                  </p>
                </div>
              ) : (
                <div className="lq-card-gold p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-[#10B981] font-semibold block">
                        Image-Based Estimate · Verify Before Logging
                      </span>
                      <h3 className="font-['Cinzel'] font-bold text-xl text-[#F2F7FF] mt-0.5">
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

                  <div className="p-3.5 rounded-xl bg-[#061225] border border-[#F59E0B]/45 text-xs text-[#F2F7FF] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#FBBF24]">
                        {foodAnalysis.estimateDisclaimer}
                      </p>
                      <p className="mt-1 text-[#94A8C7]">{foodAnalysis.allergenWatchNotice}</p>
                    </div>
                  </div>

                  {/* Portion Calibration Control */}
                  <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-semibold text-[#10B981] block">
                        Adjust Portion Scale (If Plate Was Smaller/Larger)
                      </span>
                      <span className="text-[11px] text-[#94A8C7]">
                        Scales estimated nutrient ranges transparently
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0.75, 1, 1.25, 1.5].map(mult => (
                        <button
                          key={mult}
                          type="button"
                          onClick={() => setPortionMultiplier(mult)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                            portionMultiplier === mult
                              ? 'bg-[#1677FF] border-[#00D9FF]/60 text-[#F2F7FF]'
                              : 'bg-[#0A1930] border-[#1E3A63] text-[#94A8C7] hover:text-[#F2F7FF]'
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
                        color: 'text-[#FBBF24]',
                      },
                      {
                        label: 'Protein',
                        val: `${scaledTotals.proteinG.min}–${scaledTotals.proteinG.max}`,
                        unit: 'g',
                        color: 'text-[#38D9F5]',
                      },
                      {
                        label: 'Carbohydrates',
                        val: `${scaledTotals.carbsG.min}–${scaledTotals.carbsG.max}`,
                        unit: 'g',
                        color: 'text-[#F2F7FF]',
                      },
                      {
                        label: 'Healthy Fats',
                        val: `${scaledTotals.fatG.min}–${scaledTotals.fatG.max}`,
                        unit: 'g',
                        color: 'text-[#10B981]',
                      },
                      {
                        label: 'Dietary Fibre',
                        val: `${scaledTotals.fibreG.min}–${scaledTotals.fibreG.max}`,
                        unit: 'g',
                        color: 'text-[#10B981]',
                      },
                    ].map(card => (
                      <div
                        key={card.label}
                        className="p-3 rounded-xl bg-[#061225] border border-[#1E3A63]"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-[#94A8C7] block">
                          {card.label}
                        </span>
                        <span
                          className={`font-mono text-sm font-bold ${card.color} block mt-1 tabular-nums`}
                        >
                          {card.val}
                        </span>
                        <span className="text-[10px] text-[#647A9E]">{card.unit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Detected Items & Portion Uncertainty */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                      Identified Items &amp; Portion Notes
                    </h4>
                    <div className="space-y-2">
                      {foodAnalysis.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-[#F2F7FF]">{item.name}</span>
                              <span className="text-[11px] text-[#38D9F5]">
                                · {item.foodGroup} · {item.estimatedPortion}
                              </span>
                            </div>
                            {item.likelyIngredients.length > 0 && (
                              <p className="text-[11px] text-[#94A8C7] mt-0.5">
                                Likely ingredients: {item.likelyIngredients.join(', ')}
                              </p>
                            )}
                            <p className="text-[11px] text-[#F59E0B] mt-0.5">
                              {item.uncertaintyNote}
                            </p>
                          </div>
                          <div className="text-[11px] font-mono text-[#94A8C7] tabular-nums shrink-0 text-right">
                            ~{Math.round(item.energyKcal * portionMultiplier)} kcal · P{' '}
                            {Math.round(item.proteinG * portionMultiplier)}g · F{' '}
                            {Math.round(item.fibreG * portionMultiplier)}g fibre
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {foodAnalysis.clarifyingQuestions.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] text-xs space-y-1">
                      <span className="font-semibold text-[#38D9F5] block">
                        What Could Change This Estimate?
                      </span>
                      <ul className="text-[#94A8C7] space-y-1">
                        {foodAnalysis.clarifyingQuestions.map((q, i) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Nutrient Contributors & Micronutrients */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#1E3A63] space-y-1.5">
                      <span className="font-semibold text-[#38D9F5] block">
                        Food Groups &amp; Macro Contributors
                      </span>
                      <p className="text-[#94A8C7]">
                        <strong className="text-[#F2F7FF]">Protein:</strong>{' '}
                        {foodAnalysis.nutrientContributors.proteinSources.join(', ') ||
                          'Minimal visible'}
                      </p>
                      <p className="text-[#94A8C7]">
                        <strong className="text-[#F2F7FF]">Carbohydrates:</strong>{' '}
                        {foodAnalysis.nutrientContributors.carbSources.join(', ') ||
                          'Minimal visible'}
                      </p>
                      <p className="text-[#94A8C7]">
                        <strong className="text-[#F2F7FF]">Fats:</strong>{' '}
                        {foodAnalysis.nutrientContributors.healthyFatSources.join(', ') ||
                          'Cooking oils / trace'}
                      </p>
                      <p className="text-[#94A8C7]">
                        <strong className="text-[#F2F7FF]">Fibre:</strong>{' '}
                        {foodAnalysis.nutrientContributors.fibreSources.join(', ') ||
                          'Whole plant sources'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#061225] border border-[#10B981]/30 space-y-1.5">
                      <span className="font-semibold text-[#10B981] block">
                        Key Micronutrients Observed
                      </span>
                      {foodAnalysis.micronutrients.length === 0 ? (
                        <p className="text-[#94A8C7]">
                          Pair with fresh produce or whole grains for wider micronutrient variety.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 text-[#94A8C7]">
                          {foodAnalysis.micronutrients.slice(0, 4).map((m, i) => (
                            <li key={i}>
                              <strong className="text-[#F2F7FF]">{m.name}</strong> (
                              {m.qualitativeLevel})
                              {m.contributingFoods.length > 0 &&
                                ` via ${m.contributingFoods.join(', ')}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Educational Explanation & Balance Ideas */}
                  <div className="p-4 rounded-xl bg-[#061225] border border-[#10B981]/35 text-xs space-y-2">
                    <span className="font-semibold text-[#10B981] block">
                      Educational Nutrition Notes (WHO &amp; ICMR–NIN 2024 Aligned)
                    </span>
                    <p className="text-[#F2F7FF] leading-relaxed">
                      {foodAnalysis.educationalExplanation}
                    </p>
                    {foodAnalysis.varietyAndBalanceSuggestions.length > 0 && (
                      <ul className="space-y-1 text-[#94A8C7] pt-1">
                        {foodAnalysis.varietyAndBalanceSuggestions.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Editable Confirm & Save Controls */}
                  <div className="pt-4 border-t border-[#1E3A63] space-y-3 text-xs">
                    <h4 className="font-['Cinzel'] font-bold uppercase tracking-wider text-[#10B981]">
                      Review &amp; Correct Before Logging
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">Meal Title</label>
                        <input
                          type="text"
                          value={editableMealTitle}
                          onChange={e => setEditableMealTitle(e.target.value)}
                          className="lq-input"
                        />
                      </div>
                      <div>
                        <label className="block text-[#94A8C7] font-medium mb-1">
                          Dietary Style
                        </label>
                        <select
                          value={editableDietCategory}
                          onChange={e =>
                            setEditableDietCategory(e.target.value as DietaryPreference)
                          }
                          className="lq-input"
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
                      <label className="block text-[#94A8C7] font-medium mb-1">
                        Food Items Logged (Edit or Add Missing Items)
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {editableFoodItems.map((it, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#061225] border border-[#1E3A63] text-[#F2F7FF]"
                          >
                            <span>{it}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditableFoodItems(prev => prev.filter((_, idx) => idx !== i))
                              }
                              className="text-[#94A8C7] hover:text-[#F43F5E]"
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
                          className="lq-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFoodItemInput.trim()) return;
                            setEditableFoodItems(prev => [...prev, newFoodItemInput.trim()]);
                            setNewFoodItemInput('');
                          }}
                          className="lq-btn lq-btn-secondary px-3 py-2 text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {mealSaveError && (
                      <div className="p-3 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/50 text-xs text-[#F2F7FF]">
                        {mealSaveError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleConfirmLogAnalyzedMeal}
                        disabled={isSavingMeal}
                        className="lq-btn lq-btn-gold px-5 py-3 text-xs disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSavingMeal ? 'Saving Meal...' : 'Confirm & Log Meal'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </RpgSubTabTransition>

      {/* ===================================================================== */}
      {/* LIVE CAMERA REVIEW BEFORE SAVE MODAL                                  */}
      {/* ===================================================================== */}
      <RpgModalWrapper
        isOpen={cameraReviewOpen}
        onClose={() => setCameraReviewOpen(false)}
        panelClassName="w-full max-w-md"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-review-modal-title"
          className="lq-card-gold p-6 space-y-4"
        >
          <h3
            id="camera-review-modal-title"
            className="text-lg font-bold font-['Cinzel'] text-[#F2F7FF]"
          >
            Confirm Camera Workout Session
          </h3>
          <p className="text-xs text-[#94A8C7] leading-relaxed">
            {isSandboxDemo
              ? 'Demo Preview does not qualify for Vision-verified bonus XP. Adjust your actual workout duration below to save a standard workout log.'
              : confirmCameraExercise === 'plank'
              ? `Pose tracking recorded ${holdSeconds}s aligned plank hold (${repCount} endurance unit${repCount === 1 ? '' : 's'}) over ${Math.max(1, Math.round(workoutDurationSec / 60))} minute(s).`
              : `Pose landmark tracking verified ${repCount} repetition${repCount === 1 ? '' : 's'} over ${Math.max(1, Math.round(workoutDurationSec / 60))} minute(s). Review before claiming server rewards.`}
          </p>

          <div className="text-xs">
            <label className="block text-[#94A8C7] mb-1">Verified Exercise</label>
            <select
              value={confirmCameraExercise}
              onChange={e => setConfirmCameraExercise(e.target.value as CameraTrackableExercise)}
              className="lq-input"
            >
              {CAMERA_EXERCISES.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#94A8C7] mb-1">
                {confirmCameraExercise === 'plank' ? 'Endurance Units (5s)' : 'Repetitions'}
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={repCount}
                onChange={e => setRepCount(Math.max(0, Number(e.target.value || 0)))}
                className="lq-input font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#94A8C7] mb-1">Duration (Min)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={Math.max(1, Math.round(workoutDurationSec / 60))}
                onChange={e =>
                  setWorkoutDurationSec(Math.max(1, Number(e.target.value || 1)) * 60)
                }
                className="lq-input font-mono tabular-nums"
              />
            </div>
          </div>

          {cameraSaveError && (
            <div className="p-3 rounded-xl bg-[#F43F5E]/12 border border-[#F43F5E]/50 text-xs text-[#F2F7FF]">
              {cameraSaveError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setCameraReviewOpen(false);
                setRepCount(0);
                setHoldSeconds(0);
                setIncompleteRepCount(0);
                setWorkoutDurationSec(0);
              }}
              className="lq-btn lq-btn-secondary flex-1 py-2.5 text-xs"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleConfirmCameraSave}
              disabled={isSavingCamera}
              className="lq-btn lq-btn-gold flex-1 py-2.5 text-xs disabled:opacity-60"
            >
              {isSavingCamera ? 'Saving...' : 'Claim & Save'}
            </button>
          </div>
        </div>
      </RpgModalWrapper>

      {/* ===================================================================== */}
      {/* AUTHORITATIVE SERVER REWARD CONFIRMATION MODAL                        */}
      {/* ===================================================================== */}
      <RpgModalWrapper
        isOpen={Boolean(confirmedReward)}
        onClose={() => setConfirmedReward(null)}
        panelClassName="w-full max-w-md"
      >
        {confirmedReward && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vision-reward-modal-title"
            className="lq-card-gold p-6 sm:p-8 text-center space-y-5"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#10B981]/15 border border-[#10B981]/50 flex items-center justify-center text-[#10B981]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3
                id="vision-reward-modal-title"
                className="text-2xl font-bold font-['Cinzel'] text-[#F2F7FF]"
              >
                {confirmedReward.kind === 'workout' ? 'Workout Saved!' : 'Meal Logged!'}
              </h3>
              <p className="text-xs text-[#94A8C7] mt-1">{confirmedReward.title}</p>
            </div>

            {confirmedReward.dailyCapReached && (
              <div className="p-3 rounded-xl bg-[#061225] border border-[#F59E0B]/50 text-xs text-[#FBBF24]">
                Daily reward limit reached for this category today — your log was saved cleanly
                without extra XP/Gold.
              </div>
            )}

            {confirmedReward.deduplicated && (
              <div className="p-3 rounded-xl bg-[#061225] border border-[#38D9F5]/45 text-xs text-[#38D9F5] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Duplicate submission prevented — rewards already credited once.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 bg-[#061225] p-4 rounded-xl border border-[#1E3A63]">
              <div>
                <span className="text-[10px] text-[#94A8C7] uppercase tracking-wider block">
                  Player XP
                </span>
                <span className="font-mono text-xl font-bold text-[#10B981] tabular-nums">
                  +<AnimatedCounter value={confirmedReward.playerXp} />
                </span>
              </div>
              <div className="border-l border-[#1E3A63]">
                <span className="text-[10px] text-[#94A8C7] uppercase tracking-wider block">
                  Gold
                </span>
                <span className="font-mono text-xl font-bold text-[#FBBF24] flex items-center justify-center gap-1 tabular-nums">
                  <Coins className="w-3.5 h-3.5" />+
                  <AnimatedCounter value={confirmedReward.gold} />
                </span>
              </div>
            </div>

            {confirmedReward.buffActivated && (
              <div className="p-3 rounded-xl bg-[#061225] border border-[#10B981]/45 text-xs text-[#10B981] flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 shrink-0" />
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
                  className="lq-btn lq-btn-secondary flex-1 py-3 px-4 text-xs"
                >
                  <span>View Daily Nutrition</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmedReward(null)}
                className="lq-btn lq-btn-gold flex-1 py-3 px-4 text-xs"
              >
                Continue Journey
              </button>
            </div>
          </div>
        )}
      </RpgModalWrapper>
    </div>
  );
};
