import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, test, vi } from 'vitest';

import { defineRolloutFlags } from '../../catalog';
import { RolloutProvider } from '../../components/RolloutProvider';
import { useRollout } from '../useRollout';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
  'theme.mode': { defaultValue: 'system', kind: 'string' },
});

type Flags = typeof flags;

const createWrapper = (
  fetchEvaluations: () => Promise<
    ReadonlyArray<{
      enabled: boolean;
      key: string;
      kind: string;
      valueJson: string;
    }>
  >,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <RolloutProvider
      applicationKey="hook-app"
      fetchEvaluations={fetchEvaluations}
      flags={flags}
    >
      {children}
    </RolloutProvider>
  );

  return Wrapper;
};

describe('useRollout', () => {
  test('returns applicationKey, hydration, and full values map', async () => {
    const fetchEvaluations = vi.fn(async () => [
      {
        enabled: true,
        key: 'billing.invoices',
        kind: 'boolean',
        valueJson: 'true',
      },
    ]);

    const { result } = renderHook(() => useRollout<Flags>(), {
      wrapper: createWrapper(fetchEvaluations),
    });

    expect(result.current.applicationKey).toBe('hook-app');
    expect(result.current.values['billing.invoices']).toBe(false);
    expect(result.current.values['theme.mode']).toBe('system');
    expect(['idle', 'loading', 'ready']).toContain(
      result.current.hydration.status,
    );

    await waitFor(() => {
      expect(result.current.hydration.status).toBe('ready');
    });
    expect(result.current.values['billing.invoices']).toBe(true);

    expectTypeOf(
      result.current.values['billing.invoices'],
    ).toEqualTypeOf<boolean>();
    expectTypeOf(result.current.values['theme.mode']).toEqualTypeOf<string>();
  });

  test('throws when used outside RolloutProvider', () => {
    expect(() => renderHook(() => useRollout())).toThrow(
      'useRollout must be used within a RolloutProvider',
    );
  });
});
