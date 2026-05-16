import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesStats } from '../QueuesStats';
import type { QueuesStatsProps } from '../QueuesStats';
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
      const StatsComponent = () => <QueuesStats {...props} />;
      const RoutesStub = createRoutesStub([
        { Component: StatsComponent, path: '/' },
      ]);
      component.rerender(<RoutesStub />);
    });

    test('should render grouped bar chart container', () => {
      const section = component.getByTestId('QueuesStats');
      expect(
        section.querySelector('.recharts-responsive-container'),
      ).toBeInTheDocument();
    });

    test('should describe all table metrics', () => {
      expect(
        component.getByText(
          /Waiting, delayed, in flight, completed, and failed/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
