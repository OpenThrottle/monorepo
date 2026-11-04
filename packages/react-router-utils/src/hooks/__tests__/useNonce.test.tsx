import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { NonceContext } from '../../utils/csp';
import { useNonce } from '../useNonce';

describe('useNonce', () => {
  test('returns an empty string when no nonce is in scope', () => {
    const { result } = renderHook(() => useNonce());

    expect(result.current).toBe('');
  });

  test('returns the nonce provided by NonceContext', () => {
    const { result } = renderHook(() => useNonce(), {
      wrapper: ({ children }: { readonly children: React.ReactNode }) => (
        <NonceContext.Provider value="abc123">{children}</NonceContext.Provider>
      ),
    });

    expect(result.current).toBe('abc123');
  });
});
