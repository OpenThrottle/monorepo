import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findSpecFiles,
  main,
  suggestTestPath,
} from '../check-test-file-names.ts';
import { run } from '../utils/exec.ts';

describe('check-test-file-names', () => {
  let repoRoot: string;

  const write = (path: string): void => {
    const absolute = join(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, '\n');
    run('git', ['-C', repoRoot, 'add', '--all', '--force']);
  };

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-testfilenames-'));
    run('git', ['init', '--quiet', repoRoot]);
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  describe('when a gated root tracks a *.spec.* file', () => {
    it.each([
      'applications/app/src/foo.spec.ts',
      'packages/pkg/src/Button.spec.tsx',
      'tools/tool/src/__tests__/run.spec.mts',
      'packages/pkg/src/probe.integration.spec.js',
    ])('flags %s', (path) => {
      write(path);

      expect(findSpecFiles(repoRoot)).toHaveLength(1);
      expect(main(repoRoot)).toBe(1);
    });
  });

  describe('when the tree is clean', () => {
    it('passes *.test.* files, spec-like names and files outside the gated roots', () => {
      write('applications/app/src/__tests__/foo.test.ts');
      write('packages/pkg/src/specs.ts');
      write('packages/pkg/src/foo.spec.ts.template');
      write('scripts/foo.spec.ts');

      expect(findSpecFiles(repoRoot)).toEqual([]);
      expect(main(repoRoot)).toBe(0);
    });

    it('ignores build output and node_modules even when tracked', () => {
      write('packages/pkg/dist/foo.spec.js');
      write('packages/pkg/node_modules/dep/foo.spec.js');

      expect(findSpecFiles(repoRoot)).toEqual([]);
    });

    it('ignores untracked files', () => {
      mkdirSync(join(repoRoot, 'packages/pkg'), { recursive: true });
      writeFileSync(join(repoRoot, 'packages/pkg/foo.spec.ts'), '\n');

      expect(findSpecFiles(repoRoot)).toEqual([]);
    });
  });

  describe('suggestTestPath', () => {
    it('moves a colocated spec into a sibling __tests__/', () => {
      expect(suggestTestPath('src/main/foo.integration.spec.ts')).toBe('src/main/__tests__/foo.integration.test.ts'); // prettier-ignore
    });

    it('renames a spec already under __tests__/ in place', () => {
      expect(suggestTestPath('src/__tests__/Button.spec.tsx')).toBe('src/__tests__/Button.test.tsx'); // prettier-ignore
    });
  });
});
