/**
 * Shared types for the tool-neutral skill-usage hook core.
 *
 * @public
 */

/** Privacy seam levels (plan 91679bbf extends this). */
export type PrivacyLevel = 'full' | 'name-only' | 'truncated';

/** Skill provenance: authored by us vs installed/third-party. */
export type Scope = 'ours' | 'third-party';

/** Automatic + manual outcome classifiers. */
export type SkillUsageOutcome = 'abandoned' | 'error' | 'success';

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
  timestamp: string;
  tool_use_id: string | null;
}

/** Result of a single GraphQL post attempt. */
export type PostResult =
  { id: string; ok: true } | { ok: false; reason: string };

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
