import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, test, vi } from 'vitest';

import { defineRolloutFlags, type RolloutBooleanFlagKey } from '../../catalog';
import { RolloutProvider } from '../../components/RolloutProvider';
import { useIsRolloutEnabled } from '../useIsRolloutEnabled';

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

describe('useIsRolloutEnabled', () => {
  test('returns boolean values for boolean catalog keys', async () => {
    const fetchEvaluations = vi.fn(async () => [
      {
        enabled: true,
        key: 'billing.invoices',
        kind: 'boolean',
        valueJson: 'true',
      },
    ]);

    const { result } = renderHook(
      () => useIsRolloutEnabled<Flags>('billing.invoices'),
      { wrapper: createWrapper(fetchEvaluations) },
    );

    expect(result.current).toBe(false);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expectTypeOf(result.current).toEqualTypeOf<boolean>();
  });

  test('throws when used outside RolloutProvider', () => {
    expect(() =>
      renderHook(() => useIsRolloutEnabled<Flags>('billing.invoices')),
    ).toThrow('useIsRolloutEnabled must be used within a RolloutProvider');
  });

  test('type-level: only boolean catalog keys are accepted', () => {
    expectTypeOf<
      RolloutBooleanFlagKey<Flags>
    >().toEqualTypeOf<'billing.invoices'>();
    type EnabledKey = Parameters<typeof useIsRolloutEnabled<Flags>>[0];
    expectTypeOf<EnabledKey>().toEqualTypeOf<'billing.invoices'>();
  });
});
