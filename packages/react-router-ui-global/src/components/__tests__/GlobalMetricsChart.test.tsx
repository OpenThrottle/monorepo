import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GlobalMetricsChart } from '../GlobalMetricsChart';
import type { GlobalMetricsChartProps } from '../GlobalMetricsChart';
import type { MetricsChartDatum } from '../../utils/storage';

/**
 * @description jsdom has no layout engine, so Recharts' `ResponsiveContainer`
 * renders zero-size and skips its children (no ticks/lines/points ever
 * appear). We only assert the wrapper renders with the stable test id and
 * that the component accepts prop-driven data without throwing.
 */
describe('GlobalMetricsChart Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsChartProps;

  const sample: MetricsChartDatum = {
    cpuSystemMs: 12,
    cpuUserMs: 34,
    externalMb: 5,
    heapTotalMb: 80,
    heapUsedMb: 40,
    i: 0,
    rssMb: 120,
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = { data: [sample] };

    const Component = () => <GlobalMetricsChart {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the chart card root with the stable test id', () => {
    expect(
      component.getByTestId('GlobalMetrics-chart-card'),
    ).toBeInTheDocument();
  });

  test('renders without throwing when given multiple data points', () => {
    cleanup();
    const data: MetricsChartDatum[] = [
      sample,
      { ...sample, i: 1, rssMb: 130 },
      { ...sample, i: 2, rssMb: 125 },
    ];

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <GlobalMetricsChart data={data} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('GlobalMetrics-chart-card')).toBeInTheDocument();
  });

  test('renders without throwing when given an empty data array', () => {
    cleanup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <GlobalMetricsChart data={[]} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('GlobalMetrics-chart-card')).toBeInTheDocument();
  });
});
