import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * @description Shard weights measured on the CI boxes themselves (OT plan
 * 80b62f5e), from the `NX_PROFILE` traces every `build` shard uploads as an
 * `nx-profile-shard-<n>` artifact.
 *
 * WHY. The local measurement in generate-shard-weights.ts runs on a developer
 * laptop, and laptop cost is a poor predictor of a 4-vCPU runner's: the
 * 2026-09-16 table weighted react-router-ui at 44.6s, and its `test` alone
 * took ~3 min in CI. Shards predicted at ~430s each ran 509s / 767s / 531s.
 *
 * WHAT A WEIGHT IS. The cost the box that DRAWS a project pays for it: the
 * project's own lint + typecheck + test (lint + typecheck for a suite-sharded
 * project, whose test every box pays regardless). Per run, each
 * (project, target) takes the longest non-cached duration seen on any shard —
 * the same task can appear on several boxes when it is a dependency of their
 * chunks, and the box that owns it is the one that ran it cold. Across runs the
 * median is taken, so one noisy run cannot move the table.
 *
 * A project no sampled run measured keeps its previous weight, scaled by the
 * median CI/previous ratio over the projects both tables share, so old laptop
 * figures and new CI figures stay in one unit.
 */

/** One `ph: "X"` event from an Nx `TaskProfilingLifeCycle` trace. */
export interface ProfileTask {
  /** Microseconds. */
  readonly duration: number;
  readonly project: string;
  readonly status: string;
  readonly target: string;
}

/** Statuses that mean the task actually executed, rather than restored. */
const EXECUTED_STATUSES: readonly string[] = ['failure', 'success'];

const WEIGHTED_TARGETS: readonly string[] = ['lint', 'test', 'typecheck'];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];

  return typeof value === 'string' ? value : '';
};

const toProfileTask = (event: unknown): ProfileTask | undefined => {
  if (!isRecord(event) || event.ph !== 'X' || typeof event.dur !== 'number') {
    return undefined;
  }

  const args = isRecord(event.args) ? event.args : {};
  const target = isRecord(args.target) ? args.target : {};

  return {
    duration: event.dur,
    project: readString(target, 'project'),
    status: readString(args, 'status'),
    target: readString(target, 'target'),
  };
};

/**
 * @description Parse one Nx profile file. Nx writes either a bare event array
 * or a `{ traceEvents }` object; anything else yields no tasks.
 */
export const parseProfile = (raw: string): ProfileTask[] => {
  const parsed: unknown = JSON.parse(raw);
  const events = isRecord(parsed) && Array.isArray(parsed.traceEvents) ? parsed.traceEvents : parsed; // prettier-ignore
  const list = Array.isArray(events) ? events : [];

  return list
    .map(toProfileTask)
    .filter((task): task is ProfileTask => task !== undefined && task.project !== ''); // prettier-ignore
};

/**
 * @description One run's per-project weight in milliseconds, from every
 * shard's profile tasks pooled together.
 */
export const weighRun = (
  tasks: readonly ProfileTask[],
  suiteSharded: readonly string[],
): Map<string, number> => {
  const longest = new Map<string, number>();

  tasks
    .filter((task) => EXECUTED_STATUSES.includes(task.status))
    .filter((task) => WEIGHTED_TARGETS.includes(task.target))
    .filter(
      (task) =>
        !(task.target === 'test' && suiteSharded.includes(task.project)),
    ) // prettier-ignore
    .forEach((task) => {
      const key = `${task.project}\u0000${task.target}`;

      longest.set(key, Math.max(longest.get(key) ?? 0, task.duration));
    });

  const weights = new Map<string, number>();

  longest.forEach((duration, key) => {
    const [project = ''] = key.split('\u0000');

    weights.set(project, (weights.get(project) ?? 0) + Math.round(duration / 1000)); // prettier-ignore
  });

  return weights;
};

const medianOf = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;

  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

/**
 * @description Merge per-run weights into one table: the median per project
 * across the runs that measured it, plus scaled carry-overs for projects no
 * run measured (see the module header).
 */
export const mergeWeights = (
  runs: readonly ReadonlyMap<string, number>[],
  previous: Readonly<Record<string, number>>,
): Record<string, number> => {
  const samples = new Map<string, number[]>();

  runs.forEach((run) => {
    run.forEach((weight, project) => {
      samples.set(project, [...(samples.get(project) ?? []), weight]);
    });
  });

  const measured = new Map<string, number>();

  samples.forEach((values, project) => {
    measured.set(project, medianOf(values));
  });

  const ratios = [...measured.entries()]
    .filter(([project]) => (previous[project] ?? 0) > 0)
    .map(([project, weight]) => weight / (previous[project] ?? 1));
  const scale = ratios.length > 0 ? medianOf(ratios.map((r) => r * 1000)) / 1000 : 1; // prettier-ignore
  const merged: Record<string, number> = {};

  Object.entries(previous).forEach(([project, weight]) => {
    merged[project] = Math.round(weight * scale);
  });
  measured.forEach((weight, project) => {
    merged[project] = weight;
  });

  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))); // prettier-ignore
};

const toRunId = (run: unknown): number | undefined => {
  if (!isRecord(run) || typeof run.databaseId !== 'number') return undefined;

  return run.databaseId;
};

const listFiles = (directory: string): string[] => {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
};

/**
 * @description Download the `nx-profile-shard-*` artifacts of the latest
 * `limit` successful merge-queue CI runs — where `build` runs for every commit
 * that lands — and return each run's tasks. Runs from before profiling existed
 * have no artifact and are skipped.
 */
export const downloadProfiles = (limit: number): ProfileTask[][] => {
  const raw = execFileSync(
    'gh',
    ['run', 'list', '--workflow', 'continuous-integration.yml', '--event', 'merge_group', '--status', 'success', '--limit', String(limit * 3), '--json', 'databaseId'], // prettier-ignore
    { encoding: 'utf-8' },
  );
  const parsed: unknown = JSON.parse(raw);
  const ids = (Array.isArray(parsed) ? parsed : [])
    .map(toRunId)
    .filter((id): id is number => id !== undefined);
  const runs: ProfileTask[][] = [];

  ids.forEach((id) => {
    if (runs.length >= limit) return;

    const directory = mkdtempSync(join(tmpdir(), `nx-profile-${id}-`));

    try {
      execFileSync('gh', ['run', 'download', String(id), '--pattern', 'nx-profile-shard-*', '--dir', directory], { stdio: 'ignore' }); // prettier-ignore

      const tasks = listFiles(directory)
        .filter((file) => file.endsWith('.json'))
        .flatMap((file) => parseProfile(readFileSync(file, 'utf-8')));

      if (tasks.length > 0) runs.push(tasks);
    } catch {
      // No profile artifact on this run (it predates profiling): skip it.
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  return runs;
};
