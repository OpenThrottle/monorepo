/**
 * @description Fails when a tracked test file under `applications/`,
 * `packages/` or `tools/` uses the `*.spec.*` suffix, or is a `*.test.*` file
 * colocated with source instead of in a sibling `__tests__/`.
 *
 * Tests are `*.test.*` in a sibling `__tests__/` folder (AGENTS.md § Code
 * style → Testing). Nothing enforced the suffix, so `openthrottle-app` drifted
 * to 39 colocated `*.spec.ts` files before it was migrated (OT plan 8dd14e61);
 * the placement half followed in OT plan f5625772. ESLint cannot see file
 * names, so this is a tree check like `audit-file-name-casing.ts`.
 *
 * Placement exemptions — each a location where a colocated test is the
 * convention, not drift:
 *   - the NestJS tier (`openthrottle-server`, `nestjs-*`), whose
 *     `<folder>.<kind>.test.ts` sits beside its file and whose names
 *     `openthrottle/nestjs-file-naming` already checks;
 *   - the generator templates that emit NestJS-tier files;
 *   - a project-root `tests/` folder — the package generator's test root,
 *     which holds suites spanning several files and no source.
 *
 * Tracked files only (`git ls-files`), so build output and `node_modules` are
 * never read.
 */
import { basename, dirname, join } from 'node:path';

import { run } from './utils/exec.ts';
import { createLogger } from './utils/logger.ts';

const logger = createLogger();

/** The roots whose test files are gated. */
export const GATED_ROOTS: readonly string[] = [
  'applications',
  'packages',
  'tools',
];

/** `foo.spec.ts`, `foo.integration.spec.tsx`, … — the suffix this gate rejects. */
const SPEC_FILE_PATTERN = /\.spec\.(ts|tsx|js|jsx|mts|cts)$/;

/** `foo.test.ts`, `foo.integration.test.tsx`, … — the suffix placement is checked for. */
const TEST_FILE_PATTERN = /\.test\.(ts|tsx|js|jsx|mts|cts)$/;

/**
 * The NestJS tier's project directories — the same set `audit-file-name-casing.ts`
 * excludes as having its own enforced `<folder>.<kind>.ts` form.
 */
const NESTJS_TIER_PROJECT =
  /^(?:applications\/openthrottle-server|packages\/nestjs-[a-z0-9-]+)\//;

/** Generator template trees that emit NestJS-tier files, colocated tests included. */
const NESTJS_TEMPLATE_TREE =
  /^tools\/generators\/src\/generators\/(?:nestjs\/files|package\/files\/nestjs)\//;

/** A project-root `tests/` folder: `packages/<name>/tests/…`. */
const PROJECT_TESTS_ROOT = /^(?:applications|packages|tools)\/[^/]+\/tests\//;

/** Path segments that never hold source, even if something there is tracked. */
const IGNORED_SEGMENTS: ReadonlySet<string> = new Set([
  'build',
  'dist',
  'node_modules',
  'out',
]);

/** One `*.spec.*` file and the path it should move to. */
export interface SpecFileViolation {
  readonly path: string;
  readonly suggestion: string;
}

/**
 * @description The `__tests__/<name>.test.<ext>` a spec file should become —
 * beside its source, or renamed in place when already under `__tests__/`.
 */
export const suggestTestPath = (path: string): string => {
  const directory = dirname(path);
  const name = basename(path).replace(SPEC_FILE_PATTERN, '.test.$1');

  if (basename(directory) === '__tests__') {
    return join(directory, name);
  }

  return join(directory, '__tests__', name);
};

const isIgnored = (path: string): boolean => {
  return path.split('/').some((segment) => {
    return IGNORED_SEGMENTS.has(segment);
  });
};

/** A `*.test.*` file colocated with source, and the `__tests__/` path it should move to. */
export interface PlacementViolation {
  readonly path: string;
  readonly suggestion: string;
}

const trackedFiles = (cwd: string): string[] => {
  const result = run('git', ['ls-files', '-z', '--', ...GATED_ROOTS], { cwd });

  return result.stdout.split('\0').filter((path) => {
    return path !== '' && !isIgnored(path);
  });
};

/**
 * @description True for a `*.test.*` file that must live under `__tests__/`
 * and does not — i.e. outside every placement exemption.
 */
export const isMisplacedTest = (path: string): boolean => {
  if (!TEST_FILE_PATTERN.test(path)) return false;
  if (path.split('/').includes('__tests__')) return false;

  return ![NESTJS_TIER_PROJECT, NESTJS_TEMPLATE_TREE, PROJECT_TESTS_ROOT].some(
    (pattern) => {
      return pattern.test(path);
    },
  );
};

/** Every tracked `*.test.*` file colocated with source outside the exemptions. */
export const findMisplacedTests = (cwd: string): PlacementViolation[] => {
  return trackedFiles(cwd)
    .filter(isMisplacedTest)
    .map((path) => {
      return {
        path,
        suggestion: join(dirname(path), '__tests__', basename(path)),
      };
    });
};

/** Every tracked `*.spec.*` file under the gated roots. */
export const findSpecFiles = (cwd: string): SpecFileViolation[] => {
  return trackedFiles(cwd)
    .filter((path) => {
      return SPEC_FILE_PATTERN.test(path);
    })
    .map((path) => {
      return { path, suggestion: suggestTestPath(path) };
    });
};

export const main = (cwd: string = process.cwd()): number => {
  const specFiles = findSpecFiles(cwd);
  const misplaced = findMisplacedTests(cwd);

  if (specFiles.length === 0 && misplaced.length === 0) {
    logger.success(
      'Test file names: no *.spec.* files, every test under __tests__/',
    );

    return 0;
  }

  if (specFiles.length > 0) {
    logger.fail(`${specFiles.length} test file(s) use the *.spec.* suffix — tests are *.test.* in a sibling __tests__/:`); // prettier-ignore
    for (const violation of specFiles) {
      logger.info(`  ${violation.path} -> ${violation.suggestion}`);
    }
  }

  if (misplaced.length > 0) {
    logger.fail(`${misplaced.length} test file(s) colocated with source — tests live in a sibling __tests__/ (the NestJS tier and project-root tests/ are exempt):`); // prettier-ignore
    for (const violation of misplaced) {
      logger.info(`  ${violation.path} -> ${violation.suggestion}`);
    }
  }

  logger.blank();
  logger.info('Move each with `git mv` and fix its relative imports (one more `../`).'); // prettier-ignore

  return 1;
};

if (process.argv[1]?.endsWith('check-test-file-names.ts')) {
  process.exit(main());
}
