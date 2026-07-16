/**
 * @description GraphQL ObjectTypes for plan/task tag attachments. `source` is
 * identity-derived at write time (human | agent | server-llm) and read-only
 * here; `dimension` is denormalized from the writer's vocabulary.
 */

import type {
  PlanTagData,
  ProjectTagData,
  TaskTagData,
  TagSource,
} from '@openthrottle/nestjs-repositories';
import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A tag attached to a plan. Source is derived from the writing identity (human > agent > server-llm) and never client-supplied.`,
})
export class PlanTagObject implements PlanTagData {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  planId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug, unique per plan.`,
  })
  tag!: string;

  @Field(() => String, {
    description: `Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage; at most one phase tag per plan).`,
  })
  dimension!: string;

  @Field(() => String, {
    description: `Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration.`,
  })
  source!: TagSource;

  @Field(() => Float, {
    description: `Model confidence (0-1) for server-llm rows; null otherwise.`,
    nullable: true,
  })
  confidence!: number | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `A tag attached to a project. Same shape and provenance semantics as plan tags; a project's tags feed the effective-tag-set rollup for its plans.`,
})
export class ProjectTagObject implements ProjectTagData {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  projectId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug, unique per project.`,
  })
  tag!: string;

  @Field(() => String, {
    description: `Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage).`,
  })
  dimension!: string;

  @Field(() => String, {
    description: `Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration.`,
  })
  source!: TagSource;

  @Field(() => Float, {
    description: `Model confidence (0-1) for server-llm rows; null otherwise.`,
    nullable: true,
  })
  confidence!: number | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `A tag attached to a task. Same shape and provenance semantics as plan tags.`,
})
export class TaskTagObject implements TaskTagData {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  taskId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug, unique per task.`,
  })
  tag!: string;

  @Field(() => String, {
    description: `Vocabulary axis: "domain" (subject area) or "phase" (lifecycle stage).`,
  })
  dimension!: string;

  @Field(() => String, {
    description: `Writing identity class: "human", "agent", or "server-llm". Ranked human > agent > server-llm for replace/remove arbitration.`,
  })
  source!: TagSource;

  @Field(() => Float, {
    description: `Model confidence (0-1) for server-llm rows; null otherwise.`,
    nullable: true,
  })
  confidence!: number | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
