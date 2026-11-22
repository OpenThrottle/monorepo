import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { QueryDeepPartialEntity } from 'typeorm';
import { In, Repository } from 'typeorm';

import { ProjectRun } from './project-run.entity.ts';
import {
  PROJECT_RUN_ACTIVE_STATUSES,
  PROJECT_RUN_STATUS,
} from './project-runs.constants.ts';
import type {
  ProjectRunCreateInput,
  ProjectRunTerminalStatus,
} from './project-runs.types.ts';

/**
 * @description Data access for the openthrottle `project_runs` table on the default connection:
 * the `BaseRepository` CRUD plus the active-run reads and the guarded transitions the advance
 * step makes. Every transition is a conditional `UPDATE … WHERE status IN (active)` that reports
 * whether it won, so two concurrent advancers can never both move one run.
 * @public
 */
@Injectable()
export class ProjectRunsRepository extends BaseRepository<
  ProjectRun,
  ProjectRunCreateInput
> {
  protected readonly tableName = 'project_runs';

  constructor(
    @InjectRepository(ProjectRun)
    repository: Repository<ProjectRun>,
  ) {
    super(repository);
  }

  /**
   * @description Finds a project run by id, or null (unlike the inherited `findById`, which throws).
   */
  async findRunById(id: string): Promise<ProjectRun | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * @description The project's active (QUEUED / IN_PROGRESS) run, or null. The partial unique
   * index allows at most one.
   */
  async findActiveByProjectId(projectId: string): Promise<ProjectRun | null> {
    return this.repository.findOne({
      where: { projectId, status: In([...PROJECT_RUN_ACTIVE_STATUSES]) },
    });
  }

  /**
   * @description Every active project run, oldest first: what the reconcile sweep advances.
   */
  async findActive(): Promise<ProjectRun[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { status: In([...PROJECT_RUN_ACTIVE_STATUSES]) },
    });
  }

  /**
   * @description The newest run of each given project, keyed by project id; a project with no
   * run is absent from the map. Batched for the `Project.latestProjectRun` DataLoader.
   */
  async findLatestByProjectIds(
    projectIds: readonly string[],
  ): Promise<ReadonlyMap<string, ProjectRun>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const rows = await this.repository
      .createQueryBuilder('run')
      .distinctOn(['run.project_id'])
      .where('run.project_id IN (:...projectIds)', {
        projectIds: [...projectIds],
      })
      .orderBy('run.project_id')
      .addOrderBy('run.created_at', 'DESC')
      .getMany();

    return new Map(
      rows.map((row) => {
        return [row.projectId, row];
      }),
    );
  }

  /**
   * @description Points an active run at the plan it is now on, flipping a QUEUED run to
   * IN_PROGRESS and stamping `started_at` the first time. Returns whether the run was still active.
   */
  async setCurrentPlan(id: string, planId: string): Promise<boolean> {
    return this.transition(id, {
      currentPlanId: planId,
      startedAt: () => {
        return 'COALESCE(started_at, NOW())';
      },
      status: PROJECT_RUN_STATUS.IN_PROGRESS,
    });
  }

  /**
   * @description Settles an active run STOPPED by `planId`, with the reason it stopped. Returns
   * whether this call won the transition.
   */
  async settleStopped(
    id: string,
    planId: string,
    reason: string,
  ): Promise<boolean> {
    return this.settle(id, PROJECT_RUN_STATUS.STOPPED, {
      currentPlanId: planId,
      stoppedByPlanId: planId,
      stoppedReason: reason,
    });
  }

  /**
   * @description Settles an active run COMPLETED. Returns whether this call won the transition.
   */
  async settleCompleted(id: string): Promise<boolean> {
    return this.settle(id, PROJECT_RUN_STATUS.COMPLETED, {});
  }

  /**
   * @description Settles an active run CANCELLED. Returns whether this call won the transition.
   */
  async settleCancelled(id: string): Promise<boolean> {
    return this.settle(id, PROJECT_RUN_STATUS.CANCELLED, {});
  }

  /**
   * @description Stamps the cancel marker on an active run that has none yet; the advance step
   * acts on it. Returns whether a marker was written (false for a settled run or a repeat request).
   */
  async stampCancelRequested(
    id: string,
    requestedBy: string | null,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(ProjectRun)
      .set({ cancelRequestedAt: new Date(), cancelRequestedBy: requestedBy })
      .where('id = :id', { id })
      .andWhere('status IN (:...activeStatuses)', {
        activeStatuses: [...PROJECT_RUN_ACTIVE_STATUSES],
      })
      .andWhere('cancel_requested_at IS NULL')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private async settle(
    id: string,
    status: ProjectRunTerminalStatus,
    patch: QueryDeepPartialEntity<ProjectRun>,
  ): Promise<boolean> {
    return this.transition(id, { ...patch, settledAt: new Date(), status });
  }

  private async transition(
    id: string,
    patch: QueryDeepPartialEntity<ProjectRun>,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(ProjectRun)
      .set(patch)
      .where('id = :id', { id })
      .andWhere('status IN (:...activeStatuses)', {
        activeStatuses: [...PROJECT_RUN_ACTIVE_STATUSES],
      })
      .execute();

    return (result.affected ?? 0) > 0;
  }
}
