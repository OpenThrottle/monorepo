import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { WORKFLOW_RALPH_OT_ROOT_ENV } from '@openthrottle/ai-mcp/src/config';
import {
  GetPlanDocument,
  GetServerHealthDocument,
  GetTasksByPlanIdDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '../../__generated__/graphql.js';
import type { WorkflowRalphOrchestratorDeps } from '../../contract/ralph-orchestrator-deps.js';
import type { WorkflowContext } from '../../types.js';
import { createWorkflowRalphOrchestrator } from '../orchestrator.js';

let otRoot: string;
let foreignRoot: string;

const ISO = '2026-05-30T12:00:00.000Z';
const PLAN_ID = 'plan-foreign-1';
const TASK_ID = 'task-foreign-1';

beforeAll(() => {
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-orch-foreign-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
  foreignRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-orch-'));
});

afterAll(() => {
  fs.rmSync(otRoot, { force: true, recursive: true });
  fs.rmSync(foreignRoot, { force: true, recursive: true });
});

const baseContext = (
  overrides: Partial<WorkflowContext> = {},
): WorkflowContext => ({
  debug: 'omit',
  iterationMax: 1,
  iterations: 1,
  kind: 'ralph',
  mode: 'plan',
  model: 'auto',
  planId: PLAN_ID,
  project: '',
  prompt: '/agents/ralph',
  runner: 'cursor',
  taskId: '',
  ...overrides,
});

describe('createWorkflowRalphOrchestrator foreign workingDirectory', () => {
  it('passes foreign cwd to iterationRunner and scopes the prompt to the target repo', async () => {
    const run = vi.fn(async () => '<promise>COMPLETE</promise>');

    const executeGraphqlV2 = vi.fn(async (document: unknown) => {
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
    }) as WorkflowRalphOrchestratorDeps['executeGraphqlV2'];

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

    const runParams = (run as MockedFunction<typeof run>).mock.calls[0]?.[0];
    expect(runParams?.cwd).toBe(path.resolve(foreignRoot));
    expect(runParams?.agentPrompt).toContain(path.resolve(foreignRoot));
    expect(runParams?.agentPrompt).toContain('NOT the OpenThrottle monorepo');
    expect(runParams?.agentPrompt).toContain(
      'Make file changes under this directory',
    );
  });
});
