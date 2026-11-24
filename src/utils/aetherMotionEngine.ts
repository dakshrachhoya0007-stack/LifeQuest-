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
  classifiedExercise: SupportedMotionExercise | null;
  candidateExercise: SupportedMotionExercise | null;
  confidence: number;
  confidenceLevel: MotionConfidenceTier;
  classificationStatus: 'identified' | 'analyzing' | 'unreliable';
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
  motionIntensity: number;
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

export const POSE_IDX = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
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

export function computeBackgroundMotionStability(
  currLuma: Uint8Array,
  prevLuma: Uint8Array | null,
  width: number,
  height: number
): { cameraUnstable: boolean; edgeMeanDelta: number } {
  if (!prevLuma || currLuma.length !== prevLuma.length || width <= 0 || height <= 0) {
    return { cameraUnstable: false, edgeMeanDelta: 0 };
  }
  let sum = 0;
  let count = 0;
  const bandRows = Math.max(2, Math.floor(height * 0.14));
  for (let y = 0; y < height; y++) {
    if (y >= bandRows && y < height - bandRows) continue;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      sum += Math.abs(currLuma[idx] - prevLuma[idx]);
      count++;
    }
  }
  const edgeMeanDelta = count > 0 ? sum / count : 0;
  return {
    cameraUnstable: edgeMeanDelta > 28,
    edgeMeanDelta: Math.round(edgeMeanDelta * 10) / 10,
  };
}

function isVis(lm: PoseLandmark | undefined, minVis = 0.35): lm is PoseLandmark {
  return Boolean(lm && (lm.visibility ?? 1) >= minVis);
}

function angleDeg(
  a: PoseLandmark | undefined,
  b: PoseLandmark | undefined,
  c: PoseLandmark | undefined
): number | null {
  if (!isVis(a) || !isVis(b) || !isVis(c)) return null;
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-5 || m2 < 1e-5) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

export class AetherMotionEngine {
  private targetExercise: SupportedMotionExercise | 'auto';
  private smoothed: PoseLandmark[] | null = null;
  private repCount = 0;
  private incompleteRepCount = 0;
  private holdSeconds = 0;
  private phase: MotionRepPhase = 'WAIT_START';
  private reachedPeak = false;
  private lastRepAt = 0;
  private lastFrameAt = 0;
  private plankAccumMs = 0;
  private prevKneeDeg: number | null = null;
  private prevElbowDeg: number | null = null;
  private lastSnapshot: MotionEngineOutput;

  constructor(opts?: { targetExercise?: SupportedMotionExercise | 'auto' }) {
    this.targetExercise = opts?.targetExercise || 'auto';
    this.lastSnapshot = this.buildEmptySnapshot();
  }

  private buildEmptySnapshot(): MotionEngineOutput {
    return {
      classifiedExercise: this.targetExercise === 'auto' ? null : this.targetExercise,
      candidateExercise: this.targetExercise === 'auto' ? null : this.targetExercise,
      confidence: 0,
      confidenceLevel: 'low',
      classificationStatus: 'analyzing',
      protocolMismatch: false,
      activeProtocol: this.targetExercise,
      repCount: this.repCount,
      incompleteRepCount: this.incompleteRepCount,
      holdSeconds: this.holdSeconds,
      phase: this.phase,
      orientation: 'unknown',
      angles: {
        leftKneeDeg: null,
        rightKneeDeg: null,
        primaryKneeDeg: null,
        leftElbowDeg: null,
        rightElbowDeg: null,
        primaryElbowDeg: null,
        torsoTiltDeg: null,
        hipAlignmentDeg: null,
        leftArmAbductionDeg: null,
        rightArmAbductionDeg: null,
      },
      landmarksVisible: false,
      cameraUnstable: false,
      motionIntensity: 0,
      feedback: 'Step into frame so your shoulders, hips, and legs are clearly visible.',
      smoothedLandmarks: this.smoothed,
    };
  }

  public setTargetExercise(ex: SupportedMotionExercise | 'auto') {
    this.targetExercise = ex;
    this.phase = 'WAIT_START';
    this.reachedPeak = false;
  }

  public reset() {
    this.smoothed = null;
    this.repCount = 0;
    this.incompleteRepCount = 0;
    this.holdSeconds = 0;
    this.phase = 'WAIT_START';
    this.reachedPeak = false;
    this.lastRepAt = 0;
    this.lastFrameAt = 0;
    this.plankAccumMs = 0;
    this.prevKneeDeg = null;
    this.prevElbowDeg = null;
    this.lastSnapshot = this.buildEmptySnapshot();
  }

  public getSnapshot(): MotionEngineOutput {
    return this.lastSnapshot;
  }

  public processPoseFrame(
    rawLandmarks: PoseLandmark[] | undefined,
    nowMs: number,
    opts?: { cameraUnstable?: boolean }
  ): MotionEngineOutput {
    const cameraUnstable = Boolean(opts?.cameraUnstable);
    const dtMs = this.lastFrameAt > 0 ? Math.min(250, Math.max(1, nowMs - this.lastFrameAt)) : 33;
    this.lastFrameAt = nowMs;

    if (!rawLandmarks || rawLandmarks.length < 29) {
      this.lastSnapshot = {
        ...this.buildEmptySnapshot(),
        cameraUnstable,
        feedback: cameraUnstable
          ? 'Camera is moving too quickly—stabilize your device for accurate tracking.'
          : 'No full-body pose detected yet. Step back so shoulders, hips, and knees appear in frame.',
      };
      return this.lastSnapshot;
    }

    const alpha = 0.42;
    if (!this.smoothed || this.smoothed.length !== rawLandmarks.length) {
      this.smoothed = rawLandmarks.map(lm => ({ ...lm }));
    } else {
      this.smoothed = rawLandmarks.map((lm, i) => {
        const prev = this.smoothed![i];
        return {
          x: prev.x * (1 - alpha) + lm.x * alpha,
          y: prev.y * (1 - alpha) + lm.y * alpha,
          z: lm.z !== undefined && prev.z !== undefined ? prev.z * (1 - alpha) + lm.z * alpha : lm.z,
          visibility: lm.visibility,
        };
      });
    }

    const lms = this.smoothed;
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

    const keyVisibleCount = [ls, rs, lh, rh, lk, rk].filter(p => isVis(p, 0.35)).length;
    const landmarksVisible = keyVisibleCount >= 4;

    const leftKneeDeg = angleDeg(lh, lk, la);
    const rightKneeDeg = angleDeg(rh, rk, ra);
    const primaryKneeDeg =
      leftKneeDeg !== null && rightKneeDeg !== null
        ? Math.round((leftKneeDeg + rightKneeDeg) / 2)
        : leftKneeDeg ?? rightKneeDeg;

    const leftElbowDeg = angleDeg(ls, le, lw);
    const rightElbowDeg = angleDeg(rs, re, rw);
    const primaryElbowDeg =
      leftElbowDeg !== null && rightElbowDeg !== null
        ? Math.round((leftElbowDeg + rightElbowDeg) / 2)
        : leftElbowDeg ?? rightElbowDeg;

    const leftArmAbductionDeg = angleDeg(lh, ls, le);
    const rightArmAbductionDeg = angleDeg(rh, rs, re);
    const hipAlignmentDeg = angleDeg(ls, lh, lk) ?? angleDeg(rs, rh, rk);

    let torsoTiltDeg: number | null = null;
    if (isVis(ls) && isVis(lh)) {
      const dx = Math.abs(ls.x - lh.x);
      const dy = Math.abs(ls.y - lh.y);
      torsoTiltDeg = Math.round((Math.atan2(dx, Math.max(1e-4, dy)) * 180) / Math.PI);
    }

    const shoulderSpan = isVis(ls) && isVis(rs) ? Math.abs(ls.x - rs.x) : 0;
    const orientation: CameraBodyOrientation =
      shoulderSpan > 0.14 ? 'front' : shoulderSpan > 0.03 ? 'side' : 'unknown';

    const angles: MotionJointAngles = {
      leftKneeDeg,
      rightKneeDeg,
      primaryKneeDeg,
      leftElbowDeg,
      rightElbowDeg,
      primaryElbowDeg,
      torsoTiltDeg,
      hipAlignmentDeg,
      leftArmAbductionDeg,
      rightArmAbductionDeg,
    };

    const kneeDelta =
      primaryKneeDeg !== null && this.prevKneeDeg !== null
        ? Math.abs(primaryKneeDeg - this.prevKneeDeg)
        : 0;
    const elbowDelta =
      primaryElbowDeg !== null && this.prevElbowDeg !== null
        ? Math.abs(primaryElbowDeg - this.prevElbowDeg)
        : 0;
    this.prevKneeDeg = primaryKneeDeg;
    this.prevElbowDeg = primaryElbowDeg;
    const motionIntensity = Math.min(100, Math.round((kneeDelta + elbowDelta) * 3.5));

    const inferred: SupportedMotionExercise =
      this.targetExercise !== 'auto'
        ? this.targetExercise
        : torsoTiltDeg !== null && torsoTiltDeg > 48
        ? primaryElbowDeg !== null && primaryElbowDeg < 135
          ? 'pushup'
          : 'plank'
        : leftArmAbductionDeg !== null && rightArmAbductionDeg !== null && leftArmAbductionDeg > 110 && rightArmAbductionDeg > 110
        ? 'jumping_jack'
        : primaryKneeDeg !== null && primaryKneeDeg < 145
        ? 'squat'
        : primaryElbowDeg !== null && primaryElbowDeg < 110
        ? 'bicep_curl'
        : 'squat';

    const confidence = landmarksVisible ? (cameraUnstable ? 42 : 86) : 32;
    const confidenceLevel: MotionConfidenceTier =
      confidence >= 72 ? 'high' : confidence >= 45 ? 'medium' : 'low';

    let feedback = `${MOTION_EXERCISE_LABELS[inferred]} tracking active.`;

    if (!cameraUnstable && landmarksVisible) {
      if (inferred === 'plank') {
        const goodLine = hipAlignmentDeg !== null && hipAlignmentDeg >= 152 && torsoTiltDeg !== null && torsoTiltDeg > 45;
        if (goodLine) {
          this.phase = 'PEAK';
          this.plankAccumMs += dtMs;
          this.holdSeconds = Math.floor(this.plankAccumMs / 1000);
          feedback = `Hold steady — clean plank alignment (${this.holdSeconds}s).`;
        } else {
          this.phase = 'READY';
          feedback = 'Align shoulders, hips, and ankles in a straight horizontal plank.';
        }
      } else if (inferred === 'squat' || inferred === 'lunge') {
        const knee = primaryKneeDeg ?? 170;
        if (knee <= 108) {
          this.phase = 'PEAK';
          this.reachedPeak = true;
          feedback = 'Depth reached — drive back up cleanly!';
        } else if (knee < 145 && this.phase !== 'PEAK') {
          this.phase = 'ACTIVE_PHASE';
          feedback = 'Lower slightly deeper for full repetition credit.';
        } else if (knee >= 155) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 550) {
            this.repCount += 1;
            this.lastRepAt = nowMs;
            this.reachedPeak = false;
            feedback = `Rep #${this.repCount} verified!`;
          } else if (this.phase === 'ACTIVE_PHASE' && !this.reachedPeak) {
            this.incompleteRepCount += 1;
            feedback = 'Partial depth detected — bend knees further on the next rep.';
          }
          this.phase = 'READY';
        }
      } else if (inferred === 'pushup' || inferred === 'bicep_curl' || inferred === 'shoulder_press') {
        const elbow = primaryElbowDeg ?? 165;
        const peakLow = inferred === 'shoulder_press' ? elbow >= 152 : elbow <= 92;
        const resetPos = inferred === 'shoulder_press' ? elbow <= 105 : elbow >= 148;
        if (peakLow) {
          this.phase = 'PEAK';
          this.reachedPeak = true;
          feedback = 'Full range achieved — return smoothly!';
        } else if (!resetPos && this.phase !== 'PEAK') {
          this.phase = 'ACTIVE_PHASE';
        } else if (resetPos) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 450) {
            this.repCount += 1;
            this.lastRepAt = nowMs;
            this.reachedPeak = false;
            feedback = `Rep #${this.repCount} verified!`;
          }
          this.phase = 'READY';
        }
      } else if (inferred === 'jumping_jack') {
        const armUp = (leftArmAbductionDeg ?? 0) > 120 && (rightArmAbductionDeg ?? 0) > 120;
        const armDown = (leftArmAbductionDeg ?? 90) < 48 && (rightArmAbductionDeg ?? 90) < 48;
        if (armUp) {
          this.phase = 'PEAK';
          this.reachedPeak = true;
          feedback = 'Peak overhead reach — bring arms down cleanly.';
        } else if (armDown) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 350) {
            this.repCount += 1;
            this.lastRepAt = nowMs;
            this.reachedPeak = false;
            feedback = `Jumping Jack #${this.repCount} verified!`;
          }
          this.phase = 'READY';
        } else {
          this.phase = 'ACTIVE_PHASE';
        }
      } else if (inferred === 'knee_raise') {
        const kneeUp = (leftKneeDeg ?? 180) < 105 || (rightKneeDeg ?? 180) < 105;
        const standing = (leftKneeDeg ?? 0) > 152 && (rightKneeDeg ?? 0) > 152;
        if (kneeUp) {
          this.phase = 'PEAK';
          this.reachedPeak = true;
          feedback = 'High knee drive verified!';
        } else if (standing) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 300) {
            this.repCount += 1;
            this.lastRepAt = nowMs;
            this.reachedPeak = false;
          }
          this.phase = 'READY';
        }
      }
    } else if (cameraUnstable) {
      feedback = 'Stabilize camera — background movement paused rep counting.';
    }

    this.lastSnapshot = {
      classifiedExercise: confidenceLevel === 'high' ? inferred : null,
      candidateExercise: inferred,
      confidence,
      confidenceLevel,
      classificationStatus: cameraUnstable
        ? 'unreliable'
        : confidenceLevel === 'high'
        ? 'identified'
        : 'analyzing',
      protocolMismatch: false,
      activeProtocol: this.targetExercise,
      repCount: this.repCount,
      incompleteRepCount: this.incompleteRepCount,
      holdSeconds: this.holdSeconds,
      phase: this.phase,
      orientation,
      angles,
      landmarksVisible,
      cameraUnstable,
      motionIntensity,
      feedback,
      smoothedLandmarks: this.smoothed,
    };
    return this.lastSnapshot;
  }
}
