/**
 * @description GraphQL resolver for scheduled agent jobs: list/get/runs queries and
 * create/update/delete/setEnabled/runNow/cancelRun mutations. Gated by DB-backed permissions
 * (settings:read for reads, settings:write for writes) plus an owner check on schedule mutations.
 * Run logs are NOT here — read them via queueJobLogs/queueJobLogTail keyed by the run's bullmqJobId.
 * Coexists with (never replaces) the low-level repeatableJobs/removeRepeatableJob queue introspection.
 */

import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
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
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  AgentCliPreferencesService,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service';
import { ScheduledAgentJobRunStatsObject } from './scheduled-agent-job-run-stats.object';
import {
  ScheduledAgentJobObject,
  ScheduledAgentJobRepositoryObject,
  ScheduledAgentJobRunObject,
} from './scheduled-agent-job.object';
import { ScheduledAgentJobsLoaders } from './scheduled-agent-jobs-loaders';
import {
  CreateScheduledAgentJobInputType,
  SetScheduledAgentJobEnabledInputType,
  UpdateScheduledAgentJobInputType,
} from './scheduled-agent-jobs.input';
import {
  toScheduledAgentJobObject,
  toScheduledAgentJobRunObject,
  toScheduledAgentJobRunStatsObject,
} from './scheduled-agent-jobs.mapper';

/** Default window for the run-stats query: the trailing 24 hours. */
const RUN_STATS_WINDOW_MS = 24 * 60 * 60 * 1000;

const ownerUserIdFor = (principal: AuthPrincipal): string | null =>
  principal.kind === AUTH_PRINCIPAL_KIND_USER ? principal.sub : null;

@Resolver(() => ScheduledAgentJobObject)
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobsResolver {
  constructor(
    private readonly agentPreferences: AgentCliPreferencesService,
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

  @Mutation(() => ScheduledAgentJobRunObject, {
    description: `Enqueue an immediate one-off run (owner only); allowed even when the schedule is disabled.`,
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

  /**
   * @description Rejects scheduling a job against an agent backend — or a specific model of that
   * backend — the owner has disabled on /settings/agents. A null owner (service-account principal) has
   * no per-user preferences, so the check is skipped — the job's driver id is still validated for
   * existence by the service. When a model is given and non-empty, a KNOWN-but-disabled model is also
   * rejected.
   */
  private async assertAgentEnabled(
    ownerUserId: string | null,
    driverId: string,
    model?: string | null,
  ): Promise<void> {
    if (ownerUserId === null) {
      return;
    }
    if (!(await this.agentPreferences.isEnabled(ownerUserId, driverId))) {
      throw new BadRequestException(
        `The ${driverId} agent is disabled. Re-enable it on Settings › Setup to schedule it.`,
      );
    }
    const trimmedModel = model?.trim() ?? '';
    if (
      trimmedModel !== '' &&
      !(await this.agentPreferences.isModelEnabled(
        ownerUserId,
        driverId,
        trimmedModel,
      ))
    ) {
      throw new BadRequestException(
        `The ${trimmedModel} model is disabled. Re-enable it on Settings › Setup to schedule it.`,
      );
    }
  }

  /** @description Rejects a mutation on a schedule owned by a different user. Null-owner rows are open. */
  private async assertOwner(
    id: string,
    principal: AuthPrincipal,
  ): Promise<ScheduledAgentJob> {
    const job = await this.service.get(id);
    if (job === null) {
      throw new ForbiddenException(`Scheduled job ${id} not found`);
    }

    const callerId = ownerUserIdFor(principal);
    if (
      job.ownerUserId !== null &&
      callerId !== null &&
      job.ownerUserId !== callerId
    ) {
      throw new ForbiddenException(
        `Scheduled job ${id} is owned by another user`,
      );
    }

    return job;
  }
}

/**
 * @description Loads a targeted checkout for display, batched per request. A deleted checkout resolves
 * to null rather than an error: the run's `resolvedCwd` still records where it happened.
 */
const resolveTargetRepository = async (
  loaders: ScheduledAgentJobsLoaders,
  repositoryCheckoutId: string | null,
): Promise<ScheduledAgentJobRepositoryObject | null> => {
  if (repositoryCheckoutId === null) return null;

  const checkout = await loaders.checkoutLoader.load(repositoryCheckoutId);
  if (checkout === null) return null;

  return {
    displayName: checkout.displayName,
    filesystemPath: checkout.filesystemPath,
    id: checkout.id,
  };
};

/**
 * @description Resolves the display fields for the checkout a RUN targeted. Separate resolver because
 * `@ResolveField` is bound to the parent ObjectType.
 */
@Resolver(() => ScheduledAgentJobRunObject)
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobRunRepositoryResolver {
  constructor(private readonly loaders: ScheduledAgentJobsLoaders) {}

  @ResolveField(() => ScheduledAgentJobObject, {
    description: `The schedule this run belongs to, so a cross-job run list can label itself without a second round trip. Null only if the schedule has since been deleted.`,
    nullable: true,
  })
  async job(
    @Parent() parent: ScheduledAgentJobRunObject,
  ): Promise<ScheduledAgentJobObject | null> {
    const job = await this.loaders.jobLoader.load(parent.scheduledAgentJobId);
    return job === null ? null : toScheduledAgentJobObject(job);
  }

  @ResolveField(() => ScheduledAgentJobRepositoryObject, {
    description: `The repository checkout this run targeted at fire time, resolved for display.`,
    nullable: true,
  })
  async repository(
    @Parent() parent: ScheduledAgentJobRunObject,
  ): Promise<ScheduledAgentJobRepositoryObject | null> {
    return resolveTargetRepository(this.loaders, parent.repositoryCheckoutId);
  }
}
