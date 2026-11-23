import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, test } from 'vitest';

import type { PlanRunTuningInput } from '../plan.input.ts';
import {
  buildRunPlanOrchestratorJobData,
  parseEnqueuePlanRunTuning,
  validateWorkingDirectory,
} from './enqueue-plan-run-tuning.utils.ts';

/**
 * @description Creates a temp directory that looks like an Nx workspace root (has nx.json).
 */
const makeNxWorkspaceDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-nx-'));
  writeFileSync(join(dir, 'nx.json'), '{}');
  return dir;
};

const emptyTuningInput = (): PlanRunTuningInput => {
  return {
    debugCli: null,
    driver: null,
    effort: null,
    iterationTimeoutSeconds: null,
    model: null,
    worktreeName: null,
  };
};

describe('parseEnqueuePlanRunTuning', () => {
  test('returns undefined for null or undefined input', () => {
    expect(parseEnqueuePlanRunTuning(undefined)).toBeUndefined();
    expect(parseEnqueuePlanRunTuning(null)).toBeUndefined();
  });

  test('returns undefined when all fields are null or empty', () => {
    expect(parseEnqueuePlanRunTuning(emptyTuningInput())).toBeUndefined();
  });

  test('parses model and omits nullish fields', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        model: 'claude-opus-5',
      }),
    ).toEqual({ model: 'claude-opus-5' });
  });

  test('validates backend with parseWorkflowRunnerId', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        driver: 'cursor',
      }),
    ).toEqual({ driver: 'cursor' });
  });

  test('throws on unknown backend', () => {
    expect(() =>
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        driver: 'unknown-backend',
      }),
    ).toThrow(/Unknown driver/);
  });

  test('parses the agent timeout and rejects one out of range', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        iterationTimeoutSeconds: 90,
      }),
    ).toEqual({ iterationTimeoutSeconds: 90 });
    expect(() =>
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        iterationTimeoutSeconds: 0,
      }),
    ).toThrow(/tuning\.iterationTimeoutSeconds/);
  });

  test('maps debugCli from GraphQL enum to nested debug', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        debugCli: 'debug',
      }),
    ).toEqual({ debug: 'debug' });
  });

  test('normalizes legacy uppercase debugCli to nested debug', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase debugCli simulates untyped persisted/CLI data
        debugCli: 'DEBUG',
      }),
    ).toEqual({ debug: 'debug' });
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase debugCli simulates untyped persisted/CLI data
        debugCli: 'VERBOSE',
      }),
    ).toEqual({ debug: 'verbose' });
  });

  test('keeps an explicit omit so the verbose default cannot override it', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        debugCli: 'omit',
      }),
    ).toEqual({ debug: 'omit' });
  });

  test('omits debug when debugCli is unknown', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase debugCli simulates untyped persisted/CLI data
        debugCli: 'DEBUGG',
      }),
    ).toBeUndefined();
  });

  test.each(['low', 'medium', 'high', 'extraHigh', 'max', 'ultra'])(
    'accepts the chat-vocabulary effort level %s',
    (effort) => {
      expect(
        parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort }),
      ).toEqual({ effort });
    },
  );

  test('trims effort whitespace', () => {
    expect(
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: '  high ' }),
    ).toEqual({ effort: 'high' });
  });

  test('rejects an unrecognized effort level naming the accepted set', () => {
    expect(() =>
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: 'turbo' }),
    ).toThrow(
      'tuning.effort must be one of: extraHigh, high, low, max, medium, ultra',
    );
  });

  test('rejects a wrong-case effort level (vocabulary is case-sensitive like chat)', () => {
    expect(() =>
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: 'EXTRAHIGH' }),
    ).toThrow(/tuning\.effort must be one of/);
  });

  test('omitted, null, or blank effort is a no-op', () => {
    expect(
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: undefined }),
    ).toBeUndefined();
    expect(
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: null }),
    ).toBeUndefined();
    expect(
      parseEnqueuePlanRunTuning({ ...emptyTuningInput(), effort: '   ' }),
    ).toBeUndefined();
  });

  test('parses the worktree name override', () => {
    expect(
      parseEnqueuePlanRunTuning({
        ...emptyTuningInput(),
        worktreeName: 'target-one',
      }),
    ).toEqual({ worktreeName: 'target-one' });
  });
});

const SAMPLE_PLAN_ID = '80864bba-630a-451d-bfd2-4b25ec202381';
const SAMPLE_TASK_ID = '45a30762-92a9-42f4-90e0-2437c7ef26a8';

describe('buildRunPlanOrchestratorJobData', () => {
  test('threads effort into orchestrator job data', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: { ...emptyTuningInput(), effort: 'extraHigh' },
      }).tuning?.effort,
    ).toBe('extraHigh');
  });

  test('omits effort from job data when not supplied', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: emptyTuningInput(),
      }).tuning,
    ).not.toHaveProperty('effort');
  });

  test('rejects an unknown effort level before building job data', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: { ...emptyTuningInput(), effort: 'turbo' },
      }),
    ).toThrow(/tuning\.effort must be one of/);
  });

  test('returns orchestrator payload for plan scope (minimal)', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: null,
      }),
    ).toEqual({
      driver: 'cursor',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      tuning: { debug: 'verbose', worktreeName: 'plan-80864bba' },
    });
  });

  test('lets an explicit debug opt-out survive the verbose default', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: { ...emptyTuningInput(), debugCli: 'omit' },
      }),
    ).toEqual({
      driver: 'cursor',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      tuning: { debug: 'omit', worktreeName: 'plan-80864bba' },
    });
  });

  test('does not overwrite an explicit backend', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: { ...emptyTuningInput(), driver: 'claude' },
      }),
    ).toMatchObject({ driver: 'claude' });
  });

  test('includes explicit plan mode when requested', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        mode: 'plan',
        planId: SAMPLE_PLAN_ID,
        tuning: null,
      }),
    ).toEqual({
      driver: 'cursor',
      mode: 'plan',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      tuning: { debug: 'verbose', worktreeName: 'plan-80864bba' },
    });
  });

  test('includes task scope when mode is task', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        mode: 'task',
        planId: SAMPLE_PLAN_ID,
        taskId: SAMPLE_TASK_ID,
        tuning: null,
      }),
    ).toEqual({
      driver: 'cursor',
      mode: 'task',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      taskId: SAMPLE_TASK_ID,
      tuning: { debug: 'verbose', worktreeName: 'plan-80864bba' },
    });
  });

  test('includes worktree tuning for orchestrator path', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: {
          ...emptyTuningInput(),
          worktreeName: 'target-two',
        },
      }),
    ).toEqual({
      driver: 'cursor',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      tuning: {
        debug: 'verbose',
        worktreeName: 'target-two',
      },
    });
  });

  test('throws when planId is not a valid UUID', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({ planId: 'nope', tuning: null }),
    ).toThrow(/planId must be a valid OpenThrottle UUID/);
  });

  test('throws when mode is task but taskId is missing', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({
        mode: 'task',
        planId: SAMPLE_PLAN_ID,
        taskId: null,
        tuning: null,
      }),
    ).toThrow(/taskId is required when mode is task/);
  });

  test('throws when taskId is set without task mode', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        taskId: SAMPLE_TASK_ID,
        tuning: null,
      }),
    ).toThrow(/taskId is only allowed when mode is task/);
  });

  test('includes workingDirectory when provided', () => {
    const tempDir = makeNxWorkspaceDir();
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        tuning: null,
        workingDirectory: tempDir,
      }),
    ).toEqual({
      driver: 'cursor',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      tuning: { debug: 'verbose', worktreeName: 'plan-80864bba' },
      workingDirectory: tempDir,
    });
  });

  test('omits workingDirectory when null', () => {
    const result = buildRunPlanOrchestratorJobData({
      planId: SAMPLE_PLAN_ID,
      tuning: null,
      workingDirectory: null,
    });
    expect(result).not.toHaveProperty('workingDirectory');
  });
});

describe('validateWorkingDirectory', () => {
  test('returns undefined for null, undefined, or empty string', () => {
    expect(validateWorkingDirectory(null)).toBeUndefined();
    expect(validateWorkingDirectory(undefined)).toBeUndefined();
    expect(validateWorkingDirectory('')).toBeUndefined();
    expect(validateWorkingDirectory('   ')).toBeUndefined();
  });

  test('returns trimmed path for an existing directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ot-test-'));
    expect(validateWorkingDirectory(`  ${tempDir}  `)).toBe(tempDir);
  });

  test('throws for a relative path', () => {
    expect(() => validateWorkingDirectory('relative/path')).toThrow(
      /must be an absolute path/,
    );
  });

  test('throws for a non-existent path', () => {
    expect(() =>
      validateWorkingDirectory('/does/not/exist/ot-test-9999'),
    ).toThrow(/does not exist/);
  });

  test('throws for a file instead of a directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ot-test-'));
    const filePath = join(tempDir, 'somefile.txt');
    writeFileSync(filePath, 'test');
    expect(() => validateWorkingDirectory(filePath)).toThrow(/not a directory/);
  });

  test('throws for excessively long paths', () => {
    const longPath = '/' + 'a'.repeat(5000);
    expect(() => validateWorkingDirectory(longPath)).toThrow(
      /at most 4096 characters/,
    );
  });
});
