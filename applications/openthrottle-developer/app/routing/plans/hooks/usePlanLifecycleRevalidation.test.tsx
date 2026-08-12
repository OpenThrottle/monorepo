import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { usePlanLifecycleRevalidation } from './usePlanLifecycleRevalidation';

// Controllable fake graphql-ws client: capture the subscription sink so the test
// can push a lifecycle event and assert the revalidator fires.
const shared = vi.hoisted(() => {
  const sinks: Array<{ next: (m: unknown) => void }> = [];
  return {
    client: {
      subscribe: (_payload: unknown, sink: { next: (m: unknown) => void }) => {
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

async function renderRouterHook(planId: string): Promise<{
  revalidateCalls: number;
}> {
  const state = { revalidateCalls: 0 };

  function HookProbe(): null {
    usePlanLifecycleRevalidation(planId);
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      loader: () => {
        state.revalidateCalls += 1;
        return null;
      },
      path: '/',
    },
  ]);

  await act(async () => {
    render(<Stub />);
  });

  return state;
}

describe('usePlanLifecycleRevalidation', () => {
  test('does not subscribe when planId is empty', async () => {
    shared.sinks.length = 0;
    await renderRouterHook('');

    expect(shared.sinks).toHaveLength(0);
  });

  test('subscribes when planId is present', async () => {
    shared.sinks.length = 0;
    await renderRouterHook('plan-1');

    await waitFor(() => expect(shared.sinks).toHaveLength(1));
  });

  test('revalidates the route on each lifecycle notification', async () => {
    shared.sinks.length = 0;
    const state = await renderRouterHook('plan-1');
    await waitFor(() => expect(shared.sinks).toHaveLength(1));
    const initialCalls = state.revalidateCalls;

    await act(async () => {
      shared.sinks[shared.sinks.length - 1]?.next({
        data: { planLifecycleNotifications: { planId: 'plan-1' } },
      });
    });

    await waitFor(() =>
      expect(state.revalidateCalls).toBeGreaterThan(initialCalls),
    );
  });
});
