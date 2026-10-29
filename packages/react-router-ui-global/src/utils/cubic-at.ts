import type { CubicPoints } from './build-sound-arcs';

/**
 * @description Evaluates one axis of a cubic Bézier at `t`. Hoisted out of
 * `useGlobalAnimationWaves` per hook-primitive-shape H3.
 */
export const cubicAt = (t: number, p: CubicPoints, axis: 0 | 1): number => {
  const mt = 1 - t;

  return (
    mt * mt * mt * p[0][axis] +
    3 * mt * mt * t * p[1][axis] +
    3 * mt * t * t * p[2][axis] +
    t * t * t * p[3][axis]
  );
};
