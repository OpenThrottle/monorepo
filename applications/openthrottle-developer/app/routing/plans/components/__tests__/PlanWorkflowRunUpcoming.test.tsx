import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import {
  PLAN_RUN_CANCEL_SCHEDULED_COPY,
  PLAN_RUN_TRANSPARENCY_COPY,
} from '~/routing/plans/data/data.copy';

import type { PlanWorkflowRunUpcomingProps } from '../PlanWorkflowRunUpcoming';
import { PlanWorkflowRunUpcoming } from '../PlanWorkflowRunUpcoming';

type Row = PlanWorkflowRunUpcomingProps['planRunAuditRows'][number];

const scheduledRow = (id: string, scheduledFor: string | null): Row => ({
  __typename: 'PlanRunObject',
  createdAt: '2026-11-01T00:00:00.000Z',
  executionBackend: 'claude',
  heartbeatExpected: true,
  id,
  isStale: false,
  model: 'claude-opus',
  runConfigSnapshotJson: JSON.stringify({
    ralph: { effort: 'high' },
    workspace: { workingDirectory: '/tmp/wt' },
  }),
  runKind: 'spawn',
  scheduledFor,
  status: 'SCHEDULED',
});

const NO_PLAN_SCHEDULE = { scheduledRunAt: null, scheduledRunId: null };

const renderUpcoming = (overrides: Partial<PlanWorkflowRunUpcomingProps>) => {
  const props: PlanWorkflowRunUpcomingProps = {
    planId: 'plan-1',
    planRunAuditRows: [],
    scheduledRun: NO_PLAN_SCHEDULE,
    ...overrides,
  };
  const Component = () => (
    <TooltipProvider>
      <span data-testid="route-rendered" />
      <PlanWorkflowRunUpcoming {...props} />
    </TooltipProvider>
  );
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

describe('PlanWorkflowRunUpcoming', () => {
  describe('when nothing is scheduled', () => {
    test('renders nothing', async () => {
      const component = renderUpcoming({});

      await component.findByTestId('route-rendered');
      expect(
        component.queryByTestId('PlanWorkflowRunUpcoming'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when one run is scheduled', () => {
    test('shows a labelled section with fire time, badge, meta and Cancel', async () => {
      const component = renderUpcoming({
        planRunAuditRows: [scheduledRow('s1', '2026-11-04T15:00:00.000Z')],
      });

      const section = await component.findByRole('region', {
        name: PLAN_RUN_TRANSPARENCY_COPY.upcoming.heading,
      });
      const item = within(section).getByTestId('PlanWorkflowRunUpcoming-item');
      expect(item).toHaveAttribute('data-kind', 'run');
      expect(within(item).getByTestId('PlanRunTime').tagName).toBe('TIME');
      expect(
        within(item).getByTestId('PlanRunStatusBadge'),
      ).toBeInTheDocument();
      expect(within(item).getByTestId('PlanRunMetaList')).toBeInTheDocument();
      expect(
        within(item).getByRole('button', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when several runs are scheduled', () => {
    test('lists them soonest first', async () => {
      const component = renderUpcoming({
        planRunAuditRows: [
          scheduledRow('later', '2026-11-06T15:00:00.000Z'),
          scheduledRow('soon', '2026-11-04T15:00:00.000Z'),
        ],
      });

      const items = await component.findAllByTestId(
        'PlanWorkflowRunUpcoming-item',
      );
      const times = items.map((item) =>
        within(item).getByTestId('PlanRunTime').getAttribute('dateTime'),
      );
      expect(times).toEqual([
        '2026-11-04T15:00:00.000Z',
        '2026-11-06T15:00:00.000Z',
      ]);
    });
  });

  describe('when plan.scheduledRunId is not in the list', () => {
    test('adds a backstop item with fire time and Cancel but no meta', async () => {
      const component = renderUpcoming({
        scheduledRun: {
          scheduledRunAt: '2026-11-04T15:00:00.000Z',
          scheduledRunId: 'outside-window',
        },
      });

      const item = await component.findByTestId('PlanWorkflowRunUpcoming-item');
      expect(item).toHaveAttribute('data-kind', 'backstop');
      expect(within(item).getByTestId('PlanRunTime')).toBeInTheDocument();
      expect(within(item).queryByTestId('PlanRunMetaList')).toBeNull();
      expect(item).toHaveTextContent(
        PLAN_RUN_TRANSPARENCY_COPY.upcoming.backstopMeta,
      );
      expect(
        within(item).getByRole('button', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when scheduledFor is unparseable', () => {
    test('shows the fire-time fallback and stays cancellable', async () => {
      const component = renderUpcoming({
        planRunAuditRows: [scheduledRow('s1', 'not a date')],
      });

      const item = await component.findByTestId('PlanWorkflowRunUpcoming-item');
      expect(
        within(item).getByTestId('PlanWorkflowRunUpcoming-fires-unknown'),
      ).toHaveTextContent(PLAN_RUN_TRANSPARENCY_COPY.upcoming.firesUnknown);
      expect(within(item).queryByTestId('PlanRunTime')).toBeNull();
      expect(
        within(item).getByRole('button', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('Cancel', () => {
    test('opens the existing cancel dialog', async () => {
      const user = userEvent.setup();
      const component = renderUpcoming({
        planRunAuditRows: [scheduledRow('s1', '2026-11-04T15:00:00.000Z')],
      });

      await user.click(
        await component.findByRole('button', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
        }),
      );

      expect(
        component.getByRole('heading', {
          name: PLAN_RUN_CANCEL_SCHEDULED_COPY.dialogTitle,
        }),
      ).toBeInTheDocument();
    });
  });
});
