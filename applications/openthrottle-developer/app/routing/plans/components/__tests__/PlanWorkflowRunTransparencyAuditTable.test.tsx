import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import {
  PLAN_RUN_HISTORY_FETCH_LIMIT,
  PLAN_RUN_HISTORY_INITIAL_ROWS,
} from '~/routing/plans/data/data.plan-run-history';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { PlanRunMetricsEntry } from '~/routing/plans/utils/joinPlanRunJobMetrics';

import type { PlanRunAuditRow } from '../PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunTransparencyAuditTable } from '../PlanWorkflowRunTransparencyAuditTable';

const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });
const copy = PLAN_RUN_TRANSPARENCY_COPY.history;

const auditRow = (
  overrides: Partial<PlanRunAuditRow> = {},
): PlanRunAuditRow => {
  return {
    __typename: 'PlanRunObject',
    bullmqJobId: 'job-1',
    createdAt: '2026-11-02T03:04:05.000Z',
    executionBackend: 'claude',
    heartbeatExpected: true,
    id: 'run-1',
    isStale: false,
    model: 'claude-opus',
    runConfigSnapshotJson: null,
    runKind: 'spawn',
    scheduledFor: null,
    status: 'COMPLETED',
    ...overrides,
  };
};

/** `count` COMPLETED runs, one minute apart, newest first. */
const manyRows = (count: number): PlanRunAuditRow[] => {
  return Array.from({ length: count }, (_, index) =>
    auditRow({
      bullmqJobId: `job-${index}`,
      createdAt: new Date(Date.UTC(2026, 10, 2, 3, 59 - index)).toISOString(),
      id: `run-${index}`,
    }),
  );
};

const renderTable = (
  rows: PlanRunAuditRow[],
  metrics: readonly PlanRunMetricsEntry[] = [],
): RenderResult => {
  const Component = () => {
    return (
      <TooltipProvider>
        <PlanWorkflowRunTransparencyAuditTable
          planRunAuditRows={rows}
          planRunMetrics={metrics}
          workflowInput={workflowInput}
          workingDirectory=""
        />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

/** Summary rows carry `data-status`; expanded detail rows do not. */
const bodyRowIds = (component: RenderResult): (string | null)[] => {
  return Array.from(
    component.container.querySelectorAll('tbody tr[data-status]'),
  ).map((element) => element.getAttribute('data-testid'));
};

describe('PlanWorkflowRunTransparencyAuditTable', () => {
  describe('when there is no history', () => {
    test('renders nothing for no rows', () => {
      const component = renderTable([]);

      expect(
        component.queryByTestId('PlanWorkflowRunTransparencyAuditTable'),
      ).toBeNull();
    });

    test('renders nothing when every run is SCHEDULED', () => {
      const component = renderTable([
        auditRow({
          scheduledFor: '2026-11-05T10:00:00.000Z',
          status: 'SCHEDULED',
        }),
      ]);

      expect(
        component.queryByRole('region', { name: copy.heading }),
      ).toBeNull();
    });
  });

  describe('when SCHEDULED runs are mixed in', () => {
    test('excludes them and keeps MISSED and SUPERSEDED, newest first', () => {
      const component = renderTable([
        auditRow({
          createdAt: '2026-11-01T00:00:00.000Z',
          id: 'r-missed',
          status: 'MISSED',
        }),
        auditRow({
          createdAt: '2026-11-04T00:00:00.000Z',
          id: 'r-scheduled',
          scheduledFor: '2026-11-05T10:00:00.000Z',
          status: 'SCHEDULED',
        }),
        auditRow({ createdAt: '2026-11-03T00:00:00.000Z', id: 'r-done' }),
        auditRow({
          createdAt: '2026-11-02T00:00:00.000Z',
          id: 'r-superseded',
          status: 'SUPERSEDED',
        }),
      ]);

      const section = component.getByRole('region', { name: copy.heading });
      expect(within(section).getByRole('table')).toBeInTheDocument();
      expect(bodyRowIds(component)).toEqual([
        'PlanWorkflowRunHistoryRow-r-done',
        'PlanWorkflowRunHistoryRow-r-superseded',
        'PlanWorkflowRunHistoryRow-r-missed',
      ]);
    });
  });

  describe('when a run is stale', () => {
    test('shows the stale badge on that row only', () => {
      const component = renderTable([
        auditRow({ id: 'r-stale', isStale: true, status: 'IN_PROGRESS' }),
        auditRow({ createdAt: '2026-11-01T00:00:00.000Z', id: 'r-fresh' }),
      ]);

      const staleRow = component.getByTestId(
        'PlanWorkflowRunHistoryRow-r-stale',
      );
      const freshRow = component.getByTestId(
        'PlanWorkflowRunHistoryRow-r-fresh',
      );
      expect(
        within(staleRow).getByTestId('PlanWorkflowRunHistoryRow-stale'),
      ).toBeInTheDocument();
      expect(
        within(freshRow).queryByTestId('PlanWorkflowRunHistoryRow-stale'),
      ).toBeNull();
    });

    test('shows a single "Stale" when the status itself is STALE', () => {
      const component = renderTable([
        auditRow({ id: 'r-stale', isStale: true, status: 'STALE' }),
      ]);

      const staleRow = component.getByTestId(
        'PlanWorkflowRunHistoryRow-r-stale',
      );
      expect(
        within(staleRow).queryByTestId('PlanWorkflowRunHistoryRow-stale'),
      ).toBeNull();
      expect(
        within(staleRow).getByTestId('PlanRunStatusBadge'),
      ).toHaveAttribute('data-status', 'STALE');
    });
  });

  describe('when a row is expanded and collapsed', () => {
    test('toggles aria-expanded and the detail row', async () => {
      const user = userEvent.setup();
      const component = renderTable([auditRow({ id: 'r-one' })]);
      const toggle = component.getByRole('button', {
        name: copy.expandAriaLabel,
      });

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByTestId('PlanWorkflowRunHistoryRow-r-one-detail'),
      ).toBeNull();

      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const detail = component.getByTestId(
        'PlanWorkflowRunHistoryDetail-r-one',
      );
      expect(
        within(detail).getByRole('link', { name: 'job-1' }),
      ).toHaveAttribute('href', '/queues/Plans/job-1');

      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByTestId('PlanWorkflowRunHistoryRow-r-one-detail'),
      ).toBeNull();
    });

    test('lets several rows stay open at once', async () => {
      const user = userEvent.setup();
      const component = renderTable([
        auditRow({ id: 'r-a' }),
        auditRow({ createdAt: '2026-11-01T00:00:00.000Z', id: 'r-b' }),
      ]);

      const [first, second] = component.getAllByRole('button', {
        name: copy.expandAriaLabel,
      });
      if (first === undefined || second === undefined) {
        throw new Error('expected two row toggles');
      }
      await user.click(first);
      await user.click(second);

      expect(
        component.getByTestId('PlanWorkflowRunHistoryDetail-r-a'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('PlanWorkflowRunHistoryDetail-r-b'),
      ).toBeInTheDocument();
    });
  });

  describe('when the expanded run has no job and a snapshot that differs', () => {
    test('shows the no-job label, the workspace, effort and the diff', async () => {
      const user = userEvent.setup();
      const component = renderTable([
        auditRow({
          bullmqJobId: null,
          id: 'r-cli',
          runConfigSnapshotJson: JSON.stringify({
            ralph: {
              effort: 'high',
              executionBackend: 'claude',
              iterations: 25,
            },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '/tmp/worktrees/plan-0c2720a9' },
          }),
        }),
      ]);

      await user.click(
        component.getByRole('button', { name: copy.expandAriaLabel }),
      );

      const detail = component.getByTestId(
        'PlanWorkflowRunHistoryDetail-r-cli',
      );
      expect(within(detail).getByText(copy.detail.noJob)).toBeInTheDocument();
      expect(
        within(detail).getByText('/tmp/worktrees/plan-0c2720a9'),
      ).toBeInTheDocument();
      expect(within(detail).getByText('high')).toBeInTheDocument();
      expect(
        within(detail).getByText(/Iterations: 25 → 10 \(current\)/),
      ).toBeInTheDocument();
    });
  });

  describe('when the expanded run has completed-job metrics', () => {
    test('shows Finished as a time and the end RSS', async () => {
      const user = userEvent.setup();
      const finishedOn = Date.UTC(2026, 10, 2, 3, 30, 0);
      const component = renderTable(
        [auditRow({ id: 'r-metrics' })],
        [
          {
            executionBackend: 'claude',
            finishedOn,
            jobId: 'job-1',
            taskRunMetrics: { atEnd: { rssMb: 512.34 } },
          },
          {
            executionBackend: 'claude',
            finishedOn,
            jobId: 'job-orphan',
            taskRunMetrics: { atEnd: { rssMb: 1 } },
          },
        ],
      );

      await user.click(
        component.getByRole('button', { name: copy.expandAriaLabel }),
      );

      const detail = component.getByTestId(
        'PlanWorkflowRunHistoryDetail-r-metrics',
      );
      const finished = detail.querySelector('[data-field="finished"]');
      const rss = detail.querySelector('[data-field="rssEnd"]');
      expect(finished?.querySelector('time')).toHaveAttribute(
        'dateTime',
        new Date(finishedOn).toISOString(),
      );
      expect(rss).toHaveTextContent('512.3');
    });
  });

  describe('when the expanded run has no completed-job metrics', () => {
    test('shows an em dash for Finished and RSS', async () => {
      const user = userEvent.setup();
      const component = renderTable([auditRow({ id: 'r-no-metrics' })]);

      await user.click(
        component.getByRole('button', { name: copy.expandAriaLabel }),
      );

      const detail = component.getByTestId(
        'PlanWorkflowRunHistoryDetail-r-no-metrics',
      );
      const finished = detail.querySelector('[data-field="finished"] dd');
      const rss = detail.querySelector('[data-field="rssEnd"] dd');
      expect(finished).toHaveTextContent(copy.detail.none);
      expect(finished?.querySelector('time')).toBeNull();
      expect(rss).toHaveTextContent(copy.detail.none);
    });
  });

  describe('when the detail is open at a narrow width', () => {
    test('repeats model / backend and provenance in narrow-only entries', async () => {
      const user = userEvent.setup();
      const component = renderTable([auditRow({ id: 'r-narrow' })]);

      await user.click(
        component.getByRole('button', { name: copy.expandAriaLabel }),
      );

      const detail = component.getByTestId(
        'PlanWorkflowRunHistoryDetail-r-narrow',
      );
      const modelEntry = detail.querySelector('[data-field="modelBackend"]');
      const branchEntry = detail.querySelector('[data-field="branch"]');
      expect(modelEntry).toHaveClass('sm:hidden');
      expect(branchEntry).toHaveClass('sm:hidden');
      expect(detail.querySelector('[data-field="jobId"]')).not.toHaveClass(
        'sm:hidden',
      );
      expect(within(detail).getByTestId('PlanRunMetaList')).toBeInTheDocument();
    });
  });

  describe('when the row actions menu opens', () => {
    test('offers Open job and Copy run id for a run with a job', async () => {
      const user = userEvent.setup();
      const component = renderTable([auditRow({ id: 'r-job' })]);

      await user.click(
        component.getByRole('button', {
          name: `${copy.actions.menuAriaLabelPrefix} r-job`,
        }),
      );

      expect(
        await component.findByRole('menuitem', { name: copy.actions.openJob }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('menuitem', { name: copy.actions.copyRunId }),
      ).toBeInTheDocument();
    });

    test('offers only Copy run id for a run with no job', async () => {
      const user = userEvent.setup();
      const component = renderTable([
        auditRow({ bullmqJobId: null, id: 'r-cli' }),
      ]);

      await user.click(
        component.getByRole('button', {
          name: `${copy.actions.menuAriaLabelPrefix} r-cli`,
        }),
      );

      expect(
        await component.findByRole('menuitem', {
          name: copy.actions.copyRunId,
        }),
      ).toBeInTheDocument();
      expect(
        component.queryByRole('menuitem', { name: copy.actions.openJob }),
      ).toBeNull();
    });
  });

  describe('when there are more rows than the initial page', () => {
    test('shows the first rows, then reveals the rest on Show more', async () => {
      const user = userEvent.setup();
      const total = PLAN_RUN_HISTORY_INITIAL_ROWS + 1;
      const component = renderTable(manyRows(total));

      expect(bodyRowIds(component)).toHaveLength(PLAN_RUN_HISTORY_INITIAL_ROWS);

      await user.click(
        component.getByRole('button', { name: copy.showMore(1) }),
      );

      expect(bodyRowIds(component)).toHaveLength(total);
      expect(
        component.queryByTestId(
          'PlanWorkflowRunTransparencyAuditTable-show-more',
        ),
      ).toBeNull();
      expect(
        component.queryByTestId('PlanWorkflowRunTransparencyAuditTable-limit'),
      ).toBeNull();
    });
  });

  describe('when the fetch limit is reached', () => {
    test('shows the most-recent-runs footer once every row is revealed', async () => {
      const user = userEvent.setup();
      const component = renderTable(manyRows(PLAN_RUN_HISTORY_FETCH_LIMIT));

      expect(
        component.queryByTestId('PlanWorkflowRunTransparencyAuditTable-limit'),
      ).toBeNull();

      await user.click(
        component.getByTestId(
          'PlanWorkflowRunTransparencyAuditTable-show-more',
        ),
      );

      expect(
        component.getByTestId('PlanWorkflowRunTransparencyAuditTable-limit'),
      ).toHaveTextContent(copy.fetchLimitFooter(PLAN_RUN_HISTORY_FETCH_LIMIT));
    });

    test('does not count SCHEDULED rows towards the limit (every one is fetched on top of it)', async () => {
      const user = userEvent.setup();
      const historyRows = manyRows(PLAN_RUN_HISTORY_FETCH_LIMIT - 1);
      const scheduledRow = auditRow({
        bullmqJobId: 'scheduled-plan-run-old',
        id: 'run-scheduled-old',
        status: 'SCHEDULED',
      });
      const component = renderTable([...historyRows, scheduledRow]);

      await user.click(
        component.getByTestId(
          'PlanWorkflowRunTransparencyAuditTable-show-more',
        ),
      );

      expect(
        component.queryByTestId('PlanWorkflowRunTransparencyAuditTable-limit'),
      ).toBeNull();
    });
  });
});
