import { RalphNestedDebugCli } from '@openthrottle/openthrottle-developer-codegen';
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  WORKFLOW_RALPH_CONFIG_PRECEDENCE,
  type WorkflowRalphRunOptionsInput,
} from '../workflow-ralph-config';
import {
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
  buildWorkflowRalphDebugBundleText,
} from '../workflow-ralph-tuning';

const basePlanInput = (
  overrides: Partial<WorkflowRalphRunOptionsInput> = {},
): WorkflowRalphRunOptionsInput => ({
  debugCli: 'omit',
  executionBackend: 'cursor',
  iterationTimeoutSeconds: undefined,
  iterations: DEFAULT_RALPH_ITERATIONS,
  model: DEFAULT_RALPH_MODEL,
  planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
  project: '',
  prompt: DEFAULT_RALPH_PROMPT,
  promptFile: '',
  promptLayer: 'named',
  skipWorktreeSetup: false,
  targetMode: 'plan',
  taskId: '',
  worktreeBase: '',
  worktreeCli: 'omit',
  worktreeName: '',
  ...overrides,
});

describe('buildRalphPlanRunTuningInputFromWorkflowRunOptions', () => {
  test('returns undefined when every field matches worktree/CLI defaults', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(basePlanInput()),
    ).toBeUndefined();
  });

  test('sets backend when it differs from the default runner', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ executionBackend: 'claude' }),
      ),
    ).toEqual({ backend: 'claude' });
  });

  test('sets iterations when it differs from the default', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ iterations: 5 }),
      ),
    ).toEqual({ iterations: 5 });
  });

  test('sets a floored iterationTimeoutSeconds when >= 1', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ iterationTimeoutSeconds: 90.7 }),
      ),
    ).toEqual({ iterationTimeoutSeconds: 90 });
  });

  test('omits iterationTimeoutSeconds when below 1 or unset', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ iterationTimeoutSeconds: 0 }),
      ),
    ).toBeUndefined();
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ iterationTimeoutSeconds: undefined }),
      ),
    ).toBeUndefined();
  });

  test('sets a trimmed model when it differs from the default', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ model: '  gpt-5  ' }),
      ),
    ).toEqual({ model: 'gpt-5' });
  });

  test('omits model when blank or the default', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ model: '   ' }),
      ),
    ).toBeUndefined();
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ model: DEFAULT_RALPH_MODEL }),
      ),
    ).toBeUndefined();
  });

  test('sets a trimmed project when non-blank', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ project: '  my-project  ' }),
      ),
    ).toEqual({ project: 'my-project' });
  });

  test('sets promptFile when promptLayer is file and the path is non-blank', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({
          promptFile: '  prompts/custom.md  ',
          promptLayer: 'file',
        }),
      ),
    ).toEqual({ promptFile: 'prompts/custom.md' });
  });

  test('omits promptFile when promptLayer is file but the path is blank', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ promptFile: '   ', promptLayer: 'file' }),
      ),
    ).toBeUndefined();
  });

  test('sets a trimmed prompt when it differs from the default (named layer)', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ prompt: '  /custom-prompt  ' }),
      ),
    ).toEqual({ prompt: '/custom-prompt' });
  });

  test('omits prompt when blank or the default (named layer)', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ prompt: '   ' }),
      ),
    ).toBeUndefined();
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ prompt: DEFAULT_RALPH_PROMPT }),
      ),
    ).toBeUndefined();
  });

  test('sets worktree to a named value distinct from the flag-only sentinel', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ worktreeCli: 'named', worktreeName: 'feature-x' }),
      ),
    ).toEqual({ worktree: 'feature-x' });
  });

  test('omits worktree for flag-only (matches the sentinel) and omit modes', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ worktreeCli: 'flag-only' }),
      ),
    ).toBeUndefined();
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ worktreeCli: 'omit' }),
      ),
    ).toBeUndefined();
  });

  test('includes worktreeBase and skipWorktreeSetup only for the cursor backend', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({
          executionBackend: 'cursor',
          skipWorktreeSetup: true,
          worktreeBase: '  worktrees/base  ',
        }),
      ),
    ).toEqual({ skipWorktreeSetup: true, worktreeBase: 'worktrees/base' });
  });

  test('ignores worktreeBase and skipWorktreeSetup for a non-cursor backend', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({
          executionBackend: 'claude',
          skipWorktreeSetup: true,
          worktreeBase: 'worktrees/base',
        }),
      ),
    ).toEqual({ backend: 'claude' });
  });

  test('maps debugCli debug and verbose to RalphNestedDebugCli', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ debugCli: 'debug' }),
      ),
    ).toEqual({ ralphDebugCli: RalphNestedDebugCli.Debug });
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ debugCli: 'verbose' }),
      ),
    ).toEqual({ ralphDebugCli: RalphNestedDebugCli.Verbose });
  });

  test('omits ralphDebugCli when debugCli is omit', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ debugCli: 'omit' }),
      ),
    ).toBeUndefined();
  });

  test('combines multiple non-default fields into one tuning object', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ debugCli: 'debug', iterations: 3, model: 'gpt-5' }),
      ),
    ).toEqual({
      iterations: 3,
      model: 'gpt-5',
      ralphDebugCli: RalphNestedDebugCli.Debug,
    });
  });
});

describe('buildWorkflowRalphDebugBundleText', () => {
  test('builds a JSON bundle with argv, canonical command, and queue metadata', () => {
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    const text = buildWorkflowRalphDebugBundleText({
      iterationTimeoutText: '',
      planId,
      workflowInput: basePlanInput({ planId }),
    });

    expect(text.endsWith('\n')).toBe(true);

    const payload: {
      argvSegments: string[];
      canonicalCommand: string;
      cliPreview: { targetMode: string };
      enqueueRalphTuning: unknown;
      planId: string;
      precedence: string;
      queue: { jobListPath: string; name: string };
      taskId: string | undefined;
    } = JSON.parse(text);

    expect(payload.planId).toBe(planId);
    expect(payload.precedence).toBe(WORKFLOW_RALPH_CONFIG_PRECEDENCE);
    expect(payload.argvSegments).toEqual(['--plan', planId]);
    expect(payload.canonicalCommand).toBe(
      `pnpm exec workflow-ralph --plan ${planId}`,
    );
    expect(payload.cliPreview.targetMode).toBe('plan');
    expect(payload.enqueueRalphTuning).toBeNull();
    expect(payload.queue).toEqual({
      jobListPath: `/queues/${PLAN_RUN_BULLMQ_QUEUE_NAME}`,
      name: PLAN_RUN_BULLMQ_QUEUE_NAME,
    });
    expect(payload.taskId).toBeUndefined();
  });

  test('parses the iteration timeout text and merges it into the argv and tuning', () => {
    const planId = '0c2720a9-920f-4b16-865a-f803eb444e18';
    const text = buildWorkflowRalphDebugBundleText({
      iterationTimeoutText: '45',
      planId,
      workflowInput: basePlanInput({ planId }),
    });

    const payload: {
      argvSegments: string[];
      enqueueRalphTuning: { iterationTimeoutSeconds: number } | null;
    } = JSON.parse(text);

    expect(payload.argvSegments).toContain('--iteration-timeout');
    expect(payload.argvSegments).toContain('45');
    expect(payload.enqueueRalphTuning).toEqual({
      iterationTimeoutSeconds: 45,
    });
  });

  test('includes taskId in the payload when targeting a task with a non-blank taskId', () => {
    const taskId = '6a8bff52-650b-408b-b77b-ad27064cd9d1';
    const text = buildWorkflowRalphDebugBundleText({
      iterationTimeoutText: '',
      planId: '',
      workflowInput: basePlanInput({
        planId: '',
        targetMode: 'task',
        taskId: `  ${taskId}  `,
      }),
    });

    const payload: { taskId: string | undefined } = JSON.parse(text);
    expect(payload.taskId).toBe(taskId);
  });
});
