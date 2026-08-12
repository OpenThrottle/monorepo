import * as React from 'react';
import { render, within } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GlobalMetricsStatCards } from '../GlobalMetricsStatCards';
import type { GlobalMetricsStatCardsProps } from '../GlobalMetricsStatCards';

describe('GlobalMetricsStatCards Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsStatCardsProps;

  beforeEach(() => {
    props = {
      serverMetrics: {
        cpuSystemMs: 12.4,
        cpuUserMs: 34.6,
        externalMb: 5.111,
        heapTotalMb: 80.002,
        heapUsedMb: 40.005,
        rssMb: 120.009,
      },
    };

    const Component = () => <GlobalMetricsStatCards {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the stat cards container with the stable test id', () => {
    expect(component.getByTestId('GlobalMetrics-data')).toBeInTheDocument();
  });

  test('renders RSS / External card with rounded MB values', () => {
    const root = component.getByTestId('GlobalMetrics-data');
    expect(within(root).getByText('RSS / External (MB)')).toBeInTheDocument();
    expect(within(root).getByText('120.01')).toBeInTheDocument();
    expect(within(root).getByText('5.11')).toBeInTheDocument();
  });

  test('renders Heap card with rounded MB values', () => {
    const root = component.getByTestId('GlobalMetrics-data');
    expect(within(root).getByText('Heap (MB)')).toBeInTheDocument();
    expect(within(root).getByText('40.01')).toBeInTheDocument();
    expect(within(root).getByText('80')).toBeInTheDocument();
  });

  test('renders CPU card with rounded ms values', () => {
    const root = component.getByTestId('GlobalMetrics-data');
    expect(
      within(root).getByText('CPU (ms) user / system'),
    ).toBeInTheDocument();
    expect(within(root).getByText('35')).toBeInTheDocument();
    expect(within(root).getByText('12')).toBeInTheDocument();
  });
});
