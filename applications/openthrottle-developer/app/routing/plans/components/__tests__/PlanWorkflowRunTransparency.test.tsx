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
});
