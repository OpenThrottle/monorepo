import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPidusage = vi.fn();

vi.mock('pidusage', () => ({
  default: (pid: number) => mockPidusage(pid),
}));

import { createChildProcessMetricsCollector } from '../metrics.js';

describe('createChildProcessMetricsCollector (mocked pidusage)', () => {
  beforeEach(() => {
    mockPidusage.mockReset();
    mockPidusage.mockResolvedValue({ cpu: 10, memory: 50 * 1024 * 1024 });
  });

  afterEach(() => {
    mockPidusage.mockReset();
  });

  it('returns null when stopped before starting', () => {
    const collector = createChildProcessMetricsCollector();
    const metrics = collector.stop();
    expect(metrics).toBeNull();
    expect(mockPidusage).not.toHaveBeenCalled();
  });

  it('returns null when started with PID 0', async () => {
    const collector = createChildProcessMetricsCollector();
    collector.start(0);
    await Promise.resolve();
    const metrics = collector.stop();
    expect(metrics).toBeNull();
    expect(mockPidusage).not.toHaveBeenCalled();
  });

  it('marks stopped as true after stop()', () => {
    const collector = createChildProcessMetricsCollector();
    expect(collector.stopped).toBe(false);
    collector.stop();
    expect(collector.stopped).toBe(true);
  });

  it('does not start if already stopped', async () => {
    const collector = createChildProcessMetricsCollector();
    collector.stop();
    collector.start(12345);
    await Promise.resolve();
    const metrics = collector.stop();
    expect(metrics).toBeNull();
    expect(mockPidusage).not.toHaveBeenCalled();
  });

  it('aggregates peak and average from pidusage samples', async () => {
    mockPidusage.mockResolvedValue({ cpu: 25, memory: 150 * 1024 * 1024 });

    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 20,
    });
    collector.start(42);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = collector.stop();

    expect(metrics).not.toBeNull();
    expect(metrics?.pid).toBe(42);
    expect(metrics?.pollIntervalMs).toBe(20);
    expect(metrics?.peakCpuPercent).toBe(25);
    expect(metrics?.avgCpuPercent).toBe(25);
    expect(metrics?.peakRssMb).toBe(150);
    expect(metrics?.avgRssMb).toBe(150);
    expect(metrics?.sampleCount).toBeGreaterThanOrEqual(1);
    expect(mockPidusage).toHaveBeenCalledWith(42);
  });

  it('omits samples by default', async () => {
    const collector = createChildProcessMetricsCollector({
      pollIntervalMs: 20,
    });
    collector.start(42);

    await new Promise((resolve) => setTimeout(resolve, 30));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.samples).toBeUndefined();
  });

  it('includes samples when keepSamples is true', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 20,
    });
    collector.start(42);

    await new Promise((resolve) => setTimeout(resolve, 30));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.samples).toBeDefined();
    expect(Array.isArray(metrics?.samples)).toBe(true);
  });

  it('clears interval on stop and subsequent stop returns null', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 20,
    });
    collector.start(42);

    await new Promise((resolve) => setTimeout(resolve, 30));
    const firstMetrics = collector.stop();
    expect(firstMetrics).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 30));
    const secondMetrics = collector.stop();
    expect(secondMetrics).toBeNull();
  });

  it('returns null when pidusage rejects for every sample', async () => {
    mockPidusage.mockRejectedValue(new Error('No matching pid found'));

    const collector = createChildProcessMetricsCollector({
      pollIntervalMs: 20,
    });
    collector.start(999999);

    await new Promise((resolve) => setTimeout(resolve, 30));

    const metrics = collector.stop();
    expect(metrics).toBeNull();
  });
});
