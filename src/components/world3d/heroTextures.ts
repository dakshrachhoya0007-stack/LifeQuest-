import * as THREE from 'three';

export interface ProceduralTextureSet {
  colorMap: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  options: { srgb?: boolean; repeatX?: number; repeatY?: number } = {}
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(options.repeatX ?? 1, options.repeatY ?? 1);
  if (options.srgb) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Brushed & battle-scarred steel albedo + roughness/bump pair.
 */
export function createScarredSteelTextures(
  baseHex = '#6c7484',
  darkHex = '#383d49'
): ProceduralTextureSet {
  const size = 256;
  const [cCanvas, cCtx] = makeCanvas(size, size);
  const [rCanvas, rCtx] = makeCanvas(size, size);

  cCtx.fillStyle = baseHex;
  cCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#5c5c5c';
  rCtx.fillRect(0, 0, size, size);

  // Subtle brushed metal grain
  for (let i = 0; i < 420; i++) {
    const y = (i * 37) % size;
    const len = 30 + ((i * 19) % 140);
    const x = (i * 53) % size;
    cCtx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(10,12,18,0.12)';
    cCtx.lineWidth = 1;
    cCtx.beginPath();
    cCtx.moveTo(x, y);
    cCtx.lineTo(x + len, y + ((i % 3) - 1) * 1.5);
    cCtx.stroke();
  }

  // Battle nicks and diagonal scratches
  for (let i = 0; i < 36; i++) {
    const sx = (i * 71) % size;
    const sy = (i * 43) % size;
    const dx = 18 + ((i * 29) % 45);
    const dy = (i % 2 === 0 ? 1 : -1) * (10 + (i % 20));
    cCtx.strokeStyle = darkHex;
    cCtx.lineWidth = 1.6;
    cCtx.beginPath();
    cCtx.moveTo(sx, sy);
    cCtx.lineTo(sx + dx, sy + dy);
    cCtx.stroke();

    cCtx.strokeStyle = 'rgba(225,232,245,0.22)';
    cCtx.lineWidth = 0.8;
    cCtx.beginPath();
    cCtx.moveTo(sx, sy + 1);
    cCtx.lineTo(sx + dx, sy + dy + 1);
    cCtx.stroke();

    rCtx.strokeStyle = '#c4c4c4';
    rCtx.lineWidth = 2;
    rCtx.beginPath();
    rCtx.moveTo(sx, sy);
    rCtx.lineTo(sx + dx, sy + dy);
    rCtx.stroke();
  }

  const colorMap = finalizeTexture(cCanvas, { srgb: true });
  const roughnessMap = finalizeTexture(rCanvas);

  return {
    colorMap,
    roughnessMap,
    bumpMap: roughnessMap,
    dispose: () => {
      colorMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Heavy woven medieval fabric / tattered cape texture.
 */
export function createClothWeaveTexture(
  primaryHex = '#0A1930',
  shadowHex = '#061225',
  trimHex = '#F59E0B'
): ProceduralTextureSet {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 6) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, 0, 2, size);
  }

  // Subtle grime & tattered hem shading
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(0,0,0,0.15)');
  grad.addColorStop(0.65, 'rgba(0,0,0,0)');
  grad.addColorStop(1, shadowHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Thin glowing trim border thread
  ctx.fillStyle = trimHex;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 10, size, 3);
  ctx.fillRect(0, size - 16, size, 3);
  ctx.globalAlpha = 1;

  const colorMap = finalizeTexture(canvas, { srgb: true });
  return {
    colorMap,
    dispose: () => colorMap.dispose(),
  };
}

/**
 * Stitched dark leather texture (Assassin / Ranger armor).
 */
export function createLeatherTexture(baseHex = '#141420', grainHex = '#090910'): ProceduralTextureSet {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 350; i++) {
    const x = (i * 47) % size;
    const y = (i * 83) % size;
    const r = 1.5 + (i % 3);
    ctx.fillStyle = i % 3 === 0 ? grainHex : 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cross-stitched seam
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.setLineDash([]);

  const colorMap = finalizeTexture(canvas, { srgb: true });
  return {
    colorMap,
    dispose: () => colorMap.dispose(),
  };
}

/**
 * Arcane embroidered tunic & rune trim texture.
 */
export function createArcaneClothTexture(baseHex = '#0A1930', accentHex = '#1677FF'): ProceduralTextureSet {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle woven diamond lattice
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1.2;
  for (let x = -size; x < size * 2; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + size, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Gold embroidered lower hem rune trim
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, size - 26, size, 4);
  ctx.fillRect(0, size - 12, size, 2);

  const colorMap = finalizeTexture(canvas, { srgb: true });
  return {
    colorMap,
    dispose: () => colorMap.dispose(),
  };
}

/**
 * Weathered ashlar & cobblestone courtyard masonry textures.
 */
export function createCastleStoneTextures(
  repeatX = 4,
  repeatY = 4
): ProceduralTextureSet {
  const size = 256;
  const [cCanvas, cCtx] = makeCanvas(size, size);
  const [bCanvas, bCtx] = makeCanvas(size, size);

  cCtx.fillStyle = '#141420';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#383838';
  bCtx.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const shade = 28 + ((r * 13 + c * 29) % 18);
      cCtx.fillStyle = `rgb(${shade}, ${shade + 10}, ${shade + 24})`;
      cCtx.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

      bCtx.fillStyle = `rgb(${155 + ((r + c) % 4) * 14}, ${155 + ((r + c) % 4) * 14}, ${155 + ((r + c) % 4) * 14})`;
      bCtx.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

      // Subtle stone speckling & cool patina
      for (let s = 0; s < 14; s++) {
        const sx = x + 6 + ((s * 23 + r * 11) % Math.max(8, colW - 12));
        const sy = y + 6 + ((s * 17 + c * 19) % Math.max(8, rowH - 12));
        cCtx.fillStyle =
          s % 7 === 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 168, 199, 0.08)';
        cCtx.fillRect(sx, sy, 3, 2);
      }
    }
  }

  const colorMap = finalizeTexture(cCanvas, { srgb: true, repeatX, repeatY });
  const bumpMap = finalizeTexture(bCanvas, { repeatX, repeatY });

  return {
    colorMap,
    bumpMap,
    roughnessMap: bumpMap,
    dispose: () => {
      colorMap.dispose();
      bumpMap.dispose();
    },
  };
}
