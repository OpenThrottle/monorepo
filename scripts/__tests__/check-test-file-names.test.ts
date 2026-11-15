import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findMisplacedTests,
  findSpecFiles,
  isMisplacedTest,
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

  describe('when a test is colocated with non-NestJS source', () => {
    it.each([
      'packages/x/src/foo.test.ts',
      'applications/app/app/routes/home.test.tsx',
      'tools/tool/src/run.integration.test.mts',
    ])('flags %s', (path) => {
      write(path);

      expect(findMisplacedTests(repoRoot)).toEqual([
        {
          path,
          suggestion: join(
            dirname(path),
            '__tests__',
            path.split('/').pop() ?? '',
          ),
        },
      ]);
      expect(main(repoRoot)).toBe(1);
    });
  });

  describe('when a colocated test is in an exempt location', () => {
    it.each([
      'applications/openthrottle-server/src/foo/foo.service.test.ts',
      'packages/nestjs-auth/src/guards/global-auth.guard.test.ts',
      'tools/generators/src/generators/nestjs/files/module/__name__/__name__.service.test.ts',
      'tools/generators/src/generators/package/files/nestjs/src/__name__.service.test.ts',
      'packages/agentic-replay-testing/tests/claude.replay.test.ts',
      'packages/x/src/__tests__/foo.test.ts',
      'packages/x/src/__tests__/nested/foo.test.ts',
    ])('passes %s', (path) => {
      write(path);

      expect(findMisplacedTests(repoRoot)).toEqual([]);
      expect(main(repoRoot)).toBe(0);
    });
  });

  describe('isMisplacedTest', () => {
    it('ignores non-test files and a tests/ folder below the project root', () => {
      expect(isMisplacedTest('packages/x/src/foo.ts')).toBe(false);
      expect(isMisplacedTest('packages/x/src/tests/foo.test.ts')).toBe(true);
    });

    it('does not exempt a project that only starts with a NestJS-tier name', () => {
      expect(isMisplacedTest('applications/openthrottle-server-x/src/foo.test.ts')).toBe(true); // prettier-ignore
      expect(isMisplacedTest('packages/react-nestjs-bridge/src/foo.test.ts')).toBe(true); // prettier-ignore
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
