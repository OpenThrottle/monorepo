/**
 * @description The worktree-overlay layer alongside the curated layer: it materializes only the
 * skills it names, keeps its own ledger and `.git/info/exclude` block, leaves `git status` clean, and
 * neither layer's teardown touches the other's entries. An empty target dir is not target-owned.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '../../workspace-paths.ts';
import {
  ensureMaterialized,
  FOREIGN_SKILL_LEDGER_DIR_ENV,
  FOREIGN_SKILL_MATERIALIZATION_LAYER,
  layerForLedgerPath,
  ledgerPathForRepo,
  listLedgerPaths,
  readLedger,
  teardown,
} from '../index.ts';

const OVERLAY = FOREIGN_SKILL_MATERIALIZATION_LAYER.WORKTREE_OVERLAY;

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

describe('foreign-skill-injection — worktree overlay layer', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let env: NodeJS.ProcessEnv;

  const overlay = (): ReturnType<typeof ensureMaterialized> => {
    return ensureMaterialized({
      env,
      layer: OVERLAY,
      onlySkillNames: ['ot-worktree'],
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
  };

  const curated = (): ReturnType<typeof ensureMaterialized> => {
    return ensureMaterialized({
      env,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
  };

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-layers-'));
    repo = join(base, 'target-repo');
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

    writeSkill(otSkills, 'ot-plans');
    writeSkill(otSkills, 'ot-worktree');

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

  test('materializes only ot-worktree, into its own ledger, with git status clean', () => {
    const result = overlay();

    expect(result.injectedNames).toEqual(['ot-worktree']);
    expect(existsSync(join(repo, '.agents/skills/ot-worktree/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(join(repo, '.agents/skills/ot-plans'))).toBe(false);
    expect(git(repo, 'status', '--porcelain')).toBe('');

    expect(readLedger(ledgerPathForRepo(repo, env))).toBeUndefined();
    const overlayLedger = ledgerPathForRepo(repo, env, OVERLAY);
    expect(readLedger(overlayLedger)?.entries).toHaveLength(2);
    expect(layerForLedgerPath(overlayLedger)).toBe(OVERLAY);
    expect(readFileSync(join(repo, '.git/info/exclude'), 'utf8')).toContain(
      'worktree-skill-overlay',
    );
  });

  test('overlay teardown removes only its own entries and block', () => {
    overlay();

    teardown({ env, layer: OVERLAY, repoPath: repo });

    expect(existsSync(join(repo, '.agents/skills/ot-worktree'))).toBe(false);
    expect(readLedger(ledgerPathForRepo(repo, env, OVERLAY))).toBeUndefined();
    expect(readFileSync(join(repo, '.git/info/exclude'), 'utf8')).not.toContain(
      'worktree-skill-overlay',
    );
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  test('a curated teardown leaves the overlay in place', () => {
    overlay();
    curated();

    teardown({ env, repoPath: repo });

    expect(existsSync(join(repo, '.agents/skills/ot-worktree/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(join(repo, '.agents/skills/ot-plans'))).toBe(false);
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  test('a skill one layer placed is skipped silently by the other', () => {
    overlay();

    const result = curated();

    expect(result.warnings.join('\n')).not.toContain('ot-worktree');
    expect(
      readLedger(ledgerPathForRepo(repo, env))?.entries.map(
        (entry) => entry.name,
      ),
    ).not.toContain('ot-worktree');
    expect(result.injectedNames).toEqual(['ot-plans']);
  });

  test('an empty .agents/skills/ot-worktree dir does not suppress the overlay', () => {
    mkdirSync(join(repo, '.agents/skills/ot-worktree'), { recursive: true });

    const result = overlay();

    expect(result.injectedNames).toEqual(['ot-worktree']);
    expect(existsSync(join(repo, '.agents/skills/ot-worktree/SKILL.md'))).toBe(
      true,
    );
  });

  test('a repo shipping its own ot-worktree wins', () => {
    writeSkill(join(repo, '.agents/skills'), 'ot-worktree');

    const result = overlay();

    expect(result.injectedNames).toEqual([]);
    expect(listLedgerPaths(env)).toEqual([]);
  });
});
