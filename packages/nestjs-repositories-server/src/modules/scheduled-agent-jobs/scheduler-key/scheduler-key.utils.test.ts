import { describe, expect, it } from 'vitest';

import { schedulerKeyForJob } from './scheduler-key.utils.ts';

describe('schedulerKeyForJob', () => {
  it('derives a stable scheduler key from a job id', () => {
    expect(schedulerKeyForJob('abc-123')).toBe('scheduled-job:abc-123');
  });

  it('is deterministic for the same id', () => {
    expect(schedulerKeyForJob('x')).toBe(schedulerKeyForJob('x'));
  });
});
