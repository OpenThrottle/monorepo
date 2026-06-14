import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlanOutputStreamer } from '../plan-output-streamer';

/**
 * Unit tests for the Ralph child-job chunk handler's append behavior: in-order
 * (serialized) delivery, bounded retry of transient failures, and surfacing
 * ultimately-lost output instead of silently succeeding.
 */

const noopSleep = (): Promise<void> => Promise.resolve();

const silentLogger = () => ({
  error: vi.fn<(...args: unknown[]) => void>(),
  warn: vi.fn<(...args: unknown[]) => void>(),
});

describe('createPlanOutputStreamer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends chunks strictly in enqueue order even when an earlier append is slow', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const append = vi.fn((content: string): Promise<void> => {
      if (content === 'a') {
        return new Promise<void>((resolve) => {
          releaseFirst = () => {
            order.push('a');
            resolve();
          };
        });
      }
      order.push(content);
      return Promise.resolve();
    });

    const streamer = createPlanOutputStreamer({ append, sleep: noopSleep });
    streamer.enqueue('a');
    streamer.enqueue('b');
    streamer.enqueue('c');

    // 'b' and 'c' must not run until 'a' resolves — they are chained behind it.
    await Promise.resolve();
    expect(order).toEqual([]);

    releaseFirst?.();
    const summary = await streamer.drain();

    expect(order).toEqual(['a', 'b', 'c']);
    expect(summary).toEqual({
      attempted: 3,
      failed: 0,
      firstFailureMessage: undefined,
    });
  });

  it('retries a transient failure and still counts the chunk as succeeded', async () => {
    const append = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 3,
      sleep: noopSleep,
    });
    streamer.enqueue('chunk');
    const summary = await streamer.drain();

    expect(append).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({
      attempted: 1,
      failed: 0,
      firstFailureMessage: undefined,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('gives up after maxAttempts and records the failure without throwing', async () => {
    const append = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValue(new Error('cortex down'));
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 3,
      sleep: noopSleep,
    });
    // enqueue must never throw, even when the append always rejects.
    expect(() => streamer.enqueue('chunk')).not.toThrow();
    const summary = await streamer.drain();

    expect(append).toHaveBeenCalledTimes(3);
    expect(summary.attempted).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.firstFailureMessage).toBe('cortex down');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('summarizes mixed success/failure and warns once on drain when output was lost', async () => {
    const append = vi.fn((content: string): Promise<void> => {
      if (content === 'bad') {
        return Promise.reject(new Error('first failure'));
      }
      return Promise.resolve();
    });
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      maxAttempts: 1,
      sleep: noopSleep,
    });
    streamer.enqueue('ok-1');
    streamer.enqueue('bad');
    streamer.enqueue('bad');
    streamer.enqueue('ok-2');
    const summary = await streamer.drain();

    expect(summary.attempted).toBe(4);
    expect(summary.failed).toBe(2);
    // firstFailureMessage captures the first chunk that failed, not the last.
    expect(summary.firstFailureMessage).toBe('first failure');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('reports zero failures for an empty stream', async () => {
    const append = vi.fn<(content: string) => Promise<void>>();
    const logger = silentLogger();

    const streamer = createPlanOutputStreamer({
      append,
      logger,
      sleep: noopSleep,
    });
    const summary = await streamer.drain();

    expect(summary).toEqual({
      attempted: 0,
      failed: 0,
      firstFailureMessage: undefined,
    });
    expect(append).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
