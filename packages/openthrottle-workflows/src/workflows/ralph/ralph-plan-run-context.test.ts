import { describe, expect, it } from 'vitest';
import { RalphNestedDebugCli } from '../../__generated__/graphql.js';
import type { WorkflowOptions } from './contract/flow-context.js';
import {
  DEFAULT_RALPH_RUNNER,
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
} from './contract/flow-context.js';
import {
  buildRalphFlowContextFromPlanRunTuning,
  buildRalphFlowContextFromRunOptionsShape,
  resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning,
} from './ralph-plan-run-context.js';

describe('RalphFlowContext from GraphQL / run options', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  it('resolves defaults from empty tuning (queued plan scope)', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
      planId,
      ralph: undefined,
    });

    expect(ctx.kind).toBe('ralph');
    expect(ctx.planId).toBe(planId);
    expect(ctx.mode).toBe('plan');
    expect(ctx.mode).toBe('plan');
    expect(ctx.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(ctx.prompt).toBe(DEFAULT_RALPH_PROMPT);
    expect(ctx.model).toBe(DEFAULT_RALPH_MODEL);
    expect(ctx.debug).toBe('omit');
    expect(ctx.runner).toBe(DEFAULT_RALPH_RUNNER);
    expect(ctx.timeout).toBeUndefined();
    expect(ctx.iterationTimeout).toBeUndefined();
    expect(ctx.iterationMax).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(ctx.project).toBe('');
    expect(ctx.taskId).toBe('');
  });

  it('maps backend claude to runner claude', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
      planId,
      ralph: { backend: 'claude' },
    });

    expect(ctx.runner).toBe('claude');
  });

  it('uses executionBackend when ralph omits backend', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: 'claude',
      mode: 'plan',
      planId,
      ralph: undefined,
    });

    expect(ctx.runner).toBe('claude');
  });

  it('prefers ralph.backend over executionBackend', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: 'claude',
      mode: 'plan',
      planId,
      ralph: { backend: 'cursor' },
    });

    expect(ctx.runner).toBe('cursor');
  });

  it('maps nested ralph fields and debug enum', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
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
    });

    expect(ctx.iterations).toBe(3);
    expect(ctx.iterationMax).toBe(3);
    expect(ctx.timeout).toBe(120);
    expect(ctx.iterationTimeout).toBe(120);
    expect(ctx.model).toBe('fast');
    expect(ctx.project).toBe('openthrottle-workflows');
    expect(ctx.prompt).toBe('/custom');
    expect(ctx.debug).toBe('debug');
    expect(ctx.runner).toBe(DEFAULT_RALPH_RUNNER);
  });

  it('applies task iterations rule', () => {
    const taskId = 'b56b17b4-b052-44cf-98a6-1c972caca673';
    const shape = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      mode: 'task',
      planId,
      ralph: { iterations: 10 },
      taskId,
    });

    const ctx = buildRalphFlowContextFromRunOptionsShape(shape);

    expect(shape.iterations).toBe(10);
    expect(ctx.iterations).toBe(1);
    expect(ctx.mode).toBe('task');
    expect(ctx.taskId).toBe(taskId);
  });

  it('maps RalphNestedDebugCli.Verbose to debug verbose', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
      planId,
      ralph: { ralphDebugCli: RalphNestedDebugCli.Verbose },
    });

    expect(ctx.debug).toBe('verbose');
  });

  it('maps RalphNestedDebugCli.Omit to debug omit', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
      planId,
      ralph: { ralphDebugCli: RalphNestedDebugCli.Omit },
    });

    expect(ctx.debug).toBe('omit');
  });

  it('ignores promptFile on tuning (layer-1 argv only; not on RalphFlowContext)', () => {
    const ctx = buildRalphFlowContextFromPlanRunTuning({
      mode: 'plan',
      planId,
      ralph: {
        prompt: undefined,
        promptFile: '/repo/prompt.md',
      },
    });

    expect(ctx.prompt).toBe(DEFAULT_RALPH_PROMPT);
  });
});

describe('resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  it('falls back iterations when value is non-positive or non-integer', () => {
    const a = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { iterations: 0 },
    });
    expect(a.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(a.iterationMax).toBe(DEFAULT_RALPH_ITERATIONS);

    const b = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { iterations: -3 },
    });
    expect(b.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(b.iterationMax).toBe(DEFAULT_RALPH_ITERATIONS);

    const c = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { iterations: 2.5 },
    });
    expect(c.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(c.iterationMax).toBe(DEFAULT_RALPH_ITERATIONS);
  });

  it('drops iteration timeout when not a positive integer', () => {
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: 0 },
      }).timeout,
    ).toBeUndefined();
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: -1 },
      }).iterationTimeout,
    ).toBeUndefined();
    expect(
      resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
        planId,
        ralph: { iterationTimeoutSeconds: 1.2 },
      }).timeout,
    ).toBeUndefined();
  });

  it('uses default model and prompt for empty or whitespace-only strings', () => {
    const m = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { model: '   ' },
    });
    expect(m.model).toBe(DEFAULT_RALPH_MODEL);

    const p = resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning({
      planId,
      ralph: { prompt: '' },
    });
    expect(p.prompt).toBe(DEFAULT_RALPH_PROMPT);
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
    const uiLike: WorkflowOptions = {
      debug: 'debug',
      iterationMax: 7,
      iterationTimeout: 90,
      iterations: 7,
      mode: 'plan',
      model: 'gpt-4',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      project: 'openthrottle-workflows',
      prompt: '/agents/custom',
      runner: DEFAULT_RALPH_RUNNER,
      taskId: '',
      timeout: 90,
    };

    const ctx = buildRalphFlowContextFromRunOptionsShape(uiLike);

    expect(ctx).toMatchObject({
      debug: 'debug',
      iterationMax: 7,
      iterationTimeout: 90,
      iterations: 7,
      kind: 'ralph',
      mode: 'plan',
      model: 'gpt-4',
      planId: uiLike.planId,
      project: 'openthrottle-workflows',
      prompt: '/agents/custom',
      runner: DEFAULT_RALPH_RUNNER,
      taskId: '',
      timeout: 90,
    });
  });

  it('task mode keeps iterations for --iterations semantics while iterations is 1 for orchestration', () => {
    const taskId = '18142b71-cca2-4242-a4e5-a5b984c7e61d';
    const uiLike: WorkflowOptions = {
      debug: 'omit',
      iterationMax: 25,
      iterationTimeout: 90,
      iterations: 25,
      mode: 'task',
      model: DEFAULT_RALPH_MODEL,
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      project: '',
      prompt: DEFAULT_RALPH_PROMPT,
      runner: DEFAULT_RALPH_RUNNER,
      taskId,
      timeout: undefined,
    };

    const ctx = buildRalphFlowContextFromRunOptionsShape(uiLike);

    expect(uiLike.iterations).toBe(25);
    expect(ctx.iterations).toBe(1);
    expect(ctx.iterationMax).toBe(25);
    expect(ctx.iterationTimeout).toBe(90);
    expect(ctx.mode).toBe('task');
  });
});
