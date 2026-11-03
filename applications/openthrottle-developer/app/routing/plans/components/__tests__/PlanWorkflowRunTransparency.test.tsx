import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import {
  getDefaultWorkflowRalphRunOptionsInput,
  PLAN_RUN_BULLMQ_QUEUE_NAME,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

import type { PlanWorkflowRunTransparencyProps } from '../PlanWorkflowRunTransparency';
import { PlanWorkflowRunTransparency } from '../PlanWorkflowRunTransparency';

const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';

const baseWorkflow = getDefaultWorkflowRalphRunOptionsInput({ planId });

const completedRun: PlanWorkflowRunTransparencyProps['planRunAuditRows'][number] =
  {
    __typename: 'PlanRunObject',
    bullmqJobId: 'job-snap-1',
    createdAt: '2024-01-02T03:04:05.000Z',
    executionBackend: 'cursor',
    heartbeatExpected: true,
    id: 'run-1',
    isStale: false,
    runConfigSnapshotJson: JSON.stringify({
      ralph: { executionBackend: 'cursor' },
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    }),
    runKind: 'spawn',
    status: 'COMPLETED',
  };

function renderTransparency(
  overrides: Partial<PlanWorkflowRunTransparencyProps> = {},
) {
  const props: PlanWorkflowRunTransparencyProps = {
    planId,
    planRunAuditRows: [],
    planRunMetrics: [],
    scheduledRunAt: null,
    scheduledRunId: null,
    workflowInput: baseWorkflow,
    workflowTimeout: '',
    workingDirectory: '',
    ...overrides,
  };

  const Component = () => (
    <TooltipProvider>
      <PlanWorkflowRunTransparency {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanWorkflowRunTransparency', () => {
  describe('card shell', () => {
    test('keeps the testid and anchor id and titles the card', () => {
      const component = renderTransparency({
        planRunAuditRows: [completedRun],
      });

      const root = component.getByTestId('PlanWorkflowRunTransparency');
      expect(root).toHaveAttribute('id', 'plan-workflow-run-transparency');
      expect(
        component.getByRole('heading', {
          level: 2,
          name: PLAN_RUN_TRANSPARENCY_COPY.title,
        }),
      ).toBeInTheDocument();
    });

    test('no longer renders the canonical argv block', () => {
      const component = renderTransparency({
        planRunAuditRows: [completedRun],
      });

      expect(
        component.queryByTestId('PlanWorkflowRunTransparency-canonical-cli'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the plan has runs', () => {
    test('renders the run history section and no Empty', () => {
      const component = renderTransparency({
        planRunAuditRows: [completedRun],
      });

      expect(
        component.getByRole('region', {
          name: PLAN_RUN_TRANSPARENCY_COPY.history.heading,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByTestId(`PlanWorkflowRunHistoryRow-${completedRun.id}`),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('PlanWorkflowRunTransparency-empty'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when only plan.scheduledRunId is set', () => {
    test('shows the backstop Upcoming item and no Empty or Latest run', () => {
      const component = renderTransparency({
        scheduledRunAt: '2030-01-01T00:00:00.000Z',
        scheduledRunId: 'run-sched',
      });

      expect(
        component.queryByTestId('PlanWorkflowRunTransparency-empty'),
      ).not.toBeInTheDocument();
      expect(
        component.getByTestId('PlanWorkflowRunUpcoming'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('PlanWorkflowRunLatest'),
      ).not.toBeInTheDocument();
    });
  });

  describe('section order', () => {
    test('renders Upcoming, Latest run, then Run history', () => {
      const component = renderTransparency({
        planRunAuditRows: [
          completedRun,
          {
            ...completedRun,
            bullmqJobId: null,
            id: 'run-sched',
            scheduledFor: '2030-01-01T00:00:00.000Z',
            status: 'SCHEDULED',
          },
        ],
      });

      const headings = component
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);
      expect(headings).toEqual([
        PLAN_RUN_TRANSPARENCY_COPY.upcoming.heading,
        PLAN_RUN_TRANSPARENCY_COPY.latest.heading,
        PLAN_RUN_TRANSPARENCY_COPY.history.heading,
        PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
      ]);
    });
  });

  describe('when the plan has no runs and nothing scheduled', () => {
    test('shows one Empty in place of the run sections', () => {
      const component = renderTransparency();

      const empty = component.getByTestId('PlanWorkflowRunTransparency-empty');
      expect(empty).toHaveTextContent(PLAN_RUN_TRANSPARENCY_COPY.empty.title);
      expect(
        component.queryByRole('region', {
          name: PLAN_RUN_TRANSPARENCY_COPY.history.heading,
        }),
      ).not.toBeInTheDocument();
    });

    test('still renders CLI & debug', () => {
      const component = renderTransparency();

      expect(
        component.getByRole('button', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('CLI & debug', () => {
    test('is collapsed by default', () => {
      const component = renderTransparency();

      const trigger = component.getByRole('button', {
        name: PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByRole('button', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.copyDebugBundle,
        }),
      ).not.toBeInTheDocument();
    });

    test('expands on click to show the actions as buttons', async () => {
      const user = userEvent.setup();
      const component = renderTransparency();

      await user.click(
        component.getByRole('button', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
        }),
      );

      expect(
        component.getByRole('button', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.copyDebugBundle,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', {
          name: new RegExp(PLAN_RUN_BULLMQ_QUEUE_NAME, 'i'),
        }),
      ).toHaveAttribute(
        'href',
        `/queues/${encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME)}`,
      );
      expect(
        component.getByRole('link', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.configurationLink,
        }),
      ).toHaveAttribute('href', `/plans/${planId}?tab=configuration`);
      expect(
        component.getByText(PLAN_RUN_TRANSPARENCY_COPY.cli.diffEmpty),
      ).toBeInTheDocument();
    });

    test('expands from the keyboard', async () => {
      const user = userEvent.setup();
      const component = renderTransparency();

      const trigger = component.getByRole('button', {
        name: PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
      });
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('lists tuning that differs from the defaults', async () => {
      const user = userEvent.setup();
      const component = renderTransparency({
        workflowInput: { ...baseWorkflow, iterations: 3 },
      });

      await user.click(
        component.getByRole('button', {
          name: PLAN_RUN_TRANSPARENCY_COPY.cli.heading,
        }),
      );

      expect(
        component.queryByText(PLAN_RUN_TRANSPARENCY_COPY.cli.diffEmpty),
      ).not.toBeInTheDocument();
      expect(component.getAllByRole('listitem').length).toBeGreaterThan(0);
    });
  });
});
