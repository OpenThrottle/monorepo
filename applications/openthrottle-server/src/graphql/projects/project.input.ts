/**
 * @description GraphQL input types for project mutations. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
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
