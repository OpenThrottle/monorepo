/**
 * @description Enqueue tuning parity with developer
 * `buildRalphPlanRunTuningInputFromWorkflowRunOptions` (same omission rules as nested argv).
 */
import { describe, expect, it } from 'vitest';
import { getDefaultPlanWorkflowUiState } from './plan-run-config-storage.defaults.ts';
import {
  buildRalphPlanRunTuningFromPlanRunConfig,
  planRunConfigFromWorkflowUiState,
} from './plan-run-config-storage.round-trip.ts';
import type { PlanWorkflowUiState } from './plan-run-config-storage.types.ts';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

describe('plan run config enqueue tuning parity', () => {
  it('omits tuning when UI matches defaults (plan-scoped)', () => {
    const ui = getDefaultPlanWorkflowUiState({ planId });
    const stored = planRunConfigFromWorkflowUiState(ui);

    expect(buildRalphPlanRunTuningFromPlanRunConfig(stored)).toBeUndefined();
  });

  it('sends an explicit debug opt-out so the server default cannot override it', () => {
    const ui = getDefaultPlanWorkflowUiState({ planId });
    const stored = planRunConfigFromWorkflowUiState({
      ...ui,
      workflowInput: { ...ui.workflowInput, debugCli: 'omit' },
    });

    expect(buildRalphPlanRunTuningFromPlanRunConfig(stored)).toEqual({
      ralphDebugCli: 'omit',
    });
  });

  it('emits the same keys as developer enqueue tuning for a full profile', () => {
    const ui: PlanWorkflowUiState = {
      iterationTimeoutText: '45',
      workflowInput: {
        debugCli: 'debug',
        executionBackend: 'claude',
        iterations: 3,
        model: 'sonnet',
        planId,
        project: 'nestjs-repositories',
        prompt: '/agents/custom',
        promptFile: '',
        promptLayer: 'named',
        skipWorktreeSetup: false,
        targetMode: 'plan',
        taskId: '',
        worktreeBase: '',
        worktreeCli: 'named',
        worktreeName: 'feature-x',
      },
      workingDirectory: '/Users/matt/Development/openthrottle',
    };

    const stored = planRunConfigFromWorkflowUiState(ui);

    expect(buildRalphPlanRunTuningFromPlanRunConfig(stored)).toEqual({
      backend: 'claude',
      iterationTimeoutSeconds: 45,
      iterations: 3,
      model: 'sonnet',
      project: 'nestjs-repositories',
      prompt: '/agents/custom',
      ralphDebugCli: 'debug',
      worktree: 'feature-x',
    });
  });
});
