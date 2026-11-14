import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Integration coverage for `skills/github-pull-request/scripts/check-attribution.sh` — the one
 * attribution guard. It checks drafted PR text before `gh pr create`/`gh pr edit` publishes it
 * (PR #554 shipped a sign-off on body line 39 that only CI caught), commit messages before a
 * commit, and the commits a push would add (the `--no-verify` path that skips commit-msg), and it
 * strips the line from a commit message being written.
 *
 * The pattern set itself (`attribution-patterns.sh` beside the guard) is exercised indirectly —
 * this suite is about the guard's plumbing: modes, pattern selection, ranges, exit codes and
 * message shape. The push modes run against a throwaway git repo, because the interesting inputs
 * are git states: a brand-new branch reports an all-zero remote sha, and a ref deletion reports an
 * all-zero LOCAL sha and carries no commits. Strip-vs-fail reasoning:
 * docs/monorepo/attribution-guard-layers.md.
 */

const SCRIPT = join(
  import.meta.dirname,
  '..',
  '..',
  'skills',
  'github-pull-request',
  'scripts',
  'check-attribution.sh',
);
const ZERO = '0'.repeat(40);

interface RunResult {
  readonly output: string;
  readonly status: number;
}

interface RunOptions {
  readonly cwd: string | undefined;
  readonly input: string | undefined;
}

/** Shape execFileSync throws on a non-zero exit. A predicate, not a cast. */
interface ExecFailure {
  readonly status?: number;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

const isExecFailure = (error: unknown): error is ExecFailure => {
  return typeof error === 'object' && error !== null;
};

const run = (
  args: readonly string[],
  options: RunOptions = { cwd: undefined, input: undefined },
): RunResult => {
  try {
    return {
      output: execFileSync('sh', [SCRIPT, ...args], {
        cwd: options.cwd,
        encoding: 'utf8',
        input: options.input,
        stdio: [
          options.input === undefined ? 'ignore' : 'pipe',
          'pipe',
          'pipe',
        ],
      }),
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

const git = (repo: string, ...args: readonly string[]): string => {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
  }).trim();
};

const commit = (repo: string, message: string): string => {
  execFileSync(
    'git',
    ['-C', repo, 'commit', '--allow-empty', '--no-verify', '-q', '-m', message],
    { encoding: 'utf8' },
  );
  return git(repo, 'rev-parse', 'HEAD');
};

describe('check-attribution.sh', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'check-attribution-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  const write = (name: string, contents: string): string => {
    const file = join(dir, name);
    writeFileSync(file, contents);
    return file;
  };

  describe('PR title and body', () => {
    it('rejects a PR body carrying the observed Claude Code sign-off (PR #554)', () => {
      const body = write(
        'body.txt',
        [
          '## Summary',
          '- did a thing',
          '',
          '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
          '',
        ].join('\n'),
      );

      const result = run(['--body-file', body]);

      expect(result.status).toBe(1);
      expect(result.output).toContain('PR body');
      expect(result.output).toContain(
        '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
      );
      expect(result.output).toContain('No agent attribution');
      expect(result.output).toContain(
        'skills/github-pull-request/scripts/check-attribution.sh',
      );
      expect(result.output).toContain('gh pr create');
    });

    it('rejects Co-Authored-By regardless of casing', () => {
      const body = write(
        'body.txt',
        'co-authored-by: Claude <noreply@anthropic.com>\n',
      );

      expect(run(['--body-file', body]).status).toBe(1);
    });

    it('accepts a clean body and the conventional footers', () => {
      const body = write(
        'body.txt',
        [
          '## Testing',
          '- [ ] run the tests, a library made with care',
          '',
          'BREAKING CHANGE: nothing actually breaks',
          'Closes #123',
          'Plan-Id: 61af5bc6-26ce-4b69-910c-7c7661eecb07',
          'Task-Id: a6a2076d-28a5-418c-bf23-b15963379847',
          '',
        ].join('\n'),
      );

      const result = run(['--body-file', body]);

      expect(result.status).toBe(0);
      expect(result.output).toContain('No attribution found');
    });

    it('rejects a title with a trailing emoji sign-off using the unanchored pattern', () => {
      const title = write('title.txt', 'feat(monorepo): add a guard 🤖');

      const result = run(['--title-file', title]);

      expect(result.status).toBe(1);
      expect(result.output).toContain('PR title');
    });

    it('checks title and body in one invocation, naming each independently', () => {
      const title = write('title.txt', 'feat(monorepo): add a guard 🤖');
      const body = write(
        'body.txt',
        'Co-authored-by: Claude <x@example.invalid>\n',
      );

      const result = run(['--title-file', title, '--body-file', body]);

      expect(result.status).toBe(1);
      expect(result.output).toContain('PR title');
      expect(result.output).toContain('PR body');
    });

    it('reads the body from stdin when given "-"', () => {
      const result = run(['--body-file', '-'], {
        cwd: undefined,
        input: 'Co-Authored-By: Claude <noreply@anthropic.com>\n',
      });

      expect(result.status).toBe(1);
      expect(result.output).toContain('Co-Authored-By');
    });
  });

  describe('commit messages', () => {
    it('checks every --message-file and names the one that carries attribution', () => {
      const clean = write('clean.txt', 'feat: fine\n');
      const dirty = write(
        'dirty.txt',
        'feat: x\n\nCo-Authored-By: Bot <b@x>\n',
      );

      const result = run(['--message-file', clean, '--message-file', dirty]);

      expect(result.status).toBe(1);
      expect(result.output).toContain('commit message dirty.txt');
      expect(result.output).not.toContain('commit message clean.txt');
      expect(result.output).toContain('before committing');
    });

    it('strips attribution from a message in place, loudly, and exits 0', () => {
      const message = write(
        'COMMIT_EDITMSG',
        'feat: x\n\nPlan-Id: abc\nCo-Authored-By: Bot <b@x>\n',
      );

      const result = run(['--strip', message]);

      expect(result.status).toBe(0);
      expect(result.output).toContain('Removed agent attribution');
      expect(readFileSync(message, 'utf8')).toBe('feat: x\n\nPlan-Id: abc\n');
    });

    it('leaves a clean message untouched and silent under --strip', () => {
      const message = write('COMMIT_EDITMSG', 'feat: x\n');

      const result = run(['--strip', message]);

      expect(result.status).toBe(0);
      expect(result.output).toBe('');
      expect(readFileSync(message, 'utf8')).toBe('feat: x\n');
    });
  });

  describe('commits a push would add', () => {
    let repo: string;

    beforeEach(() => {
      repo = mkdtempSync(join(tmpdir(), 'check-attribution-repo-'));
      execFileSync('git', ['-C', repo, 'init', '-q', '-b', 'main']);
      git(repo, 'config', 'user.email', 'fixture@example.invalid');
      git(repo, 'config', 'user.name', 'Fixture');
      git(repo, 'config', 'commit.gpgsign', 'false');
    });

    afterEach(() => {
      rmSync(repo, { force: true, recursive: true });
    });

    const pushRefs = (refs: string): RunResult => {
      return run(['--push-refs', '-'], { cwd: repo, input: refs });
    };

    it('passes a range whose commits carry no attribution or only conventional footers', () => {
      const base = commit(repo, 'feat: base');
      const head = commit(
        repo,
        'feat: traced\n\nBREAKING CHANGE: yes\nCloses #123\nPlan-Id: abc\nTask-Id: def',
      );

      expect(pushRefs(`refs/heads/x ${head} refs/heads/x ${base}`).status).toBe(
        0,
      );
    });

    it('fails a range containing an attribution footer, naming the commit', () => {
      const base = commit(repo, 'feat: base');
      const head = commit(
        repo,
        'feat: sneaky\n\nCo-Authored-By: Model <x@example.invalid>',
      );

      const result = pushRefs(`refs/heads/x ${head} refs/heads/x ${base}`);

      expect(result.status).toBe(1);
      expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
      expect(result.output).toContain('Co-Authored-By');
      expect(result.output).toContain('git rebase -i');
    });

    it('scans a brand-new branch, whose remote sha is all zeros', () => {
      commit(repo, 'feat: base');
      const head = commit(
        repo,
        'feat: sneaky\n\n🤖 Generated with [Some Tool](https://example.invalid)',
      );

      // No remote exists, so `rev-list --not --remotes` must fall back to the whole branch rather
      // than silently scanning nothing.
      const result = pushRefs(`refs/heads/x ${head} refs/heads/x ${ZERO}`);

      expect(result.status).toBe(1);
      expect(result.output).toContain(git(repo, 'rev-parse', '--short', head));
    });

    it('passes a ref deletion, which pushes an all-zero local sha', () => {
      const head = commit(repo, 'feat: base');

      expect(pushRefs(`refs/heads/x ${ZERO} refs/heads/x ${head}`).status).toBe(
        0,
      );
    });

    it('fails when any one ref in a multi-ref push is dirty', () => {
      const base = commit(repo, 'feat: base');
      const clean = commit(repo, 'feat: fine');
      const dirty = commit(
        repo,
        'feat: sneaky\n\nCo-Authored-By: Model <x@example.invalid>',
      );

      const refs = [
        `refs/heads/a ${clean} refs/heads/a ${base}`,
        `refs/heads/b ${dirty} refs/heads/b ${clean}`,
      ].join('\n');

      expect(pushRefs(refs).status).toBe(1);
    });

    it('passes an empty push ref list rather than failing on nothing', () => {
      commit(repo, 'feat: base');

      expect(pushRefs('').status).toBe(0);
    });

    it('checks every commit not on a remote with --commits', () => {
      commit(repo, 'feat: sneaky\n\nMade-with: Some Editor');
      commit(repo, 'feat: fine');

      const result = run(['--commits', 'HEAD'], {
        cwd: repo,
        input: undefined,
      });

      expect(result.status).toBe(1);
      expect(result.output).toContain('feat: sneaky');
    });

    it('rejects a --commits value that is not a commit', () => {
      commit(repo, 'feat: base');

      expect(
        run(['--commits', 'no-such-ref'], { cwd: repo, input: undefined })
          .status,
      ).toBe(2);
    });
  });

  describe('usage', () => {
    it('exits 2 with usage when given no arguments', () => {
      const result = run([]);

      expect(result.status).toBe(2);
      expect(result.output).toContain('Usage:');
    });

    it('exits 2 for a file that does not exist, rather than passing it as clean', () => {
      expect(run(['--body-file', join(dir, 'missing.txt')]).status).toBe(2);
    });

    it('refuses --strip combined with a checking mode', () => {
      const message = write('COMMIT_EDITMSG', 'feat: x\n');

      expect(run(['--strip', message, '--message-file', message]).status).toBe(
        2,
      );
    });
  });
});
