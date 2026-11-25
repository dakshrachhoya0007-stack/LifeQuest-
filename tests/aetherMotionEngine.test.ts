import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AetherMotionEngine,
  POSE_IDX,
  computeBackgroundMotionStability,
  type PoseLandmark,
} from '../src/utils/aetherMotionEngine.ts';

function blankPose(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
}

function makeSquatPose(depth: number): PoseLandmark[] {
  // depth 0 = upright standing, 1 = deep parallel squat
  const p = blankPose();
  const hipY = 0.52 + depth * 0.16;
  const shoulderY = 0.28 + depth * 0.14;
  const kneeForward = depth * 0.14;
  p[POSE_IDX.NOSE] = { x: 0.5, y: shoulderY - 0.12, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_SHOULDER] = { x: 0.44, y: shoulderY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_SHOULDER] = { x: 0.56, y: shoulderY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ELBOW] = { x: 0.4, y: shoulderY + 0.12, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ELBOW] = { x: 0.6, y: shoulderY + 0.12, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_WRIST] = { x: 0.42, y: shoulderY + 0.22, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_WRIST] = { x: 0.58, y: shoulderY + 0.22, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_HIP] = { x: 0.45, y: hipY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_HIP] = { x: 0.55, y: hipY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_KNEE] = { x: 0.45 + kneeForward, y: 0.72, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_KNEE] = { x: 0.55 + kneeForward, y: 0.72, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ANKLE] = { x: 0.45, y: 0.92, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ANKLE] = { x: 0.55, y: 0.92, z: 0, visibility: 0.99 };
  return p;
}

function makePushupPose(depth: number): PoseLandmark[] {
  // Side-view horizontal push-up: depth 0 = arms locked out, depth 1 = chest near floor
  const p = blankPose();
  const shoulderY = 0.62 + depth * 0.14;
  const hipY = 0.67 + depth * 0.07;
  const elbowX = 0.28 - depth * 0.06;
  const elbowY = 0.76 + depth * 0.04;
  p[POSE_IDX.NOSE] = { x: 0.22, y: shoulderY - 0.04, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_SHOULDER] = { x: 0.3, y: shoulderY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_SHOULDER] = { x: 0.32, y: shoulderY + 0.01, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ELBOW] = { x: elbowX, y: elbowY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ELBOW] = { x: elbowX + 0.02, y: elbowY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_WRIST] = { x: 0.3, y: 0.9, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_WRIST] = { x: 0.32, y: 0.9, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_HIP] = { x: 0.56, y: hipY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_HIP] = { x: 0.58, y: hipY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_KNEE] = { x: 0.72, y: 0.77, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_KNEE] = { x: 0.74, y: 0.77, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ANKLE] = { x: 0.88, y: 0.88, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ANKLE] = { x: 0.9, y: 0.88, z: 0, visibility: 0.99 };
  return p;
}

function makeJumpingJackPose(open: number): PoseLandmark[] {
  // open 0 = feet together, hands at hips; open 1 = feet wide, arms overhead
  const p = blankPose();
  const ankleSpread = 0.05 + open * 0.24;
  const wristY = 0.52 - open * 0.44;
  const wristXSpread = 0.1 + open * 0.16;
  const elbowY = 0.4 - open * 0.22;
  const elbowXSpread = 0.08 + open * 0.16;
  p[POSE_IDX.NOSE] = { x: 0.5, y: 0.16, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_SHOULDER] = { x: 0.44, y: 0.28, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_SHOULDER] = { x: 0.56, y: 0.28, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ELBOW] = { x: 0.5 - elbowXSpread, y: elbowY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ELBOW] = { x: 0.5 + elbowXSpread, y: elbowY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_WRIST] = { x: 0.5 - wristXSpread, y: wristY, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_WRIST] = { x: 0.5 + wristXSpread, y: wristY, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_HIP] = { x: 0.45, y: 0.52, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_HIP] = { x: 0.55, y: 0.52, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_KNEE] = { x: 0.5 - ankleSpread * 0.5, y: 0.72, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_KNEE] = { x: 0.5 + ankleSpread * 0.5, y: 0.72, z: 0, visibility: 0.99 };
  p[POSE_IDX.LEFT_ANKLE] = { x: 0.5 - ankleSpread, y: 0.92, z: 0, visibility: 0.99 };
  p[POSE_IDX.RIGHT_ANKLE] = { x: 0.5 + ankleSpread, y: 0.92, z: 0, visibility: 0.99 };
  return p;
}

test('AetherMotionEngine counts complete multi-frame squats and rejects shallow half-squats', () => {
  const engine = new AetherMotionEngine({ targetExercise: 'squat' });
  let t = 0;
  let lastOutput = engine.processPoseFrame(makeSquatPose(0), t);

  // Establish upright baseline for ~600ms
  for (let i = 0; i < 12; i++) {
    t += 50;
    lastOutput = engine.processPoseFrame(makeSquatPose(0), t);
  }

  // Perform 2 full squats (depth reaches 1.0 -> knee < 90 deg)
  for (let rep = 0; rep < 2; rep++) {
    for (const d of [0.25, 0.55, 0.85, 1.0, 1.0, 0.7, 0.35, 0, 0, 0]) {
      t += 85;
      lastOutput = engine.processPoseFrame(makeSquatPose(d), t);
    }
  }

  assert.equal(lastOutput.classifiedExercise, 'squat');
  assert.ok(lastOutput.repCount >= 2, `Expected at least 2 counted squats, got ${lastOutput.repCount}`);
  const repsAfterFull = lastOutput.repCount;

  // Now perform a shallow knee dip (depth 0.32 -> knee ~140 deg) and return
  for (const d of [0.2, 0.32, 0.32, 0.15, 0, 0]) {
    t += 85;
    lastOutput = engine.processPoseFrame(makeSquatPose(d), t);
  }
  assert.equal(lastOutput.repCount, repsAfterFull, 'Shallow half-squat must not count as a rep');
});

test('AetherMotionEngine distinguishes Jumping Jacks from Squats and rejects mismatched protocol', () => {
  const squatEngine = new AetherMotionEngine({ targetExercise: 'squat' });
  let t = 0;
  let out = squatEngine.processPoseFrame(makeJumpingJackPose(0), t);

  for (let cycle = 0; cycle < 3; cycle++) {
    for (const o of [0, 0, 0.4, 0.85, 1.0, 1.0, 0.5, 0, 0]) {
      t += 75;
      out = squatEngine.processPoseFrame(makeJumpingJackPose(o), t);
    }
  }

  assert.equal(out.classifiedExercise, 'jumping_jack');
  assert.equal(out.protocolMismatch, true);
  assert.equal(out.repCount, 0, 'Squat counter must not credit jumping jack cycles');
});

test('AetherMotionEngine distinguishes Push-ups from Plank holds', () => {
  // 1. Push-ups
  const pushupEngine = new AetherMotionEngine({ targetExercise: 'pushup' });
  let t = 0;
  let pushOut = pushupEngine.processPoseFrame(makePushupPose(0), t);
  for (let rep = 0; rep < 2; rep++) {
    for (const d of [0, 0, 0.35, 0.8, 1.0, 1.0, 0.55, 0, 0, 0]) {
      t += 90;
      pushOut = pushupEngine.processPoseFrame(makePushupPose(d), t);
    }
  }
  assert.equal(pushOut.classifiedExercise, 'pushup');
  assert.ok(pushOut.repCount >= 1, `Expected pushup reps >= 1, got ${pushOut.repCount}`);

  // 2. Sustained Plank hold (> 5s steady horizontal alignment)
  const plankEngine = new AetherMotionEngine({ targetExercise: 'plank' });
  let pt = 0;
  let plankOut = plankEngine.processPoseFrame(makePushupPose(0), pt);
  for (let i = 0; i < 65; i++) {
    pt += 100;
    plankOut = plankEngine.processPoseFrame(makePushupPose(0), pt);
  }
  assert.equal(plankOut.classifiedExercise, 'plank');
  assert.ok(plankOut.holdSeconds >= 5, `Expected holdSeconds >= 5, got ${plankOut.holdSeconds}`);
  assert.ok(plankOut.repCount >= 1, 'Expected 5s plank hold to award at least 1 endurance unit');
});

test('AetherMotionEngine & background stability reject camera shake', () => {
  const prev = new Uint8Array(64 * 48).fill(30);
  const currShaken = new Uint8Array(64 * 48).fill(180);
  const stability = computeBackgroundMotionStability(currShaken, prev, 64, 48);
  assert.equal(stability.cameraUnstable, true);

  const engine = new AetherMotionEngine({ targetExercise: 'squat' });
  const out = engine.processPoseFrame(makeSquatPose(1), 200, { cameraUnstable: true });
  assert.equal(out.cameraUnstable, true);
  assert.equal(out.repCount, 0);
});
