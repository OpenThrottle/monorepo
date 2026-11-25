import { createStore, getDefaultStore } from 'jotai/vanilla';
import { describe, expect, test } from 'vitest';

import {
  resetWorkflowRunToDefaultsAtom,
  runConfigJsonAtom,
  workflowMergedRunOptionsAtom,
  workflowOtLoopAtom,
  workflowRunIterationTimeoutTextAtom,
  workflowRunOptionsAtom,
  workflowRunTuningJsonAtom,
} from '~/routing/plans/data/atom-plan';
import { hydratePlanRunConfigUiState } from '~/routing/plans/utils/plan-run-config-ui';
import { DEFAULT_RUN_MODEL } from '~/routing/plans/utils/plan-run-options';
import { getWorkflowRunAtomDefaultState } from '~/routing/plans/utils/workflow-run-atom-state';

describe('workflow run atoms', () => {
  test('getWorkflowRunAtomDefaultState matches getDefaultPlanRunOptions + empty timeout text', () => {
    const a = getWorkflowRunAtomDefaultState();
    expect(a.iterationTimeoutText).toBe('');
    expect(a.runOptions.model).toBe(DEFAULT_RUN_MODEL);
    expect(a.runOptions.worktreeName).toBe('');
  });

  test('getWorkflowRunAtomDefaultState seeds plan mode when only planId is set', () => {
    const planId = 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d';
    const a = getWorkflowRunAtomDefaultState({ planId });
    expect(a.runOptions.targetMode).toBe('plan');
    expect(a.runOptions.planId).toBe(planId);
    expect(a.runOptions.taskId).toBe('');
  });

  test('getWorkflowRunAtomDefaultState prefers task mode when only taskId is set', () => {
    const taskId = '226baa54-57e3-4c6f-9d03-b2d64c49cdd3';
    const a = getWorkflowRunAtomDefaultState({ taskId });
    expect(a.runOptions.targetMode).toBe('task');
    expect(a.runOptions.taskId).toBe(taskId);
    expect(a.runOptions.planId).toBe('');
  });

  test('merged options atom parses the agent timeout from the text atom', () => {
    const store = getDefaultStore();
    store.set(workflowRunOptionsAtom, {
      ...getWorkflowRunAtomDefaultState().runOptions,
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
      targetMode: 'plan',
    });
    store.set(workflowRunIterationTimeoutTextAtom, '  1800  ');
    const merged = store.get(workflowMergedRunOptionsAtom);
    expect(merged.iterationTimeoutSeconds).toBe(1800);
  });

  test('resetWorkflowRunToDefaultsAtom restores defaults and clears timeout text', () => {
    const store = getDefaultStore();
    store.set(workflowRunOptionsAtom, {
      ...getWorkflowRunAtomDefaultState().runOptions,
      effort: 'high',
      planId: 'x',
      targetMode: 'plan',
    });
    store.set(workflowRunIterationTimeoutTextAtom, '500');
    store.set(resetWorkflowRunToDefaultsAtom, {
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    });
    expect(store.get(workflowRunIterationTimeoutTextAtom)).toBe('');
    expect(store.get(workflowRunOptionsAtom).effort).toBe('');
    expect(store.get(workflowRunOptionsAtom).planId).toBe(
      'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    );
  });

  test('tuning json atom carries the timeout, and is empty for the worktree-less defaults', () => {
    const store = createStore();
    store.set(resetWorkflowRunToDefaultsAtom, undefined);
    expect(store.get(workflowRunTuningJsonAtom)).toBe('');

    store.set(workflowRunIterationTimeoutTextAtom, '120');
    expect(JSON.parse(store.get(workflowRunTuningJsonAtom))).toMatchObject({
      iterationTimeoutSeconds: 120,
    });
  });

  describe('round-trip through runConfigJson', () => {
    const planId = 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d';

    const seed = (store: ReturnType<typeof createStore>): void => {
      store.set(workflowRunOptionsAtom, {
        ...getWorkflowRunAtomDefaultState({ planId }).runOptions,
        driver: 'claude',
        effort: 'high',
        model: 'opus',
        planId,
        targetMode: 'plan',
        worktreeCleanup: 'keep',
        worktreeName: 'my-tree',
      });
      store.set(workflowRunIterationTimeoutTextAtom, '900');
    };

    test('the run options and the otLoop atom serialize into runConfigJson and hydrate back', () => {
      const store = createStore();
      seed(store);
      store.set(workflowOtLoopAtom, {
        maxRetries: 3,
        validationCommands: ['pnpm nx run a:test'],
      });

      const json = store.get(runConfigJsonAtom);
      const hydrated = hydratePlanRunConfigUiState(planId, json);

      expect(hydrated).toMatchObject({
        iterationTimeoutText: '900',
        otLoop: { maxRetries: 3, validationCommands: ['pnpm nx run a:test'] },
        workflowInput: {
          driver: 'claude',
          effort: 'high',
          model: 'opus',
          worktreeCleanup: 'keep',
          worktreeName: 'my-tree',
        },
      });
    });

    test('never writes a runner key', () => {
      const store = createStore();
      seed(store);

      expect(JSON.parse(store.get(runConfigJsonAtom))).not.toHaveProperty(
        'runner',
      );
    });

    test('reset clears the otLoop block', () => {
      const store = createStore();
      store.set(workflowOtLoopAtom, { maxRetries: 1 });
      store.set(resetWorkflowRunToDefaultsAtom, undefined);

      expect(store.get(workflowOtLoopAtom)).toBeUndefined();
    });
  });
});
