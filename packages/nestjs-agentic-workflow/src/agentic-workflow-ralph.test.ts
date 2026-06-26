import type {
  WorkflowOrchestrator,
  WorkflowRalphOrchestratorDeps,
} from '@openthrottle/openthrottle-agentic-ralph';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgenticWorkflowRalph } from './agentic-workflow-ralph';
import { AGENTIC_WORKFLOW_RALPH_ID } from './agentic-workflow-ralph-registration';

const { createWorkflowRalphOrchestratorMock } = vi.hoisted(() => ({
  createWorkflowRalphOrchestratorMock: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-ralph', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-ralph')
    >();

  return {
    ...actual,
    createWorkflowRalphOrchestrator: createWorkflowRalphOrchestratorMock,
  };
});

/**
 * @description Minimal deps double; the concrete workflow only forwards this object to the mocked
 * `createWorkflowRalphOrchestrator`, so the runner/executor never run here.
 */
const createDepsStub = (): WorkflowRalphOrchestratorDeps => ({
  executeGraphqlV2: async () => {
    throw new Error('executeGraphqlV2 stub should not run in this test');
  },
  iterationRunner: {
    run: async () => {
      throw new Error('iterationRunner stub should not run in this test');
    },
  },
});

describe('AgenticWorkflowRalph', () => {
  beforeEach(() => {
    createWorkflowRalphOrchestratorMock.mockReset();
  });

  it('exposes the stable Ralph id', () => {
    const workflow = new AgenticWorkflowRalph(createDepsStub());

    expect(workflow.id).toBe('ralph');
    expect(workflow.id).toBe(AGENTIC_WORKFLOW_RALPH_ID);
  });

  it('delegates createOrchestrator to createWorkflowRalphOrchestrator with its deps', () => {
    const deps = createDepsStub();
    const orchestrator: WorkflowOrchestrator = {
      execute: async () => ({
        exitCode: 0,
        reason: 'workflow_complete',
        status: 'finished',
      }),
    };
    createWorkflowRalphOrchestratorMock.mockReturnValue(orchestrator);

    const workflow = new AgenticWorkflowRalph(deps);
    const result = workflow.createOrchestrator();

    expect(createWorkflowRalphOrchestratorMock).toHaveBeenCalledTimes(1);
    expect(createWorkflowRalphOrchestratorMock).toHaveBeenCalledWith(deps);
    expect(result).toBe(orchestrator);
  });
});
