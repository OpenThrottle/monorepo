import { describe, expect, test } from 'vitest';

import {
  hydratePlanRunConfigUiState,
  serializePlanRunConfigUiState,
} from '~/routing/plans/utils/plan-run-config-ui';
import { getDefaultPlanRunOptions } from '~/routing/plans/utils/plan-run-options';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

describe('hydratePlanRunConfigUiState', () => {
  test('returns defaults when runConfigJson is empty shell', () => {
    const runConfigJson = JSON.stringify({ version: 1 });

    const hydrated = hydratePlanRunConfigUiState(planId, runConfigJson);

    expect(hydrated.workflowInput.planId).toBe(planId);
    expect(hydrated.workflowInput.driver).toBe('cursor');
    expect(hydrated.workingDirectory).toBe('');
    expect(hydrated.iterationTimeoutText).toBe('');
  });

  test('hydrates stored workspace and tuning fields', () => {
    const runConfigJson = JSON.stringify({
      run: {
        debugCli: 'omit',
        driver: 'claude',
        iterationTimeoutSeconds: 120,
        model: 'auto',
        worktreeName: '',
      },
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '/tmp/openthrottle' },
    });

    const hydrated = hydratePlanRunConfigUiState(planId, runConfigJson);

    expect(hydrated.workflowInput.driver).toBe('claude');
    expect(hydrated.workingDirectory).toBe('/tmp/openthrottle');
    expect(hydrated.iterationTimeoutText).toBe('120');
  });
});

describe('effort', () => {
  test('a stored config written before effort existed hydrates as unset', () => {
    const hydrated = hydratePlanRunConfigUiState(
      planId,
      JSON.stringify({ version: 1 }),
    );

    expect(hydrated.workflowInput.effort).toBe('');
  });

  test('round-trips a chosen effort through serialize and hydrate', () => {
    const hydrated = hydratePlanRunConfigUiState(planId, null);

    const json = serializePlanRunConfigUiState({
      ...hydrated,
      workflowInput: {
        ...hydrated.workflowInput,
        driver: 'claude',
        effort: 'extraHigh',
      },
    });

    expect(JSON.parse(json).run.effort).toBe('extraHigh');
    expect(hydratePlanRunConfigUiState(planId, json).workflowInput.effort).toBe(
      'extraHigh',
    );
  });
});

describe('worktree defaults', () => {
  test('a plan with no stored config hydrates with the derived worktree name', () => {
    const hydrated = hydratePlanRunConfigUiState(planId, null);

    expect(hydrated.workflowInput.worktreeName).toBe('');
  });

  test('a worktree name override survives a serialize/hydrate round-trip', () => {
    const workflowInput = getDefaultPlanRunOptions({ planId });
    const json = serializePlanRunConfigUiState({
      checkoutId: '',
      iterationTimeoutText: '',
      repositoryId: '',
      workflowInput: { ...workflowInput, worktreeName: 'my-tree' },
      workingDirectory: '',
    });

    expect(JSON.parse(json).run.worktreeName).toBe('my-tree');
    expect(
      hydratePlanRunConfigUiState(planId, json).workflowInput.worktreeName,
    ).toBe('my-tree');
  });
});

describe('serializePlanRunConfigUiState', () => {
  test('round-trips with hydrate', () => {
    const workflowInput = getDefaultPlanRunOptions({ planId });
    const state = {
      checkoutId: '11111111-1111-4111-8111-111111111111',
      iterationTimeoutText: '90',
      repositoryId: '22222222-2222-4222-8222-222222222222',
      workflowInput: {
        ...workflowInput,
        driver: 'claude' as const,
      },
      workingDirectory: '/Users/matt/Development/openthrottle',
    };

    const json = serializePlanRunConfigUiState(state);
    const hydrated = hydratePlanRunConfigUiState(planId, json);

    expect(hydrated.workflowInput.driver).toBe('claude');
    expect(hydrated.workingDirectory).toBe(
      '/Users/matt/Development/openthrottle',
    );
    expect(hydrated.iterationTimeoutText).toBe('90');
    expect(hydrated.checkoutId).toBe('11111111-1111-4111-8111-111111111111');
    expect(hydrated.repositoryId).toBe('22222222-2222-4222-8222-222222222222');
  });
});

describe('stored shape', () => {
  test('a save writes the run block with the default debug level and no retired keys', () => {
    const hydrated = hydratePlanRunConfigUiState(planId, null);
    const parsed = JSON.parse(serializePlanRunConfigUiState(hydrated));

    expect(parsed.run).toMatchObject({ debugCli: 'verbose', driver: 'cursor' });
    expect(Object.keys(parsed)).not.toContain('runner');
  });

  test('a save keeps the stored OT Loop fields in the run block', () => {
    const stored = JSON.stringify({
      run: {
        driver: 'cursor',
        maxRetries: 2,
        model: 'auto',
        validationCommands: ['pnpm test'],
        worktreeName: '',
      },
      target: { mode: 'plan', taskId: '' },
      version: 1,
      workspace: { workingDirectory: '' },
    });
    const hydrated = hydratePlanRunConfigUiState(planId, stored);

    expect(hydrated.otLoop).toEqual({
      maxRetries: 2,
      validationCommands: ['pnpm test'],
    });
    expect(
      JSON.parse(serializePlanRunConfigUiState(hydrated)).run,
    ).toMatchObject({ maxRetries: 2, validationCommands: ['pnpm test'] });
  });
});
