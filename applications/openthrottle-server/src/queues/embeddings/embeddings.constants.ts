/**
 * @description BullMQ names, retry policy and per-entity SQL for the embeddings queue
 * (OT plan 165e86ef).
 */

import type {
  EmbeddableEntity,
  EmbeddingBackfillSource,
  EmbeddingSource,
} from './embeddings.types.ts';

export const EMBEDDINGS_QUEUE_NAME = 'Embeddings';

export const EMBEDDABLE_ENTITIES = [
  'custom_prompt',
  'documentation',
  'plan',
  'task',
] as const;

export const EMBED_ENTITY_JOB_NAME = 'embed-entity';

export const EMBED_CODE_CHUNKS_JOB_NAME = 'embed-code-chunks';

/**
 * @description The code chunk table. Unlike the four entity tables it has no source table: each
 * row carries its own text in `content` and is re-embedded from it (OT plan e489d73d).
 */
export const CODE_EMBEDDINGS_TABLE = 'code_embeddings';

/** @description Attempts for a provider error, with exponential backoff from the delay below. */
export const EMBED_ENTITY_JOB_ATTEMPTS = 8;

export const EMBED_ENTITY_BACKOFF_DELAY_MS = 5000;

/**
 * @description How long a job waits before retrying when the embedder is unconfigured or its
 * dimension disagrees with the columns. Re-delayed, never failed: fixing the config (or
 * downloading the weights) lets the backlog drain without anyone re-enqueueing it.
 */
export const EMBED_ENTITY_UNCONFIGURED_DELAY_MS = 5 * 60 * 1000;

/** @description A failed job is kept this long, then removed so the reconciler can re-add it. */
export const EMBED_ENTITY_REMOVE_ON_FAIL_AGE_SECONDS = 3600;

/**
 * @description Default jobs in flight on the Embeddings worker (`EMBEDDINGS_CONCURRENCY`). One:
 * the local model is a single worker thread, so a second job only queues there while holding its
 * texts in memory, and it doubles what a search query can find in line ahead of it.
 */
export const DEFAULT_EMBEDDINGS_CONCURRENCY = 1;

/**
 * @description Default BullMQ limiter for the Embeddings worker: at most this many jobs per
 * {@link DEFAULT_EMBEDDINGS_RATE_LIMIT_DURATION_MS} (`EMBEDDINGS_RATE_LIMIT_MAX` /
 * `EMBEDDINGS_RATE_LIMIT_DURATION_MS`; a max of 0 turns it off). Two jobs a second only paces a
 * burst of single-row entity jobs; a code-chunk page takes longer than that on its own.
 */
export const DEFAULT_EMBEDDINGS_RATE_LIMIT_MAX = 120;

export const DEFAULT_EMBEDDINGS_RATE_LIMIT_DURATION_MS = 60_000;

/**
 * @description Where each embeddable entity's text comes from. `contentSql` is the ONE
 * definition of what gets embedded: the processor loads it and the reconciler hashes it in SQL,
 * so the two can never disagree about whether a row is stale. Every expression reads alias `s`
 * (the source row); `fromSql` may join more.
 */
export const EMBEDDING_SOURCES: Readonly<
  Record<EmbeddableEntity, EmbeddingSource>
> = {
  custom_prompt: {
    contentSql: `concat_ws(E'\\n', NULLIF(s.title, ''), NULLIF(s.description, ''), NULLIF(s.content, ''))`,
    embeddingTable: 'custom_prompt_embeddings',
    fkColumn: 'custom_prompt_id',
    fromSql: 'custom_prompts s',
    whereSql: 's.deleted_at IS NULL',
  },
  documentation: {
    contentSql: `concat_ws(E'\\n', NULLIF(s.path, ''), NULLIF(s.content, ''))`,
    embeddingTable: 'documentation_embeddings',
    fkColumn: 'documentation_id',
    fromSql: 'documentation s',
    // documentation keeps one row per (repo, sha, path); only the newest version of a path is
    // searchable, older ones would only return as duplicates.
    whereSql: `s.id IN (SELECT DISTINCT ON (d.repo, d.path) d.id FROM documentation d ORDER BY d.repo, d.path, d.created_at DESC)`,
  },
  plan: {
    contentSql: `concat_ws(E'\\n', NULLIF(s.title, ''), NULLIF(s.description, ''), NULLIF(s.summary, ''), NULLIF(s.author, ''), NULLIF(s.category, ''))`,
    embeddingTable: 'plan_embeddings',
    fkColumn: 'plan_id',
    fromSql: 'plans s',
    whereSql: 'TRUE',
  },
  task: {
    contentSql: `concat_ws(E'\\n', NULLIF(s.title, ''), NULLIF(s.description, ''), NULLIF(s.summary, ''), 'Plan: ' || NULLIF(p.title, ''))`,
    embeddingTable: 'task_embeddings',
    fkColumn: 'task_id',
    fromSql: 'tasks s LEFT JOIN plans p ON p.id = s.plan_id',
    whereSql: 'TRUE',
  },
};

/** @description Source tables the entity subscriber watches, mapped to their entity. */
export const SUBSCRIBED_TABLES: Readonly<Record<string, EmbeddableEntity>> = {
  custom_prompts: 'custom_prompt',
  plans: 'plan',
  tasks: 'task',
};

/**
 * @description Entity properties whose change alters the embedded text. An update touching
 * none of them (a status flip, a sort-order move) enqueues nothing.
 */
export const EMBEDDED_PROPERTIES = [
  'author',
  'category',
  'content',
  'deletedAt',
  'description',
  'summary',
  'title',
] as const;

/**
 * @description The label each source's `embeddings_backfill` activity shows in the sidebar
 * (OT plan 5767e798).
 */
export const EMBEDDINGS_BACKFILL_LABELS: Readonly<
  Record<EmbeddingBackfillSource, string>
> = {
  code: 'Embedding code chunks',
  custom_prompt: 'Embedding custom prompts',
  documentation: 'Embedding documentation',
  plan: 'Embedding plans',
  task: 'Embedding tasks',
};
