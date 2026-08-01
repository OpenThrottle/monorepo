import * as React from 'react';

/**
 * Props for {@link FloorGrid}.
 *
 * @public
 */
export interface FloorGridProps {
  /** Grid spacing in world inches (default 12 = one foot). */
  readonly gridSize: number;
  /** Floor height in world inches. */
  readonly height: number;
  /** Floor width in world inches. */
  readonly width: number;
}

/**
 * @description The floor background: a solid floor rectangle, a world-space
 * grid drawn with an SVG `<pattern>` (spaced by `gridSize`), and a boundary
 * outline. Strokes use `non-scaling-stroke` so grid lines stay crisp at any
 * zoom level. Purely presentational — no interaction.
 *
 * @public
 */
export const FloorGrid = (props: FloorGridProps): React.ReactElement => {
  const { gridSize, height, width } = props;

  // Hooks
  const patternId = React.useId();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <g aria-hidden="true">
      <defs>
        <pattern
          height={gridSize}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={gridSize}
        >
          <path
            className="text-border"
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect
        className="text-background"
        fill="currentColor"
        height={height}
        width={width}
        x={0}
        y={0}
      />
      <rect
        fill={`url(#${patternId})`}
        height={height}
        width={width}
        x={0}
        y={0}
      />
      <rect
        className="text-border"
        fill="none"
        height={height}
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={0}
        y={0}
      />
    </g>
  );
};
