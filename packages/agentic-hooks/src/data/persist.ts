/**
 * Persistence: POST to OT GraphQL, JSONL fallback, automatic completion,
 * abandoned sweep, and the opportunistic JSONL→OT drain. Every path is
 * fail-open — always resolves, never throws into a hook.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { resolveAuthToken, resolveGraphqlUrl } from '../config/env';
import {
  buildOutcomeEvent,
  RECORD_SKILL_USAGE_MUTATION,
  RECORD_SKILL_USAGE_OUTCOME_MUTATION,
  SKILL_USAGE_OUTCOMES,
  toRecordSkillUsageInput,
  toRecordSkillUsageOutcomeInput,
} from './events';
import {
  appendJsonl,
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultStartsDir,
  drainJsonlFile,
  sanitizeSessionId,
  startCorrelationKey,
} from './jsonl';
import { logHookError } from '../utils/logging';
import { drainStartsForSession, listStartsForSession } from './starts';
import type {
  DrainFileResult,
  HookFetch,
  OutcomeEvent,
  PersistResult,
  PostResult,
  SkillUsageOutcome,
  UsageEvent,
} from '../types';

/**
 * Read GraphQL `errors` from a JSON payload. Returns null when there is no
 * non-empty `errors` array; otherwise the joined messages (possibly empty),
 * mirroring the original `payload?.errors?.length` truthiness check.
 */
const readGraphqlErrors = (payload: unknown): string | null => {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.errors) ||
    !payload.errors.length
  ) {
    return null;
  }
  return payload.errors
    .map((e) => (isRecord(e) && typeof e.message === 'string' ? e.message : ''))
    .join('; ');
};

/** Read `data.<field>.id` from a JSON payload, or null when absent. */
const readMutationId = (payload: unknown, field: string): string | null => {
  if (isRecord(payload) && isRecord(payload.data)) {
    const node = payload.data[field];
    if (isRecord(node) && node.id != null) {
      return String(node.id);
    }
  }
  return null;
};

/** Short enough that a dead server never stalls Skill tool use. @public */
export const DEFAULT_POST_TIMEOUT_MS = 750;

/**
 * A start-correlation file older than this whose session is not the current
 * one is considered abandoned. Default 6h; override via SKILL_USAGE_ABANDONED_MS.
 *
 * @public
 */
export const DEFAULT_ABANDONED_MS = 6 * 60 * 60 * 1000;

/**
 * POST one usage event to recordSkillUsage. Fail-open result object.
 *
 * @public
 */
export const postSkillUsageEvent = async ({
  event,
  graphqlUrl,
  authToken = '',
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}: {
  authToken?: string;
  event: UsageEvent;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  timeoutMs?: number;
}): Promise<PostResult> => {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'fetch unavailable' };
  }
  if (!graphqlUrl) {
    return { ok: false, reason: 'missing graphql url' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({
        query: RECORD_SKILL_USAGE_MUTATION,
        variables: { input: toRecordSkillUsageInput(event) },
      }),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, reason };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: `invalid json (${response.status}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const errorMsg = readGraphqlErrors(payload);
  if (errorMsg !== null) {
    return { ok: false, reason: errorMsg };
  }

  if (!response.ok) {
    return { ok: false, reason: `http ${response.status}` };
  }

  const id = readMutationId(payload, 'recordSkillUsage');
  if (!id) {
    return { ok: false, reason: 'missing recordSkillUsage.id' };
  }

  return { id, ok: true };
};

/**
 * POST one outcome to recordSkillUsageOutcome. Fail-open result object.
 *
 * @public
 */
export const postSkillUsageOutcome = async ({
  event,
  graphqlUrl,
  authToken = '',
  timeoutMs = DEFAULT_POST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}: {
  authToken?: string;
  event: OutcomeEvent;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  timeoutMs?: number;
}): Promise<PostResult> => {
  if (typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'fetch unavailable' };
  }
  if (!graphqlUrl) {
    return { ok: false, reason: 'missing graphql url' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({
        query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
        variables: { input: toRecordSkillUsageOutcomeInput(event) },
      }),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, reason };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: `invalid json (${response.status}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const errorMsg = readGraphqlErrors(payload);
  if (errorMsg !== null) {
    return { ok: false, reason: errorMsg };
  }

  if (!response.ok) {
    return { ok: false, reason: `http ${response.status}` };
  }

  const id = readMutationId(payload, 'recordSkillUsageOutcome');
  if (!id) {
    return { ok: false, reason: 'missing recordSkillUsageOutcome.id' };
  }

  return { id, ok: true };
};

const resolveTimeout = (timeoutMs?: number): number =>
  timeoutMs ??
  (Number(process.env.SKILL_USAGE_POST_TIMEOUT_MS) || DEFAULT_POST_TIMEOUT_MS);

/**
 * Persist a usage event to OT; on any failure append events JSONL. Always
 * resolves; never throws.
 *
 * @public
 */
export const persistUsageEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
}: {
  authToken?: string;
  event: UsageEvent;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  repoRoot: string;
  timeoutMs?: number;
}): Promise<PersistResult> => {
  const outPath = jsonlPath || defaultJsonlPath(repoRoot);

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: 'SKILL_USAGE_DISABLE_SERVER=1', sink: 'jsonl' };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: 'missing graphql url', sink: 'jsonl' };
  }

  try {
    const result = await postSkillUsageEvent({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolveTimeout(timeoutMs),
    });

    if (result.ok) {
      return { id: result.id, sink: 'server' };
    }

    logHookError(
      `server post failed; falling back to jsonl (${result.reason})`,
    );
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: result.reason, sink: 'jsonl' };
  } catch (err) {
    logHookError('persistUsageEvent failed', err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError('jsonl append failed', appendErr);
    }
    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: 'jsonl',
    };
  }
};

/**
 * Persist an outcome event to OT; on any failure append outcomes JSONL. Always
 * resolves; never throws.
 *
 * @public
 */
export const persistOutcomeEvent = async ({
  event,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
}: {
  authToken?: string;
  event: OutcomeEvent;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  repoRoot: string;
  timeoutMs?: number;
}): Promise<PersistResult> => {
  const outPath = jsonlPath || defaultOutcomesJsonlPath(repoRoot);

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: 'SKILL_USAGE_DISABLE_SERVER=1', sink: 'jsonl' };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);

  if (!graphqlUrl) {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: 'missing graphql url', sink: 'jsonl' };
  }

  try {
    const result = await postSkillUsageOutcome({
      authToken,
      event,
      fetchImpl,
      graphqlUrl,
      timeoutMs: resolveTimeout(timeoutMs),
    });

    if (result.ok) {
      return { id: result.id, sink: 'server' };
    }

    logHookError(
      `outcome server post failed; falling back to jsonl (${result.reason})`,
    );
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: result.reason, sink: 'jsonl' };
  } catch (err) {
    logHookError('persistOutcomeEvent failed', err);
    try {
      appendJsonl(outPath, event);
    } catch (appendErr) {
      logHookError('outcome jsonl append failed', appendErr);
    }
    return {
      detail: err instanceof Error ? err.message : String(err),
      sink: 'jsonl',
    };
  }
};

interface CompletionResult {
  durationMs: number | null;
  key: string;
  sink: string;
  skillName: string;
}

/**
 * Resolve the open starts for a session into `success` outcomes: compute
 * `duration_ms = finishedAt − started_at`, persist each, and drain the resolved
 * starts (deduped so a repeated completion never double-emits). Fail-open.
 *
 * @public
 */
export const completeOpenStartsForSession = async ({
  repoRoot,
  sessionId,
  outcome = SKILL_USAGE_OUTCOMES.SUCCESS,
  finishedAt = new Date().toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  finishedAt?: string;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  outcome?: SkillUsageOutcome;
  repoRoot: string;
  sessionId: string | null | undefined;
  startsDir?: string;
  timeoutMs?: number;
}): Promise<{ resolved: number; results: CompletionResult[] }> => {
  const starts = listStartsForSession({ repoRoot, sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }

  const finishMs = Date.parse(finishedAt);

  // Dedupe by correlation key first (a duplicate correlation line counts once),
  // then persist the unique outcomes concurrently.
  const seen = new Set<string>();
  const unique: Array<Record<string, unknown>> = [];
  for (const start of starts) {
    const key = startCorrelationKey(start);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(start);
  }

  const maybeResults = await Promise.all(
    unique.map(async (start): Promise<CompletionResult | null> => {
      const key = startCorrelationKey(start);
      const startedMs = Date.parse(String(start.started_at));
      const durationMs =
        Number.isFinite(startedMs) && Number.isFinite(finishMs)
          ? Math.max(0, finishMs - startedMs)
          : null;

      const event = buildOutcomeEvent({
        durationMs,
        outcome,
        repoRoot,
        sessionId:
          typeof start.session_id === 'string' ? start.session_id : sessionId,
        skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
        timestamp: finishedAt,
        toolUseId:
          typeof start.tool_use_id === 'string' ? start.tool_use_id : null,
      });
      if (!event) {
        return null;
      }

      let sink = 'error';
      try {
        const res = await persistOutcomeEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          jsonlPath,
          repoRoot,
          timeoutMs,
        });
        sink = res.sink;
      } catch (err) {
        logHookError('completeOpenStartsForSession persist failed', err);
      }

      return { durationMs, key, sink, skillName: event.skill_name };
    }),
  );

  const results = maybeResults.filter((r): r is CompletionResult => r !== null);
  const resolvedKeys = new Set(results.map((r) => r.key));

  drainStartsForSession({ repoRoot, resolvedKeys, sessionId, startsDir });
  return { resolved: resolvedKeys.size, results };
};

/**
 * Sweep abandoned starts: files whose session is NOT the current one and whose
 * mtime is older than `maxAgeMs`. Emit one `abandoned` outcome (duration null)
 * per open start, then remove the file. Fail-open; returns the count swept.
 *
 * @public
 */
export const sweepAbandonedStarts = async ({
  repoRoot,
  currentSessionId,
  maxAgeMs = DEFAULT_ABANDONED_MS,
  now = Date.now(),
  startsDir,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
  jsonlPath,
}: {
  authToken?: string;
  currentSessionId?: string | null;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  maxAgeMs?: number;
  now?: number;
  repoRoot: string;
  startsDir?: string;
  timeoutMs?: number;
}): Promise<{ swept: number }> => {
  const dir = startsDir || defaultStartsDir(repoRoot);
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { swept: 0 };
  }

  const currentFile =
    typeof currentSessionId === 'string' && currentSessionId.trim()
      ? `${sanitizeSessionId(currentSessionId.trim())}.jsonl`
      : null;

  // Collect abandoned outcomes across all stale files (no I/O awaits here), then
  // persist concurrently and drain each stale session file.
  const abandoned: OutcomeEvent[] = [];
  const staleSessions: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.jsonl') || file === currentFile) {
      continue;
    }
    const filePath = path.join(dir, file);
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtimeMs < maxAgeMs) {
      continue;
    }

    const sessionId = file.replace(/\.jsonl$/, '');
    const starts = listStartsForSession({
      repoRoot,
      sessionId,
      startsDir: dir,
    });
    const abandonedAt = new Date(mtimeMs).toISOString();
    const seen = new Set<string>();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const event = buildOutcomeEvent({
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId:
          typeof start.session_id === 'string' ? start.session_id : sessionId,
        skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
        timestamp: abandonedAt,
        toolUseId:
          typeof start.tool_use_id === 'string' ? start.tool_use_id : null,
      });
      if (!event) {
        continue;
      }
      abandoned.push(event);
    }
    // Remove the stale file whether or not any outcome persisted — its session
    // is over; leaving it would re-sweep forever.
    staleSessions.push(sessionId);
  }

  await Promise.all(
    abandoned.map(async (event): Promise<void> => {
      try {
        await persistOutcomeEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          jsonlPath,
          repoRoot,
          timeoutMs,
        });
      } catch (err) {
        logHookError('sweepAbandonedStarts persist failed', err);
      }
    }),
  );

  for (const sessionId of staleSessions) {
    drainStartsForSession({ repoRoot, sessionId, startsDir: dir });
  }

  return { swept: abandoned.length };
};

/**
 * Opportunistic/scheduled drain of both buffered files (events + outcomes) to
 * OT. Time-boxed via `budgetMs`. Respects SKILL_USAGE_DISABLE_SERVER + a missing
 * URL (both → no-op). Fail-open.
 *
 * @public
 */
export const drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  budgetMs = 500,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
  timeoutMs,
  nowFn = Date.now,
}: {
  authToken?: string;
  budgetMs?: number | null;
  eventsPath?: string;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  nowFn?: () => number;
  outcomesPath?: string;
  repoRoot: string;
  timeoutMs?: number;
}): Promise<{ events: DrainFileResult; outcomes: DrainFileResult }> => {
  const empty = (): DrainFileResult => ({ retained: 0, sent: 0, skipped: 0 });

  if (process.env.SKILL_USAGE_DISABLE_SERVER === '1') {
    return { events: empty(), outcomes: empty() };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout = resolveTimeout(timeoutMs);
  const deadlineMs = budgetMs == null ? undefined : nowFn() + budgetMs;

  const events = await drainJsonlFile<UsageEvent>({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(repoRoot),
    nowFn,
    post: (event) =>
      postSkillUsageEvent({
        authToken,
        event,
        fetchImpl,
        graphqlUrl,
        timeoutMs: resolvedTimeout,
      }),
  });

  const outcomes = await drainJsonlFile<OutcomeEvent>({
    deadlineMs,
    filePath: outcomesPath || defaultOutcomesJsonlPath(repoRoot),
    nowFn,
    post: (event) =>
      postSkillUsageOutcome({
        authToken,
        event,
        fetchImpl,
        graphqlUrl,
        timeoutMs: resolvedTimeout,
      }),
  });

  return { events, outcomes };
};
