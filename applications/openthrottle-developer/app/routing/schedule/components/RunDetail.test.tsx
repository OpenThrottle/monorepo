import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { RunDetail } from './RunDetail';
import type { RunDetailProps } from './RunDetail';
import type { ScheduledJobRunDetailFragment } from '~/__generated__/graphql';
import { RUN_DETAIL_COPY } from '~/routing/schedule/data/data.run-detail';

const run = (
  overrides: Partial<ScheduledJobRunDetailFragment> = {},
): ScheduledJobRunDetailFragment => ({
  __typename: 'ScheduledAgentJobRunObject',
  bullmqJobId: 'run-1',
  cacheReadTokens: 20,
  cacheWriteTokens: 10,
  cancelRequestedAt: null,
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
  scheduledAgentJobId: 'job-1',
  settingsSnapshotJson: JSON.stringify({ driverId: 'claude', model: 'opus' }),
  startedAt: '2026-07-31T09:00:00.000Z',
  status: 'succeeded',
  totalTokens: 150,
  trigger: 'manual',
  ...overrides,
});

describe('RunDetail Component', () => {
  let component: RenderResult;
  let props: RunDetailProps;

  beforeEach(() => {
    props = { run: run() };
    component = render(<RunDetail {...props} />);
  });

  test('renders the run status, driver, and exit code fields', () => {
    expect(component.getByTestId('RunDetail')).toBeTruthy();
    expect(component.getByText('succeeded')).toBeTruthy();
    expect(component.getByText('claude · opus')).toBeTruthy();
    expect(component.getByText('0')).toBeTruthy();
  });

  test('renders usage rows when the run has usage data', () => {
    expect(component.getByText(RUN_DETAIL_COPY.usage.heading)).toBeTruthy();
    expect(component.queryByText(RUN_DETAIL_COPY.usage.empty)).toBeNull();
  });

  test('renders the empty usage copy when the run has no usage data', () => {
    component = render(
      <RunDetail
        run={run({
          cacheReadTokens: null,
          cacheWriteTokens: null,
          costUsd: null,
          inputTokens: null,
          outputTokens: null,
          reasoningTokens: null,
          totalTokens: null,
        })}
      />,
    );

    expect(component.getByText(RUN_DETAIL_COPY.usage.empty)).toBeTruthy();
  });

  test('renders the cancellation notice when cancelRequestedAt is set', () => {
    component = render(
      <RunDetail
        run={run({ cancelRequestedAt: '2026-07-31T09:00:30.000Z' })}
      />,
    );

    expect(component.getByRole('status')).toHaveTextContent(
      'Cancellation requested',
    );
  });

  test('renders the error message block when present', () => {
    component = render(
      <RunDetail run={run({ errorMessage: 'boom: run failed' })} />,
    );

    expect(component.getByText('boom: run failed')).toBeTruthy();
  });
});
