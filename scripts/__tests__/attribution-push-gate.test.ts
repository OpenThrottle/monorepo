import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration coverage for `.husky/lib/attribution-push-gate.sh` — the push-time
 * half of the attribution guards, which catches a commit that got past
 * `.husky/commit-msg` (the `--no-verify` path that put an attribution line on
 * PR #554).
 *
 * Every case runs against a throwaway git repo, because the interesting inputs
 * are git states rather than strings: a brand-new branch reports an all-zero
 * remote sha and has no range to diff, and a ref deletion reports an all-zero
 * LOCAL sha and carries no commits at all. Both are easy to get wrong in a way
 * that only shows up on a real push.
 *
 * Reasoning for the strip-vs-fail split across the four layers:
 * docs/monorepo/attribution-guard-layers.md.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const HUSKY_LIB = join(REPO_ROOT, '.husky', 'lib');
const ZERO = '0'.repeat(40);

interface RunResult {
  readonly output: string;
  readonly status: number;
}

/** Shape execFileSync throws on a non-zero exit. A predicate, not a cast. */
interface ExecFailure {
  readonly status?: number;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

const isExecFailure = (error: unknown): error is ExecFailure =>
  typeof error === 'object' && error !== null;

const git = (repo: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

/** Commit without touching the worktree, bypassing hooks the fixture has none of. */
const commit = (repo: string, message: string): string => {
  execFileSync(
    'git',
    ['-C', repo, 'commit', '--allow-empty', '--no-verify', '-q', '-m', message],
    {
      encoding: 'utf8',
    },
  );
  return git(repo, 'rev-parse', 'HEAD');
};

/**
 * Source the gate the way `.husky/pre-push` does, so `$0` resolves its sibling
 * pattern file exactly as it would in the hook.
 */
const runGate = (repo: string, pushRefs: string): RunResult => {
  const options = {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, OT_PUSH_REFS: pushRefs },
    stdio: ['ignore', 'pipe', 'pipe'],
  } as const;

  try {
    return {
      output: execFileSync(
        'sh',
        ['-c', '. .husky/lib/attribution-push-gate.sh', '.husky/pre-push'],
        options,
      ),
      status: 0,
    };
  } catch (error) {
    if (!isExecFailure(error)) {
      throw error;
    }
    return {
      output: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}`,
      status: error.status ?? 1,
    };
  }
};

describe('attribution-push-gate.sh', () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'ot-attr-push-'));

    mkdirSync(join(repo, '.husky', 'lib'), { recursive: true });
    for (const file of [
      'attribution-patterns.sh',
      'attribution-push-gate.sh',
    ]) {
      cpSync(join(HUSKY_LIB, file), join(repo, '.husky', 'lib', file));
    }

    execFileSync('git', ['-C', repo, 'init', '-q', '-b', 'main']);
    git(repo, 'config', 'user.email', 'fixture@example.invalid');
    git(repo, 'config', 'user.name', 'Fixture');
    git(repo, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(repo, 'README.md'), '# fixture\n');
    execFileSync('git', ['-C', repo, 'add', 'README.md']);
  });

  afterEach(() => {
    rmSync(repo, { force: true, recursive: true });
  });

  it('passes a range whose commits carry no attribution', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(repo, 'feat: more work');

    expect(
      runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`).status,
    ).toBe(0);
  });

  it('passes commits carrying only conventional footers', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(
      repo,
      'feat: traced work\n\nBREAKING CHANGE: yes\nCloses #123\nPlan-Id: abc\nTask-Id: def',
    );

    expect(
      runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`).status,
    ).toBe(0);
  });

  it('fails a range containing an attribution footer, naming the commit', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(
      repo,
      'feat: sneaky\n\nCo-Authored-By: Some Model <noreply@example.invalid>',
    );

    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`);

    expect(result.status).toBe(1);
    expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
    expect(result.output).toContain('Co-Authored-By');
    expect(result.output).toContain('AGENTS.md § No agent attribution');
  });

  it('matches case-insensitively, as the shared pattern set requires', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(
      repo,
      'feat: sneaky\n\nco-authored-by: some model <x@example.invalid>',
    );

    expect(
      runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`).status,
    ).toBe(1);
  });

  it('scans a brand-new branch, whose remote sha is all zeros and has no range', () => {
    commit(repo, 'feat: base');
    const head = commit(
      repo,
      'feat: sneaky\n\n🤖 Generated with [Some Tool](https://example.invalid)',
    );

    // No remote exists, so `rev-list --not --remotes` must fall back to the
    // whole branch rather than silently scanning nothing.
    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${ZERO}`);

    expect(result.status).toBe(1);
    expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
  });

  it('passes a ref deletion, which pushes an all-zero local sha and no commits', () => {
    const head = commit(repo, 'feat: base');

    expect(
      runGate(repo, `refs/heads/x ${ZERO} refs/heads/x ${head}`).status,
    ).toBe(0);
  });

  it('fails when any one ref in a multi-ref push is dirty', () => {
    const base = commit(repo, 'feat: base');
    const clean = commit(repo, 'feat: fine');
    const dirty = commit(
      repo,
      'feat: sneaky\n\nCo-Authored-By: Some Model <x@example.invalid>',
    );

    const refs = [
      `refs/heads/a ${clean} refs/heads/a ${base}`,
      `refs/heads/b ${dirty} refs/heads/b ${clean}`,
    ].join('\n');

    expect(runGate(repo, refs).status).toBe(1);
  });

  it('passes an empty push ref list rather than failing closed on nothing', () => {
    commit(repo, 'feat: base');

    expect(runGate(repo, '').status).toBe(0);
  });
});
