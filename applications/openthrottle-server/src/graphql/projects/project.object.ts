/**
 * @description GraphQL ObjectType for Project. Implements {@link ProjectData} from @openthrottle/nestjs-repositories so the API shape stays in sync with the entity.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import type { ProjectData } from '@openthrottle/nestjs-repositories';

// Value imports, not `import type`: the `@Field(() => [...])` thunks below
// dereference these at schema-build time. ESM hoists the bindings and the
// thunk defers the read past module evaluation, so the plan.object <->
// project.object cycle resolves without the inline `require()` calls this
// replaced — `require` does not exist under `type: module`.
import { PlanObject } from '../plans/plan.object.ts';
import { TaskObject } from '../tasks/task.object.ts';

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

  @Field(() => [PlanObject], {
    description: `Plans linked to this project; resolved via ResolveField.`,
    nullable: true,
  })
  plans!: (PlanObject | Plan)[] | null;

  @Field(() => [TaskObject], {
    description: `Tasks linked to this project; resolved via ResolveField.`,
    nullable: true,
  })
  tasks!: (TaskObject | Task)[] | null;

  @Field(() => Date)
  updatedAt!: Date;
}
