/**
 * Shared types for the tool-neutral skill-usage hook core.
 *
 * @public
 */

/** Privacy seam levels (plan 91679bbf extends this). */
export type PrivacyLevel = 'full' | 'name-only' | 'truncated';

/**
 * Who a captured invocation belongs to: authored in this repo (`ours`),
 * authored by the invoking user under their personal skills root outside the
 * repo (`personal`), or installed/plugin-namespaced (`third-party`).
 *
 * Mirrors `SKILL_USAGE_SCOPES` in
 * `@openthrottle/nestjs-repositories`'s `skill-usage-events.entity.ts`, which
 * is the canonical declaration and the one the Postgres CHECK follows.
 */
export type Scope = 'ours' | 'personal' | 'third-party';

/**
 * Outcome classifiers, split by who can honestly emit them.
 *
 * The AUTOMATIC session-end path can only ever produce `session_ended` or
 * `abandoned`: a harness Stop payload carries a session id and nothing else, so
 * it knows the session finished but nothing about whether the skill helped, was
 * followed, or was even read.
 *
 * `success` and `error` are QUALITY claims and are reserved for a deliberate
 * reporter that actually knows how the work went — the opt-in
 * `skill-usage-outcome` helper, or an adapter whose harness reports a genuine
 * failure status. Nothing automatic may emit them.
 */
export type SkillUsageOutcome =
  'abandoned' | 'error' | 'session_ended' | 'success';

/**
 * The producer contract — what a per-tool adapter must supply. Everything
 * downstream (scope, privacy, build, persist) is tool-neutral.
 *
 * @public
 */
export interface NormalizedInvocation {
  agent_id?: string;
  agent_type?: string;
  args?: unknown;
  cwd?: string | null;
  hook_event_name?: string;
  invocation_path?: string | null;
  prompt_id?: string;
  session_id?: string | null;
  skill_name: string | null;
  source?: string;
  tool_use_id?: string;
}

/**
 * One usage event — one JSONL line / GraphQL input source.
 *
 * @public
 */
export interface UsageEvent {
  agent_id?: string;
  agent_type?: string;
  args: string | null;
  cwd: string;
  git_branch: string;
  hook_event_name?: string;
  invocation_path: string | null;
  privacy_level: PrivacyLevel;
  prompt_id?: string;
  scope: Scope;
  session_id: string | null;
  skill_name: string;
  source?: string;
  timestamp: string;
  tool_use_id?: string;
}

/**
 * One outcome enrichment event (Phase 4).
 *
 * @public
 */
export interface OutcomeEvent {
  cwd: string;
  duration_ms: number | null;
  event_kind: 'outcome';
  git_branch: string;
  outcome: SkillUsageOutcome;
  scope: Scope;
  session_id: string | null;
  skill_name: string;
  source?: string;
  timestamp: string;
  tool_use_id: string | null;
}

/** A failed GraphQL post attempt. */
export interface PostFailure {
  ok: false;
  /**
   * True when the server rejected the payload itself (validation, 4xx), so
   * re-sending the same line can never succeed. See data/graphql.ts.
   */
  permanent: boolean;
  reason: string;
}

/** Result of a single GraphQL post attempt. */
export type PostResult = PostFailure | { id: string; ok: true };

/**
 * One token-usage row, tool-neutral. Snake_case like the buffered `UsageEvent`
 * and mapped to the camelCase GraphQL row in one place
 * (`toRecordTokenUsageRow`). An adapter's transcript parser produces these;
 * nothing downstream knows which tool they came from beyond `source`.
 *
 * @public
 */
export interface TokenUsageRecord {
  readonly cache_read_tokens: number | null;
  readonly cache_write_tokens: number | null;
  readonly cost_usd: number | null;
  readonly cwd: string | null;
  readonly git_branch: string | null;
  readonly input_tokens: number | null;
  readonly model: string;
  /** ISO-8601 time the turn was observed. */
  readonly occurred_at: string;
  readonly output_tokens: number | null;
  readonly provider: string;
  /** The producer's raw usage object, JSON-stringified; null when absent. */
  readonly raw_usage_json: string | null;
  readonly reasoning_tokens: number | null;
  /** Producer request id; with `source` + `session_id` it is the dedupe key. */
  readonly request_id: string | null;
  readonly session_id: string | null;
  /** Producer id, same vocabulary as `UsageEvent.source`. */
  readonly source: string;
  readonly total_tokens: number | null;
}

/**
 * What `recordTokenUsage` reports back for one accepted batch.
 *
 * @public
 */
export interface TokenUsageBatchCounts {
  readonly inserted: number;
  readonly skipped: number;
}

/**
 * Result of posting one token-usage batch.
 *
 * @public
 */
export type TokenUsageBatchResult =
  PostFailure | (TokenUsageBatchCounts & { ok: true });

/**
 * Result of persisting token-usage records (server → JSONL fallback). Counts
 * are rows: `buffered` went to the retry buffer, `deadLettered` to the
 * dead-letter file because the server rejected them.
 *
 * @public
 */
export interface PersistTokenUsageResult {
  readonly buffered: number;
  readonly deadLettered: number;
  /** Why anything was buffered or dead-lettered; null when all were sent. */
  readonly detail: string | null;
  readonly inserted: number;
  readonly skipped: number;
}

/** Where an event ultimately landed. */
export type PersistSink = 'jsonl' | 'server';

/** Result of a persist attempt (server → JSONL fallback). */
export interface PersistResult {
  detail?: string;
  id?: string;
  sink: PersistSink;
}

/** Per-file drain tally. */
export interface DrainFileResult {
  /** Lines moved to the dead-letter file: the server rejected the payload. */
  deadLettered: number;
  /** Failure reason → line count, over retained AND dead-lettered lines. */
  reasons: Record<string, number>;
  retained: number;
  sent: number;
  skipped: number;
}

/**
 * The minimal `fetch` surface the persistence layer relies on. Narrower than
 * the DOM `fetch` so a plain object mock satisfies it in tests, while the real
 * `globalThis.fetch` remains assignable.
 *
 * @public
 */
export type HookFetch = (
  url: string,
  init: {
    body: string;
    headers: Record<string, string>;
    method: string;
    signal: AbortSignal;
  },
) => Promise<{ json: () => Promise<unknown>; ok: boolean; status: number }>;
