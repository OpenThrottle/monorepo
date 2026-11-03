import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_RUN_CANCEL_SCHEDULED_COPY } from '~/routing/plans/data/data.copy';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

import type {
  PlanRunAuditRow,
  PlanWorkflowRunTransparencyAuditTableProps,
} from '../PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunTransparencyAuditTable } from '../PlanWorkflowRunTransparencyAuditTable';

const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });

const auditRow = (
  overrides: Partial<PlanRunAuditRow> = {},
): PlanRunAuditRow => ({
  __typename: 'PlanRunObject',
  bullmqJobId: 'job-1',
  createdAt: '2024-01-02T03:04:05.000Z',
  executionBackend: 'cursor',
  heartbeatExpected: true,
  id: 'run-1',
  isStale: false,
  runConfigSnapshotJson: null,
  runKind: 'spawn',
  scheduledFor: null,
  status: 'QUEUED',
  ...overrides,
});

describe('PlanWorkflowRunTransparencyAuditTable Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowRunTransparencyAuditTableProps;

  beforeEach(() => {
    props = {
      planId,
      planRunAuditRows: [],
      workflowInput,
      workingDirectory: '',
    };
  });

  const renderTable = (): RenderResult => {
    const Component = () => (
      <PlanWorkflowRunTransparencyAuditTable {...props} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders the empty-state message when there are no audit rows', () => {
    component = renderTable();

    expect(
      component.getByText(/No queued run audit rows yet/i),
    ).toBeInTheDocument();
  });

  test('renders a job link for a row with a bullmq job id', () => {
    props = { ...props, planRunAuditRows: [auditRow()] };
    component = renderTable();

    const link = component.getByRole('link', { name: 'job-1' });
    expect(link).toHaveAttribute('href', '/queues/Plans/job-1');
  });

  test('renders a CLI-run label for a row with no bullmq job id', () => {
    props = {
      ...props,
      planRunAuditRows: [auditRow({ bullmqJobId: null })],
    };
    component = renderTable();

    expect(component.getByText('CLI run')).toBeInTheDocument();
  });

  test('renders "Matches current config" when the snapshot matches', () => {
    props = {
      ...props,
      planRunAuditRows: [
        auditRow({
          runConfigSnapshotJson: JSON.stringify({
            ralph: { executionBackend: 'cursor' },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '' },
          }),
        }),
      ],
    };
    component = renderTable();

    expect(component.getByText('Matches current config')).toBeInTheDocument();
  });

  test('renders diff labels when the snapshot differs from the current config', () => {
    props = {
      ...props,
      planRunAuditRows: [
        auditRow({
          executionBackend: 'claude',
          runConfigSnapshotJson: JSON.stringify({
            ralph: { executionBackend: 'claude', iterations: 25 },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '/tmp/other' },
          }),
        }),
      ],
    };
    component = renderTable();

    expect(
      component.getByText(/Iterations: 25 → 10 \(current\)/),
    ).toBeInTheDocument();
  });

  test('renders an em dash when no snapshot was recorded', () => {
    props = {
      ...props,
      planRunAuditRows: [auditRow({ runConfigSnapshotJson: null })],
    };
    component = renderTable();

    expect(component.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});

describe('PlanWorkflowRunTransparencyAuditTable worktree column', () => {
  const renderRows = (rows: PlanRunAuditRow[]): RenderResult => {
    const props: PlanWorkflowRunTransparencyAuditTableProps = {
      planId,
      planRunAuditRows: rows,
      workflowInput,
      workingDirectory: '',
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <PlanWorkflowRunTransparencyAuditTable {...props} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('shows the directory the run actually worked in', () => {
    const component = renderRows([
      auditRow({
        runConfigSnapshotJson: JSON.stringify({
          ralph: { executionBackend: 'cursor' },
          workspace: {
            workingDirectory:
              '/Users/matt/Development/openthrottle-worktrees/plan-0c2720a9',
          },
        }),
      }),
    ]);

    expect(
      component.getByText(
        '/Users/matt/Development/openthrottle-worktrees/plan-0c2720a9',
      ),
    ).toBeInTheDocument();
  });

  test('renders a placeholder for a run that recorded no workspace', () => {
    const component = renderRows([auditRow({ runConfigSnapshotJson: null })]);

    expect(component.getByText('Worktree')).toBeInTheDocument();
    expect(component.getAllByText('—').length).toBeGreaterThan(0);
  });
});

describe('PlanWorkflowRunTransparencyAuditTable scheduled runs', () => {
  const renderRows = (
    rows: PlanRunAuditRow[],
    submissions: FormData[] = [],
  ): RenderResult => {
    const props: PlanWorkflowRunTransparencyAuditTableProps = {
      planId,
      planRunAuditRows: rows,
      workflowInput,
      workingDirectory: '',
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <PlanWorkflowRunTransparencyAuditTable {...props} />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        Component: () => null,
        action: async ({ request }) => {
          submissions.push(await request.formData());
          return {
            cancelPlanRun: { outcome: 'RUN_CANCELLED', removedJobIds: [] },
          };
        },
        path: '/plans/:planId',
      },
    ]);
    return render(<RoutesStub />);
  };

  test('offers Cancel only on a SCHEDULED row', () => {
    const component = renderRows([
      auditRow({ id: 'r-done', status: 'COMPLETED' }),
      auditRow({ id: 'r-missed', status: 'MISSED' }),
      auditRow({ id: 'r-superseded', status: 'SUPERSEDED' }),
      auditRow({ id: 'r-live', status: 'IN_PROGRESS' }),
      auditRow({
        id: 'r-scheduled',
        scheduledFor: '2026-11-05T10:00:00.000Z',
        status: 'SCHEDULED',
      }),
    ]);

    expect(
      component.getAllByRole('button', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
      }),
    ).toHaveLength(1);
  });

  test('cancelling a SCHEDULED row submits intent=cancelPlanRun and its planRunId', async () => {
    const user = userEvent.setup();
    const submissions: FormData[] = [];
    const component = renderRows(
      [
        auditRow({ id: 'r-live', status: 'IN_PROGRESS' }),
        auditRow({
          id: 'r-scheduled',
          scheduledFor: '2026-11-05T10:00:00.000Z',
          status: 'SCHEDULED',
        }),
      ],
      submissions,
    );

    await user.click(
      component.getByRole('button', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.ariaLabel,
      }),
    );
    await user.click(
      component.getByRole('button', {
        name: PLAN_RUN_CANCEL_SCHEDULED_COPY.confirmLabel,
      }),
    );

    await vi.waitFor(() => {
      expect(submissions).toHaveLength(1);
    });
    expect(submissions[0]?.get('intent')).toBe('cancelPlanRun');
    expect(submissions[0]?.get('planRunId')).toBe('r-scheduled');
  });

  test('pins SCHEDULED rows above newer runs, soonest fire time first', () => {
    const component = renderRows([
      auditRow({
        bullmqJobId: 'job-newest',
        id: 'r-newest',
        status: 'COMPLETED',
      }),
      auditRow({
        bullmqJobId: 'job-later',
        id: 'r-later',
        scheduledFor: '2026-12-01T10:00:00.000Z',
        status: 'SCHEDULED',
      }),
      auditRow({
        bullmqJobId: 'job-sooner',
        id: 'r-sooner',
        scheduledFor: '2026-11-05T10:00:00.000Z',
        status: 'SCHEDULED',
      }),
    ]);

    const jobLinks = component
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(jobLinks).toEqual(['job-sooner', 'job-later', 'job-newest']);
  });
});
