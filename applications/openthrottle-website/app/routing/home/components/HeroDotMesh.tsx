import * as React from 'react';
import { useDotGridMesh } from '~/routing/home/hooks/useDotGridMesh';

export interface HeroDotMeshProps {
  /** Escape hatch to disable the effect (e.g. in tests). Defaults to on. */
  enabled?: boolean;
}

/**
 * Decorative, interactive dot-lattice backdrop for the landing hero. Purely
 * presentational: it owns a full-bleed `<canvas>` and hands the drawing to
 * `useDotGridMesh`. Marked `aria-hidden` with `pointer-events-none` so it never
 * intercepts clicks on the hero CTAs.
 */
export const HeroDotMesh = (props: HeroDotMeshProps): React.ReactElement => {
  const { enabled = true } = props;

  // Hooks
  const canvasRef = useDotGridMesh<HTMLCanvasElement>(enabled);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <canvas
      aria-hidden="true"
      className="landing-dot-mesh pointer-events-none absolute inset-0 h-full w-full"
      data-testid="HeroDotMesh"
      ref={canvasRef}
    />
  );
};
