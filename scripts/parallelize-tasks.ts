import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createLogger } from './lib/index.ts';

// This script has a stdout contract (the final key=value lines the workflow
// reads), so all narration is bound to stderr — see the file header.
const logger = createLogger({ stream: process.stderr });

/**
 * @description Shard partitioner for the `build` matrix in
 * .github/workflows/continuous-integration.yml.
 *
 * Reads the affected project list, splits it into `jobCount` deterministic
 * chunks, and prints this shard's marching orders on stdout as `key=value`
 * lines — see OUTPUT below.
 *
 * ARGV (positional, both required):
 *   1. jobIndex  1-based index of THIS shard.
 *   2. jobCount  Total number of shards. Must equal the length of the
 *                workflow's `matrix.jobIndex` list.
 *
 * OUTPUT (stdout, one `key=value` per line, values never contain a space):
 *   selector            `--exclude` selector for this shard's chunk. Empty when
 *                       the chunk is empty. Drives lint/typecheck.
 *   testSelector        Same, minus any suite-sharded project (see below), so
 *                       the box that drew the heavy app still lints and
 *                       typechecks it but does not run its whole suite.
 *   suiteShard          `<jobIndex>/<jobCount>` for the Vitest `--shard`
 *                       argument. Empty when nothing is suite-sharded.
 *   suiteShardProjects  Comma-joined projects to run under that `--shard`.
 *                       Empty when none of them is affected.
 *
 * TWO AXES, NOT ONE. "Which projects are mine?" (the partition) and "which
 * slice of one project's suite is mine?" (Vitest `--shard`) are independent.
 * Every project is dealt to exactly ONE chunk, as before; a suite-sharded
 * project is additionally lifted out of the TEST deal and run on EVERY box with
 * a different `--shard`. That is why there are two selectors: `selector` still
 * partitions everything, `testSelector` is the same chunk with the sharded
 * projects removed. Both round-trip through verifyShardSelection().
 *
 * Deliberately NOT parameterized by target: the workflow issues one Nx command
 * per parallelism class (lint/typecheck at `--parallel`, `test` left serialized
 * — see the memory note in the workflow), so which targets run, and how, stays
 * the workflow's business. Emitting every selector from ONE invocation rather
 * than taking a target argument also keeps this script to a single Nx graph
 * computation per box, which is the expensive part. The quoting hazard the old
 * single-line contract guarded against is unchanged: no emitted value can ever
 * contain a space, so nothing gets word-split on the way into a shell variable.
 *
 * Diagnostics go to stderr on purpose — stdout is the machine-read contract.
 */

const PACKAGE_PREFIX = '@';

/**
 * @description Projects whose Vitest suite is split WITHIN the project by
 * `vitest --shard`, instead of being dealt to one box like everything else.
 *
 * Earn a place here by being large enough that one box running the whole suite
 * sets the floor for the entire matrix. `openthrottle-developer` is 679 files /
 * ~137s against ~10s for its own lint and ~11s for its typecheck — 88% of the
 * heaviest box. Splitting it three ways takes the heaviest slice to ~46s
 * (227/226/226 files). See OT plan 9fc16731.
 *
 * Names are Nx project names, matching getExcludeSelector()'s direct-naming
 * rule — NOT `tag:name:` values.
 */
const SUITE_SHARDED_PROJECTS: readonly string[] = ['openthrottle-developer'];

/**
 * @description Packages are scope-prefixed (`@openthrottle/…`); applications are not.
 */
const getIsPackage = (name: string): boolean => name.startsWith(PACKAGE_PREFIX);

/**
 * @description Partition the affected list into applications and packages so
 * applications — the heavy Vitest suites — are dealt out first and therefore
 * spread across shards instead of clustering on one box.
 */
const splitProjects = (
  projects: string[],
): { applications: string[]; packages: string[] } => {
  const applications: string[] = projects.filter(
    (project) => !getIsPackage(project),
  );

  const packages: string[] = projects.filter((project) =>
    getIsPackage(project),
  );

  return { applications, packages };
};

/**
 * @description Round-robin cursor: the next chunk is chosen from how many
 * projects have already been dealt, so chunk sizes never differ by more than 1.
 */
const getChunkIndex = (chunks: string[][], chunkCount: number): number => {
  const count = chunks.flat().length;
  const insertAt = count % chunkCount;

  return insertAt;
};

/**
 * @description Deal projects round-robin into `chunkCount` chunks,
 * applications first. Deterministic for a given input order, so every shard of
 * a run computes the SAME partition from the same affected list — that is what
 * guarantees no project lands on two boxes and none is dropped.
 *
 * Not duration-weighted: a chunk holding two heavy app suites is slower than
 * one holding six packages. Dealing applications first bounds that skew without
 * needing timing data. See OT plan b19377d1.
 *
 * Suite-sharded projects are still dealt here — they are only lifted out of the
 * TEST selector, downstream. Pulling them out of the deal entirely would be
 * wrong: their lint and typecheck still belong to exactly one box. It does mean
 * the applications-first bias is now balancing a chunk whose heaviest member
 * contributes only its lint/typecheck weight to `test`. Left alone deliberately:
 * re-tuning the deal wants timing data this script still does not have.
 */
const distributeEvenly = (
  projects: string[],
  chunkCount: number,
): string[][] => {
  const { applications: apps, packages } = splitProjects(projects);
  const chunks: string[][] = Array.from({ length: chunkCount }, () => []);

  while (apps.length) {
    const app = apps.shift();
    const insertInto = getChunkIndex(chunks, chunkCount);

    if (app) chunks[insertInto].push(app);
  }

  while (packages.length) {
    const pkg = packages.shift();
    const insertInto = getChunkIndex(chunks, chunkCount);

    if (pkg) chunks[insertInto].push(pkg);
  }

  return chunks;
};

/**
 * @description The suite-sharded projects present in this affected set, in the
 * affected list's order.
 *
 * Scoped to AFFECTED, not to the chunk: a suite-sharded project runs on every
 * box, so every box must reach the same answer, and every box sees the same
 * affected list. A PR that does not touch the app returns [] and no box invents
 * work for it.
 */
const getSuiteShardedProjects = (projects: string[]): string[] =>
  projects.filter((project) => SUITE_SHARDED_PROJECTS.includes(project));

/**
 * @description This chunk with the suite-sharded projects removed — the set
 * whose `test` this box runs the ordinary, whole-suite way.
 *
 * A suite-sharded project is absent from EVERY box's testGrouping by design;
 * its coverage comes from the separate `--shard` invocation instead. That is
 * the one and only sanctioned gap in "every affected project's test runs
 * somewhere", and it is why verifyShardSelection() checks this selector
 * separately rather than letting the difference show up as round-trip noise.
 */
const getTestGrouping = (grouping: string[]): string[] =>
  grouping.filter((project) => !SUITE_SHARDED_PROJECTS.includes(project));

/**
 * @description Build the Nx `--exclude` selector for one chunk.
 *
 * Nx has no "only these projects" flag for `affected`, so the chunk is expressed
 * as the NEGATION of every project in it: `nx affected --exclude="*,$selector"`
 * starts from nothing (`*`) and re-admits this chunk's projects.
 *
 * ⚠️ Projects are named DIRECTLY (`!openthrottle-server`), not via their `name:`
 * tag. `!tag:name:<project>` looks equivalent and is not: a project's `name:` tag
 * comes from its package.json `name`, which does not always equal its Nx project
 * name. The root project is `monorepo` but carries `name:@openthrottle/monorepo`,
 * so `!tag:name:monorepo` matches NOTHING — that project would drop off every
 * shard and its lint/typecheck/test (the scripts/__tests__ suite) would never
 * run, while every shard still reported green. Direct names have no such
 * indirection. getShardSelectionErrors() re-checks the round trip on CI anyway.
 *
 * @external https://nx.dev/nx-api/nx/documents/affected#examples (dotnet example)
 */
const getExcludeSelector = (grouping: string[]): string =>
  grouping.map((project) => `!${project}`).join(',');

/**
 * @description The `--exclude` selector this shard should be run with.
 *
 * Returns an EMPTY string — empty stdout, exit 0 — when this shard's chunk is
 * empty (fewer affected projects than shards). The workflow treats that as an
 * explicit no-op and says so in the log, so an empty shard can never be mistaken
 * for a silent skip of real work.
 */
const getShardSelector = (
  projects: string[],
  jobIndex: number,
  jobCount: number,
): string => {
  const groups = distributeEvenly(projects, jobCount);
  const grouping = groups[jobIndex - 1];

  if (!grouping || grouping.length === 0) {
    return '';
  }

  return getExcludeSelector(grouping);
};

/**
 * @description Everything this box needs to know, derived from the affected set
 * alone. Pure, so the whole contract is unit-testable without touching Nx.
 */
const getShardOutputs = (
  projects: string[],
  jobIndex: number,
  jobCount: number,
): {
  selector: string;
  suiteShard: string;
  suiteShardProjects: string;
  testSelector: string;
} => {
  const groups = distributeEvenly(projects, jobCount);
  const grouping = groups[jobIndex - 1] ?? [];
  const sharded = getSuiteShardedProjects(projects);

  return {
    selector: getShardSelector(projects, jobIndex, jobCount),
    suiteShard: sharded.length > 0 ? `${jobIndex}/${jobCount}` : '',
    suiteShardProjects: sharded.join(','),
    testSelector: getExcludeSelector(getTestGrouping(grouping)),
  };
};

/**
 * @description Render the outputs as the `key=value` lines the workflow reads.
 * Keys are emitted unconditionally so the consumer never has to distinguish
 * "absent" from "empty" — an empty value always means "nothing to do here".
 */
const formatShardOutputs = (outputs: {
  selector: string;
  suiteShard: string;
  suiteShardProjects: string;
  testSelector: string;
}): string =>
  [
    `selector=${outputs.selector}`,
    `suiteShard=${outputs.suiteShard}`,
    `suiteShardProjects=${outputs.suiteShardProjects}`,
    `testSelector=${outputs.testSelector}`,
  ].join('\n');

/**
 * @description Compare what the selector ACTUALLY resolves to against the chunk
 * it was built from. Any difference means projects would be validated twice or —
 * far worse — not at all, on a run that still reports green. Pure so it can be
 * unit-tested; the Nx call that feeds `resolved` lives in verifyShardSelection().
 */
const getShardSelectionErrors = (
  grouping: string[],
  resolved: string[],
): string[] => {
  const expected = new Set(grouping);
  const actual = new Set(resolved);

  const missing = [...expected].filter((project) => !actual.has(project));
  const unexpected = [...actual].filter((project) => !expected.has(project));

  const errors: string[] = [];

  if (missing.length > 0) {
    errors.push(
      `selector does not match ${missing.length} project(s) assigned to this shard: ${missing.join(', ')}`,
    );
  }

  if (unexpected.length > 0) {
    errors.push(
      `selector pulls in ${unexpected.length} project(s) not assigned to this shard: ${unexpected.join(', ')}`,
    );
  }

  return errors;
};

/**
 * @description Read the affected project list from Nx, sorted so the partition
 * is stable across the shards of one run.
 */
const getAffectedProjects = (): string[] => {
  const affectedCMD = `pnpm nx show projects --affected --json --silent`;
  const affectedResult = execSync(affectedCMD, { env: process.env });
  const affectedStr = affectedResult.toString('utf-8');
  const affected: string[] = JSON.parse(affectedStr);

  return [...affected].sort();
};

/**
 * @description Ask Nx what a selector really selects, then assert it is exactly
 * the grouping it was built from. Costs one extra graph computation per call;
 * the failure it guards against is silent-passing CI, so it is worth the seconds.
 *
 * `label` names which selector is under test so a CI failure says whether the
 * partition or the test carve-out broke.
 */
const verifySelection = (label: string, grouping: string[]): void => {
  const selector = getExcludeSelector(grouping);
  const verifyCMD = `pnpm nx show projects --affected --exclude="*,${selector}" --json --silent`;
  const resolved: string[] = JSON.parse(
    execSync(verifyCMD, { env: process.env }).toString('utf-8'),
  );

  const errors = getShardSelectionErrors(grouping, resolved);

  if (errors.length > 0) {
    logger.fail(`parallelize-tasks: ${label} selector does not round-trip.`);
    errors.forEach((error) => logger.detail(error));
    process.exit(1);
  }
};

/**
 * @description Round-trip BOTH selectors. The test carve-out is checked as its
 * own grouping rather than being allowed to surface as a mismatch against the
 * partition — an exception that widened `unexpected` would blunt exactly the
 * signal getShardSelectionErrors() exists to give.
 */
const verifyShardSelection = (grouping: string[]): void => {
  const testGrouping = getTestGrouping(grouping);

  if (grouping.length > 0) {
    verifySelection('partition', grouping);
  }

  if (testGrouping.length > 0 && testGrouping.length !== grouping.length) {
    verifySelection('test', testGrouping);
  }
};

const main = (): void => {
  const jobIndex = Number(process.argv[2]);
  const jobCount = Number(process.argv[3]);

  // Fail loudly rather than shard silently: an out-of-range jobIndex means the
  // workflow's `matrix.jobIndex` list and `env.jobCount` drifted out of sync,
  // and the projects that fell off the end would never be validated by ANY box.
  if (!Number.isInteger(jobCount) || jobCount < 1) {
    logger.fail(
      `parallelize-tasks: jobCount must be >= 1 (got "${process.argv[3]}"). ` +
        'Usage: parallelize-tasks.ts <jobIndex> <jobCount>',
    );
    process.exit(1);
  }

  if (!Number.isInteger(jobIndex) || jobIndex < 1 || jobIndex > jobCount) {
    logger.fail(
      `parallelize-tasks: jobIndex must be in 1..${jobCount} (got "${process.argv[2]}"). ` +
        'matrix.jobIndex and env.jobCount are out of sync.',
    );
    process.exit(1);
  }

  const affected = getAffectedProjects();
  const groups = distributeEvenly(affected, jobCount);
  const grouping = groups[jobIndex - 1] ?? [];
  const outputs = getShardOutputs(affected, jobIndex, jobCount);

  // Partition evidence for the CI log. stderr so it cannot pollute the
  // machine-read stdout contract.
  logger.heading(
    `shard ${jobIndex}/${jobCount} — ${affected.length} affected project(s)`,
  );
  groups.forEach((group, index) => {
    const marker = index === jobIndex - 1 ? '→' : ' ';
    console.error(
      `  ${marker} shard ${index + 1}: ${group.join(', ') || '(empty)'}`,
    );
  });

  if (outputs.suiteShardProjects) {
    logger.detail(
      `suite-sharded: ${outputs.suiteShardProjects} — this box runs --shard=${outputs.suiteShard} (lint/typecheck stay on the partition)`,
    );
  }

  verifyShardSelection(grouping);

  console.log(formatShardOutputs(outputs));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  distributeEvenly,
  formatShardOutputs,
  getChunkIndex,
  getExcludeSelector,
  getIsPackage,
  getShardOutputs,
  getShardSelectionErrors,
  getShardSelector,
  getSuiteShardedProjects,
  getTestGrouping,
  splitProjects,
  SUITE_SHARDED_PROJECTS,
};
