/**
 * @description GraphQL resolver for scheduled agent jobs: list/get/runs queries and
 * create/update/delete/setEnabled/runNow/cancelRun mutations. Gated by DB-backed permissions
 * (settings:read for reads, settings:write for writes) plus an owner check on schedule mutations.
 * Run logs are NOT here — read them via queueJobLogs/queueJobLogTail keyed by the run's bullmqJobId.
 * Coexists with (never replaces) the low-level repeatableJobs/removeRepeatableJob queue introspection.
 */
import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { ScheduledAgentJob } from '@openthrottle/nestjs-repositories-server';
import { UserDisabledAgentClisRepository } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsLoaders } from './loaders/loaders.service.ts';
import {
  ScheduledAgentJobObject,
  ScheduledAgentJobRepositoryObject,
  ScheduledAgentJobRunObject,
} from './scheduled-agent-job.object.ts';
import { ScheduledAgentJobRunStatsObject } from './scheduled-agent-job-run-stats.object.ts';
import {
  CreateScheduledAgentJobInputType,
  SetScheduledAgentJobEnabledInputType,
  UpdateScheduledAgentJobInputType,
} from './scheduled-agent-jobs.input.ts';
import {
  toScheduledAgentJobObject,
  toScheduledAgentJobRunObject,
  toScheduledAgentJobRunStatsObject,
} from './scheduled-agent-jobs.mapper.ts';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs.service.ts';
import {
  assertHumanApprover,
  assertScheduledAgentEnabled,
  assertScheduledAgentJobOwner,
  ownerUserIdFor,
  resolveTargetRepository,
} from './scheduled-agent-jobs.utils.ts';

/** Default window for the run-stats query: the trailing 24 hours. */
const RUN_STATS_WINDOW_MS = 24 * 60 * 60 * 1000;

@Resolver(() => ScheduledAgentJobObject)
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobsResolver {
  constructor(
    private readonly disabledAgentClis: UserDisabledAgentClisRepository,
    private readonly loaders: ScheduledAgentJobsLoaders,
    private readonly logger: LoggerService,
    private readonly service: ScheduledAgentJobsGraphqlService,
  ) {}

  @Query(() => [ScheduledAgentJobObject], {
    description: `All scheduled agent jobs, newest first.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobs(): Promise<ScheduledAgentJobObject[]> {
    const jobs = await this.service.list();
    return jobs.map(toScheduledAgentJobObject);
  }

  @Query(() => ScheduledAgentJobObject, {
    description: `One scheduled agent job by id, or null.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJob(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ScheduledAgentJobObject | null> {
    const job = await this.service.get(id);
    return job === null ? null : toScheduledAgentJobObject(job);
  }

  @Query(() => [ScheduledAgentJobRunObject], {
    description: `Run history for a scheduled agent job, newest first.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobRuns(
    @Args('scheduledAgentJobId', { type: () => ID })
    scheduledAgentJobId: string,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ): Promise<ScheduledAgentJobRunObject[]> {
    const runs = await this.service.listRuns(scheduledAgentJobId, limit);
    return runs.map(toScheduledAgentJobRunObject);
  }

  @Query(() => ScheduledAgentJobRunObject, {
    description: `One run of a scheduled agent job by run id, or null.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobRun(
    @Args('runId', { type: () => ID }) runId: string,
  ): Promise<ScheduledAgentJobRunObject | null> {
    const run = await this.service.getRun(runId);
    return run === null ? null : toScheduledAgentJobRunObject(run);
  }

  @Query(() => [ScheduledAgentJobRunObject], {
    description: `Every run that has not reached a terminal status yet — queued or running — across ALL scheduled agent jobs, oldest-first so the longest-running reads first. Capped; use scheduledAgentJobRuns for one job's history.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobRunsInFlight(
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ): Promise<ScheduledAgentJobRunObject[]> {
    const runs = await this.service.listInFlightRuns(limit);
    return runs.map(toScheduledAgentJobRunObject);
  }

  @Query(() => ScheduledAgentJobRunStatsObject, {
    description: `Aggregate run counts across ALL scheduled agent jobs: live in-flight totals plus terminal outcomes since \`since\` (default: 24h ago). no_op is counted separately and is NOT a failure.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobRunStats(
    @Args('since', { nullable: true, type: () => Date }) since?: Date,
  ): Promise<ScheduledAgentJobRunStatsObject> {
    const windowStart = since ?? new Date(Date.now() - RUN_STATS_WINDOW_MS);
    const [windowCounts, inFlightCounts] = await Promise.all([
      this.service.countRunsByStatusSince(windowStart),
      this.service.countInFlightRunsByStatus(),
    ]);
    return toScheduledAgentJobRunStatsObject(
      windowCounts,
      inFlightCounts,
      windowStart,
    );
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Create a scheduled agent job. Validates cron, driver id, model/endpoint capability, and settings.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createScheduledAgentJob(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => CreateScheduledAgentJobInputType })
    input: CreateScheduledAgentJobInputType,
  ): Promise<ScheduledAgentJobObject> {
    const ownerUserId = ownerUserIdFor(principal);
    await this.assertAgentEnabled(ownerUserId, input.driverId, input.model);
    const job = await this.service.create({ ...input, ownerUserId });
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Update a scheduled agent job (owner only). Re-projects the BullMQ scheduler.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateScheduledAgentJob(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => UpdateScheduledAgentJobInputType })
    input: UpdateScheduledAgentJobInputType,
  ): Promise<ScheduledAgentJobObject> {
    await this.assertOwner(input.id, principal);
    if (input.driverId != null) {
      await this.assertAgentEnabled(
        ownerUserIdFor(principal),
        input.driverId,
        input.model,
      );
    }
    const { id, ...rest } = input;
    const job = await this.service.update(id, rest);
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => Boolean, {
    description: `Delete a scheduled agent job and its scheduler (owner only). Returns whether a row was removed.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteScheduledAgentJob(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.assertOwner(id, principal);
    return this.service.delete(id);
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Enable or disable a scheduled agent job (owner only); registers/removes its scheduler.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setScheduledAgentJobEnabled(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => SetScheduledAgentJobEnabledInputType })
    input: SetScheduledAgentJobEnabledInputType,
  ): Promise<ScheduledAgentJobObject> {
    await this.assertOwner(input.id, principal);
    const job = await this.service.setEnabled(input.id, input.enabled);
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Approve an agent-created scheduled job that is awaiting approval (owner only, signed-in users only: a service-account token is refused): marks it approved and enables it. The only way to arm a pending job.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async approveScheduledAgentJob(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ScheduledAgentJobObject> {
    assertHumanApprover(principal);
    await this.assertOwner(id, principal);
    const job = await this.service.approve(id);
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => ScheduledAgentJobRunObject, {
    description: `Enqueue an immediate one-off run (owner only); allowed even when the schedule is disabled, but refused (SCHEDULED_AGENT_JOB_APPROVAL_PENDING) while the job awaits approval.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async runScheduledAgentJobNow(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ScheduledAgentJobRunObject> {
    await this.assertOwner(id, principal);
    const run = await this.service.runNow(id);
    return toScheduledAgentJobRunObject(run);
  }

  @Mutation(() => ScheduledAgentJobRunObject, {
    description: `Request cancellation of an in-flight run (durable marker + best-effort in-process abort).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async cancelScheduledAgentJobRun(
    @Args('runId', { type: () => ID }) runId: string,
  ): Promise<ScheduledAgentJobRunObject> {
    const run = await this.service.cancelRun(runId);
    return toScheduledAgentJobRunObject(run);
  }

  @ResolveField(() => ScheduledAgentJobRepositoryObject, {
    description: `The repository checkout this schedule targets, resolved for display.`,
    nullable: true,
  })
  async repository(
    @Parent() parent: ScheduledAgentJobObject,
  ): Promise<ScheduledAgentJobRepositoryObject | null> {
    return resolveTargetRepository(this.loaders, parent.repositoryCheckoutId);
  }

  /** @description See {@link assertScheduledAgentEnabled}. */
  private async assertAgentEnabled(
    ownerUserId: string | null,
    driverId: string,
    model?: string | null,
  ): Promise<void> {
    await assertScheduledAgentEnabled(
      this.disabledAgentClis,
      ownerUserId,
      driverId,
      model,
    );
  }

  /** @description Rejects a mutation on a schedule owned by a different user. Null-owner rows are open. */
  private async assertOwner(
    id: string,
    principal: AuthPrincipal,
  ): Promise<ScheduledAgentJob> {
    return assertScheduledAgentJobOwner(
      await this.service.get(id),
      id,
      principal,
    );
  }
}
