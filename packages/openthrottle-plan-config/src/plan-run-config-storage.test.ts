import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it } from 'vitest';

import { planHasCustomRunConfig } from './plan-run-config-storage.compare.ts';
import {
  DEFAULT_PLAN_RUN_RALPH_EFFORT,
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
    expect(config.ralph.effort).toBe(DEFAULT_PLAN_RUN_RALPH_EFFORT);
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

  it('defaults workspace checkout/repository ids to empty for legacy configs', () => {
    const parsed = parsePlanRunConfigStorage({
      ...getDefaultPlanRunConfigStorage({ planId }),
      workspace: { workingDirectory: '/Users/matt/Development/repo' },
    });
    expect(parsed.workspace.checkoutId).toBe('');
    expect(parsed.workspace.repositoryId).toBe('');
    expect(parsed.workspace.workingDirectory).toBe(
      '/Users/matt/Development/repo',
    );
  });

  it('preserves valid workspace checkout/repository ids', () => {
    const parsed = parsePlanRunConfigStorage({
      ...getDefaultPlanRunConfigStorage({ planId }),
      workspace: {
        checkoutId: '11111111-1111-4111-8111-111111111111',
        repositoryId: '22222222-2222-4222-8222-222222222222',
        workingDirectory: '',
      },
    });
    expect(parsed.workspace.checkoutId).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(parsed.workspace.repositoryId).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('rejects a non-UUID workspace checkoutId', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ...getDefaultPlanRunConfigStorage({ planId }),
        workspace: {
          checkoutId: 'nope',
          repositoryId: '',
          workingDirectory: '',
        },
      }),
    ).toThrow(/checkoutId must be a UUID/);
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
  const fullUi = (): PlanWorkflowUiState => {
    return {
      checkoutId: '11111111-1111-4111-8111-111111111111',
      iterationTimeoutText: '120',
      repositoryId: '22222222-2222-4222-8222-222222222222',
      workflowInput: {
        debugCli: 'debug',
        effort: 'max',
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
        worktreeCleanup: 'keep',
        worktreeCli: 'named',
        worktreeName: 'my-worktree',
      },
      workingDirectory: '/Users/matt/Development/other-repo',
    };
  };

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

describe('programmatic run defaults', () => {
  it('defaults a new plan to a named worktree with verbose logging', () => {
    const ralph = getDefaultPlanRunConfigStorage({ planId }).ralph;

    expect(ralph.debugCli).toBe('verbose');
    expect(ralph.worktreeCli).toBe('named');
    // Blank means "derive the name at enqueue", not "no worktree".
    expect(ralph.worktreeName).toBe('');
    expect(ralph.executionBackend).toBe('cursor');
  });

  it('keeps stored defaults and Configuration tab defaults identical', () => {
    const ui = getDefaultPlanWorkflowUiState({ planId });

    expect(ui.workflowInput.debugCli).toBe('verbose');
    expect(ui.workflowInput.worktreeCli).toBe('named');
    expect(planRunConfigFromWorkflowUiState(ui)).toEqual(
      getDefaultPlanRunConfigStorage({ planId }),
    );
  });

  it('round-trips the new defaults unchanged', () => {
    const stored = getDefaultPlanRunConfigStorage({ planId });
    const ui = workflowUiStateFromPlanRunConfig(planId, stored);

    expect(planRunConfigFromWorkflowUiState(ui)).toEqual(stored);
  });

  it('does not report a freshly-defaulted plan as customized', () => {
    expect(
      planHasCustomRunConfig(
        JSON.stringify(getDefaultPlanRunConfigStorage({ planId })),
        { planId },
      ),
    ).toBe(false);
  });
});

describe('back-compat for plans stored under the old defaults', () => {
  const storedRalph = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    return {
      executionBackend: 'cursor',
      iterationTimeoutText: '',
      iterations: 10,
      model: 'auto',
      project: '',
      prompt: '/agents-ralph',
      promptFile: '',
      promptLayer: 'named',
      skipWorktreeSetup: false,
      worktreeBase: '',
      worktreeName: '',
      ...overrides,
    };
  };

  it('resolves ABSENT worktree/debug keys to the new defaults', () => {
    const parsed = parsePlanRunConfigStorage({
      ralph: storedRalph(),
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    });

    expect(parsed.ralph.debugCli).toBe('verbose');
    expect(parsed.ralph.worktreeCleanup).toBe('on-pr');
    expect(parsed.ralph.worktreeCli).toBe('named');
  });

  it('preserves a persisted worktreeCleanup choice', () => {
    const parsed = parsePlanRunConfigStorage({
      ralph: storedRalph({ worktreeCleanup: 'keep' }),
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    });

    expect(parsed.ralph.worktreeCleanup).toBe('keep');
  });

  it('rejects an unknown worktreeCleanup value', () => {
    expect(() =>
      parsePlanRunConfigStorage({
        ralph: storedRalph({ worktreeCleanup: 'always' }),
        target: { mode: 'plan', taskId: '' },
        version: 1,
        workspace: { workingDirectory: '' },
      }),
    ).toThrow();
  });

  it('preserves a persisted explicit opt-out', () => {
    const parsed = parsePlanRunConfigStorage({
      ralph: storedRalph({ debugCli: 'omit', worktreeCli: 'omit' }),
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    });

    expect(parsed.ralph.debugCli).toBe('omit');
    expect(parsed.ralph.worktreeCli).toBe('omit');
  });

  it('resolves a bare {"version":1} shell to the new defaults', () => {
    const parsed = planRunConfigFromPlanStorage({ version: 1 }, { planId });

    expect(parsed.ralph.debugCli).toBe('verbose');
    expect(parsed.ralph.worktreeCli).toBe('named');
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
      effort: 'high',
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

const fullUiForTuning = (): PlanWorkflowUiState => {
  return {
    iterationTimeoutText: '120',
    workflowInput: {
      debugCli: 'debug',
      effort: 'high',
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
      worktreeCleanup: 'on-pr',
      worktreeCli: 'named',
      worktreeName: 'my-worktree',
    },
    workingDirectory: '',
  };
};

const fullUiForCompare = (): PlanWorkflowUiState => {
  return fullUiForTuning();
};

describe('ralph.effort', () => {
  it('is accepted, trimmed and kept by the storage schema', () => {
    const parsed = parsePlanRunConfigStorage({
      ...getDefaultPlanRunConfigStorage({ planId }),
      ralph: {
        ...getDefaultPlanRunConfigStorage({ planId }).ralph,
        effort: '  extraHigh ',
      },
    });

    expect(parsed.ralph.effort).toBe('extraHigh');
  });

  it('reads as unset on a config written before effort existed', () => {
    const { effort: _effort, ...legacyRalph } = getDefaultPlanRunConfigStorage({
      planId,
    }).ralph;

    const parsed = parsePlanRunConfigStorage({
      ...getDefaultPlanRunConfigStorage({ planId }),
      ralph: legacyRalph,
    });

    expect(parsed.ralph.effort).toBe('');
    expect(
      planHasCustomRunConfig(
        {
          ...getDefaultPlanRunConfigStorage({ planId }),
          ralph: legacyRalph,
        },
        { planId },
      ),
    ).toBe(false);
  });

  it('marks a plan with a chosen effort as customized', () => {
    expect(
      planHasCustomRunConfig(
        {
          ...getDefaultPlanRunConfigStorage({ planId }),
          ralph: {
            ...getDefaultPlanRunConfigStorage({ planId }).ralph,
            effort: 'high',
          },
        },
        { planId },
      ),
    ).toBe(true);
  });

  it('round-trips through the UI state', () => {
    const ui = getDefaultPlanWorkflowUiState({ planId });
    const stored = planRunConfigFromWorkflowUiState({
      ...ui,
      workflowInput: { ...ui.workflowInput, effort: ' ultra ' },
    });

    expect(stored.ralph.effort).toBe('ultra');
    expect(
      workflowUiStateFromPlanRunConfig(planId, stored).workflowInput.effort,
    ).toBe('ultra');
  });

  it('is omitted from enqueue tuning when unset', () => {
    expect(
      buildRalphPlanRunTuningFromPlanRunConfig(
        getDefaultPlanRunConfigStorage({ planId }),
      ),
    ).toBeUndefined();
  });

  it('is sent as tuning.effort when chosen', () => {
    expect(
      buildRalphPlanRunTuningFromPlanRunConfig({
        ...getDefaultPlanRunConfigStorage({ planId }),
        ralph: {
          ...getDefaultPlanRunConfigStorage({ planId }).ralph,
          effort: 'max',
        },
      }),
    ).toEqual({ effort: 'max' });
  });
});

describe('runner and otLoop', () => {
  const base = getDefaultPlanRunConfigStorage({ planId });

  it('parses a config without them unchanged and keeps it default', () => {
    const parsed = parsePlanRunConfigStorage(base);

    expect(parsed).not.toHaveProperty('runner');
    expect(parsed).not.toHaveProperty('otLoop');
    expect(planHasCustomRunConfig(parsed, { planId })).toBe(false);
  });

  it('accepts and round-trips runner and otLoop through JSON and the UI state', () => {
    const config: PlanRunConfigStorage = {
      ...base,
      otLoop: {
        finalValidationCommands: ['pnpm run check:local'],
        maxRetries: 5,
        setupCommands: ['pnpm install'],
        validationCommands: ['pnpm nx run x:test'],
      },
      runner: 'ot-loop',
    };

    const reparsed = parsePlanRunConfigJson(JSON.stringify(config));
    expect(reparsed).toEqual(config);

    const ui = workflowUiStateFromPlanRunConfig(planId, config);
    expect(ui.runner).toBe('ot-loop');
    expect(planRunConfigFromWorkflowUiState(ui)).toEqual(config);
    expect(planHasCustomRunConfig(config, { planId })).toBe(true);
  });

  it('rejects an unknown runner, out-of-range retries and empty commands', () => {
    expect(() =>
      parsePlanRunConfigStorage({ ...base, runner: 'other' }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigStorage({ ...base, otLoop: { maxRetries: 6 } }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigStorage({ ...base, otLoop: { maxRetries: 1.5 } }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigStorage({ ...base, otLoop: { setupCommands: [''] } }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigStorage({ ...base, otLoop: { extra: true } }),
    ).toThrow();
  });
});
