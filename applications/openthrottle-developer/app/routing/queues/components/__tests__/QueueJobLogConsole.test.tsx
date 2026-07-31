import * as React from 'react';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { QueueJobLogConsole } from '../QueueJobLogConsole';

type Sink = {
  complete?: () => void;
  error?: (error: unknown) => void;
  next: (message: unknown) => void;
};

const shared = vi.hoisted(() => {
  const sinks: Sink[] = [];
  return {
    client: {
      subscribe: (_payload: unknown, sink: Sink) => {
        sinks.push(sink);
        return () => undefined;
      },
    },
    sinks,
  };
});

vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => shared.client,
}));

const event = (
  cursor: string,
  level: string,
  message: string,
  timestamp: string,
) => ({
  __typename: 'QueueJobLogEventObject',
  cursor,
  jobId: 'job-1',
  level,
  message,
  queueName: 'plans',
  source: 'plans-queue',
  timestamp,
});

const historyPage = {
  events: [
    event('c1', 'info', 'starting run', '2026-07-31T10:00:00.000Z'),
    event('c2', 'error', 'boom failed', '2026-07-31T10:00:01.000Z'),
  ],
  hasMore: false,
  nextCursor: null,
};

const renderConsole = (jobState = 'active') => {
  const Component = () => (
    <QueueJobLogConsole jobId="job-1" jobState={jobState} queueName="plans" />
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { id: 'qjl', loader: () => historyPage, path: '/resources/queue-job-logs' },
  ]);
  return render(<RoutesStub />);
};

describe('QueueJobLogConsole Component', () => {
  afterEach(() => {
    shared.sinks.length = 0;
  });

  test('backfills history and reports a live status', async () => {
    const component = renderConsole();

    expect(await component.findByText(/starting run/)).toBeInTheDocument();
    expect(component.getByText(/boom failed/)).toBeInTheDocument();
    expect(component.getByTestId('queue-job-log-status')).toHaveTextContent(
      'Live',
    );
  });

  test('merges a live subscription delta into the console', async () => {
    const component = renderConsole();
    await component.findByText(/starting run/);

    act(() => {
      shared.sinks.at(-1)?.next({
        data: {
          queueJobLogTail: event(
            'c3',
            'info',
            'live tick',
            '2026-07-31T10:00:02.000Z',
          ),
        },
      });
    });

    expect(await component.findByText(/live tick/)).toBeInTheDocument();
  });

  test('filters visible lines by message search', async () => {
    const user = userEvent.setup();
    const component = renderConsole();
    await component.findByText(/starting run/);

    await user.type(
      component.getByRole('searchbox', { name: 'Search job logs' }),
      'boom',
    );

    expect(component.queryByText(/starting run/)).not.toBeInTheDocument();
    expect(component.getByText(/boom failed/)).toBeInTheDocument();
  });

  test('shows a finished-job empty state when there are no logs', async () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <QueueJobLogConsole jobId="none" jobState="completed" queueName="plans" />
    );
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      {
        id: 'qjl',
        loader: () => ({ events: [], hasMore: false, nextCursor: null }),
        path: '/resources/queue-job-logs',
      },
    ]);
    const component = render(<RoutesStub />);

    expect(
      await component.findByText('No logs were recorded for this job.'),
    ).toBeInTheDocument();
  });
});
