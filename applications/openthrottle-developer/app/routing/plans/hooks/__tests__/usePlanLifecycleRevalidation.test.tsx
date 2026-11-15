import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { UsePlanLifecycleRevalidationOptions } from '../usePlanLifecycleRevalidation';
import { usePlanLifecycleRevalidation } from '../usePlanLifecycleRevalidation';

// Controllable fake graphql-ws client: capture each subscription sink so a test can push
// lifecycle events and observe whether (and how often) the route revalidates.
const shared = vi.hoisted(() => {
  const sinks: Array<{ next: (m: unknown) => void }> = [];
  const disposed: { count: number } = { count: 0 };
  return {
    client: {
      subscribe: (_payload: unknown, sink: { next: (m: unknown) => void }) => {
        sinks.push(sink);
        return () => {
          disposed.count += 1;
        };
      },
    },
    disposed,
    sinks,
  };
});

vi.mock('~/services/getGraphqlWsClient', () => ({
  getGraphqlWsClient: () => shared.client,
}));

// Shorten the coalescing window so the tests stay fast.
vi.mock('~/routing/plans/data/data.plan-lifecycle-events', () => ({
  PLAN_LIFECYCLE_REVALIDATE_DELAY_MS: 20,
}));

const PLAN_OPTIONS: UsePlanLifecycleRevalidationOptions = {
  events: ['plan.status_changed', 'task.status_changed'],
  taskId: undefined,
};

afterEach(() => {
  vi.useRealTimers();
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function renderRouterHook(
  planId: string,
  options: UsePlanLifecycleRevalidationOptions = PLAN_OPTIONS,
): Promise<{
  readonly loaderCalls: () => number;
  readonly unmount: () => void;
}> {
  const state = { calls: 0 };

  function HookProbe(): null {
    usePlanLifecycleRevalidation(planId, options);
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      loader: () => {
        state.calls += 1;
        return null;
      },
      path: '/',
    },
  ]);

  let unmount = (): void => {
    return undefined;
  };
  await act(async () => {
    unmount = render(<Stub />).unmount;
  });
  await waitFor(() => expect(state.calls).toBeGreaterThan(0));
  // Fake only the coalescing timer once the initial load has settled.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  return { loaderCalls: () => state.calls, unmount: () => unmount() };
}

async function push(planNotifications: Record<string, unknown>): Promise<void> {
  await act(async () => {
    shared.sinks[shared.sinks.length - 1]?.next({
      data: { planNotifications },
    });
  });
  await advance(80);
}

describe('usePlanLifecycleRevalidation', () => {
  test('does not subscribe when planId is empty', async () => {
    shared.sinks.length = 0;
    await renderRouterHook('');

    expect(shared.sinks).toHaveLength(0);
  });

  test('subscribes when planId is present and unsubscribes on unmount', async () => {
    shared.sinks.length = 0;
    shared.disposed.count = 0;
    const hook = await renderRouterHook('plan-1');
    expect(shared.sinks).toHaveLength(1);

    hook.unmount();

    expect(shared.disposed.count).toBe(1);
  });

  describe('when a listened event arrives', () => {
    test('revalidates the route', async () => {
      shared.sinks.length = 0;
      const hook = await renderRouterHook('plan-1');
      expect(shared.sinks).toHaveLength(1);
      const initial = hook.loaderCalls();

      await push({ event: 'task.status_changed', taskId: 't-1' });

      expect(hook.loaderCalls()).toBe(initial + 1);
    });
  });

  describe('when an ignored event arrives', () => {
    test('does not revalidate', async () => {
      shared.sinks.length = 0;
      const hook = await renderRouterHook('plan-1');
      expect(shared.sinks).toHaveLength(1);
      const initial = hook.loaderCalls();

      await push({ event: 'queue.job.completed' });

      expect(hook.loaderCalls()).toBe(initial);
    });
  });

  describe('when a burst of events arrives', () => {
    test('revalidates once', async () => {
      shared.sinks.length = 0;
      const hook = await renderRouterHook('plan-1');
      expect(shared.sinks).toHaveLength(1);
      const initial = hook.loaderCalls();

      await act(async () => {
        const sink = shared.sinks[shared.sinks.length - 1];
        sink?.next({
          data: { planNotifications: { event: 'task.status_changed' } },
        });
        sink?.next({
          data: { planNotifications: { event: 'task.status_changed' } },
        });
        sink?.next({
          data: { planNotifications: { event: 'plan.status_changed' } },
        });
      });
      await advance(120);

      expect(hook.loaderCalls()).toBe(initial + 1);
    });
  });

  describe('when scoped to a task', () => {
    test("ignores a sibling task's change but reacts to its own", async () => {
      shared.sinks.length = 0;
      const hook = await renderRouterHook('plan-1', {
        events: PLAN_OPTIONS.events,
        taskId: 't-1',
      });
      expect(shared.sinks).toHaveLength(1);
      const initial = hook.loaderCalls();

      await push({ event: 'task.status_changed', taskId: 't-2' });
      expect(hook.loaderCalls()).toBe(initial);

      await push({ event: 'task.status_changed', taskId: 't-1' });
      expect(hook.loaderCalls()).toBe(initial + 1);
    });
  });
});
