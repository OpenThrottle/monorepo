/**
 * Janitor for `plan_runs` rows opened by an INTERACTIVE agent loop.
 *
 * Why this exists at all: a run registered by an interactive loop carries
 * `heartbeat_expected = false`, which deliberately removes it from the server's
 * stale sweep. That exemption is load-bearing — the sweep does not merely settle a
 * run, it resets the plan and every IN_PROGRESS task to PENDING, and an agent turn
 * routinely goes quiet for longer than the 120s cutoff. But it also means NOTHING
 * server-side will ever settle such a row. One that is opened and never closed sits
 * IN_PROGRESS forever, reads as live, and holds its worktree marked busy.
 *
 * The loop's own settle discipline stays primary, because only the loop knows the
 * CORRECT terminal status. This is the janitor for the cases where that discipline
 * never got the chance to fire: the agent was killed, the laptop slept, the terminal
 * was closed.
 *
 * The safety property is that it can only ever settle a run whose session is
 * provably not the one running now, and whose state file has been untouched for
 * longer than any plausible agent turn. It is structurally incapable of racing live
 * work: the current session is excluded by id before age is even considered.
 *
 * Same shape as `./starts.ts`, for the same reason: `Stop` fires on EVERY turn and
 * is not a session-end signal, so a dead session is always cleaned up by a LATER
 * session's Stop, never by its own.
 *
 * @public
 */

import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import { resolveAuthToken, resolveGraphqlUrl } from '../config/env';
import { logHookError } from '../utils/logging';

const PLAN_RUNS_DIR_REL = path.join('.cache', 'plan-runs');

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

const SETTLE_CLI_PLAN_RUN_MUTATION = `
mutation SettlePlanRunFromHook($input: SettleCliPlanRunInput!) {
  settleCliPlanRun(input: $input) {
    id
    status
  }
}
`;

/** @public */
export interface PlanRunRecord {
  readonly planId: string;
  readonly planRunId: string;
  readonly recordedAt: string;
  readonly sessionId: string;
}

/** @public */
export const planRunsDir = (repoRoot: string): string =>
  path.join(repoRoot, PLAN_RUNS_DIR_REL);

const sanitizeSessionId = (sessionId: string): string =>
  String(sessionId).replace(/[^A-Za-z0-9._-]/g, '-');

/** @public */
export const planRunFilePath = (repoRoot: string, sessionId: string): string =>
  path.join(planRunsDir(repoRoot), `${sanitizeSessionId(sessionId)}.json`);

/**
 * @description Records the run this session opened, so a later session can settle it
 * if this one never does. Best-effort: a failure to write costs the backstop, not the
 * run.
 * @public
 */
export const recordPlanRunForSession = ({
  planId,
  planRunId,
  repoRoot,
  sessionId,
}: {
  readonly planId: string;
  readonly planRunId: string;
  readonly repoRoot: string;
  readonly sessionId: string;
}): boolean => {
  try {
    const sid = sessionId.trim();
    if (sid === '' || planRunId.trim() === '') return false;

    const record: PlanRunRecord = {
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
        query: SETTLE_CLI_PLAN_RUN_MUTATION,
        variables: { input: { planRunId, status: 'FAILED' } },
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
 * @description Settles FAILED every recorded run whose session is provably gone —
 * not the session running now, and untouched for longer than {@link
 * PLAN_RUN_ABANDONED_MS}. Clears each record it settles. Returns how many it settled.
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
  maxAgeMs = PLAN_RUN_ABANDONED_MS,
  now = Date.now(),
  repoRoot,
  timeoutMs = 750,
}: {
  readonly authToken?: string;
  readonly currentSessionId?: string | null;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly graphqlUrl?: string | null;
  readonly maxAgeMs?: number;
  readonly now?: number;
  readonly repoRoot: string;
  readonly timeoutMs?: number;
}): Promise<{ settled: number }> => {
  const dir = planRunsDir(repoRoot);

  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { settled: 0 };
  }

  const currentFile =
    typeof currentSessionId === 'string' && currentSessionId.trim() !== ''
      ? `${sanitizeSessionId(currentSessionId.trim())}.json`
      : null;

  // `undefined` means "resolve it"; an explicit null means "there is none" — the two
  // are different answers, and `??` would collapse them.
  const graphqlUrl =
    graphqlUrlOverride === undefined
      ? resolveGraphqlUrl(repoRoot)
      : graphqlUrlOverride;
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
