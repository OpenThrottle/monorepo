import { describe, expect, it } from 'vitest';

import { createChildProcessMetricsCollector } from '../metrics.js';

describe('createChildProcessMetricsCollector with real pidusage', () => {
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
