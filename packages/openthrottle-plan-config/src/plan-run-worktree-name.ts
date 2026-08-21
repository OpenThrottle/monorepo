/**
 * @description Derives the git worktree name a programmatic plan run uses.
 */

import {
  PLAN_RUN_WORKTREE_NAME_ID_LENGTH,
  PLAN_RUN_WORKTREE_NAME_PREFIX,
} from './plan-run-config-storage.constants.ts';

const UNSAFE_NAME_CHARACTERS = /[^A-Za-z0-9._-]/g;

/**
 * @public
 * @description Worktree name for a plan run: `plan-<first 8 chars of the plan id>`. One worktree
 * per plan, reused across runs, so the branch (`openthrottle/<name>`) accumulates the plan's work
 * and lands as one PR. Deterministic — it survives a plan retitle — and already inside the
 * character set `scripts/create_worktree.sh` sanitizes to.
 */
export const buildPlanRunWorktreeName = (planId: string): string => {
  const normalized = planId
    .trim()
    .toLowerCase()
    .replace(UNSAFE_NAME_CHARACTERS, '');

  if (normalized === '') {
    throw new Error('buildPlanRunWorktreeName requires a non-empty plan id');
  }

  return `${PLAN_RUN_WORKTREE_NAME_PREFIX}${normalized.slice(
    0,
    PLAN_RUN_WORKTREE_NAME_ID_LENGTH,
  )}`;
};
