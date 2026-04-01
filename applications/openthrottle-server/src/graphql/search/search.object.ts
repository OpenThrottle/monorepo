/**
 * @description GraphQL ObjectTypes for semantic search: SearchResult wrapper and SearchChunk with id, content, similarity, and source metadata.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchChunk {
  @Field(() => String, {
    description: `Chunk content (plan or task text).`,
  })
  content!: string;

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
    description: `Cosine similarity score (0–1, higher is more relevant).`,
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

@ObjectType()
export class SearchResult {
  @Field(() => [SearchChunk], {
    description: `Ranked search chunks (plans and tasks) by similarity.`,
  })
  chunks!: SearchChunk[];
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
