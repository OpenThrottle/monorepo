import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import type {
  CreateScheduledAgentJobInput,
  ScheduledAgentJobCreatedVia,
  UpdateScheduledAgentJobInput,
} from './scheduled-agent-jobs.types.ts';
import { schedulerKeyForJob } from './scheduler-key/scheduler-key.utils.ts';

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
   * the live-only unique index before the id-derived key lands.
   */
  async createJob(
    input: CreateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob> {
    const draft = this.repository.create({
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

    const saved = await this.repository.save(draft);
    saved.schedulerKey = schedulerKeyForJob(saved.id);
    return this.repository.save(saved);
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
   * Returns whether a live row was deleted.
   */
  async deleteJob(id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ id });
    return removedCount > 0;
  }
}
