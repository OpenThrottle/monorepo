import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createLogger, flagValue, hasFlag } from './utils/index.ts';

/**
 * @description Median CI timings for `continuous-integration.yml`, read from
 * GitHub's own job and step records via `gh`. Exists so every CI speed-up has
 * a before/after measured the same way (OT plan 80b62f5e), not eyeballed from a
 * handful of runs in the Actions UI.
 *
 * What each column means:
 *   wall      run created → run updated. Includes runner queueing, which is the
 *             number a human waiting on the merge queue actually experiences.
 *   critical  the slowest `build` shard, job start → job end. The thing a
 *             speed-up has to move.
 *   spread    slowest minus fastest `build` shard. Pure imbalance: wall-clock
 *             the partitioner is leaving on the table.
 *   nx        the slowest shard's `🧠 NX …` step alone (lint + typecheck + test).
 *   setup     median `🤖 Node Setup` across shards (install + caches).
 *   codegen   median `🧩 Codegen Tasks` across shards.
 *   gates     the `gates` job, start → end. Runs beside the matrix.
 *
 * Only `success` runs are sampled, so a red or cancelled run cannot drag a
 * median. Runs where `build` was skipped (docs-only) are dropped too: they say
 * nothing about the build's speed.
 *
 * USAGE
 *   pnpm exec tsx ./scripts/ci-timings.ts [--event=push|merge_group|pull_request] [--limit=10] [--json]
 *
 * `--event=push` (the default) reads `main`. The script makes one `gh` call per
 * run, sequentially; ten runs take a few seconds.
 */

const WORKFLOW = 'continuous-integration.yml';

export interface CiStep {
  readonly completedAt: string | null;
  readonly conclusion: string | null;
  readonly name: string;
  readonly startedAt: string | null;
}

export interface CiJob {
  readonly completedAt: string | null;
  readonly conclusion: string | null;
  readonly name: string;
  readonly startedAt: string | null;
  readonly steps: readonly CiStep[];
}

export interface CiRun {
  readonly createdAt: string;
  readonly databaseId: number;
  readonly jobs: readonly CiJob[];
  readonly updatedAt: string;
}

export interface RunTimings {
  readonly codegen: number | undefined;
  readonly critical: number;
  readonly gates: number | undefined;
  readonly id: number;
  readonly nx: number | undefined;
  readonly setup: number | undefined;
  readonly spread: number;
  readonly wall: number;
}

export interface TimingSummary {
  readonly codegen: number | undefined;
  readonly critical: number | undefined;
  readonly gates: number | undefined;
  readonly nx: number | undefined;
  readonly runs: number;
  readonly setup: number | undefined;
  readonly spread: number | undefined;
  readonly wall: number | undefined;
}

/**
 * @description Seconds between two ISO timestamps, or undefined when either is
 * missing (a step GitHub never started reports null).
 */
export const secondsBetween = (
  start: string | null,
  end: string | null,
): number | undefined => {
  if (start === null || end === null) return undefined;

  return Math.round((Date.parse(end) - Date.parse(start)) / 1000);
};

/** @description Median of the defined values, or undefined for none. */
export const median = (
  values: readonly (number | undefined)[],
): number | undefined => {
  const sorted = values
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length === 0) return undefined;
  if (sorted.length % 2 === 1) return sorted[middle];

  const low = sorted[middle - 1] ?? 0;
  const high = sorted[middle] ?? 0;

  return Math.round((low + high) / 2);
};

const isBuildShard = (job: CiJob): boolean => {
  return job.name.startsWith('build (') && job.conclusion === 'success';
};

const stepSeconds = (job: CiJob, prefix: string): number | undefined => {
  const step = job.steps.find((candidate) => candidate.name.startsWith(prefix));

  return step ? secondsBetween(step.startedAt, step.completedAt) : undefined;
};

const jobSeconds = (job: CiJob): number => {
  return secondsBetween(job.startedAt, job.completedAt) ?? 0;
};

/**
 * @description One run's timings, or undefined when it ran no `build` shard
 * (a docs-only run, which says nothing about the build's speed).
 */
export const summarizeRun = (run: CiRun): RunTimings | undefined => {
  const shards = run.jobs.filter(isBuildShard);
  const gates = run.jobs.find((job) => job.name === 'gates');

  if (shards.length === 0) return undefined;

  const durations = shards.map(jobSeconds);
  const slowest = shards.reduce((a, b) => (jobSeconds(b) > jobSeconds(a) ? b : a)); // prettier-ignore

  return {
    codegen: median(shards.map((job) => stepSeconds(job, '🧩 Codegen'))),
    critical: Math.max(...durations),
    gates: gates ? jobSeconds(gates) : undefined,
    id: run.databaseId,
    nx: stepSeconds(slowest, '🧠 NX'),
    setup: median(shards.map((job) => stepSeconds(job, '🤖 Node Setup'))),
    spread: Math.max(...durations) - Math.min(...durations),
    wall: secondsBetween(run.createdAt, run.updatedAt) ?? 0,
  };
};

/** @description Per-column medians across the sampled runs. */
export const summarize = (timings: readonly RunTimings[]): TimingSummary => {
  return {
    codegen: median(timings.map((run) => run.codegen)),
    critical: median(timings.map((run) => run.critical)),
    gates: median(timings.map((run) => run.gates)),
    nx: median(timings.map((run) => run.nx)),
    runs: timings.length,
    setup: median(timings.map((run) => run.setup)),
    spread: median(timings.map((run) => run.spread)),
    wall: median(timings.map((run) => run.wall)),
  };
};

/** @description `754` → `12m34s`; undefined → `—`. */
export const formatSeconds = (seconds: number | undefined): string => {
  if (seconds === undefined) return '—';

  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];

  return typeof value === 'string' && value !== '' ? value : null;
};

const toStep = (value: unknown): CiStep | undefined => {
  if (!isRecord(value)) return undefined;

  return {
    completedAt: readString(value, 'completedAt'),
    conclusion: readString(value, 'conclusion'),
    name: readString(value, 'name') ?? '',
    startedAt: readString(value, 'startedAt'),
  };
};

const toJob = (value: unknown): CiJob | undefined => {
  if (!isRecord(value)) return undefined;

  const steps = Array.isArray(value.steps) ? value.steps : [];

  return {
    completedAt: readString(value, 'completedAt'),
    conclusion: readString(value, 'conclusion'),
    name: readString(value, 'name') ?? '',
    startedAt: readString(value, 'startedAt'),
    steps: steps.map(toStep).filter((step): step is CiStep => step !== undefined), // prettier-ignore
  };
};

/**
 * @description Parse `gh run view --json jobs` output into jobs. Anything that
 * is not the expected shape is dropped rather than trusted.
 */
export const parseJobs = (raw: string): CiJob[] => {
  const parsed: unknown = JSON.parse(raw);
  const jobs =
    isRecord(parsed) && Array.isArray(parsed.jobs) ? parsed.jobs : [];

  return jobs.map(toJob).filter((job): job is CiJob => job !== undefined);
};

interface RunListing {
  readonly createdAt: string;
  readonly databaseId: number;
  readonly updatedAt: string;
}

const toListing = (value: unknown): RunListing | undefined => {
  if (!isRecord(value) || typeof value.databaseId !== 'number') {
    return undefined;
  }

  const createdAt = readString(value, 'createdAt');
  const updatedAt = readString(value, 'updatedAt');

  if (createdAt === null || updatedAt === null) return undefined;

  return { createdAt, databaseId: value.databaseId, updatedAt };
};

const gh = (args: string[]): string => {
  return execFileSync('gh', args, { encoding: 'utf-8', env: process.env });
};

const listRuns = (event: string, limit: number): RunListing[] => {
  const branch = event === 'push' ? ['--branch', 'main'] : [];
  const raw = gh([
    'run', 'list', '--workflow', WORKFLOW, '--event', event, ...branch,
    '--status', 'success', '--limit', String(limit),
    '--json', 'databaseId,createdAt,updatedAt',
  ]); // prettier-ignore
  const parsed: unknown = JSON.parse(raw);
  const runs = Array.isArray(parsed) ? parsed : [];

  return runs.map(toListing).filter((run): run is RunListing => run !== undefined); // prettier-ignore
};

const fetchRun = (listing: RunListing): CiRun => {
  const raw = gh(['run', 'view', String(listing.databaseId), '--json', 'jobs']);

  return { ...listing, jobs: parseJobs(raw) };
};

const main = (): void => {
  const logger = createLogger();
  const event = flagValue('event') ?? 'push';
  const limit = Number(flagValue('limit') ?? '10');
  const timings = listRuns(event, limit)
    .map(fetchRun)
    .map(summarizeRun)
    .filter((run): run is RunTimings => run !== undefined);
  const summary = summarize(timings);

  if (hasFlag('json')) {
    console.log(JSON.stringify({ event, runs: timings, summary }, null, 2));

    return;
  }

  logger.heading(`${WORKFLOW} — event=${event}, ${summary.runs} successful run(s) with a build`); // prettier-ignore
  timings.forEach((run) => {
    logger.detail(
      `${run.id}  wall ${formatSeconds(run.wall)}  critical ${formatSeconds(run.critical)}  spread ${formatSeconds(run.spread)}  nx ${formatSeconds(run.nx)}`,
    );
  });
  logger.success(
    `median  wall ${formatSeconds(summary.wall)}  critical ${formatSeconds(summary.critical)}  spread ${formatSeconds(summary.spread)}  nx ${formatSeconds(summary.nx)}  setup ${formatSeconds(summary.setup)}  codegen ${formatSeconds(summary.codegen)}  gates ${formatSeconds(summary.gates)}`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
