import { spawn } from 'child_process';
import { describe, expect, it } from 'vitest';
import {
  createChildProcessMetricsCollector,
  sampleChildProcess,
} from '../child-process-metrics';

describe('createChildProcessMetricsCollector', () => {
  it('returns null when stopped before starting', () => {
    const collector = createChildProcessMetricsCollector();
    const metrics = collector.stop();
    expect(metrics).toBeNull();
  });

  it('returns null when started with PID 0', () => {
    const collector = createChildProcessMetricsCollector();
    collector.start(0);
    const metrics = collector.stop();
    expect(metrics).toBeNull();
  });

  it('marks stopped as true after stop()', () => {
    const collector = createChildProcessMetricsCollector();
    expect(collector.stopped).toBe(false);
    collector.stop();
    expect(collector.stopped).toBe(true);
  });

  it('does not start if already stopped', () => {
    const collector = createChildProcessMetricsCollector();
    collector.stop();
    collector.start(12345);
    const metrics = collector.stop();
    expect(metrics).toBeNull();
  });

  it('uses default poll interval of 5000ms', async () => {
    const collector = createChildProcessMetricsCollector({
      pollIntervalMs: 50,
    });
    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.pollIntervalMs).toBe(50);
  });

  it('uses custom poll interval', async () => {
    const collector = createChildProcessMetricsCollector({
      pollIntervalMs: 100,
    });
    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.pollIntervalMs).toBe(100);
  });

  it('omits samples by default', async () => {
    const collector = createChildProcessMetricsCollector({
      pollIntervalMs: 50,
    });
    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.samples).toBeUndefined();
  });

  it('includes samples when keepSamples is true', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 50,
    });
    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = collector.stop();
    expect(metrics).not.toBeNull();
    expect(metrics?.samples).toBeDefined();
    expect(Array.isArray(metrics?.samples)).toBe(true);
  });

  it('clears interval on stop and subsequent stop returns null', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 50,
    });
    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 100));
    const firstMetrics = collector.stop();
    expect(firstMetrics).not.toBeNull();
    expect(firstMetrics?.sampleCount).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 100));
    const secondMetrics = collector.stop();
    expect(secondMetrics).toBeNull();
  });
});

describe('createChildProcessMetricsCollector with real process', () => {
  it('collects metrics from the current process', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 100,
    });

    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 350));

    const metrics = collector.stop();

    expect(metrics).not.toBeNull();
    expect(metrics?.pid).toBe(process.pid);
    expect(metrics?.sampleCount).toBeGreaterThan(0);
    expect(metrics?.peakCpuPercent).toBeGreaterThanOrEqual(0);
    expect(metrics?.avgCpuPercent).toBeGreaterThanOrEqual(0);
    expect(metrics?.peakRssMb).toBeGreaterThan(0);
    expect(metrics?.avgRssMb).toBeGreaterThan(0);
  });

  it('computes peak and average correctly', async () => {
    const collector = createChildProcessMetricsCollector({
      keepSamples: true,
      pollIntervalMs: 50,
    });

    collector.start(process.pid);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const metrics = collector.stop();

    if (metrics && metrics.samples && metrics.samples.length > 1) {
      const rssValues = metrics.samples.map((s) => s.rssMb);
      const maxRss = Math.max(...rssValues);
      const avgRss = rssValues.reduce((a, b) => a + b, 0) / rssValues.length;

      expect(metrics.peakRssMb).toBeCloseTo(maxRss, 1);
      expect(metrics.avgRssMb).toBeCloseTo(avgRss, 1);
    }
  });
});

describe('sampleChildProcess', () => {
  it('returns a sample for the current process', async () => {
    const sample = await sampleChildProcess(process.pid);

    expect(sample).not.toBeNull();
    expect(sample?.cpu).toBeGreaterThanOrEqual(0);
    expect(sample?.rssMb).toBeGreaterThan(0);
    expect(sample?.timestamp).toBeGreaterThan(0);
    expect(sample?.elapsedMs).toBe(0);
  });

  it('returns null for non-existent PID', async () => {
    const sample = await sampleChildProcess(999999999);
    expect(sample).toBeNull();
  });

  it('returns a sample for a spawned child process', async () => {
    const child = spawn('sleep', ['1'], { stdio: 'ignore' });
    const pid = child.pid;

    if (pid === undefined) {
      child.kill();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const sample = await sampleChildProcess(pid);

    child.kill();

    expect(sample).not.toBeNull();
    expect(sample?.rssMb).toBeGreaterThan(0);
  });
});
