/**
 * @description The project-run state machine. One idempotent entry point, {@link advance}, reads a
 * project run's state and makes exactly one move: enqueue the next plan, settle the run, or nothing.
 * Every trigger (a plan run settling, the reconcile sweep, runProject, cancelProjectRun) calls it, so
 * it is safe to call any number of times from anywhere.
 *
 * Three layers keep two concurrent advancers from double-running a plan: a Postgres advisory lock
 * per project run (the loser returns `busy`), guarded `project_runs` transitions (a settled run is
 * never moved again), and a deterministic job id per (project run, plan), so even a duplicate
 * enqueue lands on the same BullMQ job and plan_runs row.
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlanRun,
  ProjectRun,
} from '@openthrottle/nestjs-repositories-server';
import {
  PLAN_RUN_STATUS,
  PLAN_STATUS,
  PlanRunsRepository,
  PlansRepository,
  PROJECT_RUN_ACTIVE_STATUSES,
  ProjectRunsRepository,
  RepositoriesRepository,
  RepositoryCheckoutsRepository,
  WorkArtifactsRepository,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { DataSource, In } from 'typeorm';

import { PlanEnqueueService } from '../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import { findLatestPullRequestArtifactsByPlanRunIds } from '../../graphql/plans/plan-run-object/plan-run-object.utils.ts';
import { PlanStatusService } from '../../graphql/plans/plan-status/plan-status.service.ts';
import {
  NIL_UUID,
  PROJECT_RUN_FALLBACK_BRANCH,
  PROJECT_RUN_PASSED_OVER_PLAN_STATUSES,
  PROJECT_RUN_WAITING_PLAN_RUN_STATUSES,
} from './project-run-advance.constants.ts';
import type {
  PlanRunEvidence,
  ProjectRunAdvanceOutcome,
} from './project-run-advance.types.ts';
import {
  actorOf,
  buildProjectRunJobId,
  emptyToNull,
  isLockAcquired,
  judgePlanRun,
  toRalphTuningInput,
} from './project-run-advance.utils.ts';

@Injectable()
export class ProjectRunAdvanceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly planEnqueueService: PlanEnqueueService,
    private readonly planRunsRepository: PlanRunsRepository,
    private readonly plansRepository: PlansRepository,
    private readonly planStatusService: PlanStatusService,
    private readonly projectRunsRepository: ProjectRunsRepository,
    private readonly repositoriesRepository: RepositoriesRepository,
    private readonly repositoryCheckoutsRepository: RepositoryCheckoutsRepository,
    private readonly workArtifactsRepository: WorkArtifactsRepository,
    private readonly workSessionsRepository: WorkSessionsRepository,
  ) {}

  /**
   * @description Reads the project run and makes one move. Holds a session-level advisory lock on
   * the run for the duration, so a concurrent call returns `busy` rather than racing this one.
   */
  async advance(projectRunId: string): Promise<ProjectRunAdvanceOutcome> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const rows: unknown = await queryRunner.query(
        `SELECT pg_try_advisory_lock(hashtext($1)) AS locked`,
        [`project_run:${projectRunId}`],
      );

      if (!isLockAcquired(rows)) {
        return { kind: 'busy' };
      }

      try {
        return await this.step(projectRunId);
      } finally {
        await queryRunner.query(`SELECT pg_advisory_unlock(hashtext($1))`, [
          `project_run:${projectRunId}`,
        ]);
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async step(projectRunId: string): Promise<ProjectRunAdvanceOutcome> {
    const run = await this.projectRunsRepository.findRunById(projectRunId);

    if (run === null) {
      return { kind: 'not_found' };
    }

    const isActive = PROJECT_RUN_ACTIVE_STATUSES.some((status) => {
      return status === run.status;
    });

    if (!isActive) {
      return { kind: 'already_settled', status: run.status };
    }

    // Newest first, so the head row for a plan is its latest run (a usage-limit continuation
    // included: it is tagged with the project run too).
    const ourRuns = await this.planRunsRepository.findBy({
      order: { createdAt: 'DESC' },
      where: { projectRunId },
    });

    if (run.cancelRequestedAt !== null) {
      return this.cancel(run, ourRuns);
    }

    const plans = await this.plansRepository.listInProject(run.projectId);
    const evidence = await this.gatherEvidence(ourRuns);

    for (const plan of plans) {
      if (PROJECT_RUN_PASSED_OVER_PLAN_STATUSES.includes(plan.status)) {
        continue;
      }

      if (plan.status === PLAN_STATUS.BLOCKED) {
        return this.stop(run, plan.id, `Plan ${plan.id} is BLOCKED.`);
      }

      const latest = ourRuns.find((candidate) => {
        return candidate.planId === plan.id;
      });

      if (latest === undefined) {
        return this.enqueue(run, plan);
      }

      const verdict = judgePlanRun(latest, evidence);

      if (verdict.kind === 'wait') {
        return {
          kind: 'waiting',
          planId: plan.id,
          planRunId: verdict.planRunId,
        };
      }

      if (verdict.kind === 'stop') {
        return this.stop(run, plan.id, verdict.reason);
      }
    }

    const won = await this.projectRunsRepository.settleCompleted(run.id);

    return won ? { kind: 'completed' } : { kind: 'lost_race' };
  }

  /**
   * @description Everything the verdicts need, read up front in a fixed number of queries: which
   * COMPLETED runs recorded a pull request, and the continuation of every usage-limited run (a
   * continuation is tagged with the project run, so it is usually already in `ourRuns`; the lookup
   * by `resume_of_run_id` catches one that is not).
   */
  private async gatherEvidence(
    ourRuns: readonly PlanRun[],
  ): Promise<PlanRunEvidence> {
    const completedIds = ourRuns.flatMap((candidate) => {
      return candidate.status === PLAN_RUN_STATUS.COMPLETED
        ? [candidate.id]
        : [];
    });
    const limitedIds = ourRuns.flatMap((candidate) => {
      return candidate.status === PLAN_RUN_STATUS.USAGE_LIMITED
        ? [candidate.id]
        : [];
    });

    const [artifacts, continuations] = await Promise.all([
      findLatestPullRequestArtifactsByPlanRunIds(
        this.workSessionsRepository,
        this.workArtifactsRepository,
        completedIds,
      ),
      this.findContinuations(limitedIds),
    ]);

    const continuationByRunId = new Map<string, PlanRun>();
    for (const candidate of [...ourRuns, ...continuations]) {
      if (candidate.resumeOfRunId !== null) {
        continuationByRunId.set(candidate.resumeOfRunId, candidate);
      }
    }

    return {
      continuationByRunId,
      now: new Date(),
      runIdsWithPullRequest: new Set(artifacts.keys()),
    };
  }

  /** @description The runs that continue any of the given usage-limited runs. */
  private async findContinuations(
    limitedRunIds: readonly string[],
  ): Promise<PlanRun[]> {
    if (limitedRunIds.length === 0) {
      return [];
    }

    return this.planRunsRepository.findBy({
      where: { resumeOfRunId: In([...limitedRunIds]) },
    });
  }

  private async cancel(
    run: ProjectRun,
    ourRuns: readonly PlanRun[],
  ): Promise<ProjectRunAdvanceOutcome> {
    const current = ourRuns.find((candidate) => {
      return (
        candidate.planId === run.currentPlanId &&
        PROJECT_RUN_WAITING_PLAN_RUN_STATUSES.includes(candidate.status)
      );
    });

    if (current !== undefined) {
      try {
        await this.planStatusService.cancelRun(
          current.planId,
          run.cancelRequestedBy,
          actorOf(run.cancelRequestedBy),
        );
      } catch (error) {
        // The project run is cancelled either way; a plan-level cancel that failed is logged.
        this.logger.warn(
          `Project run ${run.id}: cancelling plan ${current.planId} failed: ${String(error)}`,
          ProjectRunAdvanceService.name,
        );
      }
    }

    const won = await this.projectRunsRepository.settleCancelled(run.id);

    return won ? { kind: 'cancelled' } : { kind: 'lost_race' };
  }

  private async stop(
    run: ProjectRun,
    planId: string,
    reason: string,
  ): Promise<ProjectRunAdvanceOutcome> {
    const won = await this.projectRunsRepository.settleStopped(
      run.id,
      planId,
      reason,
    );

    return won ? { kind: 'stopped', planId, reason } : { kind: 'lost_race' };
  }

  /**
   * @description Enqueues the plan on the plan-run queue through the shared enqueue pipeline, so its
   * stored runner (Ralph or OT Loop), workspace and tuning apply exactly as the Run button would. A
   * plan that already has a run this project run did not start stops the run (never double-run), and
   * an enqueue refusal stops it with the refusal as the reason.
   */
  private async enqueue(
    run: ProjectRun,
    plan: Plan,
  ): Promise<ProjectRunAdvanceOutcome> {
    const hasForeignRun = await this.planRunsRepository.hasActiveRun(
      plan.id,
      NIL_UUID,
    );

    if (hasForeignRun) {
      return this.stop(
        run,
        plan.id,
        `Plan ${plan.id} already has an active run that this project run did not start.`,
      );
    }

    const claimed = await this.projectRunsRepository.setCurrentPlan(
      run.id,
      plan.id,
    );

    if (!claimed) {
      return { kind: 'lost_race' };
    }

    const { workspace } = plan.runConfig;
    const actor = actorOf(run.actorUserId);

    try {
      const outcome = await this.planEnqueueService.enqueueOrchestrator({
        actorKind: actor.actorKind,
        actorSub: actor.actorSub,
        actorUserId: run.actorUserId,
        branch: await this.resolveBranch(plan),
        cancelScheduled: false,
        checkoutId: emptyToNull(workspace.checkoutId),
        idempotencyKey: buildProjectRunJobId(run.id, plan.id),
        jobRunHooksJson: null,
        mode: 'plan',
        planId: plan.id,
        projectRunId: run.id,
        ralph: toRalphTuningInput(plan.runConfig),
        repositoryId: emptyToNull(workspace.repositoryId),
        runner: null,
        taskId: null,
        workingDirectory: emptyToNull(workspace.workingDirectory),
      });

      return { jobId: outcome.jobId, kind: 'enqueued', planId: plan.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return this.stop(run, plan.id, `Enqueue refused: ${message}`);
    }
  }

  /**
   * @description The branch the plan's run operates on: its repository's registered default branch
   * (through the checkout when only a checkout is configured), else `main`.
   */
  private async resolveBranch(plan: Plan): Promise<string> {
    const { checkoutId, repositoryId } = plan.runConfig.workspace;
    let resolvedRepositoryId = emptyToNull(repositoryId) ?? plan.repositoryId;

    if (resolvedRepositoryId === null && emptyToNull(checkoutId) !== null) {
      const checkout = await this.repositoryCheckoutsRepository.findOne({
        where: { id: checkoutId },
      });
      resolvedRepositoryId = checkout?.repositoryId ?? null;
    }

    if (resolvedRepositoryId === null) {
      return PROJECT_RUN_FALLBACK_BRANCH;
    }

    const repository = await this.repositoriesRepository.findOne({
      where: { id: resolvedRepositoryId },
    });
    const branch = repository?.defaultBranch?.trim() ?? '';

    return branch === '' ? PROJECT_RUN_FALLBACK_BRANCH : branch;
  }
}
