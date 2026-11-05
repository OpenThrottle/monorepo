import { describe, expect, it } from 'vitest';

import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { getPlanMarkCompleteTooltip } from '~/routing/plans/utils/plan-mark-complete-tooltip';

describe('getPlanMarkCompleteTooltip', () => {
  describe('when the plan is completed', () => {
    it('says so, even if also running', () => {
      expect(
        getPlanMarkCompleteTooltip({ isCompleted: true, isRunning: true }),
      ).toBe('Plan is already completed');
    });
  });

  describe('when the plan is running', () => {
    it('returns the running tooltip', () => {
      expect(
        getPlanMarkCompleteTooltip({ isCompleted: false, isRunning: true }),
      ).toBe(PLAN_TOOLBAR_COPY.markCompleteRunningTooltip);
    });
  });

  describe('when nothing blocks it', () => {
    it('returns the default hint', () => {
      expect(
        getPlanMarkCompleteTooltip({ isCompleted: false, isRunning: false }),
      ).toBe('Mark this plan as completed');
    });
  });
});
