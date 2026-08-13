import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { defineRolloutFlags } from '../../index';
import { useRolloutContext } from '../../hooks/useRolloutContext';
import { clearRolloutEvaluationMemoryCache } from '../../utils';
import { RolloutProvider } from '../RolloutProvider';
import type { RolloutFetchEvaluations } from '../../types';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
  'theme.mode': { defaultValue: 'system', kind: 'string' },
});

const Probe = (): React.ReactElement => {
  const { hydration, values } = useRolloutContext<typeof flags>();

  return (
    <div>
      <span data-testid="status">{hydration.status}</span>
      <span data-testid="billing">
        {values['billing.invoices'] ? 'yes' : 'no'}
      </span>
      <span data-testid="theme">{values['theme.mode']}</span>
    </div>
  );
};

describe('RolloutProvider', () => {
  beforeEach(() => {
    clearRolloutEvaluationMemoryCache();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('hydrates values from the fetch adapter with applicationKey', async () => {
    const fetchEvaluations: RolloutFetchEvaluations = vi.fn(async (args) => {
      expect(args.applicationKey).toBe('openthrottle-developer');
      return [
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
      ];
    });

    const { getByTestId } = render(
      <RolloutProvider
        applicationKey="openthrottle-developer"
        fetchEvaluations={fetchEvaluations}
        flags={flags}
      >
        <Probe />
      </RolloutProvider>,
    );

    expect(getByTestId('billing')).toHaveTextContent('no');
    expect(getByTestId('theme')).toHaveTextContent('system');

    await waitFor(() => {
      expect(getByTestId('status')).toHaveTextContent('ready');
    });

    expect(getByTestId('billing')).toHaveTextContent('yes');
    expect(getByTestId('theme')).toHaveTextContent('dark');
    expect(fetchEvaluations).toHaveBeenCalledTimes(1);
  });

  test('serves a cache hit without calling the network again', async () => {
    const fetchEvaluations: RolloutFetchEvaluations = vi.fn(async () => [
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
        valueJson: '"light"',
      },
    ]);

    const first = render(
      <RolloutProvider
        applicationKey="cache-app"
        cache={{ storage: 'memory', ttlMs: 60_000 }}
        fetchEvaluations={fetchEvaluations}
        flags={flags}
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(first.getByTestId('status')).toHaveTextContent('ready');
    });
    first.unmount();

    const second = render(
      <RolloutProvider
        applicationKey="cache-app"
        cache={{ storage: 'memory', ttlMs: 60_000 }}
        fetchEvaluations={fetchEvaluations}
        flags={flags}
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(second.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(second.getByTestId('theme')).toHaveTextContent('light');
    expect(fetchEvaluations).toHaveBeenCalledTimes(1);
  });

  test('keeps catalog defaults when kinds mismatch', async () => {
    const fetchEvaluations: RolloutFetchEvaluations = vi.fn(async () => [
      {
        enabled: true,
        key: 'billing.invoices',
        kind: 'string',
        valueJson: '"true"',
      },
      {
        enabled: true,
        key: 'theme.mode',
        kind: 'string',
        valueJson: '"dark"',
      },
    ]);

    const { getByTestId } = render(
      <RolloutProvider
        applicationKey="mismatch-app"
        fetchEvaluations={fetchEvaluations}
        flags={flags}
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('status')).toHaveTextContent('ready');
    });

    expect(getByTestId('billing')).toHaveTextContent('no');
    expect(getByTestId('theme')).toHaveTextContent('dark');
  });

  test('falls back to defaults and error status when fetch fails', async () => {
    const fetchEvaluations: RolloutFetchEvaluations = vi.fn(async () => {
      throw new Error('network down');
    });

    const { getByTestId } = render(
      <RolloutProvider
        applicationKey="error-app"
        fetchEvaluations={fetchEvaluations}
        flags={flags}
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('status')).toHaveTextContent('error');
    });

    expect(getByTestId('billing')).toHaveTextContent('no');
    expect(getByTestId('theme')).toHaveTextContent('system');
  });

  test('re-hydrates when identityKey changes', async () => {
    const fetchEvaluations: RolloutFetchEvaluations = vi
      .fn()
      .mockResolvedValueOnce([
        {
          enabled: false,
          key: 'billing.invoices',
          kind: 'boolean',
          valueJson: 'false',
        },
        {
          enabled: true,
          key: 'theme.mode',
          kind: 'string',
          valueJson: '"anon"',
        },
      ])
      .mockResolvedValueOnce([
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
          valueJson: '"authed"',
        },
      ]);

    const { getByTestId, rerender } = render(
      <RolloutProvider
        applicationKey="identity-app"
        fetchEvaluations={fetchEvaluations}
        flags={flags}
        identityKey={null}
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('theme')).toHaveTextContent('anon');
    });

    rerender(
      <RolloutProvider
        applicationKey="identity-app"
        fetchEvaluations={fetchEvaluations}
        flags={flags}
        identityKey="user-42"
      >
        <Probe />
      </RolloutProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('theme')).toHaveTextContent('authed');
    });
    expect(getByTestId('billing')).toHaveTextContent('yes');
    expect(fetchEvaluations).toHaveBeenCalledTimes(2);
  });
});
