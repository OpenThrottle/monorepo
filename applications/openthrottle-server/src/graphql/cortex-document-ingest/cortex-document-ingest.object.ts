/**
 * @description GraphQL result objects for Cortex document ingest preview and commit mutations.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { TaskObject } from '../tasks/task.object';

@ObjectType()
export class PreviewCortexDocumentIngestResultObject {
  @Field(() => Boolean, {
    description: `True when the document parsed successfully.`,
  })
  success!: boolean;

  @Field(() => String, {
    description: `Parse error code when success is false.`,
    nullable: true,
  })
  errorCode!: string | null;

  @Field(() => String, {
    description: `Human-readable error when success is false.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `Detected upload format when parsing ran (e.g. markdown).`,
    nullable: true,
  })
  detectedFormat!: string | null;

  @Field(() => String, {
    description: `Suggested plan title from the document structure.`,
    nullable: true,
  })
  planTitleSuggested!: string | null;

  @Field(() => String, {
    description: `JSON array of proposed tasks: { title, description, requirements[] }.`,
    nullable: true,
  })
  proposedTasksJson!: string | null;
}

@ObjectType()
export class CommitCortexDocumentIngestResultObject {
  @Field(() => Boolean, {
    description: `True when the plan and all tasks were created.`,
  })
  success!: boolean;

  @Field(() => String, {
    description: `Error message when success is false (parse failure or rollback after partial task create).`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => PlanObject, {
    description: `Created plan when success is true.`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => [TaskObject], {
    description: `Created tasks when success is true.`,
  })
  tasks!: TaskObject[];
}
