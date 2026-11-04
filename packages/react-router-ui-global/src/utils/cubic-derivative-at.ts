import type { CubicPoints } from './build-sound-arcs';

/**
 * @description Evaluates the derivative of one axis of a cubic Bézier at `t`.
 * Hoisted out of `useGlobalAnimationWaves` per hook-primitive-shape H3.
 */
export const cubicDerivativeAt = (
  t: number,
  p: CubicPoints,
  axis: 0 | 1,
): number => {
  const mt = 1 - t;

  return (
    3 * mt * mt * (p[1][axis] - p[0][axis]) +
    6 * mt * t * (p[2][axis] - p[1][axis]) +
    3 * t * t * (p[3][axis] - p[2][axis])
  );
};
