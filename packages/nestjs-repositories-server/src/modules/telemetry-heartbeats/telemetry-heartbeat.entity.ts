/**
 * @description TypeORM entity for the openthrottle `telemetry_heartbeats` table: one
 * upserted row per (user, machine, repo identity, delivery leg, source). Latest-wins
 * coverage data that is never user-deleted row by row, so it extends
 * `BaseHardDeleteModel` (no soft delete). `firstSeenAt` and `lastSeenAt` stay its own
 * columns beside the base `createdAt`. Matches databases/openthrottle/migrations (160,
 * 161, 170).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('telemetry_heartbeats')
export class TelemetryHeartbeat extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'machine_id', type: 'text' })
  machineId!: string;

  @Column({ name: 'machine_label', nullable: true, type: 'text' })
  machineLabel!: string | null;

  @Column({ type: 'text' })
  source!: string;

  @Column({ name: 'delivery_leg', type: 'text' })
  deliveryLeg!: string;

  @Column({ name: 'repo_identity', nullable: true, type: 'text' })
  repoIdentity!: string | null;

  @Column({ name: 'plugin_version', nullable: true, type: 'text' })
  pluginVersion!: string | null;

  @Column({
    name: 'marketplace_plugin_installed',
    nullable: true,
    type: 'boolean',
  })
  marketplacePluginInstalled!: boolean | null;

  @Column({
    name: 'marketplace_plugin_version',
    nullable: true,
    type: 'text',
  })
  marketplacePluginVersion!: string | null;

  @Column({ default: 0, name: 'buffered_events', type: 'integer' })
  bufferedEvents!: number;

  @Column({ default: 0, name: 'buffered_outcomes', type: 'integer' })
  bufferedOutcomes!: number;

  @Column({ default: 0, name: 'buffered_token_usage', type: 'integer' })
  bufferedTokenUsage!: number;

  @Column({ default: 0, name: 'buffered_trajectories', type: 'integer' })
  bufferedTrajectories!: number;

  @Column({ default: 0, name: 'dead_letter_count', type: 'integer' })
  deadLetterCount!: number;

  @Column({
    name: 'oldest_buffered_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  oldestBufferedAt!: Date | null;

  @Column({ array: true, name: 'recent_buffered_totals', type: 'integer' })
  recentBufferedTotals!: number[];

  @Column({ name: 'first_seen_at', type: 'timestamp with time zone' })
  firstSeenAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp with time zone' })
  lastSeenAt!: Date;
}
