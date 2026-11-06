/**
 * @description mulberry32, a small deterministic 32-bit PRNG (Tommy Ettinger, public domain).
 * Returns a function yielding floats in [0, 1). The same seed gives the same sequence, which is
 * what makes a bootstrap interval reproducible.
 * @public
 */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
