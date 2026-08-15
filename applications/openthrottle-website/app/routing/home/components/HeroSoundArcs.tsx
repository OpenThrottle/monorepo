import * as React from 'react';
import { LANDING_SOUND_ARCS } from '~/routing/home/data/data.landing';
import { useSoundArcs } from '~/routing/home/hooks/useSoundArcs';

export interface HeroSoundArcsProps {
  /**
   * Right-side fan, -1..1. 0 packs onto the lead path; 1 / -1 span the
   * right edge in opposite directions. Defaults to
   * `LANDING_SOUND_ARCS.distributionEnd`.
   */
  distributionEnd?: number;
  /**
   * Left-side fan, -1..1. 0 packs onto the lead path; 1 / -1 span the
   * left edge in opposite directions. Defaults to
   * `LANDING_SOUND_ARCS.distributionStart`.
   */
  distributionStart?: number;
  /** Escape hatch to disable the effect (e.g. in tests). Defaults to on. */
  enabled?: boolean;
  /** Stacked wave count. Defaults to `LANDING_SOUND_ARCS.n`. */
  n?: number;
}

/**
 * Decorative, velocity-reactive "sound wave" arcs for the landing hero. Purely
 * presentational: it owns a full-bleed `<canvas>` and hands the drawing to
 * `useSoundArcs`. Marked `aria-hidden` with `pointer-events-none` so it never
 * intercepts clicks on the hero CTAs.
 */
export const HeroSoundArcs = (
  props: HeroSoundArcsProps,
): React.ReactElement => {
  const {
    distributionEnd = LANDING_SOUND_ARCS.distributionEnd,
    distributionStart = LANDING_SOUND_ARCS.distributionStart,
    enabled = true,
    n = LANDING_SOUND_ARCS.n,
  } = props;

  // Hooks
  const canvasRef = useSoundArcs<HTMLCanvasElement>({
    distributionEnd,
    distributionStart,
    enabled,
    n,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-testid="HeroSoundArcs"
      ref={canvasRef}
    />
  );
};
