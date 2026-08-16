/**
 * Stacked cubic Bézier "sound wave" arcs in normalised space.
 *
 * Geometry fans around a front (lead) stroke. `distributionStart` /
 * `distributionEnd` (-1..1) set how far apart the stack is on the left vs
 * right — 0 packs every arc onto the lead path, 1 spans most of the box,
 * and -1 fans the same distance the other way (past the opposite bound).
 * A seeded PRNG then nudges the handles so copies never look mechanically
 * identical.
 *
 * Internal to `@openthrottle/react-router-ui-global` — consumed by
 * `useGlobalAnimationWaves`; not part of the package's public API.
 */

export interface SoundArc {
  readonly opacity: number;
  readonly phase: number;
  readonly points: CubicPoints;
  readonly weight: number;
}

export interface BuildSoundArcsOptions {
  readonly distributionEnd: number | undefined;
  readonly distributionStart: number | undefined;
  readonly n: number | undefined;
  readonly noise: number | undefined;
  readonly seed: number | undefined;
}

type Point = readonly [number, number];

type CubicPoints = readonly [Point, Point, Point, Point];

/** Lead stroke — lower-left off-screen to upper-right. */
const FRONT: SoundArc = {
  opacity: 0.55,
  phase: 0,
  points: [
    [-0.06, 0.98],
    [0.22, 0.1],
    [0.64, 0.16],
    [1.06, -0.04],
  ],
  weight: 1,
};

/** Farthest stroke of the original 3-arc stack — used for opacity / weight. */
const BACK: SoundArc = {
  opacity: 0.28,
  phase: 2.7,
  points: [
    [-0.06, 1.1],
    [0.34, 0.34],
    [0.76, 0.4],
    [1.06, 0.2],
  ],
  weight: 4.64,
};

const DEFAULT_DISTRIBUTION_END = 0.28;
const DEFAULT_DISTRIBUTION_START = 0.22;
const DEFAULT_N = 3;
const DEFAULT_NOISE = 0.022;
const DEFAULT_SEED = 0x51ed;

/**
 * Full-span Y coverage at |distribution| = 1, first-to-last. Sized so the
 * ribbon can eat most of the box when cranked up. Negative values use the
 * same span in the opposite direction.
 */
const SPAN_START = 1;
const SPAN_END = 1;

/**
 * Slight X drift on the handles so a wide stack still reads as a sweep.
 */
const HANDLE_DX = 0.16;

/**
 * @description Mulberry32 — tiny deterministic generator so SSR, tests, and
 * reloads share the same jitter.
 */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const clamp11 = (value: number): number => Math.min(1, Math.max(-1, value));

const jitter = (rand: () => number, amount: number): number =>
  (rand() * 2 - 1) * amount;

/**
 * @description Stack coordinate in [-1, 1]. The lead path sits at 0 so
 * distribution = 0 collapses every arc onto it, ±1 pushes the first/last
 * to the full start/end span (sign chooses which side of the lead path).
 */
const stackU = (index: number, n: number): number =>
  n === 1 ? 0 : (index / (n - 1)) * 2 - 1;

/**
 * @description Build `n` stacked arcs (default 3) with independent left/right
 * distribution and a bit of seeded noise on the Bézier handles.
 */
export const buildSoundArcs = (
  options: BuildSoundArcsOptions = {
    distributionEnd: undefined,
    distributionStart: undefined,
    n: undefined,
    noise: undefined,
    seed: undefined,
  },
): readonly SoundArc[] => {
  const n = Math.max(1, Math.floor(options.n ?? DEFAULT_N));
  const noise = Math.max(0, options.noise ?? DEFAULT_NOISE);
  const distStart = clamp11(
    options.distributionStart ?? DEFAULT_DISTRIBUTION_START,
  );
  const distEnd = clamp11(options.distributionEnd ?? DEFAULT_DISTRIBUTION_END);
  const rand = mulberry32(options.seed ?? DEFAULT_SEED);

  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    const u = stackU(i, n);
    const handleNoise = noise;
    const endNoise = noise * 0.22;

    const dyStart = u * distStart * (SPAN_START / 2);
    const dyEnd = u * distEnd * (SPAN_END / 2);
    const dxStart = u * distStart * HANDLE_DX;
    const dxEnd = u * distEnd * HANDLE_DX;

    const points: CubicPoints = [
      [
        FRONT.points[0][0] + jitter(rand, endNoise),
        FRONT.points[0][1] + dyStart + jitter(rand, endNoise),
      ],
      [
        FRONT.points[1][0] + dxStart + jitter(rand, handleNoise),
        FRONT.points[1][1] + dyStart + jitter(rand, handleNoise),
      ],
      [
        FRONT.points[2][0] + dxEnd + jitter(rand, handleNoise),
        FRONT.points[2][1] + dyEnd + jitter(rand, handleNoise),
      ],
      [
        FRONT.points[3][0] + jitter(rand, endNoise),
        FRONT.points[3][1] + dyEnd + jitter(rand, endNoise),
      ],
    ];

    return {
      opacity: lerp(FRONT.opacity, BACK.opacity, t),
      phase: lerp(FRONT.phase, BACK.phase, t) + jitter(rand, noise * 14),
      points,
      weight: lerp(FRONT.weight, BACK.weight, t),
    };
  });
};
