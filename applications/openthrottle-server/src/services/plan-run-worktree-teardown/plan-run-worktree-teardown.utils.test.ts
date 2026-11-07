/**
 * @description Unit tests for the plan-run worktree name predicate and the plan_output line.
 */

import { describe, expect, it } from 'vitest';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';
import {
  describePlanRunWorktreeTeardown,
  isPlanRunWorktreeName,
  primaryCheckoutFromCommonDir,
} from './plan-run-worktree-teardown.utils.ts';

const PATH = '/root/acme/monorepo/plan-c34e018b';

describe('isPlanRunWorktreeName', () => {
  it('accepts plan-<8 lowercase hex>', () => {
    expect(isPlanRunWorktreeName(PATH)).toBe(true);
  });

  it.each([
    '/root/acme/monorepo/loop-plan-0414a40b',
    '/root/acme/monorepo/plan-C34E018B',
    '/root/acme/monorepo/plan-c34e018',
    '/root/acme/monorepo/plan-c34e018b-x',
  ])('rejects %s', (path) => {
    expect(isPlanRunWorktreeName(path)).toBe(false);
  });
});

describe('describePlanRunWorktreeTeardown', () => {
  it('names the removed path and the surviving branch', () => {
    const line = describePlanRunWorktreeTeardown({
      branch: 'openthrottle/plan-c34e018b',
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
      worktreePath: PATH,
    });

    expect(line).toContain(`removed worktree ${PATH}`);
    expect(line).toContain('branch openthrottle/plan-c34e018b kept');
  });

  it('says why a worktree was kept', () => {
    const line = describePlanRunWorktreeTeardown({
      detail: 'it has uncommitted changes',
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
      worktreePath: PATH,
    });

    expect(line).toContain(`kept worktree ${PATH}: it has uncommitted changes`);
  });

  it('marks a failed teardown as failed', () => {
    const line = describePlanRunWorktreeTeardown({
      detail: 'worktree:remove exited 1',
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
      worktreePath: PATH,
    });

    expect(line).toContain('teardown failed — worktree:remove exited 1');
  });
});

describe('primaryCheckoutFromCommonDir', () => {
  it('is the parent of a .git common dir', () => {
    expect(primaryCheckoutFromCommonDir('/repo/.git')).toBe('/repo');
  });

  it('is null for an unknown or bare common dir', () => {
    expect(primaryCheckoutFromCommonDir(null)).toBeNull();
    expect(primaryCheckoutFromCommonDir('/srv/repo.git')).toBeNull();
  });
});
