import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_MODEL,
  DEFAULT_PLAN_RUN_RALPH_PROMPT,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
  PLAN_RUN_CONFIG_VERSION,
} from './plan-run-config-storage.constants.ts';
import {
  getDefaultPlanRunConfigStorage,
  getDefaultPlanWorkflowUiState,
} from './plan-run-config-storage.defaults.ts';
import {
  buildRalphPlanRunTuningFromPlanRunConfig,
  parsePlanRunIterationTimeoutSeconds,
  planRunConfigFromWorkflowUiState,
  workflowUiStateFromPlanRunConfig,
} from './plan-run-config-storage.round-trip.ts';
import { planHasCustomRunConfig } from './plan-run-config-storage.compare.ts';
import type {
  PlanRunConfigStorage,
  PlanWorkflowUiState,
} from './plan-run-config-storage.types.ts';
import {
  parsePlanRunConfigJson,
  parsePlanRunConfigStorage,
  planRunConfigFromPlanStorage,
  serializePlanRunConfigForGraphql,
} from './plan-run-config-storage.validation.ts';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';
const taskId = '18142b71-cca2-4242-a4e5-a5b984c7e61d';

describe('getDefaultPlanRunConfigStorage', () => {
  it('returns version 1 shell with plan target and empty workspace', () => {
    const config = getDefaultPlanRunConfigStorage({ planId });

    expect(config.version).toBe(PLAN_RUN_CONFIG_VERSION);
    expect(config.target).toEqual({ mode: 'plan', taskId: '' });
    expect(config.workspace.workingDirectory).toBe('');
    expect(config.ralph.executionBackend).toBe(DEFAULT_PLAN_RUN_RALPH_RUNNER);
    expect(config.ralph.iterations).toBe(DEFAULT_PLAN_RUN_RALPH_ITERATIONS);
    expect(config.ralph.prompt).toBe(DEFAULT_PLAN_RUN_RALPH_PROMPT);
    expect(config.ralph.model).toBe(DEFAULT_PLAN_RUN_RALPH_MODEL);
  });

  it('defaults to task mode when only taskId is seeded', () => {
    const config = getDefaultPlanRunConfigStorage({ taskId });
    expect(config.target.mode).toBe('task');
    expect(config.target.taskId).toBe(taskId);
  });
});

describe('getDefaultPlanWorkflowUiState', () => {
  it('matches default storage when round-tripped', () => {
    const ui = getDefaultPlanWorkflowUiState({ planId });
    const stored = planRunConfigFromWorkflowUiState(ui);
    const defaults = getDefaultPlanRunConfigStorage({ planId });

    expect(stored).toEqual(defaults);
  });
});

describe('parsePlanRunConfigStorage', () => {
  it('rejects unknown version', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ralph: getDefaultPlanRunConfigStorage().ralph,
        target: { mode: 'plan', taskId: '' },
        version: 2,
        workspace: { workingDirectory: '' },
      }),
    ).toThrow(/validation failed/);
  });

  it('requires task UUID when target mode is task', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ralph: getDefaultPlanRunConfigStorage().ralph,
        target: { mode: 'task', taskId: 'not-a-uuid' },
        version: PLAN_RUN_CONFIG_VERSION,
        workspace: { workingDirectory: '' },
      }),
    ).toThrow(/taskId must be a UUID/);
  });

  it('rejects non-absolute workingDirectory', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ...getDefaultPlanRunConfigStorage({ planId }),
        workspace: { workingDirectory: 'relative/path' },
      }),
    ).toThrow(/absolute path/);
  });

  it('rejects invalid iteration timeout text', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ...getDefaultPlanRunConfigStorage({ planId }),
        ralph: {
          ...getDefaultPlanRunConfigStorage({ planId }).ralph,
          iterationTimeoutText: 'nope',
        },
      }),
    ).toThrow(/iterationTimeoutText/);
  });
});

describe('parsePlanRunConfigJson', () => {
  it('returns undefined for empty string', () => {
    expect(parsePlanRunConfigJson('')).toBeUndefined();
  });

  it('returns default shell for null reset', () => {
    const config = parsePlanRunConfigJson(null);
    expect(config).toEqual(getDefaultPlanRunConfigStorage());
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePlanRunConfigJson('{')).toThrow(/valid JSON/);
  });
});

describe('planRunConfigFromPlanStorage', () => {
  it('fills legacy version-only shell from DB', () => {
    const config = planRunConfigFromPlanStorage({ version: 1 }, { planId });
    expect(config).toEqual(getDefaultPlanRunConfigStorage({ planId }));
  });
});

describe('serializePlanRunConfigForGraphql', () => {
  it('serializes defaults when storage is missing', () => {
    const json = serializePlanRunConfigForGraphql(undefined);
    expect(JSON.parse(json)).toEqual(getDefaultPlanRunConfigStorage());
  });

  it('normalizes legacy version-only shell', () => {
    const json = serializePlanRunConfigForGraphql(
      asMock<PlanRunConfigStorage>({ version: 1 }),
      { planId },
    );
    expect(JSON.parse(json)).toEqual(
      getDefaultPlanRunConfigStorage({ planId }),
    );
  });
});

describe('planRunConfig round-trip', () => {
  const fullUi = (): PlanWorkflowUiState => ({
    iterationTimeoutText: '120',
    workflowInput: {
      debugCli: 'debug',
      executionBackend: 'claude',
      iterations: 7,
      model: 'fast',
      planId,
      project: 'openthrottle-workflows',
      prompt: '/custom',
      promptFile: '',
      promptLayer: 'named',
      skipWorktreeSetup: false,
      targetMode: 'plan',
      taskId: '',
      worktreeBase: '',
      worktreeCli: 'named',
      worktreeName: 'my-worktree',
    },
    workingDirectory: '/Users/matt/Development/other-repo',
  });

  it('round-trips UI state without loss', () => {
    const ui = fullUi();
    const stored = planRunConfigFromWorkflowUiState(ui);
    const restored = workflowUiStateFromPlanRunConfig(planId, stored);

    expect(restored).toEqual(ui);
  });

  it('uses authoritative planId on hydrate', () => {
    const ui = fullUi();
    const stored = planRunConfigFromWorkflowUiState(ui);
    const otherPlan = 'e8b802b0-e5d6-41dc-934f-ed4659be3a63';
    const restored = workflowUiStateFromPlanRunConfig(otherPlan, stored);

    expect(restored.workflowInput.planId).toBe(otherPlan);
    expect(restored.iterationTimeoutText).toBe(ui.iterationTimeoutText);
  });
});

describe('planHasCustomRunConfig', () => {
  it('returns false for default version-only shell from DB', () => {
    expect(planHasCustomRunConfig({ version: 1 }, { planId })).toBe(false);
  });

  it('returns false for canonical default storage', () => {
    expect(
      planHasCustomRunConfig(getDefaultPlanRunConfigStorage({ planId }), {
        planId,
      }),
    ).toBe(false);
  });

  it('returns true when iterations differ from defaults', () => {
    const stored = planRunConfigFromWorkflowUiState({
      ...getDefaultPlanWorkflowUiState({ planId }),
      workflowInput: {
        ...getDefaultPlanWorkflowUiState({ planId }).workflowInput,
        iterations: 3,
      },
    });

    expect(planHasCustomRunConfig(stored, { planId })).toBe(true);
  });

  it('returns true when prompt differs from defaults', () => {
    const stored = planRunConfigFromWorkflowUiState({
      ...getDefaultPlanWorkflowUiState({ planId }),
      workflowInput: {
        ...getDefaultPlanWorkflowUiState({ planId }).workflowInput,
        prompt: '/custom-prompt',
      },
    });

    expect(planHasCustomRunConfig(stored, { planId })).toBe(true);
  });

  it('returns true when worktree differs from defaults', () => {
    const stored = planRunConfigFromWorkflowUiState({
      ...getDefaultPlanWorkflowUiState({ planId }),
      workflowInput: {
        ...getDefaultPlanWorkflowUiState({ planId }).workflowInput,
        worktreeCli: 'named',
        worktreeName: 'feature-branch',
      },
    });

    expect(planHasCustomRunConfig(stored, { planId })).toBe(true);
  });

  it('returns true when execution backend differs from defaults', () => {
    const stored = planRunConfigFromWorkflowUiState({
      ...getDefaultPlanWorkflowUiState({ planId }),
      workflowInput: {
        ...getDefaultPlanWorkflowUiState({ planId }).workflowInput,
        executionBackend: 'claude',
      },
    });

    expect(planHasCustomRunConfig(stored, { planId })).toBe(true);
  });

  it('stays consistent through serialize and deserialize round-trip', () => {
    const customStored = planRunConfigFromWorkflowUiState(fullUiForCompare());
    expect(planHasCustomRunConfig(customStored, { planId })).toBe(true);

    const serialized = serializePlanRunConfigForGraphql(customStored, {
      planId,
    });
    expect(planHasCustomRunConfig(JSON.parse(serialized), { planId })).toBe(
      true,
    );

    const defaultSerialized = serializePlanRunConfigForGraphql(
      getDefaultPlanRunConfigStorage({ planId }),
      { planId },
    );
    expect(
      planHasCustomRunConfig(JSON.parse(defaultSerialized), { planId }),
    ).toBe(false);
  });
});

describe('parsePlanRunIterationTimeoutSeconds', () => {
  it('parses positive integers and rejects invalid input', () => {
    expect(parsePlanRunIterationTimeoutSeconds('90')).toBe(90);
    expect(parsePlanRunIterationTimeoutSeconds('')).toBeUndefined();
    expect(parsePlanRunIterationTimeoutSeconds('0')).toBeUndefined();
    expect(parsePlanRunIterationTimeoutSeconds('abc')).toBeUndefined();
  });
});

describe('buildRalphPlanRunTuningFromPlanRunConfig', () => {
  it('returns undefined for default storage', () => {
    expect(
      buildRalphPlanRunTuningFromPlanRunConfig(
        getDefaultPlanRunConfigStorage({ planId }),
      ),
    ).toBeUndefined();
  });

  it('maps non-default tuning fields', () => {
    const ui = fullUiForTuning();
    const stored = planRunConfigFromWorkflowUiState(ui);
    const tuning = buildRalphPlanRunTuningFromPlanRunConfig(stored);

    expect(tuning).toEqual({
      backend: 'claude',
      iterationTimeoutSeconds: 120,
      iterations: 7,
      model: 'fast',
      project: 'openthrottle-workflows',
      prompt: '/custom',
      ralphDebugCli: 'debug',
      worktree: 'my-worktree',
    });
  });
});

const fullUiForTuning = (): PlanWorkflowUiState => ({
  iterationTimeoutText: '120',
  workflowInput: {
    debugCli: 'debug',
    executionBackend: 'claude',
    iterations: 7,
    model: 'fast',
    planId,
    project: 'openthrottle-workflows',
    prompt: '/custom',
    promptFile: '',
    promptLayer: 'named',
    skipWorktreeSetup: false,
    targetMode: 'plan',
    taskId: '',
    worktreeBase: '',
    worktreeCli: 'named',
    worktreeName: 'my-worktree',
  },
  workingDirectory: '',
});

const fullUiForCompare = (): PlanWorkflowUiState => fullUiForTuning();
