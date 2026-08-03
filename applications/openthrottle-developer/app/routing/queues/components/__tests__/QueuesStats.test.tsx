import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesStats } from '../QueuesStats';
import type { QueuesStatsProps } from '../QueuesStats';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  REPRESENTATIVE_SKEWED_QUEUES,
  maxSingleSeriesForQueues,
  queueStatsChartHeight,
  queuesToStatsChartData,
} from '~/routing/queues/utils/queue-stats-chart';

const mockQueues: QueueCardFragment[] = [
  {
    __typename: 'QueueStatsObject',
    activeCount: 2,
    completedCount: 100,
    delayedCount: 1,
    failedCount: 0,
    name: 'default',
    waitingCount: 5,
  },
  {
    __typename: 'QueueStatsObject',
    activeCount: 0,
    completedCount: 0,
    delayedCount: 0,
    failedCount: 0,
    name: 'notifications',
    waitingCount: 0,
  },
];

describe('QueuesStats Component', () => {
  let component: RenderResult;
  let props: QueuesStatsProps;

  beforeEach(() => {
    props = { queues: [] };

    const Component = () => <QueuesStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render stats region with title', () => {
    expect(component.getByTestId('QueuesStats')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'Job counts by queue' }),
    ).toBeInTheDocument();
  });

  test('should show empty state copy and no chart when queues is empty', () => {
    expect(component.getByText(/No queues to chart/i)).toBeInTheDocument();
    expect(
      component
        .getByTestId('QueuesStats')
        .querySelector('.recharts-responsive-container'),
    ).not.toBeInTheDocument();
  });

  describe('when queues has items', () => {
    beforeEach(() => {
      props = { queues: mockQueues };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const StatsComponent = () => <QueuesStats {...props} />;
      const RoutesStub = createRoutesStub([
        { Component: StatsComponent, path: '/' },
      ]);
      component.rerender(<RoutesStub />);
    });

    test('should render grouped bar chart container with scaled height', () => {
      const section = component.getByTestId('QueuesStats');
      const chartWrapper = component.getByTestId('queues-stats-chart');
      expect(chartWrapper).toBeInTheDocument();
      expect(chartWrapper).toHaveStyle({ minHeight: '300px' });
      expect(
        section.querySelector('.recharts-responsive-container'),
      ).toBeInTheDocument();
    });

    test('should describe completed-on default view and tooltip parity', () => {
      expect(
        component.getByText(/including completed history/i),
      ).toBeInTheDocument();
      expect(
        component.getByText(/Hover a bar for exact counts/i),
      ).toBeInTheDocument();
    });

    test('should render show completed toggle defaulting on', () => {
      const toggle = component.getByTestId('queues-stats-show-completed');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toBeChecked();
    });

    test('should update description when show completed is disabled', async () => {
      const user = userEvent.setup();
      await user.click(component.getByTestId('queues-stats-show-completed'));

      expect(
        component.getByText(/backlog and active work/i),
      ).toBeInTheDocument();
    });
  });

  describe('when queues include high-volume plans completed history', () => {
    beforeEach(() => {
      props = { queues: [...REPRESENTATIVE_SKEWED_QUEUES] };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const StatsComponent = () => <QueuesStats {...props} />;
      const RoutesStub = createRoutesStub([
        { Component: StatsComponent, path: '/' },
      ]);
      component.rerender(<RoutesStub />);
    });

    test('should render chart with scaled height for multiple queues', () => {
      const chartWrapper = component.getByTestId('queues-stats-chart');
      const expectedHeight = queueStatsChartHeight(
        REPRESENTATIVE_SKEWED_QUEUES.length,
      );

      expect(chartWrapper).toBeInTheDocument();
      expect(chartWrapper).toHaveStyle({ minHeight: `${expectedHeight}px` });
      expect(
        component
          .getByTestId('QueuesStats')
          .querySelector('.recharts-responsive-container'),
      ).toBeInTheDocument();
    });

    test('should default to completed view with completed toggle on', () => {
      expect(
        component.getByText(/including completed history/i),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('queues-stats-show-completed'),
      ).toBeChecked();
    });

    test('should sort chart rows with plans first by total jobs', () => {
      const rowNames = queuesToStatsChartData(REPRESENTATIVE_SKEWED_QUEUES).map(
        (row) => row.name,
      );

      expect(rowNames[0]).toBe('plans');
      expect(rowNames).toContain('embeddings-ingest');
      expect(rowNames).toContain('default');
    });

    test('should keep operational X-scale max far below plans completed volume', () => {
      const operationalMax = maxSingleSeriesForQueues(
        REPRESENTATIVE_SKEWED_QUEUES,
        false,
      );
      const fullMax = maxSingleSeriesForQueues(
        REPRESENTATIVE_SKEWED_QUEUES,
        true,
      );

      expect(operationalMax).toBe(22);
      expect(fullMax).toBe(48_200);
      expect(operationalMax / fullMax).toBeLessThan(0.01);
    });
  });
});
