import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ITERATIONS,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_RUNNER,
} from '../../config/index.js';
import { RalphNestedDebugCli } from '../../__generated__/graphql.js';
import type { WorkflowContext } from '../../types.ts';
import {
  buildRalphFlowContextFromPlanRunTuning,
  buildRalphFlowContextFromRunOptionsShape,
  resolveWorkflowRunOptions,
} from '../context.js';

const PLAN_ID = '0f9e1a94-8d39-4aa7-ada2-2d107d41ab37';
const TASK_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

describe('resolveWorkflowRunOptions', () => {
  it('applies every built-in default when ralph tuning is omitted', () => {
    const context = resolveWorkflowRunOptions({ planId: PLAN_ID });

    expect(context).toMatchObject({
      debug: 'omit',
      iterationMax: DEFAULT_ITERATIONS,
      iterationTimeout: undefined,
      iterations: DEFAULT_ITERATIONS,
      kind: 'ralph',
      mode: 'plan',
      model: DEFAULT_MODEL,
      planId: PLAN_ID,
      project: '',
      prompt: DEFAULT_PROMPT,
      runner: DEFAULT_RUNNER,
      skipWorktreeSetup: undefined,
      taskId: '',
      timeout: undefined,
      worktree: undefined,
      worktreeBase: undefined,
    });
  });

  it('trims the plan id and task id', () => {
    const context = resolveWorkflowRunOptions({
      planId: `  ${PLAN_ID}  `,
      taskId: `  ${TASK_ID}  `,
    });

    expect(context.planId).toBe(PLAN_ID);
    expect(context.taskId).toBe(TASK_ID);
  });

  it('honors an explicit mode', () => {
    const context = resolveWorkflowRunOptions({
      mode: 'task',
      planId: PLAN_ID,
    });

    expect(context.mode).toBe('task');
  });

  it.each([
    [RalphNestedDebugCli.Debug, 'debug'],
    [RalphNestedDebugCli.Omit, 'omit'],
    [RalphNestedDebugCli.Verbose, 'verbose'],
  ] as const)('maps ralphDebugCli %s to debug %s', (raw, expected) => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { ralphDebugCli: raw },
    });

    expect(context.debug).toBe(expected);
  });

  it('defaults debug to omit when ralphDebugCli is absent', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: {},
    });

    expect(context.debug).toBe('omit');
  });

  it('uses DEFAULT_MODEL when model is blank, and trims otherwise', () => {
    expect(
      resolveWorkflowRunOptions({ planId: PLAN_ID, ralph: { model: '   ' } })
        .model,
    ).toBe(DEFAULT_MODEL);

    expect(
      resolveWorkflowRunOptions({
        planId: PLAN_ID,
        ralph: { model: '  gpt-5  ' },
      }).model,
    ).toBe('gpt-5');
  });

  it('uses DEFAULT_PROMPT when prompt is blank, and trims otherwise', () => {
    expect(
      resolveWorkflowRunOptions({ planId: PLAN_ID, ralph: { prompt: '' } })
        .prompt,
    ).toBe(DEFAULT_PROMPT);

    expect(
      resolveWorkflowRunOptions({
        planId: PLAN_ID,
        ralph: { prompt: '  /custom-prompt  ' },
      }).prompt,
    ).toBe('/custom-prompt');
  });

  it('trims project, defaulting to empty string when absent', () => {
    expect(
      resolveWorkflowRunOptions({
        planId: PLAN_ID,
        ralph: { project: '  openthrottle-server  ' },
      }).project,
    ).toBe('openthrottle-server');

    expect(resolveWorkflowRunOptions({ planId: PLAN_ID }).project).toBe('');
  });

  it('trims worktree and worktreeBase, mapping blank to undefined', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: {
        worktree: '  my-worktree  ',
        worktreeBase: '  main  ',
      },
    });

    expect(context.worktree).toBe('my-worktree');
    expect(context.worktreeBase).toBe('main');

    const blank = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { worktree: '   ', worktreeBase: '   ' },
    });

    expect(blank.worktree).toBeUndefined();
    expect(blank.worktreeBase).toBeUndefined();
  });

  it('maps skipWorktreeSetup true to true, and everything else to undefined', () => {
    expect(
      resolveWorkflowRunOptions({
        planId: PLAN_ID,
        ralph: { skipWorktreeSetup: true },
      }).skipWorktreeSetup,
    ).toBe(true);

    expect(
      resolveWorkflowRunOptions({
        planId: PLAN_ID,
        ralph: { skipWorktreeSetup: false },
      }).skipWorktreeSetup,
    ).toBeUndefined();

    expect(
      resolveWorkflowRunOptions({ planId: PLAN_ID }).skipWorktreeSetup,
    ).toBeUndefined();
  });

  it('resolves iterations, mirroring the value onto iterationMax', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterations: 3 },
    });

    expect(context.iterations).toBe(3);
    expect(context.iterationMax).toBe(3);
  });

  it('resolves iterationTimeoutSeconds, mirroring the value onto timeout', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterationTimeoutSeconds: 90 },
    });

    expect(context.iterationTimeout).toBe(90);
    expect(context.timeout).toBe(90);
  });

  it('resolves the execution backend from ralph.backend, falling back to executionBackend', () => {
    expect(
      resolveWorkflowRunOptions({
        executionBackend: 'opencode',
        planId: PLAN_ID,
        ralph: { backend: 'claude' },
      }).runner,
    ).toBe('claude');

    expect(
      resolveWorkflowRunOptions({
        executionBackend: 'opencode',
        planId: PLAN_ID,
      }).runner,
    ).toBe('opencode');
  });
});

describe('buildRalphFlowContextFromRunOptionsShape', () => {
  const baseContext: WorkflowContext = {
    debug: 'omit',
    iterationMax: 8,
    iterationTimeout: 60,
    iterations: 8,
    kind: 'ralph',
    mode: 'plan',
    model: DEFAULT_MODEL,
    planId: PLAN_ID,
    project: 'openthrottle-developer',
    prompt: DEFAULT_PROMPT,
    runner: DEFAULT_RUNNER,
    skipWorktreeSetup: undefined,
    taskId: TASK_ID,
    timeout: 60,
    worktree: 'feature-worktree',
    worktreeBase: 'main',
  };

  it('preserves iterations for plan mode', () => {
    const result = buildRalphFlowContextFromRunOptionsShape(baseContext);

    expect(result.iterations).toBe(8);
    expect(result.mode).toBe('plan');
    expect(result.kind).toBe('ralph');
  });

  it('forces iterations to 1 for task mode', () => {
    const result = buildRalphFlowContextFromRunOptionsShape({
      ...baseContext,
      mode: 'task',
    });

    expect(result.iterations).toBe(1);
    expect(result.mode).toBe('task');
    expect(result.iterationMax).toBe(baseContext.iterationMax);
  });

  it('copies through unrelated fields unchanged', () => {
    const result = buildRalphFlowContextFromRunOptionsShape(baseContext);

    expect(result.planId).toBe(PLAN_ID);
    expect(result.taskId).toBe(TASK_ID);
    expect(result.worktree).toBe('feature-worktree');
    expect(result.worktreeBase).toBe('main');
  });
});

describe('buildRalphFlowContextFromPlanRunTuning', () => {
  it('composes resolveWorkflowRunOptions with the task-mode iteration rule', () => {
    const result = buildRalphFlowContextFromPlanRunTuning({
      mode: 'task',
      planId: PLAN_ID,
      ralph: { iterations: 12 },
      taskId: TASK_ID,
    });

    expect(result.iterations).toBe(1);
    expect(result.mode).toBe('task');
    expect(result.planId).toBe(PLAN_ID);
    expect(result.taskId).toBe(TASK_ID);
  });

  it('keeps plan-mode iterations as resolved', () => {
    const result = buildRalphFlowContextFromPlanRunTuning({
      planId: PLAN_ID,
      ralph: { iterations: 5 },
    });

    expect(result.iterations).toBe(5);
    expect(result.mode).toBe('plan');
  });
});
