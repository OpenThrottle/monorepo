/**
 * @description Fishery factory for {@link PlanRun}. Use in tests to build mock plan run rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { PlanRun } from './plan-run.entity.ts';
import { PLAN_RUN_STATUS } from './plan-runs.constants.ts';

/**
 * @description Builds a QUEUED queued-run row (a BullMQ job id, no location, no cancel marker,
 * no snapshot) by default. Override any field via `.build({ status: 'IN_PROGRESS' })`.
 * @public
 */
export const planRunsFactory = Factory.define<PlanRun>(() => {
  const createdAt = faker.date.recent();

  return {
    actorUserId: null,
    branch: null,
    bullmqJobId: faker.string.alphanumeric(10),
    cancelRequestedAt: null,
    cancelRequestedBy: null,
    checkoutId: null,
    createdAt,
    executionBackend: 'claude',
    heartbeatExpected: true,
    hostname: null,
    id: faker.string.uuid(),
    lastHeartbeatAt: null,
    model: null,
    pid: null,
    planId: faker.string.uuid(),
    projectRunId: null,
    queueName: 'plans',
    resumeOfRunId: null,
    runConfigSnapshot: null,
    runKind: 'orchestrator',
    scheduledFor: null,
    settledReason: null,
    status: PLAN_RUN_STATUS.QUEUED,
    updatedAt: createdAt,
    usageLimitResetsAt: null,
    usageLimitType: null,
    workerId: null,
  };
});
