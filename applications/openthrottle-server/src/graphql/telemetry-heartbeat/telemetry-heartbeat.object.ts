/**
 * @description GraphQL object for a stored coverage heartbeat.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Latest coverage heartbeat for one (machine, repo, delivery leg, source) of the authenticated user.`,
})
export class TelemetryHeartbeatObject {
  @Field(() => Int)
  bufferedEvents!: number;

  @Field(() => Int)
  bufferedOutcomes!: number;

  @Field(() => Int)
  bufferedTokenUsage!: number;

  @Field(() => Int)
  bufferedTrajectories!: number;

  @Field(() => Int)
  deadLetterCount!: number;

  @Field(() => String)
  deliveryLeg!: string;

  @Field(() => Date)
  firstSeenAt!: Date;

  @Field(() => ID)
  id!: string;

  @Field(() => Date)
  lastSeenAt!: Date;

  @Field(() => String)
  machineId!: string;

  @Field(() => String, { nullable: true })
  machineLabel!: string | null;

  @Field(() => Boolean, { nullable: true })
  marketplacePluginInstalled!: boolean | null;

  @Field(() => String, { nullable: true })
  marketplacePluginVersion!: string | null;

  @Field(() => Date, { nullable: true })
  oldestBufferedAt!: Date | null;

  @Field(() => String, { nullable: true })
  pluginVersion!: string | null;

  @Field(() => String, { nullable: true })
  repoIdentity!: string | null;

  @Field(() => String)
  source!: string;
}
