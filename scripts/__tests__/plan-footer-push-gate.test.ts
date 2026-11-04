import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration coverage for `.husky/utils/plan-footer-push-gate.sh` — the
 * warn-only push-time check that lists commits without a `Plan-Id:` footer.
 *
 * Runs against a throwaway git repo for the same reason the attribution gate's
 * test does: the inputs that matter are git states (a brand-new branch's
 * all-zero remote sha, a deletion's all-zero local sha), not strings.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const GATE = 'plan-footer-push-gate.sh';
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
    { encoding: 'utf8' },
  );
  return git(repo, 'rev-parse', 'HEAD');
};

/** Source the gate the way `.husky/pre-push` does. */
const runGate = (
  repo: string,
  pushRefs: string,
  env: Readonly<Record<string, string>> = {},
): RunResult => {
  const options = {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, ...env, OT_PUSH_REFS: pushRefs },
    stdio: ['ignore', 'pipe', 'pipe'],
  } as const;

  try {
    return {
      output: execFileSync(
        'sh',
        ['-c', `. .husky/utils/${GATE}`, '.husky/pre-push'],
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

describe('plan-footer-push-gate.sh', () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'ot-plan-footer-push-'));

    mkdirSync(join(repo, '.husky', 'utils'), { recursive: true });
    cpSync(
      join(REPO_ROOT, '.husky', 'utils', GATE),
      join(repo, '.husky', 'utils', GATE),
    );

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

  it('stays quiet when every pushed commit carries a Plan-Id', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(repo, 'feat: traced\n\nPlan-Id: abc\nTask-Id: def');

    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`);

    expect(result.status).toBe(0);
    expect(result.output).not.toContain('⚠️');
  });

  it('lists a commit without a Plan-Id, and still exits 0', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(repo, 'fix: untracked change');

    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`);

    expect(result.status).toBe(0);
    expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
    expect(result.output).toContain('Follow-ups and session kickoff');
  });

  it('does not count Plan-Id mentioned mid-line as a footer', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(repo, 'docs: explain the Plan-Id: footer');

    expect(
      runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`).output,
    ).toContain(git(repo, 'rev-parse', '--short', head));
  });

  it('scans a brand-new branch, whose remote sha is all zeros', () => {
    const head = commit(repo, 'feat: untracked');

    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${ZERO}`);

    expect(result.status).toBe(0);
    expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
  });

  it('passes a ref deletion silently', () => {
    const head = commit(repo, 'feat: base');

    const result = runGate(repo, `refs/heads/x ${ZERO} refs/heads/x ${head}`);

    expect(result.status).toBe(0);
    expect(result.output).not.toContain('⚠️');
  });

  it('does nothing when opted out', () => {
    const base = commit(repo, 'feat: base');
    const head = commit(repo, 'fix: untracked change');

    const result = runGate(repo, `refs/heads/x ${head} refs/heads/x ${base}`, {
      OPENTHROTTLE_PLAN_FOOTER_GATE: '0',
    });

    expect(result.status).toBe(0);
    expect(result.output).toBe('');
  });
});
