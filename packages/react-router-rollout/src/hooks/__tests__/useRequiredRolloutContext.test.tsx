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
      () => useRequiredRolloutContext<typeof flags>('useSomething'),
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
      renderHook(() => useRequiredRolloutContext('useSomething')),
    ).toThrow('useSomething must be used within a RolloutProvider');
  });
});
