/**
 * @description The tag provenance ladder and identity-derived source model.
 *
 * `source` on plan/task tag rows is NEVER caller-supplied: it is derived from the
 * authenticated principal (developer-app session → `human`, service account →
 * `agent`, except the dedicated tagging service account → `server-llm`). The
 * ladder `human > agent > server-llm` arbitrates replace/remove operations.
 * See docs/monorepo/plan-task-tags-rules-design.md ("Provenance ladder").
 */

/**
 * @description Identity classes that may write plan/task tags, ranked
 * `human > agent > server-llm`.
 * @public
 */
export const TAG_SOURCES = {
  AGENT: 'agent',
  HUMAN: 'human',
  SERVER_LLM: 'server-llm',
} as const;

/** @public */
export type TagSource = (typeof TAG_SOURCES)[keyof typeof TAG_SOURCES];

/**
 * @description Ladder rank per source; higher wins. Used to decide whether a
 * caller may replace or remove an existing tag row.
 * @public
 */
export const TAG_SOURCE_RANK: Readonly<Record<TagSource, number>> = {
  [TAG_SOURCES.AGENT]: 2,
  [TAG_SOURCES.HUMAN]: 3,
  [TAG_SOURCES.SERVER_LLM]: 1,
};

/**
 * @description Well-known name of the tagging service account whose writes are
 * classified `server-llm` (the predict/refine tagging jobs authenticate as it).
 * Bootstrapped by the tagging-jobs slice via the migrations 044/045 machinery.
 * @public
 */
export const TAGGING_SERVICE_ACCOUNT_NAME = 'tagging';

/**
 * @description The authenticated identity a tag write happens as, resolved by
 * the API layer from the request principal (never from client input).
 * @public
 */
export interface TagCaller {
  /** `user` (human JWT) or `service_account` (machine bearer token). */
  readonly principalKind: 'service_account' | 'user';
  /** Service account name when principalKind is `service_account`. */
  readonly serviceAccountName?: string;
  /** users.id or service_accounts.id — also the vocabulary owner. */
  readonly subjectId: string;
}

/**
 * @description Derives the provenance source from the caller identity:
 * user → `human`; the tagging service account → `server-llm`; any other
 * service account (MCP, Ralph workers) → `agent`.
 * @public
 */
export const deriveTagSource = (caller: TagCaller): TagSource => {
  if (caller.principalKind === 'user') {
    return TAG_SOURCES.HUMAN;
  }
  if (caller.serviceAccountName === TAGGING_SERVICE_ACCOUNT_NAME) {
    return TAG_SOURCES.SERVER_LLM;
  }
  return TAG_SOURCES.AGENT;
};
