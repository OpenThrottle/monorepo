import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { NonceContext } from '../../utils/csp';
import { useNonce } from '../useNonce';

const appendNoncedScript = (nonce: string): HTMLScriptElement => {
  const script = document.createElement('script');
  script.setAttribute('nonce', nonce);
  document.head.append(script);

  return script;
};

describe('useNonce', () => {
  afterEach(() => {
    for (const element of document.querySelectorAll('[nonce]')) {
      element.remove();
    }
  });

  describe('without a NonceContext value', () => {
    test('returns an empty string when the document has no nonced element', () => {
      const { result } = renderHook(() => useNonce());

      expect(result.current).toBe('');
    });

    test('recovers the nonce the server stamped on the document', () => {
      appendNoncedScript('server-nonce');

      const { result } = renderHook(() => useNonce());

      expect(result.current).toBe('server-nonce');
    });
  });

  describe('with a NonceContext value', () => {
    test('returns the nonce provided by NonceContext', () => {
      appendNoncedScript('document-nonce');

      const { result } = renderHook(() => useNonce(), {
        wrapper: ({ children }: { readonly children: React.ReactNode }) => (
          <NonceContext.Provider value="abc123">
            {children}
          </NonceContext.Provider>
        ),
      });

      expect(result.current).toBe('abc123');
    });
  });
});
