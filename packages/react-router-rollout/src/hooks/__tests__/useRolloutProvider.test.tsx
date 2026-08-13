import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { defineRolloutFlags } from '../../index';
import { clearRolloutEvaluationMemoryCache } from '../../utils';
import { useRolloutProvider } from '../useRolloutProvider';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
});

describe('useRolloutProvider', () => {
  afterEach(() => {
    clearRolloutEvaluationMemoryCache();
    vi.restoreAllMocks();
  });

  test('reaches ready with merged values', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useRolloutProvider({
        applicationKey: 'provider-hook',
        fetchEvaluations: async () => [
          {
            enabled: true,
            key: 'billing.invoices',
            kind: 'boolean',
            valueJson: 'true',
          },
        ],
        flags,
      }),
    );

    await waitFor(() => {
      expect(result.current.hydration.status).toBe('ready');
    });
    expect(result.current.values['billing.invoices']).toBe(true);
  });
});
