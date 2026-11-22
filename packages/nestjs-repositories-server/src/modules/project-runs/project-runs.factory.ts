/**
 * @description Fishery factory for {@link ProjectRun}. Use in tests to build mock project runs.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ProjectRun } from './project-run.entity.ts';
import { PROJECT_RUN_STATUS } from './project-runs.constants.ts';

/**
 * @description Builds a QUEUED project run with no current plan and no cancel marker by default.
 * Override any field via `.build({ status: 'IN_PROGRESS' })`.
 * @public
 */
export const projectRunsFactory = Factory.define<ProjectRun>(() => {
  const createdAt = faker.date.recent();

  return {
    actorUserId: null,
    cancelRequestedAt: null,
    cancelRequestedBy: null,
    createdAt,
    currentPlanId: null,
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    settledAt: null,
    startedAt: null,
    status: PROJECT_RUN_STATUS.QUEUED,
    stoppedByPlanId: null,
    stoppedReason: null,
    updatedAt: createdAt,
  };
});
