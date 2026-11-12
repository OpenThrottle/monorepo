import { describe, expect, it } from 'vitest';

import { buildQueueJobMetricLines } from '../buildQueueJobMetricLines';

describe('buildQueueJobMetricLines', () => {
  it('returns no lines when metrics are absent', () => {
    expect(buildQueueJobMetricLines(null)).toEqual([]);
    expect(buildQueueJobMetricLines(undefined)).toEqual([]);
  });

  it('formats start and end memory snapshots', () => {
    const lines = buildQueueJobMetricLines({
      atEnd: { heapUsedMb: 40, rssMb: 120.5 },
      atStart: { heapUsedMb: 10, rssMb: 80 },
    });

    expect(lines).toEqual([
      'Start RSS: 80.0 MB / heap 10.0 MB',
      'End RSS: 120.5 MB / heap 40.0 MB',
    ]);
  });
});
