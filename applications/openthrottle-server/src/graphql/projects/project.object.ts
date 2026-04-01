/**
 * @description GraphQL ObjectType for Project. Implements {@link ProjectData} from @openthrottle/nestjs-repositories so the API shape stays in sync with the entity.
 */

import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import type { ProjectData } from '@openthrottle/nestjs-repositories/src/modules/projects/project.entity';
import { Field, ObjectType } from '@nestjs/graphql';
import type { PlanObject } from '../plans/plan.object';
import type { TaskObject } from '../tasks/task.object';

@ObjectType()
export class ProjectObject implements ProjectData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `NX project name (e.g. applications/openthrottle-server)`,
    nullable: true,
  })
  nxProjectName!: string | null;

  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- circular ref: plan.object imports ProjectObject */
  @Field(() => [require('../plans/plan.object').PlanObject], {
    description: `Plans linked to this project; resolved via ResolveField.`,
    nullable: true,
  })
  plans!: (PlanObject | Plan)[] | null;

  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- circular ref: task.object imports ProjectObject */
  @Field(() => [require('../tasks/task.object').TaskObject], {
    description: `Tasks linked to this project; resolved via ResolveField.`,
    nullable: true,
  })
  tasks!: (TaskObject | Task)[] | null;

  @Field(() => Date)
  updatedAt!: Date;
}
