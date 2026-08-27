import * as React from 'react';
import { BASE_SVG_PROPS } from './svg-base';
import type { ProviderIconProps } from './svg-base';

/** Props for the Visual Studio Code brand glyph. @public */
export interface VscodeIconProps extends ProviderIconProps {}

/**
 * @description Visual Studio Code — the folded ribbon mark.
 * @public
 */
export const VscodeIcon = ({
  className,
}: VscodeIconProps): React.ReactElement => (
  <svg {...BASE_SVG_PROPS} className={className} fill="currentColor">
    <path d="M18.6 2.2 21.4 3.6a1 1 0 0 1 .6.9v15a1 1 0 0 1-.6.9l-2.8 1.4a1 1 0 0 1-1.1-.2l-8.4-7.7-4.3 3.3a.7.7 0 0 1-.9 0L2.3 16a.7.7 0 0 1 0-1.1L5.7 12 2.3 9.1a.7.7 0 0 1 0-1.1l1.6-1.2a.7.7 0 0 1 .9 0l4.3 3.3 8.4-7.7a1 1 0 0 1 1.1-.2Zm-.4 4.6-6.3 5.2 6.3 5.2V6.8Z" />
  </svg>
);
