import { describe, expect, it } from 'vitest';

import type { ClaudeRunner, ClaudeRunResult } from '../utils/claude-plugins.ts';
import {
  CLAUDE_PLUGINS_OPT_OUT_ENV,
  describeClaudePluginsResult,
  ensureRepoClaudePlugins,
  REPO_CLAUDE_PLUGINS,
} from '../utils/claude-plugins.ts';

const PRIMARY = '/Users/someone/Development/monorepo';
const WORKTREE = '/Users/someone/.openthrottle/worktrees/o/monorepo/wt';

const ok = (stdout = ''): ClaudeRunResult => {
  return { exitCode: 0, stderr: '', stdout };
};

const installed = (): boolean => {
  return true;
};

/** A fake `claude` that answers `marketplace list --json` with `listed` and records every call. */
const fakeClaude = (
  listed: readonly unknown[],
  failInstallOf: string | null = null,
): { readonly calls: string[][]; readonly runner: ClaudeRunner } => {
  const calls: string[][] = [];
  const runner: ClaudeRunner = (args) => {
    calls.push([...args]);
    if (args[1] === 'marketplace' && args[2] === 'list') {
      return ok(JSON.stringify(listed));
    }
    if (
      args[1] === 'install' &&
      args[2] === `${failInstallOf}@openthrottle-dev`
    ) {
      return { exitCode: 1, stderr: 'boom', stdout: '' };
    }
    return ok();
  };
  return { calls, runner };
};

describe('ensureRepoClaudePlugins', () => {
  it('adds the marketplace from the primary checkout when absent, then installs every plugin locally', () => {
    const { calls, runner } = fakeClaude([]);
    const result = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toEqual({
      installed: REPO_CLAUDE_PLUGINS,
      kind: 'ok',
      marketplace: 'added',
    });
    expect(calls).toContainEqual([
      'plugin',
      'marketplace',
      'add',
      `${PRIMARY}/plugins`,
    ]);
    expect(calls).toContainEqual([
      'plugin',
      'install',
      'openthrottle-workflow@openthrottle-dev',
      '--scope',
      'local',
    ]);
  });

  it('leaves a marketplace already pointing at the primary checkout alone', () => {
    const { calls, runner } = fakeClaude([
      {
        name: 'openthrottle-dev',
        path: `${PRIMARY}/plugins`,
        source: 'directory',
      },
    ]);
    const result = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toMatchObject({ kind: 'ok', marketplace: 'present' });
    expect(calls.some((call) => call[2] === 'add')).toBe(false);
  });

  it('never repoints a marketplace registered from another source', () => {
    const { calls, runner } = fakeClaude([
      {
        name: 'openthrottle-dev',
        path: '/elsewhere/plugins',
        source: 'directory',
      },
    ]);
    const result = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toEqual({ kind: 'conflict', source: '/elsewhere/plugins' });
    expect(calls).toHaveLength(1);
    expect(describeClaudePluginsResult(result, PRIMARY)?.message).toContain(
      `claude plugin marketplace add ${PRIMARY}/plugins`,
    );
  });

  it('reports a plugin that failed to install', () => {
    const { runner } = fakeClaude([], 'openthrottle-guards');
    const result = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toEqual({
      kind: 'failed',
      message: 'could not install openthrottle-guards',
    });
  });

  it('does nothing when opted out or when claude is not installed', () => {
    const { calls, runner } = fakeClaude([]);
    const optedOut = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: { [CLAUDE_PLUGINS_OPT_OUT_ENV]: '0' },
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });
    const missing = ensureRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: () => false,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(optedOut.kind).toBe('skipped');
    expect(missing.kind).toBe('skipped');
    expect(calls).toEqual([]);
    expect(describeClaudePluginsResult(missing, PRIMARY)).toBeUndefined();
  });
});
