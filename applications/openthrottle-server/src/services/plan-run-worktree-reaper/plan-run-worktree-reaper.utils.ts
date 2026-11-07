/**
 * @description Pure helpers for the plan-run worktree reaper.
 */

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeReaperSummary } from './plan-run-worktree-reaper.types.ts';

const FALSE_VALUES: readonly string[] = ['0', 'false', 'no', 'off'];

/**
 * @description Whether the sweep only reports. True unless the flag explicitly says otherwise, so
 * an unset or misspelt value never starts removing worktrees.
 */
export const isPlanRunWorktreeReaperDryRun = (
  value: string | undefined,
): boolean => {
  if (value === undefined) return true;
  return !FALSE_VALUES.includes(value.trim().toLowerCase());
};

/** The 8-hex plan id prefix a `plan-<8>` worktree name carries. */
export const planIdPrefixFromWorktreeName = (name: string): string => {
  return name.slice('plan-'.length);
};

/** @description One log/notification line per nominee, plus a header with the counts. */
export const describePlanRunWorktreeReaperSummary = (
  summary: PlanRunWorktreeReaperSummary,
): string => {
  const mode = summary.dryRun ? 'dry run' : 'live';
  const header = `[plan-run-worktree-reaper] ${mode}: examined=${summary.examined}, nominated=${summary.nominated.length}, removed=${summary.removed}, deferred=${summary.deferred}`;
  const lines = summary.nominated.map((entry) => {
    const { verdict } = entry;
    const path = entry.candidate.worktreePath;
    if (verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED) {
      return `  removed ${path} (${entry.reason})`;
    }
    if (verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE) {
      return `  would remove ${path} (${entry.reason})`;
    }
    return `  kept ${path} (${entry.reason}): ${verdict.outcome} — ${verdict.detail}`;
  });
  return [header, ...lines].join('\n');
};
