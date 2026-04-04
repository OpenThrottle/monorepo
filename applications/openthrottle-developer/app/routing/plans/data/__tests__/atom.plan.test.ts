import { getDefaultStore } from 'jotai/vanilla';
import { describe, expect, test } from 'vitest';
import {
  getWorkflowRunAtomDefaultState,
  resetWorkflowRunToDefaultsAtom,
  workflowRalphCanonicalCommandLineAtom,
  workflowRalphMergedRunOptionsForArgvAtom,
  workflowRalphOptionArgsAtom,
  workflowRalphRunOptionsAtom,
  workflowRunIterationTimeoutTextAtom,
} from '~/routing/plans/data/atom.plan';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('workflow run atoms', () => {
  test('getWorkflowRunAtomDefaultState matches getDefaultWorkflowRalphRunOptionsInput + empty timeout text', () => {
    const a = getWorkflowRunAtomDefaultState();
    expect(a.iterationTimeoutText).toBe('');
    expect(a.runOptions.prompt).toBe(DEFAULT_RALPH_PROMPT);
    expect(a.runOptions.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(a.runOptions.model).toBe(DEFAULT_RALPH_MODEL);
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

  test('merged argv atom parses iteration timeout from text atom', () => {
    const store = getDefaultStore();
    store.set(workflowRalphRunOptionsAtom, {
      ...getWorkflowRunAtomDefaultState().runOptions,
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
      targetMode: 'plan',
    });
    store.set(workflowRunIterationTimeoutTextAtom, '  1800  ');
    const merged = store.get(workflowRalphMergedRunOptionsForArgvAtom);
    expect(merged.iterationTimeoutSeconds).toBe(1800);
  });

  test('resetWorkflowRunToDefaultsAtom restores defaults and clears timeout text', () => {
    const store = getDefaultStore();
    store.set(workflowRalphRunOptionsAtom, {
      ...getWorkflowRunAtomDefaultState().runOptions,
      iterations: 99,
      planId: 'x',
      targetMode: 'plan',
    });
    store.set(workflowRunIterationTimeoutTextAtom, '500');
    store.set(resetWorkflowRunToDefaultsAtom, {
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    });
    expect(store.get(workflowRunIterationTimeoutTextAtom)).toBe('');
    expect(store.get(workflowRalphRunOptionsAtom).iterations).toBe(
      DEFAULT_RALPH_ITERATIONS,
    );
    expect(store.get(workflowRalphRunOptionsAtom).planId).toBe(
      'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    );
  });

  test('canonical command line atom reflects merged argv', () => {
    const store = getDefaultStore();
    store.set(resetWorkflowRunToDefaultsAtom, {
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    });
    const line = store.get(workflowRalphCanonicalCommandLineAtom);
    expect(line).toContain('pnpm exec workflow-ralph');
    expect(line).toContain('--plan');
    expect(line).toContain('a203384b-9fa6-4e3b-aef1-9f95f4b9612d');
  });

  test('option args atom includes iteration-timeout segments when timeout text parses', () => {
    const store = getDefaultStore();
    store.set(resetWorkflowRunToDefaultsAtom, {
      planId: 'a203384b-9fa6-4e3b-aef1-9f95f4b9612d',
    });
    store.set(workflowRunIterationTimeoutTextAtom, '120');
    const args = store.get(workflowRalphOptionArgsAtom);
    expect(args).toContain('--iteration-timeout');
    expect(args).toContain('120');
  });
});
