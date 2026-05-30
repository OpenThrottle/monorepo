import { afterEach, describe, expect, it } from 'vitest';

import { isLifecycleHooksChildJobsEnabled } from '../lifecycle.js';

describe('isLifecycleHooksChildJobsEnabled', () => {
  afterEach(() => {
    delete process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS;
  });

  it('defaults to enabled when env unset', () => {
    delete process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS;
    expect(isLifecycleHooksChildJobsEnabled()).toBe(true);
  });

  it('disables when env is false', () => {
    process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS = 'false';
    expect(isLifecycleHooksChildJobsEnabled()).toBe(false);
  });

  it('honors resolved lifecycleHooksChildJobs over env', () => {
    process.env.OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS = 'false';
    expect(
      isLifecycleHooksChildJobsEnabled({ lifecycleHooksChildJobs: true }),
    ).toBe(true);
    expect(
      isLifecycleHooksChildJobsEnabled({ lifecycleHooksChildJobs: false }),
    ).toBe(false);
  });
});
