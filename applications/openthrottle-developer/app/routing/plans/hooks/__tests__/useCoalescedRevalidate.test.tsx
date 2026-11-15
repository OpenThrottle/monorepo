import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { UseCoalescedRevalidateResult } from '../useCoalescedRevalidate';
import { useCoalescedRevalidate } from '../useCoalescedRevalidate';

interface Harness {
  readonly loaderCalls: () => number;
  readonly requestRevalidate: () => void;
  readonly resolveLoader: () => void;
  readonly unmount: () => void;
}

const DELAY_MS = 20;

async function renderHarness(options: {
  readonly holdLoader: boolean;
}): Promise<Harness> {
  const state: {
    calls: number;
    hook: UseCoalescedRevalidateResult | null;
    release: (() => void) | null;
  } = { calls: 0, hook: null, release: null };

  function HookProbe(): null {
    state.hook = useCoalescedRevalidate({ delayMs: DELAY_MS });
    return null;
  }

  const Stub = createRoutesStub([
    {
      Component: HookProbe,
      loader: async () => {
        state.calls += 1;
        // The initial load always resolves; later ones can be held to model an in-flight
        // revalidation.
        if (state.calls > 1 && options.holdLoader) {
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        }
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
  await waitFor(() => expect(state.hook).not.toBeNull());

  // Fake only the coalescing timer: the router's own promises stay real.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  return {
    loaderCalls: () => state.calls,
    requestRevalidate: () => state.hook?.requestRevalidate(),
    resolveLoader: () => state.release?.(),
    unmount: () => unmount(),
  };
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useCoalescedRevalidate', () => {
  test('collapses a burst of requests into one revalidation', async () => {
    const harness = await renderHarness({ holdLoader: false });
    const initial = harness.loaderCalls();

    harness.requestRevalidate();
    harness.requestRevalidate();
    harness.requestRevalidate();
    await advance(DELAY_MS * 4);

    expect(harness.loaderCalls()).toBe(initial + 1);
  });

  test('waits out the quiet period before revalidating', async () => {
    const harness = await renderHarness({ holdLoader: false });
    const initial = harness.loaderCalls();

    harness.requestRevalidate();
    await advance(DELAY_MS / 2);

    expect(harness.loaderCalls()).toBe(initial);

    await advance(DELAY_MS);

    expect(harness.loaderCalls()).toBe(initial + 1);
  });

  test('replays a request that arrived mid-revalidation once it settles', async () => {
    const harness = await renderHarness({ holdLoader: true });
    const initial = harness.loaderCalls();

    harness.requestRevalidate();
    await advance(DELAY_MS * 2);
    expect(harness.loaderCalls()).toBe(initial + 1);

    // Still loading: this request must wait rather than stack a second loader run.
    harness.requestRevalidate();
    await advance(DELAY_MS * 2);
    expect(harness.loaderCalls()).toBe(initial + 1);

    await act(async () => {
      harness.resolveLoader();
    });
    await advance(DELAY_MS * 2);

    expect(harness.loaderCalls()).toBe(initial + 2);
    harness.resolveLoader();
  });

  test('drops a pending request on unmount', async () => {
    const harness = await renderHarness({ holdLoader: false });
    const initial = harness.loaderCalls();

    harness.requestRevalidate();
    harness.unmount();
    await advance(DELAY_MS * 4);

    expect(harness.loaderCalls()).toBe(initial);
  });
});
