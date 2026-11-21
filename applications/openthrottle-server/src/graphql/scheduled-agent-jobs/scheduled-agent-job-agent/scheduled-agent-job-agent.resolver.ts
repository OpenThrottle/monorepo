/**
 * @description GraphQL surface behind the openthrottle-mcp scheduling tools. Separate mutations
 * rather than a client flag because the server must decide who is an agent: every job created here
 * is stamped `created_via = 'mcp'`, and edits are limited to those jobs. Same permissions as the UI
 * (settings:read / settings:write); a service account acts as its linked user (see
 * `agentOwnerUserIdFor`), so the ceiling is the caller's roles and that user's jobs.
 * Nothing here reaches webhook triggers.
 */
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { UserDisabledAgentClisRepository } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { EffectiveUserResolutionService } from '../../../services/effective-user-resolution/effective-user-resolution.service.ts';
import {
  ScheduledAgentJobObject,
  ScheduledAgentJobRunObject,
} from '../scheduled-agent-job.object.ts';
import {
  toScheduledAgentJobObject,
  toScheduledAgentJobRunObject,
} from '../scheduled-agent-jobs.mapper.ts';
import { assertScheduledAgentEnabled } from '../scheduled-agent-jobs.utils.ts';
import {
  CreateScheduledAgentJobAsAgentInputType,
  UpdateScheduledAgentJobAsAgentInputType,
} from './scheduled-agent-job-agent.input.ts';
import { ScheduledAgentJobAgentService } from './scheduled-agent-job-agent.service.ts';
import { agentOwnerUserIdFor } from './scheduled-agent-job-agent.utils.ts';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobAgentResolver {
  constructor(
    private readonly disabledAgentClis: UserDisabledAgentClisRepository,
    private readonly effectiveUsers: EffectiveUserResolutionService,
    private readonly service: ScheduledAgentJobAgentService,
  ) {}

  private async ownerFor(principal: AuthPrincipal): Promise<string> {
    return agentOwnerUserIdFor(principal, async (sub) => {
      return this.effectiveUsers.resolveEffectiveUserId(sub);
    });
  }

  @Query(() => [ScheduledAgentJobObject], {
    description: `The calling user's own scheduled agent jobs, newest first (agent-created and human-created). Agent tools only; a service account lists its acting user's jobs.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobsAsAgent(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ScheduledAgentJobObject[]> {
    const jobs = await this.service.list(await this.ownerFor(principal));
    return jobs.map(toScheduledAgentJobObject);
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Create a scheduled agent job on behalf of an agent. Always owned by the caller and marked created_via=mcp. Requires an idempotencyKey (a retry returns the existing job). Fails when the owner is at SCHEDULED_AGENT_JOBS_MAX_PER_OWNER jobs (default 25) or 10 agent-created jobs. With SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL=true the job is stored disabled and pending until a human approves it. A service account acts as its linked user; one with no acting user is refused.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createScheduledAgentJobAsAgent(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => CreateScheduledAgentJobAsAgentInputType })
    input: CreateScheduledAgentJobAsAgentInputType,
  ): Promise<ScheduledAgentJobObject> {
    const ownerUserId = await this.ownerFor(principal);
    await assertScheduledAgentEnabled(
      this.disabledAgentClis,
      ownerUserId,
      input.driverId,
      input.model,
    );
    const job = await this.service.create(ownerUserId, input);
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => ScheduledAgentJobObject, {
    description: `Update a scheduled agent job that an agent created and the caller owns; human-created jobs are refused. A job awaiting approval cannot be enabled here.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateScheduledAgentJobAsAgent(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => UpdateScheduledAgentJobAsAgentInputType })
    input: UpdateScheduledAgentJobAsAgentInputType,
  ): Promise<ScheduledAgentJobObject> {
    const ownerUserId = await this.ownerFor(principal);
    if (input.driverId != null) {
      await assertScheduledAgentEnabled(
        this.disabledAgentClis,
        ownerUserId,
        input.driverId,
        input.model,
      );
    }
    const job = await this.service.update(ownerUserId, input);
    return toScheduledAgentJobObject(job);
  }

  @Mutation(() => Boolean, {
    description: `Delete a scheduled agent job that an agent created and the caller owns; human-created jobs are refused. Returns whether a row was removed.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteScheduledAgentJobAsAgent(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.service.delete(await this.ownerFor(principal), id);
  }

  @Mutation(() => ScheduledAgentJobRunObject, {
    description: `Enqueue an immediate run of one of the caller's own jobs (agent- or human-created). Refused while the job awaits approval.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async runScheduledAgentJobNowAsAgent(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ScheduledAgentJobRunObject> {
    const run = await this.service.runNow(await this.ownerFor(principal), id);
    return toScheduledAgentJobRunObject(run);
  }
}
