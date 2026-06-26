import { describe, expect, it } from 'vitest';
import { isLifecycleHooksChildJobsEnabled } from '../index.js';

describe('isLifecycleHooksChildJobsEnabled', () => {
  it('returns the explicit lifecycleHooksChildJobs flag when set, ignoring env', () => {
    expect(
      isLifecycleHooksChildJobsEnabled({
        env: { OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS: 'false' },
        lifecycleHooksChildJobs: true,
      }),
    ).toBe(true);

    expect(
      isLifecycleHooksChildJobsEnabled({
        env: { OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS: 'true' },
        lifecycleHooksChildJobs: false,
      }),
    ).toBe(false);
  });

  it("disables child jobs when env is exactly 'false' and no explicit flag is passed", () => {
    expect(
      isLifecycleHooksChildJobsEnabled({
        env: { OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS: 'false' },
      }),
    ).toBe(false);
  });

  it('defaults to enabled when env var is unset, empty, or any non-"false" value', () => {
    expect(isLifecycleHooksChildJobsEnabled({ env: {} })).toBe(true);
    expect(
      isLifecycleHooksChildJobsEnabled({
        env: { OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS: 'true' },
      }),
    ).toBe(true);
    expect(
      isLifecycleHooksChildJobsEnabled({
        env: { OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS: '' },
      }),
    ).toBe(true);
  });

  it('defaults to enabled when called with no options', () => {
    const previous = process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS;
    delete process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS;
    try {
      expect(isLifecycleHooksChildJobsEnabled()).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS;
      } else {
        process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS = previous;
      }
    }
  });
});
