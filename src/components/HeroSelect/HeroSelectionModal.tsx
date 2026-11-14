import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PlayableHeroId } from '../../types/game';
import { PLAYABLE_HEROES, RPG_ATTRIBUTE_META } from '../../data/heroesData';
import { buildHero3DModel, Hero3DInstance } from '../world3d/heroes3d';
import { probeWebGLCapabilities } from '../Dashboard/world3d/AetheriaRelicCanvas';
import { createCastleStoneTextures } from '../world3d/heroTextures';
import {
  Check,
  RotateCcw,
  RotateCw,
  Shield,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';

interface HeroSelectionModalProps {
  isOpen: boolean;
  initialHeroId: PlayableHeroId;
  hasExistingProgress?: boolean;
  onConfirm: (heroId: PlayableHeroId) => Promise<void> | void;
  onClose?: () => void;
}

export const HeroSelectionModal: React.FC<HeroSelectionModalProps> = ({
  isOpen,
  initialHeroId,
  hasExistingProgress = true,
  onConfirm,
  onClose,
}) => {
  const [focusedHeroId, setFocusedHeroId] = useState<PlayableHeroId>(initialHeroId);
  const [saving, setSaving] = useState(false);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const heroInstanceRef = useRef<Hero3DInstance | null>(null);
  const introTimerRef = useRef<number>(0);
  const targetYawRef = useRef<number>(0);

  const gpuProbe = useMemo(() => probeWebGLCapabilities(), []);
  const focusedHero = useMemo(
    () => PLAYABLE_HEROES.find(h => h.id === focusedHeroId) || PLAYABLE_HEROES[0],
    [focusedHeroId]
  );

  useEffect(() => {
    if (isOpen) {
      setFocusedHeroId(initialHeroId);
    }
  }, [isOpen, initialHeroId]);

  // Swap hero cleanly inside plinth stage + trigger hero intro animation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isOpen) return;

    if (heroInstanceRef.current) {
      scene.remove(heroInstanceRef.current.root);
      heroInstanceRef.current.dispose();
      heroInstanceRef.current = null;
    }

    const nextHero = buildHero3DModel(focusedHeroId);
    scene.add(nextHero.root);
    heroInstanceRef.current = nextHero;
    introTimerRef.current = 0;
    targetYawRef.current = 0;
  }, [focusedHeroId, isOpen]);

  // WebGL 3D Character Selection Pedestal Scene
  useEffect(() => {
    if (!isOpen) return;
    const host = canvasHostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !gpuProbe.isSoftwareGl,
        powerPreference: gpuProbe.isSoftwareGl ? 'low-power' : 'high-performance',
        alpha: false,
      });
    } catch {
      return;
    }

    const maxDpr = gpuProbe.isSoftwareGl ? 1 : Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(maxDpr);
    renderer.setSize(host.clientWidth || 640, host.clientHeight || 540, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !gpuProbe.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0a16);
    scene.fog = new THREE.FogExp2(0x0d0a16, 0.048);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTex.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      38,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      60
    );
    camera.position.set(0.35, 1.55, 3.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.12, 0);
    controls.enableDamping = !gpuProbe.isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.update();

    // Lighting
    scene.add(new THREE.HemisphereLight(0x8c77bf, 0x161120, 1.0));
    const key = new THREE.DirectionalLight(0xffe1b0, 2.45);
    key.position.set(4, 7, 5);
    if (!gpuProbe.isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
    }
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x7c54cc, 1.35);
    rim.position.set(-4.5, 4.0, -4.5);
    scene.add(rim);

    // Stone Dais Pedestal
    const stoneTex = createCastleStoneTextures(3, 3);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x3b3549,
      map: stoneTex.colorMap,
      bumpMap: stoneTex.bumpMap,
      bumpScale: 0.03,
      roughness: 0.84,
      metalness: 0.14,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc5a15a,
      metalness: 0.9,
      roughness: 0.25,
    });

    const plinthTop = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.62, 0.24, 32), plinthMat);
    plinthTop.position.y = -0.12;
    plinthTop.receiveShadow = true;
    scene.add(plinthTop);

    const plinthTrim = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.035, 8, 42), goldMat);
    plinthTrim.rotation.x = Math.PI / 2;
    plinthTrim.position.y = 0.005;
    scene.add(plinthTrim);

    // Subtle gothic columns framing pedestal backdrop
    const colGeom = new THREE.CylinderGeometry(0.24, 0.28, 4.4, 10);
    [-2.4, 2.4].forEach(cx => {
      const col = new THREE.Mesh(colGeom, plinthMat);
      col.position.set(cx, 2.0, -2.5);
      scene.add(col);
    });

    // Initial hero
    const hero = buildHero3DModel(focusedHeroId);
    scene.add(hero.root);
    heroInstanceRef.current = hero;
    introTimerRef.current = 0;

    const resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObs.observe(host);

    let rafId = 0;
    let timeoutId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = () => {
      if (disposed) return;
      if (document.hidden) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;
      introTimerRef.current += dt;

      if (heroInstanceRef.current) {
        heroInstanceRef.current.root.rotation.y = THREE.MathUtils.damp(
          heroInstanceRef.current.root.rotation.y,
          targetYawRef.current,
          8,
          dt
        );
        heroInstanceRef.current.update(dt, elapsed, introTimerRef.current);
      }

      controls.update();
      renderer.render(scene, camera);

      if (gpuProbe.isSoftwareGl) {
        timeoutId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(tick);
        }, 45);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      resizeObs.disconnect();
      controls.dispose();
      if (heroInstanceRef.current) {
        heroInstanceRef.current.dispose();
        heroInstanceRef.current = null;
      }
      stoneTex.dispose();
      plinthTop.geometry.dispose();
      plinthTrim.geometry.dispose();
      colGeom.dispose();
      plinthMat.dispose();
      goldMat.dispose();
      envTex.dispose();
      sceneRef.current = null;
      renderer.dispose();
    };
  }, [isOpen, gpuProbe.isSoftwareGl]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(focusedHeroId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0b0813] text-[#D9D2C5] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="3D Hero Character Selection"
    >
      {/* Top Bar */}
      <header className="px-5 py-3.5 border-b border-[#C5A15A]/20 bg-[#100D19] flex items-center justify-between gap-4 shrink-0">
        <div>
          <span className="text-[10px] font-['Cinzel'] uppercase tracking-widest text-[#C5A15A] block">
            The Fallen Knight · Rise of Aetheria
          </span>
          <h2 className="text-lg sm:text-xl font-black font-['Cinzel'] text-[#D9D2C5]">
            CHOOSE YOUR 3D CHAMPION
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {hasExistingProgress && (
            <span className="hidden md:inline-block text-[11px] text-emerald-300/90 font-medium">
              Switching hero preserves all Level, XP, Gold &amp; Gear progress
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#191329] hover:bg-[#251638] border border-[#C5A15A]/30 text-[#D9D2C5]"
              aria-label="Close hero selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* Left / Center: Live Interactive 3D Hero Stage */}
        <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[460px] bg-[#0d0a16] border-b lg:border-b-0 lg:border-r border-[#C5A15A]/20 flex flex-col">
          <div ref={canvasHostRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

          {/* Solid dark rotation controls (zero backdrop-blur over WebGL) */}
          <div className="p-3 bg-[#100D19]/92 border-t border-[#C5A15A]/20 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#D9D2C5]/75 font-mono">
              Drag model to inspect 360° · Intro: <strong className="text-[#C5A15A]">{focusedHero.introFlourishLabel}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  targetYawRef.current -= Math.PI / 3;
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#1b142d] hover:bg-[#251638] border border-[#C5A15A]/30 text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C5A15A]" />
                Rotate Left
              </button>
              <button
                type="button"
                onClick={() => {
                  targetYawRef.current += Math.PI / 3;
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#1b142d] hover:bg-[#251638] border border-[#C5A15A]/30 text-xs flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#C5A15A]" />
                Rotate Right
              </button>
              <button
                type="button"
                onClick={() => {
                  targetYawRef.current = 0;
                  introTimerRef.current = 0;
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#251638] hover:bg-[#7046A5]/50 border border-[#C5A15A]/35 text-xs text-[#C5A15A] font-semibold"
              >
                Replay Intro
              </button>
            </div>
          </div>
        </div>

        {/* Right: Hero Selector Roster & Dossier */}
        <div className="lg:col-span-5 p-5 sm:p-6 bg-[#100D19] flex flex-col justify-between gap-5 overflow-y-auto">
          <div className="space-y-5">
            {/* 5 Hero Tabs */}
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#C5A15A] font-semibold block mb-2">
                Select Playable Hero (5 Champions)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {PLAYABLE_HEROES.map(hero => {
                  const selected = hero.id === focusedHeroId;
                  return (
                    <button
                      key={hero.id}
                      type="button"
                      onClick={() => setFocusedHeroId(hero.id)}
                      className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#251638] border-[#C5A15A] shadow-lg'
                          : 'bg-[#151024] border-[#C5A15A]/18 hover:border-[#C5A15A]/45'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-['Cinzel'] font-bold text-[#D9D2C5] block truncate">
                          {hero.name}
                        </span>
                        <span className="text-[10px] text-[#C5A15A] block truncate">
                          {hero.archetype}
                        </span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#C5A15A] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Hero Lore, Origin & Loadout */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#161124] border border-[#C5A15A]/25 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-['Cinzel'] font-black text-xl text-[#D9D2C5]">
                    {focusedHero.name}
                  </h3>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A15A] font-bold">
                    {focusedHero.mappedClass} Class
                  </span>
                </div>
                <p className="text-xs text-[#C5A15A] font-medium mt-0.5">
                  {focusedHero.title}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest text-[#D9D2C5]/60 font-semibold block">
                  Origin After The Great Fall
                </span>
                <p className="text-xs text-[#D9D2C5]/90 leading-relaxed">
                  {focusedHero.greatFallOrigin}
                </p>
              </div>

              <p className="text-xs text-[#D9D2C5]/75 leading-relaxed border-t border-[#C5A15A]/15 pt-3">
                {focusedHero.roleSummary}
              </p>

              {/* Starting Equipment & Attribute Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#100D19] border border-[#7046A5]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                    <Swords className="w-3 h-3" /> Starting Gear
                  </span>
                  <ul className="space-y-1">
                    {focusedHero.startingEquipment.map(item => (
                      <li key={item} className="text-[11px] text-[#D9D2C5]/85 flex items-center gap-1.5">
                        <Shield className="w-2.5 h-2.5 text-[#C5A15A] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[#100D19] border border-[#7046A5]/35 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Attribute Focus
                  </span>
                  <div className="space-y-1">
                    {focusedHero.attributeFocus.map(attrKey => {
                      const meta = RPG_ATTRIBUTE_META.find(m => m.key === attrKey);
                      return (
                        <div key={attrKey} className="text-[11px] flex items-center justify-between">
                          <span className="text-[#D9D2C5]/90 font-medium">{meta?.label || attrKey}</span>
                          <span className="font-mono text-[10px] text-[#C5A15A]">{meta?.shortLabel} +Focus</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm CTA */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirm}
              className="flex-1 py-3.5 px-6 rounded-xl bg-[#C5A15A] hover:bg-[#d8b46d] disabled:opacity-60 text-[#100D19] font-['Cinzel'] font-black text-sm tracking-wider shadow-xl transition-colors"
            >
              {saving ? 'SAVING CHAMPION...' : 'CONFIRM HERO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
