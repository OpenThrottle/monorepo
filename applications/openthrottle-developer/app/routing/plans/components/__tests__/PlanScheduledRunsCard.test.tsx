import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { PlanScheduledRunsCardProps } from '../PlanScheduledRunsCard';
import { PlanScheduledRunsCard } from '../PlanScheduledRunsCard';

type Row = PlanScheduledRunsCardProps['planRunAuditRows'][number];

const run = (id: string, status: string): Row => {
  return {
    __typename: 'PlanRunObject',
    createdAt: '2026-11-01T00:00:00.000Z',
    executionBackend: 'claude',
    heartbeatExpected: true,
    id,
    isStale: false,
    model: 'claude-opus',
    runConfigSnapshotJson: null,
    runKind: 'orchestrator',
    scheduledFor: status === 'SCHEDULED' ? '2026-11-09T09:00:00.000Z' : null,
    status,
  };
};

const NO_PLAN_SCHEDULE = { scheduledRunAt: null, scheduledRunId: null };

const renderCard = (
  overrides: Partial<PlanScheduledRunsCardProps>,
): RenderResult => {
  const props: PlanScheduledRunsCardProps = {
    planId: 'plan-1',
    planRunAuditRows: [],
    scheduledRun: NO_PLAN_SCHEDULE,
    ...overrides,
  };
  const Component = () => {
    return (
      <TooltipProvider>
        <span data-testid="route-rendered" />
        <PlanScheduledRunsCard {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: () => ({}),
      loader: () => null,
      path: '/plans/:planId',
    },
  ]);

  return render(<RoutesStub initialEntries={['/plans/plan-1']} />);
};

describe('PlanScheduledRunsCard', () => {
  describe('when nothing is scheduled', () => {
    test('renders nothing, even with run history', async () => {
      const component = renderCard({
        planRunAuditRows: [run('done', 'COMPLETED')],
      });

      await component.findByTestId('route-rendered');
      expect(component.queryByTestId('PlanScheduledRunsCard')).toBeNull();
    });
  });

  describe('when runs are scheduled', () => {
    test('lists every SCHEDULED run and none of the history', async () => {
      const component = renderCard({
        planRunAuditRows: [
          run('done', 'COMPLETED'),
          run('later', 'SCHEDULED'),
          run('sooner', 'SCHEDULED'),
        ],
      });

      expect(
        await component.findByTestId('PlanScheduledRunsCard'),
      ).toBeInTheDocument();
      expect(
        component.getAllByTestId('PlanWorkflowRunUpcoming-item'),
      ).toHaveLength(2);
    });
  });

  describe('when only the plan backstop knows the scheduled run', () => {
    test('shows that run from plan.scheduledRunId', async () => {
      const component = renderCard({
        scheduledRun: {
          scheduledRunAt: '2026-11-09T09:00:00.000Z',
          scheduledRunId: 'run-outside-history',
        },
      });

      const items = await component.findAllByTestId(
        'PlanWorkflowRunUpcoming-item',
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute('data-kind', 'backstop');
    });
  });
});
