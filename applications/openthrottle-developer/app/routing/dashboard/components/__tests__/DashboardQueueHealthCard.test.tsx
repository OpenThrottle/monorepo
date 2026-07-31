import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { DashboardQueueHealthCard } from '../DashboardQueueHealthCard';
import type { DashboardQueueHealthCardProps } from '../DashboardQueueHealthCard';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';

const queue = (
  overrides: Partial<DashboardQueueStatsCardFragment> & { name: string },
): DashboardQueueStatsCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 0,
  completedCount: 0,
  delayedCount: 0,
  failedCount: 0,
  waitingCount: 0,
  ...overrides,
});

const renderCard = (props: DashboardQueueHealthCardProps): RenderResult => {
  const Component = () => <DashboardQueueHealthCard {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('DashboardQueueHealthCard Component', () => {
  test('renders an empty state and a link to the ops console', () => {
    const component = renderCard({ queues: [] });

    expect(
      component.getByTestId('DashboardQueueHealthCard'),
    ).toBeInTheDocument();
    expect(
      component.getByText('No queues registered yet.'),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: /View all/ })).toHaveAttribute(
      'href',
      '/queues',
    );
  });

  test('ranks the least-healthy queues first and links each into its detail route', () => {
    const component = renderCard({
      queues: [
        queue({ completedCount: 500, name: 'healthy-queue' }),
        queue({ failedCount: 40, name: 'critical-queue' }),
        queue({ failedCount: 2, name: 'degraded-queue' }),
      ],
    });

    const links = component.getAllByRole('link', {
      name: /-queue$/,
    });
    // Critical (40 failed) ranks before degraded (2 failed) before healthy.
    expect(links[0]).toHaveTextContent('critical-queue');
    expect(links[0]).toHaveAttribute('href', '/queues/critical-queue');
    expect(links[1]).toHaveTextContent('degraded-queue');
    expect(links[2]).toHaveTextContent('healthy-queue');

    expect(component.getByText('40 failed · 0 backlog')).toBeInTheDocument();
  });
});
