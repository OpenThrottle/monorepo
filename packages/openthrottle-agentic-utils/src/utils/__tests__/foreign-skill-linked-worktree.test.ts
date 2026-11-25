/**
 * @description The curated layer in a linked worktree of an already-injected checkout. Both share
 * the primary's `info/exclude`, so tearing the worktree's layer down must keep the base checkout's
 * paths ignored, and a worktree whose folder is already gone tears down without throwing.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { FOREIGN_SKILL_LEDGER_DIR_ENV } from '../../types/foreign-skill-injection.ts';
import { resolveGitExcludePath } from '../foreign-skill-git-exclude.ts';
import { ledgerPathForRepo } from '../foreign-skill-ledger.ts';
import { ensureMaterialized, teardown } from '../foreign-skill-materialize.ts';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '../workspace-paths.ts';

const git = (repo: string, ...args: string[]): string => {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
  }).trim();
};

const writeSkill = (root: string, name: string): void => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: The ${name} skill\n---\n\n# ${name}\n`,
  );
};

describe('foreign-skill-injection — linked worktree of an injected checkout', () => {
  let base: string;
  let repo: string;
  let worktree: string;
  let otSkills: string;
  let env: NodeJS.ProcessEnv;

  const inject = (repoPath: string): ReturnType<typeof ensureMaterialized> => {
    return ensureMaterialized({
      env,
      otCuratedSkillsDir: otSkills,
      repoPath,
    });
  };

  beforeEach(() => {
    // realpath: macOS tmpdir is a symlink, and git reports real paths.
    base = realpathSync(mkdtempSync(join(tmpdir(), 'ot-fsi-worktree-')));
    repo = join(base, 'target-repo');
    worktree = join(base, 'plan-aaaaaaaa');
    otSkills = join(base, 'ot', 'skills');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });

    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');
    git(repo, 'worktree', 'add', '-q', '-b', 'plan-aaaaaaaa', worktree);

    writeSkill(otSkills, 'ot-plans');

    env = {
      ...process.env,
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: join(base, 'ledgers'),
      [HOST_WORKSPACES_DIR_ENV]: '',
    };
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('the worktree and its primary share one exclude file', () => {
    expect(resolveGitExcludePath(worktree)).toBe(resolveGitExcludePath(repo));
  });

  test('injects into the worktree with both git statuses clean', () => {
    inject(repo);
    const result = inject(worktree);

    expect(result.injectedNames).toEqual(['ot-plans']);
    expect(existsSync(join(worktree, '.agents/skills/ot-plans'))).toBe(true);
    expect(git(worktree, 'status', '--porcelain')).toBe('');
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  test("tearing the worktree down keeps the base checkout's skills ignored", () => {
    inject(repo);
    inject(worktree);

    teardown({ env, repoPath: worktree });

    expect(existsSync(join(worktree, '.agents/skills/ot-plans'))).toBe(false);
    expect(existsSync(join(repo, '.agents/skills/ot-plans'))).toBe(true);
    expect(git(repo, 'status', '--porcelain')).toBe('');
    expect(git(worktree, 'status', '--porcelain')).toBe('');
  });

  test('tearing the base checkout down keeps the worktree’s skills ignored', () => {
    inject(repo);
    inject(worktree);

    teardown({ env, repoPath: repo });

    expect(existsSync(join(worktree, '.agents/skills/ot-plans'))).toBe(true);
    expect(git(worktree, 'status', '--porcelain')).toBe('');
  });

  test('the exclude block goes once the last sharing checkout is torn down', () => {
    inject(repo);
    inject(worktree);

    teardown({ env, repoPath: worktree });
    teardown({ env, repoPath: repo });

    const excludePath = resolveGitExcludePath(repo) ?? '';
    expect(readFileSync(excludePath, 'utf8')).not.toContain('OpenThrottle');
  });

  test('a worktree whose folder is already gone tears down quietly and drops its ledger', () => {
    inject(repo);
    inject(worktree);
    rmSync(worktree, { force: true, recursive: true });

    expect(() => {
      teardown({ env, repoPath: worktree });
    }).not.toThrow();
    expect(existsSync(ledgerPathForRepo(worktree, env))).toBe(false);
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  test('re-injecting the base checkout after a vanished worktree keeps only its own paths', () => {
    inject(repo);
    inject(worktree);
    rmSync(worktree, { force: true, recursive: true });

    inject(repo);

    expect(git(repo, 'status', '--porcelain')).toBe('');
  });
});
