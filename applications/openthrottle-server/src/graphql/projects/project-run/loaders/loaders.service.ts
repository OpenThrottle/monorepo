/**
 * @description Request-scoped DataLoaders for project runs: each project's newest run (behind
 * `Project.latestProjectRun` and `Project.activeProjectRun`) and the plans a run points at (behind
 * `ProjectRun.currentPlan` and `ProjectRun.stoppedByPlan`). A list of N projects costs one query
 * for the runs and one for their plans.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createEntityByIdLoader } from '@openthrottle/nestjs-postgres';
import type {
  Plan,
  ProjectRun,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  ProjectRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class ProjectRunLoaders {
  readonly latestRunByProjectIdLoader: DataLoader<string, ProjectRun | null>;
  readonly planLoader: DataLoader<string, Plan | null>;

  constructor(
    plansRepository: PlansRepository,
    projectRunsRepository: ProjectRunsRepository,
  ) {
    this.planLoader = createEntityByIdLoader(plansRepository);
    this.latestRunByProjectIdLoader = new DataLoader<string, ProjectRun | null>(
      async (projectIds) => {
        const latest =
          await projectRunsRepository.findLatestByProjectIds(projectIds);

        return projectIds.map((projectId) => latest.get(projectId) ?? null);
      },
    );
  }
}
