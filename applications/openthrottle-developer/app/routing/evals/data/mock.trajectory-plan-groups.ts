import type {
  AgentTrajectoryPlanGroupItemRowFragment,
  AgentTrajectoryPlanGroupPageRowFragment,
  AgentTrajectoryPlanGroupRowFragment,
} from '~/__generated__/graphql';

export const MOCK_PLAN_GROUP_TASK_ITEM: AgentTrajectoryPlanGroupItemRowFragment =
  {
    cachedTokens: 0,
    costUsd: 0.4123,
    durationMs: 61_000,
    id: 'trajectory-task-1',
    inputTokens: 12_000,
    outputTokens: 800,
    planRunId: 'run-1',
    recordedAt: '2026-11-20T10:00:00.000Z',
    source: 'spawned',
    taskId: 'task-1',
    taskTitle: 'Alpha task one',
    truncated: false,
    verdict: 'pass',
  };

export const MOCK_PLAN_GROUP_PLAN_ITEM: AgentTrajectoryPlanGroupItemRowFragment =
  {
    cachedTokens: null,
    costUsd: null,
    durationMs: 9_000,
    id: 'trajectory-plan-1',
    inputTokens: 3_000,
    outputTokens: 200,
    planRunId: 'run-1',
    recordedAt: '2026-11-21T10:00:00.000Z',
    source: 'session_upload',
    taskId: null,
    taskTitle: null,
    truncated: true,
    verdict: null,
  };

export const MOCK_PLAN_GROUP: AgentTrajectoryPlanGroupRowFragment = {
  failCount: 0,
  labelledCount: 1,
  latestRecordedAt: '2026-11-21T10:00:00.000Z',
  passCount: 1,
  planId: 'plan-1',
  planStatus: 'COMPLETED',
  planTitle: 'Seed plan Alpha',
  scoredCount: 1,
  trajectories: [MOCK_PLAN_GROUP_PLAN_ITEM, MOCK_PLAN_GROUP_TASK_ITEM],
  trajectoryCount: 3,
};

export const MOCK_UNKNOWN_PLAN_GROUP: AgentTrajectoryPlanGroupRowFragment = {
  failCount: 0,
  labelledCount: 0,
  latestRecordedAt: '2026-11-15T10:00:00.000Z',
  passCount: 0,
  planId: null,
  planStatus: null,
  planTitle: null,
  scoredCount: 0,
  trajectories: [{ ...MOCK_PLAN_GROUP_PLAN_ITEM, id: 'trajectory-gone-1' }],
  trajectoryCount: 1,
};

export const MOCK_PLAN_GROUP_PAGE: AgentTrajectoryPlanGroupPageRowFragment = {
  endCursor: 'cursor-1',
  groups: [MOCK_PLAN_GROUP, MOCK_UNKNOWN_PLAN_GROUP],
  hasNextPage: true,
};
