/**
 * @description Fails when a tracked file documents the single-spec test
 * command in the form that does not filter: `nx run <project>:test -- <file>`.
 *
 * Every test target runs the `@nx/vitest:test` executor, which forwards only
 * its `testFiles` option (alias `testFile`) to Vitest as a file filter. That
 * option declares no positional `argv` default, so a path after `--` lands in
 * Nx's unparsed overrides and is dropped: the whole suite runs, and nothing
 * says so. Agents followed the old CLAUDE.md line and ran 15–932 files where
 * they meant one (OT plan 407bedcd). The working form is
 * `pnpm nx run <project>:test --testFile=<path>`.
 *
 * Tracked text files only (`git grep -I`). The `.jsonl` showroom snapshots are
 * recorded conversations, not documentation, so they are skipped.
 */
import { createLogger, run } from './utils/index.ts';

const logger = createLogger();

/**
 * `:test` or `nx test <project>`, then `--`, then a positional value or a
 * line continuation (`\`) that carries one onto the next line.
 */
export const POSITIONAL_FILTER_PATTERN = String.raw`(:test|nx test [^ ]+) +-- +([^- ]|\\)`;

/** Paths whose matches are not documentation anyone follows. */
export const EXCLUDED_PATHSPECS: readonly string[] = [
  ':!*.jsonl',
  ':!scripts/check-test-file-filter-docs.ts',
  ':!scripts/__tests__/check-test-file-filter-docs.test.ts',
];

/** One offending line: `path:line:text`, as `git grep -n` prints it. */
export interface PositionalFilterHit {
  readonly line: string;
}

/** Every tracked line that documents the dropped positional form. */
export const findPositionalFilterHits = (
  cwd: string,
): PositionalFilterHit[] => {
  const result = run(
    'git',
    [
      'grep',
      '-nIE',
      POSITIONAL_FILTER_PATTERN,
      '--',
      '.',
      ...EXCLUDED_PATHSPECS,
    ],
    { allowFailure: true, cwd },
  );

  // git grep exits 1 for "no match"; anything above that is a real failure.
  if (result.exitCode > 1) {
    throw new Error(`\`${result.command}\` failed: ${result.stderr}`);
  }

  return result.stdout
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => ({ line }));
};

export const main = (cwd: string = process.cwd()): number => {
  const hits = findPositionalFilterHits(cwd);

  if (hits.length === 0) {
    logger.success('Test file filter docs: no `:test -- <file>` examples');

    return 0;
  }

  logger.fail(`${hits.length} line(s) document \`:test -- <file>\`, which runs the whole suite:`); // prettier-ignore
  for (const hit of hits) {
    logger.info(`  ${hit.line}`);
  }

  logger.blank();
  logger.info('@nx/vitest:test drops a positional path after `--`.');
  logger.info('Write `pnpm nx run <project>:test --testFile=<path>` instead.');

  return 1;
};

if (process.argv[1]?.endsWith('check-test-file-filter-docs.ts')) {
  process.exit(main());
}
