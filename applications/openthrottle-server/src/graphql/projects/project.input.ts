/**
 * @description GraphQL input types for project mutations. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { OffsetPaginationInput } from '@openthrottle/nestjs-graphql';

import type { ProjectPlanMoveDirection } from '../../services/plan-project-membership/plan-project-membership.types.ts';
import { PROJECT_PLAN_MOVE_DIRECTION } from './project-plan-move-direction.enum.ts';

@InputType()
export class CreateProjectInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    deprecationReason: `Projects are initiatives, not Nx projects`,
    description: 'NX project name (e.g. applications/openthrottle-server)',
    nullable: true,
  })
  nxProjectName!: string | null;
}

@InputType()
export class UpdateProjectInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: 'Project id to update' })
  id!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, {
    deprecationReason: `Projects are initiatives, not Nx projects`,
    description: 'NX project name (e.g. applications/openthrottle-server)',
    nullable: true,
  })
  nxProjectName!: string | null;
}

@InputType()
export class DeleteProjectInput {
  @Field(() => ID, { description: 'Project id to delete' })
  id!: string;
}

@InputType()
export class LinkProjectRepositoryInput {
  @Field(() => ID, { description: 'Project to link the repository to' })
  projectId!: string;

  @Field(() => ID, { description: 'Repository to link' })
  repositoryId!: string;
}

@InputType()
export class UnlinkProjectRepositoryInput {
  @Field(() => ID, { description: 'Project to unlink the repository from' })
  projectId!: string;

  @Field(() => ID, { description: 'Repository to unlink' })
  repositoryId!: string;
}

@InputType()
export class AddPlanToProjectInput {
  @Field(() => ID, { description: 'Plan to add to the project' })
  planId!: string;

  @Field(() => ID, { description: 'Project to add the plan to' })
  projectId!: string;
}

@InputType()
export class RemovePlanFromProjectInput {
  @Field(() => ID, { description: 'Plan to remove from its project' })
  planId!: string;
}

@InputType()
export class MoveProjectPlanInput {
  @Field(() => PROJECT_PLAN_MOVE_DIRECTION, {
    description: `UP swaps with the earlier plan in project order, DOWN with the later one`,
  })
  direction!: ProjectPlanMoveDirection;

  @Field(() => ID, { description: 'Plan to move within its project' })
  planId!: string;
}

@InputType()
export class ProjectPlansPageInput extends OffsetPaginationInput {
  @Field(() => ID, { description: 'Project whose plans are listed' })
  projectId!: string;
}

@InputType()
export class ReorderProjectPlansInput {
  @Field(() => [ID], {
    description: `Plan ids in desired order; project_sort_order is reassigned 1000, 2000, … atomically. Plans of the project that are not listed follow in their existing order.`,
  })
  planIds!: string[];

  @Field(() => ID, { description: 'Project whose plans are being reordered' })
  projectId!: string;
}
