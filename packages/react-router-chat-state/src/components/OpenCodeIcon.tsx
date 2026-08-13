import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/** Props for the OpenCode brand glyph. @public */
export interface OpenCodeIconProps extends ProviderIconProps {}

/**
 * @description OpenCode — a terminal prompt glyph.
 * @public
 */
export const OpenCodeIcon = ({
  className,
}: OpenCodeIconProps): React.ReactElement => (
  <svg
    {...BASE_SVG_PROPS}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
  >
    <rect height="16" rx="2.5" width="20" x="2" y="4" />
    <path d="m6.5 9.5 3 2.5-3 2.5" />
    <line x1="12" x2="16.5" y1="15" y2="15" />
  </svg>
);
