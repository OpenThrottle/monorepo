/**
 * @description GraphQL objects for the telemetryCoverage query.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: `One delivery leg seen for a repo on a machine.` })
export class TelemetryRepoLegObject {
  @Field(() => String)
  deliveryLeg!: string;

  @Field(() => Date)
  lastSeenAt!: Date;
}

@ObjectType({
  description: `A repo a machine opened a session in, and the delivery legs it came through. repoIdentity is null when the checkout has no remote.`,
})
export class TelemetryRepoCoverageObject {
  @Field(() => [TelemetryRepoLegObject])
  deliveryLegs!: TelemetryRepoLegObject[];

  @Field(() => String, { nullable: true })
  repoIdentity!: string | null;
}

@ObjectType({
  description: `Buffer state from a machine's newest heartbeat.`,
})
export class TelemetryBufferSnapshotObject {
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

  @Field(() => Date, { nullable: true })
  oldestBufferedAt!: Date | null;

  @Field(() => Int)
  totalBuffered!: number;
}

@ObjectType({
  description: `A coverage warning. kind is one of MANUAL_SESSIONS_UNCOVERED, PLUGIN_OUTDATED, BUFFER_STALE, BUFFER_GROWING, DEAD_LETTERED, MACHINE_SILENT.`,
})
export class TelemetryCoverageWarningObject {
  @Field(() => String)
  kind!: string;

  @Field(() => String)
  message!: string;
}

@ObjectType({ description: `Coverage state of one machine.` })
export class TelemetryMachineCoverageObject {
  @Field(() => TelemetryBufferSnapshotObject)
  buffer!: TelemetryBufferSnapshotObject;

  @Field(() => [String])
  deliveryLegsSeen!: string[];

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

  @Field(() => String, { nullable: true })
  pluginVersion!: string | null;

  @Field(() => [TelemetryRepoCoverageObject])
  repos!: TelemetryRepoCoverageObject[];

  @Field(() => [TelemetryCoverageWarningObject])
  warnings!: TelemetryCoverageWarningObject[];
}

@ObjectType({
  description: `Telemetry coverage for the requesting user: which machines report, through which delivery legs, and what is wrong.`,
})
export class TelemetryCoverageObject {
  @Field(() => String, { nullable: true })
  currentPluginVersion!: string | null;

  @Field(() => Date)
  generatedAt!: Date;

  @Field(() => [TelemetryMachineCoverageObject])
  machines!: TelemetryMachineCoverageObject[];

  @Field(() => Int)
  windowDays!: number;
}
