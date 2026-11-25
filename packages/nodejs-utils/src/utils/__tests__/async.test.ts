import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sleep } from '../async.ts';

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves only after the given delay', async () => {
    const settled = vi.fn();
    const pending = sleep(1000).then(settled);

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toHaveBeenCalledOnce();
  });

  it('resolves without a timer for a zero or negative delay', async () => {
    await sleep(0);
    await sleep(-5);

    expect(vi.getTimerCount()).toBe(0);
  });
});
