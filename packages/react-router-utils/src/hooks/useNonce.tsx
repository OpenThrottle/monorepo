import * as React from 'react';

import { NonceContext } from '../utils/csp';

/**
 * @description Read the current request's CSP nonce. Returns an empty string
 * when no nonce is in scope (client hydration), in which case no `nonce`
 * attribute should be rendered.
 * @public
 */
export const useNonce = (): string => {
  // Hooks
  const nonce = React.useContext(NonceContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return nonce;
};
