import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

/**
 * @description Shard partitioner for the `build` matrix in
 * .github/workflows/continuous-integration.yml.
 *
 * Reads the affected project list, splits it into `jobCount` deterministic
 * chunks, and prints the Nx `--exclude` selector for chunk `jobIndex` on stdout
 * — a single line, empty when this shard drew no projects.
 *
 * ARGV (positional, both required):
 *   1. jobIndex  1-based index of THIS shard.
 *   2. jobCount  Total number of shards. Must equal the length of the
 *                workflow's `matrix.jobIndex` list.
 *
 * Deliberately NOT parameterized by target. The workflow issues one Nx command
 * per parallelism class (lint/typecheck at `--parallel`, `test` left serialized
 * — see the memory note in the workflow), so which targets run, and how, is the
 * workflow's business; this script only answers "which projects are mine?".
 * Keeping target out also removes the quoting hazard entirely: there is no argv
 * slot that can contain a space (`"test --coverage"`) and get split.
 *
 * Diagnostics go to stderr on purpose — stdout is the machine-read contract.
 */

const PACKAGE_PREFIX = '@';

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
 * @description Ask Nx what the shard's selector really selects, then assert it
 * is exactly the chunk. Costs one extra graph computation per shard; the failure
 * it guards against is silent-passing CI, so it is worth the seconds.
 */
const verifyShardSelection = (grouping: string[]): void => {
  const selector = getExcludeSelector(grouping);
  const verifyCMD = `pnpm nx show projects --affected --exclude="*,${selector}" --json --silent`;
  const resolved: string[] = JSON.parse(
    execSync(verifyCMD, { env: process.env }).toString('utf-8'),
  );

  const errors = getShardSelectionErrors(grouping, resolved);

  if (errors.length > 0) {
    console.error('❌ parallelize-tasks: shard selector does not round-trip.');
    errors.forEach((error) => console.error(`   ${error}`));
    process.exit(1);
  }
};

const main = (): void => {
  const jobIndex = Number(process.argv[2]);
  const jobCount = Number(process.argv[3]);

  // Fail loudly rather than shard silently: an out-of-range jobIndex means the
  // workflow's `matrix.jobIndex` list and `env.jobCount` drifted out of sync,
  // and the projects that fell off the end would never be validated by ANY box.
  if (!Number.isInteger(jobCount) || jobCount < 1) {
    console.error(
      `❌ parallelize-tasks: jobCount must be >= 1 (got "${process.argv[3]}"). ` +
        'Usage: parallelize-tasks.ts <jobIndex> <jobCount>',
    );
    process.exit(1);
  }

  if (!Number.isInteger(jobIndex) || jobIndex < 1 || jobIndex > jobCount) {
    console.error(
      `❌ parallelize-tasks: jobIndex must be in 1..${jobCount} (got "${process.argv[2]}"). ` +
        'matrix.jobIndex and env.jobCount are out of sync.',
    );
    process.exit(1);
  }

  const affected = getAffectedProjects();
  const groups = distributeEvenly(affected, jobCount);
  const grouping = groups[jobIndex - 1] ?? [];

  // Partition evidence for the CI log. stderr so it cannot pollute the
  // machine-read stdout contract.
  console.error(
    `🧩 shard ${jobIndex}/${jobCount} — ${affected.length} affected project(s)`,
  );
  groups.forEach((group, index) => {
    const marker = index === jobIndex - 1 ? '→' : ' ';
    console.error(
      `  ${marker} shard ${index + 1}: ${group.join(', ') || '(empty)'}`,
    );
  });

  if (grouping.length > 0) {
    verifyShardSelection(grouping);
  }

  const selector = getShardSelector(affected, jobIndex, jobCount);

  if (selector) {
    console.log(selector);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  distributeEvenly,
  getChunkIndex,
  getExcludeSelector,
  getIsPackage,
  getShardSelectionErrors,
  getShardSelector,
  splitProjects,
};
