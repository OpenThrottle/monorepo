import { describe, expect, it, vi } from 'vitest';
import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
  type GetPlanQuery,
  type GetTasksByPlanIdQuery,
} from '../../__generated__/graphql.js';
import type { WorkflowLifecycleDispatcher } from '@openthrottle/openthrottle-agentic-workflow';
import { isRecord } from '@openthrottle/nodejs-utils';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphIterationOnChunk,
  WorkflowRalphIterationRunner,
} from '../../contract/ralph-orchestrator-deps.ts';
import { createWorkflowRalphOrchestrator } from '../orchestrator.ts';

/**
 * Adapts a loosely-typed mock implementation to the generic {@link WorkflowExecuteGraphqlV2}
 * contract without an assertion: the public overload advertises the target type while the
 * implementation signature stays `unknown`-based.
 */
function asExecuteGraphqlV2(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecuteGraphqlV2(impl: unknown): unknown {
  return impl;
}

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
  jobRunHooksJson: '{"hooks":[]}',
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

/** Reads the `{ input: { id?, status } }` payload from a mocked GraphQL call's variables. */
const readUpdateInput = (
  variables: unknown,
): { readonly id?: string; readonly status: string } => {
  if (
    isRecord(variables) &&
    isRecord(variables.input) &&
    typeof variables.input.status === 'string'
  ) {
    const { id, status } = variables.input;

    return { id: typeof id === 'string' ? id : undefined, status };
  }

  throw new Error('unexpected update variables shape');
};

const createMockExecute = (opts: {
  readonly getTasksByPlanId?: () => GetTasksByPlanIdQuery['tasksByPlanId'];
}): WorkflowExecuteGraphqlV2 =>
  asExecuteGraphqlV2(async (document) => {
    if (document === GetServerHealthDocument) {
      return { serverHealth: serverHealthOk };
    }
    if (document === GetPlanDocument) {
      return { plan: basePlan() };
    }
    if (document === GetTasksByPlanIdDocument) {
      return { tasksByPlanId: opts.getTasksByPlanId?.() ?? [] };
    }
    if (document === UpdatePlanDocument) {
      return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
    }
    if (document === UpdateTaskDocument) {
      return { updateTask: baseTask(TASK_A, 'IN_PROGRESS') };
    }
    throw new Error('unmocked GraphQL document in test');
  });

describe('createWorkflowRalphOrchestrator task selection', () => {
  it('picks lowest sortOrder PENDING task when createdAt order differs', async () => {
    const run = vi.fn(async ({ agentPrompt }: { agentPrompt: string }) => {
      expect(agentPrompt).toContain(TASK_B);
      return '<promise>COMPLETE</promise>';
    });
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
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
    });

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

  it('clamps a non-positive iterations ceiling so the agent still runs', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: {
        debug: 'omit',
        iterationMax: 0,
        iterationTimeout: 1000,
        iterations: 0,
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

const baseContext = {
  debug: 'omit' as const,
  iterationMax: 1,
  iterationTimeout: 1000,
  iterations: 1,
  kind: 'ralph' as const,
  mode: 'plan' as const,
  model: 'test-model',
  planId: PLAN_ID,
  project: '',
  prompt: 'Do work',
  runner: 'cursor' as const,
  skipWorktreeSetup: false,
  taskId: '',
  timeout: 1000,
  worktree: undefined,
  worktreeBase: undefined,
};

describe('createWorkflowRalphOrchestrator diagnostics', () => {
  it('emits a structured stderr chunk and fails when the iteration runner throws', async () => {
    const chunks: string[] = [];
    const onChunk: WorkflowRalphIterationOnChunk = (chunk) => {
      chunks.push(chunk.stream === 'stderr' ? chunk.data : '');
    };

    const run = vi.fn(async () => {
      throw new Error('boom from cursor-agent');
    });
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
      onChunk,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'workflow_unhandled',
      status: 'failed',
    });

    const diagnostic = chunks.find((line) =>
      line.includes('[ralph-orchestrator]'),
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic).toContain('runner failed');
    expect(diagnostic).toContain('boom from cursor-agent');
  });

  it('emits a diagnostic when the plan cannot be resolved', async () => {
    const chunks: string[] = [];
    const onChunk: WorkflowRalphIterationOnChunk = (chunk) => {
      chunks.push(chunk.data);
    };

    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: null };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [] };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
      onChunk,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'workflow_unhandled',
      status: 'failed',
    });
    expect(run).not.toHaveBeenCalled();

    const diagnostic = chunks.find((line) =>
      line.includes('[ralph-orchestrator]'),
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic).toContain('plan state load failed');
    expect(diagnostic).toContain(PLAN_ID);
  });

  it('sends the original-cased completion id to UpdateTaskDocument', async () => {
    const UPPER_TASK = 'A64424D1-4BB0-4B08-ADE3-B9822411D05C';
    const run = vi.fn(
      async () =>
        `<ralph:task-complete>${UPPER_TASK}</ralph:task-complete><promise>COMPLETE</promise>`,
    );
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const updateTaskInputs: Array<{ id: string; status: string }> = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(UPPER_TASK, 'PENDING')] };
      }
      if (doc === UpdatePlanDocument) {
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (doc === UpdateTaskDocument) {
        const input = readUpdateInput(variables);
        updateTaskInputs.push({ id: input.id ?? '', status: input.status });
        return { updateTask: baseTask(UPPER_TASK, input.status) };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result.status).toBe('finished');

    const completion = updateTaskInputs.find((i) => i.status === 'COMPLETED');
    expect(completion).toBeDefined();
    expect(completion?.id).toBe(UPPER_TASK);
  });

  it('reconciles the parent plan to COMPLETED in task-centric mode', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    let taskStatus = 'IN_PROGRESS';
    const planUpdates: string[] = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetTaskDocument) {
        return { task: baseTask(TASK_A, taskStatus) };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
      }
      if (doc === UpdatePlanDocument) {
        const input = readUpdateInput(variables);
        planUpdates.push(input.status);
        return { updatePlan: basePlan({ status: input.status }) };
      }
      if (doc === UpdateTaskDocument) {
        const input = readUpdateInput(variables);
        taskStatus = input.status;
        return { updateTask: baseTask(TASK_A, input.status) };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: {
        ...baseContext,
        mode: 'task',
        planId: '',
        taskId: TASK_A,
      },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_tasks_exhausted',
      status: 'finished',
    });
    expect(planUpdates).toContain('COMPLETED');
  });

  it('finishes with workflow_budget_exhausted when the wall-clock budget is spent', async () => {
    const run = vi.fn(async () => '');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    // Per-iteration timeout of 0ms → derived total budget of 0ms → the guard
    // trips before the first agent invocation.
    const result = await orchestrator.execute({
      context: {
        ...baseContext,
        iterationMax: 5,
        iterationTimeout: 0,
        iterations: 5,
        timeout: 0,
      },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_budget_exhausted',
      status: 'finished',
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('does not throw when no onChunk is wired and the runner fails', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom');
    });
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'workflow_unhandled',
      status: 'failed',
    });
  });
});

describe('createWorkflowRalphOrchestrator terminal outcomes', () => {
  it('returns workflow_plan_already_terminal without running the agent when the plan is COMPLETED', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan({ status: 'COMPLETED' }) };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, 'PENDING')] };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_plan_already_terminal',
      status: 'finished',
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns workflow_plan_already_terminal when the plan is SKIPPED', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan({ status: 'SKIPPED' }) };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, 'PENDING')] };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result.reason).toBe('workflow_plan_already_terminal');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns workflow_tasks_exhausted (plan mode) and marks the plan COMPLETED when no task remains', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const planUpdates: string[] = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, 'COMPLETED')] };
      }
      if (doc === UpdatePlanDocument) {
        const input = readUpdateInput(variables);
        planUpdates.push(input.status);
        return { updatePlan: basePlan({ status: input.status }) };
      }
      if (doc === UpdateTaskDocument) {
        return { updateTask: baseTask(TASK_A, 'COMPLETED') };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_tasks_exhausted',
      status: 'finished',
    });
    expect(planUpdates).toContain('COMPLETED');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns workflow_max_iterations and resets the unfinished task to PENDING', async () => {
    // Agent never emits a completion marker, so every iteration runs and the
    // loop exhausts maxIterations. The selected task must be reset to PENDING.
    const run = vi.fn(async () => 'still working, no markers');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    let taskStatus = 'PENDING';
    const taskUpdates: Array<{ id: string; status: string }> = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
      }
      if (doc === UpdatePlanDocument) {
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (doc === UpdateTaskDocument) {
        const input = readUpdateInput(variables);
        taskStatus = input.status;
        taskUpdates.push({ id: input.id ?? '', status: input.status });
        return { updateTask: baseTask(TASK_A, input.status) };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, iterationMax: 2, iterations: 2 },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_max_iterations',
      status: 'finished',
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(taskUpdates.at(-1)).toEqual({ id: TASK_A, status: 'PENDING' });
  });
});

describe('createWorkflowRalphOrchestrator control parsing', () => {
  it('fails with workflow_agent_error when the agent emits ERROR', async () => {
    const run = vi.fn(async () => '<promise>ERROR</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'workflow_agent_error',
      status: 'failed',
    });
  });

  it('fails with workflow_input_required when the agent emits INPUT_REQUIRED', async () => {
    const run = vi.fn(async () => '<promise>INPUT_REQUIRED</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 1,
      reason: 'workflow_input_required',
      status: 'failed',
    });
  });

  it('prefers ERROR over COMPLETE when the agent emits both markers', async () => {
    const run = vi.fn(
      async () => '<promise>COMPLETE</promise><promise>ERROR</promise>',
    );
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result.reason).toBe('workflow_agent_error');
  });
});

describe('createWorkflowRalphOrchestrator abort cancellation', () => {
  it('returns workflow_cancelled before any iteration when already aborted', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const controller = new AbortController();
    controller.abort();

    const result = await orchestrator.execute({
      context: { ...baseContext, abortSignal: controller.signal },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_cancelled',
      status: 'finished',
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns workflow_cancelled when aborted during the iteration run', async () => {
    const controller = new AbortController();
    const run = vi.fn(async () => {
      // Simulate the agent observing a mid-run cancel.
      controller.abort();
      return '<promise>COMPLETE</promise>';
    });
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, abortSignal: controller.signal },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_cancelled',
      status: 'finished',
    });
    // The runner was invoked, but the post-run abort checkpoint short-circuits
    // before the control marker is interpreted.
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('returns workflow_cancelled when the durable cancel marker is set (no abort signal)', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    // Channel 1: the pub/sub signal was missed, but the run loop polls the marker.
    const result = await orchestrator.execute({
      context: {
        ...baseContext,
        isCancellationRequested: () => true,
      },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_cancelled',
      status: 'finished',
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('treats a throwing cancel-marker check as "not cancelled" and keeps running', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: {
        ...baseContext,
        isCancellationRequested: () => {
          throw new Error('marker read failed');
        },
      },
    });

    // A transient marker-read failure must never crash or cancel the run.
    expect(result.reason).not.toBe('workflow_cancelled');
    expect(run).toHaveBeenCalled();
  });
});

describe('createWorkflowRalphOrchestrator lifecycle beforeEach blocking', () => {
  it('marks the task BLOCKED, dispatches afterEach(blocked), and continues to the next iteration', async () => {
    const run = vi.fn(async () => 'no markers');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    let taskStatus = 'PENDING';
    const taskUpdates: string[] = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (doc === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
      }
      if (doc === UpdatePlanDocument) {
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (doc === UpdateTaskDocument) {
        const input = readUpdateInput(variables);
        taskStatus = input.status;
        taskUpdates.push(input.status);
        return { updateTask: baseTask(TASK_A, input.status) };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    const runTask = vi.fn(
      async (params: {
        readonly phase: 'afterEach' | 'beforeEach';
      }): Promise<{ readonly blocked: boolean }> => ({
        blocked: params.phase === 'beforeEach',
      }),
    );
    const lifecycleDispatcher: WorkflowLifecycleDispatcher = {
      runPlan: vi.fn(async () => ({ blocked: false })),
      runTask,
    };

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: {
        ...baseContext,
        iterationMax: 1,
        iterations: 1,
        lifecycleDispatcher,
      },
    });

    // beforeEach blocked → the iteration `continue`s past the agent run, so the
    // loop exhausts and reports max_iterations.
    expect(result.reason).toBe('workflow_max_iterations');
    expect(run).not.toHaveBeenCalled();

    // Task moved PENDING → IN_PROGRESS (pre-hook) → BLOCKED (on block).
    expect(taskUpdates).toContain('IN_PROGRESS');
    expect(taskUpdates).toContain('BLOCKED');

    // beforeEach then afterEach(blocked) were both dispatched.
    expect(runTask).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'beforeEach' }),
    );
    expect(runTask).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'afterEach', taskOutcome: 'blocked' }),
    );
  });
});

describe('createWorkflowRalphOrchestrator X-OT-Session-Id propagation', () => {
  const collectMutationOptions = (
    sink: Array<{ header: string | undefined; status: string }>,
  ): WorkflowExecuteGraphqlV2 =>
    asExecuteGraphqlV2(
      async (
        document,
        variables,
        options?: { headers?: Record<string, string> },
      ) => {
        if (document === GetServerHealthDocument) {
          return { serverHealth: serverHealthOk };
        }
        if (document === GetPlanDocument) {
          return { plan: basePlan() };
        }
        if (document === GetTasksByPlanIdDocument) {
          return { tasksByPlanId: [baseTask(TASK_A, 'PENDING')] };
        }
        if (
          document === UpdatePlanDocument ||
          document === UpdateTaskDocument
        ) {
          const input = readUpdateInput(variables);
          sink.push({
            header: options?.headers?.['X-OT-Session-Id'],
            status: input.status,
          });
          return document === UpdatePlanDocument
            ? { updatePlan: basePlan({ status: input.status }) }
            : { updateTask: baseTask(TASK_A, input.status) };
        }
        throw new Error('unmocked GraphQL document in test');
      },
    );

  it('sends the run session id on every status mutation when workSessionId is set', async () => {
    const mutations: Array<{ header: string | undefined; status: string }> = [];
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: vi.fn(async () => '<promise>COMPLETE</promise>'),
    };

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2: collectMutationOptions(mutations),
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, workSessionId: 'sess-123' },
    });

    expect(result.status).toBe('finished');
    expect(mutations.length).toBeGreaterThan(0);
    // Every plan/task status mutation carried the run session header.
    for (const mutation of mutations) {
      expect(mutation.header).toBe('sess-123');
    }
  });

  it('omits the header (instant-session fallback) when no workSessionId is set', async () => {
    const mutations: Array<{ header: string | undefined; status: string }> = [];
    const iterationRunner: WorkflowRalphIterationRunner = {
      run: vi.fn(async () => '<promise>COMPLETE</promise>'),
    };

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2: collectMutationOptions(mutations),
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext },
    });

    expect(result.status).toBe('finished');
    expect(mutations.length).toBeGreaterThan(0);
    for (const mutation of mutations) {
      expect(mutation.header).toBeUndefined();
    }
  });
});
