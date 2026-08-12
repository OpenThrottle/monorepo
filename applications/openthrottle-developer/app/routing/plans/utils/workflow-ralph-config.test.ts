import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  formatWorkflowRalphExecutionBackendLabel,
  getDefaultWorkflowRalphRunOptionsInput,
  getWorkflowRalphUiBaselineForDiff,
  isUuid,
  parseWorkflowRunIterationTimeoutSeconds,
} from './workflow-ralph-config';

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

describe('parseWorkflowRunIterationTimeoutSeconds', () => {
  test('returns undefined for an empty string', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('')).toBeUndefined();
  });

  test('returns undefined for whitespace-only input', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('   ')).toBeUndefined();
  });

  test('parses a positive integer string', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('120')).toBe(120);
  });

  test('trims surrounding whitespace before parsing', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('  45  ')).toBe(45);
  });

  test('returns undefined for a non-numeric string', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('abc')).toBeUndefined();
  });

  test('returns undefined for zero or negative values', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('0')).toBeUndefined();
    expect(parseWorkflowRunIterationTimeoutSeconds('-5')).toBeUndefined();
  });
});

describe('formatWorkflowRalphExecutionBackendLabel', () => {
  test('labels claude', () => {
    expect(formatWorkflowRalphExecutionBackendLabel('claude')).toBe(
      'Claude Code CLI',
    );
  });

  test('labels cursor', () => {
    expect(formatWorkflowRalphExecutionBackendLabel('cursor')).toBe(
      'Cursor (cursor-agent)',
    );
  });

  test('renders an em dash for null', () => {
    expect(formatWorkflowRalphExecutionBackendLabel(null)).toBe('—');
  });

  test('renders an em dash for undefined', () => {
    expect(formatWorkflowRalphExecutionBackendLabel(undefined)).toBe('—');
  });

  test('renders an em dash for an empty string', () => {
    expect(formatWorkflowRalphExecutionBackendLabel('')).toBe('—');
  });

  test('passes through an unrecognized backend id unchanged', () => {
    expect(formatWorkflowRalphExecutionBackendLabel('codex')).toBe('codex');
  });
});

describe('getDefaultWorkflowRalphRunOptionsInput', () => {
  test('seeds plan target mode when only planId is given', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: 'plan-1',
    });

    expect(input.targetMode).toBe('plan');
    expect(input.planId).toBe('plan-1');
    expect(input.taskId).toBe('');
  });

  test('seeds task target mode when only taskId is given', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      taskId: 'task-1',
    });

    expect(input.targetMode).toBe('task');
    expect(input.taskId).toBe('task-1');
    expect(input.planId).toBe('');
  });

  test('prefers plan target mode when both ids are given', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: 'plan-1',
      taskId: 'task-1',
    });

    expect(input.targetMode).toBe('plan');
  });

  test('defaults to plan target mode with empty ids when no options are given', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput();

    expect(input.targetMode).toBe('plan');
    expect(input.planId).toBe('');
    expect(input.taskId).toBe('');
  });

  test('trims whitespace from the seeded planId and taskId', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: '  plan-1  ',
    });

    expect(input.planId).toBe('plan-1');
  });

  test('fills in the remaining CLI-aligned defaults', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput();

    expect(input.debugCli).toBe('omit');
    expect(input.executionBackend).toBe('cursor');
    expect(input.iterationTimeoutSeconds).toBeUndefined();
    expect(input.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(input.model).toBe(DEFAULT_RALPH_MODEL);
    expect(input.prompt).toBe(DEFAULT_RALPH_PROMPT);
    expect(input.promptLayer).toBe('named');
    expect(input.skipWorktreeSetup).toBe(false);
    expect(input.worktreeCli).toBe('omit');
  });
});

describe('getWorkflowRalphUiBaselineForDiff', () => {
  test('resets tuning fields while preserving the plan/task target', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: 'plan-1',
    });
    const customized = {
      ...input,
      executionBackend: 'claude' as const,
      iterations: 25,
      model: 'gpt-5',
      prompt: 'custom-prompt',
    };

    const baseline = getWorkflowRalphUiBaselineForDiff(customized);

    expect(baseline.planId).toBe('plan-1');
    expect(baseline.targetMode).toBe('plan');
    expect(baseline.taskId).toBe('');
    expect(baseline.executionBackend).toBe('cursor');
    expect(baseline.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(baseline.model).toBe(DEFAULT_RALPH_MODEL);
    expect(baseline.prompt).toBe(DEFAULT_RALPH_PROMPT);
  });

  test('preserves task target mode for a task-targeted input', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      taskId: 'task-1',
    });

    const baseline = getWorkflowRalphUiBaselineForDiff(input);

    expect(baseline.targetMode).toBe('task');
    expect(baseline.taskId).toBe('task-1');
    expect(baseline.planId).toBe('');
  });
});
