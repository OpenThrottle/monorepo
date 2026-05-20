/**
 * @description Integration tests for `--worktree` flags in {@link parseRalphArgs}.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RALPH_WORKTREE_FLAG_ONLY } from '../ralph-worktree-cli';

vi.mock('../ralph-runtime-config', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../ralph-runtime-config')>();
  return {
    ...actual,
    mergeRalphRuntimeSeed: vi.fn(() => ({
      backend: 'cursor',
      iterationTimeoutMs: undefined,
      iterations: 10,
      model: 'auto',
      project: undefined,
      prompt: '/agents/ralph',
      promptFile: undefined,
      skipWorktreeSetup: undefined,
      worktree: 'from-seed',
      worktreeBase: undefined,
    })),
  };
});

const PLAN_UUID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';

describe('parseRalphArgs (worktree)', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('uses seed worktree when CLI omits --worktree', async () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.worktree).toBe('from-seed');
  });

  it('parses --worktree <name> over seed', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--worktree',
      'cli-wt',
    ];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.worktree).toBe('cli-wt');
  });

  it('parses flag-only --worktree when name omitted', async () => {
    process.argv = ['node', 'ralph.js', '--plan', PLAN_UUID, '--worktree'];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.worktree).toBe(RALPH_WORKTREE_FLAG_ONLY);
  });

  it('parses --worktree-base and --skip-worktree-setup', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--worktree',
      'wt',
      '--worktree-base',
      'main',
      '--skip-worktree-setup',
    ];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.worktree).toBe('wt');
    expect(args.worktreeBase).toBe('main');
    expect(args.skipWorktreeSetup).toBe(true);
  });
});
