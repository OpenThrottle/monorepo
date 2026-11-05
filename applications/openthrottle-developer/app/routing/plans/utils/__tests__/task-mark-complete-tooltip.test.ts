import { describe, expect, it } from 'vitest';

import { PLAN_TASK_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { getTaskMarkCompleteTooltip } from '~/routing/plans/utils/task-mark-complete-tooltip';

const idle = {
  isCompleted: false,
  planIsRunning: false,
  planIsTerminal: false,
};

describe('getTaskMarkCompleteTooltip', () => {
  describe('when the task is completed', () => {
    it('says so, over every plan state', () => {
      expect(
        getTaskMarkCompleteTooltip({
          isCompleted: true,
          planIsRunning: true,
          planIsTerminal: true,
        }),
      ).toBe('Task is already completed');
    });
  });

  describe('when the plan is terminal', () => {
    it('returns the terminal tooltip over the running one', () => {
      expect(
        getTaskMarkCompleteTooltip({
          ...idle,
          planIsRunning: true,
          planIsTerminal: true,
        }),
      ).toBe(PLAN_TASK_TOOLBAR_COPY.markCompleteTerminalTooltip);
    });
  });

  describe('when the plan is running', () => {
    it('returns the running tooltip', () => {
      expect(getTaskMarkCompleteTooltip({ ...idle, planIsRunning: true })).toBe(
        PLAN_TASK_TOOLBAR_COPY.markCompleteRunningTooltip,
      );
    });
  });

  describe('when nothing blocks it', () => {
    it('returns the default hint', () => {
      expect(getTaskMarkCompleteTooltip(idle)).toBe(
        'Mark this task as completed',
      );
    });
  });
});
