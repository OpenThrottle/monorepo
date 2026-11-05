import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import { SCHEDULE_RUN_STATUS_CELL_COPY } from '~/routing/schedule/data/data.copy';
import {
  RUN_STATUS_LABEL,
  RUN_TRIGGER_LABEL,
} from '~/routing/schedule/data/data.run-status';
import { renderRoutesStub } from '~/testing/route-fixtures';

import { ScheduleRunsTable } from '../ScheduleRunsTable';

const run = (
  overrides: Partial<ScheduledJobRunRowFragment> = {},
): ScheduledJobRunRowFragment => {
  return {
    __typename: 'ScheduledAgentJobRunObject',
    bullmqJobId: 'run-1',
    cacheReadTokens: 20,
    cacheWriteTokens: 10,
    costUsd: 0.0123,
    createdAt: '2026-07-31T09:00:00.000Z',
    driverId: 'claude',
    errorMessage: null,
    exitCode: 0,
    finishedAt: '2026-07-31T09:01:23.000Z',
    id: 'run-1',
    inputTokens: 100,
    model: 'opus',
    outputTokens: 50,
    reasoningTokens: null,
    resumeOfRunId: null,
    startedAt: '2026-07-31T09:00:00.000Z',
    status: 'succeeded',
    totalTokens: 150,
    trigger: 'manual',
    usageLimitResetsAt: null,
    ...overrides,
  };
};

describe('ScheduleRunsTable', () => {
  test('links each row to its run detail and renders duration', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[
          run(),
          run({ finishedAt: null, id: 'run-2', status: 'running' }),
        ]}
      />,
    );

    const viewLinks = component.getAllByRole('link', { name: /view/i });
    expect(viewLinks[0]).toHaveAttribute('href', '/schedule/job-1/runs/run-1');
    expect(viewLinks[1]).toHaveAttribute('href', '/schedule/job-1/runs/run-2');
    // finished run -> computed duration; unfinished -> em dash
    expect(component.getByText('1m 23s')).toBeInTheDocument();
  });

  test('exposes the error message as a tooltip on the failed status', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[run({ errorMessage: 'kaboom', status: 'failed' })]}
      />,
    );

    expect(component.getByText('failed')).toHaveAttribute('title', 'kaboom');
  });

  test('renders model, formatted total tokens (with breakdown tooltip), and cost', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable jobId="job-1" runs={[run()]} />,
    );

    expect(component.getByText('opus')).toBeInTheDocument();
    const tokens = component.getByText('150');
    expect(tokens.getAttribute('title')).toContain('Input 100');
    expect(tokens.getAttribute('title')).toContain('Cost $0.012');
    expect(component.getByText('$0.012')).toBeInTheDocument();
  });

  test('shows em dashes for a run with no usage or model', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[
          run({
            cacheReadTokens: null,
            cacheWriteTokens: null,
            costUsd: null,
            inputTokens: null,
            model: null,
            outputTokens: null,
            reasoningTokens: null,
            totalTokens: null,
          }),
        ]}
      />,
    );

    // model + tokens + cost all render an em dash (plus none from other cols here).
    expect(component.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  test('renders a no_op run distinctly from a clean success in the history list', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[run(), run({ id: 'run-2', status: 'no_op' })]}
      />,
    );

    // The raw status value is never shown — it reads as prose, not an enum.
    expect(component.queryByText('no_op')).not.toBeInTheDocument();

    const noOp = component.getByText('no work done');
    const succeeded = component.getByText('succeeded');

    // Amber for no_op vs green for succeeded: distinguishable at a glance, and
    // NOT the red reserved for an actual failure.
    expect(noOp.className).toContain('amber');
    expect(succeeded.className).toContain('green');
    expect(noOp.className).not.toContain('red');
  });

  test('renders a usage_limited run as "Usage limited" with its reset time, and labels the resume trigger', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[
          run({
            id: 'run-resume',
            resumeOfRunId: 'run-limited',
            status: 'queued',
            trigger: 'resume',
          }),
          run({
            id: 'run-limited',
            status: 'usage_limited',
            usageLimitResetsAt: '2026-11-01T17:00:00.000Z',
          }),
        ]}
      />,
    );

    expect(component.queryByText('usage_limited')).not.toBeInTheDocument();
    expect(
      component.getByText(RUN_STATUS_LABEL.usage_limited ?? ''),
    ).toBeInTheDocument();
    // A later run continues it, so the cell promises a resume rather than a hold.
    expect(component.container.textContent).toContain(
      SCHEDULE_RUN_STATUS_CELL_COPY.resumesPrefix,
    );
    expect(
      component.queryByText(SCHEDULE_RUN_STATUS_CELL_COPY.notResumedSuffix),
    ).not.toBeInTheDocument();
    expect(
      component.getByText(RUN_TRIGGER_LABEL.resume ?? ''),
    ).toBeInTheDocument();
  });

  test('says a usage_limited run with no continuation is not resumed automatically', () => {
    const component = renderRoutesStub(
      <ScheduleRunsTable
        jobId="job-1"
        runs={[
          run({
            status: 'usage_limited',
            usageLimitResetsAt: '2026-11-01T17:00:00.000Z',
          }),
        ]}
      />,
    );

    expect(
      component.getByText(SCHEDULE_RUN_STATUS_CELL_COPY.notResumedSuffix),
    ).toBeInTheDocument();
  });
});
