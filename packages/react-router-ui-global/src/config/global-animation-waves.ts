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
