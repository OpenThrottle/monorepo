import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { RolloutProvider } from '../../components/RolloutProvider';
import { defineRolloutFlags } from '../../index';
import { useRequiredRolloutContext } from '../useRequiredRolloutContext';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
});

describe('useRequiredRolloutContext', () => {
  test('returns context when used within RolloutProvider', () => {
    const fetchEvaluations = vi.fn(async () => []);

    const { result } = renderHook(
      () => useRequiredRolloutContext('useSomething', flags),
      {
        wrapper: ({ children }) => (
          <RolloutProvider
            applicationKey="required-app"
            fetchEvaluations={fetchEvaluations}
            flags={flags}
          >
            {children}
          </RolloutProvider>
        ),
      },
    );

    expect(result.current.applicationKey).toBe('required-app');
  });

  test('names the calling hook when used outside RolloutProvider', () => {
    expect(() =>
      renderHook(() => useRequiredRolloutContext('useSomething', flags)),
    ).toThrow('useSomething must be used within a RolloutProvider');
  });

  test('throws when given a catalog other than the provider flags', () => {
    const fetchEvaluations = vi.fn(async () => []);
    const otherFlags = defineRolloutFlags({
      'billing.invoices': { defaultValue: false, kind: 'boolean' },
    });

    expect(() =>
      renderHook(() => useRequiredRolloutContext('useSomething', otherFlags), {
        wrapper: ({ children }) => (
          <RolloutProvider
            applicationKey="required-app"
            fetchEvaluations={fetchEvaluations}
            flags={flags}
          >
            {children}
          </RolloutProvider>
        ),
      }),
    ).toThrow(
      "useSomething was given a different flag catalog than its RolloutProvider's `flags`",
    );
  });
});
