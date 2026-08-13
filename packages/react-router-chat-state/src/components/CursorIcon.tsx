import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/** Props for the Cursor brand glyph. @public */
export interface CursorIconProps extends ProviderIconProps {}

/**
 * @description Cursor — a stylized cursor/pointer triangle.
 * @public
 */
export const CursorIcon = ({
  className,
}: CursorIconProps): React.ReactElement => (
  <svg {...BASE_SVG_PROPS} className={className} fill="currentColor">
    <path d="M5 3.2 19.4 12 12.6 13.2 9.9 19.6 5 3.2Z" />
  </svg>
);
