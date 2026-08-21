import { describe, expect, test } from 'vitest';
import {
  getDefaultWorkflowRalphRunOptionsInput,
  DEFAULT_RALPH_ITERATIONS,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  hydratePlanRunConfigUiState,
  serializePlanRunConfigUiState,
} from '~/routing/plans/utils/plan-run-config-ui';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

describe('hydratePlanRunConfigUiState', () => {
  test('returns defaults when runConfigJson is empty shell', () => {
    const runConfigJson = JSON.stringify({ version: 1 });

    const hydrated = hydratePlanRunConfigUiState(planId, runConfigJson);

    expect(hydrated.workflowInput.planId).toBe(planId);
    expect(hydrated.workflowInput.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(hydrated.workingDirectory).toBe('');
    expect(hydrated.iterationTimeoutText).toBe('');
  });

  test('hydrates stored workspace and tuning fields', () => {
    const runConfigJson = JSON.stringify({
      ralph: {
        debugCli: 'omit',
        executionBackend: 'claude',
        iterationTimeoutText: '120',
        iterations: 5,
        model: 'auto',
        project: 'packages/foo',
        prompt: '/agents/ralph',
        promptFile: '',
        promptLayer: 'named',
        skipWorktreeSetup: false,
        worktreeBase: '',
        worktreeCli: 'omit',
        worktreeName: '',
      },
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '/tmp/openthrottle' },
    });

    const hydrated = hydratePlanRunConfigUiState(planId, runConfigJson);

    expect(hydrated.workflowInput.executionBackend).toBe('claude');
    expect(hydrated.workflowInput.iterations).toBe(5);
    expect(hydrated.workflowInput.project).toBe('packages/foo');
    expect(hydrated.workingDirectory).toBe('/tmp/openthrottle');
    expect(hydrated.iterationTimeoutText).toBe('120');
  });
});

describe('worktree + verbose defaults', () => {
  test('a plan with no stored config hydrates worktree-on and verbose', () => {
    const hydrated = hydratePlanRunConfigUiState(planId, null);

    expect(hydrated.workflowInput.debugCli).toBe('verbose');
    expect(hydrated.workflowInput.worktreeCli).toBe('named');
    expect(hydrated.workflowInput.worktreeName).toBe('');
  });

  test('an explicit opt-out survives a serialize/hydrate round-trip', () => {
    const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });
    const json = serializePlanRunConfigUiState({
      checkoutId: '',
      iterationTimeoutText: '',
      repositoryId: '',
      workflowInput: {
        ...workflowInput,
        debugCli: 'omit',
        worktreeCli: 'omit',
      },
      workingDirectory: '',
    });

    const hydrated = hydratePlanRunConfigUiState(planId, json);

    expect(hydrated.workflowInput.debugCli).toBe('omit');
    expect(hydrated.workflowInput.worktreeCli).toBe('omit');
  });
});

describe('serializePlanRunConfigUiState', () => {
  test('round-trips with hydrate', () => {
    const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });
    const state = {
      checkoutId: '11111111-1111-4111-8111-111111111111',
      iterationTimeoutText: '90',
      repositoryId: '22222222-2222-4222-8222-222222222222',
      workflowInput: {
        ...workflowInput,
        executionBackend: 'claude' as const,
        iterations: 3,
        project: 'applications/openthrottle-server',
      },
      workingDirectory: '/Users/matt/Development/openthrottle',
    };

    const json = serializePlanRunConfigUiState(state);
    const hydrated = hydratePlanRunConfigUiState(planId, json);

    expect(hydrated.workflowInput.executionBackend).toBe('claude');
    expect(hydrated.workflowInput.iterations).toBe(3);
    expect(hydrated.workflowInput.project).toBe(
      'applications/openthrottle-server',
    );
    expect(hydrated.workingDirectory).toBe(
      '/Users/matt/Development/openthrottle',
    );
    expect(hydrated.iterationTimeoutText).toBe('90');
    expect(hydrated.checkoutId).toBe('11111111-1111-4111-8111-111111111111');
    expect(hydrated.repositoryId).toBe('22222222-2222-4222-8222-222222222222');
  });
});
