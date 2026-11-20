import { describe, expect, test } from 'vitest';

import { queueJobDetailPath } from '../queueJobDetailPath';

describe('queueJobDetailPath', () => {
  test('encodes queue name and job id in the path', () => {
    expect(queueJobDetailPath('Plans', 'job-1')).toBe('/queues/Plans/job-1');
    expect(queueJobDetailPath('Plans', 'ralph-orch:abc')).toBe(
      '/queues/Plans/ralph-orch%3Aabc',
    );
  });

  test('encodes spaces in the queue name', () => {
    expect(queueJobDetailPath('Work Ledger Harvest', 'repeat:abc')).toBe(
      '/queues/Work%20Ledger%20Harvest/repeat%3Aabc',
    );
  });
});
