import { describe, expect, it } from 'vitest';

import {
  getPromotionQueuedDescription,
  readPromoteTaskJobId,
} from '~/routing/plans/utils/promote-task-toast';

describe('readPromoteTaskJobId', () => {
  describe('when the result carries a string job id', () => {
    it('returns it', () => {
      expect(readPromoteTaskJobId({ jobId: 'job-1' })).toBe('job-1');
    });
  });

  describe('when the result has no usable job id', () => {
    it('returns null', () => {
      expect(readPromoteTaskJobId(null)).toBeNull();
      expect(readPromoteTaskJobId('job-1')).toBeNull();
      expect(readPromoteTaskJobId({})).toBeNull();
      expect(readPromoteTaskJobId({ jobId: 7 })).toBeNull();
    });
  });
});

describe('getPromotionQueuedDescription', () => {
  describe('when the job id is known', () => {
    it('names the job', () => {
      expect(getPromotionQueuedDescription('job-1')).toBe(
        'Job job-1. The new plan appears on the plans list once the job completes.',
      );
    });
  });

  describe('when the job id is missing or empty', () => {
    it('omits the job', () => {
      const expected = `The new plan appears on the plans list once the job completes.`;

      expect(getPromotionQueuedDescription(null)).toBe(expected);
      expect(getPromotionQueuedDescription('')).toBe(expected);
    });
  });
});
