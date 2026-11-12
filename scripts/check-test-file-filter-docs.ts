/**
 * @description Fails when a tracked file documents the single-spec test
 * command with the retired `--testFile` flag.
 *
 * Until Nx 24 every test target ran the `@nx/vitest:test` executor, whose
 * `testFiles` option (alias `testFile`) was the only file filter: a path after
 * `--` was dropped and the whole suite ran (OT plan 407bedcd). Nx 24 removed
 * that executor. Test targets now run the `vitest` CLI through
 * `nx:run-commands`, which forwards a path after `--` to Vitest as a filter and
 * passes `--testFile` through as an option Vitest rejects (`Unknown option`).
 * The working form is `pnpm nx run <project>:test -- <path>`.
 *
 * Tracked text files only (`git grep -I`). The `.jsonl` showroom snapshots are
 * recorded conversations, not documentation, so they are skipped.
 */
import { createLogger, run } from './utils/index.ts';

const logger = createLogger();

/** `--testFile` or `--testFiles`, as a flag (followed by `=` or a space). */
export const RETIRED_FLAG_PATTERN = String.raw`--testFiles?[= ]`;

/** Paths whose matches are not documentation anyone follows. */
export const EXCLUDED_PATHSPECS: readonly string[] = [
  ':!*.jsonl',
  ':!scripts/check-test-file-filter-docs.ts',
  ':!scripts/__tests__/check-test-file-filter-docs.test.ts',
];

/** One offending line: `path:line:text`, as `git grep -n` prints it. */
export interface RetiredFlagHit {
  readonly line: string;
}

/** Every tracked line that documents the retired `--testFile` flag. */
export const findRetiredFlagHits = (cwd: string): RetiredFlagHit[] => {
  const result = run(
    'git',
    [
      'grep',
      '-nIE',
      '-e',
      RETIRED_FLAG_PATTERN,
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
  const hits = findRetiredFlagHits(cwd);

  if (hits.length === 0) {
    logger.success('Test file filter docs: no `--testFile` examples');

    return 0;
  }

  logger.fail(`${hits.length} line(s) document \`--testFile\`, which Vitest rejects:`); // prettier-ignore
  for (const hit of hits) {
    logger.info(`  ${hit.line}`);
  }

  logger.blank();
  logger.info('Test targets run the vitest CLI; `--testFile` was an option of the removed @nx/vitest:test executor.'); // prettier-ignore
  logger.info('Write `pnpm nx run <project>:test -- <path>` instead.');

  return 1;
};

if (process.argv[1]?.endsWith('check-test-file-filter-docs.ts')) {
  process.exit(main());
}
