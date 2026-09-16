import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger, flagValue, hasFlag } from './lib/index.ts';
import { SUITE_SHARDED_PROJECTS } from './parallelize-tasks.ts';

/**
 * @description Regenerate `scripts/shard-weights.json` — the measured
 * per-project cost table that `parallelize-tasks.ts` packs shards with.
 *
 * WHY A COMMITTED FILE, AND NOT THE NX CACHE. Every shard of one CI run must
 * compute the IDENTICAL partition from the identical affected list; that is the
 * invariant standing between this matrix and a project silently landing on two
 * boxes or none. Two tempting sources both break it:
 *
 *   1. Nx's own task history (`task_history` / `task_details` in
 *      `.nx/workspace-data/*-v3.db`) is EMPTY in this workspace — verified
 *      immediately after a real `nx run <p>:lint --skip-nx-cache`. Nx 23.2.0
 *      does not populate it here, so there is nothing to read.
 *   2. More decisively, `.github/actions/node-setup` keys the Nx cache with
 *      `cache-suffix: shard-<jobIndex>`, so each shard restores a DIFFERENT
 *      cache (and the prefix restore-keys let it warm from an arbitrary earlier
 *      one). Weights derived from local cache state would differ per box, and
 *      three boxes would compute three different partitions.
 *
 * A committed file is the only source provably identical on every box. It goes
 * stale, and that is fine: weights affect BALANCE ONLY. Correctness comes from
 * `verifyShardSelection()`'s Nx round-trip, which never consults them, so a
 * stale — or missing, or corrupt — table degrades the packing and can never
 * drop a project.
 *
 * MEASUREMENT. One `nx run-many` per project, `--skip-nx-cache`, timed on the
 * wall clock, run SEQUENTIALLY: measuring concurrently would have projects
 * contend for CPU and record each other's contention as their own cost.
 *
 * Each recorded figure therefore includes ~1-2s of Nx startup. That is a
 * near-constant added to every entry, so it does not distort the ranking, and
 * in a longest-processing-time packing it only nudges the result toward also
 * balancing project COUNT — harmless, and close to what the old round-robin
 * deal did on purpose. Deliberately NOT corrected for: a baseline-subtraction
 * mechanism would add a second thing to get wrong for no gain in balance.
 *
 * SUITE-SHARDED PROJECTS are measured on `lint,typecheck` ONLY. Their `test`
 * runs on EVERY box under Vitest `--shard`, so it is a constant across boxes
 * and contributes nothing to balancing the partition. Weighting them with it
 * would make the packer flee a cost every shard pays regardless.
 *
 * USAGE
 *   pnpm exec tsx ./scripts/generate-shard-weights.ts [--dry-run] [--projects=a,b]
 *
 * This takes on the order of 20 minutes over the whole workspace. It is meant
 * to be run occasionally and by hand, not in CI.
 */

const logger = createLogger();

const HERE = dirname(fileURLToPath(import.meta.url));
const WEIGHTS_PATH = join(HERE, 'shard-weights.json');

/** Targets whose cost lands on the box that draws the project. */
const MEASURED_TARGETS = 'lint,typecheck,test';

/** Suite-sharded projects: `test` is excluded — see the header. */
const SUITE_SHARDED_TARGETS = 'lint,typecheck';

export interface ShardWeights {
  readonly metadata: {
    readonly commit: string;
    readonly generatedAt: string;
    readonly hostParallelism: number;
    readonly note: string;
    readonly nxVersion: string;
  };
  /** Project name -> measured wall-clock milliseconds. */
  readonly weights: Readonly<Record<string, number>>;
}

const capture = (command: string, args: string[]): string =>
  execFileSync(command, args, { encoding: 'utf-8', env: process.env }).trim();

const getProjects = (): string[] => {
  const raw = capture('pnpm', ['nx', 'show', 'projects', '--json', '--silent']);
  const projects: string[] = JSON.parse(raw);

  return [...projects].sort();
};

const getTargetsFor = (project: string): string =>
  SUITE_SHARDED_PROJECTS.includes(project)
    ? SUITE_SHARDED_TARGETS
    : MEASURED_TARGETS;

/**
 * @description Time one project's targets. A project missing every target still
 * returns a real number (Nx exits 0 having run nothing), which is correct: it
 * genuinely costs the box almost nothing.
 *
 * A FAILING target is still timed rather than skipped. The weight is a cost
 * measurement, not a health check — refusing to record a project because its
 * lint is currently red would silently drop it from the table and hand it the
 * median instead, which is worse information than the number we just observed.
 */
const measureProject = (project: string): number => {
  const started = Date.now();

  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'nx',
        'run-many',
        `--projects=${project}`,
        `--target=${getTargetsFor(project)}`,
        '--skip-nx-cache',
        '--parallel=1',
      ],
      { env: process.env, stdio: 'ignore' },
    );
  } catch {
    // Intentionally ignored — see the JSDoc above.
  }

  return Date.now() - started;
};

/**
 * @description Read the version off the installed package. `nx --version`
 * prints a multi-line local/global report, not a bare version.
 */
const getNxVersion = (): string => {
  try {
    return capture('node', ['-p', "require('nx/package.json').version"]);
  } catch {
    return 'unknown';
  }
};

const getCommit = (): string => {
  try {
    return capture('git', ['rev-parse', 'HEAD']);
  } catch {
    return 'unknown';
  }
};

/** Sorted keys so regeneration produces a minimal, reviewable diff. */
const buildWeights = (
  measured: ReadonlyMap<string, number>,
): Record<string, number> =>
  Object.fromEntries([...measured.entries()].sort(([a], [b]) => a.localeCompare(b))); // prettier-ignore

const main = (): void => {
  const dryRun = hasFlag('dry-run');
  const only = flagValue('projects');
  const projects = only ? only.split(',').map((p) => p.trim()) : getProjects();

  logger.heading(
    `Measuring ${projects.length} project(s) sequentially — this is slow by design`,
  );

  const measured = new Map<string, number>();

  projects.forEach((project, index) => {
    const position = `${index + 1}/${projects.length}`;
    const ms = measureProject(project);

    measured.set(project, ms);
    logger.detail(
      `${position} ${project} — ${(ms / 1000).toFixed(1)}s (${getTargetsFor(project)})`,
    );
  });

  const payload: ShardWeights = {
    metadata: {
      commit: getCommit(),
      generatedAt: new Date().toISOString(),
      hostParallelism: availableParallelism(),
      note: 'Wall-clock ms per project for lint+typecheck+test (lint+typecheck only for suite-sharded projects). Includes ~1-2s Nx startup per entry. Balance only — never correctness.',
      nxVersion: getNxVersion(),
    },
    weights: buildWeights(measured),
  };

  if (dryRun) {
    logger.warn('--dry-run: not writing shard-weights.json');
    console.log(JSON.stringify(payload, null, 2));

    return;
  }

  writeFileSync(WEIGHTS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  logger.success(`Wrote ${WEIGHTS_PATH} (${measured.size} projects)`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { buildWeights, getTargetsFor, measureProject };
