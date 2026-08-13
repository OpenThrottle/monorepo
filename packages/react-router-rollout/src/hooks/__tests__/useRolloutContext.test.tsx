import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { defineRolloutFlags } from '../../index';
import { RolloutProvider } from '../../components/RolloutProvider';
import { useRolloutContext } from '../useRolloutContext';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
});

describe('useRolloutContext', () => {
  test('returns context when used within RolloutProvider', async () => {
    const fetchEvaluations = vi.fn(async () => [
      {
        enabled: true,
        key: 'billing.invoices',
        kind: 'boolean' as const,
        valueJson: 'true',
      },
    ]);

    const { result } = renderHook(() => useRolloutContext<typeof flags>(), {
      wrapper: ({ children }) => (
        <RolloutProvider
          applicationKey="hook-app"
          fetchEvaluations={fetchEvaluations}
          flags={flags}
        >
          {children}
        </RolloutProvider>
      ),
    });

    expect(result.current.applicationKey).toBe('hook-app');
    expect(result.current.values['billing.invoices']).toBe(false);

    await waitFor(() => {
      expect(result.current.hydration.status).toBe('ready');
    });
    expect(result.current.values['billing.invoices']).toBe(true);
  });

  test('throws when used outside RolloutProvider', () => {
    expect(() => renderHook(() => useRolloutContext())).toThrow(
      'useRolloutContext must be used within a RolloutProvider',
    );
  });
});
