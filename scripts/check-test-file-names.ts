/**
 * @description Fails when a tracked test file under `applications/`,
 * `packages/` or `tools/` uses the `*.spec.*` suffix.
 *
 * Tests are `*.test.*` in a sibling `__tests__/` folder (AGENTS.md § Code
 * style → Testing). Nothing enforced the suffix, so `openthrottle-app` drifted
 * to 39 colocated `*.spec.ts` files before it was migrated (OT plan 8dd14e61).
 * ESLint cannot see file names, so this is a tree check like
 * `audit-file-name-casing.ts`.
 *
 * Tracked files only (`git ls-files`), so build output and `node_modules` are
 * never read. Colocated `*.test.*` files outside `__tests__/` are not gated
 * here: hundreds exist, most of them the NestJS tier's sanctioned
 * `<folder>.<kind>.test.ts`.
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

/** Every tracked `*.spec.*` file under the gated roots. */
export const findSpecFiles = (cwd: string): SpecFileViolation[] => {
  const result = run('git', ['ls-files', '-z', '--', ...GATED_ROOTS], { cwd });

  return result.stdout
    .split('\0')
    .filter((path) => {
      return SPEC_FILE_PATTERN.test(path) && !isIgnored(path);
    })
    .map((path) => {
      return { path, suggestion: suggestTestPath(path) };
    });
};

export const main = (cwd: string = process.cwd()): number => {
  const violations = findSpecFiles(cwd);

  if (violations.length === 0) {
    logger.success('Test file names: no *.spec.* files');

    return 0;
  }

  logger.fail(`${violations.length} test file(s) use the *.spec.* suffix — tests are *.test.* in a sibling __tests__/:`); // prettier-ignore
  for (const violation of violations) {
    logger.info(`  ${violation.path} -> ${violation.suggestion}`);
  }

  logger.blank();
  logger.info('Move each with `git mv` and fix its relative imports (one more `../`).'); // prettier-ignore

  return 1;
};

if (process.argv[1]?.endsWith('check-test-file-names.ts')) {
  process.exit(main());
}
