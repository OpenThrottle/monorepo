/**
 * Default dot-mesh tunables. Colour is a fixed light tint because the mesh is
 * designed to sit on a dark backdrop.
 */
export const DEFAULT_GLOBAL_ANIMATION_MESH = {
  color: '243, 240, 234',
  damping: 0.82,
  dotAlpha: 0.26,
  dotGlow: 0.6,
  dotRadius: 1.4,
  idleAmplitude: 2.4,
  lineAlpha: 0.09,
  lineGlow: 0.28,
  maxDisplace: 42,
  repelForce: 2.4,
  repelRadius: 140,
  spacing: 60,
  spring: 0.08,
} as const;
