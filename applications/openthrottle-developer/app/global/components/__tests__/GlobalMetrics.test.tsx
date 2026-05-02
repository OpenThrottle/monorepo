import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { usePollServerMetrics } from '@openthrottle/react-router-ui';
import { GlobalMetrics } from '../GlobalMetrics';
import type { GlobalMetricsProps } from '../GlobalMetrics';

const STORAGE_KEY = 'openthrottle-developer:metricsPollInterval';

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

    const Component = () => <GlobalMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render server metrics heading and poll interval control', () => {
    expect(
      component.getByRole('heading', { name: 'Server metrics' }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('GlobalMetrics-poll-interval'),
    ).toBeInTheDocument();
  });

  test('should show poll-interval select with default 60s', () => {
    const select = component.getByTestId('GlobalMetrics-poll-interval');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('60s');
  });

  test('should show loading when usePollServerMetrics returns loading true', () => {
    cleanup();
    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: true,
      serverMetrics: null,
    });
    const Component = () => <GlobalMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);
    expect(getByTestId('GlobalMetrics-loading')).toBeInTheDocument();
  });

  test('should show error when usePollServerMetrics returns error', () => {
    cleanup();
    mockUsePollServerMetrics.mockReturnValue({
      error: new Error('Fetch failed'),
      loading: false,
      serverMetrics: null,
    });
    const Component = () => <GlobalMetrics {...props} />;
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
      <GlobalMetrics {...props} pollIntervalMs={15_000} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);
    expect(mockUsePollServerMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 15_000 }),
    );
  });

  test('should restore poll interval from localStorage on mount', () => {
    component.unmount();
    localStorageStub[STORAGE_KEY] = '5000';
    mockUsePollServerMetrics.mockClear();
    const Component = () => <GlobalMetrics />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);
    expect(mockUsePollServerMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMs: 5_000 }),
    );
    const select = getByTestId('GlobalMetrics-poll-interval');
    expect(select).toHaveTextContent('5s');
  });

  test('should update interval and persist to localStorage when user selects a preset', async () => {
    const user = userEvent.setup();
    const select = component.getByTestId('GlobalMetrics-poll-interval');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: '15s' }));
    expect(select).toHaveTextContent('15s');
    expect(localStorageStub[STORAGE_KEY]).toBe('15000');
    expect(mockUsePollServerMetrics).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalMs: 15_000 }),
    );
  });

  test('should persist Off (0) when user selects Off', async () => {
    const user = userEvent.setup();
    const select = component.getByTestId('GlobalMetrics-poll-interval');
    await user.click(select);
    await user.click(await screen.findByRole('option', { name: 'Off' }));
    expect(select).toHaveTextContent('Off');
    expect(localStorageStub[STORAGE_KEY]).toBe('0');
    expect(mockUsePollServerMetrics).toHaveBeenLastCalledWith(
      expect.objectContaining({ intervalMs: 0 }),
    );
  });

  test('should render exactly three consolidated stat cards when data is loaded', () => {
    cleanup();
    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: false,
      serverMetrics: {
        cpuSystemMs: 250,
        cpuUserMs: 1000,
        externalMb: 2.1,
        heapTotalMb: 96.75,
        heapUsedMb: 64.25,
        rssMb: 128.5,
      },
    });
    const Component = () => <GlobalMetrics />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getAllByTestId } = render(<RoutesStub />);
    const roots = getAllByTestId('GlobalMetrics');
    const dataEl = within(roots[0]).getByTestId('GlobalMetrics-data');
    const statCards = within(dataEl).getAllByTestId('OpenThrottleStatCard');
    expect(statCards).toHaveLength(3);
  });

  test('should display consolidated stat cards with subValue (value / subValue) when data is loaded', () => {
    cleanup();
    mockUsePollServerMetrics.mockReturnValue({
      error: null,
      loading: false,
      serverMetrics: {
        cpuSystemMs: 250,
        cpuUserMs: 1000,
        externalMb: 2.1,
        heapTotalMb: 96.75,
        heapUsedMb: 64.25,
        rssMb: 128.5,
      },
    });
    const Component = () => <GlobalMetrics />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);
    const dataEl = getByTestId('GlobalMetrics-data');
    expect(dataEl).toBeInTheDocument();

    const data = within(dataEl);
    const statCards = data.getAllByTestId('OpenThrottleStatCard');
    expect(statCards).toHaveLength(3);
    expect(
      within(statCards[0]).getByText('RSS / External (MB)'),
    ).toBeInTheDocument();
    expect(
      within(statCards[0]).getByText((128.5).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      within(statCards[0]).getByText((2.1).toLocaleString()),
    ).toBeInTheDocument();
    expect(within(statCards[1]).getByText('Heap (MB)')).toBeInTheDocument();
    expect(
      within(statCards[1]).getByText((64.25).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      within(statCards[1]).getByText((96.75).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      within(statCards[2]).getByText('CPU (ms) user / system'),
    ).toBeInTheDocument();
    expect(
      within(statCards[2]).getByText((1000).toLocaleString()),
    ).toBeInTheDocument();
    expect(
      within(statCards[2]).getByText((250).toLocaleString()),
    ).toBeInTheDocument();
  });

  test('should show stat card titles for RSS/External, Heap, and CPU', () => {
    cleanup();
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
    const Component = () => <GlobalMetrics />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getAllByTestId } = render(<RoutesStub />);
    const roots = getAllByTestId('GlobalMetrics');
    const dataEl = within(roots[0]).getByTestId('GlobalMetrics-data');
    expect(within(dataEl).getByText('RSS / External (MB)')).toBeInTheDocument();
    expect(within(dataEl).getByText('Heap (MB)')).toBeInTheDocument();
    expect(
      within(dataEl).getByText('CPU (ms) user / system'),
    ).toBeInTheDocument();
  });

  test('should render metrics chart card when data is loaded', () => {
    cleanup();
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
    const Component = () => <GlobalMetrics />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getAllByTestId } = render(<RoutesStub />);
    const roots = getAllByTestId('GlobalMetrics');
    const chartCard = within(roots[0]).getByTestId('GlobalMetrics-chart-card');
    expect(chartCard).toBeInTheDocument();
    expect(
      within(roots[0]).getByRole('heading', { name: 'Metrics over time' }),
    ).toBeInTheDocument();
    expect(chartCard.innerHTML).toContain('hsl(30 18% 55%)');
    expect(chartCard.innerHTML).toContain('hsl(160 18% 48%)');
    expect(chartCard.innerHTML).toContain('hsl(220 18% 52%)');
  });

  describe('Metrics interpretation tooltip', () => {
    test('should render info icon trigger next to Server metrics heading', () => {
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute(
        'aria-label',
        'Metrics interpretation help',
      );
    });

    test('should show tooltip content when info icon is hovered', async () => {
      const user = userEvent.setup();
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      await user.hover(trigger);

      const tooltip = await component.findByTestId(
        'GlobalMetrics-info-tooltip',
      );
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Understanding these metrics');
      expect(tooltip).toHaveTextContent('RSS');
      expect(tooltip).toHaveTextContent('Heap');
      expect(tooltip).toHaveTextContent('CPU ms');
    });

    test('should explain RSS metric in tooltip content', async () => {
      const user = userEvent.setup();
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      await user.hover(trigger);

      const tooltip = await component.findByTestId(
        'GlobalMetrics-info-tooltip',
      );
      expect(tooltip).toHaveTextContent('Total process memory');
      expect(tooltip).toHaveTextContent('Under 500MB is typical');
    });

    test('should explain Heap metric in tooltip content', async () => {
      const user = userEvent.setup();
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      await user.hover(trigger);

      const tooltip = await component.findByTestId(
        'GlobalMetrics-info-tooltip',
      );
      expect(tooltip).toHaveTextContent('JS heap memory');
      expect(tooltip).toHaveTextContent('memory pressure');
    });

    test('should explain CPU metric in tooltip content', async () => {
      const user = userEvent.setup();
      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      await user.hover(trigger);

      const tooltip = await component.findByTestId(
        'GlobalMetrics-info-tooltip',
      );
      expect(tooltip).toHaveTextContent('Cumulative user/system CPU time');
      expect(tooltip).toHaveTextContent('Rising steadily is normal');
    });
  });
});
