/**
 * @description Typed persistence for telemetry_heartbeats — the per-session
 * coverage heartbeat (child-repo-hook-telemetry-contract.md §8). One upserted,
 * latest-wins row per (user, machine, repo identity, delivery leg, source).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { TELEMETRY_HEARTBEAT_RECENT_TOTALS_LIMIT } from './telemetry-heartbeats.constants.ts';
import { TelemetryHeartbeat } from './telemetry-heartbeats.entity.ts';
import type { UpsertTelemetryHeartbeatInput } from './telemetry-heartbeats.types.ts';

/**
 * The upsert. `recent_buffered_totals` appends $16 and keeps the last $17
 * entries via an open-ended slice. first_seen_at is deliberately absent from
 * the DO UPDATE list.
 */
const UPSERT_SQL = `
  INSERT INTO telemetry_heartbeats (
    user_id, machine_id, machine_label, source, delivery_leg, repo_identity,
    plugin_version, marketplace_plugin_installed, marketplace_plugin_version,
    buffered_events, buffered_outcomes, buffered_token_usage,
    buffered_trajectories, dead_letter_count, oldest_buffered_at,
    recent_buffered_totals
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    ARRAY[$16::int]
  )
  ON CONFLICT (user_id, machine_id, repo_identity, delivery_leg, source)
  DO UPDATE SET
    machine_label = EXCLUDED.machine_label,
    plugin_version = EXCLUDED.plugin_version,
    marketplace_plugin_installed = EXCLUDED.marketplace_plugin_installed,
    marketplace_plugin_version = EXCLUDED.marketplace_plugin_version,
    buffered_events = EXCLUDED.buffered_events,
    buffered_outcomes = EXCLUDED.buffered_outcomes,
    buffered_token_usage = EXCLUDED.buffered_token_usage,
    buffered_trajectories = EXCLUDED.buffered_trajectories,
    dead_letter_count = EXCLUDED.dead_letter_count,
    oldest_buffered_at = EXCLUDED.oldest_buffered_at,
    last_seen_at = NOW(),
    recent_buffered_totals = (
      array_append(telemetry_heartbeats.recent_buffered_totals, $16::int)
    )[GREATEST(
      cardinality(
        array_append(telemetry_heartbeats.recent_buffered_totals, $16::int)
      ) - $17::int + 1,
      1
    ):]
  RETURNING id
`;

@Injectable()
export class TelemetryHeartbeatsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(TelemetryHeartbeat)
    private readonly repository: Repository<TelemetryHeartbeat>,
  ) {
    this.logger.debug('💓 telemetry-heartbeats 💓');
  }

  /**
   * @description Delete every heartbeat row a user has for one machine — all
   * repos, legs and sources — so a retired machine stops raising coverage
   * warnings. Scoped to the user: another user's rows for the same machine id
   * are untouched. Returns how many rows went; a later heartbeat from the
   * machine simply recreates them.
   */
  async deleteForUserMachine(
    userId: string,
    machineId: string,
  ): Promise<number> {
    const result = await this.repository.delete({ machineId, userId });

    return result.affected ?? 0;
  }

  /**
   * @description Heartbeats for a user, newest first. `sinceDate` keeps only
   * rows last seen at or after it; null returns every row.
   */
  async listForUser(
    userId: string,
    sinceDate: Date | null,
  ): Promise<TelemetryHeartbeat[]> {
    if (sinceDate === null) {
      return this.repository.find({
        order: { lastSeenAt: 'DESC' },
        where: { userId },
      });
    }

    return this.repository.find({
      order: { lastSeenAt: 'DESC' },
      where: { lastSeenAt: MoreThanOrEqual(sinceDate), userId },
    });
  }

  /**
   * @description INSERT … ON CONFLICT … DO UPDATE on the heartbeat key. Sets
   * every mutable field, bumps last_seen_at, keeps first_seen_at, and appends
   * the new total buffered count to recent_buffered_totals, keeping only the
   * last three (newest last).
   */
  async upsertHeartbeat(
    userId: string,
    input: UpsertTelemetryHeartbeatInput,
  ): Promise<TelemetryHeartbeat> {
    const total =
      input.bufferedEvents +
      input.bufferedOutcomes +
      input.bufferedTokenUsage +
      input.bufferedTrajectories;

    const rows: ReadonlyArray<{ readonly id: string }> =
      await this.repository.query(UPSERT_SQL, [
        userId,
        input.machineId,
        input.machineLabel,
        input.source,
        input.deliveryLeg,
        input.repoIdentity,
        input.pluginVersion,
        input.marketplacePluginInstalled,
        input.marketplacePluginVersion,
        input.bufferedEvents,
        input.bufferedOutcomes,
        input.bufferedTokenUsage,
        input.bufferedTrajectories,
        input.deadLetterCount,
        input.oldestBufferedAt,
        total,
        TELEMETRY_HEARTBEAT_RECENT_TOTALS_LIMIT,
      ]);
    const id = rows[0]?.id;
    if (id === undefined) {
      throw new Error('telemetry heartbeat upsert returned no row');
    }

    return this.repository.findOneByOrFail({ id });
  }
}
