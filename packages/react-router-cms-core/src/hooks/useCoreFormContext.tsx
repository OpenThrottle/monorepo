import * as React from 'react';

import { CoreFormContext } from '../data/data.core-form-context';
import type { CmsFormContextValue } from '../types/cms-render';

/**
 * @public
 */
export interface UseCoreFormContextResult {
  /** `undefined` when the caller is not inside a `CoreFormRenderer`. */
  readonly context: CmsFormContextValue | undefined;
}

/**
 * @description Reads the {@link CoreFormContext} of the fragment form the caller is rendered in.
 * @public
 */
export const useCoreFormContext = (): UseCoreFormContextResult => {
  // Hooks
  const context = React.useContext(CoreFormContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { context };
};
