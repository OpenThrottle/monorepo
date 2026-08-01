/**
 * @description Constants for the single generic scheduled-agent-jobs queue. One shared queue runs
 * every user-defined scheduled prompt (no per-job queue); the processor decodes the payload's
 * driverId and dispatches via openthrottle-drivers `runAgentPrompt`.
 */

import type { JobsOptions } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';

/** Human-readable Bull Board queue name (matches `Database Backup`, `Doc Ingestion`). */
export const SCHEDULED_AGENT_JOBS_QUEUE_NAME = 'Scheduled Agent Jobs';

/** Stable BullMQ job name / processor + logging identifier. */
export const SCHEDULED_AGENT_JOB_NAME = 'scheduled-agent-job';

/** Prefix of every scheduler id this feature owns (`scheduled-job:<uuid>`). */
export const SCHEDULED_AGENT_JOB_SCHEDULER_PREFIX = 'scheduled-job:';

/**
 * Job options for scheduled/run-now fires. **`attempts: 1`** — agent prompts are non-idempotent and
 * expensive, and driver failures resolve (never throw) so a BullMQ retry would only fire on a
 * processor exception, producing duplicate run rows sharing one `bullmq_job_id`. Keep only the
 * age/count cleanup from {@link REPEATABLE_JOB_OPTIONS}; drop its `attempts`/`backoff`.
 */
export const SCHEDULED_AGENT_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: REPEATABLE_JOB_OPTIONS.removeOnComplete,
  removeOnFail: REPEATABLE_JOB_OPTIONS.removeOnFail,
};

/**
 * Worker concurrency. Default 1: two agent CLIs in the same default cwd (WORKSPACE_ROOT) would
 * fight over the git index. Raise only for jobs isolated via a per-job worktree.
 */
export const SCHEDULED_AGENT_JOBS_CONCURRENCY = 1;

/** Fallback per-run timeout (15m) when a schedule sets no `timeout_ms`. */
export const SCHEDULED_AGENT_JOBS_DEFAULT_TIMEOUT_MS = 15 * 60_000;

/** Run-output source tag for JSONL attribution (the agent CLI's own stdout/stderr). */
export const SCHEDULED_AGENT_JOB_OUTPUT_SOURCE = 'agent';

/**
 * @description Resolves the per-run timeout: an explicit per-schedule override, else the
 * `SCHEDULED_AGENT_JOBS_TIMEOUT_MS` env, else the 15m default. Non-positive/invalid values fall back.
 */
export const resolveScheduledAgentJobTimeoutMs = (
  explicitTimeoutMs?: number | null,
): number => {
  if (typeof explicitTimeoutMs === 'number' && explicitTimeoutMs > 0) {
    return explicitTimeoutMs;
  }

  const raw = process.env.SCHEDULED_AGENT_JOBS_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return SCHEDULED_AGENT_JOBS_DEFAULT_TIMEOUT_MS;
};

/**
 * @description Resolves the cwd for the agent CLI: an explicit per-schedule cwd, else `WORKSPACE_ROOT`
 * (required when the server's cwd is not the repo root — Docker/systemd), else `process.cwd()`.
 */
export const resolveScheduledAgentJobCwd = (
  explicitCwd?: string | null,
): string => {
  const explicit = explicitCwd?.trim();
  if (explicit) {
    return explicit;
  }

  const workspaceRoot = process.env.WORKSPACE_ROOT?.trim();
  return workspaceRoot ? workspaceRoot : process.cwd();
};

/**
 * @description Whether THIS checkout owns *boot-time* scheduler registration. Many server instances
 * share one Redis, so only the canonical checkout should register the full schedule set at boot;
 * otherwise dev worktrees would fight over the same scheduler ids. Mirrors `resolveBackupOwnership`:
 * explicit `OT_SCHEDULED_JOBS_OWNER` wins; else a checkout under an `openthrottle-worktrees/` path is
 * a non-owner. NOTE: this gates ONLY boot reconciliation — on-mutation upsert/remove always apply, so
 * a user editing a schedule takes effect immediately regardless of which checkout served the request.
 */
export const resolveScheduledAgentJobsBootOwner = (): {
  owner: boolean;
  reason: string;
} => {
  const explicit = process.env.OT_SCHEDULED_JOBS_OWNER?.trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') {
    return { owner: true, reason: 'OT_SCHEDULED_JOBS_OWNER is set true' };
  }
  if (explicit === 'false' || explicit === '0') {
    return {
      owner: false,
      reason:
        'OT_SCHEDULED_JOBS_OWNER is false; this checkout skips boot reconciliation',
    };
  }

  const workspaceRoot = process.env.WORKSPACE_ROOT?.trim() ?? process.cwd();
  if (/[/\\]openthrottle-worktrees[/\\]/.test(workspaceRoot)) {
    return {
      owner: false,
      reason: `workspace root ${workspaceRoot} is a worktree checkout; only the canonical checkout runs boot reconciliation (set OT_SCHEDULED_JOBS_OWNER=true to override)`,
    };
  }

  return { owner: true, reason: 'canonical checkout' };
};
