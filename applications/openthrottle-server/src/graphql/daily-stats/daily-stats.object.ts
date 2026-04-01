import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * @description GraphQL ObjectTypes for daily stats: single day and range result.
 */
@ObjectType()
export class DailyStatsObject {
  @Field(() => Date, { description: `Row created_at.` })
  createdAt!: Date;

  @Field(() => String, { description: `Stats date (YYYY-MM-DD).` })
  date!: string;

  @Field(() => String, {
    description: `JSON object of plan status -> count for this date.`,
  })
  plansByStatusJson!: string;

  @Field(() => Int, { description: `Plans created on this date.` })
  plansCreated!: number;

  @Field(() => Int, { description: `Plans completed on this date.` })
  plansCompleted!: number;

  @Field(() => Int, { description: `Plans updated on this date.` })
  plansUpdated!: number;

  @Field(() => String, {
    description: `JSON object of task status -> count for this date.`,
  })
  tasksByStatusJson!: string;

  @Field(() => Int, { description: `Tasks created on this date.` })
  tasksCreated!: number;

  @Field(() => Int, { description: `Tasks completed on this date.` })
  tasksCompleted!: number;

  @Field(() => Int, { description: `Tasks updated on this date.` })
  tasksUpdated!: number;
}

@ObjectType()
export class DailyStatsRangeResultObject {
  @Field(() => [DailyStatsObject], {
    description: `Daily stats rows in the range, ordered by date ascending.`,
  })
  items!: DailyStatsObject[];
}
