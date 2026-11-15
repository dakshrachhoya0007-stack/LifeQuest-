import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Compass,
  Cpu,
  Gamepad2,
  Globe,
  Hand,
  Home,
  Landmark,
  Lock,
  MapPin,
  Menu,
  Sparkles,
  Trees,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useGame } from '../../../context/GameContext';
import { getHeroById } from '../../../data/heroesData';
import {
  GOLDEN_TREE_STAGES,
  HEARTLANDS_LANDMARKS,
  LANDMARK_RESTORATION_STAGES,
  WORLD_REGIONS,
  getGoldenTreeStageMeta,
  getLandmarkDefinition,
  getLandmarkStageMeta,
} from '../../../data/heartlandsWorldData';
import {
  GoldenTreeStage,
  LandmarkId,
  LandmarkRestorationStage,
  WorldRegionId,
} from '../../../types/game';
import {
  HeartlandsHudSnapshot,
  HeartlandsWorldCanvas,
  HeartlandsWorldHandle,
} from './HeartlandsWorldCanvas';
import { WorldMinimap } from './WorldMinimap';
import { MobileTouchControls } from './MobileTouchControls';
import { InteractableTarget } from './terrainMath';
import { resolveAssetUrl } from '../../../assets/images';

type WorldMenuTab = 'overview' | 'regions' | 'golden_tree' | 'landmarks';

export const WorldExplorationView: React.FC = () => {
  const {
    user,
    selectedHeroId,
    worldState,
    markWorldEntered,
    setWorldGoldenTreeStage,
    setWorldLandmarkStage,
    setWorldGraphicsQuality,
    saveWorldPlayerPosition,
    setActiveTab,
  } = useGame();

  const canvasHandleRef = useRef<HeartlandsWorldHandle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<WorldMenuTab>('overview');
  const [activeInspection, setActiveInspection] = useState<InteractableTarget | null>(null);
  const [showTouchPad, setShowTouchPad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900 || 'ontouchstart' in window;
  });

  const [hud, setHud] = useState<HeartlandsHudSnapshot>({
    telemetry: {
      x: worldState.lastPlayerPosition?.x ?? 0,
      y: worldState.lastPlayerPosition?.y ?? 2.2,
      z: worldState.lastPlayerPosition?.z ?? 12.0,
      yaw: 0,
      speedRatio: 0,
      isSprinting: false,
      isGrounded: true,
    },
    zoneName: 'Sanctuary of the Golden Tree',
    nearestInteractable: null,
    usingExternalHeroGlb: false,
  });

  const heroDef = getHeroById(selectedHeroId);
  const activeRegion =
    WORLD_REGIONS.find(r => r.id === worldState.selectedRegionId) || WORLD_REGIONS[0];
  const activeTreeStageMeta = getGoldenTreeStageMeta(worldState.goldenTreeStage);

  // Mark player's initial entry into The Heartlands (persists via Supabase/preferences)
  useEffect(() => {
    if (!worldState.hasEnteredWorld) {
      void markWorldEntered();
    }
  }, [worldState.hasEnteredWorld, markWorldEntered]);

  // Shortcut 'M' toggles World Menu, 'Escape' closes panels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyM') {
        setIsMenuOpen(prev => !prev);
      } else if (e.code === 'Escape') {
        if (activeInspection) setActiveInspection(null);
        else if (isMenuOpen) setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeInspection, isMenuOpen]);

  const handleHudUpdate = useCallback((snapshot: HeartlandsHudSnapshot) => {
    setHud(snapshot);
  }, []);

  const handleInteract = useCallback((target: InteractableTarget) => {
    setActiveInspection(target);
  }, []);

  const handleFastTravel = (x: number, z: number) => {
    canvasHandleRef.current?.teleportTo(x, z);
    setIsMenuOpen(false);
    setActiveInspection(null);
  };

  const handleSelectRegion = (regionId: WorldRegionId) => {
    const reg = WORLD_REGIONS.find(r => r.id === regionId);
    if (!reg || reg.status !== 'active') return;
    setMenuTab('overview');
  };

  return (
    <div className="relative w-full h-[calc(100vh-92px)] min-h-[540px] max-h-[860px] rounded-2xl overflow-hidden border border-[#C5A15A]/35 bg-[#090710] shadow-2xl">
      {/* Interactive Three.js 3D Heartlands Viewport */}
      {!webglError ? (
        <HeartlandsWorldCanvas
          ref={canvasHandleRef}
          heroId={selectedHeroId}
          goldenTreeStage={worldState.goldenTreeStage}
          landmarks={worldState.landmarks}
          graphicsQuality={worldState.graphicsQuality}
          initialPosition={worldState.lastPlayerPosition}
          isPaused={isMenuOpen || Boolean(activeInspection)}
          onHudUpdate={handleHudUpdate}
          onInteractTarget={handleInteract}
          onPositionPersist={saveWorldPlayerPosition}
          onWorldReady={() => setIsLoading(false)}
          onWebglError={reason => {
            setIsLoading(false);
            setWebglError(reason);
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#0d0a16]">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-center text-amber-300 mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="font-['Cinzel'] font-black text-xl text-[#F5EFE6] mb-2">
            3D WebGL Renderer Unavailable
          </h2>
          <p className="text-sm text-[#D9D2C5]/75 max-w-md mb-6">{webglError}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setWebglError(null);
                setIsLoading(true);
                void setWorldGraphicsQuality('low');
              }}
              className="px-4 py-2 rounded-xl bg-[#251638] border border-[#C5A15A]/50 text-xs font-bold text-[#C5A15A]"
            >
              Retry in Low Performance Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 rounded-xl bg-[#C5A15A] text-[#090710] text-xs font-bold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Initial World Loading Screen */}
      {isLoading && !webglError && (
        <div className="absolute inset-0 z-40 bg-[#090710]/96 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#181128] border border-[#C5A15A]/55 flex items-center justify-center mb-4 shadow-xl">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-[#C5A15A]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12 21V9" strokeLinecap="round" />
              <path d="M12 13c-3 0-5-2.2-5-5 0-2.5 2-4.5 5-5.5 3 1 5 3 5 5.5 0 2.8-2 5-5 5Z" />
              <path d="M8.5 21h7" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-['Cinzel'] font-black text-xl tracking-widest text-[#F5EFE6]">
            ENTERING THE HEARTLANDS
          </h2>
          <p className="text-xs text-[#C5A15A] mt-1 tracking-wide">
            Forging terrain, Golden Tree sanctuary &amp; medieval landmarks...
          </p>
        </div>
      )}

      {/* Clean Minimalist Game HUD (Top Overlay) */}
      {!webglError && (
        <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 z-20 flex items-start justify-between gap-3">
          {/* Top-Left: Character Banner + Region Badge + Menu / Graphics Controls */}
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#0d0a16]/88 border border-[#C5A15A]/40 shadow-xl">
              <div className="w-8 h-8 rounded-lg bg-[#201433] border border-[#C5A15A]/50 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4.5 h-4.5 text-[#C5A15A]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 21V9" strokeLinecap="round" />
                  <path d="M12 13c-3 0-5-2.2-5-5 0-2.5 2-4.5 5-5.5 3 1 5 3 5 5.5 0 2.8-2 5-5 5Z" />
                  <path d="M8.5 21h7" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-['Cinzel'] font-bold text-xs sm:text-sm text-[#F5EFE6] truncate">
                    {user?.characterName || user?.username || heroDef.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#C5A15A] bg-[#251638] px-1.5 py-0.5 rounded border border-[#C5A15A]/30">
                    {heroDef.name}
                  </span>
                </div>
                <p className="text-[10px] text-[#D9D2C5]/75 flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-[#C5A15A]" />
                  <span>{activeRegion.name}</span>
                  <span className="text-[#D9D2C5]/35">·</span>
                  <span className="text-[#C5A15A]">{activeTreeStageMeta.label} Tree</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#0d0a16]/88 hover:bg-[#251638] border border-[#C5A15A]/40 text-xs font-['Cinzel'] font-bold text-[#F5EFE6] flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <Menu className="w-3.5 h-3.5 text-[#C5A15A]" />
                World Menu (M)
              </button>

              <button
                type="button"
                onClick={() =>
                  void setWorldGraphicsQuality(
                    worldState.graphicsQuality === 'high' ? 'low' : 'high'
                  )
                }
                title="Toggle 3D Graphics Quality"
                className="px-2.5 py-1.5 rounded-lg bg-[#0d0a16]/88 hover:bg-[#251638] border border-[#C5A15A]/30 text-[11px] font-semibold text-[#D9D2C5] flex items-center gap-1 shadow-lg"
              >
                <Cpu className="w-3.5 h-3.5 text-[#C5A15A]" />
                {worldState.graphicsQuality === 'high' ? 'High FX' : 'Eco FPS'}
              </button>

              <button
                type="button"
                onClick={() => setShowTouchPad(v => !v)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0d0a16]/88 hover:bg-[#251638] border border-[#C5A15A]/30 text-[11px] font-semibold text-[#D9D2C5] flex items-center gap-1 shadow-lg"
                title="Toggle on-screen touch controls"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-[#C5A15A]" />
                {showTouchPad ? 'Hide Pad' : 'Touch Pad'}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-2.5 py-1.5 rounded-lg bg-[#0d0a16]/88 hover:bg-[#251638] border border-[#C5A15A]/30 text-[11px] font-semibold text-[#C5A15A] flex items-center gap-1 shadow-lg"
              >
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </div>
          </div>

          {/* Top-Right: Circular Minimap + Compass */}
          <div className="pointer-events-auto">
            <WorldMinimap
              playerX={hud.telemetry.x}
              playerZ={hud.telemetry.z}
              cameraYaw={hud.telemetry.yaw}
              zoneName={hud.zoneName}
            />
          </div>
        </div>
      )}

      {/* Contextual Landmark / Golden Tree Proximity Prompt */}
      {hud.nearestInteractable && !activeInspection && !isMenuOpen && !webglError && (
        <div className="pointer-events-auto absolute bottom-20 sm:bottom-14 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => setActiveInspection(hud.nearestInteractable)}
            className="px-5 py-2.5 rounded-xl bg-[#110c1c]/95 hover:bg-[#251638] border-2 border-[#C5A15A] text-[#F5EFE6] shadow-2xl flex items-center gap-2.5 transition-transform hover:scale-105"
          >
            <span className="px-2 py-0.5 rounded bg-[#C5A15A] text-[#090710] font-mono font-black text-xs">
              E
            </span>
            <Hand className="w-4 h-4 text-[#C5A15A]" />
            <span className="font-['Cinzel'] font-bold text-xs sm:text-sm tracking-wide">
              Inspect {hud.nearestInteractable.label}
            </span>
          </button>
        </div>
      )}

      {/* Desktop Controls Hint Strip */}
      {!showTouchPad && !isMenuOpen && !activeInspection && !webglError && (
        <div className="pointer-events-none hidden md:flex items-center gap-3 absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-[#0d0a16]/85 border border-[#C5A15A]/25 text-[11px] text-[#D9D2C5]/80">
          <span>
            <strong className="text-[#C5A15A]">WASD</strong> Move
          </span>
          <span>·</span>
          <span>
            <strong className="text-[#C5A15A]">Drag Mouse</strong> Camera
          </span>
          <span>·</span>
          <span>
            <strong className="text-[#C5A15A]">Shift</strong> Sprint
          </span>
          <span>·</span>
          <span>
            <strong className="text-[#C5A15A]">Space</strong> Jump
          </span>
          <span>·</span>
          <span>
            <strong className="text-[#C5A15A]">E</strong> Interact
          </span>
        </div>
      )}

      {/* Mobile / Touch Virtual Joystick & Action Buttons */}
      {showTouchPad && !isMenuOpen && !activeInspection && !webglError && (
        <MobileTouchControls
          onMoveChange={input => canvasHandleRef.current?.setVirtualInput(input)}
          onCameraRotate={(dy, dp) => canvasHandleRef.current?.rotateCamera(dy, dp)}
          onJump={() => canvasHandleRef.current?.triggerJump()}
          onInteract={() => {
            if (hud.nearestInteractable) setActiveInspection(hud.nearestInteractable);
          }}
          canInteract={Boolean(hud.nearestInteractable)}
          interactLabel={hud.nearestInteractable?.label}
        />
      )}

      {/* LANDMARK / GOLDEN TREE INTERACTION PANEL */}
      {activeInspection && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#100D19] border border-[#C5A15A]/55 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            {activeInspection.kind === 'golden_tree' ? (
              <>
                <div className="relative h-44 bg-[#19102b] overflow-hidden shrink-0">
                  <img
                    src={resolveAssetUrl(activeRegion.artwork)}
                    alt="The Golden Tree of Life"
                    className="w-full h-full object-cover opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] via-[#100D19]/30 to-transparent" />
                  <button
                    type="button"
                    onClick={() => setActiveInspection(null)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-[#100D19]/80 text-[#D9D2C5] hover:text-white border border-[#C5A15A]/30"
                    aria-label="Close panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold">
                        Permanent World Heart · LIFEQUEST Emblem
                      </span>
                      <h3 className="font-['Cinzel'] font-black text-xl text-[#F5EFE6]">
                        THE GOLDEN TREE OF LIFE
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#251638] border border-[#C5A15A]/50 font-mono text-xs font-bold text-[#C5A15A]">
                      {activeTreeStageMeta.percent}% Radiant
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                  <p className="text-xs sm:text-sm text-[#D9D2C5]/85 leading-relaxed">
                    Anchored upon the ancient stepped sanctuary at the center of The Heartlands, the Golden Tree reflects the living vitality of Aetheria across five monumental stages.
                  </p>

                  <div className="p-3.5 rounded-xl bg-[#161124] border border-[#C5A15A]/25 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#C5A15A]">
                      <span>Active Stage: {activeTreeStageMeta.label}</span>
                      <span className="font-mono">{activeTreeStageMeta.percent}%</span>
                    </div>
                    <p className="text-xs text-[#D9D2C5]/80">{activeTreeStageMeta.summary}</p>
                    <p className="text-[11px] text-[#C5A15A]/80 italic">{activeTreeStageMeta.visualNotes}</p>
                  </div>

                  {/* Phase 1 Visual Stage Preview Controls (Honest Phase 1 controlled preview, no fake XP) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold block">
                      Phase 1 Visual Stage Preview (5 Tree States)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {GOLDEN_TREE_STAGES.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => void setWorldGoldenTreeStage(st.id as GoldenTreeStage)}
                          className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                            worldState.goldenTreeStage === st.id
                              ? 'bg-[#C5A15A] text-[#090710] border-[#ffe3a3]'
                              : 'bg-[#171126] text-[#D9D2C5] border-[#C5A15A]/25 hover:border-[#C5A15A]/60'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#D9D2C5]/55">
                      Phase 1 Foundation: previews real-time 3D geometry, canopy lighting, and particle state without modifying player XP or granting progression rewards.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveInspection(null)}
                      className="px-5 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d7b269] text-[#090710] font-['Cinzel'] font-black text-xs tracking-wider"
                    >
                      Resume Exploration
                    </button>
                  </div>
                </div>
              </>
            ) : (
              (() => {
                const lmId = activeInspection.id as LandmarkId;
                const lmDef = getLandmarkDefinition(lmId);
                const lmState = worldState.landmarks[lmId];
                const lmStageMeta = getLandmarkStageMeta(lmState.stage);

                return (
                  <>
                    <div className="relative h-44 bg-[#19102b] overflow-hidden shrink-0">
                      <img
                        src={resolveAssetUrl(lmDef.artwork)}
                        alt={lmDef.name}
                        className="w-full h-full object-cover opacity-70"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#100D19] via-[#100D19]/35 to-transparent" />
                      <button
                        type="button"
                        onClick={() => setActiveInspection(null)}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-[#100D19]/80 text-[#D9D2C5] hover:text-white border border-[#C5A15A]/30"
                        aria-label="Close panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold">
                            {lmDef.subtitle}
                          </span>
                          <h3 className="font-['Cinzel'] font-black text-xl text-[#F5EFE6]">
                            {lmDef.name}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#251638] border border-[#C5A15A]/50 font-mono text-xs font-bold text-[#C5A15A]">
                          {lmState.restorationPercent}% Restored
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 overflow-y-auto">
                      <p className="text-xs sm:text-sm text-[#D9D2C5]/85 leading-relaxed">
                        {lmDef.description}
                      </p>

                      <p className="text-xs italic text-[#C5A15A]/85 border-l-2 border-[#C5A15A]/50 pl-3">
                        {lmDef.lore}
                      </p>

                      <div className="p-3.5 rounded-xl bg-[#161124] border border-[#C5A15A]/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#C5A15A]">
                          <span>Current Stage: {lmStageMeta.label}</span>
                          <span className="font-mono">{lmState.restorationPercent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#24193a] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#7046A5] to-[#C5A15A]"
                            style={{ width: `${lmState.restorationPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-[#D9D2C5]/80">
                          {lmDef.stageSummaries[lmState.stage]}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold block">
                          Phase 1 Visual Restoration Preview (5 Landmark States)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {LANDMARK_RESTORATION_STAGES.map(st => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() =>
                                void setWorldLandmarkStage(
                                  lmId,
                                  st.id as LandmarkRestorationStage,
                                  st.defaultPercent
                                )
                              }
                              className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                                lmState.stage === st.id
                                  ? 'bg-[#C5A15A] text-[#090710] border-[#ffe3a3]'
                                  : 'bg-[#171126] text-[#D9D2C5] border-[#C5A15A]/25 hover:border-[#C5A15A]/60'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#D9D2C5]/55">
                          Phase 1 Architecture: inspects the 5 visual restoration states in-world. Habit/workout-driven restoration arrives in a later phase.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveInspection(null)}
                          className="px-5 py-2 rounded-xl bg-[#C5A15A] hover:bg-[#d7b269] text-[#090710] font-['Cinzel'] font-black text-xs tracking-wider"
                        >
                          Resume Exploration
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* WORLD MENU OVERLAY (Overview, 5 Regions, Golden Tree, 4 Landmarks, Return to Dashboard) */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-30 bg-black/78 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#100D19] border border-[#C5A15A]/45 shadow-2xl flex flex-col overflow-hidden">
            {/* Menu Header */}
            <div className="px-5 py-4 border-b border-[#C5A15A]/20 flex items-center justify-between gap-3 bg-[#151024]">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#C5A15A]" />
                <div>
                  <h2 className="font-['Cinzel'] font-black text-base sm:text-lg text-[#F5EFE6]">
                    WORLD OF AETHERIA · ATLAS
                  </h2>
                  <p className="text-[11px] text-[#C5A15A]">
                    Phase 1 Playable Region: The Heartlands
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1.5 rounded-lg bg-[#251638] hover:bg-[#3a2257] border border-[#C5A15A]/35 text-xs font-semibold text-[#C5A15A] flex items-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg text-[#D9D2C5]/75 hover:text-white hover:bg-[#251638]"
                  aria-label="Close world menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Menu Navigation Tabs */}
            <div className="px-5 py-2.5 border-b border-[#C5A15A]/15 flex flex-wrap gap-2 bg-[#0d0a16]">
              {(
                [
                  { id: 'overview', label: 'World Overview', icon: Compass },
                  { id: 'regions', label: 'Five Regions', icon: Globe },
                  { id: 'golden_tree', label: 'The Golden Tree', icon: Trees },
                  { id: 'landmarks', label: 'Four Landmarks', icon: Landmark },
                ] as const
              ).map(t => {
                const Icon = t.icon;
                const active = menuTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMenuTab(t.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-['Cinzel'] font-bold flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-[#C5A15A] text-[#090710]'
                        : 'bg-[#171126] text-[#D9D2C5]/80 hover:text-white border border-[#C5A15A]/20'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Menu Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {menuTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#161124] border border-[#C5A15A]/25 space-y-2">
                    <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold">
                      Phase 1 Region Status
                    </span>
                    <h3 className="font-['Cinzel'] font-black text-lg text-[#F5EFE6]">
                      The Heartlands
                    </h3>
                    <p className="text-xs text-[#D9D2C5]/80 leading-relaxed">
                      Explore an open 3D emerald valley framed by mountain ridges, pine &amp; oak woodlands, a rushing river and waterfall, and four restored or ruined medieval landmarks radiating outward from The Golden Tree.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleFastTravel(0, 12)}
                        className="px-3 py-1.5 rounded-lg bg-[#C5A15A] text-[#090710] text-xs font-bold flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Spawn at Sanctuary
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#251638] text-[#D9D2C5] border border-[#C5A15A]/30 text-xs font-semibold"
                      >
                        Resume Walking
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#161124] border border-[#C5A15A]/25 space-y-2.5">
                    <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] font-bold">
                      Explorer &amp; Technical Status
                    </span>
                    <div className="text-xs space-y-1.5 text-[#D9D2C5]/85">
                      <div className="flex justify-between">
                        <span>Active Champion:</span>
                        <span className="text-[#C5A15A] font-semibold">{heroDef.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Zone:</span>
                        <span className="text-[#F5EFE6]">{hud.zoneName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Character Source:</span>
                        <span className="font-mono text-[11px]">
                          {hud.usingExternalHeroGlb
                            ? 'Rigged GLB Model'
                            : 'Procedural 3D Rig (GLB Fallback)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Graphics Quality:</span>
                        <span className="font-mono text-[#C5A15A]">
                          {worldState.graphicsQuality === 'high' ? 'High (Shadows + Bloom)' : 'Low Perf / Mobile'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {menuTab === 'regions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WORLD_REGIONS.map(reg => {
                    const isLocked = reg.status === 'locked';
                    return (
                      <div
                        key={reg.id}
                        className={`rounded-xl border overflow-hidden flex flex-col ${
                          isLocked
                            ? 'bg-[#120e1c] border-slate-800/80 opacity-85'
                            : 'bg-[#171226] border-[#C5A15A]/60 shadow-lg'
                        }`}
                      >
                        <div className="relative h-32 bg-[#0d0a16]">
                          <img
                            src={resolveAssetUrl(reg.artwork)}
                            alt={reg.name}
                            className={`w-full h-full object-cover ${
                              isLocked ? 'opacity-35 grayscale' : 'opacity-80'
                            }`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#120e1c] to-transparent" />
                          <span
                            className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-['Cinzel'] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isLocked
                                ? 'bg-slate-900/90 text-slate-300 border border-slate-700'
                                : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Lock className="w-3 h-3" /> Locked
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" /> Active
                              </>
                            )}
                          </span>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h4 className="font-['Cinzel'] font-black text-sm text-[#F5EFE6]">
                              {reg.name}
                            </h4>
                            <p className="text-[11px] text-[#C5A15A] mb-1.5">{reg.subtitle}</p>
                            <p className="text-xs text-[#D9D2C5]/75 leading-relaxed">
                              {reg.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-[#D9D2C5]/55">{reg.phaseNote}</span>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectRegion(reg.id);
                                  setIsMenuOpen(false);
                                }}
                                className="px-3 py-1 rounded-lg bg-[#C5A15A] text-[#090710] text-[11px] font-bold"
                              >
                                Explore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {menuTab === 'golden_tree' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#161124] border border-[#C5A15A]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-['Cinzel'] font-black text-base text-[#F5EFE6]">
                        The Golden Tree — {activeTreeStageMeta.label} ({activeTreeStageMeta.percent}%)
                      </h3>
                      <p className="text-xs text-[#D9D2C5]/80 mt-0.5">
                        {activeTreeStageMeta.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFastTravel(0, 10.5)}
                      className="px-3.5 py-2 rounded-xl bg-[#C5A15A] text-[#090710] text-xs font-bold shrink-0"
                    >
                      Go to Tree Sanctuary
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {GOLDEN_TREE_STAGES.map(st => {
                      const active = worldState.goldenTreeStage === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => void setWorldGoldenTreeStage(st.id)}
                          className={`p-3 rounded-xl border text-left transition-colors ${
                            active
                              ? 'bg-[#26193b] border-[#C5A15A] text-[#F5EFE6]'
                              : 'bg-[#140f22] border-[#C5A15A]/20 text-[#D9D2C5]/80 hover:border-[#C5A15A]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between font-['Cinzel'] font-bold text-xs text-[#C5A15A] mb-1">
                            <span>{st.label}</span>
                            <span className="font-mono">{st.percent}%</span>
                          </div>
                          <p className="text-[11px] leading-snug">{st.visualNotes}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {menuTab === 'landmarks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {HEARTLANDS_LANDMARKS.map(lm => {
                    const st = worldState.landmarks[lm.id];
                    const stMeta = getLandmarkStageMeta(st.stage);
                    return (
                      <div
                        key={lm.id}
                        className="p-4 rounded-xl bg-[#161124] border border-[#C5A15A]/30 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-['Cinzel'] font-black text-sm text-[#F5EFE6]">
                              {lm.name}
                            </h4>
                            <p className="text-[11px] text-[#C5A15A]">{lm.subtitle}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[#251638] border border-[#C5A15A]/40 font-mono text-[11px] font-bold text-[#C5A15A]">
                            {stMeta.label} · {st.restorationPercent}%
                          </span>
                        </div>

                        <p className="text-xs text-[#D9D2C5]/80">{lm.stageSummaries[st.stage]}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap gap-1">
                            {LANDMARK_RESTORATION_STAGES.map(stageOpt => (
                              <button
                                key={stageOpt.id}
                                type="button"
                                onClick={() =>
                                  void setWorldLandmarkStage(
                                    lm.id,
                                    stageOpt.id,
                                    stageOpt.defaultPercent
                                  )
                                }
                                className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                                  st.stage === stageOpt.id
                                    ? 'bg-[#C5A15A] text-[#090710] border-[#ffe3a3]'
                                    : 'bg-[#0f0b1a] text-[#D9D2C5]/75 border-[#C5A15A]/20 hover:border-[#C5A15A]/50'
                                }`}
                              >
                                {stageOpt.label.split('. ')[1]}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleFastTravel(
                                lm.coordinates.x,
                                lm.id === 'ancient_castle'
                                  ? lm.coordinates.z + 17
                                  : lm.id === 'ancient_bridge'
                                  ? lm.coordinates.z + 14.5
                                  : lm.coordinates.z + 9.5
                              )
                            }
                            className="px-3 py-1 rounded-lg bg-[#251638] hover:bg-[#382154] border border-[#C5A15A]/45 text-[11px] font-bold text-[#C5A15A] flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            Approach
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
