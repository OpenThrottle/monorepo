import { describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
  type GetPlanQuery,
  type GetTasksByPlanIdQuery,
} from '../../__generated__/graphql.js';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphIterationRunner,
} from '../../contract/ralph-orchestrator-deps.js';
import { createWorkflowRalphOrchestrator } from '../orchestrator.js';

const PLAN_ID = '0f9e1a94-8d39-4aa7-ada2-2d107d41ab37';
const TASK_A = 'a64424d1-4bb0-4b08-ade3-b9822411d05c';
const TASK_B = 'b64424d1-4bb0-4b08-ade3-b9822411d05c';
const ISO = '2026-04-01T12:00:00.000Z';

type PlanRow = NonNullable<GetPlanQuery['plan']>;
type TaskRow = GetTasksByPlanIdQuery['tasksByPlanId'][number];

const serverHealthOk = {
  __typename: 'ServerHealthObject' as const,
  api: 'ok',
  database: 'ok',
  redis: 'ok',
  websocket: 'ok',
};

const basePlan = (overrides: Partial<PlanRow> = {}): PlanRow => ({
  __typename: 'PlanObject',
  assignee: null,
  author: 'tester',
  category: 'test',
  createdAt: ISO,
  description: null,
  id: PLAN_ID,
  project: null,
  projectId: null,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: ISO,
  ...overrides,
});

const baseTask = (
  id: string,
  status: string,
  overrides: Partial<TaskRow> = {},
): TaskRow => ({
  __typename: 'TaskObject',
  assignee: null,
  category: null,
  createdAt: ISO,
  description: null,
  id,
  planId: PLAN_ID,
  project: null,
  projectId: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status,
  summary: null,
  title: 'Task',
  updatedAt: ISO,
  ...overrides,
});

const createMockExecute = (opts: {
  readonly getTasksByPlanId?: () => GetTasksByPlanIdQuery['tasksByPlanId'];
}): WorkflowExecuteGraphqlV2 =>
  (async (document) => {
    const doc = document as unknown;
    if (doc === GetServerHealthDocument) {
      return { serverHealth: serverHealthOk };
    }
    if (doc === GetPlanDocument) {
      return { plan: basePlan() };
    }
    if (doc === GetTasksByPlanIdDocument) {
      return { tasksByPlanId: opts.getTasksByPlanId?.() ?? [] };
    }
    if (doc === UpdatePlanDocument) {
      return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
    }
    if (doc === UpdateTaskDocument) {
      return { updateTask: baseTask(TASK_A, 'IN_PROGRESS') };
    }
    throw new Error('unmocked GraphQL document in test');
  }) as WorkflowExecuteGraphqlV2;

describe('createWorkflowRalphOrchestrator task selection', () => {
  it('picks lowest sortOrder PENDING task when createdAt order differs', async () => {
    const run = vi.fn(async ({ agentPrompt }: { agentPrompt: string }) => {
      expect(agentPrompt).toContain(TASK_B);
      return '<promise>COMPLETE</promise>';
    });
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = vi.fn(
      createMockExecute({
        getTasksByPlanId: () => [
          baseTask(TASK_B, 'PENDING', {
            createdAt: '2026-01-02T00:00:00.000Z',
            sortOrder: 1000,
          }),
          baseTask(TASK_A, 'PENDING', {
            createdAt: '2026-01-01T00:00:00.000Z',
            sortOrder: 2000,
          }),
        ],
      }),
    ) as MockedFunction<WorkflowExecuteGraphqlV2>;

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: {
        debug: 'omit',
        iterationMax: 1,
        iterationTimeout: 1000,
        iterations: 1,
        kind: 'ralph',
        mode: 'plan',
        model: 'test-model',
        planId: PLAN_ID,
        project: '',
        prompt: 'Do work',
        runner: 'cursor',
        skipWorktreeSetup: false,
        taskId: '',
        timeout: 1000,
        worktree: undefined,
        worktreeBase: undefined,
      },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_complete',
      status: 'finished',
    });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
