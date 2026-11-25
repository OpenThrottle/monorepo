import { cn } from '@openthrottle/react-router-shadcn';
import { MeshGradient } from '@paper-design/shaders-react';
import * as React from 'react';

import { DEFAULT_GRADIENT_MESH_COLORS } from '../data/gradient-mesh';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export interface GradientMeshProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Up to 10 color spots blended into the mesh (hex/rgb/hsl strings). */
  readonly colors?: string[];
  /** Power of organic noise distortion (0 to 1). */
  readonly distortion?: number;
  /** Strength of grain distortion applied to shape edges (0 to 1). */
  readonly grainMixer?: number;
  /** Post-processing black/white grain overlay (0 to 1). */
  readonly grainOverlay?: number;
  /** Animation speed. Forced to 0 when the user prefers reduced motion. */
  readonly speed?: number;
  /** Power of vortex distortion (0 to 1). */
  readonly swirl?: number;
}

/**
 * @description Animated WebGL gradient mesh, designed to sit behind content as
 * a full-bleed background. Renders absolutely-positioned and non-interactive at
 * `-z-10`; place it inside a `relative isolate` container (the `isolate` keeps
 * the negative z-index from slipping behind an opaque ancestor background) and
 * give sibling content a higher z-index (e.g. `relative z-10`). Honors
 * `prefers-reduced-motion`.
 * @public
 */
export const GradientMesh = (props: GradientMeshProps): React.ReactElement => {
  const {
    className,
    colors = [...DEFAULT_GRADIENT_MESH_COLORS],
    distortion = 0.8,
    grainMixer = 0,
    grainOverlay = 0,
    speed = 0.25,
    style,
    swirl = 0.6,
    ...rest
  } = props;

  // Hooks
  const prefersReducedMotion = usePrefersReducedMotion();

  // Setup
  const effectiveSpeed = prefersReducedMotion ? 0 : speed;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
      style={style}
      {...rest}
    >
      <MeshGradient
        className="h-full w-full"
        colors={colors}
        distortion={distortion}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
        speed={effectiveSpeed}
        swirl={swirl}
      />
    </div>
  );
};
