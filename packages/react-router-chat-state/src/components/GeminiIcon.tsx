import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/** Props for the Gemini brand glyph. @public */
export interface GeminiIconProps extends ProviderIconProps {}

/**
 * @description Google Gemini — a four-pointed spark.
 * @public
 */
export const GeminiIcon = ({
  className,
}: GeminiIconProps): React.ReactElement => (
  <svg {...BASE_SVG_PROPS} className={className} fill="currentColor">
    <path d="M12 2.5c.6 5.2 4.3 8.9 9.5 9.5-5.2.6-8.9 4.3-9.5 9.5-.6-5.2-4.3-8.9-9.5-9.5 5.2-.6 8.9-4.3 9.5-9.5Z" />
  </svg>
);
