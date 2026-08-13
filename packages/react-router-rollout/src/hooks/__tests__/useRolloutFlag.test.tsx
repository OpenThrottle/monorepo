import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, test, vi } from 'vitest';

import { defineRolloutFlags, type RolloutFlagKey } from '../../index';
import { RolloutProvider } from '../../components/RolloutProvider';
import { useRolloutFlag } from '../useRolloutFlag';

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

describe('useRolloutFlag', () => {
  test('returns typed catalog defaults before hydration, then resolved value', async () => {
    const fetchEvaluations = vi.fn(async () => [
      {
        enabled: true,
        key: 'billing.invoices',
        kind: 'boolean',
        valueJson: 'true',
      },
      {
        enabled: true,
        key: 'theme.mode',
        kind: 'string',
        valueJson: '"dark"',
      },
    ]);

    const { result } = renderHook(
      () => ({
        invoices: useRolloutFlag<Flags, 'billing.invoices'>('billing.invoices'),
        theme: useRolloutFlag<Flags, 'theme.mode'>('theme.mode'),
      }),
      { wrapper: createWrapper(fetchEvaluations) },
    );

    expect(result.current.invoices).toBe(false);
    expect(result.current.theme).toBe('system');

    await waitFor(() => {
      expect(result.current.invoices).toBe(true);
      expect(result.current.theme).toBe('dark');
    });

    expectTypeOf(result.current.invoices).toEqualTypeOf<boolean>();
    expectTypeOf(result.current.theme).toEqualTypeOf<string>();
  });

  test('throws when used outside RolloutProvider', () => {
    expect(() =>
      renderHook(() =>
        useRolloutFlag<Flags, 'billing.invoices'>('billing.invoices'),
      ),
    ).toThrow('useRolloutFlag must be used within a RolloutProvider');
  });

  test('type-level: unknown keys and wrong returns are not assignable', () => {
    type KnownKey = RolloutFlagKey<Flags>;
    expectTypeOf<KnownKey>().toEqualTypeOf<'billing.invoices' | 'theme.mode'>();
    expectTypeOf(
      useRolloutFlag<Flags, 'billing.invoices'>,
    ).returns.toEqualTypeOf<boolean>();
    expectTypeOf(
      useRolloutFlag<Flags, 'theme.mode'>,
    ).returns.toEqualTypeOf<string>();
  });
});
