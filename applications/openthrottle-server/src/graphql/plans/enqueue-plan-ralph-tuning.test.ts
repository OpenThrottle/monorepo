import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import type { RalphPlanRunTuningInput } from './plan.input';
import {
  buildRunPlanOrchestratorJobData,
  parseEnqueueRalphTuning,
  ralphTuningForChildJob,
  validateWorkingDirectory,
} from './enqueue-plan-ralph-tuning';

/**
 * @description Creates a temp directory that looks like an Nx workspace root (has nx.json).
 */
const makeNxWorkspaceDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-nx-'));
  writeFileSync(join(dir, 'nx.json'), '{}');
  return dir;
};

const emptyTuningInput = (): RalphPlanRunTuningInput => ({
  backend: null,
  disableWorktree: null,
  iterationTimeoutSeconds: null,
  iterations: null,
  model: null,
  project: null,
  prompt: null,
  promptFile: null,
  ralphDebugCli: null,
  skipWorktreeSetup: null,
  worktree: null,
  worktreeBase: null,
});

describe('parseEnqueueRalphTuning', () => {
  test('returns undefined for null or undefined input', () => {
    expect(parseEnqueueRalphTuning(undefined)).toBeUndefined();
    expect(parseEnqueueRalphTuning(null)).toBeUndefined();
  });

  test('returns undefined when all fields are null or empty', () => {
    expect(parseEnqueueRalphTuning(emptyTuningInput())).toBeUndefined();
  });

  test('parses iterations and omits nullish fields', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        iterations: 7,
      }),
    ).toEqual({ iterations: 7 });
  });

  test('validates backend with parseWorkflowRunnerId', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        backend: 'cursor',
      }),
    ).toEqual({ backend: 'cursor' });
  });

  test('throws on unknown backend', () => {
    expect(() =>
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        backend: 'unknown-backend',
      }),
    ).toThrow(/Unknown execution backend/);
  });

  test('throws on iterations out of range', () => {
    expect(() =>
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        iterations: 0,
      }),
    ).toThrow(/ralph\.iterations/);
    expect(() =>
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        iterations: 2_000_000,
      }),
    ).toThrow(/ralph\.iterations/);
  });

  test('maps ralphDebugCli from GraphQL enum to nested debug', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        ralphDebugCli: 'debug',
      }),
    ).toEqual({ debug: 'debug' });
  });

  test('normalizes legacy uppercase ralphDebugCli to nested debug', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase ralphDebugCli simulates untyped persisted/CLI data
        ralphDebugCli: 'DEBUG',
      }),
    ).toEqual({ debug: 'debug' });
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase ralphDebugCli simulates untyped persisted/CLI data
        ralphDebugCli: 'VERBOSE',
      }),
    ).toEqual({ debug: 'verbose' });
  });

  test('keeps an explicit omit so the verbose default cannot override it', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        ralphDebugCli: 'omit',
      }),
    ).toEqual({ debug: 'omit' });
  });

  test('omits debug when ralphDebugCli is unknown', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        // @ts-expect-error legacy uppercase ralphDebugCli simulates untyped persisted/CLI data
        ralphDebugCli: 'DEBUGG',
      }),
    ).toBeUndefined();
  });

  test('ralphTuningForChildJob normalizes legacy uppercase debug on job payload', () => {
    expect(
      ralphTuningForChildJob(
        // @ts-expect-error -- simulates a legacy persisted uppercase debug value outside WorkflowConfigDebug
        { debug: 'DEBUG', iterations: 2 },
      ),
    ).toEqual({ iterations: 2, ralphDebugCli: 'debug' });
    expect(
      ralphTuningForChildJob(
        // @ts-expect-error -- simulates a legacy persisted uppercase debug value outside WorkflowConfigDebug
        { debug: 'VERBOSE' },
      ),
    ).toEqual({
      ralphDebugCli: 'verbose',
    });
  });

  test('parses worktree tuning for nested argv and orchestrator', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        skipWorktreeSetup: true,
        worktree: 'target-one',
        worktreeBase: 'main',
      }),
    ).toEqual({
      skipWorktreeSetup: true,
      worktree: 'target-one',
      worktreeBase: 'main',
    });
  });
});

const SAMPLE_PLAN_ID = '80864bba-630a-451d-bfd2-4b25ec202381';
const SAMPLE_TASK_ID = '45a30762-92a9-42f4-90e0-2437c7ef26a8';

describe('buildRunPlanOrchestratorJobData', () => {
  test('returns orchestrator payload for plan scope (minimal)', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: null,
      }),
    ).toEqual({
      executionBackend: 'cursor',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
      runKind: 'orchestrator',
    });
  });

  test('lets an explicit opt-out run without a worktree', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: { ...emptyTuningInput(), disableWorktree: true },
      }),
    ).toEqual({
      executionBackend: 'cursor',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'verbose' },
      runKind: 'orchestrator',
    });
  });

  test('lets an explicit debug opt-out survive the verbose default', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: { ...emptyTuningInput(), ralphDebugCli: 'omit' },
      }),
    ).toEqual({
      executionBackend: 'cursor',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'omit', worktree: 'plan-80864bba' },
      runKind: 'orchestrator',
    });
  });

  test('does not overwrite an explicit backend', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: { ...emptyTuningInput(), backend: 'claude' },
      }),
    ).toMatchObject({ executionBackend: 'claude' });
  });

  test('includes explicit plan mode when requested', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        mode: 'plan',
        planId: SAMPLE_PLAN_ID,
        ralph: null,
      }),
    ).toEqual({
      executionBackend: 'cursor',
      mode: 'plan',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
      runKind: 'orchestrator',
    });
  });

  test('includes task scope when mode is task', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        mode: 'task',
        planId: SAMPLE_PLAN_ID,
        ralph: null,
        taskId: SAMPLE_TASK_ID,
      }),
    ).toEqual({
      executionBackend: 'cursor',
      mode: 'task',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
      runKind: 'orchestrator',
      taskId: SAMPLE_TASK_ID,
    });
  });

  test('includes worktree tuning for orchestrator path', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: {
          ...emptyTuningInput(),
          worktree: 'target-two',
          worktreeBase: 'develop',
        },
      }),
    ).toEqual({
      executionBackend: 'cursor',
      planId: SAMPLE_PLAN_ID,
      ralph: {
        debug: 'verbose',
        worktree: 'target-two',
        worktreeBase: 'develop',
      },
      runKind: 'orchestrator',
    });
  });

  test('throws when planId is not a valid UUID', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({ planId: 'nope', ralph: null }),
    ).toThrow(/planId must be a valid OpenThrottle UUID/);
  });

  test('throws when mode is task but taskId is missing', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({
        mode: 'task',
        planId: SAMPLE_PLAN_ID,
        ralph: null,
        taskId: null,
      }),
    ).toThrow(/taskId is required when mode is task/);
  });

  test('throws when taskId is set without task mode', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: null,
        taskId: SAMPLE_TASK_ID,
      }),
    ).toThrow(/taskId is only allowed when mode is task/);
  });

  test('includes workingDirectory when provided', () => {
    const tempDir = makeNxWorkspaceDir();
    expect(
      buildRunPlanOrchestratorJobData({
        planId: SAMPLE_PLAN_ID,
        ralph: null,
        workingDirectory: tempDir,
      }),
    ).toEqual({
      executionBackend: 'cursor',
      planId: SAMPLE_PLAN_ID,
      ralph: { debug: 'verbose', worktree: 'plan-80864bba' },
      runKind: 'orchestrator',
      workingDirectory: tempDir,
    });
  });

  test('omits workingDirectory when null', () => {
    const result = buildRunPlanOrchestratorJobData({
      planId: SAMPLE_PLAN_ID,
      ralph: null,
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
