import { describe, expect, it, vi } from 'vitest';
import { runAgenticTestEchoLoop } from './agentic-test-echo';

describe('runAgenticTestEchoLoop', () => {
  it('echoes timestamps echoCount times and sleeps between echoes', async () => {
    const onEcho = vi.fn();
    const sleep = vi.fn(async (): Promise<void> => {});

    const result = await runAgenticTestEchoLoop({
      echoCount: 3,
      intervalMs: 1_000,
      now: () => new Date('2026-06-01T00:00:00.000Z'),
      onEcho,
      sleep,
    });

    expect(onEcho).toHaveBeenCalledTimes(3);
    expect(onEcho).toHaveBeenNthCalledWith(1, '2026-06-01T00:00:00.000Z', 0);
    expect(onEcho).toHaveBeenNthCalledWith(2, '2026-06-01T00:00:00.000Z', 1);
    expect(onEcho).toHaveBeenNthCalledWith(3, '2026-06-01T00:00:00.000Z', 2);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 1_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 1_000);
    expect(result.echoedCount).toBe(3);
    expect(result.timestamps).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ]);
  });
});
