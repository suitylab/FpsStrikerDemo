import * as THREE from 'three';

/**
 * TextureFactory — Procedural Canvas Texture Generator
 *
 * Generates all textures for the Town Street map using CanvasRenderingContext2D.
 * All textures are deterministic (seeded PRNG) and require no external assets.
 */

/** Default texture size (pixels) for performance. */
const TEXTURE_SIZE = 256;
/** Sky texture size (pixels) for higher fidelity. */
const SKY_SIZE = 512;
/** Anisotropy level for sharper textures at glancing angles. */
const ANISOTROPY = 4;

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces a deterministic sequence of floats in [0, 1).
 *
 * @param seed - Initial seed value
 * @returns A function that returns the next random float in [0, 1)
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a canvas of the given size and returns its 2D context.
 *
 * @param size - Canvas width and height in pixels
 * @returns The canvas 2D context
 */
function createCanvas(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }
  return ctx;
}

/**
 * Applies random noise pixels to the canvas.
 *
 * @param ctx - Canvas 2D context
 * @param rng - Random number generator function
 * @param size - Canvas size (width/height)
 * @param density - Number of noise pixels to draw
 * @param alpha - Maximum alpha for noise pixels
 */
function applyNoise(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  size: number,
  density: number,
  alpha: number
): void {
  for (let i = 0; i < density; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const brightness = Math.floor(rng() * 40) - 20; // -20 to +20
    const a = rng() * alpha;

    ctx.fillStyle = `rgba(${128 + brightness}, ${128 + brightness}, ${128 + brightness}, ${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

/**
 * Draws thin dark cracks on the canvas using random walk.
 *
 * @param ctx - Canvas 2D context
 * @param rng - Random number generator function
 * @param size - Canvas size (width/height)
 * @param count - Number of cracks to draw
 */
function applyCracks(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  size: number,
  count: number
): void {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;

  for (let i = 0; i < count; i++) {
    let x = Math.floor(rng() * size);
    let y = Math.floor(rng() * size);
    const steps = 5 + Math.floor(rng() * 10);

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let s = 0; s < steps; s++) {
      // Random walk direction
      const angle = rng() * Math.PI * 2;
      const dist = 2 + rng() * 4;
      x += Math.cos(angle) * dist;
      y += Math.sin(angle) * dist;

      // Keep within bounds
      x = Math.max(0, Math.min(size, x));
      y = Math.max(0, Math.min(size, y));

      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }
}

/**
 * Draws semi-transparent stain blobs on the canvas.
 *
 * @param ctx - Canvas 2D context
 * @param rng - Random number generator function
 * @param size - Canvas size (width/height)
 * @param count - Number of stains to draw
 * @param color - RGB color string for the stain (e.g., '50, 50, 50')
 */
function applyStains(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  size: number,
  count: number,
  color: string
): void {
  for (let i = 0; i < count; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 10 + rng() * 30;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color}, ${0.08 + rng() * 0.08})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

/**
 * Creates a dark gray asphalt texture with noise, cracks, and color variation.
 * Used for the central road.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(1337);

  // Base asphalt color
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, size, size);

  // Subtle color variation patches
  for (let i = 0; i < 30; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 20 + rng() * 40;
    const brightness = Math.floor(rng() * 30) - 15;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${58 + brightness}, ${58 + brightness}, ${58 + brightness}, 0.2)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 3000, 0.15);

  // Cracks
  applyCracks(ctx, rng, size, 8);

  // Stains (oil spots)
  applyStains(ctx, rng, size, 5, '20, 20, 20');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a light gray concrete texture with noise, stains, and subtle cracks.
 * Used for sidewalks and barriers.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createConcreteTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(2468);

  // Base concrete color
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);

  // Subtle color variation
  for (let i = 0; i < 25; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 15 + rng() * 35;
    const brightness = Math.floor(rng() * 20) - 10;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${138 + brightness}, ${138 + brightness}, ${138 + brightness}, 0.15)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 2500, 0.1);

  // Cracks
  applyCracks(ctx, rng, size, 5);

  // Stains (dirt/water marks)
  applyStains(ctx, rng, size, 4, '60, 60, 60');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a red-brown brick pattern with mortar lines and per-brick color variation.
 * Used for building walls.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createBrickTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(3579);

  const brickWidth = 32;
  const brickHeight = 16;
  const mortarSize = 2;

  // Mortar background
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, size, size);

  // Draw bricks
  for (let row = 0; row < size / brickHeight; row++) {
    const offset = row % 2 === 0 ? 0 : brickWidth / 2;

    for (let col = -1; col < size / brickWidth + 1; col++) {
      const x = col * brickWidth + offset;
      const y = row * brickHeight;

      // Per-brick color variation
      const r = 120 + Math.floor(rng() * 50);
      const g = 50 + Math.floor(rng() * 30);
      const b = 40 + Math.floor(rng() * 20);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + mortarSize / 2, y + mortarSize / 2, brickWidth - mortarSize, brickHeight - mortarSize);

      // Subtle brick highlight/shadow
      const highlight = rng() > 0.5;
      ctx.fillStyle = highlight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(x + mortarSize / 2, y + mortarSize / 2, brickWidth - mortarSize, brickHeight / 2);
    }
  }

  // Noise
  applyNoise(ctx, rng, size, 1500, 0.08);

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a brushed metal texture with horizontal grain lines, rust spots, and subtle gradient.
 * Used for cars, dumpsters, and lamp posts.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createMetalTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(4680);

  // Base metal color
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, size, size);

  // Horizontal gradient (subtle)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Brushed grain lines
  for (let i = 0; i < 200; i++) {
    const y = rng() * size;
    const x = rng() * size;
    const length = 20 + rng() * 60;
    const brightness = Math.floor(rng() * 30) - 15;

    ctx.strokeStyle = `rgba(${106 + brightness}, ${106 + brightness}, ${106 + brightness}, 0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
  }

  // Rust spots
  for (let i = 0; i < 8; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 3 + rng() * 10;

    const rustGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    rustGradient.addColorStop(0, `rgba(139, 69, 19, ${0.2 + rng() * 0.3})`);
    rustGradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
    ctx.fillStyle = rustGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a dark blue window texture with sky reflection gradient and mullion grid.
 * Used for building windows.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createWindowTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(5791);

  const paneSize = 32;
  const mullionSize = 3;

  // Dark building wall background
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, size, size);

  // Draw window panes
  for (let row = 0; row < size / paneSize; row++) {
    for (let col = 0; col < size / paneSize; col++) {
      const x = col * paneSize;
      const y = row * paneSize;

      // Sky reflection gradient (darker at top, lighter at bottom)
      const gradient = ctx.createLinearGradient(x, y, x, y + paneSize);
      gradient.addColorStop(0, '#1a2a4a');
      gradient.addColorStop(0.5, '#2a4a6a');
      gradient.addColorStop(1, '#4a7a9a');

      ctx.fillStyle = gradient;
      ctx.fillRect(x + mullionSize / 2, y + mullionSize / 2, paneSize - mullionSize, paneSize - mullionSize);

      // Subtle reflection streak
      if (rng() > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x + mullionSize / 2 + 2, y + mullionSize / 2 + 2, paneSize - mullionSize - 4, 4);
      }
    }
  }

  // Mullion grid (drawn over panes)
  ctx.fillStyle = '#3a3a3a';
  for (let i = 0; i <= size; i += paneSize) {
    ctx.fillRect(i - mullionSize / 2, 0, mullionSize, size);
    ctx.fillRect(0, i - mullionSize / 2, size, mullionSize);
  }

  // Noise
  applyNoise(ctx, rng, size, 800, 0.05);

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a light gray concrete paver texture with grid lines and noise.
 * Used for sidewalks.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createSidewalkTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(6802);

  const paverSize = 32;
  const gapSize = 2;

  // Base concrete color
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, size, size);

  // Draw pavers
  for (let row = 0; row < size / paverSize; row++) {
    for (let col = 0; col < size / paverSize; col++) {
      const x = col * paverSize;
      const y = row * paverSize;

      // Per-paver color variation
      const brightness = Math.floor(rng() * 20) - 10;
      ctx.fillStyle = `rgb(${154 + brightness}, ${154 + brightness}, ${154 + brightness})`;
      ctx.fillRect(x + gapSize / 2, y + gapSize / 2, paverSize - gapSize, paverSize - gapSize);

      // Subtle edge highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(x + gapSize / 2, y + gapSize / 2, paverSize - gapSize, 2);
    }
  }

  // Grid lines (gaps)
  ctx.fillStyle = '#7a7a7a';
  for (let i = 0; i <= size; i += paverSize) {
    ctx.fillRect(i - gapSize / 2, 0, gapSize, size);
    ctx.fillRect(0, i - gapSize / 2, size, gapSize);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  // Stains
  applyStains(ctx, rng, size, 3, '60, 60, 60');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a gradient blue sky texture with a warm sun disc and subtle clouds.
 * Used for the skybox sphere. Does NOT use repeat wrapping.
 *
 * @returns THREE.CanvasTexture with clamp-to-edge wrapping
 */
export function createSkyTexture(): THREE.CanvasTexture {
  const size = SKY_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(7913);

  // Vertical gradient: dark blue at top, lighter at horizon
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#0a2a5a');
  gradient.addColorStop(0.4, '#1a4a8a');
  gradient.addColorStop(0.7, '#3a7aba');
  gradient.addColorStop(1, '#7abada');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Sun disc (warm glow)
  const sunX = size * 0.7;
  const sunY = size * 0.3;
  const sunRadius = 30;

  // Outer glow
  const glowGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
  glowGradient.addColorStop(0, 'rgba(255, 220, 150, 0.6)');
  glowGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.3)');
  glowGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(sunX - sunRadius * 3, sunY - sunRadius * 3, sunRadius * 6, sunRadius * 6);

  // Sun core
  const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
  sunGradient.addColorStop(0, '#fff8e0');
  sunGradient.addColorStop(0.7, '#ffe080');
  sunGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Clouds (soft ellipses)
  for (let i = 0; i < 8; i++) {
    const cx = rng() * size;
    const cy = size * 0.2 + rng() * size * 0.5;
    const cw = 40 + rng() * 80;
    const ch = 15 + rng() * 25;

    const cloudGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw);
    cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 + rng() * 0.15})`);
    cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = cloudGradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a dark gray/black roof material with subtle noise.
 * Used for building roofs.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createRoofTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(9024);

  // Base roof color
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, size, size);

  // Subtle horizontal bands (shingle rows)
  for (let y = 0; y < size; y += 16) {
    const brightness = Math.floor(rng() * 10) - 5;
    ctx.fillStyle = `rgba(${42 + brightness}, ${42 + brightness}, ${42 + brightness}, 0.3)`;
    ctx.fillRect(0, y, size, 16);
  }

  // Noise
  applyNoise(ctx, rng, size, 2500, 0.15);

  // Stains (water marks)
  applyStains(ctx, rng, size, 3, '20, 20, 20');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a brownish dirt/ground texture with noise.
 * Used for areas outside the road/sidewalk.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createDirtTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(10137);

  // Base dirt color
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(0, 0, size, size);

  // Color variation patches
  for (let i = 0; i < 40; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 10 + rng() * 30;
    const brightness = Math.floor(rng() * 20) - 10;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${90 + brightness}, ${74 + brightness}, ${58 + brightness}, 0.2)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 3000, 0.15);

  // Small pebbles
  for (let i = 0; i < 30; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 2;
    const brightness = Math.floor(rng() * 30) - 15;

    ctx.fillStyle = `rgb(${90 + brightness}, ${74 + brightness}, ${58 + brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a gray concrete curb texture.
 * Used for road curbs.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createCurbTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(11248);

  // Base curb color
  ctx.fillStyle = '#7a7a7a';
  ctx.fillRect(0, 0, size, size);

  // Horizontal striations (from concrete form)
  for (let y = 0; y < size; y += 8) {
    const brightness = Math.floor(rng() * 15) - 7;
    ctx.fillStyle = `rgba(${122 + brightness}, ${122 + brightness}, ${122 + brightness}, 0.2)`;
    ctx.fillRect(0, y, size, 8);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  // Cracks
  applyCracks(ctx, rng, size, 4);

  // Stains
  applyStains(ctx, rng, size, 3, '50, 50, 50');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a tan/light-brown sand texture with ripples, noise, and pebbles.
 * Used for the Desert Ruins map ground.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createSandTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(12345);

  // Base sand color
  ctx.fillStyle = '#d4b896';
  ctx.fillRect(0, 0, size, size);

  // Horizontal ripple bands (subtle darker/lighter stripes)
  for (let y = 0; y < size; y += 8) {
    const brightness = Math.floor(rng() * 20) - 10;
    ctx.fillStyle = `rgba(${212 + brightness}, ${184 + brightness}, ${150 + brightness}, 0.15)`;
    ctx.fillRect(0, y, size, 8);
  }

  // Color variation patches
  for (let i = 0; i < 30; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 15 + rng() * 35;
    const brightness = Math.floor(rng() * 20) - 10;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${212 + brightness}, ${184 + brightness}, ${150 + brightness}, 0.15)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 3000, 0.12);

  // Small pebble dots
  for (let i = 0; i < 40; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 2;
    const brightness = Math.floor(rng() * 30) - 15;

    ctx.fillStyle = `rgb(${180 + brightness}, ${150 + brightness}, ${110 + brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a weathered stone texture for ruined walls.
 * Used for the Desert Ruins map walls and pillars.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createStoneTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(23456);

  // Base stone color
  ctx.fillStyle = '#9a8f7a';
  ctx.fillRect(0, 0, size, size);

  // Large irregular color patches
  for (let i = 0; i < 20; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 20 + rng() * 50;
    const brightness = Math.floor(rng() * 25) - 12;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${154 + brightness}, ${143 + brightness}, ${122 + brightness}, 0.25)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 2500, 0.15);

  // Cracks
  applyCracks(ctx, rng, size, 10);

  // Stains (weathering)
  applyStains(ctx, rng, size, 6, '60, 50, 40');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a corrugated metal texture for shipping containers.
 * Used for the Cargo Dock map containers.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createCorrugatedMetalTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(34567);

  // Base metal color
  ctx.fillStyle = '#7a8a9a';
  ctx.fillRect(0, 0, size, size);

  // Vertical corrugation ridges (alternating lighter/darker stripes)
  const ridgeWidth = 16;
  for (let x = 0; x < size; x += ridgeWidth) {
    const brightness = rng() > 0.5 ? 20 : -20;
    ctx.fillStyle = `rgba(${122 + brightness}, ${138 + brightness}, ${154 + brightness}, 0.3)`;
    ctx.fillRect(x, 0, ridgeWidth / 2, size);
  }

  // Horizontal brushed grain
  for (let i = 0; i < 150; i++) {
    const y = rng() * size;
    const x = rng() * size;
    const length = 20 + rng() * 60;
    const brightness = Math.floor(rng() * 20) - 10;

    ctx.strokeStyle = `rgba(${122 + brightness}, ${138 + brightness}, ${154 + brightness}, 0.1)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
  }

  // Rust spots
  for (let i = 0; i < 10; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 3 + rng() * 12;

    const rustGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    rustGradient.addColorStop(0, `rgba(139, 69, 19, ${0.2 + rng() * 0.3})`);
    rustGradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
    ctx.fillStyle = rustGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a wooden plank texture for crates.
 * Used for the Cargo Dock map crates and pallets.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createWoodTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(45678);

  // Base wood color
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(0, 0, size, size);

  // Horizontal plank lines with per-plank color variation
  const plankHeight = 32;
  const gapSize = 2;

  for (let row = 0; row < size / plankHeight; row++) {
    const y = row * plankHeight;
    const brightness = Math.floor(rng() * 20) - 10;

    // Per-plank base color
    ctx.fillStyle = `rgb(${138 + brightness}, ${106 + brightness}, ${58 + brightness})`;
    ctx.fillRect(0, y + gapSize / 2, size, plankHeight - gapSize);

    // Wood grain streaks (horizontal lines within each plank)
    for (let i = 0; i < 8; i++) {
      const grainY = y + gapSize / 2 + rng() * (plankHeight - gapSize);
      const grainX = rng() * size;
      const grainLength = 30 + rng() * 80;
      const grainBrightness = Math.floor(rng() * 20) - 10;

      ctx.strokeStyle = `rgba(${138 + grainBrightness}, ${106 + grainBrightness}, ${58 + grainBrightness}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(grainX, grainY);
      ctx.lineTo(grainX + grainLength, grainY);
      ctx.stroke();
    }
  }

  // Plank gap lines
  ctx.fillStyle = '#5a4a2a';
  for (let y = 0; y <= size; y += plankHeight) {
    ctx.fillRect(0, y - gapSize / 2, size, gapSize);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  // Stains (dirt marks)
  applyStains(ctx, rng, size, 4, '60, 40, 20');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * Creates a shipping container texture with solid color base and corrugated ridges.
 * Used for the Cargo Dock map containers.
 *
 * @returns THREE.CanvasTexture with repeat wrapping
 */
export function createContainerTexture(): THREE.CanvasTexture {
  const size = TEXTURE_SIZE;
  const ctx = createCanvas(size);
  const rng = mulberry32(56789);

  // Base container color (blue)
  ctx.fillStyle = '#4a6a8a';
  ctx.fillRect(0, 0, size, size);

  // Vertical corrugation ridges
  const ridgeWidth = 16;
  for (let x = 0; x < size; x += ridgeWidth) {
    const brightness = rng() > 0.5 ? 15 : -15;
    ctx.fillStyle = `rgba(${74 + brightness}, ${106 + brightness}, ${138 + brightness}, 0.25)`;
    ctx.fillRect(x, 0, ridgeWidth / 2, size);
  }

  // Rust spots
  for (let i = 0; i < 12; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 3 + rng() * 12;

    const rustGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    rustGradient.addColorStop(0, `rgba(139, 69, 19, ${0.2 + rng() * 0.3})`);
    rustGradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
    ctx.fillStyle = rustGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Noise
  applyNoise(ctx, rng, size, 2000, 0.1);

  // Stains (weathering)
  applyStains(ctx, rng, size, 4, '30, 40, 50');

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

/**
 * TextureFactory — Namespace object exposing all texture generation functions.
 */
export const TextureFactory = {
  createAsphaltTexture,
  createConcreteTexture,
  createBrickTexture,
  createMetalTexture,
  createWindowTexture,
  createSidewalkTexture,
  createSkyTexture,
  createRoofTexture,
  createDirtTexture,
  createCurbTexture,
  createSandTexture,
  createStoneTexture,
  createCorrugatedMetalTexture,
  createWoodTexture,
  createContainerTexture,
};

export default TextureFactory;