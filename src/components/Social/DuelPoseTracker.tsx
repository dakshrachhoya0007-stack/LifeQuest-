import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { DuelExerciseId } from '../../types/game';
import {
  AetherMotionEngine,
  computeBackgroundMotionStability,
  MotionEngineOutput,
  POSE_IDX,
  POSE_SKELETON_CONNECTIONS,
  PoseLandmark,
  VerifiedRepProof,
} from '../../utils/aetherMotionEngine';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, RefreshCw, Shield } from 'lucide-react';

export interface DuelCameraStatus {
  cameraReady: boolean;
  isLoading: boolean;
  landmarksVisible: boolean;
  cameraStable: boolean;
  confidence: number;
  protocolMismatch: boolean;
  feedback: string;
  error: string | null;
}

interface DuelPoseTrackerProps {
  exercise: DuelExerciseId;
  exerciseName: string;
  trackingEnabled: boolean;
  countingActive: boolean;
  onStatusChange?: (status: DuelCameraStatus) => void;
  onVerifiedRep?: (
    proof: VerifiedRepProof & { landmarksVisible: boolean; cameraStable: boolean }
  ) => void;
}

export const DuelPoseTracker: React.FC<DuelPoseTrackerProps> = ({
  exercise,
  exerciseName,
  trackingEnabled,
  countingActive,
  onStatusChange,
  onVerifiedRep,
}) => {
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [motionOutput, setMotionOutput] = useState<MotionEngineOutput | null>(null);
  const [feedback, setFeedback] = useState<string>(
    `Enable your camera and frame your full body to begin ${exerciseName} tracking.`
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const poseModelPromiseRef = useRef<Promise<PoseLandmarker> | null>(null);
  const engineRef = useRef<AetherMotionEngine>(
    new AetherMotionEngine({ targetExercise: exercise })
  );

  const rafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);
  const countingActiveRef = useRef(countingActive);
  const prevCountingActiveRef = useRef(countingActive);
  const lastVideoTimeRef = useRef(-1);
  const lastTimestampRef = useRef(0);
  const lastUiSyncRef = useRef(0);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const lastEmittedRepSeqRef = useRef(0);

  const onStatusChangeRef = useRef(onStatusChange);
  const onVerifiedRepRef = useRef(onVerifiedRep);
  onStatusChangeRef.current = onStatusChange;
  onVerifiedRepRef.current = onVerifiedRep;

  // Keep countingActiveRef synced and reset reps cleanly at the exact moment GO starts
  useEffect(() => {
    countingActiveRef.current = countingActive;
    if (countingActive && !prevCountingActiveRef.current) {
      engineRef.current.reset();
      lastEmittedRepSeqRef.current = 0;
    }
    prevCountingActiveRef.current = countingActive;
  }, [countingActive]);

  // Sync exercise target whenever match changes
  useEffect(() => {
    engineRef.current.setTargetExercise(exercise);
    engineRef.current.reset();
    lastEmittedRepSeqRef.current = 0;
  }, [exercise]);

  const emitStatus = useCallback(
    (partial: Partial<DuelCameraStatus>) => {
      onStatusChangeRef.current?.({
        cameraReady: partial.cameraReady ?? cameraReady,
        isLoading: partial.isLoading ?? isLoading,
        landmarksVisible: partial.landmarksVisible ?? Boolean(motionOutput?.landmarksVisible),
        cameraStable: partial.cameraStable ?? !motionOutput?.cameraUnstable,
        confidence: partial.confidence ?? Number(motionOutput?.confidence || 0),
        protocolMismatch: partial.protocolMismatch ?? Boolean(motionOutput?.protocolMismatch),
        feedback: partial.feedback ?? feedback,
        error: partial.error !== undefined ? partial.error : cameraError,
      });
    },
    [cameraReady, isLoading, motionOutput, feedback, cameraError]
  );

  const stopCamera = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      streamRef.current = null;
    }
    prevLumaRef.current = null;
    lastVideoTimeRef.current = -1;
    setCameraReady(false);
  }, []);

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
        throw new Error('Pose tracker closed before model initialization completed.');
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

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    output: MotionEngineOutput
  ) => {
    const lms = output.smoothedLandmarks;
    if (!lms || lms.length < 29) return;

    const strokeColor =
      output.cameraUnstable || output.protocolMismatch
        ? '#FB7185'
        : output.phase === 'PEAK'
        ? '#34D399'
        : output.confidenceLevel === 'high'
        ? '#38BDF8'
        : output.confidenceLevel === 'medium'
        ? '#FBBF24'
        : '#8B5CF6';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2.5, Math.round(width / 180));

    for (const [idxA, idxB] of POSE_SKELETON_CONNECTIONS) {
      const a = lms[idxA];
      const b = lms[idxB];
      if (!a || !b || (a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.moveTo((1 - a.x) * width, a.y * height);
      ctx.lineTo((1 - b.x) * width, b.y * height);
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
    const radius = Math.max(3.5, Math.round(width / 145));
    for (const idx of keyJoints) {
      const lm = lms[idx];
      if (!lm || (lm.visibility ?? 1) < 0.35) continue;
      ctx.beginPath();
      ctx.arc((1 - lm.x) * width, lm.y * height, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#090910';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
    ctx.restore();
  };

  const startLoop = useCallback(() => {
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas');
      motionCanvasRef.current.width = 64;
      motionCanvasRef.current.height = 48;
    }

    let lastOutput = engineRef.current.getSnapshot();

    const step = () => {
      if (!isRunningRef.current || !isMountedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const mCanvas = motionCanvasRef.current;

      if (canvas && video && video.readyState >= 2 && video.videoWidth > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          ctx.fillStyle = 'rgba(9, 9, 16, 0.16)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

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
                  currLuma[i] =
                    (imgData[idx] * 3 + imgData[idx + 1] * 6 + imgData[idx + 2]) / 10;
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
            } catch {
              // skip occasional frame decode hiccup
            }

            const output = engineRef.current.processPoseFrame(rawLandmarks, nowMs, {
              cameraUnstable,
            });
            lastOutput = output;

            // Emit newly verified rep proof ONLY during active duel phase (post-countdown)
            if (
              countingActiveRef.current &&
              output.lastRepProof &&
              output.lastRepProof.repSeq > lastEmittedRepSeqRef.current &&
              !output.protocolMismatch &&
              output.landmarksVisible &&
              !output.cameraUnstable
            ) {
              lastEmittedRepSeqRef.current = output.lastRepProof.repSeq;
              onVerifiedRepRef.current?.({
                ...output.lastRepProof,
                landmarksVisible: output.landmarksVisible,
                cameraStable: !output.cameraUnstable,
              });
            }

            if (nowMs - lastUiSyncRef.current >= 100) {
              lastUiSyncRef.current = nowMs;
              setMotionOutput(output);
              setFeedback(output.feedback);
              onStatusChangeRef.current?.({
                cameraReady: true,
                isLoading: false,
                landmarksVisible: output.landmarksVisible,
                cameraStable: !output.cameraUnstable,
                confidence: output.confidence,
                protocolMismatch: output.protocolMismatch,
                feedback: output.feedback,
                error: null,
              });
            }
          }

          drawSkeleton(ctx, canvas.width, canvas.height, lastOutput);

          const barW = Math.min(
            canvas.width - 32,
            Math.round((lastOutput.motionIntensity / 100) * (canvas.width - 32))
          );
          ctx.fillStyle =
            lastOutput.cameraUnstable || lastOutput.protocolMismatch
              ? 'rgba(251, 113, 133, 0.85)'
              : lastOutput.confidenceLevel === 'high'
              ? 'rgba(52, 211, 153, 0.85)'
              : 'rgba(139, 92, 246, 0.72)';
          ctx.fillRect(16, canvas.height - 12, Math.max(8, barW), 5);
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsLoading(true);
    const loadingMsg = `Initializing live Aether Vision pose tracking for ${exerciseName}...`;
    setFeedback(loadingMsg);
    emitStatus({
      cameraReady: false,
      isLoading: true,
      feedback: loadingMsg,
      error: null,
    });

    if (!navigator.mediaDevices?.getUserMedia) {
      const unsupportedMsg =
        'Camera access is not supported in this browser. Live duels require a live camera stream.';
      setIsLoading(false);
      setCameraError(unsupportedMsg);
      emitStatus({
        cameraReady: false,
        isLoading: false,
        error: unsupportedMsg,
      });
      return;
    }

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

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (!isMountedRef.current) return;
          stopCamera();
          const discErr =
            'Camera stream disconnected. Reconnect your camera to continue verifying repetitions.';
          setCameraError(discErr);
          setFeedback(discErr);
          emitStatus({
            cameraReady: false,
            isLoading: false,
            error: discErr,
            feedback: discErr,
          });
        };
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch {
            // muted inline handles autoplay cleanly
          }
          if (!isMountedRef.current) return;
          engineRef.current.reset();
          lastEmittedRepSeqRef.current = 0;
          setIsLoading(false);
          setCameraReady(true);
          isRunningRef.current = true;
          const readyMsg = `Camera active for ${exerciseName}. Step back so your shoulders, hips, and legs are clearly in frame.`;
          setFeedback(readyMsg);
          emitStatus({
            cameraReady: true,
            isLoading: false,
            feedback: readyMsg,
            error: null,
          });
          startLoop();
        };
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const msg = String(err?.message || '').toLowerCase();
      const friendlyErr =
        msg.includes('wasm') || msg.includes('fetch') || msg.includes('model')
          ? 'Could not load the on-device pose model. Check your connection and retry.'
          : 'Camera permission denied or unavailable. Live 1v1 exercise duels require an active camera feed—no unverified reps can be awarded.';
      setCameraError(friendlyErr);
      setFeedback(friendlyErr);
      emitStatus({
        cameraReady: false,
        isLoading: false,
        error: friendlyErr,
        feedback: friendlyErr,
      });
    }
  }, [emitStatus, ensurePoseLandmarker, exerciseName, startLoop, stopCamera]);

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

  useEffect(() => {
    if (trackingEnabled) {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [trackingEnabled, startCamera, stopCamera]);

  const statusTone = cameraError
    ? 'text-[#FB7185]'
    : !cameraReady
    ? 'text-[#FBBF24]'
    : motionOutput?.protocolMismatch || motionOutput?.cameraUnstable
    ? 'text-[#FB7185]'
    : motionOutput?.landmarksVisible
    ? 'text-[#34D399]'
    : 'text-[#FBBF24]';

  const statusText = cameraError
    ? 'Camera Offline'
    : isLoading
    ? 'Loading Pose Model...'
    : !cameraReady
    ? 'Waiting for Camera'
    : motionOutput?.protocolMismatch
    ? `Wrong Exercise Posture — Perform ${exerciseName}`
    : motionOutput?.cameraUnstable
    ? 'Camera Moving — Set Device Steady'
    : !motionOutput?.landmarksVisible
    ? 'Frame Full Body in View'
    : countingActive
    ? 'Live Pose Verified'
    : 'Camera Calibrated';

  return (
    <div className="bg-[#0D0D18] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#141420]/90">
        <div className={`flex items-center gap-2 text-xs font-semibold ${statusTone}`}>
          {cameraReady ? (
            motionOutput?.landmarksVisible && !motionOutput?.protocolMismatch && !motionOutput?.cameraUnstable ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )
          ) : (
            <CameraOff className="w-4 h-4 shrink-0" />
          )}
          <span>{statusText}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          {cameraReady && (
            <>
              <span className="tabular-nums">
                Confidence {Math.round(motionOutput?.confidence || 0)}%
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E8CF96] hover:text-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {cameraReady ? 'Recalibrate' : 'Reconnect Camera'}
          </button>
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full bg-[#07070D] flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover ${cameraReady ? 'block' : 'hidden'}`}
        />

        {!cameraReady && (
          <div className="p-6 max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center mx-auto text-[#A78BFA]">
              {cameraError ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isLoading
                  ? 'Preparing Aether Vision Tracker...'
                  : cameraError
                  ? 'Live Camera Verification Required'
                  : 'Camera Standby'}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {cameraError || feedback}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Starting Camera...' : 'Enable & Verify Camera'}
            </button>
          </div>
        )}

        {cameraReady && countingActive && motionOutput && (
          <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-[#090910]/85 border border-white/10 text-xs text-slate-200 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#D6A84B]" />
            <span className="tabular-nums font-semibold">
              Detected Reps: {motionOutput.repCount}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-[#12121D] border-t border-white/10 text-xs text-slate-300 flex items-center justify-between gap-3">
        <span className="truncate">{feedback}</span>
        {motionOutput && motionOutput.incompleteRepCount > 0 && countingActive && (
          <span className="text-[11px] text-[#FBBF24] shrink-0 tabular-nums">
            {motionOutput.incompleteRepCount} shallow rep
            {motionOutput.incompleteRepCount === 1 ? '' : 's'} ignored
          </span>
        )}
      </div>
    </div>
  );
};
