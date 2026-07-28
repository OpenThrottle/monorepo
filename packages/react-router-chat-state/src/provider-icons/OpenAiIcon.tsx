import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/**
 * @description OpenAI / Codex — a simplified six-lobe rosette knot.
 * @public
 */
export const OpenAiIcon = ({
  className,
}: ProviderIconProps): React.ReactElement => (
  <svg
    {...BASE_SVG_PROPS}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    {Array.from({ length: 6 }, (_, index) => (
      <ellipse
        cx="12"
        cy="12"
        key={index}
        rx="4"
        ry="8.5"
        transform={`rotate(${index * 30} 12 12)`}
      />
    ))}
  </svg>
);
