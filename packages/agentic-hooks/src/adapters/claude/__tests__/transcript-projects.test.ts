/**
 * Which transcript directories the backfill may read: derived from this repo's
 * checkouts, never discovered by listing the projects directory.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  claudeProjectSlug,
  parseWorktreeList,
  resolveCheckouts,
  resolveOwnedProjects,
  transcriptBelongsTo,
} from '../transcript-projects.ts';

describe('claudeProjectSlug', () => {
  it('replaces every non-alphanumeric character with a dash', () => {
    expect(claudeProjectSlug('/Users/a/.openthrottle/wt/x_y')).toBe(
      '-Users-a--openthrottle-wt-x-y',
    );
  });
});

describe('parseWorktreeList', () => {
  it('reads worktree paths and drops bare and prunable entries', () => {
    const porcelain = [
      'worktree /repo',
      'HEAD abc',
      'branch refs/heads/main',
      '',
      'worktree /wt/one',
      'HEAD def',
      'branch refs/heads/one',
      '',
      'worktree /gone',
      'HEAD 000',
      'detached',
      'prunable gitdir file points to non-existent location',
      '',
      'worktree /bare.git',
      'bare',
      '',
    ].join('\n');
    expect(parseWorktreeList(porcelain)).toEqual(['/repo', '/wt/one']);
  });
});

describe('resolveCheckouts', () => {
  it('adds git worktrees only when asked', () => {
    const listWorktrees = () => ['/repo', '/wt/one'];
    expect(
      resolveCheckouts({
        includeWorktrees: true,
        listWorktrees,
        repoRoot: '/repo',
      }),
    ).toEqual(['/repo', '/wt/one']);
    expect(
      resolveCheckouts({
        includeWorktrees: false,
        listWorktrees,
        repoRoot: '/repo',
      }),
    ).toEqual(['/repo']);
  });
});

describe('resolveOwnedProjects', () => {
  let tmp: string;
  let projectsDir: string;

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'projects-')));
    projectsDir = path.join(tmp, 'projects');
    fs.mkdirSync(projectsDir);
  });

  afterEach(() => {
    fs.rmSync(tmp, { force: true, recursive: true });
  });

  it('returns only the directories of the given checkouts', () => {
    const mine = '/work/repo';
    const foreign = '/work/other';
    fs.mkdirSync(path.join(projectsDir, claudeProjectSlug(mine)));
    fs.mkdirSync(path.join(projectsDir, claudeProjectSlug(foreign)));
    const owned = resolveOwnedProjects({ checkouts: [mine], projectsDir });
    expect(owned.map((project) => project.slug)).toEqual(['-work-repo']);
  });

  it('omits a checkout that has no transcript directory', () => {
    expect(
      resolveOwnedProjects({ checkouts: ['/never/opened'], projectsDir }),
    ).toEqual([]);
  });

  it('refuses a slug that is a symlink out of the projects directory', () => {
    const outside = path.join(tmp, 'elsewhere');
    fs.mkdirSync(outside);
    fs.symlinkSync(
      outside,
      path.join(projectsDir, claudeProjectSlug('/work/repo')),
    );
    expect(
      resolveOwnedProjects({ checkouts: ['/work/repo'], projectsDir }),
    ).toEqual([]);
  });

  it('returns nothing when the projects directory does not exist', () => {
    expect(
      resolveOwnedProjects({
        checkouts: ['/work/repo'],
        projectsDir: path.join(tmp, 'missing'),
      }),
    ).toEqual([]);
  });
});

describe('transcriptBelongsTo', () => {
  it('accepts a cwd inside a checkout and refuses one outside', () => {
    const checkouts = ['/work/repo', '/work/wt'];
    expect(transcriptBelongsTo({ checkouts, cwd: '/work/repo' })).toBe(true);
    expect(transcriptBelongsTo({ checkouts, cwd: '/work/wt/packages/a' })).toBe(
      true,
    );
    expect(transcriptBelongsTo({ checkouts, cwd: '/work/repo-other' })).toBe(
      false,
    );
    expect(transcriptBelongsTo({ checkouts, cwd: '/elsewhere' })).toBe(false);
  });

  it('accepts a transcript that recorded no cwd', () => {
    expect(transcriptBelongsTo({ checkouts: ['/work/repo'], cwd: null })).toBe(
      true,
    );
  });
});
