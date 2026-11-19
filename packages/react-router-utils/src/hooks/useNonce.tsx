import * as React from 'react';

import { NonceContext, readDocumentNonce } from '../utils/csp';

/**
 * @description Read the current request's CSP nonce. On the server it comes
 * from `NonceContext`; on the client it is recovered from the document, so
 * hydration renders the same `nonce` the server did (React 19.3+ treats a
 * differing `nonce` as a hydration mismatch). Empty string when neither has one.
 * @public
 */
export const useNonce = (): string => {
  // Hooks
  const contextNonce = React.useContext(NonceContext);
  const [documentNonce] = React.useState(readDocumentNonce);

  // Setup
  const nonce = contextNonce === '' ? documentNonce : contextNonce;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return nonce;
};
