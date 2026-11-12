import { describe, expect, it } from 'vitest';

import { getUnsupervisedUnsettledRunId } from '../getUnsupervisedUnsettledRunId';

describe('getUnsupervisedUnsettledRunId', () => {
  it('is undefined while the run history is loading', () => {
    expect(getUnsupervisedUnsettledRunId(undefined)).toBeUndefined();
  });

  it('is null when there are no runs', () => {
    expect(getUnsupervisedUnsettledRunId([])).toBeNull();
  });

  it('returns the newest run id when it is unsupervised and in progress', () => {
    const rows = [
      { heartbeatExpected: false, id: 'run-1', status: 'IN_PROGRESS' },
    ];

    expect(getUnsupervisedUnsettledRunId(rows)).toBe('run-1');
  });

  it('is null when the newest run is supervised', () => {
    const rows = [
      { heartbeatExpected: true, id: 'run-1', status: 'IN_PROGRESS' },
    ];

    expect(getUnsupervisedUnsettledRunId(rows)).toBeNull();
  });

  it('is null when the newest run is not in progress', () => {
    const rows = [
      { heartbeatExpected: false, id: 'run-1', status: 'COMPLETED' },
    ];

    expect(getUnsupervisedUnsettledRunId(rows)).toBeNull();
  });
});
