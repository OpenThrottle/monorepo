/**
 * @description Cubic smoothstep easing: maps `t` in 0..1 onto an S-curve that
 * starts and ends flat. Hoisted out of `useGlobalAnimationMesh` per
 * hook-primitive-shape H3.
 */
export const smoothstep = (t: number): number => t * t * (3 - 2 * t);
