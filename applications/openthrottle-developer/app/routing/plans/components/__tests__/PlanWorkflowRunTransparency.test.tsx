import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PlanWorkflowRunTransparency } from '../PlanWorkflowRunTransparency';
import type { PlanWorkflowRunTransparencyProps } from '../PlanWorkflowRunTransparency';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';

const baseWorkflow = getDefaultWorkflowRalphRunOptionsInput({ planId });

function renderTransparency(
  overrides: Partial<PlanWorkflowRunTransparencyProps> = {},
) {
  const workflowInput = overrides.workflowInput ?? baseWorkflow;
  const canonicalWorkflowCommand =
    overrides.canonicalWorkflowCommand ??
    formatWorkflowRalphCommandLine(buildWorkflowRalphOptionArgs(workflowInput));

  const props: PlanWorkflowRunTransparencyProps = {
    canonicalWorkflowCommand,
    planId,
    planRunAuditRows: overrides.planRunAuditRows ?? [],
    recentPlanRuns: overrides.recentPlanRuns ?? [],
    workflowInput,
    workflowTimeout: overrides.workflowTimeout ?? '',
    workingDirectory: overrides.workingDirectory ?? '',
    ...overrides,
  };

  const Component = () => <PlanWorkflowRunTransparency {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('PlanWorkflowRunTransparency', () => {
  test('renders canonical CLI, queue link, and empty runs message', () => {
    const { getByTestId, getByRole, getByText } = renderTransparency();

    expect(getByTestId('PlanWorkflowRunTransparency')).toBeInTheDocument();
    expect(
      getByTestId('PlanWorkflowRunTransparency-canonical-cli'),
    ).toHaveTextContent('pnpm exec workflow-ralph');
    expect(
      getByRole('link', { name: new RegExp(PLAN_RUN_BULLMQ_QUEUE_NAME, 'i') }),
    ).toHaveAttribute(
      'href',
      `/queues/${encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME)}`,
    );
    expect(
      getByText(/No completed runs recorded for this plan yet/i),
    ).toBeInTheDocument();
  });

  test('renders recent run rows with job link and runner label', () => {
    const recentPlanRuns: PlanWorkflowRunTransparencyProps['recentPlanRuns'] = [
      {
        __typename: 'PlanRunMetricsEntry',
        executionBackend: 'cursor',
        finishedOn: 1_700_000_000_000,
        jobId: 'job-abc',
        taskRunMetrics: {
          __typename: 'TaskRunMetrics',
          atEnd: { __typename: 'ProcessMetricsSnapshot', rssMb: 12.34 },
        },
      },
    ];

    const { getByRole, getByText } = renderTransparency({ recentPlanRuns });

    const jobLink = getByRole('link', { name: 'job-abc' });
    expect(jobLink).toHaveAttribute('href', '/queues/Plans/job-abc');
    expect(getByText('Cursor (cursor-agent)')).toBeInTheDocument();
  });

  test('renders queued audit rows with snapshot match label when config matches', () => {
    const planRunAuditRows: PlanWorkflowRunTransparencyProps['planRunAuditRows'] =
      [
        {
          __typename: 'PlanRunObject',
          bullmqJobId: 'job-snap-1',
          createdAt: '2024-01-02T03:04:05.000Z',
          executionBackend: 'cursor',
          id: 'run-1',
          runConfigSnapshotJson: JSON.stringify({
            ralph: { executionBackend: 'cursor' },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '' },
          }),
          runKind: 'spawn',
          status: 'QUEUED',
        },
      ];

    const { getByText, getByRole } = renderTransparency({ planRunAuditRows });

    expect(getByRole('link', { name: 'job-snap-1' })).toHaveAttribute(
      'href',
      '/queues/Plans/job-snap-1',
    );
    expect(getByText('Matches current config')).toBeInTheDocument();
  });

  test('renders queued audit rows with diff labels when snapshot differs', () => {
    const planRunAuditRows: PlanWorkflowRunTransparencyProps['planRunAuditRows'] =
      [
        {
          __typename: 'PlanRunObject',
          bullmqJobId: 'job-snap-2',
          createdAt: '2024-01-02T03:04:05.000Z',
          executionBackend: 'claude',
          id: 'run-2',
          runConfigSnapshotJson: JSON.stringify({
            ralph: { executionBackend: 'claude', iterations: 25 },
            target: { mode: 'plan', taskId: '' },
            version: 1,
            workspace: { workingDirectory: '/tmp/other' },
          }),
          runKind: 'orchestrator',
          status: 'QUEUED',
        },
      ];

    const { getByText } = renderTransparency({ planRunAuditRows });

    expect(
      getByText(
        /Backend: Claude Code .* → Cursor \(cursor-agent\) \(current\)/,
      ),
    ).toBeInTheDocument();
    expect(getByText(/Iterations: 25 → 10 \(current\)/)).toBeInTheDocument();
    expect(
      getByText(/Workspace: \/tmp\/other → \(monorepo root\) \(current\)/),
    ).toBeInTheDocument();
  });
});
