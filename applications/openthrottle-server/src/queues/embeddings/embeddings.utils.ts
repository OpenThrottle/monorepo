/**
 * @description Pure helpers for the embeddings queue (OT plan 165e86ef).
 */

import { createHash } from 'node:crypto';

import { EMBEDDABLE_ENTITIES } from './embeddings.constants.ts';
import type {
  EmbedCodeChunksJobData,
  EmbeddableEntity,
  EmbeddingSource,
} from './embeddings.types.ts';

/**
 * @description Deterministic job id that dedupes bursts of writes to one row. BullMQ rejects a
 * custom id with a single `:`, so the separator is a dot.
 */
export function embeddingJobId(entity: EmbeddableEntity, id: string): string {
  return `${entity}.${id}`;
}

export function isEmbeddableEntity(value: unknown): value is EmbeddableEntity {
  return EMBEDDABLE_ENTITIES.some((entity) => {
    return entity === value;
  });
}

/** @description sha256 hex of `text` as UTF-8 — the `content_hash` of an embedding row. */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * @description SQL for the `content_hash` the processor would write for a source row: sha256 of
 * the document prefix plus the source text, cut to `$max` code points. Mirrors
 * `prepareEmbeddingInput` in @openthrottle/node-client — Postgres `left()` counts code points,
 * as `truncateCodePoints` does.
 * @param prefixParam Placeholder holding the model's document prefix (e.g. `$1`).
 * @param maxParam Placeholder holding the input cap (e.g. `$2`).
 */
export function contentHashSql(
  source: EmbeddingSource,
  prefixParam: string,
  maxParam: string,
): string {
  return `encode(sha256(convert_to(left(${prefixParam} || ${source.contentSql}, ${maxParam}), 'UTF8')), 'hex')`;
}

/**
 * @description SQL for the `content_hash` a code chunk row (alias `c`) should carry — the same
 * definition as {@link contentHashSql}, over the row's own `content`.
 */
export function codeContentHashSql(
  prefixParam: string,
  maxParam: string,
): string {
  return `encode(sha256(convert_to(left(${prefixParam} || c.content, ${maxParam}), 'UTF8')), 'hex')`;
}

/**
 * @description Job id for a page of code chunks: one page per first id, so a reconcile cycle
 * that finds the same stale page again while its job is still queued adds nothing.
 */
export function codeChunksJobId(ids: readonly string[]): string {
  return `code.${ids[0] ?? 'empty'}`;
}

export function isCodeChunksJobData(
  value: unknown,
): value is EmbedCodeChunksJobData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entity' in value &&
    value.entity === 'code' &&
    'ids' in value &&
    Array.isArray(value.ids) &&
    value.ids.every((id: unknown) => {
      return typeof id === 'string';
    })
  );
}

/** @description Reads `id` from a TypeORM event's entity when it is a string. */
export function readEntityId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return undefined;
  }

  return typeof value.id === 'string' ? value.id : undefined;
}
