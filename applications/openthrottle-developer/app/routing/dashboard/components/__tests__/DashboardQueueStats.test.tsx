import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardQueueStats } from '../DashboardQueueStats';
import type { DashboardQueueStatsProps } from '../DashboardQueueStats';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

function renderDashboardQueueStats(
  props: DashboardQueueStatsProps,
): RenderResult {
  const Component = () => <DashboardQueueStats {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(
    <TooltipProvider>
      <RoutesStub />
    </TooltipProvider>,
  );
}

const twoQueues: ReadonlyArray<DashboardQueueStatsCardFragment> = [
  {
    __typename: 'QueueStatsObject',
    activeCount: 1,
    completedCount: 10,
    delayedCount: 0,
    failedCount: 0,
    name: 'default',
    waitingCount: 2,
  },
  {
    __typename: 'QueueStatsObject',
    activeCount: 0,
    completedCount: 5,
    delayedCount: 1,
    failedCount: 1,
    name: 'notifications',
    waitingCount: 0,
  },
];

describe('DashboardQueueStats Component', () => {
  let component: RenderResult;
  let props: DashboardQueueStatsProps;

  beforeEach(() => {
    props = {
      data: [],
    };

    component = renderDashboardQueueStats(props);
  });

  test('should have data-testid when empty', () => {
    const card = component.getByTestId('DashboardQueueStats');
    expect(card).toBeInTheDocument();
    expect(component.getByText('No queues')).toBeInTheDocument();
  });

  describe('when data is provided', () => {
    beforeEach(() => {
      cleanup();
      props = { data: [...twoQueues] };
      component = renderDashboardQueueStats(props);
    });

    test('should render queue list with queue data', () => {
      const card = component.getByTestId('DashboardQueueStats');
      expect(card).toBeInTheDocument();
      expect(component.getByLabelText('Queue stats list')).toBeInTheDocument();
      expect(component.getByText('default')).toBeInTheDocument();
      expect(component.getByText('notifications')).toBeInTheDocument();
    });

    test('should show delayed count when delayedCount > 0', () => {
      expect(component.getByText(/D:1/)).toBeInTheDocument();
    });
  });
});
