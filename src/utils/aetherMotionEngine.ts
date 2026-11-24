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

export interface VerifiedRepProof {
  repSeq: number;
  exercise: SupportedMotionExercise;
  peakAngleDeg: number;
  resetAngleDeg: number;
  durationMs: number;
  confidence: number;
  timestampMs: number;
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
  lastRepProof: VerifiedRepProof | null;
}

export const MOTION_EXERCISE_LABELS: Record<SupportedMotionExercise, string> = {
  squat: 'Squats',
  pushup: 'Push-ups',
  situp: 'Sit-ups',
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

function isPostureCompatible(
  exercise: SupportedMotionExercise,
  angles: MotionJointAngles
): { ok: boolean; hint?: string } {
  const tilt = angles.torsoTiltDeg;
  if (tilt === null) return { ok: true };

  if (exercise === 'pushup' || exercise === 'plank') {
    if (tilt < 32) {
      return {
        ok: false,
        hint: `Assume a horizontal ${exercise === 'pushup' ? 'push-up' : 'plank'} position so torso & arms align.`,
      };
    }
  } else if (
    exercise === 'squat' ||
    exercise === 'lunge' ||
    exercise === 'jumping_jack' ||
    exercise === 'knee_raise'
  ) {
    if (tilt > 62) {
      return {
        ok: false,
        hint: `Stand upright facing or angled toward the camera for ${MOTION_EXERCISE_LABELS[exercise]}.`,
      };
    }
  } else if (exercise === 'situp') {
    if (angles.hipAlignmentDeg === null) {
      return {
        ok: false,
        hint: 'Position yourself sideways so shoulder, hip, and bent knee landmarks are visible.',
      };
    }
  }
  return { ok: true };
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
  private cycleStartedAt = 0;
  private peakAngleObserved: number | null = null;
  private plankAccumMs = 0;
  private prevKneeDeg: number | null = null;
  private prevElbowDeg: number | null = null;
  private lastRepProof: VerifiedRepProof | null = null;
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
      lastRepProof: this.lastRepProof,
    };
  }

  public setTargetExercise(ex: SupportedMotionExercise | 'auto') {
    this.targetExercise = ex;
    this.phase = 'WAIT_START';
    this.reachedPeak = false;
    this.peakAngleObserved = null;
    this.cycleStartedAt = 0;
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
    this.cycleStartedAt = 0;
    this.peakAngleObserved = null;
    this.plankAccumMs = 0;
    this.prevKneeDeg = null;
    this.prevElbowDeg = null;
    this.lastRepProof = null;
    this.lastSnapshot = this.buildEmptySnapshot();
  }

  public getSnapshot(): MotionEngineOutput {
    return this.lastSnapshot;
  }

  private recordVerifiedRep(
    exercise: SupportedMotionExercise,
    nowMs: number,
    peakAngleDeg: number,
    resetAngleDeg: number,
    confidence: number
  ) {
    this.repCount += 1;
    const durationMs =
      this.cycleStartedAt > 0
        ? Math.max(250, Math.round(nowMs - this.cycleStartedAt))
        : Math.max(350, Math.round(nowMs - this.lastRepAt));
    this.lastRepAt = nowMs;
    this.reachedPeak = false;
    this.peakAngleObserved = null;
    this.cycleStartedAt = nowMs;
    this.lastRepProof = {
      repSeq: this.repCount,
      exercise,
      peakAngleDeg: Math.round(peakAngleDeg),
      resetAngleDeg: Math.round(resetAngleDeg),
      durationMs,
      confidence,
      timestampMs: nowMs,
    };
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
    const leftHipDeg = angleDeg(ls, lh, lk);
    const rightHipDeg = angleDeg(rs, rh, rk);
    const hipAlignmentDeg =
      leftHipDeg !== null && rightHipDeg !== null
        ? Math.round((leftHipDeg + rightHipDeg) / 2)
        : leftHipDeg ?? rightHipDeg;

    let torsoTiltDeg: number | null = null;
    const refShoulder = isVis(ls) ? ls : rs;
    const refHip = isVis(lh) ? lh : rh;
    if (isVis(refShoulder) && isVis(refHip)) {
      const dx = Math.abs(refShoulder.x - refHip.x);
      const dy = Math.abs(refShoulder.y - refHip.y);
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
        : leftArmAbductionDeg !== null &&
          rightArmAbductionDeg !== null &&
          leftArmAbductionDeg > 110 &&
          rightArmAbductionDeg > 110
        ? 'jumping_jack'
        : primaryKneeDeg !== null && primaryKneeDeg < 145
        ? 'squat'
        : primaryElbowDeg !== null && primaryElbowDeg < 110
        ? 'bicep_curl'
        : 'squat';

    const postureCheck =
      this.targetExercise !== 'auto' && landmarksVisible
        ? isPostureCompatible(this.targetExercise, angles)
        : { ok: true };
    const protocolMismatch = this.targetExercise !== 'auto' && landmarksVisible && !postureCheck.ok;

    const avgJointVis =
      [ls, rs, lh, rh, lk, rk].reduce((acc, p) => acc + (p?.visibility ?? 0.5), 0) / 6;
    const baseConfidence = landmarksVisible
      ? Math.min(96, Math.max(70, Math.round(68 + avgJointVis * 28)))
      : 32;
    const confidence = cameraUnstable ? 42 : protocolMismatch ? 48 : baseConfidence;
    const confidenceLevel: MotionConfidenceTier =
      confidence >= 72 ? 'high' : confidence >= 45 ? 'medium' : 'low';

    let feedback = postureCheck.hint || `${MOTION_EXERCISE_LABELS[inferred]} tracking active.`;

    if (!cameraUnstable && landmarksVisible && !protocolMismatch) {
      if (inferred === 'plank') {
        const goodLine =
          hipAlignmentDeg !== null &&
          hipAlignmentDeg >= 152 &&
          torsoTiltDeg !== null &&
          torsoTiltDeg > 45;
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
        const peakTarget = inferred === 'squat' ? 112 : 116;
        if (knee <= peakTarget) {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'PEAK';
          this.reachedPeak = true;
          this.peakAngleObserved =
            this.peakAngleObserved === null ? knee : Math.min(this.peakAngleObserved, knee);
          feedback = 'Depth reached — drive back up cleanly!';
        } else if (knee < 146 && this.phase !== 'PEAK') {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'ACTIVE_PHASE';
          feedback = 'Lower slightly deeper for full repetition credit.';
        } else if (knee >= 152) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 650) {
            this.recordVerifiedRep(
              inferred,
              nowMs,
              this.peakAngleObserved ?? peakTarget,
              knee,
              confidence
            );
            feedback = `Rep #${this.repCount} verified!`;
          } else if (this.phase === 'ACTIVE_PHASE' && !this.reachedPeak) {
            this.incompleteRepCount += 1;
            feedback = 'Partial depth detected — bend knees further on the next rep.';
          }
          this.phase = 'READY';
          this.cycleStartedAt = 0;
        }
      } else if (inferred === 'pushup' || inferred === 'bicep_curl' || inferred === 'shoulder_press') {
        const elbow = primaryElbowDeg ?? 165;
        const peakReached = inferred === 'shoulder_press' ? elbow >= 152 : elbow <= 98;
        const resetPos = inferred === 'shoulder_press' ? elbow <= 105 : elbow >= 145;
        if (peakReached) {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'PEAK';
          this.reachedPeak = true;
          this.peakAngleObserved =
            this.peakAngleObserved === null
              ? elbow
              : inferred === 'shoulder_press'
              ? Math.max(this.peakAngleObserved, elbow)
              : Math.min(this.peakAngleObserved, elbow);
          feedback = 'Full range achieved — return smoothly!';
        } else if (!resetPos && this.phase !== 'PEAK') {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'ACTIVE_PHASE';
        } else if (resetPos) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 550) {
            this.recordVerifiedRep(
              inferred,
              nowMs,
              this.peakAngleObserved ?? (inferred === 'shoulder_press' ? 155 : 92),
              elbow,
              confidence
            );
            feedback = `Rep #${this.repCount} verified!`;
          }
          this.phase = 'READY';
          this.cycleStartedAt = 0;
        }
      } else if (inferred === 'situp') {
        const hip = hipAlignmentDeg ?? 135;
        if (hip <= 82) {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'PEAK';
          this.reachedPeak = true;
          this.peakAngleObserved =
            this.peakAngleObserved === null ? hip : Math.min(this.peakAngleObserved, hip);
          feedback = 'Top curl reached — lower shoulder blades with control.';
        } else if (hip < 114 && this.phase !== 'PEAK') {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'ACTIVE_PHASE';
          feedback = 'Curl torso up smoothly toward knees.';
        } else if (hip >= 118) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 700) {
            this.recordVerifiedRep(inferred, nowMs, this.peakAngleObserved ?? 78, hip, confidence);
            feedback = `Sit-up #${this.repCount} verified!`;
          }
          this.phase = 'READY';
          this.cycleStartedAt = 0;
        }
      } else if (inferred === 'jumping_jack') {
        const leftAbd = leftArmAbductionDeg ?? 40;
        const rightAbd = rightArmAbductionDeg ?? 40;
        const maxAbd = Math.max(leftAbd, rightAbd);
        const minAbd = Math.min(leftAbd, rightAbd);
        const armUp = leftAbd > 118 && rightAbd > 118;
        const armDown = leftAbd < 52 && rightAbd < 52;
        if (armUp) {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'PEAK';
          this.reachedPeak = true;
          this.peakAngleObserved =
            this.peakAngleObserved === null ? maxAbd : Math.max(this.peakAngleObserved, maxAbd);
          feedback = 'Peak overhead reach — bring arms down cleanly.';
        } else if (armDown) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 380) {
            this.recordVerifiedRep(inferred, nowMs, this.peakAngleObserved ?? 130, minAbd, confidence);
            feedback = `Jumping Jack #${this.repCount} verified!`;
          }
          this.phase = 'READY';
          this.cycleStartedAt = 0;
        } else {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'ACTIVE_PHASE';
        }
      } else if (inferred === 'knee_raise') {
        const lKnee = leftKneeDeg ?? 175;
        const rKnee = rightKneeDeg ?? 175;
        const minKnee = Math.min(lKnee, rKnee);
        const kneeUp = minKnee < 108;
        const standing = lKnee > 150 && rKnee > 150;
        if (kneeUp) {
          if (this.cycleStartedAt === 0) this.cycleStartedAt = nowMs;
          this.phase = 'PEAK';
          this.reachedPeak = true;
          this.peakAngleObserved =
            this.peakAngleObserved === null ? minKnee : Math.min(this.peakAngleObserved, minKnee);
          feedback = 'High knee drive verified!';
        } else if (standing) {
          if (this.reachedPeak && nowMs - this.lastRepAt > 320) {
            this.recordVerifiedRep(
              inferred,
              nowMs,
              this.peakAngleObserved ?? 98,
              Math.round((lKnee + rKnee) / 2),
              confidence
            );
            feedback = `High Knee #${this.repCount} verified!`;
          }
          this.phase = 'READY';
          this.cycleStartedAt = 0;
        }
      }
    } else if (cameraUnstable) {
      feedback = 'Stabilize camera — background movement paused rep counting.';
    } else if (protocolMismatch && postureCheck.hint) {
      feedback = postureCheck.hint;
    }

    this.lastSnapshot = {
      classifiedExercise: !protocolMismatch && confidenceLevel === 'high' ? inferred : null,
      candidateExercise: inferred,
      confidence,
      confidenceLevel,
      classificationStatus: cameraUnstable || protocolMismatch
        ? 'unreliable'
        : confidenceLevel === 'high'
        ? 'identified'
        : 'analyzing',
      protocolMismatch,
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
      lastRepProof: this.lastRepProof,
    };
    return this.lastSnapshot;
  }
}
