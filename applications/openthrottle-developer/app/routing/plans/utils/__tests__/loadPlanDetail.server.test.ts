import { describe, expect, it } from 'vitest';

import { loadPlanDetail } from '../loadPlanDetail.server';

describe('loadPlanDetail', () => {
  describe('when the plan id is missing', () => {
    it('returns a null plan and pre-resolved deferred keys', async () => {
      const result = await loadPlanDetail(
        new Request('http://localhost/plans'),
        undefined,
      );

      expect(result.plan).toBeNull();
      expect(result.tasks).toEqual([]);
      await expect(result.inboxMessages).resolves.toEqual([]);
      await expect(result.workspaceRepositories).resolves.toEqual([]);
    });
  });
});
