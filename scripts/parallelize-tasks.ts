import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
 * per class of work, so which targets run, and how, stays the workflow's
 * business. (Both of its invocations happen to run at Nx's default concurrency
 * of 3 — a bare `--parallel` is NOT "full", see the flag-semantics note in the
 * workflow. This script has never had an opinion either way.) Emitting every selector from ONE invocation rather
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
 * ⚠️ THIS IS NOW THE FALLBACK, not the live strategy — partitionProjects()
 * prefers packByWeight() whenever `shard-weights.json` is usable. It is kept,
 * and kept working, because it is what makes that table safe to let drift:
 * delete or corrupt the file and CI still partitions correctly, just less
 * evenly.
 *
 * Not duration-weighted: a chunk holding two heavy app suites is slower than
 * one holding six packages. Dealing applications first bounds that skew without
 * needing timing data. See OT plan b19377d1. Measurement has since shown the
 * applications-first premise is only half true — packages in this workspace
 * span 1.2s to 56.3s, and four of the six heaviest projects are packages — which
 * is precisely why the weighted packing replaced it.
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
 * @description Byte-for-byte name ordering. NOT `localeCompare`: that consults
 * the runtime's default locale, and every shard must break ties identically or
 * they compute different partitions. Code-unit order is the same everywhere.
 */
const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const WEIGHTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'shard-weights.json',
);

/**
 * @description The committed measured-cost table, or undefined when it cannot
 * be used.
 *
 * Read from a COMMITTED file on purpose. The two sources that look more
 * "live" both break the one invariant this script has — that every shard of a
 * run computes the SAME partition:
 *
 *   - Nx's task history (`task_history` in `.nx/workspace-data/*-v3.db`) is
 *     empty in this workspace; Nx 23.2.0 does not populate it here.
 *   - `.github/actions/node-setup` keys the Nx cache with
 *     `cache-suffix: shard-<jobIndex>`, so each shard restores a DIFFERENT
 *     cache. Weights derived from local cache state would differ per box.
 *
 * Returns undefined rather than throwing on a missing, unreadable or malformed
 * file: the caller falls back to round-robin. Weights are an OPTIMIZATION.
 * Correctness lives in verifyShardSelection()'s Nx round-trip, which never
 * consults them, so a bad table can cost balance and can never drop a project.
 */
const hasWeightsKey = (value: object): value is { weights: unknown } =>
  'weights' in value;

const loadWeights = (): Record<string, number> | undefined => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(WEIGHTS_PATH, 'utf-8'));

    if (typeof parsed !== 'object' || parsed === null) return undefined;
    if (!hasWeightsKey(parsed)) return undefined;

    const { weights } = parsed;

    if (typeof weights !== 'object' || weights === null) return undefined;

    // Drop anything non-numeric rather than trusting the file's shape: a
    // hand-edited or half-written table should degrade to the round-robin
    // fallback, never poison the packing with NaN.
    const entries = Object.entries(weights).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    );

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Median of the known weights — the stand-in for a project the
 * table has never seen.
 *
 * Median, not zero and not the mean: a brand-new project treated as weightless
 * would be packed onto whichever bin is already heaviest, which is exactly the
 * skew this packing exists to remove. The median is also robust to the one
 * 117s outlier that a mean would chase.
 */
const getMedianWeight = (weights: Record<string, number>): number => {
  const values = Object.values(weights).sort((a, b) => a - b);

  if (values.length === 0) return 0;

  const middle = Math.floor(values.length / 2);

  return values.length % 2 === 0
    ? ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2
    : (values[middle] ?? 0);
};

/**
 * @description This project's cost to the box that draws it.
 *
 * Suite-sharded projects are already recorded as lint+typecheck only (the
 * generator measures them that way), because their `test` runs on EVERY box
 * under `--shard` — a constant that cannot be balanced away, and which would
 * make the packer flee a cost every shard pays regardless.
 */
const getWeight = (
  project: string,
  weights: Record<string, number>,
  fallback: number,
): number => weights[project] ?? fallback;

/**
 * @description Longest-processing-time-first bin packing: sort heaviest-first,
 * then repeatedly put the next project on whichever shard is currently lightest.
 *
 * LPT is the standard greedy approximation for this problem and is provably
 * within 4/3 of optimal — more than good enough when the input is measured
 * durations that drift anyway, and far better than dealing by COUNT, which is
 * blind to a project being 100x another (this workspace spans 1.2s to 117.5s).
 *
 * DETERMINISM IS LOAD-BEARING, not a nicety. Every shard runs this independently
 * over the same affected list and must reach the same answer, or a project lands
 * on two boxes or none. So both tie-breaks are total and machine-independent:
 * equal weights break by name (code units, not locale), and equal bin loads
 * break by lowest bin index. Nothing consults input order, wall-clock or host.
 */
const packByWeight = (
  projects: string[],
  chunkCount: number,
  weights: Record<string, number>,
): string[][] => {
  const fallback = getMedianWeight(weights);
  const chunks: string[][] = Array.from({ length: chunkCount }, () => []);
  const loads: number[] = Array.from({ length: chunkCount }, () => 0);

  const ordered = [...projects].sort((a, b) => {
    const delta = getWeight(b, weights, fallback) - getWeight(a, weights, fallback); // prettier-ignore

    return delta !== 0 ? delta : byName(a, b);
  });

  ordered.forEach((project) => {
    let lightest = 0;

    for (let index = 1; index < chunkCount; index += 1) {
      if ((loads[index] ?? 0) < (loads[lightest] ?? 0)) lightest = index;
    }

    chunks[lightest]?.push(project);
    loads[lightest] = (loads[lightest] ?? 0) + getWeight(project, weights, fallback); // prettier-ignore
  });

  return chunks;
};

/**
 * @description The partition every shard agrees on: measured packing when the
 * weights table is usable, today's round-robin deal when it is not.
 *
 * The fallback is not defensive clutter — it is what makes the weights table
 * safe to let drift. Delete the file, corrupt it, or land a PR before
 * regenerating it, and CI keeps partitioning correctly; only the balance
 * regresses to what it was before this existed.
 */
const partitionProjects = (
  projects: string[],
  chunkCount: number,
  weights?: Record<string, number>,
): string[][] =>
  weights
    ? packByWeight(projects, chunkCount, weights)
    : distributeEvenly(projects, chunkCount);

/**
 * @description Total projected cost of one chunk, for the CI log. Reading three
 * of these next to each other is how a future reader sees the table going stale.
 */
const getChunkWeight = (
  chunk: string[],
  weights: Record<string, number>,
): number => {
  const fallback = getMedianWeight(weights);

  return chunk.reduce(
    (total, project) => total + getWeight(project, weights, fallback),
    0,
  );
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
  weights?: Record<string, number>,
): string => {
  const groups = partitionProjects(projects, jobCount, weights);
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
  weights?: Record<string, number>,
): {
  selector: string;
  suiteShard: string;
  suiteShardProjects: string;
  testSelector: string;
} => {
  const groups = partitionProjects(projects, jobCount, weights);
  const grouping = groups[jobIndex - 1] ?? [];
  const sharded = getSuiteShardedProjects(projects);

  return {
    selector: getShardSelector(projects, jobIndex, jobCount, weights),
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
  const weights = loadWeights();
  const groups = partitionProjects(affected, jobCount, weights);
  const grouping = groups[jobIndex - 1] ?? [];
  const outputs = getShardOutputs(affected, jobIndex, jobCount, weights);

  // Partition evidence for the CI log. stderr so it cannot pollute the
  // machine-read stdout contract.
  logger.heading(
    `shard ${jobIndex}/${jobCount} — ${affected.length} affected project(s)`,
  );

  if (!weights) {
    logger.warn(
      'shard-weights.json missing or unusable — falling back to round-robin. ' +
        'Regenerate with: pnpm exec tsx ./scripts/generate-shard-weights.ts',
    );
  }

  // Projected totals sit next to each shard so the log shows the balance that
  // was actually achieved. Three numbers drifting apart over time is the signal
  // that the weights table wants regenerating.
  groups.forEach((group, index) => {
    const marker = index === jobIndex - 1 ? '→' : ' ';
    const projected = weights
      ? ` [~${(getChunkWeight(group, weights) / 1000).toFixed(0)}s]`
      : '';

    console.error(
      `  ${marker} shard ${index + 1}${projected}: ${group.join(', ') || '(empty)'}`,
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
  byName,
  distributeEvenly,
  formatShardOutputs,
  getChunkIndex,
  getChunkWeight,
  getExcludeSelector,
  getIsPackage,
  getMedianWeight,
  getShardOutputs,
  getShardSelectionErrors,
  getShardSelector,
  getSuiteShardedProjects,
  getTestGrouping,
  getWeight,
  packByWeight,
  partitionProjects,
  splitProjects,
  SUITE_SHARDED_PROJECTS,
};
