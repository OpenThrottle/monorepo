/**
 * Persistence: POST to OT GraphQL, JSONL fallback, automatic completion,
 * abandoned sweep, and the opportunistic JSONL→OT drain. Every path is
 * fail-open — always resolves, never throws into a hook.
 */
import fs from 'node:fs';
import path from 'node:path';

import { resolveAuthToken, resolveGraphqlUrl } from '../config/env.ts';
import type {
  DrainFileResult,
  HookFetch,
  OutcomeEvent,
  PersistResult,
  PersistTokenUsageResult,
  PostResult,
  SkillUsageOutcome,
  TokenUsageRecord,
  UsageEvent,
} from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import {
  buildOutcomeEvent,
  RECORD_SKILL_USAGE_MUTATION,
  RECORD_SKILL_USAGE_OUTCOME_MUTATION,
  SKILL_USAGE_OUTCOMES,
  toRecordSkillUsageInput,
  toRecordSkillUsageOutcomeInput,
} from './events.ts';
import { postGraphqlMutation } from './graphql.ts';
import {
  appendDeadLetters,
  appendJsonl,
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultStartsDir,
  defaultTokenUsageJsonlPath,
  drainJsonlFile,
  drainJsonlFileBatched,
  sanitizeSessionId,
  startCorrelationKey,
} from './jsonl.ts';
import { drainStartsForSession, listStartsForSession } from './starts.ts';
import {
  chunkTokenUsage,
  MAX_TOKEN_USAGE_BATCH,
  postTokenUsageBatch,
} from './token-usage.ts';

/**
 * Render an endpoint for a log line. Userinfo is stripped: an endpoint is
 * operator-supplied and could carry `user:password@`, and a diagnostic is not
 * worth leaking a credential into stderr or a CI log.
 */
const forLog = (graphqlUrl: string): string =>
  graphqlUrl.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/?#]*@/i, '$1***@');

/** Short enough that a dead server never stalls Skill tool use. @public */
export const DEFAULT_POST_TIMEOUT_MS = 750;

/**
 * A start-correlation file older than this whose session is not the current
 * one is considered abandoned. Default 6h; override per call via `maxAgeMs`
 * (there is no env override — the previous doc comment named one that no code
 * has ever read).
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
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: 'recordSkillUsage',
    graphqlUrl,
    query: RECORD_SKILL_USAGE_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageInput(event) },
  });
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
  return postGraphqlMutation({
    authToken,
    fetchImpl,
    field: 'recordSkillUsageOutcome',
    graphqlUrl,
    query: RECORD_SKILL_USAGE_OUTCOME_MUTATION,
    timeoutMs,
    variables: { input: toRecordSkillUsageOutcomeInput(event) },
  });
};

const resolveTimeout = (timeoutMs?: number): number =>
  timeoutMs ??
  (Number(process.env.OPENTHROTTLE_TELEMETRY_TIMEOUT_MS) ||
    DEFAULT_POST_TIMEOUT_MS);

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
  const outPath = jsonlPath || defaultJsonlPath();

  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('jsonl append failed', err);
    }
    return { detail: 'OPENTHROTTLE_TELEMETRY_OFFLINE=1', sink: 'jsonl' };
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
      `server post failed; falling back to jsonl (${result.reason}) [endpoint ${forLog(graphqlUrl)}]`,
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
  const outPath = jsonlPath || defaultOutcomesJsonlPath();

  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
    try {
      appendJsonl(outPath, event);
    } catch (err) {
      logHookError('outcome jsonl append failed', err);
    }
    return { detail: 'OPENTHROTTLE_TELEMETRY_OFFLINE=1', sink: 'jsonl' };
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
      `outcome server post failed; falling back to jsonl (${result.reason}) [endpoint ${forLog(graphqlUrl)}]`,
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

/**
 * Persist token-usage records to OT in batches of at most
 * `MAX_TOKEN_USAGE_BATCH`; whatever cannot be delivered is buffered, never
 * lost. Always resolves; never throws.
 *
 * - Offline, no endpoint, or a transient failure (network, timeout, 5xx, auth):
 *   the unsent records are appended to `token-usage.jsonl` in the telemetry
 *   directory for a later drain. After the first transient failure the
 *   remaining batches are buffered WITHOUT another attempt, so a dead server
 *   costs one bounded timeout, not one per batch.
 * - A permanent rejection: that batch goes straight to the dead-letter file —
 *   re-sending the same rows can never succeed — and the next batch is still
 *   tried, since the rejection says nothing about it.
 *
 * Writes only under the telemetry directory, never `repoRoot` (which is read
 * for endpoint configuration in OT checkouts and nothing else).
 *
 * @public
 */
export const persistTokenUsage = async ({
  records,
  repoRoot,
  jsonlPath,
  timeoutMs,
  fetchImpl,
  graphqlUrl: graphqlUrlOverride,
  authToken: authTokenOverride,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  records: readonly TokenUsageRecord[];
  repoRoot: string;
  timeoutMs?: number;
}): Promise<PersistTokenUsageResult> => {
  const outPath = jsonlPath || defaultTokenUsageJsonlPath();
  const tally = { buffered: 0, deadLettered: 0, inserted: 0, skipped: 0 };
  let detail: string | null = null;

  const buffer = (unsent: readonly TokenUsageRecord[]): void => {
    try {
      for (const record of unsent) {
        appendJsonl(outPath, record);
      }
      tally.buffered += unsent.length;
    } catch (err) {
      logHookError('token usage jsonl append failed', err);
    }
  };

  try {
    const batches = chunkTokenUsage(records, MAX_TOKEN_USAGE_BATCH);
    if (!batches.length) {
      return { ...tally, detail };
    }

    const offline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1';
    const graphqlUrl = offline
      ? null
      : (graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot));
    if (offline || !graphqlUrl) {
      buffer(records);
      return {
        ...tally,
        detail: offline
          ? 'OPENTHROTTLE_TELEMETRY_OFFLINE=1'
          : 'missing graphql url',
      };
    }

    const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
    const resolvedTimeout = resolveTimeout(timeoutMs);

    let serverDown = false;
    for (const batch of batches) {
      if (serverDown) {
        buffer(batch);
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- sequential on purpose: stop contacting a failing server after the first transient failure
      const res = await postTokenUsageBatch({
        authToken,
        fetchImpl,
        graphqlUrl,
        records: batch,
        timeoutMs: resolvedTimeout,
      });

      if (res.ok) {
        tally.inserted += res.inserted;
        tally.skipped += res.skipped;
      } else if (res.permanent) {
        detail = res.reason;
        logHookError(
          `token usage batch rejected; moved to dead-letter (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`,
        );
        try {
          appendDeadLetters({
            filePath: outPath,
            reason: res.reason,
            records: batch,
          });
          tally.deadLettered += batch.length;
        } catch (err) {
          logHookError('token usage dead-letter append failed', err);
        }
      } else {
        detail = res.reason;
        serverDown = true;
        logHookError(
          `token usage post failed; falling back to jsonl (${res.reason}) [endpoint ${forLog(graphqlUrl)}]`,
        );
        buffer(batch);
      }
    }

    return { ...tally, detail };
  } catch (err) {
    logHookError('persistTokenUsage failed', err);
    return {
      ...tally,
      detail: err instanceof Error ? err.message : String(err),
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
 * Resolve the open starts for a session into `session_ended` outcomes, persist
 * each, and drain the resolved starts (deduped so a repeated completion never
 * double-emits). Fail-open.
 *
 * This path is AUTOMATIC and deliberately makes no quality claim. A harness
 * session-end payload carries a session id and nothing more: it cannot tell
 * whether the skill helped, was followed, or was even read. It previously
 * defaulted to `success`, which made the Outcomes column measure liveness while
 * reading as quality — every clean session end scored a win. `session_ended`
 * says only what is actually known.
 *
 * `duration_ms` is `null` here for the same reason. It used to be
 * `finishedAt − started_at`, i.e. skill load → END OF THE WHOLE SESSION, so it
 * counted every unrelated thing the session did afterwards. No hook brackets a
 * skill's own work (`PostToolUse` on `Skill` fires when the skill file is
 * INJECTED, not when its work completes), so there is nothing honest to put
 * here — only a deliberate reporter that knows when it finished can supply one.
 *
 * An adapter whose harness reports a genuine failure status may still pass
 * `error` explicitly; nothing automatic may pass `success`.
 *
 * @public
 */
export const completeOpenStartsForSession = async ({
  repoRoot,
  sessionId,
  outcome = SKILL_USAGE_OUTCOMES.SESSION_ENDED,
  finishedAt = new Date().toISOString(),
  startsDir,
  jsonlPath,
  fetchImpl,
  graphqlUrl,
  authToken,
  timeoutMs,
  source,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  finishedAt?: string;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  outcome?: SkillUsageOutcome;
  repoRoot: string;
  sessionId: string | null | undefined;
  /** Producer id of the adapter driving this completion. */
  source?: string;
  startsDir?: string;
  timeoutMs?: number;
}): Promise<{ resolved: number; results: CompletionResult[] }> => {
  const starts = listStartsForSession({ sessionId, startsDir });
  if (!starts.length) {
    return { resolved: 0, results: [] };
  }

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
      // Deliberately null: see the doc comment. The only duration available
      // here is session-tail length, which is not this skill's work.
      const durationMs = null;

      const event = buildOutcomeEvent({
        durationMs,
        outcome,
        repoRoot,
        sessionId:
          typeof start.session_id === 'string' ? start.session_id : sessionId,
        skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
        source,
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

  drainStartsForSession({ resolvedKeys, sessionId, startsDir });
  return { resolved: resolvedKeys.size, results };
};

/**
 * Sweep abandoned starts: files whose session is NOT the current one and whose
 * mtime is older than `maxAgeMs`. Emit one `abandoned` outcome per open start,
 * stamped at detection time with a null `duration_ms`, then remove the file.
 * Fail-open; returns the count swept.
 *
 * `abandoned` means the session ended without a `Stop` that resolved this start
 * — a killed process, a closed terminal, a reaped worktree. It does NOT mean
 * the skill errored, and it is NOT a declined confirmation gate: declining one
 * still ends the turn normally, so that path records `session_ended`.
 *
 * Like `session_ended`, this is a statement about the PROCESS, not about the
 * skill's work, so it is excluded from the quality numerator `/usage` renders.
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
  source,
}: {
  authToken?: string;
  currentSessionId?: string | null;
  fetchImpl?: HookFetch;
  graphqlUrl?: string | null;
  jsonlPath?: string;
  maxAgeMs?: number;
  now?: number;
  repoRoot: string;
  /** Producer id of the adapter driving this sweep. */
  source?: string;
  startsDir?: string;
  timeoutMs?: number;
}): Promise<{ swept: number }> => {
  const dir = startsDir || defaultStartsDir();
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
    const starts = listStartsForSession({ sessionId, startsDir: dir });
    // Stamp the row when the abandonment is DETECTED, not with the session
    // file's mtime — an mtime timestamp lands the row alongside the start that
    // wrote it, making every abandonment look instantaneous.
    const detectedAt = new Date(now).toISOString();
    const seen = new Set<string>();
    for (const start of starts) {
      const key = startCorrelationKey(start);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const event = buildOutcomeEvent({
        // Null for the same reason as the completion path: mtime − started_at
        // is how long the SESSION ran before going silent, not how long this
        // skill's work took. Averaged into `avgDurationMs` it would keep the
        // column reporting session length under an honest-looking label.
        durationMs: null,
        outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
        repoRoot,
        sessionId:
          typeof start.session_id === 'string' ? start.session_id : sessionId,
        skillName: typeof start.skill_name === 'string' ? start.skill_name : '',
        source,
        timestamp: detectedAt,
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
    drainStartsForSession({ sessionId, startsDir: dir });
  }

  return { swept: abandoned.length };
};

/**
 * Opportunistic/scheduled drain of the buffered files (events, outcomes and
 * token usage) to OT. Time-boxed via `budgetMs`, shared across the three
 * streams. Respects OPENTHROTTLE_TELEMETRY_OFFLINE + a missing URL (both →
 * no-op). Token-usage lines are sent in batches, not one POST per line.
 * Fail-open.
 *
 * @public
 */
export const drainBufferedUsage = async ({
  repoRoot,
  eventsPath,
  outcomesPath,
  tokenUsagePath,
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
  tokenUsagePath?: string;
}): Promise<{
  events: DrainFileResult;
  outcomes: DrainFileResult;
  tokenUsage: DrainFileResult;
}> => {
  const empty = (): DrainFileResult => ({
    deadLettered: 0,
    reasons: {},
    retained: 0,
    sent: 0,
    skipped: 0,
  });

  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }

  const graphqlUrl = graphqlUrlOverride ?? resolveGraphqlUrl(repoRoot);
  if (!graphqlUrl) {
    return { events: empty(), outcomes: empty(), tokenUsage: empty() };
  }
  const authToken = authTokenOverride ?? resolveAuthToken(repoRoot);
  const resolvedTimeout = resolveTimeout(timeoutMs);
  const deadlineMs = budgetMs == null ? undefined : nowFn() + budgetMs;

  const events = await drainJsonlFile<UsageEvent>({
    deadlineMs,
    filePath: eventsPath || defaultJsonlPath(),
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
    filePath: outcomesPath || defaultOutcomesJsonlPath(),
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

  const tokenUsage = await drainJsonlFileBatched<TokenUsageRecord>({
    batchSize: MAX_TOKEN_USAGE_BATCH,
    deadlineMs,
    filePath: tokenUsagePath || defaultTokenUsageJsonlPath(),
    nowFn,
    postBatch: (batch) =>
      postTokenUsageBatch({
        authToken,
        fetchImpl,
        graphqlUrl,
        records: batch,
        timeoutMs: resolvedTimeout,
      }),
  });

  reportDeadLetters('events', events);
  reportDeadLetters('outcomes', outcomes);
  reportDeadLetters('token usage', tokenUsage);

  return { events, outcomes, tokenUsage };
};

/**
 * Say so on stderr when a drain dead-lettered anything. Silence is how the
 * 2026-09 outcome rejection went unnoticed for six weeks.
 */
const reportDeadLetters = (label: string, tally: DrainFileResult): void => {
  if (tally.deadLettered > 0) {
    logHookError(
      `drain: ${tally.deadLettered} ${label} line(s) rejected by the server and moved to dead-letter — ${formatDrainReasons(tally)}`,
    );
  }
};

/**
 * `reason ×n; reason ×n`, most frequent first — or `none`.
 *
 * @public
 */
export const formatDrainReasons = (tally: DrainFileResult): string => {
  const entries = Object.entries(tally.reasons).sort((a, b) => b[1] - a[1]);
  return entries.length
    ? entries.map(([reason, count]) => `${reason} ×${count}`).join('; ')
    : 'none';
};

/**
 * One drain summary line for a stream.
 *
 * @public
 */
export const formatDrainFileResult = (
  label: string,
  tally: DrainFileResult,
): string =>
  `${label} sent=${tally.sent} retained=${tally.retained} dead-lettered=${tally.deadLettered} skipped=${tally.skipped} reasons: ${formatDrainReasons(tally)}`;
