/**
 * @description GraphQL ObjectType for one project-repository link. Implements
 * {@link ProjectRepositoryData} from @openthrottle/nestjs-repositories-server so the API shape
 * stays in sync with the entity.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { ProjectRepositoryData } from '@openthrottle/nestjs-repositories-server';

@ObjectType({
  description: `A link between a project and a repository (many-to-many).`,
})
export class ProjectRepositoryObject implements ProjectRepositoryData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  projectId!: string;

  @Field(() => ID)
  repositoryId!: string;
}
