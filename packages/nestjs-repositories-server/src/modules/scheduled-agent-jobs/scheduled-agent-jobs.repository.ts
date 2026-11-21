import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { EntityManager } from 'typeorm';
import { IsNull, Repository } from 'typeorm';

import { ScheduledAgentJobWebhookTrigger } from '../scheduled-agent-job-webhook-triggers/scheduled-agent-job-webhook-trigger.entity.ts';
import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import type {
  CreateOwnedScheduledAgentJobInput,
  CreateScheduledAgentJobInput,
  CreateScheduledAgentJobWithinCapsResult,
  ScheduledAgentJobCreatedVia,
  ScheduledAgentJobOwnerCaps,
  UpdateScheduledAgentJobInput,
} from './scheduled-agent-jobs.types.ts';
import { schedulerKeyForJob } from './scheduler-key/scheduler-key.utils.ts';

/** First key of the per-owner cap advisory lock, so it cannot collide with another lock user. */
const OWNER_CAP_LOCK_NAMESPACE = 'scheduled_agent_jobs.owner_caps';

/**
 * @description Data access for the openthrottle `scheduled_agent_jobs` table on the default
 * connection: the `BaseRepository` CRUD plus the schedule-shaped writes. Owns typed persistence
 * access only; scheduling (BullMQ), validation, and the GraphQL surface live in the server. A
 * delete is a soft delete, which fires none of the foreign key actions: the job's runs are kept
 * as history; see migration 178.
 * @public
 */
@Injectable()
export class ScheduledAgentJobsRepository extends BaseRepository<
  ScheduledAgentJob,
  CreateModelInput<ScheduledAgentJob>
> {
  protected readonly tableName = 'scheduled_agent_jobs';

  constructor(
    @InjectRepository(ScheduledAgentJob)
    repository: Repository<ScheduledAgentJob>,
  ) {
    super(repository);
  }

  /**
   * @description Create a schedule row, deriving the stable scheduler key from the generated id.
   * The first save carries a unique placeholder key, so two concurrent creates cannot collide on
   * the live-only unique index before the id-derived key lands. Enforces no cap: an owned job that
   * must respect the per-owner caps goes through {@link createJobWithinOwnerCaps}.
   */
  async createJob(
    input: CreateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob> {
    return this.insertJob(this.repository.manager, input);
  }

  /**
   * @description Create an owned schedule only if the owner is under `caps`, race-free. A
   * transaction-scoped advisory lock keyed on the owner serialises every capped create for that
   * owner, so the count and the insert are one atomic step: two simultaneous creates at
   * `limit - 1` produce exactly one job. Different owners never wait on each other. The `mcp` cap is
   * checked only for an input with `createdVia: 'mcp'`.
   */
  async createJobWithinOwnerCaps(
    input: CreateOwnedScheduledAgentJobInput,
    caps: ScheduledAgentJobOwnerCaps,
  ): Promise<CreateScheduledAgentJobWithinCapsResult> {
    return this.repository.manager.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
        [OWNER_CAP_LOCK_NAMESPACE, input.ownerUserId],
      );

      const total = await manager.count(ScheduledAgentJob, {
        where: { ownerUserId: input.ownerUserId },
      });
      if (total >= caps.maxPerOwner) {
        return {
          count: total,
          limit: caps.maxPerOwner,
          ok: false,
          scope: 'all',
        } as const;
      }

      if (input.createdVia === 'mcp') {
        const viaMcp = await manager.count(ScheduledAgentJob, {
          where: { createdVia: 'mcp', ownerUserId: input.ownerUserId },
        });
        if (viaMcp >= caps.maxMcpPerOwner) {
          return {
            count: viaMcp,
            limit: caps.maxMcpPerOwner,
            ok: false,
            scope: 'mcp',
          } as const;
        }
      }

      const job = await this.insertJob(manager, input);

      return { job, ok: true } as const;
    });
  }

  /**
   * @description How many live schedules an owner has, optionally only those created through one
   * surface. Backs the per-owner caps on the agent path.
   */
  async countJobsForOwner(
    ownerUserId: string,
    createdVia?: ScheduledAgentJobCreatedVia,
  ): Promise<number> {
    return this.repository.count({
      where: {
        ownerUserId,
        ...(createdVia === undefined ? {} : { createdVia }),
      },
    });
  }

  /**
   * @description The live schedule an owner created under an idempotency key, or null.
   */
  async findJobByIdempotencyKey(
    ownerUserId: string,
    idempotencyKey: string,
  ): Promise<ScheduledAgentJob | null> {
    return this.findOne({ where: { idempotencyKey, ownerUserId } });
  }

  /**
   * @description Find one live schedule by id, or null. Named apart from the inherited
   * `findById`, which throws when nothing matches.
   */
  async findJobById(id: string): Promise<ScheduledAgentJob | null> {
    return this.findOne({ where: { id } });
  }

  /** @description List live schedules, newest first; optionally scoped to an owner. */
  async listJobs(ownerUserId?: string): Promise<ScheduledAgentJob[]> {
    return this.findBy({
      order: { createdAt: 'DESC' },
      ...(ownerUserId === undefined ? {} : { where: { ownerUserId } }),
    });
  }

  /** @description All live enabled schedules — the reconciler's boot-time source of truth. */
  async listEnabledJobs(): Promise<ScheduledAgentJob[]> {
    return this.findBy({ where: { enabled: true } });
  }

  /**
   * @description Apply a partial update to a live schedule and return the fresh row, or null when
   * it is absent or deleted. Named apart from the inherited `update`, which throws on a miss.
   */
  async updateJob(
    id: string,
    input: UpdateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob | null> {
    const existing = await this.findJobById(id);
    if (existing === null) return null;

    this.repository.merge(existing, input);
    return this.repository.save(existing);
  }

  /** @description Toggle enablement; returns the fresh row, or null when absent. */
  async setJobEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ScheduledAgentJob | null> {
    return this.updateJob(id, { enabled });
  }

  /**
   * @description Set the cached next-run time from the BullMQ scheduler. Best-effort; a deleted
   * schedule is left untouched.
   */
  async updateNextRunAt(id: string, nextRunAt: Date | null): Promise<void> {
    await this.updateMany({ id }, { nextRunAt });
  }

  /**
   * @description Soft delete a live schedule. Its runs are kept as history (a soft delete fires no
   * foreign key cascade); the run lists that span schedules skip runs of a deleted schedule.
   *
   * Because the soft delete cascades nothing, the job's webhook trigger is hard deleted in the same
   * transaction (its deliveries cascade with it): otherwise the row, its encrypted HMAC secret and
   * its token hash would outlive the job. Nothing is removed unless a live job matched. Returns
   * whether a live row was deleted.
   */
  async deleteJob(id: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.softDelete(ScheduledAgentJob, {
        deletedAt: IsNull(),
        id,
      });
      if (!result.affected) {
        return false;
      }

      await manager.delete(ScheduledAgentJobWebhookTrigger, {
        scheduledAgentJobId: id,
      });

      return true;
    });
  }

  /** @description The two-save insert behind {@link createJob}, on whichever manager is in scope. */
  private async insertJob(
    manager: EntityManager,
    input: CreateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob> {
    const draft = manager.create(ScheduledAgentJob, {
      ...(input.approvalState === undefined
        ? {}
        : { approvalState: input.approvalState }),
      ...(input.createdVia === undefined
        ? {}
        : { createdVia: input.createdVia }),
      cronPattern: input.cronPattern,
      cwd: input.cwd ?? null,
      driverId: input.driverId,
      enabled: input.enabled ?? true,
      idempotencyKey: input.idempotencyKey ?? null,
      intervalMs: input.intervalMs ?? null,
      ...(input.misfirePolicy === undefined
        ? {}
        : { misfirePolicy: input.misfirePolicy }),
      ...(input.misfireThresholdMs === undefined
        ? {}
        : { misfireThresholdMs: input.misfireThresholdMs }),
      model: input.model ?? null,
      name: input.name,
      ownerUserId: input.ownerUserId ?? null,
      prompt: input.prompt,
      repositoryCheckoutId: input.repositoryCheckoutId ?? null,
      runAt: input.runAt ?? null,
      ...(input.scheduleKind === undefined
        ? {}
        : { scheduleKind: input.scheduleKind }),
      // Temporary placeholder; replaced with the id-derived key after insert.
      schedulerKey: `pending:${randomUUID()}`,
      settings: input.settings ?? {},
      timeoutMs: input.timeoutMs ?? null,
      timezone: input.timezone ?? null,
    });

    const saved = await manager.save(draft);
    saved.schedulerKey = schedulerKeyForJob(saved.id);
    return manager.save(saved);
  }
}
