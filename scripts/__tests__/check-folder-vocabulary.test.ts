import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { BannedFolderHit } from '../check-folder-vocabulary.ts';
import {
  ALLOWLIST,
  BANNED_FOLDER_NAMES,
  findBannedFolders,
  formatHit,
  isAllowlisted,
  listStagedPaths,
  listTrackedPaths,
  main,
} from '../check-folder-vocabulary.ts';
import { run } from '../utils/exec.ts';

/** The single hit for a path that must produce exactly one. */
const onlyHit = (path: string): BannedFolderHit => {
  const hits = findBannedFolders([path]);
  if (hits.length !== 1 || hits[0] === undefined) {
    throw new Error(`expected one hit for ${path}, got ${hits.length}`);
  }

  return hits[0];
};

describe('check-folder-vocabulary', () => {
  describe('findBannedFolders', () => {
    it('flags each banned name as a directory segment', () => {
      const hits = findBannedFolders([
        'packages/a/src/lib/x.ts',
        'packages/b/helpers/x.ts',
        'packages/c/common/x.ts',
        'packages/d/shared/x.ts',
        'packages/e/misc/x.ts',
      ]);

      expect(hits.map((hit) => hit.segment)).toEqual([
        'lib',
        'helpers',
        'common',
        'shared',
        'misc',
      ]);
    });

    it('matches whole segments, never substrings or the basename', () => {
      expect(
        findBannedFolders([
          'packages/a/src/library.ts',
          'packages/a/src/common.ts',
          'packages/a/src/libraries/x.ts',
          'packages/a/src/shared-state/x.ts',
          'packages/a/src/lib',
        ]),
      ).toEqual([]);
    });

    it('reports a directory once however many files it holds', () => {
      const hits = findBannedFolders([
        'scripts/lib/a.ts',
        'scripts/lib/b.ts',
        'scripts/lib/deep/c.ts',
      ]);

      expect(hits).toHaveLength(1);
      expect(hits[0]?.path).toBe('scripts/lib');
    });

    it('reports every banned directory in a nested path', () => {
      const hits = findBannedFolders(['packages/a/lib/helpers/x.ts']);

      expect(hits.map((hit) => hit.path)).toEqual([
        'packages/a/lib',
        'packages/a/lib/helpers',
      ]);
    });

    it('skips allowlisted generator template input at any depth', () => {
      expect(
        findBannedFolders([
          'tools/generators/src/generators/package/files/common/x.ts',
          'tools/generators/src/generators/a/b/files/lib/y.ts',
        ]),
      ).toEqual([]);
    });

    it('still flags a banned folder in generator source outside files/', () => {
      const hits = findBannedFolders(['tools/generators/src/lib/x.ts']);

      expect(hits.map((hit) => hit.path)).toEqual(['tools/generators/src/lib']);
    });
  });

  describe('isAllowlisted', () => {
    it('anchors the pattern at the repo root', () => {
      expect(isAllowlisted('vendor/tools/generators/x/files/lib/y.ts')).toBe(
        false,
      );
    });

    it('gives every entry a reason', () => {
      for (const entry of ALLOWLIST) {
        expect(entry.reason.trim()).not.toBe('');
      }
    });
  });

  describe('formatHit', () => {
    it('names utils/config/data for lib, helpers and misc', () => {
      for (const segment of ['lib', 'helpers', 'misc'] as const) {
        const hit = onlyHit(`a/${segment}/x.ts`);

        expect(formatHit(hit)).toContain(`a/${segment}/`);
        expect(formatHit(hit)).toContain('utils/');
        expect(formatHit(hit)).toContain('a package');
      }
    });

    it('names the promotion ladder for shared and common', () => {
      for (const segment of ['shared', 'common'] as const) {
        const hit = onlyHit(`a/${segment}/x.ts`);

        expect(hit.hint).toBe(BANNED_FOLDER_NAMES[segment]);
        expect(formatHit(hit)).toContain('promotion ladder');
      }
    });
  });

  describe('against a real git repository', () => {
    let repoRoot: string;

    const write = (path: string): void => {
      const absolute = join(repoRoot, path);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, '');
    };

    beforeEach(() => {
      repoRoot = mkdtempSync(join(tmpdir(), 'ot-foldervocab-'));
      run('git', ['init', '--quiet', repoRoot]);
    });

    afterEach(() => {
      rmSync(repoRoot, { force: true, recursive: true });
    });

    it('passes a clean tree and ignores untracked files', () => {
      write('src/utils/x.ts');
      write('src/lib/untracked.ts');
      run('git', ['-C', repoRoot, 'add', 'src/utils/x.ts']);

      expect(main(repoRoot, false)).toBe(0);
    });

    it('fails on an intent-to-add path under a banned folder', () => {
      write('src/lib/x.ts');
      run('git', ['-C', repoRoot, 'add', '-N', 'src/lib/x.ts']);

      expect(listTrackedPaths(repoRoot)).toContain('src/lib/x.ts');
      expect(main(repoRoot, false)).toBe(1);
    });

    describe('--staged', () => {
      const git = (...args: string[]): void => {
        run('git', ['-C', repoRoot, ...args]);
      };

      const commitAll = (): void => {
        git('add', '--all');
        git(
          '-c',
          'user.email=test@example.com',
          '-c',
          'user.name=test',
          'commit',
          '--quiet',
          '-m',
          'seed',
        );
      };

      it('fails on a newly added path under a banned folder', () => {
        write('src/lib/x.ts');
        git('add', 'src/lib/x.ts');

        expect(main(repoRoot, true)).toBe(1);
      });

      it('checks only the destination of a rename out of a banned folder', () => {
        write('src/common/x.ts');
        commitAll();
        git('mv', 'src/common', 'src/utils');

        expect(listStagedPaths(repoRoot)).toEqual(['src/utils/x.ts']);
        expect(main(repoRoot, true)).toBe(0);
      });

      it('ignores a modified file in a folder that is already tracked', () => {
        write('src/lib/x.ts');
        commitAll();
        writeFileSync(join(repoRoot, 'src/lib/x.ts'), 'changed');
        git('add', 'src/lib/x.ts');

        expect(listStagedPaths(repoRoot)).toEqual([]);
        expect(main(repoRoot, true)).toBe(0);
      });

      it('passes with nothing staged', () => {
        expect(main(repoRoot, true)).toBe(0);
      });
    });
  });
});
