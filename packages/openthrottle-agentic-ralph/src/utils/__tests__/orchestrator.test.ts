import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';
import type { WorkflowLifecycleDispatcher } from '@openthrottle/openthrottle-agentic-workflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  type GetPlanQuery,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  type GetTasksByPlanIdQuery,
  RecordAgentTrajectoryDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandRunner,
  WorkflowRalphIterationOnChunk,
  WorkflowRalphIterationRunner,
  WorkflowRalphIterationRunParams,
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

const basePlan = (overrides: Partial<PlanRow> = {}): PlanRow => {
  return {
    __typename: 'PlanObject',
    assignee: null,
    author: 'tester',
    category: 'test',
    completedAt: null,
    createdAt: ISO,
    description: null,
    id: PLAN_ID,
    jobRunHooksJson: '{"hooks":[]}',
    project: null,
    projectId: null,
    runConfigJson: '{}',
    status: 'IN_PROGRESS',
    summary: null,
    tags: [],
    title: 'Test plan',
    updatedAt: ISO,
    ...overrides,
  };
};

const baseTask = (
  id: string,
  status: string,
  overrides: Partial<TaskRow> = {},
): TaskRow => {
  return {
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
  };
};

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
  readonly onRecordTrajectory?: (variables: unknown) => void;
}): WorkflowExecuteGraphqlV2 => {
  return asExecuteGraphqlV2(async (document, variables) => {
    if (document === RecordAgentTrajectoryDocument) {
      opts.onRecordTrajectory?.(variables);

      return { recordAgentTrajectory: { id: 'trajectory-1' } };
    }
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
};

const FINAL_ITERATION_FLAG = 'OT_FINAL_ITERATION=1';

const runOnceCapturingPrompt = async (params: {
  readonly mode: 'plan' | 'task';
  readonly taskId: string;
  readonly tasks: GetTasksByPlanIdQuery['tasksByPlanId'];
}): Promise<string> => {
  const prompts: string[] = [];
  const run = vi.fn(async ({ agentPrompt }: { agentPrompt: string }) => {
    prompts.push(agentPrompt);
    return 'no control marker';
  });
  const orchestrator = createWorkflowRalphOrchestrator({
    executeGraphqlV2: createMockExecute({
      getTasksByPlanId: () => params.tasks,
    }),
    iterationRunner: { run },
  });

  await orchestrator.execute({
    context: {
      debug: 'omit',
      iterationMax: 1,
      iterationTimeout: 1000,
      iterations: 1,
      kind: 'ralph',
      mode: params.mode,
      model: 'test-model',
      planId: PLAN_ID,
      project: '',
      prompt: 'Do work',
      runner: 'cursor',
      skipWorktreeSetup: false,
      taskId: params.taskId,
      timeout: 1000,
      worktree: undefined,
      worktreeBase: undefined,
    },
  });

  return prompts[0] ?? '';
};

describe('createWorkflowRalphOrchestrator final-iteration prompt line', () => {
  it('omits the flag while another runnable task remains (plan mode)', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'plan',
      taskId: '',
      tasks: [
        baseTask(TASK_A, 'QUEUED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'QUEUED', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).toContain(TASK_A);
    expect(prompt).not.toContain(FINAL_ITERATION_FLAG);
  });

  it('adds the flag and the draft-only instruction on the last runnable task (plan mode)', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'plan',
      taskId: '',
      tasks: [
        baseTask(TASK_A, 'COMPLETED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'QUEUED', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).toContain(FINAL_ITERATION_FLAG);
    expect(prompt).toContain('/github-pull-request in draft-only mode');
  });

  it('adds the flag in task mode when the target task is the only runnable one', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'task',
      taskId: TASK_B,
      tasks: [
        baseTask(TASK_A, 'COMPLETED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).toContain(FINAL_ITERATION_FLAG);
  });

  it('omits the flag in task mode when other runnable tasks remain', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'task',
      taskId: TASK_A,
      tasks: [
        baseTask(TASK_A, 'PENDING', { sortOrder: 1000 }),
        baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).not.toContain(FINAL_ITERATION_FLAG);
  });
});

describe('createWorkflowRalphOrchestrator PR draft dir', () => {
  interface CapturedIteration {
    readonly env: Readonly<Record<string, string>> | undefined;
    readonly prompt: string;
  }

  let repoRoot = '';

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), 'ot-orchestrator-draft-'));
  });

  afterEach(async () => {
    await rm(repoRoot, { force: true, recursive: true });
  });

  const topLevelRunner = (): WorkflowRalphCommandRunner => {
    return vi.fn<WorkflowRalphCommandRunner>(async ({ args }) => {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
        return { exitCode: 0, stderr: '', stdout: `${repoRoot}\n` };
      }
      return { exitCode: 1, stderr: 'unexpected', stdout: '' };
    });
  };

  const runCapturing = async (
    runCommand: WorkflowRalphCommandRunner | undefined,
  ): Promise<CapturedIteration | undefined> => {
    const iterations: CapturedIteration[] = [];
    const run = vi.fn<WorkflowRalphIterationRunner['run']>(
      async ({ agentPrompt, env }) => {
        iterations.push({ env, prompt: agentPrompt });
        return 'no control marker';
      },
    );
    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2: createMockExecute({
        getTasksByPlanId: () => [baseTask(TASK_A, 'QUEUED')],
      }),
      iterationRunner: { run },
      ...(runCommand === undefined ? {} : { runCommand }),
    });

    await orchestrator.execute({
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

    return iterations[0];
  };

  it('sets OT_PR_DRAFT_DIR to <worktree root>/.ot-pr-draft when the host finalizes', async () => {
    const captured = await runCapturing(topLevelRunner());

    expect(captured?.env).toEqual({
      OT_PR_DRAFT_DIR: join(repoRoot, '.ot-pr-draft'),
    });
  });

  it('never resolves the draft dir under .git', async () => {
    const captured = await runCapturing(topLevelRunner());

    expect(captured?.env?.OT_PR_DRAFT_DIR).not.toContain(`${'/'}.git${'/'}`);
  });

  it('creates the draft dir with a self-ignoring .gitignore before the agent runs', async () => {
    await runCapturing(topLevelRunner());

    expect(
      await readFile(join(repoRoot, '.ot-pr-draft', '.gitignore'), 'utf8'),
    ).toBe('*\n');
  });

  it('writes the absolute draft path into the final-iteration prompt line', async () => {
    const captured = await runCapturing(topLevelRunner());

    expect(captured?.prompt).toContain(FINAL_ITERATION_FLAG);
    expect(captured?.prompt).toContain(
      `draft directory: ${join(repoRoot, '.ot-pr-draft')}`,
    );
  });

  it('passes no env when finalize is not wired', async () => {
    const captured = await runCapturing(undefined);

    expect(captured?.env).toBeUndefined();
    expect(captured?.prompt).toContain('$OT_PR_DRAFT_DIR when set');
  });
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

  it('passes the context effort to the iteration runner alongside the model', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    await orchestrator.execute({
      context: {
        debug: 'omit',
        effort: 'extraHigh',
        iterationMax: 1,
        iterationTimeout: 1000,
        iterations: 1,
        kind: 'ralph',
        mode: 'plan',
        model: 'test-model',
        planId: PLAN_ID,
        project: '',
        prompt: 'Do work',
        runner: 'claude',
        skipWorktreeSetup: false,
        taskId: '',
        timeout: 1000,
        worktree: undefined,
        worktreeBase: undefined,
      },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ effort: 'extraHigh', model: 'test-model' }),
    );
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

  it('returns workflow_plan_already_terminal when the plan is PROMOTED', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      const doc = document;
      if (doc === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (doc === GetPlanDocument) {
        return { plan: basePlan({ status: 'PROMOTED' }) };
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

  it('stops with workflow_usage_limited when an iteration hits a usage limit, resetting the task and burning no more iterations', async () => {
    const usageLimit = {
      rateLimitType: 'five_hour',
      resetsAt: '2026-04-01T17:00:00.000Z',
    };
    // The limited run's "output" even contains a completion marker; it must NOT be parsed.
    const run = vi.fn(
      async (params: {
        readonly onUsageLimit?: (limit: typeof usageLimit) => void;
      }) => {
        params.onUsageLimit?.(usageLimit);

        return `limit reached <ralph:task-complete>${TASK_A}</ralph:task-complete>`;
      },
    );
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    let taskStatus = 'PENDING';
    const taskUpdates: Array<{ id: string; status: string }> = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (document === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (document === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
      }
      if (document === UpdatePlanDocument) {
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (document === UpdateTaskDocument) {
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
      context: { ...baseContext, iterationMax: 5, iterations: 5 },
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_usage_limited',
      status: 'finished',
      usageLimit,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(taskUpdates.at(-1)).toEqual({ id: TASK_A, status: 'PENDING' });
    expect(taskUpdates.some((u) => u.status === 'COMPLETED')).toBe(false);
  });

  it('prefers workflow_cancelled over a usage limit when the run was cancelled', async () => {
    let cancelled = false;
    const run = vi.fn(
      async (params: {
        readonly onUsageLimit?: (limit: {
          rateLimitType: string | null;
          resetsAt: string | null;
        }) => void;
      }) => {
        cancelled = true;
        params.onUsageLimit?.({ rateLimitType: null, resetsAt: null });

        return 'limited';
      },
    );
    const iterationRunner: WorkflowRalphIterationRunner = { run };
    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
    });

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, isCancellationRequested: () => cancelled },
    });

    expect(result.reason).toBe('workflow_cancelled');
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

  describe('a failure marker never strands the task or plan IN_PROGRESS', () => {
    const runWith = async (
      output: string,
      mode: 'plan' | 'task' = 'plan',
    ): Promise<{
      readonly planUpdates: readonly string[];
      readonly result: Awaited<
        ReturnType<
          ReturnType<typeof createWorkflowRalphOrchestrator>['execute']
        >
      >;
      readonly taskUpdates: ReadonlyArray<{ id: string; status: string }>;
    }> => {
      let taskStatus = 'PENDING';
      const planUpdates: string[] = [];
      const taskUpdates: Array<{ id: string; status: string }> = [];
      const executeGraphqlV2 = asExecuteGraphqlV2(
        async (document, variables) => {
          if (document === GetServerHealthDocument) {
            return { serverHealth: serverHealthOk };
          }
          if (document === GetPlanDocument) {
            return { plan: basePlan() };
          }
          if (document === GetTaskDocument) {
            return { task: baseTask(TASK_A, taskStatus) };
          }
          if (document === GetTasksByPlanIdDocument) {
            return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
          }
          if (document === UpdatePlanDocument) {
            const input = readUpdateInput(variables);
            planUpdates.push(input.status);
            return { updatePlan: basePlan({ status: input.status }) };
          }
          if (document === UpdateTaskDocument) {
            const input = readUpdateInput(variables);
            taskStatus = input.status;
            taskUpdates.push({ id: input.id ?? '', status: input.status });
            return { updateTask: baseTask(TASK_A, input.status) };
          }
          if (document === AppendPlanOutputDocument) {
            return { appendPlanOutput: null };
          }
          throw new Error('unmocked GraphQL document in test');
        },
      );
      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run: vi.fn(async () => output) },
      });
      const taskContext = {
        ...baseContext,
        mode: 'task' as const,
        taskId: TASK_A,
      };
      const isTaskMode = mode === 'task';
      const context = isTaskMode ? taskContext : { ...baseContext };
      const result = await orchestrator.execute({ context });

      return { planUpdates, result, taskUpdates };
    };

    it('ERROR resets the task to PENDING and settles the plan BLOCKED', async () => {
      const { planUpdates, result, taskUpdates } = await runWith(
        '<promise>ERROR</promise>',
      );

      expect(result.reason).toBe('workflow_agent_error');
      expect(taskUpdates).toEqual([
        { id: TASK_A, status: 'IN_PROGRESS' },
        { id: TASK_A, status: 'PENDING' },
      ]);
      expect(planUpdates.at(-1)).toBe('BLOCKED');
    });

    it('ERROR leaves a task the same iteration completed COMPLETED', async () => {
      const { planUpdates, result, taskUpdates } = await runWith(
        `<ralph:task-complete>${TASK_A}</ralph:task-complete><promise>ERROR</promise>`,
      );

      expect(result.reason).toBe('workflow_agent_error');
      expect(taskUpdates.at(-1)).toEqual({ id: TASK_A, status: 'COMPLETED' });
      // Nothing is left, so the plan closes rather than blocking.
      expect(planUpdates.at(-1)).toBe('COMPLETED');
    });

    it('INPUT_REQUIRED blocks the task and settles the plan BLOCKED', async () => {
      const { planUpdates, result, taskUpdates } = await runWith(
        '<promise>INPUT_REQUIRED</promise>',
      );

      expect(result.reason).toBe('workflow_input_required');
      expect(taskUpdates.at(-1)).toEqual({ id: TASK_A, status: 'BLOCKED' });
      expect(planUpdates.at(-1)).toBe('BLOCKED');
    });

    it('a task-centric ERROR resets its task and leaves the plan alone', async () => {
      const { planUpdates, result, taskUpdates } = await runWith(
        '<promise>ERROR</promise>',
        'task',
      );

      expect(result.reason).toBe('workflow_agent_error');
      expect(taskUpdates.at(-1)).toEqual({ id: TASK_A, status: 'PENDING' });
      expect(planUpdates).not.toContain('BLOCKED');
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

  it('finishes with workflow_complete_handoff_owed when INPUT_REQUIRED arrives with every task COMPLETED', async () => {
    const run = vi.fn(
      async () =>
        `<ralph:task-complete>${TASK_A}</ralph:task-complete><promise>INPUT_REQUIRED</promise>`,
    );
    const iterationRunner: WorkflowRalphIterationRunner = { run };

    let taskStatus = 'PENDING';
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (document === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (document === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [baseTask(TASK_A, taskStatus)] };
      }
      if (document === UpdatePlanDocument) {
        return { updatePlan: basePlan({ status: 'IN_PROGRESS' }) };
      }
      if (document === UpdateTaskDocument) {
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

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_complete_handoff_owed',
      status: 'finished',
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
  ): WorkflowExecuteGraphqlV2 => {
    return asExecuteGraphqlV2(
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
  };

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

describe('run transcript capture', () => {
  const PLAN_RUN_ID = 'c1d2e3f4-0000-4000-8000-000000000001';
  const record = {
    durationMs: 1200,
    exitCode: 0,
    outcome: 'succeeded',
    trajectory: {
      agent: { name: 'cursor', version: '1.0.0' },
      schema_version: 'ATIF-v1.8',
      steps: [],
    },
    trajectoryJson: '{"schema_version":"ATIF-v1.8"}',
    truncated: false,
  };

  const runOnce = async (planRunId: string | undefined) => {
    const recorded: unknown[] = [];
    const executeGraphqlV2 = createMockExecute({
      getTasksByPlanId: () => [baseTask(TASK_A, 'PENDING')],
      onRecordTrajectory: (variables) => recorded.push(variables),
    });
    const run = vi.fn(
      async (_params: WorkflowRalphIterationRunParams): Promise<string> => {
        return '<promise>COMPLETE</promise>';
      },
    );

    await createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
    }).execute({
      context: {
        ...baseContext,
        ...(planRunId === undefined ? {} : { planRunId }),
      },
    });

    return { params: run.mock.calls[0]?.[0], recorded };
  };

  describe('when the host resolved a plan run', () => {
    it('hands the runner a capture callback and the run facts', async () => {
      const { params } = await runOnce(PLAN_RUN_ID);

      expect(params).toMatchObject({
        onTrajectory: expect.any(Function),
        trajectoryFacts: {
          planId: PLAN_ID,
          planRunId: PLAN_RUN_ID,
          taskId: TASK_A,
        },
      });
    });

    it('records the transcript against the run and the task', async () => {
      const { params, recorded } = await runOnce(PLAN_RUN_ID);

      await params?.onTrajectory?.(record);

      expect(recorded).toEqual([
        {
          input: {
            driver: 'cursor',
            durationMs: 1200,
            exitCode: 0,
            idempotencyKey: `spawned:${PLAN_RUN_ID}:1`,
            model: 'test-model',
            outcome: 'succeeded',
            planRunId: PLAN_RUN_ID,
            source: 'spawned',
            taskId: TASK_A,
            trajectoryJson: record.trajectoryJson,
          },
        },
      ]);
    });
  });

  describe('when the host resolved no plan run', () => {
    it('captures nothing', async () => {
      const { params } = await runOnce(undefined);

      expect(params).not.toHaveProperty('onTrajectory');
    });
  });
});

describe('createWorkflowRalphOrchestrator blocked-only plans', () => {
  const TASK_C = 'c64424d1-4bb0-4b08-ade3-b9822411d05c';

  /**
   * Fake GraphQL with mutable task state: records plan status writes and plan-output chunks, and
   * applies task status updates so re-reads see them.
   */
  const createStatefulExecute = (initial: readonly TaskRow[]) => {
    const tasks = new Map(initial.map((task) => [task.id, task]));
    const planUpdates: string[] = [];
    const planOutput: string[] = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === GetServerHealthDocument) {
        return { serverHealth: serverHealthOk };
      }
      if (document === GetPlanDocument) {
        return { plan: basePlan() };
      }
      if (document === GetTasksByPlanIdDocument) {
        return { tasksByPlanId: [...tasks.values()] };
      }
      if (document === UpdatePlanDocument) {
        const input = readUpdateInput(variables);
        planUpdates.push(input.status);
        return { updatePlan: basePlan({ status: input.status }) };
      }
      if (document === UpdateTaskDocument) {
        const input = readUpdateInput(variables);
        const current =
          input.id === undefined ? undefined : tasks.get(input.id);
        if (current !== undefined) {
          tasks.set(current.id, { ...current, status: input.status });
        }
        return { updateTask: baseTask(input.id ?? TASK_A, input.status) };
      }
      if (document === AppendPlanOutputDocument) {
        if (
          isRecord(variables) &&
          isRecord(variables.input) &&
          typeof variables.input.content === 'string'
        ) {
          planOutput.push(variables.input.content);
        }
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unmocked GraphQL document in test');
    });

    return { executeGraphqlV2, planOutput, planUpdates };
  };

  let repoRoot = '';

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), 'ot-orchestrator-blocked-'));
  });

  afterEach(async () => {
    await rm(repoRoot, { force: true, recursive: true });
  });

  /** git stub for the finalize step: a branch with zero commits ahead, so no push/PR. */
  const createZeroAheadRunner = () => {
    return vi.fn<WorkflowRalphCommandRunner>(async ({ args }) => {
      const [sub, first] = args;
      if (sub === 'rev-parse' && first === '--show-toplevel') {
        return { exitCode: 0, stderr: '', stdout: `${repoRoot}\n` };
      }
      if (sub === 'rev-parse' && first === '--abbrev-ref') {
        return { exitCode: 0, stderr: '', stdout: 'openthrottle/plan-x\n' };
      }
      if (sub === 'rev-list') {
        return { exitCode: 0, stderr: '', stdout: '0\n' };
      }
      return { exitCode: 1, stderr: '', stdout: '' };
    });
  };

  it('[COMPLETED, COMPLETED, BLOCKED] ends BLOCKED and finalizes without running the agent', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const { executeGraphqlV2, planOutput, planUpdates } = createStatefulExecute(
      [
        baseTask(TASK_A, 'COMPLETED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'COMPLETED', { sortOrder: 2000 }),
        baseTask(TASK_C, 'BLOCKED', { sortOrder: 3000, title: 'Visual pass' }),
      ],
    );
    const runCommand = createZeroAheadRunner();

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
      runCommand,
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, iterations: 5 },
    });

    expect(run).not.toHaveBeenCalled();
    expect(planUpdates).toContain('BLOCKED');
    expect(planUpdates).not.toContain('COMPLETED');
    expect(planOutput.join('\n')).toContain('"Visual pass"');
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['rev-list', '--count']),
      }),
    );
    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_tasks_blocked',
      status: 'finished',
    });
  });

  it('ends BLOCKED once the last workable task completes, spending no further iteration', async () => {
    // A completion marker without <promise>COMPLETE</promise>, so the loop reaches the next task load.
    const run = vi.fn(
      async () => `<ralph:task-complete>${TASK_B}</ralph:task-complete>`,
    );
    const { executeGraphqlV2, planUpdates } = createStatefulExecute([
      baseTask(TASK_A, 'BLOCKED', { sortOrder: 1000 }),
      baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
    ]);

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, iterations: 5 },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(planUpdates.at(-1)).toBe('BLOCKED');
    expect(result).toMatchObject({ reason: 'workflow_tasks_blocked' });
  });

  it('[BLOCKED, PENDING] gives the PENDING task the final-iteration line (plan mode)', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'plan',
      taskId: '',
      tasks: [
        baseTask(TASK_A, 'BLOCKED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).toContain(`Current task for this iteration: ${TASK_B}`);
    expect(prompt).toContain(FINAL_ITERATION_FLAG);
  });

  it('gives the target task the final-iteration line when its only sibling is BLOCKED (task mode)', async () => {
    const prompt = await runOnceCapturingPrompt({
      mode: 'task',
      taskId: TASK_B,
      tasks: [
        baseTask(TASK_A, 'BLOCKED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
      ],
    });

    expect(prompt).toContain(FINAL_ITERATION_FLAG);
  });

  it('[COMPLETED] still ends COMPLETED with workflow_tasks_exhausted', async () => {
    const run = vi.fn(async () => '');
    const { executeGraphqlV2, planUpdates } = createStatefulExecute([
      baseTask(TASK_A, 'COMPLETED'),
    ]);

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
    });

    const result = await orchestrator.execute({ context: { ...baseContext } });

    expect(run).not.toHaveBeenCalled();
    expect(planUpdates).toContain('COMPLETED');
    expect(planUpdates).not.toContain('BLOCKED');
    expect(result).toMatchObject({ reason: 'workflow_tasks_exhausted' });
  });

  it('reconciles the parent plan to BLOCKED in task mode when only a BLOCKED sibling remains', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');
    const { executeGraphqlV2, planOutput, planUpdates } = createStatefulExecute(
      [
        baseTask(TASK_A, 'IN_PROGRESS', { sortOrder: 1000 }),
        baseTask(TASK_B, 'BLOCKED', { sortOrder: 2000, title: 'Visual pass' }),
      ],
    );

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
    });

    const result = await orchestrator.execute({
      context: { ...baseContext, mode: 'task', taskId: TASK_A },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(planUpdates.at(-1)).toBe('BLOCKED');
    expect(planUpdates).not.toContain('COMPLETED');
    expect(planOutput.join('\n')).toContain('"Visual pass"');
    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_tasks_blocked',
      status: 'finished',
    });
  });

  describe('when the run hits its iteration or budget limit', () => {
    it('ends BLOCKED with pending work, hands the task back, and finalizes', async () => {
      const run = vi.fn(async () => 'still working, no markers');
      const { executeGraphqlV2, planOutput, planUpdates } =
        createStatefulExecute([
          baseTask(TASK_A, 'PENDING', { sortOrder: 1000 }),
          baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
          baseTask(TASK_C, 'BLOCKED', { sortOrder: 3000 }),
        ]);
      const runCommand = createZeroAheadRunner();

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
        runCommand,
      });

      const result = await orchestrator.execute({
        context: { ...baseContext, iterationMax: 2, iterations: 2 },
      });

      expect(run).toHaveBeenCalledTimes(2);
      expect(planUpdates.at(-1)).toBe('BLOCKED');
      expect(planOutput.join('\n')).toContain(
        'Iteration limit reached (2/2); 2 task(s) still pending, 1 blocked. Re-run to continue.',
      );
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['rev-list', '--count']),
        }),
      );
      expect(result).toEqual({
        exitCode: 0,
        reason: 'workflow_max_iterations',
        status: 'finished',
      });
    });

    it('ends COMPLETED when the last iteration finished every task', async () => {
      const run = vi.fn(
        async () => `<ralph:task-complete>${TASK_A}</ralph:task-complete>`,
      );
      const { executeGraphqlV2, planUpdates } = createStatefulExecute([
        baseTask(TASK_A, 'PENDING'),
      ]);
      const runCommand = createZeroAheadRunner();

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
        runCommand,
      });

      const result = await orchestrator.execute({
        context: { ...baseContext, iterationMax: 1, iterations: 1 },
      });

      expect(run).toHaveBeenCalledTimes(1);
      expect(planUpdates.at(-1)).toBe('COMPLETED');
      expect(planUpdates).not.toContain('BLOCKED');
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['rev-list', '--count']),
        }),
      );
      expect(result).toMatchObject({ reason: 'workflow_tasks_exhausted' });
    });

    it('ends BLOCKED and finalizes when the wall-clock budget is spent', async () => {
      const run = vi.fn(async () => '');
      const { executeGraphqlV2, planOutput, planUpdates } =
        createStatefulExecute([baseTask(TASK_A, 'PENDING')]);
      const runCommand = createZeroAheadRunner();

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
        runCommand,
      });

      // A 0ms per-iteration timeout derives a 0ms total budget: the guard trips before iteration 1.
      const result = await orchestrator.execute({
        context: {
          ...baseContext,
          iterationMax: 5,
          iterationTimeout: 0,
          iterations: 5,
          timeout: 0,
        },
      });

      expect(run).not.toHaveBeenCalled();
      expect(planUpdates.at(-1)).toBe('BLOCKED');
      expect(planOutput.join('\n')).toContain(
        'Wall-clock budget exhausted after 0/5 iteration(s); 1 task(s) still pending, 0 blocked.',
      );
      expect(result).toMatchObject({ reason: 'workflow_budget_exhausted' });
    });

    it('leaves the plan status alone in task mode', async () => {
      const run = vi.fn(async () => 'still working, no markers');
      const { executeGraphqlV2, planUpdates } = createStatefulExecute([
        baseTask(TASK_A, 'PENDING', { sortOrder: 1000 }),
        baseTask(TASK_B, 'PENDING', { sortOrder: 2000 }),
      ]);

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
      });

      const result = await orchestrator.execute({
        context: {
          ...baseContext,
          iterationMax: 1,
          iterations: 1,
          mode: 'task',
          taskId: TASK_A,
        },
      });

      expect(planUpdates).not.toContain('BLOCKED');
      expect(result).toMatchObject({ reason: 'workflow_max_iterations' });
    });
  });

  /**
   * Replays plan 5aad07f6: three tasks, the agent blocks one of them through its own status
   * write (as it would over MCP), and the run must end BLOCKED with a draft PR instead of
   * idling IN_PROGRESS.
   */
  describe('replaying the 5aad07f6 shape', () => {
    /** git/gh stub with commits ahead; captures the `gh pr create` argv and body. */
    const createAheadRunner = () => {
      const created: { args: readonly string[]; body: string }[] = [];
      const runCommand = vi.fn<WorkflowRalphCommandRunner>(
        async ({ args, command }) => {
          const [sub, first] = args;
          if (command === 'bash') {
            return { exitCode: 0, stderr: '', stdout: '' };
          }
          if (command === 'gh' && sub === 'pr' && first === 'create') {
            const bodyIndex = args.indexOf('--body-file') + 1;
            const bodyPath = args[bodyIndex] ?? '';
            created.push({ args, body: await readFile(bodyPath, 'utf8') });
            return { exitCode: 0, stderr: '', stdout: 'https://x/pull/7\n' };
          }
          if (command === 'gh' && sub === 'pr' && first === 'view') {
            return { exitCode: 0, stderr: '', stdout: '7\n' };
          }
          if (command === 'gh' && sub === 'pr' && first === 'list') {
            return { exitCode: 0, stderr: '', stdout: '[]' };
          }
          if (sub === 'rev-parse' && first === '--show-toplevel') {
            return { exitCode: 0, stderr: '', stdout: `${repoRoot}\n` };
          }
          if (sub === 'rev-parse' && first === '--abbrev-ref') {
            return { exitCode: 0, stderr: '', stdout: 'openthrottle/plan-x\n' };
          }
          if (sub === 'rev-parse' && first === 'HEAD') {
            return { exitCode: 0, stderr: '', stdout: 'abc1234\n' };
          }
          if (sub === 'rev-list') {
            return { exitCode: 0, stderr: '', stdout: '4\n' };
          }
          if (sub === 'push') {
            return { exitCode: 0, stderr: '', stdout: '' };
          }
          if (sub === 'log') {
            return {
              exitCode: 0,
              stderr: '',
              stdout: 'abc1234 feat(x): show agent setup output\n',
            };
          }
          return { exitCode: 1, stderr: '', stdout: '' };
        },
      );

      return { created, runCommand };
    };

    it('ends BLOCKED and opens a draft PR naming the blocked last task, with no further iteration', async () => {
      const { executeGraphqlV2, planUpdates } = createStatefulExecute([
        baseTask(TASK_A, 'COMPLETED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'COMPLETED', { sortOrder: 2000 }),
        baseTask(TASK_C, 'PENDING', { sortOrder: 3000, title: 'Visual pass' }),
      ]);
      const run = vi.fn(async () => {
        await executeGraphqlV2(UpdateTaskDocument, {
          input: { id: TASK_C, status: 'BLOCKED' },
        });
        return 'visual pass needs a human';
      });
      const { created, runCommand } = createAheadRunner();

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
        runCommand,
      });

      const result = await orchestrator.execute({
        context: { ...baseContext, iterationMax: 5, iterations: 5 },
      });

      expect(run).toHaveBeenCalledTimes(1);
      expect(planUpdates.at(-1)).toBe('BLOCKED');
      expect(planUpdates).not.toContain('COMPLETED');
      expect(created).toHaveLength(1);
      expect(created[0]?.args).toContain('--draft');
      expect(created[0]?.body).toContain('Visual pass');
      expect(result).toMatchObject({
        reason: 'workflow_tasks_blocked',
        status: 'finished',
      });
    });

    it('gives the last workable task the final-iteration line when the middle task is BLOCKED', async () => {
      const prompts: string[] = [];
      const { executeGraphqlV2, planUpdates } = createStatefulExecute([
        baseTask(TASK_A, 'COMPLETED', { sortOrder: 1000 }),
        baseTask(TASK_B, 'BLOCKED', { sortOrder: 2000, title: 'Visual pass' }),
        baseTask(TASK_C, 'PENDING', { sortOrder: 3000 }),
      ]);
      const run = vi.fn(async ({ agentPrompt }: { agentPrompt: string }) => {
        prompts.push(agentPrompt);
        return `<ralph:task-complete>${TASK_C}</ralph:task-complete>`;
      });
      const { created, runCommand } = createAheadRunner();

      const orchestrator = createWorkflowRalphOrchestrator({
        executeGraphqlV2,
        iterationRunner: { run },
        runCommand,
      });

      const result = await orchestrator.execute({
        context: { ...baseContext, iterationMax: 5, iterations: 5 },
      });

      expect(run).toHaveBeenCalledTimes(1);
      expect(prompts[0]).toContain(
        `Current task for this iteration: ${TASK_C}`,
      );
      expect(prompts[0]).toContain(FINAL_ITERATION_FLAG);
      expect(planUpdates.at(-1)).toBe('BLOCKED');
      expect(created[0]?.body).toContain('Visual pass');
      expect(result).toMatchObject({ reason: 'workflow_tasks_blocked' });
    });
  });
});
