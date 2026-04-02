import { describe, expect, test } from 'vitest';
import {
  RalphNestedDebugCliGraphQL,
  type RalphPlanRunTuningInput,
} from './plan.input';
import {
  buildRunPlanJobData,
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
