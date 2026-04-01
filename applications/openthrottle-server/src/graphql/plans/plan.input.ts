/**
 * @description GraphQL input types for plan mutations and multi-arg queries. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreatePlanInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Omit or pass null when plan is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  title!: string;
}

@InputType()
export class UpdatePlanInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  author!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: 'Plan id to update' })
  id!: string;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String, { nullable: true })
  title!: string | null;
}

@InputType()
export class ListPlansByStatusInput {
  @Field(() => [String], {
    description: `Filter by author or assignee (any match). Empty means no assignee filter.`,
    nullable: 'itemsAndList',
  })
  assignees!: string[] | null;

  @Field(() => Int, { nullable: true })
  limit!: number | null;

  @Field(() => Int, { nullable: true })
  offset!: number | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, { nullable: true })
  projectId!: string | null;

  @Field(() => String, {
    description: `Sort by "created" or "updated"`,
    nullable: true,
  })
  sortBy!: 'created' | 'updated' | null;

  @Field(() => String, {
    description: `Sort order "asc" or "desc"`,
    nullable: true,
  })
  sortOrder!: 'asc' | 'desc' | null;

  @Field(() => [String], {
    description: `Filter by plan status. Empty or including "all" means no status filter.`,
    nullable: 'itemsAndList',
  })
  statuses!: string[] | null;

  @Field(() => String, {
    description: `Filter plans whose title contains this substring (case-insensitive)`,
    nullable: true,
  })
  titleSubstring!: string | null;
}

@InputType()
export class SearchPlansInput {
  @Field(() => Int, { nullable: true })
  limit!: number | null;

  @Field(() => String, {
    description: `Semantic search query (embedded for vector similarity)`,
  })
  query!: string;
}

@InputType()
export class DeletePlanInput {
  @Field(() => ID, { description: `Plan id to delete` })
  id!: string;
}

@InputType()
export class EnqueuePlanRunInput {
  @Field(() => ID, { description: `Plan id to enqueue a run for` })
  planId!: string;

  @Field(() => Int, {
    description: `Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority.`,
    nullable: true,
  })
  priority!: number | null;
}

@InputType()
export class SetPlanStatusInput {
  @Field(() => ID, { description: `Plan id to update status for` })
  planId!: string;

  @Field(() => String, {
    description: `New status (e.g. COMPLETED, IN_PROGRESS, PENDING, QUEUED). Normalized to uppercase.`,
  })
  status!: string;
}
