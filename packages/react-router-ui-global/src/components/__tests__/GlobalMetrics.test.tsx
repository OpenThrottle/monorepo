import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { usePollServerMetrics } from '@openthrottle/react-router-ui';
import {
  GLOBAL_METRICS_COLLAPSED_KEY,
  GLOBAL_METRICS_STORAGE_KEY,
} from '../../config/index';
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
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
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
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
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
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
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
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
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

  describe('header layout', () => {
    test('should render the Server metrics heading alongside the info trigger button (same container)', () => {
      const heading = component.getByRole('heading', {
        name: /server metrics/i,
      });
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      expect(heading).toBeInTheDocument();
      expect(trigger).toBeInTheDocument();
      /**
       * @description The header groups the `<h2>` and the info `<button>` in a
       * single flex container so the icon visually anchors to the heading.
       */
      expect(heading.parentElement).toBe(trigger.parentElement);
    });
  });

  describe('collapsible behavior', () => {
    test('renders expanded by default: stat cards visible, summary hidden, toggle labelled to collapse', () => {
      expect(component.getByTestId('GlobalMetrics-data')).toBeInTheDocument();

      const toggle = component.getByTestId('GlobalMetrics-toggle');
      expect(toggle).toHaveAttribute('aria-label', 'Collapse server metrics');

      /**
       * @description The collapsed summary stays mounted (so it can cross-fade)
       * but is hidden from assistive tech while the panel is open.
       */
      expect(component.getByTestId('GlobalMetrics-summary')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    test('collapses on toggle click: hides cards/chart, reveals summary with metric values, persists collapsed=true', async () => {
      const user = userEvent.setup();
      const toggle = component.getByTestId('GlobalMetrics-toggle');

      await user.click(toggle);

      expect(
        component.queryByTestId('GlobalMetrics-data'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('GlobalMetrics-chart-card'),
      ).not.toBeInTheDocument();

      const summary = component.getByTestId('GlobalMetrics-summary');
      expect(summary).toHaveAttribute('aria-hidden', 'false');
      expect(summary).toHaveTextContent(/RSS/);
      expect(summary).toHaveTextContent(/MB/);

      expect(toggle).toHaveAttribute('aria-label', 'Expand server metrics');
      expect(localStorageStub[GLOBAL_METRICS_COLLAPSED_KEY]).toBe('true');
    });

    test('re-expands on a second toggle and persists collapsed=false', async () => {
      const user = userEvent.setup();
      const toggle = component.getByTestId('GlobalMetrics-toggle');

      await user.click(toggle);
      await user.click(toggle);

      expect(component.getByTestId('GlobalMetrics-data')).toBeInTheDocument();
      expect(localStorageStub[GLOBAL_METRICS_COLLAPSED_KEY]).toBe('false');
    });

    test.skip('keeps the poll Select mounted but keyboard-unreachable when collapsed', async () => {
      const user = userEvent.setup();
      const toggle = component.getByTestId('GlobalMetrics-toggle');
      const trigger = component.getByTestId('GlobalMetrics-poll-interval');

      // Reachable in the tab order while expanded.
      expect(trigger).not.toHaveAttribute('tabindex', '-1');

      await user.click(toggle);

      /**
       * @description Value must survive a collapse, so the Select stays mounted;
       * it is only removed from the tab order and hidden from assistive tech.
       */
      const collapsedTrigger = component.getByTestId(
        'GlobalMetrics-poll-interval',
      );
      expect(collapsedTrigger).toBeInTheDocument();
      expect(collapsedTrigger).toHaveAttribute('tabindex', '-1');
      expect(collapsedTrigger.closest('[data-slot="label"]')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    test('restores the collapsed preference from sessionStorage on mount', () => {
      cleanup();
      localStorageStub[GLOBAL_METRICS_COLLAPSED_KEY] = 'true';

      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => (
        <GlobalProviders>
          <GlobalMetrics />
        </GlobalProviders>
      );
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      const { getByTestId, queryByTestId } = render(<RoutesStub />);

      expect(queryByTestId('GlobalMetrics-data')).not.toBeInTheDocument();
      expect(getByTestId('GlobalMetrics-toggle')).toHaveAttribute(
        'aria-label',
        'Expand server metrics',
      );
    });
  });

  describe('regression guard: legacy tooltip markup is gone', () => {
    test('should not render the legacy GlobalMetrics-visibility-hint paragraph', () => {
      expect(
        component.queryByTestId('GlobalMetrics-visibility-hint'),
      ).not.toBeInTheDocument();
    });

    test('should not render the legacy GlobalMetrics-definitions-link anchor', () => {
      expect(
        component.queryByTestId('GlobalMetrics-definitions-link'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the URL does not contain modal=ServerMetricsInfo', () => {
    test('should not render the dialog content even though the modal is mounted', () => {
      expect(
        component.queryByTestId('GlobalMetricsInfoModal'),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('when the URL contains modal=ServerMetricsInfo and definitionsHref is passed', () => {
    beforeEach(() => {
      cleanup();
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => (
        <GlobalProviders>
          <GlobalMetrics definitionsHref="/settings/debug#server-metrics-definitions" />
        </GlobalProviders>
      );
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      render(<RoutesStub initialEntries={['/?modal=ServerMetricsInfo']} />);
    });

    test('should mount the modal content', () => {
      expect(screen.getByTestId('GlobalMetricsInfoModal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should thread definitionsHref from GlobalMetrics → GlobalMetricsInfoModal as a deep link', () => {
      const dialog = screen.getByRole('dialog');
      const link = within(dialog).getByTestId(
        'GlobalMetricsInfoModal-definitions-link',
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/settings/debug#server-metrics-definitions',
      );
    });
  });

  describe('when the URL contains modal=ServerMetricsInfo but no definitionsHref is passed', () => {
    beforeEach(() => {
      cleanup();
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => (
        <GlobalProviders>
          <GlobalMetrics />
        </GlobalProviders>
      );
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      render(<RoutesStub initialEntries={['/?modal=ServerMetricsInfo']} />);
    });

    test('should mount the modal content without the Settings deep link', () => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.queryByTestId('GlobalMetricsInfoModal-definitions-link'),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * @description Polling-lifecycle smoke test. The real `clearInterval` lives in
   * `usePollServerMetrics` (a different package), so here we run that hook for
   * real (delegating the module mock to the actual implementation) over a
   * stubbed `fetch` + fake timers, and assert that unmounting `GlobalMetrics`
   * stops further polling — no additional fetches fire after the component is
   * gone.
   */
  describe('polling lifecycle on unmount', () => {
    test('stops fetching after the component unmounts', async () => {
      cleanup();
      vi.useFakeTimers();

      const fetchMock = vi.fn(async () => ({
        json: async () => ({ data: { serverMetrics: null } }),
        ok: true,
        status: 200,
      }));
      vi.stubGlobal('fetch', fetchMock);

      const actual = await vi.importActual<
        typeof import('@openthrottle/react-router-ui')
      >('@openthrottle/react-router-ui');
      mockUsePollServerMetrics.mockImplementation(actual.usePollServerMetrics);

      try {
        // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
        const Component = () => (
          <GlobalProviders>
            <GlobalMetrics pollIntervalMs={1_000} />
          </GlobalProviders>
        );
        const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
        const { unmount } = render(<RoutesStub />);

        // Let the initial fetch + a couple of intervals fire while mounted.
        await vi.advanceTimersByTimeAsync(2_500);
        expect(fetchMock.mock.calls.length).toBeGreaterThan(0);

        const callsBeforeUnmount = fetchMock.mock.calls.length;
        unmount();

        // No further polling should occur once the interval is cleared.
        await vi.advanceTimersByTimeAsync(5_000);
        expect(fetchMock.mock.calls.length).toBe(callsBeforeUnmount);
      } finally {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        mockUsePollServerMetrics.mockReset();
      }
    });
  });
});
