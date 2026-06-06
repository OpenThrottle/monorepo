import { describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
  GetPlanQuery,
  GetTaskQuery,
  GetTasksByPlanIdQuery,
} from '../../__generated__/graphql.js';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  DEFAULT_RALPH_RUNNER,
} from './contract/flow-context.js';
import type { WorkflowRalphContext } from './contract/flow-context.js';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphIterationOnChunk,
  WorkflowRalphIterationRunner,
} from './contract/ralph-orchestrator-deps.js';
import { createWorkflowRalphOrchestrator } from '@openthrottle/openthrottle-agentic-ralph';

const PLAN_ID = '0f9e1a94-8d39-4aa7-ada2-2d107d41ab37';
const TASK_A = 'a64424d1-4bb0-4b08-ade3-b9822411d05c';
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
  // sortOrder: 1000,
  status,
  summary: null,
  title: 'Task',
  updatedAt: ISO,
  ...overrides,
});

const baseRalphContext = (
  overrides: Partial<WorkflowRalphContext> = {},
): WorkflowRalphContext => ({
  debug: 'omit',
  iterationMax: DEFAULT_RALPH_ITERATIONS,
  iterationTimeout: undefined,
  iterations: DEFAULT_RALPH_ITERATIONS,
  kind: 'ralph',
  mode: 'plan',
  model: DEFAULT_RALPH_MODEL,
  planId: PLAN_ID,
  project: '',
  prompt: DEFAULT_RALPH_PROMPT,
  runner: DEFAULT_RALPH_RUNNER,
  skipWorktreeSetup: undefined,
  taskId: '',
  timeout: undefined,
  worktree: undefined,
  worktreeBase: undefined,
  ...overrides,
});

/**
 * @description Routes mock responses by codegen document reference (safe with Promise.all — no call order).
 */
const createMockExecute = (opts: {
  readonly getPlan?: () => GetPlanQuery['plan'];
  readonly getTask?: () => GetTaskQuery['task'];
  readonly getTasksByPlanId?: () => GetTasksByPlanIdQuery['tasksByPlanId'];
  readonly onUnhandled?: () => never;
}): WorkflowExecuteGraphqlV2 => {
  const getPlan = opts.getPlan ?? (() => basePlan());
  const getTask = opts.getTask ?? (() => null);
  const getTasksByPlanId =
    opts.getTasksByPlanId ?? ((): GetTasksByPlanIdQuery['tasksByPlanId'] => []);

  return (async (document) => {
    const doc = document as unknown;
    if (doc === GetServerHealthDocument) {
      return { serverHealth: serverHealthOk };
    }
    if (doc === GetTaskDocument) {
      return { task: getTask() };
    }
    if (doc === GetPlanDocument) {
      return { plan: getPlan() };
    }
    if (doc === GetTasksByPlanIdDocument) {
      return { tasksByPlanId: getTasksByPlanId() };
    }
    if (doc === UpdatePlanDocument) {
      return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
    }
    if (doc === UpdateTaskDocument) {
      return { updateTask: baseTask(TASK_A, 'IN_PROGRESS') };
    }
    opts.onUnhandled?.();
    throw new Error('unmocked GraphQL document in test');
  }) as WorkflowExecuteGraphqlV2;
};

const wrapWorkflowExecute = (
  impl: WorkflowExecuteGraphqlV2,
): MockedFunction<WorkflowExecuteGraphqlV2> =>
  vi.fn(impl) as unknown as MockedFunction<WorkflowExecuteGraphqlV2>;

const noopRunner: WorkflowRalphIterationRunner = {
  run: async () => '',
};

describe('createWorkflowRalphOrchestrator', () => {
  it('returns unhandled when plan and task ids are both empty (after health)', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(createMockExecute({}));
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({ planId: '', taskId: '' }),
    });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'unhandled',
      status: 'failed',
    });
    expect(executeGraphqlV2).toHaveBeenCalledTimes(1);
    expect(executeGraphqlV2.mock.calls[0]![0]).toBe(GetServerHealthDocument);
  });

  it('returns unhandled when GraphQL fails (e.g. health check)', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute((async () => {
      throw new Error('network');
    }) as WorkflowExecuteGraphqlV2);
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'unhandled',
      status: 'failed',
    });
  });

  it('returns unhandled when task lookup returns no task (task-only bootstrap)', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTask: () => null,
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({
        mode: 'task',
        planId: '',
        taskId: TASK_A,
      }),
    });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'unhandled',
      status: 'failed',
    });
  });

  it('returns unhandled when plan is missing after load', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getPlan: () => null,
        getTasksByPlanId: () => [],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'unhandled',
      status: 'failed',
    });
  });

  it('returns plan_already_terminal when plan is COMPLETED before run', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getPlan: () => basePlan({ status: 'COMPLETED' }),
        getTasksByPlanId: () => [],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'plan_already_terminal',
      status: 'finished',
    });
  });

  it('returns tasks_exhausted when no remaining tasks at first iteration', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getPlan: () => basePlan(),
        getTasksByPlanId: () => [baseTask(TASK_A, 'COMPLETED')],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: noopRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'tasks_exhausted',
      status: 'finished',
    });
  });

  it('returns cancelled when abortSignal is aborted before the iteration loop', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const run = vi.fn(async () => 'should not run');
    const iterationRunner: WorkflowRalphIterationRunner = { run };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({ abortSignal: abortController.signal }),
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'cancelled',
      status: 'finished',
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('forwards abortSignal to iterationRunner.run', async () => {
    const abortController = new AbortController();
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    await orchestrator.execute({
      context: baseRalphContext({ abortSignal: abortController.signal }),
    });

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('forwards deps.onChunk to iterationRunner.run', async () => {
    const onChunk: WorkflowRalphIterationOnChunk = vi.fn();
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
      onChunk,
    });

    await orchestrator.execute({
      context: baseRalphContext({ iterations: 3 }),
    });

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ onChunk }));
  });

  it('passes undefined onChunk when deps.onChunk is omitted', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    await orchestrator.execute({
      context: baseRalphContext({ iterations: 3 }),
    });

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ onChunk: undefined }),
    );
  });

  it('returns agent_complete when output contains promise COMPLETE', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => 'done\n<promise>COMPLETE</promise>',
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({ iterations: 3 }),
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'agent_complete',
      status: 'finished',
    });
  });

  it('returns agent_error when output contains promise ERROR', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => '<promise>ERROR</promise>',
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'agent_error',
      status: 'failed',
    });
  });

  it('returns input_required when output contains promise INPUT_REQUIRED', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => '<promise>INPUT_REQUIRED</promise>',
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'input_required',
      status: 'failed',
    });
  });

  it('returns unhandled when iteration runner throws', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => {
        throw new Error('spawn failed');
      },
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: baseRalphContext() });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'unhandled',
      status: 'failed',
    });
  });

  it('returns max_iterations when iterations exhaust without terminal agent signal', async () => {
    let tasks = [baseTask(TASK_A, 'PENDING')];
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTasksByPlanId: () => tasks,
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => {
        tasks = [baseTask(TASK_A, 'IN_PROGRESS')];
        return 'still working';
      },
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({ iterationMax: 2, iterations: 2 }),
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'max_iterations',
      status: 'finished',
    });
  });

  it('resolves plan id from task when only task id is set', async () => {
    const executeGraphqlV2 = wrapWorkflowExecute(
      createMockExecute({
        getTask: () => baseTask(TASK_A, 'QUEUED'),
        getTasksByPlanId: () => [baseTask(TASK_A, 'QUEUED')],
      }),
    );
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => '<promise>COMPLETE</promise>',
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({
        iterations: 1,
        mode: 'task',
        planId: '',
        taskId: TASK_A,
      }),
    });

    expect(result.status).toBe('finished');
    expect(result).toEqual({
      exitCode: 0,
      reason: 'agent_complete',
      status: 'finished',
    });

    const getTaskCalls = executeGraphqlV2.mock.calls.filter(
      (c) => c[0] === GetTaskDocument,
    );
    expect(getTaskCalls.length).toBe(1);
  });

  it('promotes plan when resuming an IN_PROGRESS task while plan is QUEUED', async () => {
    const updatePlanCalls: Array<{ id: string; status: string }> = [];
    const executeGraphqlV2 = wrapWorkflowExecute((async (
      document,
      variables,
    ) => {
      const doc = document as unknown;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan({ status: 'QUEUED' }) };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, 'IN_PROGRESS')] };
      }
      if (doc === UpdatePlanDocument) {
        const input = variables?.input as { id: string; status: string };
        updatePlanCalls.push(input);
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (doc === UpdateTaskDocument) {
        return { updateTask: baseTask(TASK_A, 'IN_PROGRESS') };
      }
      throw new Error('unmocked GraphQL document in test');
    }) as WorkflowExecuteGraphqlV2);
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: async () => '<promise>COMPLETE</promise>',
    };
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: baseRalphContext({ iterations: 1 }),
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'agent_complete',
      status: 'finished',
    });
    expect(
      updatePlanCalls.filter((c) => c.status === 'IN_PROGRESS').length,
    ).toBeGreaterThanOrEqual(2);
    expect(updatePlanCalls[0]).toEqual({
      id: PLAN_ID,
      status: 'IN_PROGRESS',
    });
  });
});
