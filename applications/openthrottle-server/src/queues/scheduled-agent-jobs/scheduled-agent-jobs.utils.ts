import {
  hasUsageCounts,
  type NormalizedTokenUsage,
  normalizeUsage,
  sumUsage,
} from '@openthrottle/agentic-token-usage';
import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';

import {
  SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY,
  SCHEDULED_AGENT_JOBS_DEFAULT_TIMEOUT_MS,
} from './scheduled-agent-jobs.constants.ts';

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
 * at the PROJECT root (`applications/openthrottle-server`) — so inheriting it pointed every scheduled
 * agent run at that subdirectory instead of the repo. `WORKSPACE_ROOT` was the intended escape hatch but is never set anywhere in
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
 * Machine token a job's prompt can instruct its agent to emit as the last thing it prints, so a run
 * that did no work stops reporting as a clean success.
 *
 * An agent CLI exits 0 whenever the model produced a turn — including a turn that explicitly
 * declined the task — so the process exit code cannot distinguish "did the work" from "refused".
 * Nor can the CLI's own structured result event: a decline is still a completed turn as far as the
 * CLI is concerned. The only party that knows whether the work happened is the agent, so it has to
 * say so, and it has to say so in a token rather than in prose.
 *
 * This is deliberately an OPT-IN convention, not prose sniffing: a job that says nothing about
 * OT_RUN_OUTCOME keeps exactly its previous mapping, so no existing job or historical row changes
 * meaning. Matching is anchored to a line and case-sensitive; the LAST occurrence wins, so a prompt
 * that quotes the protocol while explaining it cannot outvote the agent's real verdict.
 */
const RUN_OUTCOME_SENTINEL =
  /^OT_RUN_OUTCOME:[ \t]*(completed|no_op)[ \t]*$/gmu;

/**
 * @description Reads the last OT_RUN_OUTCOME sentinel from a run's buffered output. Returns `null`
 * when the job did not opt into the convention, which means "no claim either way" — callers must
 * then fall back to the exit-code mapping rather than assume either outcome.
 */
export const parseRunOutcome = (
  output: string,
): 'completed' | 'no_op' | null => {
  const matches = [...output.matchAll(RUN_OUTCOME_SENTINEL)];
  const last = matches[matches.length - 1]?.[1];

  return last === 'completed' || last === 'no_op' ? last : null;
};

/**
 * @description Fold token usage out of a run's buffered CLI output. The output is JSONL (one event
 * per line for stream-json backends; opencode emits several mid-stream usage lines), so each line is
 * run through the shared {@link normalizeUsage} and accumulated with {@link sumUsage} — the same fold
 * `ConversationStreamService.persistTurnUsage` does, but over raw buffered text instead of discrete
 * usage events. Defensive by contract: `normalizeUsage`/`sumUsage` never throw on bad/partial input,
 * the whole fold is guarded, and a run that reported no counts folds to `null` (nothing to persist).
 */
export const foldRunUsage = (output: string): NormalizedTokenUsage | null => {
  try {
    const folded = output
      .split('\n')
      .reduce<NormalizedTokenUsage>((accumulated, line) => {
        if (line.trim() === '') return accumulated;
        return sumUsage(accumulated, normalizeUsage(line));
      }, {});

    return hasUsageCounts(folded) ? folded : null;
  } catch {
    return null;
  }
};
