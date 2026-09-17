import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../lib/exec.ts';
import { BLAME_IGNORE_REVS_FILE, configureBlameIgnoreRevs } from '../lib/git.ts'; // prettier-ignore

const readConfig = (repoRoot: string): string => {
  const result = run('git', ['config', '--get', 'blame.ignoreRevsFile'], {
    allowFailure: true,
    cwd: repoRoot,
  });

  return result.stdout;
};

describe('configureBlameIgnoreRevs', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-blame-'));
    run('git', ['init', '--quiet', repoRoot]);
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  it('leaves the config unset when the ignore-revs file is missing', () => {
    // git fails fatally on a configured-but-absent ignoreRevsFile, so not
    // writing it is the whole point.
    expect(configureBlameIgnoreRevs(repoRoot)).toBe(false);
    expect(readConfig(repoRoot)).toBe('');
  });

  it('sets the config when the ignore-revs file exists', () => {
    writeFileSync(join(repoRoot, BLAME_IGNORE_REVS_FILE), '# seeded\n');

    expect(configureBlameIgnoreRevs(repoRoot)).toBe(true);
    expect(readConfig(repoRoot)).toBe(BLAME_IGNORE_REVS_FILE);
  });

  it('is idempotent across repeated provisioning runs', () => {
    writeFileSync(join(repoRoot, BLAME_IGNORE_REVS_FILE), '# seeded\n');

    expect(configureBlameIgnoreRevs(repoRoot)).toBe(true);
    expect(configureBlameIgnoreRevs(repoRoot)).toBe(true);
    expect(readConfig(repoRoot)).toBe(BLAME_IGNORE_REVS_FILE);
  });

  it('does not set the config from a worktree when the PRIMARY checkout lacks the file', () => {
    // Linked worktrees write to the primary checkout's shared config. Keying
    // off the worktree's own copy of the file would configure a path the
    // primary checkout does not have, and every `git blame` there would die
    // with `could not open object name list`.
    run(
      'git',
      ['-C', repoRoot, 'commit', '--quiet', '--allow-empty', '-m', 'init'],
      {
        // prettier-ignore
        env: {
        GIT_AUTHOR_EMAIL: 't@t',
        GIT_AUTHOR_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@t',
        GIT_COMMITTER_NAME: 't',
      },
      },
    );

    const worktree = join(repoRoot, '..', `${basename(repoRoot)}-wt`);
    run('git', ['-C', repoRoot, 'worktree', 'add', '--quiet', '--detach', worktree]); // prettier-ignore
    writeFileSync(join(worktree, BLAME_IGNORE_REVS_FILE), '# only here\n');

    try {
      expect(configureBlameIgnoreRevs(worktree)).toBe(false);
      expect(readConfig(repoRoot)).toBe('');
    } finally {
      run('git', ['-C', repoRoot, 'worktree', 'remove', '--force', worktree], {
        allowFailure: true,
      });
      rmSync(worktree, { force: true, recursive: true });
    }
  });

  it('does not throw outside a git checkout', () => {
    const bare = mkdtempSync(join(tmpdir(), 'ot-blame-bare-'));
    writeFileSync(join(bare, BLAME_IGNORE_REVS_FILE), '# seeded\n');

    try {
      expect(configureBlameIgnoreRevs(bare)).toBe(false);
    } finally {
      rmSync(bare, { force: true, recursive: true });
    }
  });
});
