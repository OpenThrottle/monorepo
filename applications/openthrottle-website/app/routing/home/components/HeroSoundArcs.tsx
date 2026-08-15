import * as React from 'react';
import { useSoundArcs } from '~/routing/home/hooks/useSoundArcs';

export interface HeroSoundArcsProps {
  /** Escape hatch to disable the effect (e.g. in tests). Defaults to on. */
  enabled?: boolean;
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
  const { enabled = true } = props;

  // Hooks
  const canvasRef = useSoundArcs<HTMLCanvasElement>(enabled);

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
