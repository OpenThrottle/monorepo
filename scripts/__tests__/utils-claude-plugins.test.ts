import { describe, expect, it } from 'vitest';

import type { ClaudeRunner, ClaudeRunResult } from '../utils/claude-plugins.ts';
import {
  CLAUDE_PLUGINS_OPT_OUT_ENV,
  describeClaudePluginsResult,
  ensureRepoClaudePlugins,
  findOrphanedClaudeCheckouts,
  removeRepoClaudePlugins,
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

/** A fake `claude` for uninstall: `absent` plugins answer not_installed_at_scope, `broken` ones fail outright. */
const fakeUninstall = (
  absent: readonly string[] = [],
  broken: readonly string[] = [],
): {
  readonly calls: { readonly args: string[]; readonly cwd: string }[];
  readonly runner: ClaudeRunner;
} => {
  const calls: { readonly args: string[]; readonly cwd: string }[] = [];
  const runner: ClaudeRunner = (args, cwd) => {
    calls.push({ args: [...args], cwd });
    const plugin = (args[2] ?? '').replace('@openthrottle-dev', '');
    if (absent.includes(plugin)) {
      return { exitCode: 1, stderr: '', stdout: JSON.stringify({ failureCode: 'not_installed_at_scope', outcome: 'failed' }) }; // prettier-ignore
    }
    if (broken.includes(plugin)) {
      return { exitCode: 1, stderr: 'boom', stdout: '' };
    }
    return ok();
  };
  return { calls, runner };
};

describe('removeRepoClaudePlugins', () => {
  it('uninstalls dependents first, openthrottle last, at local scope with --keep-data from the checkout', () => {
    const { calls, runner } = fakeUninstall();
    const result = removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toEqual({
      absent: [],
      kind: 'ok',
      removed: ['openthrottle-guards', 'openthrottle-workflow', 'openthrottle'],
    });
    expect(calls.map((call) => call.args[2])).toEqual([
      'openthrottle-guards@openthrottle-dev',
      'openthrottle-workflow@openthrottle-dev',
      'openthrottle@openthrottle-dev',
    ]);
    for (const call of calls) {
      expect(call.cwd).toBe(WORKTREE);
      expect(call.args).toEqual(
        expect.arrayContaining([
          'uninstall',
          '--scope',
          'local',
          '--keep-data',
        ]),
      );
    }
  });

  it('never names the public @openthrottle marketplace', () => {
    const { calls, runner } = fakeUninstall();
    removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(calls.every((call) => call.args[2]?.endsWith('@openthrottle-dev'))).toBe(true); // prettier-ignore
  });

  it('counts a plugin that is already gone as absent, so a second run is a no-op', () => {
    const { runner } = fakeUninstall(REPO_CLAUDE_PLUGINS);
    const result = removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toMatchObject({ kind: 'ok', removed: [] });
  });

  it('reports a plugin whose uninstall genuinely failed, after trying the rest', () => {
    const { calls, runner } = fakeUninstall([], ['openthrottle-workflow']);
    const result = removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect(result).toEqual({
      kind: 'failed',
      message: 'could not uninstall openthrottle-workflow',
    });
    expect(calls).toHaveLength(3);
  });

  it('never unregisters the primary checkout, and does nothing when opted out or claude is missing', () => {
    const { calls, runner } = fakeUninstall();
    const primary = removeRepoClaudePlugins({
      checkout: PRIMARY,
      env: {},
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });
    const optedOut = removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: { [CLAUDE_PLUGINS_OPT_OUT_ENV]: '0' },
      isClaudeInstalled: installed,
      primary: PRIMARY,
      runClaude: runner,
    });
    const missing = removeRepoClaudePlugins({
      checkout: WORKTREE,
      env: {},
      isClaudeInstalled: () => false,
      primary: PRIMARY,
      runClaude: runner,
    });

    expect([primary.kind, optedOut.kind, missing.kind]).toEqual([
      'skipped',
      'skipped',
      'skipped',
    ]);
    expect(calls).toEqual([]);
  });
});

describe('findOrphanedClaudeCheckouts', () => {
  const GONE = '/Users/someone/.openthrottle/worktrees/o/monorepo/gone';
  const local = (projectPath: string): Record<string, string> => {
    return { projectPath, scope: 'local' };
  };

  it('returns each missing @openthrottle-dev local checkout once, never the primary or another marketplace', () => {
    const installed = {
      plugins: {
        'openthrottle-guards@openthrottle-dev': [local(GONE), local(WORKTREE)],
        'openthrottle@openthrottle': [{ scope: 'user' }, local('/gone/public')],
        'openthrottle@openthrottle-dev': [local(GONE), local(PRIMARY)],
        'other@openthrottle-dev': [local('/gone/other')],
      },
      version: 2,
    };

    const orphans = findOrphanedClaudeCheckouts({
      exists: (path) => {
        return path === WORKTREE;
      },
      installed,
      primary: PRIMARY,
    });

    expect(orphans).toEqual([GONE]);
  });

  it('returns nothing for an unreadable shape', () => {
    expect(findOrphanedClaudeCheckouts({ exists: () => false, installed: null, primary: PRIMARY })).toEqual([]); // prettier-ignore
    expect(findOrphanedClaudeCheckouts({ exists: () => false, installed: { plugins: 3 }, primary: PRIMARY })).toEqual([]); // prettier-ignore
  });
});
