import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueStateChart } from '../QueueStateChart';
import type { QueueStateChartProps } from '../QueueStateChart';
import type { QueueCardFragment } from '~/__generated__/graphql';

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
    completedCount: 40,
    delayedCount: 2,
    failedCount: 1,
    name: 'notifications',
    waitingCount: 3,
  },
];

const renderChart = (props: QueueStateChartProps): RenderResult => {
  const Component = () => <QueueStateChart {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueStateChart Component', () => {
  describe('when queues is empty', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderChart({ queues: [] });
    });

    test('should render region with title', () => {
      expect(component.getByTestId('QueueStateChart')).toBeInTheDocument();
      expect(
        component.getByRole('heading', {
          level: 2,
          name: 'Job counts by state',
        }),
      ).toBeInTheDocument();
    });

    test('should show empty-state copy and no chart canvas', () => {
      expect(component.getByText(/No queues to chart/i)).toBeInTheDocument();
      expect(
        component.queryByTestId('queue-state-chart-canvas'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('queue-state-chart-view'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when queues has items', () => {
    let component: RenderResult;

    beforeEach(() => {
      component = renderChart({ queues: mockQueues });
    });

    test('should render the chart canvas and view toggle', () => {
      expect(
        component.getByTestId('queue-state-chart-canvas'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('queue-state-chart-view'),
      ).toBeInTheDocument();
    });

    test('should default to the aggregate (single) view', () => {
      expect(
        component.getByText(/All queues combined into one bar/i),
      ).toBeInTheDocument();
      expect(
        component.queryByText(/One bar per queue/i),
      ).not.toBeInTheDocument();
    });

    test('should switch to the by-queue view on toggle click', async () => {
      const user = userEvent.setup();

      await user.click(component.getByText('By queue'));

      expect(component.getByText(/One bar per queue/i)).toBeInTheDocument();
      expect(
        component.queryByText(/All queues combined into one bar/i),
      ).not.toBeInTheDocument();
    });

    test('should keep a view active when the active toggle is re-clicked', async () => {
      const user = userEvent.setup();

      // Radix single-select emits '' on re-click; the guard keeps aggregate.
      await user.click(component.getByText('Single'));

      expect(
        component.getByText(/All queues combined into one bar/i),
      ).toBeInTheDocument();
    });
  });
});
