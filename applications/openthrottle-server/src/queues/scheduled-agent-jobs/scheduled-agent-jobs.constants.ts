/**
 * @description Constants for the single generic scheduled-agent-jobs queue. One shared queue runs
 * every user-defined scheduled prompt (no per-job queue); the processor decodes the payload's
 * driverId and dispatches via openthrottle-drivers `runAgentPrompt`.
 */

import type { JobsOptions } from 'bullmq';
import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';
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
 * Default worker concurrency, now that overlap is made safe by a KEY rather than by a number.
 *
 * The historical value was 1 for one reason: two agent CLIs in the same cwd fight over the git index.
 * Per-repository targeting (`repository_checkout_id`) made >1 *conceivable* — two schedules pointing
 * at different checkouts share no git index — but not sufficient on its own, because two schedules can
 * still target the SAME checkout. What makes >1 safe is
 * {@link resolveScheduledAgentJobConcurrencyKey} plus the advisory directory lock the processor takes
 * on that key: independent directories overlap freely, and any two runs that would land in the same
 * directory serialise regardless of how each of them named it.
 *
 * Read via {@link resolveScheduledAgentJobsConcurrency} so it stays env-tunable. NOTE the lock lives in
 * Redis: with `REDIS_HOST` unset there is no lock, so such a deployment should pin the env back to 1.
 */
export const SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY = 4;

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
 * @description Resolves the cwd for the agent CLI from the legacy inputs only: an explicit
 * per-schedule cwd, else `WORKSPACE_ROOT`, else the detected OpenThrottle root, else `process.cwd()`
 * as a last resort. Callers that may have a targeted repository checkout should use
 * {@link resolveScheduledAgentJobRunCwd}, which puts the checkout ahead of all of these.
 *
 * `process.cwd()` must NOT be the effective default. The server's `dev`/`start` targets run with cwd
 * at the PROJECT root (`applications/openthrottle-server`) so `autoSchemaFile: 'schema.gql'` lands in
 * the committed location — so inheriting it pointed every scheduled agent run at that subdirectory
 * instead of the repo. `WORKSPACE_ROOT` was the intended escape hatch but is never set anywhere in
 * this repo (only ever read), so the fallback was always `process.cwd()`.
 *
 * Two things broke as a result, and both looked like something else:
 *
 * 1. **MCP servers with relative commands could not launch.** Cursor discovers `.cursor/mcp.json` by
 *    walking up to the workspace root, so every server was *found*, but it SPAWNS them with the
 *    process cwd — where `./scripts/run-openthrottle-mcp.sh` does not exist. From
 *    `applications/openthrottle-server`, `cursor-agent mcp list` reports `openthrottle-mcp`,
 *    `github`, and `fetch` as `Connection failed` while absolute-command servers (`maestro`,
 *    `shadcn`) are `ready`. That is the residual half of the "MCP-less agent" bug: the
 *    `--approve-mcps` flag is necessary but useless if the launcher path cannot resolve.
 * 2. **The agent saw the wrong repo subtree** — a doc-drift sweep would have walked only
 *    `applications/openthrottle-server`.
 *
 * `getOpenThrottleRoot` is preferred over `process.cwd()` because it is deterministic: it walks up for
 * the `.openthrottle.mjs` workspace marker (from this module's own location first, so it is correct
 * regardless of how the process was launched) and is already the shared resolver used by the Ralph
 * workflow path.
 */
export const resolveScheduledAgentJobCwd = (
  explicitCwd?: string | null,
): string => {
  const explicit = explicitCwd?.trim();
  if (explicit) {
    return explicit;
  }

  const workspaceRoot = process.env.WORKSPACE_ROOT?.trim();
  if (workspaceRoot) {
    return workspaceRoot;
  }

  return getOpenThrottleRoot() ?? process.cwd();
};

/**
 * @description THE cwd precedence ladder for a scheduled agent run, documented in one place:
 *
 * 1. `checkoutPath` — the schedule's `repository_checkout_id` resolved to a directory
 *    (ownership-checked + `toContainerPath`-translated by `ScheduledAgentJobCheckoutPathService`).
 *    Callers pass the already-resolved path so this stays synchronous and side-effect free.
 * 2. `explicitCwd` — the legacy/deprecated free-text `cwd` column (legacy rows, power users).
 * 3. `WORKSPACE_ROOT`, else the detected OpenThrottle root, else `process.cwd()` — today's behavior,
 *    kept verbatim via {@link resolveScheduledAgentJobCwd} so nothing regresses.
 *
 * Deterministic by design: when a schedule carries both a checkout and a `cwd`, the checkout wins and
 * the `cwd` is simply unused — that is why supplying both is accepted rather than rejected on write.
 */
export const resolveScheduledAgentJobRunCwd = (input: {
  readonly checkoutPath?: string | null;
  readonly explicitCwd?: string | null;
}): string => {
  const checkoutPath = input.checkoutPath?.trim();
  if (checkoutPath) {
    return checkoutPath;
  }

  return resolveScheduledAgentJobCwd(input.explicitCwd);
};

/**
 * @description Reads the effective worker concurrency: `SCHEDULED_AGENT_JOBS_CONCURRENCY`, else
 * {@link SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY}. Invalid/non-positive values fall back, mirroring
 * {@link resolveScheduledAgentJobTimeoutMs}.
 *
 * A number above 1 is only safe in combination with the directory lock keyed by
 * {@link resolveScheduledAgentJobConcurrencyKey} — this knob controls how many *independent*
 * directories can run at once, never how many runs share one.
 */
export const resolveScheduledAgentJobsConcurrency = (): number => {
  const raw = process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY;
};

/** Namespace prefix of every advisory directory-lock key this feature takes. */
export const SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX = 'scheduled-agent-jobs:dir:';

/**
 * @description Normalizes a resolved cwd into a stable directory identity. Trailing separators are
 * stripped (but never the lone root `/`) so `/repo` and `/repo/` cannot take two different locks on
 * one directory.
 *
 * Deliberately NOT `realpath`: this must stay synchronous and side-effect free, and a symlinked second
 * name for one checkout is a pathological setup that would cost every run a filesystem call to defend
 * against. The paths being compared are the output of ONE resolver
 * ({@link resolveScheduledAgentJobRunCwd}) reading from a checkout row or a user-typed `cwd`, so plain
 * textual normalization catches the case the acceptance criteria name.
 */
const normalizeDirectoryIdentity = (cwd: string): string => {
  const trimmed = cwd.trim();
  const stripped = trimmed.replace(/[/\\]+$/u, '');

  return stripped === '' ? trimmed : stripped;
};

/**
 * @description THE concurrency key for a run: the identity of the directory the run will actually
 * mutate, or `null` when the run needs no serialisation at all.
 *
 * Keyed on the resolved cwd rather than `repository_checkout_id` on purpose. A schedule carrying a
 * legacy free-text `cwd` and a schedule targeting a checkout can resolve to the SAME directory, and an
 * id-based key would let those two overlap — exactly the git-index race the concurrency of 1 existed to
 * prevent. The path is the thing that collides, so the path is the key.
 *
 * Worktree runs are the one case that opts out, and only in the narrow form where opting out is sound:
 *
 * - **Flag-only** (`worktree: ''`, see `WORKTREE_FLAG_ONLY`) — the CLI picks a fresh worktree per
 *   invocation, so no two runs can meet. Returns `null`; these runs never wait on anything. Without
 *   this branch the isolation the user explicitly asked for would buy them nothing.
 * - **Named** (`worktree: 'nightly'`) — the name is a directory two schedules can genuinely share, so
 *   it is folded INTO the key rather than escaping it: same checkout + same name serialise, same
 *   checkout + different names overlap.
 * - **Unsupported driver** — `worktree` is capability-gated in the drivers package
 *   (`appendWorktreeShellFlags` drops the flag when `capabilities.worktree` is false), so a schedule
 *   asking codex/opencode for a worktree gets a plain run in the cwd. Honouring the request here would
 *   hand out a bypass for isolation that is never actually created, so it is ignored.
 *
 * The residual `git worktree add` against the parent repo is accepted as unlocked: it is a
 * sub-second metadata write to `.git/worktrees`, not the index, and serialising whole multi-minute
 * agent runs behind it would defeat the point.
 */
export const resolveScheduledAgentJobConcurrencyKey = (input: {
  readonly cwd: string;
  readonly driverSupportsWorktree: boolean;
  readonly worktree?: string | null;
}): string | null => {
  const directory = normalizeDirectoryIdentity(input.cwd);
  const requested = input.driverSupportsWorktree ? input.worktree : undefined;

  if (requested === undefined || requested === null) {
    return directory;
  }

  const name = requested.trim();

  return name === '' ? null : `${directory}#worktree:${name}`;
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
