/**
 * Janitor for `plan_runs` rows opened by an INTERACTIVE agent loop.
 *
 * Why this exists at all: a run registered by an interactive loop carries
 * `heartbeat_expected = false`, which deliberately removes it from the server's
 * 120s stale sweep. That exemption is load-bearing — the sweep does not merely settle a
 * run, it resets the plan and every IN_PROGRESS task to PENDING, and an agent turn
 * routinely goes quiet for longer than the 120s cutoff.
 *
 * The server's own floor for these rows is an unsupervised age sweep at 12h (plus
 * settle-on-next-register). This hook is the fast path under Claude Code: PLAN_RUN_ABANDONED_MS
 * is deliberately shorter, because "this session is provably gone" is far stronger evidence
 * than elapsed time and justifies acting on it sooner. A run opened and never closed reads
 * as live and holds its worktree marked busy for as long as it takes one of them to fire.
 *
 * The loop's own settle discipline stays primary, because only the loop knows the
 * CORRECT terminal status. This is the janitor for the cases where that discipline
 * never got the chance to fire: the agent was killed, the laptop slept, the terminal
 * was closed.
 *
 * The safety property is that it can only ever settle a run whose session is
 * provably not the one running now, whose state file has been untouched for longer
 * than any plausible agent turn, and whose MCP process is no longer alive. It is
 * structurally incapable of racing live work: the current session is excluded by id
 * before age is even considered.
 *
 * "Untouched" has to mean the owning session went quiet, not merely that the run is
 * old, so every Stop first refreshes the CURRENT session's own record. A loop that
 * pauses on a human gate ends its turn on a question; that Stop is exactly what keeps
 * its record fresh. Without it a run older than {@link PLAN_RUN_ABANDONED_MS} was
 * settled by whichever OTHER session in the checkout ended a turn next, even while the
 * loop was alive and waiting (OT plan 6cad3e93). The pid check covers the gap the touch
 * cannot: a human who takes longer than the threshold to answer.
 *
 * Same shape as `./starts.ts`, for the same reason: `Stop` fires on EVERY turn and
 * is not a session-end signal, so a dead session is always cleaned up by a LATER
 * session's Stop, never by its own.
 *
 * @public
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { resolveAuthToken, resolveGraphqlUrl } from '../config/env.ts';
import { logHookError } from '../utils/logging.ts';
import { resolveTelemetryDir } from './jsonl.ts';

const PLAN_RUNS_DIR_BASENAME = 'plan-runs';

/**
 * How long a session's state file must go untouched before its run is treated as
 * abandoned. Deliberately far longer than any plausible quiet gap in a live loop —
 * the expensive failure here is settling a run that is still working, not leaving a
 * dead one an extra hour. The current session is excluded regardless of age, so this
 * threshold only ever applies to sessions that are already gone.
 *
 * @public
 */
export const PLAN_RUN_ABANDONED_MS = 6 * 60 * 60 * 1000;

/**
 * STALE via `forceSettlePlanRun`, never FAILED via `settlePlanRun`: the janitor knows
 * contact was lost, not how the work ended, and the agent's honest-report statuses stay
 * the agent's to claim. The mutation is also guarded server-side to unsupervised
 * IN_PROGRESS rows, so it cannot clobber a run that settled itself in the meantime.
 */
const FORCE_SETTLE_PLAN_RUN_MUTATION = `
mutation ForceSettlePlanRunFromHook($input: ForceSettlePlanRunInput!) {
  forceSettlePlanRun(input: $input) {
    id
    status
  }
}
`;

/**
 * Written to `plan_runs.settled_reason`, so a settled run says which backstop fired.
 * @public
 */
export const PLAN_RUN_JANITOR_SETTLED_REASON = `Claude Code Stop janitor: the session's run record was untouched past the abandonment threshold and its MCP process was gone.`;

/** @public */
export interface PlanRunRecord {
  /** Host the recording MCP process ran on; null for records written before it existed. */
  readonly hostname: string | null;
  /** The recording MCP stdio process — it lives exactly as long as its agent session. */
  readonly pid: number | null;
  readonly planId: string;
  readonly planRunId: string;
  readonly recordedAt: string;
  readonly sessionId: string;
}

/**
 * @description Where this repository's plan-run notes live: under the telemetry
 * directory in the operator's home, never inside the checkout. The writer (the OT
 * MCP, at `register_plan_run`) and this reader both run in repositories OpenThrottle
 * does not own, and a foreign-repo run must leave `git status` clean.
 *
 * Partitioned by a hash of the resolved repo root, so a janitor only ever settles runs
 * recorded from the same checkout, against the endpoint that checkout resolves — the
 * same scoping the old `<repoRoot>/.cache/plan-runs/` gave for free.
 * @public
 */
export const planRunsDir = (repoRoot: string): string => {
  const repoKey = createHash('sha256')
    .update(path.resolve(repoRoot))
    .digest('hex')
    .slice(0, 16);
  return path.join(resolveTelemetryDir(), PLAN_RUNS_DIR_BASENAME, repoKey);
};

const sanitizeSessionId = (sessionId: string): string => {
  return String(sessionId).replace(/[^A-Za-z0-9._-]/g, '-');
};

/** @public */
export const planRunFilePath = (
  repoRoot: string,
  sessionId: string,
): string => {
  return path.join(
    planRunsDir(repoRoot),
    `${sanitizeSessionId(sessionId)}.json`,
  );
};

/**
 * @description Records the run this session opened, so a later session can settle it
 * if this one never does. Best-effort: a failure to write costs the backstop, not the
 * run.
 * @public
 */
export const recordPlanRunForSession = ({
  hostname,
  pid,
  planId,
  planRunId,
  repoRoot,
  sessionId,
}: {
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly planId: string;
  readonly planRunId: string;
  readonly repoRoot: string;
  readonly sessionId: string;
}): boolean => {
  try {
    const sid = sessionId.trim();
    if (sid === '' || planRunId.trim() === '') return false;

    const record: PlanRunRecord = {
      hostname,
      pid,
      planId,
      planRunId,
      recordedAt: new Date().toISOString(),
      sessionId: sid,
    };
    const filePath = planRunFilePath(repoRoot, sid);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

    return true;
  } catch (err) {
    logHookError('recordPlanRunForSession failed', err);
    return false;
  }
};

/**
 * @description Marks the session's recorded run as still owned, by bumping its record's
 * mtime — the clock the janitor ages records on. Called on every Stop of the session
 * that owns the record, which is what keeps a loop paused on a human gate (its turn
 * ended on a question) from reading as abandoned. Returns whether a record was touched;
 * a session with no record is the common case and touches nothing.
 * @public
 */
export const touchPlanRunForSession = ({
  now = Date.now(),
  repoRoot,
  sessionId,
}: {
  readonly now?: number;
  readonly repoRoot: string;
  readonly sessionId: string;
}): boolean => {
  const sid = sessionId.trim();
  if (sid === '') return false;

  const filePath = planRunFilePath(repoRoot, sid);
  try {
    const at = new Date(now);
    fs.utimesSync(filePath, at, at);

    return true;
  } catch {
    // No record for this session (ENOENT) is normal: it opened no run.
    return false;
  }
};

/**
 * @description `process.kill(pid, 0)` delivers no signal; it only asks whether the pid
 * exists. EPERM means it exists under another user — alive. Anything else means gone.
 */
const defaultIsProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch (err) {
    return isRecord(err) && err.code === 'EPERM';
  }
};

/**
 * @description Forgets the run recorded for a session. Called when the loop settles
 * cleanly, so the hook and the loop can never both settle the same run — settling
 * twice is a safe no-op server-side, but relying on that would be sloppy.
 * @public
 */
export const clearPlanRunForSession = ({
  repoRoot,
  sessionId,
}: {
  readonly repoRoot: string;
  readonly sessionId: string;
}): boolean => {
  try {
    const sid = sessionId.trim();
    if (sid === '') return false;

    fs.rmSync(planRunFilePath(repoRoot, sid), { force: true });

    return true;
  } catch (err) {
    logHookError('clearPlanRunForSession failed', err);
    return false;
  }
};

const readPid = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
};

const readPlanRunRecord = (filePath: string): PlanRunRecord | null => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (
      !isRecord(parsed) ||
      typeof parsed.planRunId !== 'string' ||
      parsed.planRunId.trim() === ''
    ) {
      return null;
    }

    return {
      hostname: typeof parsed.hostname === 'string' ? parsed.hostname : null,
      pid: readPid(parsed.pid),
      planId: typeof parsed.planId === 'string' ? parsed.planId : '',
      planRunId: parsed.planRunId,
      recordedAt:
        typeof parsed.recordedAt === 'string' ? parsed.recordedAt : '',
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : '',
    };
  } catch {
    return null;
  }
};

/**
 * @description The plan run recorded for a session by the backstop file, or
 * `undefined` when there is none (or it is unreadable).
 * @public
 */
export const readPlanRunIdForSession = ({
  repoRoot,
  sessionId,
}: {
  readonly repoRoot: string;
  readonly sessionId: string;
}): string | undefined => {
  const sid = sessionId.trim();
  if (sid === '') {
    return undefined;
  }

  return readPlanRunRecord(planRunFilePath(repoRoot, sid))?.planRunId;
};

const postSettle = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  planRunId,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly graphqlUrl: string;
  readonly planRunId: string;
  readonly timeoutMs: number;
}): Promise<boolean> => {
  if (typeof fetchImpl !== 'function') return false;

  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({
        query: FORCE_SETTLE_PLAN_RUN_MUTATION,
        variables: {
          input: { planRunId, reason: PLAN_RUN_JANITOR_SETTLED_REASON },
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const payload: unknown = await response.json();
    if (isRecord(payload) && Array.isArray(payload.errors)) return false;

    return response.ok;
  } catch (err) {
    logHookError('plan-run janitor: settle post failed', err);
    return false;
  }
};

/**
 * @description First refreshes the current session's own record ({@link
 * touchPlanRunForSession}), then settles STALE every recorded run whose session is
 * provably gone — not the session running now, untouched for longer than {@link
 * PLAN_RUN_ABANDONED_MS}, and whose recording MCP process is no longer alive on this
 * host. Clears each record it settles. Returns how many it settled.
 *
 * Fail-open throughout: this is a janitor, and a janitor that throws is worse than
 * one that misses a turn. State it cannot settle is left on disk for the next Stop.
 * @public
 */
export const settleAbandonedPlanRuns = async ({
  authToken: authTokenOverride,
  currentSessionId,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  hostname = os.hostname(),
  isProcessAlive = defaultIsProcessAlive,
  maxAgeMs = PLAN_RUN_ABANDONED_MS,
  now = Date.now(),
  repoRoot,
  timeoutMs = 750,
}: {
  readonly authToken?: string;
  readonly currentSessionId?: string | null;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly graphqlUrl?: string | null;
  readonly hostname?: string;
  readonly isProcessAlive?: (pid: number) => boolean;
  readonly maxAgeMs?: number;
  readonly now?: number;
  readonly repoRoot: string;
  readonly timeoutMs?: number;
}): Promise<{ settled: number }> => {
  // This Stop is proof the current session is alive, so its own record must not age —
  // above all when the turn ended on a question to the human.
  if (typeof currentSessionId === 'string') {
    touchPlanRunForSession({ now, repoRoot, sessionId: currentSessionId });
  }

  const dir = planRunsDir(repoRoot);

  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { settled: 0 };
  }

  let currentFile: string | null = null;
  if (typeof currentSessionId === 'string' && currentSessionId.trim() !== '') {
    currentFile = `${sanitizeSessionId(currentSessionId.trim())}.json`;
  }

  // `undefined` means "resolve it"; an explicit null means "there is none" — the two
  // are different answers, and `??` would collapse them.
  let graphqlUrl = graphqlUrlOverride;
  if (graphqlUrlOverride === undefined) {
    graphqlUrl = resolveGraphqlUrl(repoRoot);
  }
  if (!graphqlUrl) return { settled: 0 };
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  // Two passes: select synchronously, then settle in parallel. Same shape as
  // sweepAbandonedStarts, and it keeps the selection rules readable in one place.
  const candidates: { filePath: string; record: PlanRunRecord }[] = [];

  for (const file of files) {
    // The current session is excluded BY ID, before age is considered. That is what
    // makes this structurally incapable of settling a live run, rather than merely
    // unlikely to.
    if (!file.endsWith('.json') || file === currentFile) continue;

    const filePath = path.join(dir, file);

    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) continue;

    const record = readPlanRunRecord(filePath);
    if (record === null) {
      // Unreadable state helps nobody; drop it rather than retrying forever.
      fs.rmSync(filePath, { force: true });
      continue;
    }

    // A live MCP process means its agent session is still open — idle, perhaps waiting
    // on a human for longer than the threshold, but not gone. Only checkable on the host
    // that recorded it; a record without a pid falls back to age alone.
    const isOwnerAlive =
      record.pid !== null &&
      record.hostname === hostname &&
      isProcessAlive(record.pid);
    if (isOwnerAlive) continue;

    candidates.push({ filePath, record });
  }

  const outcomes = await Promise.all(
    candidates.map(async ({ filePath, record }) => {
      const ok = await postSettle({
        authToken,
        fetchImpl,
        graphqlUrl,
        planRunId: record.planRunId,
        timeoutMs,
      });

      // Only forget a run we actually settled; anything else is left for the next
      // Stop to retry.
      if (ok) fs.rmSync(filePath, { force: true });

      return ok;
    }),
  );

  return { settled: outcomes.filter(Boolean).length };
};
