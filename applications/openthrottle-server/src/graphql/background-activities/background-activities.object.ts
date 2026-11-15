/**
 * @description GraphQL ObjectType for background activities (OT plan 5767e798). Hand-written
 * @ObjectType — there is no Result / ListResult factory.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Long-running server work in progress (e.g. an embeddings backfill). Listed only while it runs.`,
})
export class BackgroundActivityObject {
  @Field(() => Int, {
    description: `Units of work finished so far, never more than total.`,
  })
  done!: number;

  @Field(() => Int, {
    description: `Seconds left at the smoothed throughput. Null until there is enough signal, while stalled, or when total is unknown.`,
    nullable: true,
  })
  etaSeconds!: number | null;

  @Field(() => String, {
    description: `Stable id, e.g. embeddings_backfill:code.`,
  })
  id!: string;

  @Field(() => String, {
    description: `What kind of work this is: embeddings_backfill (more kinds, e.g. app_update, may follow).`,
  })
  kind!: string;

  @Field(() => String, {
    description: `Human-readable description, e.g. "Re-embedding code chunks".`,
  })
  label!: string;

  @Field(() => Date, {
    description: `When the work was first seen.`,
  })
  startedAt!: Date;

  @Field(() => String, {
    description: `running while progress keeps arriving; stalled after five minutes without any.`,
  })
  status!: string;

  @Field(() => Int, {
    description: `Units of work in all. Null when the size is unknown (an indeterminate bar).`,
    nullable: true,
  })
  total!: number | null;
}
