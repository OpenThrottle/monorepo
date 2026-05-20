import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { usePollServerMetrics } from '@openthrottle/react-router-ui';
import { GLOBAL_METRICS_STORAGE_KEY } from '../../config/index';
import * as globalMetricsStorage from '../../utils/storage';
import { GlobalMetrics } from '../GlobalMetrics';
import type { GlobalMetricsProps } from '../GlobalMetrics';
import { GlobalProviders } from '../GlobalProviders';

vi.mock('@openthrottle/react-router-ui', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-ui')>();
  return {
    ...actual,
    usePollServerMetrics: vi.fn(),
  };
});

const mockUsePollServerMetrics = vi.mocked(usePollServerMetrics);

afterEach(() => {
  cleanup();
});

describe('GlobalMetrics Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsProps;
  let localStorageStub: Record<string, string>;

  beforeEach(() => {
    props = {};
    localStorageStub = {};
    sessionStorage.clear();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageStub[key] ?? null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageStub[key] = value;
      },
    );

    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: false,
      serverMetrics: {
        cpuSystemMs: 0,
        cpuUserMs: 0,
        externalMb: 0,
        heapTotalMb: 0,
        heapUsedMb: 0,
        rssMb: 0,
      },
    });

    const Component = () => (
      <GlobalProviders>
        <GlobalMetrics {...props} />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render server metrics section and default poll interval', () => {
    expect(component.getByTestId('GlobalMetrics')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /server metrics/i }),
    ).toBeInTheDocument();
    const select = component.getByTestId('GlobalMetrics-poll-interval');
    expect(select).toHaveTextContent('60s');
  });

  test('should show loading when usePollServerMetrics returns loading with no history', () => {
    cleanup();
    /**
     * @description Strict Mode double-mount can persist chart samples to session between layout passes; force empty restore so `showGlobalLoadingBanner` matches the "no history" path.
     */
    const readHistorySpy = vi
      .spyOn(globalMetricsStorage, 'readStoredMetricsChartHistory')
      .mockReturnValue([]);

    try {
      mockUsePollServerMetrics.mockReturnValue({
        error: null,
        loading: true,
        serverMetrics: null,
      });
      const Component = () => (
        <GlobalProviders>
          <GlobalMetrics {...props} />
        </GlobalProviders>
      );
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByTestId } = render(<RoutesStub />);
      expect(getByTestId('GlobalMetrics-loading')).toBeInTheDocument();
    } finally {
      readHistorySpy.mockRestore();
    }
  });

  test('should show error when usePollServerMetrics returns error', () => {
    cleanup();
    mockUsePollServerMetrics.mockReturnValue({
      error: new Error('Fetch failed'),
      loading: false,
      serverMetrics: null,
    });
    const Component = () => (
      <GlobalProviders>
        <GlobalMetrics {...props} />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);
    expect(getByTestId('GlobalMetrics-error')).toHaveTextContent(
      'Fetch failed',
    );
  });

  test('should pass pollIntervalMs from props to usePollServerMetrics when provided', () => {
    cleanup();
    mockUsePollServerMetrics.mockClear();
    const Component = () => (
      <GlobalProviders>
        <GlobalMetrics {...props} pollIntervalMs={15_000} />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(mockUsePollServerMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 15_000 }),
    );
  });

  test('should persist selected poll interval to localStorage', async () => {
    const user = userEvent.setup();
    const select = component.getByTestId('GlobalMetrics-poll-interval');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: '15s' }));
    expect(select).toHaveTextContent('15s');
    expect(localStorageStub[GLOBAL_METRICS_STORAGE_KEY]).toBe('15000');
    expect(mockUsePollServerMetrics).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalMs: 15_000 }),
    );
  });

  test('should render stat cards and chart when metrics load', () => {
    const roots = component.getAllByTestId('GlobalMetrics');
    const dataEl = within(roots[0]).getByTestId('GlobalMetrics-data');
    expect(within(dataEl).getByText('RSS / External (MB)')).toBeInTheDocument();
    expect(
      within(roots[0]).getByTestId('GlobalMetrics-chart-card'),
    ).toBeInTheDocument();
  });

  test('should render metrics chart when data is available', () => {
    cleanup();
    const Component = () => (
      <GlobalProviders>
        <GlobalMetrics
          definitionsHref="/settings/debug#server-metrics-definitions"
          diagnosticsHref="/settings/debug#graphql-endpoint-health"
        />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalMetrics-chart-card')).toBeInTheDocument();
    expect(
      screen.getByTestId('GlobalMetrics-info-trigger'),
    ).toBeInTheDocument();
  });

  test('should expose metrics help trigger with accessible name', () => {
    const trigger = component.getByTestId('GlobalMetrics-info-trigger');
    expect(trigger).toHaveAttribute(
      'aria-label',
      'Metrics interpretation help',
    );
  });
});
