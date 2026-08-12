import { act, render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { QueueJobLogLevel } from '~/__generated__/graphql';
import type { QueueJobLogEvent } from './useQueueJobLogs';
import { useQueueJobLogs } from './useQueueJobLogs';

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

const event = (cursor: string, timestamp: string): QueueJobLogEvent => ({
  __typename: 'QueueJobLogEventObject',
  cursor,
  jobId: 'job-1',
  level: QueueJobLogLevel.Info,
  message: `line-${cursor}`,
  queueName: 'plans',
  source: 'plans-queue',
  timestamp,
});

interface HistoryPage {
  events: QueueJobLogEvent[];
  hasMore: boolean;
  nextCursor: string | null;
}

const value: { current: ReturnType<typeof useQueueJobLogs> | null } = {
  current: null,
};

function HookProbe(props: {
  enabled?: boolean;
  jobId: string;
  queueName: string;
}): null {
  value.current = useQueueJobLogs(props);
  return null;
}

function renderHookAt(
  props: { enabled?: boolean; jobId: string; queueName: string },
  loader: () => HistoryPage,
) {
  const RoutesStub = createRoutesStub([
    // eslint-disable-next-line react/no-multi-comp -- test-local harness component
    { Component: () => <HookProbe {...props} />, path: '/' },
    { id: 'qjl', loader, path: '/resources/queue-job-logs' },
  ]);
  return render(<RoutesStub />);
}

describe('useQueueJobLogs', () => {
  afterEach(() => {
    shared.sinks.length = 0;
    value.current = null;
  });

  test('backfills the history page and reports a live status when a ws client is present', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [event('c1', '2026-01-01T00:00:00.000Z')],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(value.current?.status).toBe('live');
    expect(value.current?.events.map((e) => e.cursor)).toEqual(['c1']);
    expect(value.current?.hasMore).toBe(false);
  });

  test('does not backfill or subscribe when disabled', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt(
      { enabled: false, jobId: 'job-1', queueName: 'plans' },
      loader,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(loader).not.toHaveBeenCalled();
    expect(value.current?.status).toBe('idle');
    expect(value.current?.events).toEqual([]);
  });

  test('merges a live subscription delta and keeps events sorted', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [event('c1', '2026-01-01T00:00:00.000Z')],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      shared.sinks.at(-1)?.next({
        data: { queueJobLogTail: event('c0', '2025-12-31T23:59:59.000Z') },
      });
    });

    expect(value.current?.events.map((e) => e.cursor)).toEqual(['c0', 'c1']);
  });

  test('loadOlder fetches the next page using nextCursor when hasMore is true', async () => {
    let calls = 0;
    const loader = vi.fn((): HistoryPage => {
      calls += 1;
      if (calls === 1) {
        return {
          events: [event('c1', '2026-01-01T00:00:00.000Z')],
          hasMore: true,
          nextCursor: 'c1',
        };
      }
      return {
        events: [event('c2', '2025-12-31T00:00:00.000Z')],
        hasMore: false,
        nextCursor: null,
      };
    });

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(value.current?.hasMore).toBe(true);

    act(() => value.current?.loadOlder());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loader).toHaveBeenCalledTimes(2);
    expect(value.current?.events.map((e) => e.cursor).sort()).toEqual([
      'c1',
      'c2',
    ]);
    expect(value.current?.hasMore).toBe(false);
  });

  test('loadOlder is a no-op when hasMore is false', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [event('c1', '2026-01-01T00:00:00.000Z')],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => value.current?.loadOlder());

    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('status becomes ended when the subscription completes', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => shared.sinks.at(-1)?.complete?.());

    expect(value.current?.status).toBe('ended');
  });

  test('status becomes error when the subscription errors', async () => {
    const loader = vi.fn((): HistoryPage => ({
      events: [],
      hasMore: false,
      nextCursor: null,
    }));

    renderHookAt({ jobId: 'job-1', queueName: 'plans' }, loader);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => shared.sinks.at(-1)?.error?.(new Error('boom')));

    expect(value.current?.status).toBe('error');
  });
});
