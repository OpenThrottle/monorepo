import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowRunTransparencyRecentRuns } from '../PlanWorkflowRunTransparencyRecentRuns';
import type {
  PlanWorkflowRunTransparencyRecentRunsProps,
  RecentRun,
} from '../PlanWorkflowRunTransparencyRecentRuns';

const renderTable = (
  props: PlanWorkflowRunTransparencyRecentRunsProps,
): RenderResult => {
  const Component = () => <PlanWorkflowRunTransparencyRecentRuns {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('PlanWorkflowRunTransparencyRecentRuns Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowRunTransparencyRecentRunsProps;

  beforeEach(() => {
    props = { recentPlanRuns: [] };
    component = renderTable(props);
  });

  test('renders the empty-state message when there are no recent runs', () => {
    expect(
      component.getByText(/No completed runs recorded for this plan yet/i),
    ).toBeInTheDocument();
  });

  test('renders a row with job link, runner label, and RSS end when data is present', () => {
    const recentPlanRuns: RecentRun[] = [
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

    component = renderTable({ recentPlanRuns });

    const jobLink = component.getByRole('link', { name: 'job-abc' });
    expect(jobLink).toHaveAttribute('href', '/queues/Plans/job-abc');
    expect(component.getByText('Cursor (cursor-agent)')).toBeInTheDocument();
    expect(component.getByText('12.3')).toBeInTheDocument();
  });

  test('renders an em dash for RSS end when task run metrics are absent', () => {
    const recentPlanRuns: RecentRun[] = [
      {
        __typename: 'PlanRunMetricsEntry',
        executionBackend: 'claude',
        finishedOn: 1_700_000_000_000,
        jobId: 'job-no-metrics',
        taskRunMetrics: null,
      },
    ];

    component = renderTable({ recentPlanRuns });

    expect(component.getByText('—')).toBeInTheDocument();
  });
});
