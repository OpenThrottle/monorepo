import { describe, expect, test } from 'vitest';

import {
  DEFAULT_RUN_MODEL,
  formatPlanRunDriverLabel,
  getDefaultPlanRunOptions,
  getPlanRunOptionsBaseline,
  isUuid,
  parsePlanRunTimeoutSeconds,
  planRunJobDetailPath,
} from '../plan-run-options';

describe('isUuid', () => {
  test('accepts a well-formed UUID v4', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  test('accepts a UUID with surrounding whitespace', () => {
    expect(isUuid('  123e4567-e89b-42d3-a456-426614174000  ')).toBe(true);
  });

  test('accepts an uppercase UUID', () => {
    expect(isUuid('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
  });

  test('rejects a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(isUuid('')).toBe(false);
  });

  test('rejects a UUID with the wrong version nibble', () => {
    expect(isUuid('123e4567-e89b-92d3-a456-426614174000')).toBe(false);
  });
});

describe('parsePlanRunTimeoutSeconds', () => {
  test('returns undefined for an empty string', () => {
    expect(parsePlanRunTimeoutSeconds('')).toBeUndefined();
  });

  test('returns undefined for whitespace-only input', () => {
    expect(parsePlanRunTimeoutSeconds('   ')).toBeUndefined();
  });

  test('parses a positive integer string', () => {
    expect(parsePlanRunTimeoutSeconds('120')).toBe(120);
  });

  test('trims surrounding whitespace before parsing', () => {
    expect(parsePlanRunTimeoutSeconds('  45  ')).toBe(45);
  });

  test('returns undefined for a non-numeric string', () => {
    expect(parsePlanRunTimeoutSeconds('abc')).toBeUndefined();
  });

  test('returns undefined for zero or negative values', () => {
    expect(parsePlanRunTimeoutSeconds('0')).toBeUndefined();
    expect(parsePlanRunTimeoutSeconds('-5')).toBeUndefined();
  });
});

describe('formatPlanRunDriverLabel', () => {
  test('labels claude', () => {
    expect(formatPlanRunDriverLabel('claude')).toBe('Claude Code CLI');
  });

  test('labels cursor', () => {
    expect(formatPlanRunDriverLabel('cursor')).toBe('Cursor (cursor-agent)');
  });

  test('renders an em dash for null', () => {
    expect(formatPlanRunDriverLabel(null)).toBe('—');
  });

  test('renders an em dash for undefined', () => {
    expect(formatPlanRunDriverLabel(undefined)).toBe('—');
  });

  test('renders an em dash for an empty string', () => {
    expect(formatPlanRunDriverLabel('')).toBe('—');
  });

  test('passes through an unrecognized driver id unchanged', () => {
    expect(formatPlanRunDriverLabel('codex')).toBe('codex');
  });
});

describe('getDefaultPlanRunOptions', () => {
  test('seeds plan target mode when only planId is given', () => {
    const input = getDefaultPlanRunOptions({
      planId: 'plan-1',
    });

    expect(input.targetMode).toBe('plan');
    expect(input.planId).toBe('plan-1');
    expect(input.taskId).toBe('');
  });

  test('seeds task target mode when only taskId is given', () => {
    const input = getDefaultPlanRunOptions({
      taskId: 'task-1',
    });

    expect(input.targetMode).toBe('task');
    expect(input.taskId).toBe('task-1');
    expect(input.planId).toBe('');
  });

  test('prefers plan target mode when both ids are given', () => {
    const input = getDefaultPlanRunOptions({
      planId: 'plan-1',
      taskId: 'task-1',
    });

    expect(input.targetMode).toBe('plan');
  });

  test('defaults to plan target mode with empty ids when no options are given', () => {
    const input = getDefaultPlanRunOptions();

    expect(input.targetMode).toBe('plan');
    expect(input.planId).toBe('');
    expect(input.taskId).toBe('');
  });

  test('trims whitespace from the seeded planId and taskId', () => {
    const input = getDefaultPlanRunOptions({
      planId: '  plan-1  ',
    });

    expect(input.planId).toBe('plan-1');
  });

  test('fills in the remaining defaults', () => {
    const input = getDefaultPlanRunOptions();

    expect(input.driver).toBe('cursor');
    expect(input.iterationTimeoutSeconds).toBeUndefined();
    expect(input.model).toBe(DEFAULT_RUN_MODEL);
    expect(input.effort).toBe('');
    expect(input.worktreeCleanup).toBe('on-pr');
    // A blank name means "derive plan-<short plan id> at enqueue".
    expect(input.worktreeName).toBe('');
  });
});

describe('getPlanRunOptionsBaseline', () => {
  test('resets tuning fields while preserving the plan/task target', () => {
    const input = getDefaultPlanRunOptions({
      planId: 'plan-1',
    });
    const customized = {
      ...input,
      driver: 'claude' as const,
      effort: 'high',
      model: 'gpt-5',
    };

    const baseline = getPlanRunOptionsBaseline(customized);

    expect(baseline.planId).toBe('plan-1');
    expect(baseline.targetMode).toBe('plan');
    expect(baseline.taskId).toBe('');
    expect(baseline.driver).toBe('cursor');
    expect(baseline.effort).toBe('');
    expect(baseline.model).toBe(DEFAULT_RUN_MODEL);
  });

  test('preserves task target mode for a task-targeted input', () => {
    const input = getDefaultPlanRunOptions({
      taskId: 'task-1',
    });

    const baseline = getPlanRunOptionsBaseline(input);

    expect(baseline.targetMode).toBe('task');
    expect(baseline.taskId).toBe('task-1');
    expect(baseline.planId).toBe('');
  });
});

describe('planRunJobDetailPath', () => {
  test('encodes the queue and the job id', () => {
    expect(planRunJobDetailPath(' orch:abc ')).toBe('/queues/Plans/orch%3Aabc');
  });
});
