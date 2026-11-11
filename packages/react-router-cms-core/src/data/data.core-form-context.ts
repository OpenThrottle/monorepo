import * as React from 'react';

import type { CmsFormContextValue } from '../types/cms-render';

/**
 * @description Supplied by `CoreFormRenderer` to the fields of one fragment form; read it with
 * `useCoreFormContext`. `undefined` outside a form, so a field can tell rather than read a
 * placeholder schema.
 * @public
 */
export const CoreFormContext = React.createContext<
  CmsFormContextValue | undefined
>(undefined);
