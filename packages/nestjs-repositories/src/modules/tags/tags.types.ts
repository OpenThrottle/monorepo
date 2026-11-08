import type { TAG_SOURCES } from './tags.constants.ts';

/**
 * @description One entry of an effective tag set: deduped by tag name with the
 * highest-provenance source (and that row's confidence) winning for display.
 * @public
 */
export interface EffectiveTag {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly source: TagSource;
  readonly tag: string;
}

/** @public */
export interface AddTagOptions {
  /** Model confidence (0-1) — stored for server-llm writes, observability only. */
  readonly confidence?: number | null;
}
/** @public */
export type TagSource = (typeof TAG_SOURCES)[keyof typeof TAG_SOURCES];

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
