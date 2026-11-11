import type * as React from 'react';

import type { CmsRenderProps } from '../types/cms-render';

/**
 * @public
 */
export interface CoreNullComponentProps extends CmsRenderProps {}

/**
 * @description What the renderer mounts for a `typename` its registry does not know: nothing, so
 * one unknown block never breaks the rest of the page.
 * @public
 */
export const CoreNullComponent = (
  _props: CoreNullComponentProps,
): React.ReactElement | null => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return null;
};
