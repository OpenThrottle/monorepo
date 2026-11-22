/**
 * @description Project runs over GraphQL: `runProject` starts one, `cancelProjectRun` stops one,
 * `projectRun` reads one, and the `currentPlan` / `stoppedByPlan` fields resolve through
 * request-scoped loaders. Both mutations hand the move itself to ProjectRunAdvanceService, so the
 * first plan enqueues (or the cancel lands) before the mutation returns.
 */

import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { isUniqueViolation } from '@openthrottle/nestjs-postgres';
import type {
  Plan,
  ProjectRun,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  ProjectRunsRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionService } from '../../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { ProjectRunAdvanceService } from '../../../services/project-run-advance/project-run-advance.service.ts';
import { PlanObject } from '../../plans/plan.object.ts';
import { CancelProjectRunInput, RunProjectInput } from '../project.input.ts';
import { ProjectRunObject } from '../project-run.object.ts';
import { ProjectRunLoaders } from './loaders/loaders.service.ts';
import {
  createProjectRunActiveError,
  createProjectRunNotFoundError,
  createProjectRunNothingToRunError,
  hasPlanToRun,
  toProjectRunObject,
} from './project-run.utils.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a),
// the same stance as enqueuePlanRun, whose runs these start.
@Resolver(() => ProjectRunObject)
export class ProjectRunResolver {
  constructor(
    private readonly effectiveUserResolution: EffectiveUserResolutionService,
    private readonly loaders: ProjectRunLoaders,
    private readonly plansRepository: PlansRepository,
    private readonly projectRunAdvance: ProjectRunAdvanceService,
    private readonly projectRunsRepository: ProjectRunsRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  @ResolveField(() => PlanObject, { nullable: true })
  async currentPlan(@Parent() run: ProjectRunObject): Promise<Plan | null> {
    if (run.currentPlanId === null) {
      return null;
    }

    return this.loaders.planLoader.load(run.currentPlanId);
  }

  @ResolveField(() => PlanObject, { nullable: true })
  async stoppedByPlan(@Parent() run: ProjectRunObject): Promise<Plan | null> {
    if (run.stoppedByPlanId === null) {
      return null;
    }

    return this.loaders.planLoader.load(run.stoppedByPlanId);
  }

  @Query(() => ProjectRunObject, {
    description: `A project run by id; null when there is none.`,
    nullable: true,
  })
  async projectRun(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ProjectRunObject | null> {
    const run = await this.projectRunsRepository.findRunById(id);

    return run === null ? null : toProjectRunObject(run);
  }

  @Mutation(() => ProjectRunObject, {
    description: `Run a project: enqueue its plans one after another in project order (each with its own runner, Ralph or OT Loop), one draft PR each, stopping on the first plan that does not finish. The first plan is enqueued before this returns. Resume a STOPPED run by calling this again: finished plans are passed over. Refused with extensions.code PROJECT_RUN_ACTIVE when the project already has an active run, PROJECT_RUN_NOTHING_TO_RUN when every plan is COMPLETED, SKIPPED or CANCELED, NOT_FOUND for an unknown project.`,
  })
  async runProject(
    @Args('input', { type: () => RunProjectInput }) input: RunProjectInput,
    @CurrentUser('sub') actorSub?: string,
  ): Promise<ProjectRunObject> {
    const project = await this.projectsRepository.findOne({
      where: { id: input.projectId },
    });

    if (project === null) {
      throw createProjectRunNotFoundError(`Project ${input.projectId}`);
    }

    const active = await this.projectRunsRepository.findActiveByProjectId(
      project.id,
    );

    if (active !== null) {
      throw createProjectRunActiveError(active.id);
    }

    const plans = await this.plansRepository.listInProject(project.id);

    if (!hasPlanToRun(plans)) {
      throw createProjectRunNothingToRunError();
    }

    const actorUserId = await this.resolveActor(actorSub);
    const run = await this.createRun(project.id, actorUserId);

    await this.projectRunAdvance.advance(run.id);

    return this.reread(run);
  }

  @Mutation(() => ProjectRunObject, {
    description: `Cancel a project run: the plan run it is waiting on is cancelled through the normal plan-run cancel, and the project run settles CANCELLED. A run that already settled is returned unchanged.`,
  })
  async cancelProjectRun(
    @Args('input', { type: () => CancelProjectRunInput })
    input: CancelProjectRunInput,
    @CurrentUser('sub') actorSub?: string,
  ): Promise<ProjectRunObject> {
    const run = await this.projectRunsRepository.findRunById(
      input.projectRunId,
    );

    if (run === null) {
      throw createProjectRunNotFoundError(`Project run ${input.projectRunId}`);
    }

    const requestedBy = await this.resolveActor(actorSub);
    const stamped = await this.projectRunsRepository.stampCancelRequested(
      run.id,
      requestedBy,
    );

    if (stamped) {
      await this.projectRunAdvance.advance(run.id);
    }

    return this.reread(run);
  }

  /** The user the caller acts as: a user passes through, a service account resolves to its acting user. */
  private async resolveActor(
    actorSub: string | undefined,
  ): Promise<string | null> {
    if (actorSub === undefined) {
      return null;
    }

    return this.effectiveUserResolution.resolveEffectiveUserId(actorSub);
  }

  /** Creates the run, mapping a lost race on the one-active-run index to PROJECT_RUN_ACTIVE. */
  private async createRun(
    projectId: string,
    actorUserId: string | null,
  ): Promise<ProjectRun> {
    try {
      return await this.projectRunsRepository.create({
        actorUserId,
        projectId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createProjectRunActiveError(null);
      }

      throw error;
    }
  }

  private async reread(run: ProjectRun): Promise<ProjectRunObject> {
    const latest = await this.projectRunsRepository.findRunById(run.id);

    return toProjectRunObject(latest ?? run);
  }
}
