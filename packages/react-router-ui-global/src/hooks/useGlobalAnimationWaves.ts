import * as React from 'react';
import { buildSoundArcs } from '../utils/build-sound-arcs';

/**
 * Velocity-reactive "sound wave" arcs — an animated, canvas-based backdrop.
 *
 * Stacked flowing arcs sweep across the canvas (`n`). A travelling sine wave
 * ripples along each one; its amplitude swells with how fast the pointer is
 * moving (fast = an oscilloscope going loud) and rings back down to a calm
 * idle when the pointer slows. Ends are pinned so the arcs stay anchored.
 *
 * SSR-safe (all DOM work runs client-side in an effect) and degrades
 * gracefully: `prefers-reduced-motion: reduce` renders a single static frame of
 * the resting arcs, and the animation pauses while the canvas is off-screen.
 */
const TWO_PI = Math.PI * 2;

/**
 * Tunables for the sound-wave arcs. Every field is optional; omitting one
 * falls back to {@link DEFAULT_GLOBAL_ANIMATION_WAVES}, so passing `{}`
 * reproduces the default look exactly.
 */
export interface GlobalAnimationWavesConfig {
  /** Attack rate as energy rises toward a faster pointer (snappy). */
  readonly attack?: number;
  /** Gradient end stop as an "r, g, b" triple. */
  readonly colorEnd?: string;
  /** Gradient mid stop as an "r, g, b" triple. */
  readonly colorMid?: string;
  /** Gradient start stop as an "r, g, b" triple. */
  readonly colorStart?: string;
  /** Right-side fan, -1..1. 0 packs onto the lead path; ±1 span the edge. */
  readonly distributionEnd?: number;
  /** Left-side fan, -1..1. 0 packs onto the lead path; ±1 span the edge. */
  readonly distributionStart?: number;
  /** Escape hatch to disable the effect (e.g. in tests). Defaults to on. */
  readonly enabled?: boolean;
  /** Extra amplitude (px) at full pointer energy. */
  readonly gain?: number;
  /** Resting ripple amplitude (px) so the arcs breathe even when idle. */
  readonly idleAmplitude?: number;
  /** Stroke width in px. */
  readonly lineWidth?: number;
  /** Stacked wave count. */
  readonly n?: number;
  /** Jitter amplitude in normalised space applied to Bézier handles. */
  readonly noise?: number;
  /** Release rate as energy decays after the pointer slows (rings out). */
  readonly release?: number;
  /** Points sampled along each arc when drawing. */
  readonly samples?: number;
  /** PRNG seed so the jitter is stable across reloads. */
  readonly seed?: number;
  /** Constant travelling-phase speed (radians per ms) — the wave always moves. */
  readonly speed?: number;
  /** How much full pointer energy multiplies the travelling speed. */
  readonly speedGain?: number;
  /** Pointer speed (px/ms) that maps to full energy. */
  readonly velocityRef?: number;
  /** Number of sine cycles along the arc length. */
  readonly waveCycles?: number;
}

/**
 * Default sound-wave tunables. Colours are the brand → signal → paper gradient
 * carried over from the original static arc SVG.
 */
export const DEFAULT_GLOBAL_ANIMATION_WAVES = {
  attack: 0.24,
  colorEnd: '243, 240, 234',
  colorMid: '30, 120, 104',
  colorStart: '229, 20, 20',
  distributionEnd: 0.28,
  distributionStart: 0.22,
  gain: 42,
  idleAmplitude: 4,
  lineWidth: 1.5,
  n: 21,
  noise: 0.022,
  release: 0.05,
  samples: 96,
  seed: 0x51ed,
  speed: 0.004,
  speedGain: 6,
  velocityRef: 2.2,
  waveCycles: 3.2,
} as const;

const cubicAt = (
  t: number,
  p: ReadonlyArray<ReadonlyArray<number>>,
  axis: 0 | 1,
): number => {
  const mt = 1 - t;

  return (
    mt * mt * mt * p[0][axis] +
    3 * mt * mt * t * p[1][axis] +
    3 * mt * t * t * p[2][axis] +
    t * t * t * p[3][axis]
  );
};

const cubicDerivativeAt = (
  t: number,
  p: ReadonlyArray<ReadonlyArray<number>>,
  axis: 0 | 1,
): number => {
  const mt = 1 - t;

  return (
    3 * mt * mt * (p[1][axis] - p[0][axis]) +
    6 * mt * t * (p[2][axis] - p[1][axis]) +
    3 * t * t * (p[3][axis] - p[2][axis])
  );
};

export const useGlobalAnimationWaves = <
  T extends HTMLCanvasElement = HTMLCanvasElement,
>(
  config: GlobalAnimationWavesConfig = {},
): React.RefObject<T | null> => {
  const canvasRef = React.useRef<T>(null);

  const attack = config.attack ?? DEFAULT_GLOBAL_ANIMATION_WAVES.attack;
  const colorEnd = config.colorEnd ?? DEFAULT_GLOBAL_ANIMATION_WAVES.colorEnd;
  const colorMid = config.colorMid ?? DEFAULT_GLOBAL_ANIMATION_WAVES.colorMid;
  const colorStart =
    config.colorStart ?? DEFAULT_GLOBAL_ANIMATION_WAVES.colorStart;
  const distributionEnd =
    config.distributionEnd ?? DEFAULT_GLOBAL_ANIMATION_WAVES.distributionEnd;
  const distributionStart =
    config.distributionStart ??
    DEFAULT_GLOBAL_ANIMATION_WAVES.distributionStart;
  const enabled = config.enabled ?? true;
  const gain = config.gain ?? DEFAULT_GLOBAL_ANIMATION_WAVES.gain;
  const idleAmplitude =
    config.idleAmplitude ?? DEFAULT_GLOBAL_ANIMATION_WAVES.idleAmplitude;
  const lineWidth =
    config.lineWidth ?? DEFAULT_GLOBAL_ANIMATION_WAVES.lineWidth;
  const n = config.n ?? DEFAULT_GLOBAL_ANIMATION_WAVES.n;
  const noise = config.noise ?? DEFAULT_GLOBAL_ANIMATION_WAVES.noise;
  const release = config.release ?? DEFAULT_GLOBAL_ANIMATION_WAVES.release;
  const samples = config.samples ?? DEFAULT_GLOBAL_ANIMATION_WAVES.samples;
  const seed = config.seed ?? DEFAULT_GLOBAL_ANIMATION_WAVES.seed;
  const speed = config.speed ?? DEFAULT_GLOBAL_ANIMATION_WAVES.speed;
  const speedGain =
    config.speedGain ?? DEFAULT_GLOBAL_ANIMATION_WAVES.speedGain;
  const velocityRef =
    config.velocityRef ?? DEFAULT_GLOBAL_ANIMATION_WAVES.velocityRef;
  const waveCycles =
    config.waveCycles ?? DEFAULT_GLOBAL_ANIMATION_WAVES.waveCycles;

  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !enabled) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const ctx = context;
    const arcs = buildSoundArcs({
      distributionEnd,
      distributionStart,
      n,
      noise,
      seed,
    });

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let gradient: CanvasGradient | null = null;

    // Pointer velocity → energy (0..1), with a fast attack and slow release so
    // the wave "rings" like sound rather than snapping on and off.
    let energy = 0;
    let pointerSpeed = 0;
    let lastMoveTime = 0;
    let lastX = 0;
    let lastY = 0;
    let hasLast = false;

    let frame = 0;
    let running = false;
    let startTime = 0;

    // Accumulated travelling phase — advances every frame at the constant base
    // speed, sped up (not merely amplified) while the pointer is moving fast.
    let phase = 0;
    let lastFrameTime = 0;

    const build = (): void => {
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;

      if (width < 2 || height < 2) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(${colorStart}, 0.85)`);
      gradient.addColorStop(0.55, `rgba(${colorMid}, 0.7)`);
      gradient.addColorStop(1, `rgba(${colorEnd}, 0.2)`);
    };

    const drawArc = (
      arc: (typeof arcs)[number],
      travel: number,
      amplitude: number,
      revealAlpha: number,
    ): void => {
      const amp = amplitude * arc.weight;

      ctx.beginPath();

      for (let i = 0; i < samples; i += 1) {
        const u = i / (samples - 1);

        const bx = cubicAt(u, arc.points, 0) * width;
        const by = cubicAt(u, arc.points, 1) * height;

        // Perpendicular (normal) to the arc tangent, in pixel space.
        const tx = cubicDerivativeAt(u, arc.points, 0) * width;
        const ty = cubicDerivativeAt(u, arc.points, 1) * height;
        const tlen = Math.hypot(tx, ty) || 1;
        const nx = -ty / tlen;
        const ny = tx / tlen;

        // Pin the ends (envelope → 0 at u=0 and u=1) so arcs stay anchored.
        const envelope = Math.sin(Math.PI * u);
        const wave = Math.sin(u * waveCycles * TWO_PI - travel + arc.phase);
        const offset = envelope * wave * amp;

        const x = bx + nx * offset;
        const y = by + ny * offset;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.globalAlpha = arc.opacity * revealAlpha;
      ctx.stroke();
    };

    const render = (travel: number, revealAlpha: number): void => {
      ctx.clearRect(0, 0, width, height);

      if (!gradient) {
        return;
      }

      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = gradient;

      const amplitude = idleAmplitude + energy * gain;

      for (const arc of arcs) {
        drawArc(arc, travel, amplitude, revealAlpha);
      }

      ctx.globalAlpha = 1;
    };

    const updateEnergy = (now: number): void => {
      // The measured pointer speed decays quickly once movement stops.
      const stale = now - lastMoveTime > 90;
      const target = stale ? 0 : Math.min(1, pointerSpeed / velocityRef);
      const rate = target > energy ? attack : release;

      energy += (target - energy) * rate;

      if (energy < 0.0005) {
        energy = 0;
      }
    };

    const loop = (now: number): void => {
      if (!startTime) {
        startTime = now;
        lastFrameTime = now;
      }

      const dt = Math.min(64, now - lastFrameTime);

      lastFrameTime = now;

      const elapsed = now - startTime;
      const revealAlpha = Math.min(1, elapsed / 800);

      updateEnergy(now);

      // Constant baseline travel; the pointer speeds it up rather than only
      // making it louder.
      phase += dt * speed * (1 + energy * speedGain);

      render(phase, revealAlpha);

      frame = requestAnimationFrame(loop);
    };

    const start = (): void => {
      if (running || prefersReducedMotion) {
        return;
      }

      running = true;
      startTime = 0;
      frame = requestAnimationFrame(loop);
    };

    const stop = (): void => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        return;
      }

      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (hasLast) {
        const dt = Math.max(1, now - lastMoveTime);
        const dist = Math.hypot(event.clientX - lastX, event.clientY - lastY);

        pointerSpeed = dist / dt;
      }

      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveTime = now;
      hasLast = true;
    };

    build();

    if (prefersReducedMotion) {
      render(0, 1);

      return;
    }

    render(0, 0);

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => build())
        : null;

    resizeObserver?.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  start();
                } else {
                  stop();
                }
              }
            },
            { threshold: 0 },
          )
        : null;

    if (intersectionObserver) {
      intersectionObserver.observe(canvas);
    } else {
      start();
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [
    attack,
    colorEnd,
    colorMid,
    colorStart,
    distributionEnd,
    distributionStart,
    enabled,
    gain,
    idleAmplitude,
    lineWidth,
    n,
    noise,
    release,
    samples,
    seed,
    speed,
    speedGain,
    velocityRef,
    waveCycles,
  ]);

  return canvasRef;
};
