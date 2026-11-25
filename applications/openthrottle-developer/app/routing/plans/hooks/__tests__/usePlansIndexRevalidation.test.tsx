import { act, render, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { userAtom } from '~/global/data/atom-user';

import { usePlansIndexRevalidation } from '../usePlansIndexRevalidation';

// Controllable fake graphql-ws client: capture the firehose sink so a test can push events.
const shared = vi.hoisted(() => {
  const sinks: Array<{ next: (m: unknown) => void }> = [];
  return {
    client: {
      subscribe: (_payload: unknown, sink: { next: (m: unknown) => void }) => {
        sinks.push(sink);
        return () => {
          return undefined;
        };
      },
    },
    sinks,
  };
});

vi.mock('~/services/getGraphqlWsClient', () => ({
  getGraphqlWsClient: () => shared.client,
}));

afterEach(() => {
  vi.useRealTimers();
  shared.sinks.length = 0;
});

async function renderIndexHook(options: {
  readonly isSignedIn: boolean;
}): Promise<{ readonly loaderCalls: () => number }> {
  const state = { calls: 0 };
  const store = createStore();
  if (options.isSignedIn) {
    store.set(userAtom, {
      createdAt: '2026-01-01T00:00:00Z',
      githubUsername: 'developer',
      id: 'user-1',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  }

  function HookProbe(): null {
    usePlansIndexRevalidation();
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      loader: () => {
        state.calls += 1;
        return null;
      },
      path: '/plans',
    },
  ]);

  await act(async () => {
    render(
      <Provider store={store}>
        <Stub initialEntries={['/plans']} />
      </Provider>,
    );
  });
  await waitFor(() => expect(state.calls).toBeGreaterThan(0));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  return { loaderCalls: () => state.calls };
}

async function pushAll(
  events: ReadonlyArray<Record<string, unknown>>,
): Promise<void> {
  await act(async () => {
    const sink = shared.sinks[shared.sinks.length - 1];
    for (const notification of events) {
      sink?.next({ data: { notifications: notification } });
    }
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

describe('usePlansIndexRevalidation', () => {
  describe('when signed out', () => {
    test('does not subscribe', async () => {
      await renderIndexHook({ isSignedIn: false });

      expect(shared.sinks).toHaveLength(0);
    });
  });

  describe('when signed in', () => {
    test('revalidates once for a burst of plan and task status events', async () => {
      const hook = await renderIndexHook({ isSignedIn: true });
      expect(shared.sinks).toHaveLength(1);
      const initial = hook.loaderCalls();

      await pushAll([
        { event: 'task.status_changed', planId: 'p-1', taskId: 't-1' },
        { event: 'task.status_changed', planId: 'p-1', taskId: 't-2' },
        { event: 'plan.status_changed', planId: 'p-2' },
      ]);

      expect(hook.loaderCalls()).toBe(initial + 1);
    });

    test('ignores unrelated firehose events', async () => {
      const hook = await renderIndexHook({ isSignedIn: true });
      const initial = hook.loaderCalls();

      await pushAll([
        { event: 'system.alert', message: 'Disk low' },
        { event: 'queue.job.completed', jobType: 'daily-stats' },
      ]);

      expect(hook.loaderCalls()).toBe(initial);
    });
  });
});
