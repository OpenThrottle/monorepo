import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { WorkArtifact } from './work-artifact.entity.ts';
import type {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
} from './work-artifacts.constants.ts';
import type { WorkArtifactsRepository } from './work-artifacts.repository.ts';

/**
 * @description One of the artifact verification states.
 * @public
 */
export type WorkArtifactVerification =
  (typeof WORK_ARTIFACT_VERIFICATION)[keyof typeof WORK_ARTIFACT_VERIFICATION];

/**
 * @description One of the writers an artifact can come from.
 * @public
 */
export type WorkArtifactSource =
  (typeof WORK_ARTIFACT_SOURCE)[keyof typeof WORK_ARTIFACT_SOURCE];

/**
 * @description One plan's git-work completeness, as
 * {@link WorkArtifactsRepository.listPlanCompleteness} returns it.
 * @public
 */
export interface WorkLedgerPlanCompletenessRow {
  readonly artifactCount: number;
  readonly planId: string;
  readonly planStatus: string;
  readonly planTitle: string;
  readonly recorded: boolean;
}

/**
 * @description A {@link WorkArtifactsRepository} mock: every inherited `BaseRepository`
 * method plus the work-artifacts ones.
 * @public
 */
export interface WorkArtifactsRepositoryMock extends BaseRepositoryMock<
  WorkArtifact,
  CreateModelInput<WorkArtifact>
> {
  readonly listPlanCompleteness: Mock<
    WorkArtifactsRepository['listPlanCompleteness']
  >;
}
