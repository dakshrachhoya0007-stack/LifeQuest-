import React, { useEffect, useRef } from 'react';

interface AtmosphereParticlesCanvasProps {
  qualityMode: 'rich' | 'eco';
  reducedMotion: boolean;
}

interface MoteParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  isEmber: boolean;
}

export const AtmosphereParticlesCanvas: React.FC<AtmosphereParticlesCanvasProps> = ({
  qualityMode,
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = qualityMode === 'eco' ? 18 : 38;
    const particles: MoteParticle[] = [];

    let width = Math.max(320, canvas.clientWidth);
    let height = Math.max(200, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, qualityMode === 'eco' ? 1 : 1.5);

    const syncSize = () => {
      width = Math.max(320, canvas.clientWidth);
      height = Math.max(200, canvas.clientHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();

    for (let i = 0; i < count; i++) {
      const isEmber = i % 5 === 0;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.35) * (isEmber ? 14 : 9),
        vy: isEmber ? -(14 + Math.random() * 18) : -(4 + Math.random() * 7),
        radius: isEmber ? 1.1 + Math.random() * 1.4 : 1.2 + Math.random() * 2.0,
        alpha: isEmber ? 0.45 + Math.random() * 0.35 : 0.16 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        isEmber,
      });
    }

    let isVisible = true;
    let isDocVisible = !document.hidden;
    let isDisposed = false;
    let rafId = 0;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      if (isDisposed || !isVisible || !isDocVisible) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += (p.vx + Math.sin(now * 0.0008 + p.phase) * 6) * dt;
        p.y += p.vy * dt;

        if (p.y < -12) {
          p.y = height + 8;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 8;
        if (p.x > width + 12) p.x = -8;

        const flicker = 0.72 + 0.28 * Math.sin(now * 0.003 + p.phase);
        const a = p.alpha * flicker;

        if (p.isEmber) {
          ctx.fillStyle = `rgba(255, 217, 120, ${a.toFixed(3)})`;
        } else if (i % 3 === 0) {
          ctx.fillStyle = `rgba(0, 217, 255, ${(a * 0.9).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(22, 119, 255, ${a.toFixed(3)})`;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    const startLoop = () => {
      if (!isDisposed && isVisible && isDocVisible) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const ro = new ResizeObserver(() => syncSize());
    ro.observe(canvas);

    const io = new IntersectionObserver(
      entries => {
        const next = Boolean(entries[0]?.isIntersecting);
        if (next !== isVisible) {
          isVisible = next;
          if (next) startLoop();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      isDocVisible = !document.hidden;
      if (isDocVisible) startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    startLoop();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [qualityMode, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
};
