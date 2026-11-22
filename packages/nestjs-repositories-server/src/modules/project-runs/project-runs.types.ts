import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ProjectRun } from './project-run.entity.ts';
import type { PROJECT_RUN_STATUS } from './project-runs.constants.ts';
import type { ProjectRunsRepository } from './project-runs.repository.ts';

/**
 * @description A `project_runs.status` value.
 * @public
 */
export type ProjectRunStatus =
  (typeof PROJECT_RUN_STATUS)[keyof typeof PROJECT_RUN_STATUS];

/**
 * @description The terminal statuses a project run settles to.
 * @public
 */
export type ProjectRunTerminalStatus = Exclude<
  ProjectRunStatus,
  'IN_PROGRESS' | 'QUEUED'
>;

/**
 * @description What `ProjectRunsRepository.create` takes: the project and who started it. The
 * run starts QUEUED with no current plan.
 * @public
 */
export interface ProjectRunCreateInput extends Pick<
  CreateModelInput<ProjectRun>,
  'actorUserId' | 'projectId'
> {}

/**
 * @description A {@link ProjectRunsRepository} mock: every inherited `BaseRepository` method plus
 * the project-run reads and guarded transitions.
 * @public
 */
export interface ProjectRunsRepositoryMock extends BaseRepositoryMock<
  ProjectRun,
  ProjectRunCreateInput
> {
  readonly findActive: Mock<ProjectRunsRepository['findActive']>;
  readonly findActiveByProjectId: Mock<
    ProjectRunsRepository['findActiveByProjectId']
  >;
  readonly findLatestByProjectIds: Mock<
    ProjectRunsRepository['findLatestByProjectIds']
  >;
  readonly findRunById: Mock<ProjectRunsRepository['findRunById']>;
  readonly setCurrentPlan: Mock<ProjectRunsRepository['setCurrentPlan']>;
  readonly settleCancelled: Mock<ProjectRunsRepository['settleCancelled']>;
  readonly settleCompleted: Mock<ProjectRunsRepository['settleCompleted']>;
  readonly settleStopped: Mock<ProjectRunsRepository['settleStopped']>;
  readonly stampCancelRequested: Mock<
    ProjectRunsRepository['stampCancelRequested']
  >;
}
