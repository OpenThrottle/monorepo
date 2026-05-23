/**
 * @description Tests for agent CLI worktree flag resolution and argv formatting.
 */

import { describe, expect, it } from 'vitest';
import {
  RALPH_WORKTREE_FLAG_ONLY,
  appendRalphWorktreeShellFlags,
  buildWorktreeNestedArgv,
  resolveRalphWorktreeName,
} from '../ralph-worktree-cli';

describe('resolveRalphWorktreeName', () => {
  it('prefers CLI over seed and handoff', () => {
    expect(
      resolveRalphWorktreeName({
        cli: 'from-cli',
        handoffTargetId: 'target-one',
        seed: 'from-seed',
      }),
    ).toBe('from-cli');
  });

  it('uses seed when CLI omitted', () => {
    expect(
      resolveRalphWorktreeName({
        handoffTargetId: 'target-one',
        seed: 'from-seed',
      }),
    ).toBe('from-seed');
  });

  it('defaults to handoff target id', () => {
    expect(
      resolveRalphWorktreeName({
        handoffTargetId: 'monorepo-worktree-one',
      }),
    ).toBe('monorepo-worktree-one');
  });
});

describe('buildWorktreeNestedArgv', () => {
  it('emits flag-only --worktree', () => {
    expect(buildWorktreeNestedArgv(RALPH_WORKTREE_FLAG_ONLY)).toEqual([
      '--worktree',
    ]);
  });

  it('emits named worktree and cursor extras', () => {
    expect(
      buildWorktreeNestedArgv('feature-a', {
        skipWorktreeSetup: true,
        worktreeBase: 'main',
      }),
    ).toEqual([
      '--worktree',
      'feature-a',
      '--worktree-base',
      'main',
      '--skip-worktree-setup',
    ]);
  });
});

describe('appendRalphWorktreeShellFlags', () => {
  it('appends -w for cursor', () => {
    const cmd = appendRalphWorktreeShellFlags(
      'cursor-agent --force -p "hi"',
      'cursor',
      { worktree: 'wt-1' },
    );
    expect(cmd).toContain('-w wt-1');
  });

  it('omits cursor-only flags for claude', () => {
    const cmd = appendRalphWorktreeShellFlags(
      'claude --bare -p "hi"',
      'claude',
      {
        skipWorktreeSetup: true,
        worktree: 'wt-1',
        worktreeBase: 'main',
      },
    );
    expect(cmd).toContain('-w wt-1');
    expect(cmd).not.toContain('worktree-base');
    expect(cmd).not.toContain('skip-worktree-setup');
  });
});
