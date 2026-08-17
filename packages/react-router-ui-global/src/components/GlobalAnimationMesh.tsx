import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';
import { useGlobalAnimationMesh } from '../hooks/useGlobalAnimationMesh';

/**
 * Default lower-edge fade so the lattice reads as texture under content rather
 * than a hard-edged grid. Overridable via the `maskImage` prop.
 */
const DEFAULT_MASK_IMAGE = `linear-gradient(to bottom, black 35%, transparent 92%)`;

export interface GlobalAnimationMeshProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  /** Dot/line colour as an "r, g, b" triple (canvas cannot read CSS vars). */
  readonly color?: string;
  /** Damping applied to velocity each frame (lower = stiffer settle). */
  readonly damping?: number;
  /** Base opacity of a resting dot. */
  readonly dotAlpha?: number;
  /** Extra dot opacity added at the centre of the pointer's influence. */
  readonly dotGlow?: number;
  /** Base dot radius in CSS px. */
  readonly dotRadius?: number;
  /** Escape hatch to disable the effect (e.g. in tests). Defaults to on. */
  readonly enabled?: boolean;
  /** Subtle idle wobble amplitude in px, so the lattice breathes at rest. */
  readonly idleAmplitude?: number;
  /** Base opacity of a resting connection line. */
  readonly lineAlpha?: number;
  /** Extra line opacity added within the pointer's influence. */
  readonly lineGlow?: number;
  /**
   * CSS `mask-image` for the edge fade. Pass `'none'` to disable the fade.
   * Defaults to a bottom-edge gradient.
   */
  readonly maskImage?: string;
  /** Max distance (px) a dot may stray from its home before it is clamped. */
  readonly maxDisplace?: number;
  /** Strength of the pointer's outward push. */
  readonly repelForce?: number;
  /** Pointer influence radius in px (repulsion + proximity glow). */
  readonly repelRadius?: number;
  /** Grid spacing in px between neighbouring dots. */
  readonly spacing?: number;
  /** Pull-back-to-home strength each frame (higher = snappier). */
  readonly spring?: number;
}

/**
 * @description Decorative, interactive dot-lattice backdrop. Purely
 * presentational: it owns a full-bleed `<canvas>` and hands the drawing to
 * `useGlobalAnimationMesh`. Renders `aria-hidden` with `pointer-events-none` so
 * it never intercepts clicks; place it inside a positioned (`relative`)
 * container. Every tunable is exposed as an optional prop; omitting all of them
 * reproduces the default look. Honors `prefers-reduced-motion`.
 * @public
 */
export const GlobalAnimationMesh = (
  props: GlobalAnimationMeshProps,
): React.ReactElement => {
  const {
    className,
    color,
    damping,
    dotAlpha,
    dotGlow,
    dotRadius,
    enabled = true,
    idleAmplitude,
    lineAlpha,
    lineGlow,
    maskImage = DEFAULT_MASK_IMAGE,
    maxDisplace,
    repelForce,
    repelRadius,
    spacing,
    spring,
    style,
    ...rest
  } = props;

  // Hooks
  const canvasRef = useGlobalAnimationMesh<HTMLCanvasElement>({
    color,
    damping,
    dotAlpha,
    dotGlow,
    dotRadius,
    enabled,
    idleAmplitude,
    lineAlpha,
    lineGlow,
    maxDisplace,
    repelForce,
    repelRadius,
    spacing,
    spring,
  });

  // Setup
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: maskImage,
    maskImage,
    ...style,
  };

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
      data-testid="GlobalAnimationMesh"
      ref={canvasRef}
      style={maskStyle}
      {...rest}
    />
  );
};
