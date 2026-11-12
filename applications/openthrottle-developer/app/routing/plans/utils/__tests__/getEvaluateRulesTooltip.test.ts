import { describe, expect, it } from 'vitest';

import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { getEvaluateRulesTooltip } from '~/routing/plans/utils/getEvaluateRulesTooltip';

describe('getEvaluateRulesTooltip', () => {
  describe('when the plan is terminal', () => {
    it('returns the terminal tooltip even if also running', () => {
      expect(
        getEvaluateRulesTooltip({ isRunning: true, isTerminal: true }),
      ).toBe(PLAN_TOOLBAR_COPY.evaluateRulesTerminalTooltip);
    });
  });

  describe('when the plan is running', () => {
    it('returns the running tooltip', () => {
      expect(
        getEvaluateRulesTooltip({ isRunning: true, isTerminal: false }),
      ).toBe(PLAN_TOOLBAR_COPY.evaluateRulesRunningTooltip);
    });
  });

  describe('when the plan is idle', () => {
    it('describes the evaluation pass', () => {
      expect(
        getEvaluateRulesTooltip({ isRunning: false, isTerminal: false }),
      ).toContain('rules evaluation pass');
    });
  });
});
