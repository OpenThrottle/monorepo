import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/**
 * @description Anthropic / Claude Code — the eight-spoke burst mark.
 * @public
 */
export const ClaudeIcon = ({
  className,
}: ProviderIconProps): React.ReactElement => (
  <svg {...BASE_SVG_PROPS} className={className} fill="currentColor">
    {Array.from({ length: 8 }, (_, index) => (
      <rect
        height="9"
        key={index}
        rx="0.9"
        transform={`rotate(${index * 45} 12 12)`}
        width="1.8"
        x="11.1"
        y="3"
      />
    ))}
  </svg>
);
