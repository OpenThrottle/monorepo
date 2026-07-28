import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/**
 * @description Grok / xAI — a circle with a diagonal slash.
 * @public
 */
export const GrokIcon = ({
  className,
}: ProviderIconProps): React.ReactElement => (
  <svg
    {...BASE_SVG_PROPS}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="12" r="8.5" />
    <line strokeLinecap="round" x1="7" x2="17" y1="17" y2="7" />
  </svg>
);
