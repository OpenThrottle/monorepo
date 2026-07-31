import { describe, expect, test } from 'vitest';
import { computeQueueHealth } from '../queue-health';

describe('computeQueueHealth', () => {
  test('reports healthy when there are no failures and low backlog', () => {
    const result = computeQueueHealth({
      activeCount: 3,
      delayedCount: 2,
      failedCount: 0,
      waitingCount: 10,
    });

    expect(result.level).toBe('healthy');
    expect(result.color).toBe('green');
    expect(result.label).toBe('Healthy');
    expect(result.backlog).toBe(12);
  });

  test('degrades on a single failure', () => {
    const result = computeQueueHealth({ failedCount: 1 });

    expect(result.level).toBe('degraded');
    expect(result.color).toBe('amber');
  });

  test('degrades on a large backlog even without failures', () => {
    const result = computeQueueHealth({ delayedCount: 60, waitingCount: 60 });

    expect(result.level).toBe('degraded');
    expect(result.backlog).toBe(120);
  });

  test('escalates to critical on sustained failures', () => {
    const result = computeQueueHealth({ failedCount: 25 });

    expect(result.level).toBe('critical');
    expect(result.color).toBe('red');
    expect(result.label).toBe('Critical');
  });

  test('escalates to critical on an overwhelming backlog', () => {
    const result = computeQueueHealth({ waitingCount: 500 });

    expect(result.level).toBe('critical');
  });

  test('treats missing and negative counts as zero', () => {
    const result = computeQueueHealth({
      delayedCount: -5,
      failedCount: undefined,
    });

    expect(result.level).toBe('healthy');
    expect(result.backlog).toBe(0);
  });
});
