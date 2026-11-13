/**
 * @description GraphQL input for the coverage heartbeat
 * (child-repo-hook-telemetry-contract.md §8). Carries counts and timestamps
 * only; the server rejects emails and absolute paths.
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordTelemetryHeartbeatInput {
  @Field(() => Int, { description: `Skill-usage events buffered locally.` })
  bufferedEvents!: number;

  @Field(() => Int, { description: `Skill-usage outcomes buffered locally.` })
  bufferedOutcomes!: number;

  @Field(() => Int, { description: `Token-usage records buffered locally.` })
  bufferedTokenUsage!: number;

  @Field(() => Int, { description: `Trajectories buffered locally.` })
  bufferedTrajectories!: number;

  @Field(() => Int, {
    description: `Records across the local dead-letter files.`,
  })
  deadLetterCount!: number;

  @Field(() => String, {
    description: `How the hooks reached the session: repo, plugin-dir or marketplace.`,
  })
  deliveryLeg!: string;

  @Field(() => String, {
    description: `Opaque random machine id (max 64 chars), never a hostname.`,
  })
  machineId!: string;

  @Field(() => String, {
    description: `Operator-chosen machine label; opt-in.`,
    nullable: true,
  })
  machineLabel?: string | null;

  @Field(() => Boolean, {
    description: `Whether the marketplace plugin is installed; null = unknown.`,
    nullable: true,
  })
  marketplacePluginInstalled?: boolean | null;

  @Field(() => String, {
    description: `Installed marketplace plugin version.`,
    nullable: true,
  })
  marketplacePluginVersion?: string | null;

  @Field(() => Date, {
    description: `Client-reported heartbeat timestamp.`,
  })
  occurredAt!: Date;

  @Field(() => Date, {
    description: `Timestamp of the oldest locally buffered record.`,
    nullable: true,
  })
  oldestBufferedAt?: Date | null;

  @Field(() => String, {
    description: `Running payload version, or null for the repo leg.`,
    nullable: true,
  })
  pluginVersion?: string | null;

  @Field(() => String, {
    description: `Git remote of the session's repository. The server re-normalizes it and stores null when it does not survive; absolute paths are rejected.`,
    nullable: true,
  })
  repoIdentity?: string | null;

  @Field(() => String, { description: `Harness, e.g. claude-code.` })
  source!: string;
}
