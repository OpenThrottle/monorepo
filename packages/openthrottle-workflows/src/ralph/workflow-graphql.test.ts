import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RalphNestedDebugCli } from '../__generated__/graphql.js';
import type { WorkflowRalphRunOptionsShape } from './contract/index.js';
import {
  WORKFLOW_RALPH_DEFAULT_BACKEND,
  WORKFLOW_RALPH_DEFAULT_ITERATIONS,
  WORKFLOW_RALPH_DEFAULT_MODEL,
  WORKFLOW_RALPH_DEFAULT_PROMPT,
} from './contract/index.js';
import {
  buildRalphFlowContextFromPlanRunTuning,
  buildRalphFlowContextFromRunOptionsShape,
  buildWorkflowExecuteGraphqlV2Options,
  resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning,
} from './workflow-graphql.js';

const INTERNAL_BASE = 'http://localhost:6021';

beforeEach(() => {
  process.env.API_URL_INTERNAL = INTERNAL_BASE;
});

afterEach(() => {
  delete process.env.API_URL_INTERNAL;
});

describe('buildWorkflowExecuteGraphqlV2Options', () => {
  it('uses graphqlUrl override when set', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      graphqlUrl: 'https://custom.example/graphql',
      token: 'abc',
    });

    expect(opts).toEqual({
      token: 'abc',
      url: 'https://custom.example/graphql',
    });
  });

  it('uses getGraphQLUrl when graphqlUrl is unset', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      token: undefined,
    });

    expect(opts).toEqual({ url: `${INTERNAL_BASE}/graphql` });
  });

  it('merges additionalHeaders and token', () => {
    const opts = buildWorkflowExecuteGraphqlV2Options({
      additionalHeaders: { 'X-Custom': '1' },
      token: 'abc',
    });

    expect(opts).toEqual({
      headers: { 'X-Custom': '1' },
      token: 'abc',
      url: `${INTERNAL_BASE}/graphql`,
    });
  });

  it('omits token when undefined or whitespace-only', () => {
    expect(
      buildWorkflowExecuteGraphqlV2Options({
        additionalHeaders: {},
        token: undefined,
      }),
    ).toEqual({ url: `${INTERNAL_BASE}/graphql` });

    expect(
      buildWorkflowExecuteGraphqlV2Options({
        token: '   ',
      }),
    ).toEqual({ url: `${INTERNAL_BASE}/graphql` });
  });

  it('omits headers when additionalHeaders is empty or absent', () => {
    expect(
      buildWorkflowExecuteGraphqlV2Options({
        additionalHeaders: {},
        token: 't',
      }),
    ).toEqual({
      token: 't',
      url: `${INTERNAL_BASE}/graphql`,
    });
  });
});

describe('RalphFlowContext from GraphQL / run options', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  it('resolves defaults from empty tuning (queued plan scope)', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: undefined,
      targetMode: 'plan',
    });

    expect(ctx.kind).toBe('ralph');
    expect(ctx.planId).toBe(planId);
    expect(ctx.targetMode).toBe('plan');
    expect(ctx.mode).toBe('plan');
    expect(ctx.iterations).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(ctx.maxIterations).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(ctx.prompt).toBe(WORKFLOW_RALPH_DEFAULT_PROMPT);
    expect(ctx.model).toBe(WORKFLOW_RALPH_DEFAULT_MODEL);
    expect(ctx.debugCli).toBe('omit');
    expect(ctx.executionBackend).toBe(WORKFLOW_RALPH_DEFAULT_BACKEND);
    expect(ctx.iterationTimeoutSeconds).toBeUndefined();
    expect(ctx.project).toBe('');
    expect(ctx.taskId).toBe('');
  });

  it('maps nested ralph fields and debug enum', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: {
        backend: 'cursor',
        iterationTimeoutSeconds: 120,
        iterations: 3,
        model: 'fast',
        project: 'openthrottle-workflows',
        prompt: '/custom',
        ralphDebugCli: RalphNestedDebugCli.Debug,
      },
      targetMode: 'plan',
    });

    expect(ctx.iterations).toBe(3);
    expect(ctx.maxIterations).toBe(3);
    expect(ctx.iterationTimeoutSeconds).toBe(120);
    expect(ctx.model).toBe('fast');
    expect(ctx.project).toBe('openthrottle-workflows');
    expect(ctx.prompt).toBe('/custom');
    expect(ctx.debugCli).toBe('debug');
    expect(ctx.executionBackend).toBe(WORKFLOW_RALPH_DEFAULT_BACKEND);
  });

  it('applies task maxIterations rule', () => {
    const taskId = 'b56b17b4-b052-44cf-98a6-1c972caca673';
    const shape = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { iterations: 10 },
      targetMode: 'task',
      taskId,
    });

    const ctx = buildRalphFlowContextFromRunOptionsShape(shape);

    expect(shape.iterations).toBe(10);
    expect(ctx.iterations).toBe(10);
    expect(ctx.maxIterations).toBe(1);
    expect(ctx.mode).toBe('task');
    expect(ctx.taskId).toBe(taskId);
  });

  it('maps RalphNestedDebugCli.Verbose to debugCli verbose', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: { ralphDebugCli: RalphNestedDebugCli.Verbose },
      targetMode: 'plan',
    });

    expect(ctx.debugCli).toBe('verbose');
  });

  it('ignores promptFile on tuning (layer-1 argv only; not on RalphFlowContext)', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      planId,
      ralph: {
        prompt: undefined,
        promptFile: '/repo/prompt.md',
      },
      targetMode: 'plan',
    });

    expect(ctx.prompt).toBe(WORKFLOW_RALPH_DEFAULT_PROMPT);
  });
});

describe('resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  it('falls back iterations when value is non-positive or non-integer', () => {
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterations: 0 },
      }).iterations,
    ).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterations: -3 },
      }).iterations,
    ).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterations: 2.5 },
      }).iterations,
    ).toBe(WORKFLOW_RALPH_DEFAULT_ITERATIONS);
  });

  it('drops iterationTimeoutSeconds when not a positive integer', () => {
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: 0 },
      }).iterationTimeoutSeconds,
    ).toBeUndefined();
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: -1 },
      }).iterationTimeoutSeconds,
    ).toBeUndefined();
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: 1.2 },
      }).iterationTimeoutSeconds,
    ).toBeUndefined();
  });

  it('uses default model and prompt for empty or whitespace-only strings', () => {
    const m = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { model: '   ' },
    });
    expect(m.model).toBe(WORKFLOW_RALPH_DEFAULT_MODEL);

    const p = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { prompt: '' },
    });
    expect(p.prompt).toBe(WORKFLOW_RALPH_DEFAULT_PROMPT);
  });

  it('trims planId', () => {
    const shape = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId: `  ${planId}  `,
    });
    expect(shape.planId).toBe(planId);
  });
});

/**
 * @description Mirrors developer `getDefaultWorkflowRalphRunOptionsInput` + typical overrides;
 * fields here are what `buildWorkflowRalphOptionArgs` / CLI read from the UI.
 */
describe('RalphFlowContext argv-equivalent shape (UI → buildRalphFlowContextFromRunOptionsShape)', () => {
  it('round-trips a full WorkflowRalphRunOptionsShape like the plan run form', () => {
    const uiLike: WorkflowRalphRunOptionsShape = {
      debugCli: 'debug',
      executionBackend: WORKFLOW_RALPH_DEFAULT_BACKEND,
      iterationTimeoutSeconds: 90,
      iterations: 7,
      model: 'gpt-4',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      project: 'openthrottle-workflows',
      prompt: '/agents/custom',
      targetMode: 'plan',
      taskId: '',
    };

    const ctx = buildRalphFlowContextFromRunOptionsShape(uiLike);

    expect(ctx).toMatchObject({
      debugCli: 'debug',
      executionBackend: WORKFLOW_RALPH_DEFAULT_BACKEND,
      iterationTimeoutSeconds: 90,
      iterations: 7,
      kind: 'ralph',
      maxIterations: 7,
      mode: 'plan',
      model: 'gpt-4',
      planId: uiLike.planId,
      project: 'openthrottle-workflows',
      prompt: '/agents/custom',
      targetMode: 'plan',
      taskId: '',
    });
  });

  it('task mode keeps iterations for --iterations semantics while maxIterations is 1 for orchestration', () => {
    const taskId = '18142b71-cca2-4242-a4e5-a5b984c7e61d';
    const uiLike: WorkflowRalphRunOptionsShape = {
      debugCli: 'omit',
      executionBackend: WORKFLOW_RALPH_DEFAULT_BACKEND,
      iterationTimeoutSeconds: undefined,
      iterations: 25,
      model: WORKFLOW_RALPH_DEFAULT_MODEL,
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      project: '',
      prompt: WORKFLOW_RALPH_DEFAULT_PROMPT,
      targetMode: 'task',
      taskId,
    };

    const ctx = buildRalphFlowContextFromRunOptionsShape(uiLike);

    expect(ctx.iterations).toBe(25);
    expect(ctx.maxIterations).toBe(1);
    expect(ctx.mode).toBe('task');
    expect(ctx.targetMode).toBe('task');
  });
});
