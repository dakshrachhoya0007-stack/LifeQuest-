import type { CameraTrackableExercise } from '../types/game';

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type SupportedMotionExercise = CameraTrackableExercise;
export type MotionConfidenceTier = 'high' | 'medium' | 'low';
export type MotionRepPhase = 'WAIT_START' | 'READY' | 'ACTIVE_PHASE' | 'PEAK';
export type CameraBodyOrientation = 'front' | 'side' | 'unknown';

export interface MotionJointAngles {
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  primaryKneeDeg: number | null;
  leftElbowDeg: number | null;
  rightElbowDeg: number | null;
  primaryElbowDeg: number | null;
  torsoTiltDeg: number | null;
  hipAlignmentDeg: number | null;
  leftArmAbductionDeg: number | null;
  rightArmAbductionDeg: number | null;
}

export interface MotionEngineOutput {
  /** Authoritative classified exercise when confidence >= 72%, otherwise null (medium/low never invents a match). */
  classifiedExercise: SupportedMotionExercise | null;
  /** Top candidate score before gating (for telemetry/debugging). */
  candidateExercise: SupportedMotionExercise | null;
  confidence: number; // 0..100
  confidenceLevel: MotionConfidenceTier;
  classificationStatus: 'identified' | 'analyzing' | 'unreliable';
  /** True when user picked a specific protocol and high-confidence evidence shows a different exercise. */
  protocolMismatch: boolean;
  activeProtocol: SupportedMotionExercise | 'auto';
  repCount: number;
  incompleteRepCount: number;
  holdSeconds: number;
  phase: MotionRepPhase;
  orientation: CameraBodyOrientation;
  angles: MotionJointAngles;
  landmarksVisible: boolean;
  cameraUnstable: boolean;
  motionIntensity: number; // 0..100 derived strictly from real joint angular velocity
  feedback: string;
  smoothedLandmarks: PoseLandmark[] | null;
}

export const MOTION_EXERCISE_LABELS: Record<SupportedMotionExercise, string> = {
  squat: 'Squats',
  pushup: 'Push-ups',
  lunge: 'Lunges',
  jumping_jack: 'Jumping Jacks',
  plank: 'Planks',
  knee_raise: 'High Knees',
  bicep_curl: 'Bicep Curls',
  shoulder_press: 'Shoulder Presses',
};

// MediaPipe 33-point BlazePose indices
export const POSE_IDX = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export const POSE_SKELETON_CONNECTIONS: Array<[number, number]> = [
  [POSE_IDX.LEFT_SHOULDER, POSE_IDX.RIGHT_SHOULDER],
  [POSE_IDX.LEFT_SHOULDER, POSE_IDX.LEFT_ELBOW],
  [POSE_IDX.LEFT_ELBOW, POSE_IDX.LEFT_WRIST],
  [POSE_IDX.RIGHT_SHOULDER, POSE_IDX.RIGHT_ELBOW],
  [POSE_IDX.RIGHT_ELBOW, POSE_IDX.RIGHT_WRIST],
  [POSE_IDX.LEFT_SHOULDER, POSE_IDX.LEFT_HIP],
  [POSE_IDX.RIGHT_SHOULDER, POSE_IDX.RIGHT_HIP],
  [POSE_IDX.LEFT_HIP, POSE_IDX.RIGHT_HIP],
  [POSE_IDX.LEFT_HIP, POSE_IDX.LEFT_KNEE],
  [POSE_IDX.LEFT_KNEE, POSE_IDX.LEFT_ANKLE],
  [POSE_IDX.RIGHT_HIP, POSE_IDX.RIGHT_KNEE],
  [POSE_IDX.RIGHT_KNEE, POSE_IDX.RIGHT_ANKLE],
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const avg = (vals: number[]) => (vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0);
const dist2D = (a: PoseLandmark, b: PoseLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
const midPoint = (a: PoseLandmark, b: PoseLandmark): PoseLandmark => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
});

const isVisible = (lm: PoseLandmark | undefined, threshold = 0.42): lm is PoseLandmark =>
  Boolean(lm && Number.isFinite(lm.x) && Number.isFinite(lm.y) && (lm.visibility ?? 1) >= threshold);

export function computeAngleDeg(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magA = Math.hypot(abx, aby);
  const magC = Math.hypot(cbx, cby);
  if (magA < 1e-5 || magC < 1e-5) return 180;
  const cos = clamp(dot / (magA * magC), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Computes global edge-frame optical shift to distinguish whole-camera panning/shake
 * from centered human exercise movement.
 */
export function computeBackgroundMotionStability(
  currLuma: Uint8Array,
  prevLuma: Uint8Array | null,
  width: number,
  height: number
): { cameraUnstable: boolean; borderShiftRatio: number } {
  if (!prevLuma || prevLuma.length !== currLuma.length) {
    return { cameraUnstable: false, borderShiftRatio: 0 };
  }
  let borderSamples = 0;
  let borderChanged = 0;
  const rowMargin = Math.max(2, Math.floor(height * 0.1));
  const colMargin = Math.max(2, Math.floor(width * 0.08));

  for (let y = 0; y < height; y++) {
    const isBorderRow = y < rowMargin || y >= height - rowMargin;
    for (let x = 0; x < width; x++) {
      const isBorderCol = x < colMargin || x >= width - colMargin;
      if (!isBorderRow && !isBorderCol) continue;
      const idx = y * width + x;
      borderSamples++;
      if (Math.abs(currLuma[idx] - prevLuma[idx]) > 20) {
        borderChanged++;
      }
    }
  }

  const borderShiftRatio = borderSamples > 0 ? borderChanged / borderSamples : 0;
  // If >46% of perimeter frame pixels change simultaneously, the camera itself is panning or shaking.
  return {
    cameraUnstable: borderShiftRatio > 0.46,
    borderShiftRatio,
  };
}

interface TemporalFeatureSample {
  timestampMs: number;
  bodyScale: number;
  midShoulderY: number;
  midHipX: number;
  midHipY: number;
  torsoTiltDeg: number;
  hipAlignmentDeg: number | null;
  isHorizontalBody: boolean;
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  primaryKneeDeg: number | null;
  leftElbowDeg: number | null;
  rightElbowDeg: number | null;
  primaryElbowDeg: number | null;
  leftArmAbductionDeg: number | null;
  rightArmAbductionDeg: number | null;
  shoulderToHipDropNorm: number; // hip.y - shoulder.y normalized by bodyScale (smaller/flat when horizontal)
  ankleSpreadNorm: number;
  ankleVertDiffNorm: number;
  kneeVertDiffNorm: number;
  leftKneeLiftNorm: number; // positive when left knee rises toward hip level
  rightKneeLiftNorm: number;
  wristSpreadNorm: number;
  wristAboveShoulderNorm: number; // shoulder.y - min(wristY) normalized by bodyScale (>0 means wrists above shoulders)
  bothWristsAboveChest: boolean;
  wristAboveHead: boolean;
  elbowAboveShoulderCount: number;
  sideShoulderX: number;
}

interface CycleState {
  phase: MotionRepPhase;
  peakEnteredAtMs: number;
  activeEnteredAtMs: number;
  minKneeSeen: number;
  minElbowSeen: number;
  maxWristHeightSeen: number;
  maxKneeLiftSeen: number;
  maxAnkleSpreadSeen: number;
  lastHighKneeSide: 'left' | 'right' | null;
  lastCountedAtMs: number;
  plankHoldAccumMs: number;
  lastPlankCheckMs: number;
  plankGoodSinceMs: number;
  standingBaselineHipY: number | null;
  standingBaselineKneeY: number | null;
}

const initialCycleState = (): CycleState => ({
  phase: 'WAIT_START',
  peakEnteredAtMs: 0,
  activeEnteredAtMs: 0,
  minKneeSeen: 180,
  minElbowSeen: 180,
  maxWristHeightSeen: -1,
  maxKneeLiftSeen: -1,
  maxAnkleSpreadSeen: 0,
  lastHighKneeSide: null,
  lastCountedAtMs: 0,
  plankHoldAccumMs: 0,
  lastPlankCheckMs: 0,
  plankGoodSinceMs: 0,
  standingBaselineHipY: null,
  standingBaselineKneeY: null,
});

export class AetherMotionEngine {
  private targetProtocol: SupportedMotionExercise | 'auto';
  private smoothedLandmarks: PoseLandmark[] | null = null;
  private lastValidFrameMs = 0;
  private lastDropoutFeedback: string | null = null;
  private window: TemporalFeatureSample[] = [];
  private scoresEma: Record<SupportedMotionExercise, number> = {
    squat: 0,
    pushup: 0,
    lunge: 0,
    jumping_jack: 0,
    plank: 0,
    knee_raise: 0,
    bicep_curl: 0,
    shoulder_press: 0,
  };
  private repCount = 0;
  private incompleteRepCount = 0;
  private holdSeconds = 0;
  private cycle: CycleState = initialCycleState();
  private lastClassified: SupportedMotionExercise | null = null;
  private feedback =
    'Step into frame so your full shoulders, hips, and legs are clearly visible.';

  constructor(options?: { targetExercise?: SupportedMotionExercise | 'auto' }) {
    this.targetProtocol = options?.targetExercise || 'auto';
  }

  setTargetExercise(protocol: SupportedMotionExercise | 'auto') {
    if (this.targetProtocol !== protocol) {
      this.targetProtocol = protocol;
      this.cycle = initialCycleState();
      this.incompleteRepCount = 0;
    }
  }

  reset() {
    this.smoothedLandmarks = null;
    this.lastValidFrameMs = 0;
    this.lastDropoutFeedback = null;
    this.window = [];
    (Object.keys(this.scoresEma) as SupportedMotionExercise[]).forEach(k => {
      this.scoresEma[k] = 0;
    });
    this.repCount = 0;
    this.incompleteRepCount = 0;
    this.holdSeconds = 0;
    this.cycle = initialCycleState();
    this.lastClassified = null;
    this.feedback =
      'Step into frame so your full shoulders, hips, and legs are clearly visible.';
  }

  getSnapshot(): Omit<MotionEngineOutput, 'smoothedLandmarks'> & {
    smoothedLandmarks: PoseLandmark[] | null;
  } {
    const latest = this.window[this.window.length - 1];
    return {
      classifiedExercise: this.lastClassified,
      candidateExercise: this.lastClassified,
      confidence: 0,
      confidenceLevel: 'low',
      classificationStatus: 'unreliable',
      protocolMismatch: false,
      activeProtocol: this.targetProtocol,
      repCount: this.repCount,
      incompleteRepCount: this.incompleteRepCount,
      holdSeconds: this.holdSeconds,
      phase: this.cycle.phase,
      orientation: 'unknown',
      angles: {
        leftKneeDeg: latest?.leftKneeDeg ?? null,
        rightKneeDeg: latest?.rightKneeDeg ?? null,
        primaryKneeDeg: latest?.primaryKneeDeg ?? null,
        leftElbowDeg: latest?.leftElbowDeg ?? null,
        rightElbowDeg: latest?.rightElbowDeg ?? null,
        primaryElbowDeg: latest?.primaryElbowDeg ?? null,
        torsoTiltDeg: latest?.torsoTiltDeg ?? null,
        hipAlignmentDeg: latest?.hipAlignmentDeg ?? null,
        leftArmAbductionDeg: latest?.leftArmAbductionDeg ?? null,
        rightArmAbductionDeg: latest?.rightArmAbductionDeg ?? null,
      },
      landmarksVisible: Boolean(latest),
      cameraUnstable: false,
      motionIntensity: 0,
      feedback: this.feedback,
      smoothedLandmarks: this.smoothedLandmarks,
    };
  }

  processPoseFrame(
    rawLandmarks: PoseLandmark[] | null | undefined,
    timestampMs: number,
    opts?: { cameraUnstable?: boolean }
  ): MotionEngineOutput {
    const dropoutWindowMs = 680;
    const latestBefore = this.window[this.window.length - 1];

    // 1. Handle temporary pose disappearance / landmark occlusion
    if (!rawLandmarks || rawLandmarks.length < 29) {
      const timeSinceValid = timestampMs - this.lastValidFrameMs;
      if (this.lastValidFrameMs > 0 && timeSinceValid <= dropoutWindowMs && latestBefore) {
        return {
          ...this.buildOutputFromScores(latestBefore, opts?.cameraUnstable ?? false, true),
          landmarksVisible: false,
          feedback:
            'Pose briefly occluded — maintaining cycle recovery window. Keep your full body in frame.',
        };
      }
      this.cycle.phase = 'WAIT_START';
      this.cycle.lastPlankCheckMs = timestampMs;
      return {
        ...this.buildOutputFromScores(latestBefore, opts?.cameraUnstable ?? false, false),
        classifiedExercise: null,
        candidateExercise: null,
        confidence: 0,
        confidenceLevel: 'low',
        classificationStatus: 'unreliable',
        landmarksVisible: false,
        feedback: 'No full body landmarks detected. Step back slightly and ensure good lighting.',
        smoothedLandmarks: null,
      };
    }

    // Check critical upper & torso landmarks visibility
    const ls = rawLandmarks[POSE_IDX.LEFT_SHOULDER];
    const rs = rawLandmarks[POSE_IDX.RIGHT_SHOULDER];
    const lh = rawLandmarks[POSE_IDX.LEFT_HIP];
    const rh = rawLandmarks[POSE_IDX.RIGHT_HIP];

    const hasUpperTorso = (isVisible(ls, 0.38) || isVisible(rs, 0.38)) && (isVisible(lh, 0.35) || isVisible(rh, 0.35));
    if (!hasUpperTorso) {
      const timeSinceValid = timestampMs - this.lastValidFrameMs;
      if (this.lastValidFrameMs > 0 && timeSinceValid <= dropoutWindowMs && latestBefore) {
        return {
          ...this.buildOutputFromScores(latestBefore, opts?.cameraUnstable ?? false, true),
          landmarksVisible: false,
          feedback: 'Shoulders/hips briefly lost visibility — step fully into view.',
        };
      }
      this.cycle.phase = 'WAIT_START';
      return {
        ...this.buildOutputFromScores(latestBefore, opts?.cameraUnstable ?? false, false),
        classifiedExercise: null,
        candidateExercise: null,
        confidence: 12,
        confidenceLevel: 'low',
        classificationStatus: 'unreliable',
        landmarksVisible: false,
        feedback: 'Torso landmarks unclear — adjust framing so shoulders and hips are visible.',
        smoothedLandmarks: null,
      };
    }

    // 2. Smooth landmarks temporally (adaptive EMA)
    const dtMs = this.lastValidFrameMs > 0 ? clamp(timestampMs - this.lastValidFrameMs, 8, 250) : 33;
    const smoothAlpha = clamp(dtMs / 75, 0.25, 0.65);

    if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== rawLandmarks.length) {
      this.smoothedLandmarks = rawLandmarks.map(lm => ({ ...lm }));
    } else {
      this.smoothedLandmarks = rawLandmarks.map((lm, i) => {
        const prev = this.smoothedLandmarks![i];
        const vis = lm.visibility ?? 1;
        if (vis < 0.28 && (prev.visibility ?? 0) >= 0.4) {
          // Decay stale landmark visibility slowly instead of jumping wildly to occluded position
          return {
            ...prev,
            visibility: Math.max(0.2, (prev.visibility ?? 0.5) * 0.85),
          };
        }
        return {
          x: prev.x * (1 - smoothAlpha) + lm.x * smoothAlpha,
          y: prev.y * (1 - smoothAlpha) + lm.y * smoothAlpha,
          z: (prev.z ?? 0) * (1 - smoothAlpha) + (lm.z ?? 0) * smoothAlpha,
          visibility: vis,
        };
      });
    }
    this.lastValidFrameMs = timestampMs;

    const lms = this.smoothedLandmarks;

    // 3. Extract biomechanical features from smoothed landmarks
    const feature = this.extractFeatures(lms, timestampMs);

    // 4. Reject rigid-scene camera panning/shake (whole body moves rigidly without internal joint flexing)
    let poseRigidShake = false;
    if (this.window.length >= 2) {
      const prev = this.window[this.window.length - 1];
      const dt = Math.max(16, feature.timestampMs - prev.timestampMs);
      const hipJump = Math.hypot(feature.midHipX - prev.midHipX, feature.midHipY - prev.midHipY) / feature.bodyScale;
      const shoulderJump = Math.abs(feature.midShoulderY - prev.midShoulderY) / feature.bodyScale;
      const kneeDelta =
        feature.primaryKneeDeg != null && prev.primaryKneeDeg != null
          ? Math.abs(feature.primaryKneeDeg - prev.primaryKneeDeg)
          : 0;
      const elbowDelta =
        feature.primaryElbowDeg != null && prev.primaryElbowDeg != null
          ? Math.abs(feature.primaryElbowDeg - prev.primaryElbowDeg)
          : 0;

      // Implausibly fast whole-body jump across a single frame with minimal joint flexion -> camera shift
      if (dt <= 140 && hipJump > 0.24 && shoulderJump > 0.16 && kneeDelta < 6 && elbowDelta < 6) {
        poseRigidShake = true;
      }
    }

    const cameraUnstable = Boolean(opts?.cameraUnstable || poseRigidShake);

    // Append to sliding 2200 ms temporal window
    this.window.push(feature);
    while (this.window.length > 0 && timestampMs - this.window[0].timestampMs > 2200) {
      this.window.shift();
    }

    if (cameraUnstable) {
      if (this.cycle.phase === 'ACTIVE_PHASE') {
        this.cycle.phase = 'READY';
      }
      this.feedback =
        'Camera movement detected — place device on a stable surface before continuing reps.';
      return {
        ...this.buildOutputFromScores(feature, true, false),
        cameraUnstable: true,
        feedback: this.feedback,
      };
    }

    // 5. Evaluate multi-frame classification scores & confidence tier
    const output = this.classifyAndTrack(feature, timestampMs);
    return output;
  }

  private extractFeatures(lms: PoseLandmark[], timestampMs: number): TemporalFeatureSample {
    const ls = lms[POSE_IDX.LEFT_SHOULDER];
    const rs = lms[POSE_IDX.RIGHT_SHOULDER];
    const le = lms[POSE_IDX.LEFT_ELBOW];
    const re = lms[POSE_IDX.RIGHT_ELBOW];
    const lw = lms[POSE_IDX.LEFT_WRIST];
    const rw = lms[POSE_IDX.RIGHT_WRIST];
    const lh = lms[POSE_IDX.LEFT_HIP];
    const rh = lms[POSE_IDX.RIGHT_HIP];
    const lk = lms[POSE_IDX.LEFT_KNEE];
    const rk = lms[POSE_IDX.RIGHT_KNEE];
    const la = lms[POSE_IDX.LEFT_ANKLE];
    const ra = lms[POSE_IDX.RIGHT_ANKLE];
    const nose = lms[POSE_IDX.NOSE];

    const hasLS = isVisible(ls, 0.35);
    const hasRS = isVisible(rs, 0.35);
    const hasLH = isVisible(lh, 0.35);
    const hasRH = isVisible(rh, 0.35);

    const midShoulder = hasLS && hasRS ? midPoint(ls, rs) : hasLS ? ls : rs;
    const midHip = hasLH && hasRH ? midPoint(lh, rh) : hasLH ? lh : rh;

    const shoulderWidth = hasLS && hasRS ? dist2D(ls, rs) : 0;
    const hipWidth = hasLH && hasRH ? dist2D(lh, rh) : 0;
    const torsoLength = dist2D(midShoulder, midHip);
    const bodyScale = Math.max(torsoLength, hipWidth * 1.45, shoulderWidth * 1.25, 0.12);

    // Torso inclination relative to straight vertical (0 deg = upright, 90 deg = horizontal)
    const tx = midShoulder.x - midHip.x;
    const ty = midShoulder.y - midHip.y; // negative when upright
    const tLen = Math.max(1e-5, Math.hypot(tx, ty));
    const torsoTiltDeg = (Math.acos(clamp(-ty / tLen, -1, 1)) * 180) / Math.PI;

    // Pick primary visible side or average symmetrical knee/elbow angles
    const leftKneeOk = isVisible(lh, 0.35) && isVisible(lk, 0.35) && isVisible(la, 0.32);
    const rightKneeOk = isVisible(rh, 0.35) && isVisible(rk, 0.35) && isVisible(ra, 0.32);
    const leftKneeDeg = leftKneeOk ? computeAngleDeg(lh, lk, la) : null;
    const rightKneeDeg = rightKneeOk ? computeAngleDeg(rh, rk, ra) : null;

    let primaryKneeDeg: number | null = null;
    if (leftKneeDeg !== null && rightKneeDeg !== null) {
      primaryKneeDeg = (leftKneeDeg + rightKneeDeg) / 2;
    } else {
      primaryKneeDeg = leftKneeDeg ?? rightKneeDeg;
    }

    const leftElbowOk = isVisible(ls, 0.35) && isVisible(le, 0.35) && isVisible(lw, 0.32);
    const rightElbowOk = isVisible(rs, 0.35) && isVisible(re, 0.35) && isVisible(rw, 0.32);
    const leftElbowDeg = leftElbowOk ? computeAngleDeg(ls, le, lw) : null;
    const rightElbowDeg = rightElbowOk ? computeAngleDeg(rs, re, rw) : null;

    let primaryElbowDeg: number | null = null;
    if (leftElbowDeg !== null && rightElbowDeg !== null) {
      primaryElbowDeg = (leftElbowDeg + rightElbowDeg) / 2;
    } else {
      primaryElbowDeg = leftElbowDeg ?? rightElbowDeg;
    }

    // Upper-arm abduction relative to torso axis (0 = arm hanging straight down beside ribs, 180 = straight overhead)
    const computeArmAbduction = (s: PoseLandmark, e: PoseLandmark, h: PoseLandmark): number => {
      const torsoVx = h.x - s.x;
      const torsoVy = h.y - s.y;
      const armVx = e.x - s.x;
      const armVy = e.y - s.y;
      const dot = torsoVx * armVx + torsoVy * armVy;
      const m1 = Math.hypot(torsoVx, torsoVy);
      const m2 = Math.hypot(armVx, armVy);
      if (m1 < 1e-5 || m2 < 1e-5) return 0;
      return (Math.acos(clamp(dot / (m1 * m2), -1, 1)) * 180) / Math.PI;
    };
    const leftArmAbductionDeg =
      hasLS && isVisible(le, 0.35) && hasLH ? computeArmAbduction(ls, le, lh) : null;
    const rightArmAbductionDeg =
      hasRS && isVisible(re, 0.35) && hasRH ? computeArmAbduction(rs, re, rh) : null;

    // Spine-hip-ankle alignment for horizontal plank / push-up quality
    let hipAlignmentDeg: number | null = null;
    const hasAnkles = isVisible(la, 0.28) || isVisible(ra, 0.28);
    const midAnkle =
      isVisible(la, 0.28) && isVisible(ra, 0.28)
        ? midPoint(la, ra)
        : isVisible(la, 0.28)
        ? la
        : ra;
    if (hasAnkles) {
      hipAlignmentDeg = computeAngleDeg(midShoulder, midHip, midAnkle);
    } else if (isVisible(lk, 0.3) || isVisible(rk, 0.3)) {
      const midKnee =
        isVisible(lk, 0.3) && isVisible(rk, 0.3)
          ? midPoint(lk, rk)
          : isVisible(lk, 0.3)
          ? lk
          : rk;
      hipAlignmentDeg = computeAngleDeg(midShoulder, midHip, midKnee);
    }

    const shoulderToHipDropNorm = (midHip.y - midShoulder.y) / bodyScale;
    const isHorizontalBody =
      torsoTiltDeg >= 50 ||
      (shoulderToHipDropNorm < 0.36 &&
        hasAnkles &&
        Math.abs(midAnkle.y - midHip.y) / bodyScale < 0.42);

    const ankleSpreadNorm =
      isVisible(la, 0.3) && isVisible(ra, 0.3) ? Math.abs(la.x - ra.x) / bodyScale : 0;
    const ankleVertDiffNorm =
      isVisible(la, 0.3) && isVisible(ra, 0.3) ? Math.abs(la.y - ra.y) / bodyScale : 0;
    const kneeVertDiffNorm =
      isVisible(lk, 0.32) && isVisible(rk, 0.32) ? Math.abs(lk.y - rk.y) / bodyScale : 0;

    const leftKneeLiftNorm = isVisible(lk, 0.32) ? (midHip.y - lk.y) / bodyScale : -1;
    const rightKneeLiftNorm = isVisible(rk, 0.32) ? (midHip.y - rk.y) / bodyScale : -1;

    const wristSpreadNorm =
      isVisible(lw, 0.32) && isVisible(rw, 0.32) ? Math.abs(lw.x - rw.x) / bodyScale : 0;

    const visibleWrists = [isVisible(lw, 0.32) ? lw : null, isVisible(rw, 0.32) ? rw : null].filter(
      (x): x is PoseLandmark => Boolean(x)
    );
    const minWristY = visibleWrists.length ? Math.min(...visibleWrists.map(w => w.y)) : midHip.y;
    const maxWristY = visibleWrists.length ? Math.max(...visibleWrists.map(w => w.y)) : midHip.y;
    const wristAboveShoulderNorm = (midShoulder.y - minWristY) / bodyScale;
    const bothWristsAboveChest =
      visibleWrists.length < 2 || (midShoulder.y - maxWristY) / bodyScale >= -0.25;
    const wristAboveHead = isVisible(nose, 0.3)
      ? minWristY < nose.y - 0.04 * bodyScale
      : wristAboveShoulderNorm > 0.4;

    let elbowAboveShoulderCount = 0;
    if (hasLS && isVisible(le, 0.32) && le.y <= ls.y + 0.1 * bodyScale) elbowAboveShoulderCount++;
    if (hasRS && isVisible(re, 0.32) && re.y <= rs.y + 0.1 * bodyScale) elbowAboveShoulderCount++;

    return {
      timestampMs,
      bodyScale,
      midShoulderY: midShoulder.y,
      midHipX: midHip.x,
      midHipY: midHip.y,
      torsoTiltDeg,
      hipAlignmentDeg,
      isHorizontalBody,
      leftKneeDeg,
      rightKneeDeg,
      primaryKneeDeg,
      leftElbowDeg,
      rightElbowDeg,
      primaryElbowDeg,
      leftArmAbductionDeg,
      rightArmAbductionDeg,
      shoulderToHipDropNorm,
      ankleSpreadNorm,
      ankleVertDiffNorm,
      kneeVertDiffNorm,
      leftKneeLiftNorm,
      rightKneeLiftNorm,
      wristSpreadNorm,
      wristAboveShoulderNorm,
      bothWristsAboveChest,
      wristAboveHead,
      elbowAboveShoulderCount,
      sideShoulderX: midShoulder.x,
    };
  }

  private classifyAndTrack(latest: TemporalFeatureSample, timestampMs: number): MotionEngineOutput {
    const samples = this.window;
    const windowSpanMs = samples.length >= 2 ? timestampMs - samples[0].timestampMs : 0;

    // Require minimum multi-frame history (>= 6 frames AND >= 220ms) before classifying!
    const hasEnoughFrames = samples.length >= 6 && windowSpanMs >= 220;

    // Aggregate kinematic statistics over the rolling temporal window
    const kneeVals = samples.map(s => s.primaryKneeDeg).filter((v): v is number => v !== null);
    const leftKneeVals = samples.map(s => s.leftKneeDeg).filter((v): v is number => v !== null);
    const rightKneeVals = samples.map(s => s.rightKneeDeg).filter((v): v is number => v !== null);
    const elbowVals = samples.map(s => s.primaryElbowDeg).filter((v): v is number => v !== null);
    const armAbdVals = samples
      .map(s =>
        s.leftArmAbductionDeg !== null && s.rightArmAbductionDeg !== null
          ? (s.leftArmAbductionDeg + s.rightArmAbductionDeg) / 2
          : s.leftArmAbductionDeg ?? s.rightArmAbductionDeg
      )
      .filter((v): v is number => v !== null);

    const kneeMin = kneeVals.length ? Math.min(...kneeVals) : 180;
    const kneeMax = kneeVals.length ? Math.max(...kneeVals) : 180;
    const kneeRange = kneeMax - kneeMin;

    const elbowMin = elbowVals.length ? Math.min(...elbowVals) : 180;
    const elbowMax = elbowVals.length ? Math.max(...elbowVals) : 180;
    const elbowRange = elbowMax - elbowMin;

    const hipYs = samples.map(s => s.midHipY);
    const hipYRangeNorm = (Math.max(...hipYs) - Math.min(...hipYs)) / latest.bodyScale;
    const shoulderYs = samples.map(s => s.midShoulderY);
    const shoulderYRangeNorm = (Math.max(...shoulderYs) - Math.min(...shoulderYs)) / latest.bodyScale;

    const ankleSpreads = samples.map(s => s.ankleSpreadNorm);
    const maxAnkleSpread = Math.max(...ankleSpreads);
    const minAnkleSpread = Math.min(...ankleSpreads);
    const ankleSpreadRange = maxAnkleSpread - minAnkleSpread;

    const maxAnkleVertDiff = Math.max(...samples.map(s => s.ankleVertDiffNorm));
    const maxKneeVertDiff = Math.max(...samples.map(s => s.kneeVertDiffNorm));

    const maxLeftKneeLift = Math.max(...samples.map(s => s.leftKneeLiftNorm));
    const maxRightKneeLift = Math.max(...samples.map(s => s.rightKneeLiftNorm));
    const maxAnyKneeLift = Math.max(maxLeftKneeLift, maxRightKneeLift);

    const maxWristAboveShoulder = Math.max(...samples.map(s => s.wristAboveShoulderNorm));
    const minWristAboveShoulder = Math.min(...samples.map(s => s.wristAboveShoulderNorm));
    const wristVerticalRange = maxWristAboveShoulder - minWristAboveShoulder;
    const maxWristSpread = Math.max(...samples.map(s => s.wristSpreadNorm));
    const wristOverheadFrames = samples.filter(s => s.wristAboveHead).length;

    const horizontalRatio = samples.filter(s => s.isHorizontalBody).length / Math.max(1, samples.length);
    const uprightRatio =
      samples.filter(s => !s.isHorizontalBody && s.torsoTiltDeg < 48).length / Math.max(1, samples.length);

    const minArmAbd = armAbdVals.length ? Math.min(...armAbdVals) : 90;
    const maxArmAbd = armAbdVals.length ? Math.max(...armAbdVals) : 90;
    const avgArmAbd = armAbdVals.length ? avg(armAbdVals) : 90;

    // Left vs Right knee symmetry (low diff = squat; high asymmetry with wide ankle stance = lunge or high knees)
    const kneeAsymVals: number[] = [];
    for (let i = 0; i < samples.length; i++) {
      const lk = samples[i].leftKneeDeg;
      const rk = samples[i].rightKneeDeg;
      if (lk !== null && rk !== null) kneeAsymVals.push(Math.abs(lk - rk));
    }
    const avgKneeAsym = kneeAsymVals.length ? avg(kneeAsymVals) : 0;

    // -------------------------------------------------------------------------
    // SCORE EACH OF THE 8 EXERCISES (strict biomechanical discrimination!)
    // -------------------------------------------------------------------------
    const rawScores: Record<SupportedMotionExercise, number> = {
      squat: 0,
      pushup: 0,
      lunge: 0,
      jumping_jack: 0,
      plank: 0,
      knee_raise: 0,
      bicep_curl: 0,
      shoulder_press: 0,
    };

    if (hasEnoughFrames) {
      const avgAnkleSpread = avg(ankleSpreads);
      const isSideView = avg(samples.map(s => (s.sideShoulderX !== undefined ? 0 : 0))) >= 0 && maxAnkleSpread < 0.28 && avgKneeAsym < 24;
      void isSideView;

      // 1. SQUAT: Upright/hinged torso, symmetric knee bend & vertical hip drop (front shoulder-width or side profile; NOT split-stance lunge)
      const isSplitFootLunge =
        maxAnkleSpread >= 0.85 ||
        maxKneeVertDiff >= 0.16 ||
        (avgKneeAsym >= 18 && maxAnkleSpread >= 0.48) ||
        (maxAnkleVertDiff >= 0.13 && maxAnkleSpread >= 0.45);
      const squatPosture =
        uprightRatio >= 0.7 &&
        maxWristAboveShoulder < 0.45 &&
        maxAnkleVertDiff < 0.22 &&
        maxKneeVertDiff < 0.22 &&
        !isSplitFootLunge;
      if (squatPosture) {
        const depthScore = clamp((155 - kneeMin) / 55, 0, 1); // < 100 deg gives 1.0
        const rangeScore = clamp(kneeRange / 45, 0, 1);
        const hipDropScore = clamp(hipYRangeNorm / 0.24, 0, 1);
        const stanceSymPenalty = avgKneeAsym > 24 ? 0.72 : 1.0;
        if (kneeRange >= 18 && hipYRangeNorm >= 0.1 && kneeMin <= 142) {
          rawScores.squat =
            (0.38 * depthScore + 0.34 * rangeScore + 0.28 * hipDropScore) * stanceSymPenalty;
        }
      }

      // 2. LUNGE: Upright torso, TRUE split-stance ankle offset or front/back knee asymmetry + vertical hip dip
      const lungeStance =
        uprightRatio >= 0.7 &&
        isSplitFootLunge &&
        maxAnkleVertDiff < 0.28 && // both feet remain near ground (unlike high knees)
        maxKneeLiftBelowHip(maxAnyKneeLift);
      if (lungeStance && kneeRange >= 16 && kneeMin <= 140 && hipYRangeNorm >= 0.08) {
        const splitScore = clamp(
          Math.max(maxAnkleSpread / 0.95, maxKneeVertDiff / 0.25, avgKneeAsym / 34),
          0,
          1
        );
        const depthScore = clamp((152 - kneeMin) / 48, 0, 1);
        const rangeScore = clamp(kneeRange / 36, 0, 1);
        rawScores.lunge = 0.38 * splitScore + 0.32 * depthScore + 0.3 * rangeScore;
      }

      // 3. PUSH-UP: Horizontal torso + cyclic elbow flexion & vertical chest displacement
      if (horizontalRatio >= 0.68) {
        const elbowCycleScore = clamp(elbowRange / 38, 0, 1);
        const elbowDepthScore = clamp((145 - elbowMin) / 42, 0, 1);
        const chestDipScore = clamp(shoulderYRangeNorm / 0.16, 0, 1);
        const straightLegsBonus = kneeMin >= 125 ? 1 : 0.65;
        if (elbowRange >= 22 && shoulderYRangeNorm >= 0.07) {
          rawScores.pushup =
            (0.4 * elbowCycleScore + 0.32 * elbowDepthScore + 0.28 * chestDipScore) *
            straightLegsBonus;
        }

        // 4. PLANK: Horizontal torso + sustained hip alignment + steady chest & elbow stability (suppresses when pushing up)
        const alignedRatio =
          samples.filter(s => (s.hipAlignmentDeg ?? 180) >= 142).length / Math.max(1, samples.length);
        const steadyChest = shoulderYRangeNorm < 0.11 && hipYRangeNorm < 0.11;
        const steadyElbow = elbowRange < 18;
        if (windowSpanMs >= 900 && alignedRatio >= 0.65 && steadyChest && steadyElbow) {
          const durationBonus = clamp(windowSpanMs / 1500, 0.55, 1);
          rawScores.plank = horizontalRatio * (0.55 * alignedRatio + 0.45 * durationBonus);
        }
      }

      // 5. JUMPING JACKS: Upright torso + arms raise wide/overhead + feet jump wide simultaneously
      if (
        uprightRatio >= 0.72 &&
        ankleSpreadRange >= 0.14 &&
        maxAnkleSpread >= 0.44 &&
        wristVerticalRange >= 0.35 &&
        maxWristAboveShoulder >= 0.12 &&
        kneeMin >= 132 // knees stay relatively straight unlike squats/lunges
      ) {
        const footScore = clamp(ankleSpreadRange / 0.26, 0, 1);
        const armArcScore = clamp(wristVerticalRange / 0.65, 0, 1);
        const overheadScore = clamp(Math.max(maxWristAboveShoulder / 0.42, maxWristSpread / 1.1), 0, 1);
        rawScores.jumping_jack = 0.38 * footScore + 0.34 * armArcScore + 0.28 * overheadScore;
      }

      // 6. HIGH KNEES: Upright torso, hips stay high/tall while alternating knees drive upward toward hip level
      if (
        uprightRatio >= 0.75 &&
        hipYRangeNorm < 0.18 &&
        maxAnyKneeLift >= -0.32 && // knee rises sharply toward/above hip
        maxKneeVertDiff >= 0.2 &&
        maxAnkleVertDiff >= 0.18
      ) {
        const liftScore = clamp((maxAnyKneeLift + 0.35) / 0.45, 0, 1);
        const asymScore = clamp(Math.max(maxKneeVertDiff, maxAnkleVertDiff) / 0.35, 0, 1);
        const bothLegsActive =
          leftKneeVals.length > 0 && rightKneeVals.length > 0 && Math.abs(Math.min(...leftKneeVals) - Math.min(...rightKneeVals)) < 45
            ? 1
            : 0.85;
        rawScores.knee_raise = (0.5 * liftScore + 0.5 * asymScore) * bothLegsActive;
      }

      // 7. BICEP CURLS: Upright torso, feet planted, elbows tucked beside ribs below shoulder height, clear vertical curl excursion
      if (
        uprightRatio >= 0.75 &&
        ankleSpreadRange < 0.14 &&
        kneeRange < 18 &&
        maxArmAbd <= 52 &&
        elbowRange >= 26 &&
        elbowMin <= 98 &&
        wristVerticalRange >= 0.25 &&
        wristOverheadFrames <= Math.floor(samples.length * 0.2)
      ) {
        const curlDepth = clamp((132 - elbowMin) / 62, 0, 1);
        const curlRange = clamp(elbowRange / 65, 0, 1);
        const upperArmPin = clamp((48 - avgArmAbd) / 28, 0.35, 1);
        rawScores.bicep_curl = 0.38 * curlDepth + 0.36 * curlRange + 0.26 * upperArmPin;
      }

      // 8. SHOULDER PRESSES: Upright torso, feet planted, vertical overhead pressing travel (rejects random waving/stationary hold)
      const bilateralPressFrames = samples.filter(s => s.bothWristsAboveChest).length;
      if (
        uprightRatio >= 0.75 &&
        ankleSpreadRange < 0.15 &&
        kneeRange < 18 &&
        elbowRange >= 28 &&
        wristVerticalRange >= 0.28 &&
        maxWristAboveShoulder >= 0.34 &&
        (wristOverheadFrames >= 2 || maxWristAboveShoulder >= 0.42) &&
        bilateralPressFrames >= Math.floor(samples.length * 0.5) &&
        maxArmAbd >= 52
      ) {
        const extScore = clamp((elbowMax - 115) / 48, 0, 1);
        const rangeScore = clamp(elbowRange / 58, 0, 1);
        const overheadScore = clamp(maxWristAboveShoulder / 0.52, 0, 1);
        const stabilityBonus = ankleSpreadRange < 0.1 ? 1.0 : 0.75;
        rawScores.shoulder_press =
          (0.36 * extScore + 0.34 * rangeScore + 0.3 * overheadScore) * stabilityBonus;
      }
    }

    // Smooth temporal classification scores so confidence builds naturally across frames & ignores 1-frame spikes
    const alphaScore = hasEnoughFrames ? 0.32 : 0.15;
    (Object.keys(this.scoresEma) as SupportedMotionExercise[]).forEach(ex => {
      this.scoresEma[ex] = this.scoresEma[ex] * (1 - alphaScore) + rawScores[ex] * alphaScore;
    });

    const ranked = (Object.entries(this.scoresEma) as Array<[SupportedMotionExercise, number]>).sort(
      (a, b) => b[1] - a[1]
    );
    const [topEx, topScore] = ranked[0];
    const [, secondScore] = ranked[1];
    const margin = Math.max(0, topScore - secondScore);

    // Combine top absolute kinematic score + separation margin over closest competing movement
    const rawConf = hasEnoughFrames ? (topScore * 0.8 + Math.min(0.25, margin * 0.7) * 0.8) * 100 : 15;
    const confidence = clamp(Math.round(rawConf), 0, 100);

    const confidenceLevel: MotionConfidenceTier =
      confidence >= 72 ? 'high' : confidence >= 45 ? 'medium' : 'low';
    const classificationStatus: MotionEngineOutput['classificationStatus'] =
      confidenceLevel === 'high'
        ? 'identified'
        : confidenceLevel === 'medium'
        ? 'analyzing'
        : 'unreliable';

    const classifiedExercise = confidenceLevel === 'high' ? topEx : null;
    if (classifiedExercise) {
      this.lastClassified = classifiedExercise;
    }

    // Check if user selected a specific protocol that differs from a HIGH-confidence detected movement
    const activeExec: SupportedMotionExercise | null =
      this.targetProtocol === 'auto'
        ? classifiedExercise
        : classifiedExercise ?? null;
    const protocolMismatch = Boolean(
      this.targetProtocol !== 'auto' &&
        classifiedExercise !== null &&
        classifiedExercise !== this.targetProtocol
    );

    // Compute motion intensity purely from active joint angle velocities in the last 3 frames
    let motionIntensity = 0;
    if (samples.length >= 2) {
      const prev = samples[samples.length - 2];
      const dtSec = Math.max(0.02, (latest.timestampMs - prev.timestampMs) / 1000);
      const kneeVel =
        latest.primaryKneeDeg != null && prev.primaryKneeDeg != null
          ? Math.abs(latest.primaryKneeDeg - prev.primaryKneeDeg) / dtSec
          : 0;
      const elbowVel =
        latest.primaryElbowDeg != null && prev.primaryElbowDeg != null
          ? Math.abs(latest.primaryElbowDeg - prev.primaryElbowDeg) / dtSec
          : 0;
      const wristVel =
        Math.abs(latest.wristAboveShoulderNorm - prev.wristAboveShoulderNorm) / dtSec;
      motionIntensity = clamp(
        Math.round((kneeVel * 0.45 + elbowVel * 0.45 + wristVel * 28) / 2.2),
        0,
        100
      );
    }

    // -------------------------------------------------------------------------
    // REPETITION & ISOMETRIC HOLD TRACKING (ONLY finalized on high-confidence!)
    // Allow provisional cycle phase tracking on candidate exercise during medium confidence (>= 45%)
    // so Rep #1 is never lost while multi-frame confidence ramps from medium -> high,
    // while strictly refusing to credit reps unless confidenceLevel === 'high'.
    // -------------------------------------------------------------------------
    const candidateOrLast =
      topScore >= 0.45 && (confidenceLevel === 'medium' || confidenceLevel === 'high')
        ? topEx
        : this.lastClassified && confidenceLevel === 'medium'
        ? this.lastClassified
        : null;

    const trackingExercise: SupportedMotionExercise | null =
      this.targetProtocol === 'auto'
        ? classifiedExercise ?? candidateOrLast
        : protocolMismatch
        ? null // Do NOT count Squats if player is clearly performing Jumping Jacks!
        : this.targetProtocol;

    if (
      trackingExercise &&
      (confidenceLevel === 'high' || confidenceLevel === 'medium')
    ) {
      this.updateRepetitionStateMachine(
        trackingExercise,
        latest,
        timestampMs,
        confidenceLevel,
        activeExec
      );
      if (confidenceLevel === 'medium' && this.targetProtocol === 'auto') {
        this.feedback = `Analyzing movement pattern (${MOTION_EXERCISE_LABELS[topEx]} ~${confidence}%) — perform clean full-range reps.`;
      }
    } else if (protocolMismatch && classifiedExercise) {
      this.cycle.phase = 'WAIT_START';
      this.feedback = `Detected ${MOTION_EXERCISE_LABELS[classifiedExercise]} instead of ${MOTION_EXERCISE_LABELS[this.targetProtocol as SupportedMotionExercise]}. Switch protocol or resume ${MOTION_EXERCISE_LABELS[this.targetProtocol as SupportedMotionExercise]}.`;
    } else if (confidenceLevel === 'low') {
      if (this.cycle.phase === 'ACTIVE_PHASE') {
        // Returning without completing cycle resets safely without fake counting
        this.cycle.phase = 'READY';
      }
      this.feedback =
        this.deriveLowConfidenceFeedback(latest, minArmAbd, kneeMin, elbowMin);
    }

    const orientation: CameraBodyOrientation = latest.isHorizontalBody
      ? 'side'
      : latest.torsoTiltDeg > 28
      ? 'side'
      : 'front';

    return {
      classifiedExercise,
      candidateExercise: topScore > 0.15 ? topEx : null,
      confidence,
      confidenceLevel,
      classificationStatus,
      protocolMismatch,
      activeProtocol: this.targetProtocol,
      repCount: this.repCount,
      incompleteRepCount: this.incompleteRepCount,
      holdSeconds: this.holdSeconds,
      phase: this.cycle.phase,
      orientation,
      angles: {
        leftKneeDeg: latest.leftKneeDeg !== null ? Math.round(latest.leftKneeDeg) : null,
        rightKneeDeg: latest.rightKneeDeg !== null ? Math.round(latest.rightKneeDeg) : null,
        primaryKneeDeg: latest.primaryKneeDeg !== null ? Math.round(latest.primaryKneeDeg) : null,
        leftElbowDeg: latest.leftElbowDeg !== null ? Math.round(latest.leftElbowDeg) : null,
        rightElbowDeg: latest.rightElbowDeg !== null ? Math.round(latest.rightElbowDeg) : null,
        primaryElbowDeg: latest.primaryElbowDeg !== null ? Math.round(latest.primaryElbowDeg) : null,
        torsoTiltDeg: Math.round(latest.torsoTiltDeg),
        hipAlignmentDeg: latest.hipAlignmentDeg !== null ? Math.round(latest.hipAlignmentDeg) : null,
        leftArmAbductionDeg:
          latest.leftArmAbductionDeg !== null ? Math.round(latest.leftArmAbductionDeg) : null,
        rightArmAbductionDeg:
          latest.rightArmAbductionDeg !== null ? Math.round(latest.rightArmAbductionDeg) : null,
      },
      landmarksVisible: true,
      cameraUnstable: false,
      motionIntensity,
      feedback: this.feedback,
      smoothedLandmarks: this.smoothedLandmarks,
    };
  }

  private findRecentStartTime(
    predicate: (s: TemporalFeatureSample) => boolean,
    nowMs: number,
    maxAgeMs = 1500
  ): number | null {
    for (let i = this.window.length - 1; i >= 0; i--) {
      const s = this.window[i];
      if (nowMs - s.timestampMs > maxAgeMs) break;
      if (predicate(s)) return s.timestampMs;
    }
    return null;
  }

  private updateRepetitionStateMachine(
    ex: SupportedMotionExercise,
    f: TemporalFeatureSample,
    nowMs: number,
    confidenceLevel: MotionConfidenceTier,
    classified: SupportedMotionExercise | null
  ) {
    const c = this.cycle;

    // Require High confidence to finalize & increment reps
    const canCountRep = confidenceLevel === 'high' && (classified === ex || this.targetProtocol === ex);

    switch (ex) {
      case 'squat': {
        const knee = f.primaryKneeDeg;
        if (knee === null) {
          this.feedback = 'Lower legs out of frame — step back so knees and ankles are visible.';
          return;
        }
        const isStandingReady = knee >= 152 && !f.isHorizontalBody;
        const hasDescended = knee <= 136;
        const reachedParallelDepth = knee <= 112;
        const returnedTop = knee >= 150;

        if (c.phase === 'WAIT_START') {
          if (isStandingReady) {
            c.phase = 'READY';
            c.minKneeSeen = knee;
            this.feedback = 'Starting squat stance verified. Lower hips smoothly until knees bend below 112°.';
          } else if (hasDescended) {
            const startMs = this.findRecentStartTime(
              s => !s.isHorizontalBody && (s.primaryKneeDeg ?? 0) >= 152,
              nowMs
            );
            if (startMs !== null) {
              c.phase = reachedParallelDepth ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.minKneeSeen = knee;
              if (reachedParallelDepth) c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = `Stand upright with legs straight (knee angle ${Math.round(knee)}°, need ≥152°) to start Squats.`;
          } else {
            this.feedback = `Stand upright with legs straight (knee angle ${Math.round(knee)}°, need ≥152°) to start Squats.`;
          }
          return;
        }

        if (c.phase === 'READY') {
          if (hasDescended) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.minKneeSeen = knee;
            this.feedback = `Descending — knee angle ${Math.round(knee)}°. Keep chest lifted and drop slightly lower.`;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.minKneeSeen = Math.min(c.minKneeSeen, knee);
          if (reachedParallelDepth) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = `Good depth reached (${Math.round(knee)}° knee bend)! Drive smoothly back to standing.`;
          } else if (returnedTop) {
            // Incomplete rep!
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = `Incomplete squat ignored (lowest knee angle ${Math.round(c.minKneeSeen)}°; aim ≤112°).`;
          } else {
            this.feedback = `Descending (${Math.round(knee)}°) — aim below 112° for a full squat.`;
          }
          return;
        }

        if (c.phase === 'PEAK') {
          c.minKneeSeen = Math.min(c.minKneeSeen, knee);
          if (returnedTop) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 650 && nowMs - c.activeEnteredAtMs >= 350) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Squat Rep #${this.repCount} verified (peak depth ${Math.round(c.minKneeSeen)}°).`;
            }
            c.phase = 'READY';
            c.minKneeSeen = knee;
          }
          return;
        }
        return;
      }

      case 'pushup': {
        const elbow = f.primaryElbowDeg;
        if (elbow === null || !f.isHorizontalBody) {
          c.phase = 'WAIT_START';
          this.feedback = !f.isHorizontalBody
            ? 'Assume horizontal plank posture with side or front-diagonal camera view for Push-ups.'
            : 'Arms occluded — keep shoulders, elbows, and wrists visible.';
          return;
        }
        const aligned = (f.hipAlignmentDeg ?? 180) >= 132;
        if (!aligned) {
          this.feedback = `Keep core braced in a straight line (hip alignment ${Math.round(f.hipAlignmentDeg ?? 0)}°).`;
        }

        if (c.phase === 'WAIT_START') {
          if (elbow >= 146) {
            c.phase = 'READY';
            c.minElbowSeen = elbow;
            this.feedback = 'Top plank position locked. Lower chest steadily with elbows bending below 108°.';
          } else if (elbow <= 132) {
            const startMs = this.findRecentStartTime(
              s => s.isHorizontalBody && (s.primaryElbowDeg ?? 0) >= 146,
              nowMs
            );
            if (startMs !== null) {
              c.phase = elbow <= 108 ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.minElbowSeen = elbow;
              if (elbow <= 108) c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = `Extend arms at top of push-up position (elbow angle ${Math.round(elbow)}°, need ≥146°).`;
          } else {
            this.feedback = `Extend arms at top of push-up position (elbow angle ${Math.round(elbow)}°, need ≥146°).`;
          }
          return;
        }

        if (c.phase === 'READY') {
          if (elbow <= 132) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.minElbowSeen = elbow;
            this.feedback = `Lowering chest (${Math.round(elbow)}° elbow flexion).`;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.minElbowSeen = Math.min(c.minElbowSeen, elbow);
          if (elbow <= 108) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = `Full push-up depth (${Math.round(elbow)}°)! Press back up to full arm lockout.`;
          } else if (elbow >= 146) {
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = `Half push-up not counted (lowest elbow ${Math.round(c.minElbowSeen)}°; aim ≤108°).`;
          }
          return;
        }

        if (c.phase === 'PEAK') {
          c.minElbowSeen = Math.min(c.minElbowSeen, elbow);
          if (elbow >= 146) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 600 && nowMs - c.activeEnteredAtMs >= 320) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Push-up Rep #${this.repCount} verified (peak elbow ${Math.round(c.minElbowSeen)}°).`;
            }
            c.phase = 'READY';
            c.minElbowSeen = elbow;
          }
          return;
        }
        return;
      }

      case 'lunge': {
        const lk = f.leftKneeDeg;
        const rk = f.rightKneeDeg;
        const minKnee =
          lk !== null && rk !== null ? Math.min(lk, rk) : f.primaryKneeDeg;
        if (minKnee === null) {
          this.feedback = 'Legs out of frame — show hips through ankles to track Lunges.';
          return;
        }
        const splitReady = minKnee >= 148 && !f.isHorizontalBody;
        const splitDepth = minKnee <= 116 && (f.ankleSpreadNorm >= 0.34 || Math.abs((lk ?? 180) - (rk ?? 180)) >= 14 || f.ankleVertDiffNorm >= 0.14);

        if (c.phase === 'WAIT_START') {
          if (splitReady) {
            c.phase = 'READY';
            c.minKneeSeen = minKnee;
            this.feedback = 'Standing ready. Step into split stance and lower knee below 116°.';
          } else if (minKnee <= 136) {
            const startMs = this.findRecentStartTime(s => {
              const mk =
                s.leftKneeDeg !== null && s.rightKneeDeg !== null
                  ? Math.min(s.leftKneeDeg, s.rightKneeDeg)
                  : s.primaryKneeDeg;
              return !s.isHorizontalBody && (mk ?? 0) >= 148;
            }, nowMs);
            if (startMs !== null) {
              c.phase = splitDepth ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.minKneeSeen = minKnee;
              if (splitDepth) c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = 'Stand tall before stepping into your first lunge.';
          } else {
            this.feedback = 'Stand tall before stepping into your first lunge.';
          }
          return;
        }

        if (c.phase === 'READY') {
          if (minKnee <= 136) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.minKneeSeen = minKnee;
            this.feedback = `Stepping into lunge (${Math.round(minKnee)}° knee angle).`;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.minKneeSeen = Math.min(c.minKneeSeen, minKnee);
          if (splitDepth) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = `Strong lunge depth (${Math.round(minKnee)}°)! Drive back to starting stance.`;
          } else if (minKnee >= 148) {
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = `Incomplete lunge ignored (min knee ${Math.round(c.minKneeSeen)}°; aim ≤116° with split stance).`;
          }
          return;
        }

        if (c.phase === 'PEAK') {
          if (minKnee >= 148) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 650 && nowMs - c.activeEnteredAtMs >= 350) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Lunge Rep #${this.repCount} verified (knee angle ${Math.round(c.minKneeSeen)}°).`;
            }
            c.phase = 'READY';
            c.minKneeSeen = minKnee;
          }
          return;
        }
        return;
      }

      case 'jumping_jack': {
        const atRest = f.ankleSpreadNorm <= 0.46 && f.wristAboveShoulderNorm <= 0.05;
        const movingOpen = f.ankleSpreadNorm >= 0.52 || f.wristAboveShoulderNorm >= 0.12;
        const fullOpenPeak = f.ankleSpreadNorm >= 0.58 && f.wristAboveShoulderNorm >= 0.18;

        if (c.phase === 'WAIT_START') {
          if (atRest) {
            c.phase = 'READY';
            c.maxAnkleSpreadSeen = f.ankleSpreadNorm;
            c.maxWristHeightSeen = f.wristAboveShoulderNorm;
            this.feedback = 'Ready! Jump feet wide and sweep arms overhead cleanly.';
          } else if (movingOpen) {
            const startMs = this.findRecentStartTime(
              s => s.ankleSpreadNorm <= 0.46 && s.wristAboveShoulderNorm <= 0.05,
              nowMs
            );
            if (startMs !== null) {
              c.phase = fullOpenPeak ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.maxAnkleSpreadSeen = f.ankleSpreadNorm;
              c.maxWristHeightSeen = f.wristAboveShoulderNorm;
              if (fullOpenPeak) c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = 'Start with feet together and arms lowered by your sides.';
          } else {
            this.feedback = 'Start with feet together and arms lowered by your sides.';
          }
          return;
        }

        if (c.phase === 'READY') {
          if (movingOpen) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.maxAnkleSpreadSeen = f.ankleSpreadNorm;
            c.maxWristHeightSeen = f.wristAboveShoulderNorm;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.maxAnkleSpreadSeen = Math.max(c.maxAnkleSpreadSeen, f.ankleSpreadNorm);
          c.maxWristHeightSeen = Math.max(c.maxWristHeightSeen, f.wristAboveShoulderNorm);
          if (fullOpenPeak) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = 'Full overhead jack apex! Jump feet back together cleanly.';
          } else if (atRest) {
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = 'Partial jack ignored — raise arms fully overhead while spreading feet wide.';
          }
          return;
        }

        if (c.phase === 'PEAK') {
          if (atRest) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 420 && nowMs - c.activeEnteredAtMs >= 180) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Jumping Jack #${this.repCount} verified!`;
            }
            c.phase = 'READY';
          }
          return;
        }
        return;
      }

      case 'plank': {
        const hipAlign = f.hipAlignmentDeg ?? 0;
        const goodPlank = f.isHorizontalBody && hipAlign >= 145;
        if (goodPlank) {
          if (c.phase !== 'PEAK') {
            c.phase = 'PEAK';
            c.plankGoodSinceMs = nowMs;
            c.lastPlankCheckMs = nowMs;
          } else {
            const dt = clamp(nowMs - c.lastPlankCheckMs, 0, 250);
            c.lastPlankCheckMs = nowMs;
            c.plankHoldAccumMs += dt;
            const newHoldSec = Math.floor(c.plankHoldAccumMs / 1000);
            if (newHoldSec > this.holdSeconds) {
              this.holdSeconds = newHoldSec;
              // Count every 5 verified isometric hold seconds cleanly as 1 endurance unit only if high confidence
              if (canCountRep && newHoldSec > 0 && newHoldSec % 5 === 0) {
                this.repCount = Math.floor(newHoldSec / 5);
              }
            }
          }
          this.feedback = `Plank aligned (${Math.round(hipAlign)}° spine line) — verified hold: ${this.holdSeconds}s.`;
        } else {
          c.phase = 'WAIT_START';
          c.lastPlankCheckMs = nowMs;
          if (!f.isHorizontalBody) {
            this.feedback = 'Get into horizontal plank position with full body angled cleanly to camera.';
          } else {
            this.feedback = `Plank alignment dipped (${Math.round(hipAlign)}°) — tighten glutes & core to keep hips level.`;
          }
        }
        return;
      }

      case 'knee_raise': {
        // High Knees: hips stay tall, each alternating knee lifts high toward hip level
        const leftUp = f.leftKneeLiftNorm >= -0.22;
        const rightUp = f.rightKneeLiftNorm >= -0.22;
        const bothDown = f.leftKneeLiftNorm < -0.34 && f.rightKneeLiftNorm < -0.34;

        if (c.phase === 'WAIT_START') {
          if (bothDown && !f.isHorizontalBody) {
            c.phase = 'READY';
            this.feedback = 'Upright stance ready. Drive alternating knees sharply up toward hip height.';
          } else {
            this.feedback = 'Stand tall with both feet down to start High Knees.';
          }
          return;
        }

        if (c.phase === 'READY') {
          if (leftUp && !rightUp) {
            c.phase = 'PEAK';
            c.lastHighKneeSide = 'left';
            c.activeEnteredAtMs = nowMs;
            this.feedback = 'Left knee high! Switch explosively to right knee.';
          } else if (rightUp && !leftUp) {
            c.phase = 'PEAK';
            c.lastHighKneeSide = 'right';
            c.activeEnteredAtMs = nowMs;
            this.feedback = 'Right knee high! Switch explosively to left knee.';
          }
          return;
        }

        if (c.phase === 'PEAK') {
          // Count either when knee lowers back down OR directly on alternating knee switch!
          const switchedSide =
            (c.lastHighKneeSide === 'left' && rightUp && !leftUp) ||
            (c.lastHighKneeSide === 'right' && leftUp && !rightUp);

          if (switchedSide) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 260) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              c.lastHighKneeSide = c.lastHighKneeSide === 'left' ? 'right' : 'left';
              this.feedback = `High Knees stride #${this.repCount} verified! Keep chest tall.`;
            }
          } else if (bothDown) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 320) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `High Knee #${this.repCount} verified!`;
            }
            c.phase = 'READY';
            c.lastHighKneeSide = null;
          }
          return;
        }
        return;
      }

      case 'bicep_curl': {
        const elbow = f.primaryElbowDeg;
        if (elbow === null) {
          this.feedback = 'Keep shoulders, elbows, and wrists in frame for Bicep Curls.';
          return;
        }
        const upperArmPinned =
          Math.max(f.leftArmAbductionDeg ?? 0, f.rightArmAbductionDeg ?? 0) <= 48;
        const armExtended = elbow >= 142;
        const armCurled = elbow <= 68;

        if (c.phase === 'WAIT_START') {
          if (armExtended && upperArmPinned) {
            c.phase = 'READY';
            c.minElbowSeen = elbow;
            this.feedback = 'Starting curl posture ready (arms extended). Curl forearms upward with elbows pinned.';
          } else if (elbow <= 122 && upperArmPinned) {
            const startMs = this.findRecentStartTime(
              s => (s.primaryElbowDeg ?? 0) >= 142 && Math.max(s.leftArmAbductionDeg ?? 0, s.rightArmAbductionDeg ?? 0) <= 48,
              nowMs
            );
            if (startMs !== null) {
              c.phase = armCurled && !f.wristAboveHead ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.minElbowSeen = elbow;
              if (c.phase === 'PEAK') c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = `Lower arms to full extension (${Math.round(elbow)}°, need ≥142°) to begin curls.`;
          } else {
            this.feedback = !upperArmPinned
              ? 'Pin upper arms closer to your sides without swinging elbows forward.'
              : `Lower arms to full extension (${Math.round(elbow)}°, need ≥142°) to begin curls.`;
          }
          return;
        }

        if (c.phase === 'READY') {
          if (elbow <= 122) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.minElbowSeen = elbow;
            this.feedback = `Curling upward (${Math.round(elbow)}° elbow flexion).`;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.minElbowSeen = Math.min(c.minElbowSeen, elbow);
          if (!upperArmPinned) {
            this.feedback = 'Keep elbows tucked by your torso — avoid swinging your shoulders.';
          }
          if (armCurled && upperArmPinned && !f.wristAboveHead) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = `Peak bicep contraction (${Math.round(elbow)}°)! Lower slowly to full extension.`;
          } else if (armExtended) {
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = `Partial curl ignored (min elbow ${Math.round(c.minElbowSeen)}°; curl to ≤68°).`;
          }
          return;
        }

        if (c.phase === 'PEAK') {
          if (armExtended) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 550 && nowMs - c.activeEnteredAtMs >= 300) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Bicep Curl Rep #${this.repCount} verified (peak ${Math.round(c.minElbowSeen)}°).`;
            }
            c.phase = 'READY';
            c.minElbowSeen = elbow;
          }
          return;
        }
        return;
      }

      case 'shoulder_press': {
        const elbow = f.primaryElbowDeg;
        if (elbow === null) {
          this.feedback = 'Keep upper body and overhead arm space visible in frame for Shoulder Presses.';
          return;
        }
        const atRackStart = elbow <= 112 && f.wristAboveShoulderNorm >= -0.05 && f.wristAboveShoulderNorm <= 0.34;
        const pressingUp = elbow > 118 && f.wristAboveShoulderNorm > 0.28;
        const overheadLockout = elbow >= 148 && f.wristAboveShoulderNorm >= 0.42;

        if (c.phase === 'WAIT_START') {
          if (atRackStart) {
            c.phase = 'READY';
            c.maxWristHeightSeen = f.wristAboveShoulderNorm;
            this.feedback = 'Rack position locked at shoulder height. Press hands straight overhead!';
          } else if (pressingUp) {
            const startMs = this.findRecentStartTime(
              s => (s.primaryElbowDeg ?? 180) <= 112 && s.wristAboveShoulderNorm >= -0.05 && s.wristAboveShoulderNorm <= 0.34,
              nowMs
            );
            if (startMs !== null) {
              c.phase = overheadLockout ? 'PEAK' : 'ACTIVE_PHASE';
              c.activeEnteredAtMs = startMs;
              c.maxWristHeightSeen = f.wristAboveShoulderNorm;
              if (overheadLockout) c.peakEnteredAtMs = nowMs;
              return;
            }
            this.feedback = 'Hold hands at shoulder height (elbows ~70–110°) to start Shoulder Presses.';
          } else {
            this.feedback = 'Hold hands at shoulder height (elbows ~70–110°) to start Shoulder Presses.';
          }
          return;
        }

        if (c.phase === 'READY') {
          if (pressingUp) {
            c.phase = 'ACTIVE_PHASE';
            c.activeEnteredAtMs = nowMs;
            c.maxWristHeightSeen = f.wristAboveShoulderNorm;
            this.feedback = `Pressing overhead (${Math.round(elbow)}° extension).`;
          }
          return;
        }

        if (c.phase === 'ACTIVE_PHASE') {
          c.maxWristHeightSeen = Math.max(c.maxWristHeightSeen, f.wristAboveShoulderNorm);
          if (overheadLockout) {
            c.phase = 'PEAK';
            c.peakEnteredAtMs = nowMs;
            this.feedback = `Overhead lockout reached (${Math.round(elbow)}°)! Lower with control to shoulder rack.`;
          } else if (atRackStart) {
            c.phase = 'READY';
            this.incompleteRepCount++;
            this.feedback = 'Incomplete press ignored — extend elbows ≥148° cleanly overhead.';
          }
          return;
        }

        if (c.phase === 'PEAK') {
          if (atRackStart) {
            if (canCountRep && nowMs - c.lastCountedAtMs >= 580 && nowMs - c.activeEnteredAtMs >= 320) {
              this.repCount++;
              c.lastCountedAtMs = nowMs;
              this.feedback = `Shoulder Press Rep #${this.repCount} verified!`;
            }
            c.phase = 'READY';
          }
          return;
        }
        return;
      }
    }
  }

  private deriveLowConfidenceFeedback(
    f: TemporalFeatureSample,
    minArmAbd: number,
    kneeMin: number,
    elbowMin: number
  ): string {
    if (this.window.length < 6) {
      return 'Initializing multi-frame pose tracking — hold steady inside the camera view...';
    }
    if (f.primaryKneeDeg === null && !f.isHorizontalBody) {
      return 'Lower legs not clearly detected — step back slightly so hips, knees, and ankles fit inside frame.';
    }
    if (kneeMin > 160 && elbowMin > 150 && !f.isHorizontalBody && minArmAbd < 40) {
      return 'Standing still — perform full movement cycles for exercise identification (movement not yet identified reliably).';
    }
    return 'Movement cannot be identified reliably — perform full, clear repetitions facing the camera or side-on.';
  }

  private buildOutputFromScores(
    latest: TemporalFeatureSample | undefined,
    cameraUnstable: boolean,
    preservedLastClass: boolean
  ): MotionEngineOutput {
    return {
      classifiedExercise: preservedLastClass ? this.lastClassified : null,
      candidateExercise: preservedLastClass ? this.lastClassified : null,
      confidence: preservedLastClass ? 75 : 0,
      confidenceLevel: preservedLastClass ? 'high' : 'low',
      classificationStatus: preservedLastClass ? 'identified' : 'unreliable',
      protocolMismatch: false,
      activeProtocol: this.targetProtocol,
      repCount: this.repCount,
      incompleteRepCount: this.incompleteRepCount,
      holdSeconds: this.holdSeconds,
      phase: this.cycle.phase,
      orientation: latest ? (latest.isHorizontalBody || latest.torsoTiltDeg > 28 ? 'side' : 'front') : 'unknown',
      angles: {
        leftKneeDeg: latest?.leftKneeDeg != null ? Math.round(latest.leftKneeDeg) : null,
        rightKneeDeg: latest?.rightKneeDeg != null ? Math.round(latest.rightKneeDeg) : null,
        primaryKneeDeg: latest?.primaryKneeDeg != null ? Math.round(latest.primaryKneeDeg) : null,
        leftElbowDeg: latest?.leftElbowDeg != null ? Math.round(latest.leftElbowDeg) : null,
        rightElbowDeg: latest?.rightElbowDeg != null ? Math.round(latest.rightElbowDeg) : null,
        primaryElbowDeg: latest?.primaryElbowDeg != null ? Math.round(latest.primaryElbowDeg) : null,
        torsoTiltDeg: latest ? Math.round(latest.torsoTiltDeg) : null,
        hipAlignmentDeg: latest?.hipAlignmentDeg != null ? Math.round(latest.hipAlignmentDeg) : null,
        leftArmAbductionDeg:
          latest?.leftArmAbductionDeg != null ? Math.round(latest.leftArmAbductionDeg) : null,
        rightArmAbductionDeg:
          latest?.rightArmAbductionDeg != null ? Math.round(latest.rightArmAbductionDeg) : null,
      },
      landmarksVisible: Boolean(latest),
      cameraUnstable,
      motionIntensity: 0,
      feedback: this.feedback,
      smoothedLandmarks: this.smoothedLandmarks,
    };
  }
}

function maxKneeLiftBelowHip(maxAnyKneeLift: number): boolean {
  // In a lunge, knees stay lower than chest/high-knee drive height (< -0.05)
  return maxAnyKneeLift < 0.05;
}
