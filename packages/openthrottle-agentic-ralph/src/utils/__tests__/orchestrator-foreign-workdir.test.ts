import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { WORKFLOW_RALPH_OT_ROOT_ENV } from '@openthrottle/openthrottle-agentic-utils';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphIterationRunner,
} from '../../contract/ralph-orchestrator-deps.ts';
import type { WorkflowContext } from '../../types.ts';
import { createWorkflowRalphOrchestrator } from '../orchestrator.ts';

let otRoot: string;
let foreignRoot: string;
/** A linked worktree of {@link otRoot} at a path outside it, like a Ralph plan worktree. */
let otWorktree: string;

const ISO = '2026-05-30T12:00:00.000Z';
const PLAN_ID = 'plan-foreign-1';
const TASK_ID = 'task-foreign-1';

beforeAll(() => {
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-orch-foreign-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
  foreignRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-orch-'));

  execFileSync('git', ['init', '-q'], { cwd: otRoot, stdio: 'ignore' });
  execFileSync(
    'git',
    [
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=test',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'init',
    ],
    { cwd: otRoot, stdio: 'ignore' },
  );
  otWorktree = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'ot-orch-worktrees-')),
    'plan-a',
  );
  execFileSync('git', ['worktree', 'add', '-q', '--detach', otWorktree], {
    cwd: otRoot,
    stdio: 'ignore',
  });
});

afterAll(() => {
  fs.rmSync(otRoot, { force: true, recursive: true });
  fs.rmSync(foreignRoot, { force: true, recursive: true });
  fs.rmSync(path.dirname(otWorktree), { force: true, recursive: true });
});

const baseContext = (
  overrides: Partial<WorkflowContext> = {},
): WorkflowContext => {
  return {
    debug: 'omit',
    iterationMax: 1,
    iterationTimeout: 1000,
    iterations: 1,
    kind: 'ralph',
    mode: 'plan',
    model: 'auto',
    planId: PLAN_ID,
    project: '',
    prompt: '/agents/ralph',
    runner: 'cursor',
    skipWorktreeSetup: true,
    taskId: '',
    timeout: 1000,
    worktree: undefined,
    worktreeBase: undefined,
    ...overrides,
  };
};

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

/**
 * @description Routes mock GraphQL responses by codegen document reference (same pattern as workflows Ralph tests).
 */
const createForeignWorkdirMockExecute = (): WorkflowExecuteGraphqlV2 => {
  return asExecuteGraphqlV2(async (document) => {
    if (document === GetServerHealthDocument) {
      return {
        serverHealth: {
          __typename: 'ServerHealthObject',
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      };
    }
    if (document === GetPlanDocument) {
      return {
        plan: {
          __typename: 'PlanObject',
          assignee: null,
          author: 'tester',
          category: 'test',
          createdAt: ISO,
          description: null,
          id: PLAN_ID,
          project: null,
          projectId: null,
          status: 'PENDING',
          summary: null,
          title: 'Foreign plan',
          updatedAt: ISO,
        },
      };
    }
    if (document === GetTasksByPlanIdDocument) {
      return {
        tasksByPlanId: [
          {
            __typename: 'TaskObject',
            assignee: null,
            category: null,
            createdAt: ISO,
            description: null,
            id: TASK_ID,
            planId: PLAN_ID,
            project: null,
            projectId: null,
            requirementsJson: '[]',
            status: 'PENDING',
            summary: null,
            title: 'Implement',
            updatedAt: ISO,
          },
        ],
      };
    }
    if (document === UpdatePlanDocument || document === UpdateTaskDocument) {
      return {};
    }
    throw new Error('unmocked GraphQL document in test');
  });
};

describe('createWorkflowRalphOrchestrator foreign workingDirectory', () => {
  it('passes foreign cwd to iterationRunner and scopes the prompt to the target repo', async () => {
    const run = vi.fn<WorkflowRalphIterationRunner['run']>(
      async () => '<promise>COMPLETE</promise>',
    );

    const executeGraphqlV2 = createForeignWorkdirMockExecute();

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2,
      iterationRunner: { run },
    });

    process.env[WORKFLOW_RALPH_OT_ROOT_ENV] = otRoot;

    const result = await orchestrator.execute({
      context: baseContext({ workingDirectory: foreignRoot }),
    });

    expect(result.status).toBe('finished');
    expect(run).toHaveBeenCalledTimes(1);

    const runParams = run.mock.calls[0]![0];

    expect(runParams.cwd).toBe(path.resolve(foreignRoot));
    expect(runParams.agentPrompt).toContain(path.resolve(foreignRoot));
    expect(runParams.agentPrompt).toContain('NOT the OpenThrottle monorepo');
    expect(runParams.agentPrompt).toContain(
      'Make file changes under this directory',
    );
  });

  it('does not scope the prompt away from OpenThrottle for a worktree of the OpenThrottle repo', async () => {
    const run = vi.fn<WorkflowRalphIterationRunner['run']>(
      async () => '<promise>COMPLETE</promise>',
    );

    const orchestrator = createWorkflowRalphOrchestrator({
      executeGraphqlV2: createForeignWorkdirMockExecute(),
      iterationRunner: { run },
    });

    process.env[WORKFLOW_RALPH_OT_ROOT_ENV] = otRoot;

    const result = await orchestrator.execute({
      context: baseContext({ workingDirectory: otWorktree }),
    });

    expect(result.status).toBe('finished');

    const runParams = run.mock.calls[0]![0];

    expect(runParams.cwd).toBe(path.resolve(otWorktree));
    expect(runParams.agentPrompt).not.toContain(
      'NOT the OpenThrottle monorepo',
    );
  });
});
