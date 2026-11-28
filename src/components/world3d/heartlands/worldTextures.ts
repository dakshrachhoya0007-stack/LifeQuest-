import * as THREE from 'three';

export interface WorldTextureSet {
  colorMap: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finishTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  srgb = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createMeadowGroundTextures(): WorldTextureSet {
  const size = 256;
  const [cCanvas, cCtx] = makeCanvas(size, size);
  const [bCanvas, bCtx] = makeCanvas(size, size);

  cCtx.fillStyle = '#3f5a38';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % size;
    const y = (i * 137) % size;
    const pick = i % 5;
    cCtx.fillStyle =
      pick === 0
        ? 'rgba(42, 68, 36, 0.35)'
        : pick === 1
        ? 'rgba(84, 112, 58, 0.3)'
        : pick === 2
        ? 'rgba(122, 108, 68, 0.16)'
        : 'rgba(65, 92, 48, 0.28)';
    cCtx.fillRect(x, y, 2 + (i % 3), 2 + ((i + 1) % 3));

    bCtx.fillStyle = i % 2 === 0 ? 'rgba(210,210,210,0.2)' : 'rgba(60,60,60,0.22)';
    bCtx.fillRect(x, y, 2, 2);
  }

  const colorMap = finishTexture(cCanvas, 26, 26, true);
  const bumpMap = finishTexture(bCanvas, 26, 26, false);

  return {
    colorMap,
    bumpMap,
    dispose: () => {
      colorMap.dispose();
      bumpMap.dispose();
    },
  };
}

export function createTimberTextures(baseHex = '#4b3423'): WorldTextureSet {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Plank seams & wood grain
  const planks = 6;
  const plankW = size / planks;
  for (let p = 0; p < planks; p++) {
    const x = p * plankW;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,230,190,0.05)';
    ctx.fillRect(x, 0, plankW, size);
    ctx.fillStyle = 'rgba(18, 10, 6, 0.65)';
    ctx.fillRect(x, 0, 2, size);

    for (let g = 0; g < 26; g++) {
      const gx = x + 4 + ((g * 17) % Math.max(8, plankW - 8));
      ctx.strokeStyle = 'rgba(24, 15, 10, 0.26)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + Math.sin(g) * 3, size);
      ctx.stroke();
    }
  }

  const colorMap = finishTexture(canvas, 2, 2, true);
  return {
    colorMap,
    dispose: () => colorMap.dispose(),
  };
}

export function createGoldenBarkTextures(): WorldTextureSet {
  const size = 256;
  const [cCanvas, cCtx] = makeCanvas(size, size);
  const [bCanvas, bCtx] = makeCanvas(size, size);

  cCtx.fillStyle = '#4f3a1d';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#606060';
  bCtx.fillRect(0, 0, size, size);

  // Fluted ancient bark ridges + shimmering gold veins
  for (let i = 0; i < 64; i++) {
    const x = (i * 19) % size;
    const isGoldVein = i % 5 === 0;
    cCtx.strokeStyle = isGoldVein ? 'rgba(232, 185, 92, 0.52)' : 'rgba(28, 18, 10, 0.42)';
    cCtx.lineWidth = isGoldVein ? 2 : 3;
    cCtx.beginPath();
    cCtx.moveTo(x, 0);
    cCtx.bezierCurveTo(x + 8, size * 0.33, x - 9, size * 0.66, x + 2, size);
    cCtx.stroke();

    bCtx.strokeStyle = isGoldVein ? '#e6e6e6' : '#2a2a2a';
    bCtx.lineWidth = 3;
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.bezierCurveTo(x + 8, size * 0.33, x - 9, size * 0.66, x + 2, size);
    bCtx.stroke();
  }

  const colorMap = finishTexture(cCanvas, 2, 3, true);
  const bumpMap = finishTexture(bCanvas, 2, 3, false);

  return {
    colorMap,
    bumpMap,
    dispose: () => {
      colorMap.dispose();
      bumpMap.dispose();
    },
  };
}

export function createWaterRippleTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#245864';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 160; i++) {
    const x = (i * 43) % size;
    const y = (i * 71) % size;
    const w = 18 + (i % 28);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(180, 238, 248, 0.25)' : 'rgba(20, 48, 56, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w * 0.5, y - 3, x + w, y);
    ctx.stroke();
  }

  return finishTexture(canvas, 8, 2, true);
}
