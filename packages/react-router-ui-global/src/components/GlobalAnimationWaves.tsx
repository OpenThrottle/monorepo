import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';
import { useGlobalAnimationWaves } from '../hooks/useGlobalAnimationWaves';

export interface GlobalAnimationWavesProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
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
 * @description Decorative, velocity-reactive "sound wave" arcs. Purely
 * presentational: it owns a full-bleed `<canvas>` and hands the drawing to
 * `useGlobalAnimationWaves`. Renders `aria-hidden` with `pointer-events-none`
 * so it never intercepts clicks; place it inside a positioned (`relative`)
 * container. Every tunable is exposed as an optional prop; omitting all of them
 * reproduces the default look. Honors `prefers-reduced-motion`.
 * @public
 */
export const GlobalAnimationWaves = (
  props: GlobalAnimationWavesProps,
): React.ReactElement => {
  const {
    attack,
    className,
    colorEnd,
    colorMid,
    colorStart,
    distributionEnd,
    distributionStart,
    enabled = true,
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
    ...rest
  } = props;

  // Hooks
  const canvasRef = useGlobalAnimationWaves<HTMLCanvasElement>({
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
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <canvas
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        className,
      )}
      data-testid="GlobalAnimationWaves"
      ref={canvasRef}
      {...rest}
    />
  );
};
