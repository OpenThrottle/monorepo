import { describe, expect, test } from 'vitest';
import {
  RalphNestedDebugCliGraphQL,
  type RalphPlanRunTuningInput,
} from './plan.input';
import {
  buildRunPlanJobData,
  buildRunPlanOrchestratorJobData,
  parseEnqueueRalphTuning,
} from './enqueue-plan-ralph-tuning';

const emptyTuningInput = (): RalphPlanRunTuningInput => ({
  backend: null,
  iterationTimeoutSeconds: null,
  iterations: null,
  model: null,
  project: null,
  prompt: null,
  promptFile: null,
  ralphDebugCli: null,
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

  test('validates backend with parseRalphExecutionBackendId', () => {
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

  test('maps ralphDebugCli from GraphQL enum', () => {
    expect(
      parseEnqueueRalphTuning({
        ...emptyTuningInput(),
        ralphDebugCli: RalphNestedDebugCliGraphQL.debug,
      }),
    ).toEqual({ ralphDebugCli: 'debug' });
  });
});

describe('buildRunPlanJobData', () => {
  test('returns only planId when ralph is omitted', () => {
    expect(buildRunPlanJobData({ planId: 'p1', ralph: null })).toEqual({
      planId: 'p1',
    });
  });

  test('includes ralph when tuning is present', () => {
    expect(
      buildRunPlanJobData({
        planId: 'p1',
        ralph: {
          ...emptyTuningInput(),
          iterations: 2,
        },
      }),
    ).toEqual({
      planId: 'p1',
      ralph: { iterations: 2 },
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
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
    });
  });

  test('includes explicit plan mode when requested', () => {
    expect(
      buildRunPlanOrchestratorJobData({
        mode: 'plan',
        planId: SAMPLE_PLAN_ID,
        ralph: null,
      }),
    ).toEqual({
      mode: 'plan',
      planId: SAMPLE_PLAN_ID,
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
      mode: 'task',
      planId: SAMPLE_PLAN_ID,
      runKind: 'orchestrator',
      taskId: SAMPLE_TASK_ID,
    });
  });

  test('throws when planId is not a valid UUID', () => {
    expect(() =>
      buildRunPlanOrchestratorJobData({ planId: 'nope', ralph: null }),
    ).toThrow(/planId must be a valid Cortex UUID/);
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
});
