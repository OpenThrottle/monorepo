/**
 * @description Unit tests for the reaper's pure helpers.
 */

import { describe, expect, it } from 'vitest';

import {
  isPlanRunWorktreeReaperDryRun,
  planIdPrefixFromWorktreeName,
} from './plan-run-worktree-reaper.utils.ts';

describe('isPlanRunWorktreeReaperDryRun', () => {
  it.each([undefined, '', '1', 'true', 'yes', 'tru'])(
    'is a dry run for %s',
    (value) => {
      expect(isPlanRunWorktreeReaperDryRun(value)).toBe(true);
    },
  );

  it.each(['0', 'false', 'FALSE', ' off ', 'no'])('removes for %s', (value) => {
    expect(isPlanRunWorktreeReaperDryRun(value)).toBe(false);
  });
});

describe('planIdPrefixFromWorktreeName', () => {
  it('strips the plan- prefix', () => {
    expect(planIdPrefixFromWorktreeName('plan-c34e018b')).toBe('c34e018b');
  });
});
