/**
 * @description GraphQL ObjectTypes for semantic search: SearchResult wrapper and SearchChunk with id, content, similarity, and source metadata.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import type { SearchMode } from './search.types.ts';

@ObjectType()
export class SearchChunk {
  @Field(() => String, {
    description: `Chunk content (plan or task text).`,
  })
  content!: string;

  @Field(() => Float, {
    description: `Reciprocal-rank-fusion score when the search mode is "hybrid" (results are ordered by it); null otherwise.`,
    nullable: true,
  })
  fusedScore!: number | null;

  @Field(() => String, {
    description: `Chunk UUID from plan_embeddings or task_embeddings.`,
  })
  id!: string;

  @Field(() => String, {
    description: `Plan UUID when chunk is from a plan or a plan's task.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => String, {
    description: `Plan title for display and linking.`,
    nullable: true,
  })
  planTitle!: string | null;

  @Field(() => Float, {
    description: `The retriever's own score for this chunk: cosine similarity (0–1) from vector search, or a ts_rank when only full-text search found it. In hybrid mode, order by fusedScore instead.`,
  })
  similarity!: number;

  @Field(() => String, {
    description: `Source of the chunk: "plan", "task", or "documentation".`,
  })
  source!: string;

  @Field(() => String, {
    description: `When source is documentation: file path in the repo (e.g. docs/foo.md).`,
    nullable: true,
  })
  sourcePath!: string | null;

  @Field(() => String, {
    description: `When source is documentation: GitHub repo (e.g. owner/repo).`,
    nullable: true,
  })
  sourceRepo!: string | null;

  @Field(() => String, {
    description: `When source is documentation: Git SHA for a precise blob link; omit for main.`,
    nullable: true,
  })
  sourceSha!: string | null;

  @Field(() => String, {
    description: `Task UUID when chunk is from a task.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `Task title for display and linking.`,
    nullable: true,
  })
  taskTitle!: string | null;
}

/**
 * @description How many ranked results came from each source, over the whole capped ranking
 * (the same candidates `total` counts), not just the returned page.
 */
@ObjectType()
export class SearchSourceCounts {
  @Field(() => Int, {
    description: `Ranked results from documentation.`,
  })
  documentation!: number;

  @Field(() => Int, { description: `Ranked results from plans.` })
  plan!: number;

  @Field(() => Int, { description: `Ranked results from tasks.` })
  task!: number;
}

@ObjectType()
export class SearchResult {
  @Field(() => [SearchChunk], {
    description: `Ranked search chunks (plans, tasks and documentation): by fusedScore in hybrid mode, otherwise by similarity.`,
  })
  chunks!: SearchChunk[];

  @Field(() => String, {
    description: `How the result was ranked: "hybrid" (vector similarity and Postgres full-text search merged by reciprocal rank fusion), "semantic" (vector similarity with the configured embedding model) or "lexical" (full-text search only, used when semantic search is unavailable).`,
  })
  mode!: SearchMode;

  @Field(() => String, {
    description: `Why the result is lexical, or null when it is hybrid or semantic: embedder_unconfigured | embedder_dimension_mismatch | embedder_provider_error | embedder_busy | no_embeddings.`,
    nullable: true,
  })
  reason!: string | null;

  @Field(() => SearchSourceCounts, {
    description: `How many ranked results came from each source (plan, task, documentation), counted over the whole capped ranking — the same candidates \`total\` counts — not just this page. They sum to \`total\`.`,
  })
  sourceCounts!: SearchSourceCounts;

  @Field(() => Int, {
    description: `How many ranked candidates the query matched, capped at 100. Page through them with \`offset\` and \`limit\`.`,
  })
  total!: number;
}

/**
 * @description A knowledge-base source (plan, task, documentation) for list_sources.
 */
@ObjectType()
export class ListSourceInfoObject {
  @Field(() => String, {
    description: `Source name (e.g. plan, task, documentation).`,
  })
  name!: string;

  @Field(() => String, { description: `Human-readable description.` })
  description!: string;
}

/**
 * @description Plan summary for list_sources (id and title).
 */
@ObjectType()
export class ListPlanSourceObject {
  @Field(() => String, { description: `Plan UUID.` })
  id!: string;

  @Field(() => String, { description: `Plan title.` })
  title!: string;
}

/**
 * @description Result of listSources: sources (plan, task, documentation) and plan titles.
 */
@ObjectType()
export class ListSourcesResultObject {
  @Field(() => [ListSourceInfoObject], {
    description: `Knowledge-base source types and descriptions.`,
  })
  sources!: ListSourceInfoObject[];

  @Field(() => [ListPlanSourceObject], {
    description: `All plans (id, title) for discovery.`,
  })
  plans!: ListPlanSourceObject[];
}
