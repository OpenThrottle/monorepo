import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  buildRalphPlanRunTuningInputFromWorkflowRunOptions,
  buildWorkflowRalphDebugBundleText,
  buildWorkflowRalphOptionArgs,
  buildWorkflowRalphTuningDiffLabels,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  getWorkflowRalphUiBaselineForDiff,
  isUuid,
  parseWorkflowRunIterationTimeoutSeconds,
  planRunJobDetailPath,
  validateWorkflowRalphRunOptionsState,
  type WorkflowRalphRunOptionsInput,
} from '../build-workflow-ralph-argv';
import { RalphNestedDebugCli } from '~/__generated__/graphql';

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
  targetMode: 'plan',
  taskId: '',
  ...overrides,
});

const baseTaskInput = (
  overrides: Partial<WorkflowRalphRunOptionsInput> = {},
): WorkflowRalphRunOptionsInput => ({
  debugCli: 'omit',
  executionBackend: 'cursor',
  iterationTimeoutSeconds: undefined,
  iterations: DEFAULT_RALPH_ITERATIONS,
  model: DEFAULT_RALPH_MODEL,
  planId: '',
  project: '',
  prompt: DEFAULT_RALPH_PROMPT,
  promptFile: '',
  promptLayer: 'named',
  targetMode: 'task',
  taskId: '6a8bff52-650b-408b-b77b-ad27064cd9d1',
  ...overrides,
});

describe('isCortexUuid', () => {
  test('accepts plausible Cortex UUID v4 strings (trimmed)', () => {
    expect(isUuid('  0c2720a9-920f-4b16-865a-f803eb444e18  ')).toBe(true);
    expect(isUuid('77cb14a0-5eb0-4061-87ea-d618b85e8818')).toBe(true);
  });

  test('rejects non-matching strings', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid('00000000-0000-9000-8000-000000000000')).toBe(false);
  });
});

describe('getDefaultWorkflowRalphRunOptionsInput', () => {
  test('uses plan target when only planId is provided', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    });
    expect(input.targetMode).toBe('plan');
    expect(input.planId).toBe('0c2720a9-920f-4b16-865a-f803eb444e18');
    expect(input.taskId).toBe('');
  });

  test('uses task target when only taskId is provided', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      taskId: '6a8bff52-650b-408b-b77b-ad27064cd9d1',
    });
    expect(input.targetMode).toBe('task');
    expect(input.taskId).toBe('6a8bff52-650b-408b-b77b-ad27064cd9d1');
    expect(input.planId).toBe('');
  });

  test('prefers plan mode when both planId and taskId are set', () => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
      taskId: '6a8bff52-650b-408b-b77b-ad27064cd9d1',
    });
    expect(input.targetMode).toBe('plan');
  });
});

describe('buildWorkflowRalphOptionArgs', () => {
  test('emits --plan with minimal flags when options match CLI defaults', () => {
    expect(buildWorkflowRalphOptionArgs(basePlanInput())).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
    ]);
  });

  test('emits --task for task-centric mode', () => {
    expect(buildWorkflowRalphOptionArgs(baseTaskInput())).toEqual([
      '--task',
      '6a8bff52-650b-408b-b77b-ad27064cd9d1',
    ]);
  });

  test('includes --prompt when prompt differs from default', () => {
    const args = buildWorkflowRalphOptionArgs(
      basePlanInput({ prompt: '/agents/custom' }),
    );
    expect(args).toContain('--prompt');
    expect(args).toContain('/agents/custom');
  });

  test('includes --prompt-file when promptLayer is file', () => {
    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({
          promptFile: 'prompts/x.md',
          promptLayer: 'file',
        }),
      ),
    ).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--prompt-file',
      'prompts/x.md',
    ]);
  });

  test('does not emit --prompt when using prompt-file layer', () => {
    const args = buildWorkflowRalphOptionArgs(
      basePlanInput({
        prompt: '/agents/custom',
        promptFile: 'a.md',
        promptLayer: 'file',
      }),
    );
    expect(args).not.toContain('--prompt');
    expect(args).toContain('--prompt-file');
  });

  test('omits --prompt when prompt is empty or whitespace (same as default)', () => {
    expect(buildWorkflowRalphOptionArgs(basePlanInput({ prompt: '' }))).toEqual(
      ['--plan', '0c2720a9-920f-4b16-865a-f803eb444e18'],
    );
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ prompt: '   ' })),
    ).toEqual(['--plan', '0c2720a9-920f-4b16-865a-f803eb444e18']);
  });

  test('omits --iterations when value is the CLI default (10)', () => {
    const args = buildWorkflowRalphOptionArgs(basePlanInput());
    expect(args).not.toContain('--iterations');
  });

  test('includes --iterations when not default', () => {
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ iterations: 3 })),
    ).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--iterations',
      '3',
    ]);
  });

  test('includes --iteration-timeout only when seconds are at least 1', () => {
    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ iterationTimeoutSeconds: undefined }),
      ),
    ).not.toContain('--iteration-timeout');

    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ iterationTimeoutSeconds: 0 }),
      ),
    ).not.toContain('--iteration-timeout');

    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ iterationTimeoutSeconds: 99.6 }),
      ),
    ).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--iteration-timeout',
      '99',
    ]);
  });

  test('omits --model for default and empty trimmed model', () => {
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ model: 'auto' })),
    ).not.toContain('--model');
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ model: '   ' })),
    ).not.toContain('--model');
  });

  test('includes --model for non-default preset', () => {
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ model: 'gpt-4' })),
    ).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--model',
      'gpt-4',
    ]);
  });

  test('includes --project when non-empty', () => {
    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ project: 'openthrottle-developer' }),
      ),
    ).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--project',
      'openthrottle-developer',
    ]);
  });

  test('maps debug CLI selection to --debug or --verbose', () => {
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ debugCli: 'debug' })),
    ).toContain('--debug');
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ debugCli: 'verbose' })),
    ).toContain('--verbose');
    expect(
      buildWorkflowRalphOptionArgs(basePlanInput({ debugCli: 'omit' })),
    ).toEqual(['--plan', '0c2720a9-920f-4b16-865a-f803eb444e18']);
  });

  test('trims plan and task ids in argv', () => {
    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ planId: '  0c2720a9-920f-4b16-865a-f803eb444e18  ' }),
      )[1],
    ).toBe('0c2720a9-920f-4b16-865a-f803eb444e18');
  });
});

describe('parseWorkflowRunIterationTimeoutSeconds', () => {
  test('returns undefined for empty or invalid', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('')).toBeUndefined();
    expect(parseWorkflowRunIterationTimeoutSeconds('  ')).toBeUndefined();
    expect(parseWorkflowRunIterationTimeoutSeconds('0')).toBeUndefined();
    expect(parseWorkflowRunIterationTimeoutSeconds('x')).toBeUndefined();
  });

  test('returns positive integers', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('1800')).toBe(1800);
    expect(parseWorkflowRunIterationTimeoutSeconds('  99  ')).toBe(99);
  });
});

describe('buildRalphPlanRunTuningInputFromWorkflowRunOptions', () => {
  test('returns undefined when all fields match defaults', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(basePlanInput()),
    ).toBe(undefined);
  });

  test('returns undefined when optional tuning is empty or default (empty prompt, no timeout)', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({
          iterationTimeoutSeconds: undefined,
          model: '   ',
          project: '',
          prompt: '',
        }),
      ),
    ).toBe(undefined);
  });

  test('includes non-default iterations and maps debug CLI', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ debugCli: 'debug', iterations: 3 }),
      ),
    ).toEqual({
      iterations: 3,
      ralphDebugCli: RalphNestedDebugCli.Debug,
    });
  });

  test('maps prompt file layer to GraphQL promptFile', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({
          promptFile: 'docs/p.md',
          promptLayer: 'file',
        }),
      ),
    ).toEqual({ promptFile: 'docs/p.md' });
  });

  test('includes iteration timeout from merged input', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        basePlanInput({ iterationTimeoutSeconds: 120 }),
      ),
    ).toEqual({ iterationTimeoutSeconds: 120 });
  });

  test('ignores task-centric target; only tuning fields matter', () => {
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(
        baseTaskInput({ model: 'gpt-4' }),
      ),
    ).toEqual({ model: 'gpt-4' });
  });
});

/**
 * @description Regression for manual QA Task 3: a second option profile must differ from Task 2’s in both CLI argv and enqueue tuning.
 */
describe('comparing two workflow run option profiles', () => {
  test('argv and tuning differ when switching from model-only to iterations plus verbose', () => {
    const task2Style = basePlanInput({ model: 'fast' });
    const task3Style = basePlanInput({
      debugCli: 'verbose',
      iterations: 3,
      model: DEFAULT_RALPH_MODEL,
    });

    expect(buildWorkflowRalphOptionArgs(task2Style)).not.toEqual(
      buildWorkflowRalphOptionArgs(task3Style),
    );
    expect(buildWorkflowRalphOptionArgs(task2Style)).toContain('--model');
    expect(buildWorkflowRalphOptionArgs(task2Style)).toContain('fast');
    expect(buildWorkflowRalphOptionArgs(task3Style)).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
      '--iterations',
      '3',
      '--verbose',
    ]);

    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(task2Style),
    ).toEqual({ model: 'fast' });
    expect(
      buildRalphPlanRunTuningInputFromWorkflowRunOptions(task3Style),
    ).toEqual({
      iterations: 3,
      ralphDebugCli: RalphNestedDebugCli.Verbose,
    });
  });
});

/**
 * @description Plan scratch QA Task 5: optional fields cleared or minimal must not break argv or enqueue tuning.
 */
describe('edge case: minimal options and empty optional fields', () => {
  test('argv stays minimal when only required target id plus defaults', () => {
    expect(buildWorkflowRalphOptionArgs(basePlanInput())).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
    ]);
  });

  test('invalid iteration timeout text parses to undefined (flag omitted)', () => {
    expect(parseWorkflowRunIterationTimeoutSeconds('0')).toBeUndefined();
    expect(
      buildWorkflowRalphOptionArgs(
        basePlanInput({ iterationTimeoutSeconds: undefined }),
      ),
    ).not.toContain('--iteration-timeout');
  });
});

describe('formatWorkflowRalphCommandLine', () => {
  test('returns bare command when there are no option args', () => {
    expect(formatWorkflowRalphCommandLine([])).toBe('pnpm exec workflow-ralph');
  });

  test('joins argv segments with single spaces', () => {
    expect(
      formatWorkflowRalphCommandLine([
        '--plan',
        '0c2720a9-920f-4b16-865a-f803eb444e18',
        '--iterations',
        '2',
      ]),
    ).toBe(
      'pnpm exec workflow-ralph --plan 0c2720a9-920f-4b16-865a-f803eb444e18 --iterations 2',
    );
  });

  test('quotes args that contain shell-sensitive characters', () => {
    const line = formatWorkflowRalphCommandLine([
      '--prompt',
      '/path with spaces/ralph',
    ]);
    expect(line).toBe(
      "pnpm exec workflow-ralph --prompt '/path with spaces/ralph'",
    );
  });
});

describe('buildWorkflowRalphDebugBundleText', () => {
  test('includes plan id, canonical command, argv segments, and queue path metadata', () => {
    const text = buildWorkflowRalphDebugBundleText({
      iterationTimeoutText: '',
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
      workflowInput: basePlanInput(),
    });
    const parsed = JSON.parse(text) as {
      argvSegments: readonly string[];
      canonicalCommand: string;
      planId: string;
      queue: { jobListPath: string };
    };

    expect(parsed.planId).toBe('0c2720a9-920f-4b16-865a-f803eb444e18');
    expect(parsed.canonicalCommand).toContain('pnpm exec workflow-ralph');
    expect(parsed.argvSegments).toEqual([
      '--plan',
      '0c2720a9-920f-4b16-865a-f803eb444e18',
    ]);
    expect(parsed.queue.jobListPath).toBe('/queues/Plans');
  });
});

describe('getWorkflowRalphUiBaselineForDiff', () => {
  test('preserves target ids while resetting tuning to seeded defaults', () => {
    const input = basePlanInput({
      iterations: 3,
      model: 'fast',
      prompt: '/custom',
    });
    const baseline = getWorkflowRalphUiBaselineForDiff(input);

    expect(baseline.planId).toBe(input.planId);
    expect(baseline.iterations).toBe(DEFAULT_RALPH_ITERATIONS);
    expect(baseline.model).toBe(DEFAULT_RALPH_MODEL);
    expect(baseline.prompt).toBe(DEFAULT_RALPH_PROMPT);
  });
});

describe('buildWorkflowRalphTuningDiffLabels', () => {
  test('returns empty when options match baseline', () => {
    expect(buildWorkflowRalphTuningDiffLabels(basePlanInput(), '')).toEqual([]);
  });

  test('lists iterations when they diverge from defaults', () => {
    const labels = buildWorkflowRalphTuningDiffLabels(
      basePlanInput({ iterations: 3 }),
      '',
    );
    expect(labels.some((l) => l.includes('Iterations'))).toBe(true);
    expect(labels.some((l) => l.includes('3'))).toBe(true);
  });

  test('lists iteration timeout when set', () => {
    const labels = buildWorkflowRalphTuningDiffLabels(basePlanInput(), '120');
    expect(labels.some((l) => l.includes('Iteration timeout'))).toBe(true);
    expect(labels.some((l) => l.includes('120'))).toBe(true);
  });
});

describe('validateWorkflowRalphRunOptionsState', () => {
  test('passes for valid plan-centric defaults', () => {
    expect(
      validateWorkflowRalphRunOptionsState(basePlanInput(), '', {
        requireCliTargetIds: true,
      }),
    ).toEqual({ ok: true });
  });

  test('fails when plan id is not a v4 uuid', () => {
    const result = validateWorkflowRalphRunOptionsState(
      basePlanInput({ planId: 'plan-1' }),
      '',
      { requireCliTargetIds: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }
    expect(result.issues.some((i) => i.code === 'plan_uuid')).toBe(true);
  });

  test('without strict target ids, allows empty plan field (sandbox)', () => {
    expect(
      validateWorkflowRalphRunOptionsState(basePlanInput({ planId: '' }), '', {
        requireCliTargetIds: false,
      }),
    ).toEqual({ ok: true });
  });

  test('fails when iteration-timeout text is non-empty but invalid', () => {
    const result = validateWorkflowRalphRunOptionsState(basePlanInput(), '0', {
      requireCliTargetIds: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }
    expect(result.issues.some((i) => i.code === 'iteration_timeout')).toBe(
      true,
    );
    expect(
      result.issues.find((i) => i.code === 'iteration_timeout')?.message,
    ).toBe('--iteration-timeout must be a positive integer (seconds)');
  });

  test('fails when iterations are below CLI minimum', () => {
    const result = validateWorkflowRalphRunOptionsState(
      basePlanInput({ iterations: 0 }),
      '',
      { requireCliTargetIds: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }
    expect(result.issues.some((i) => i.code === 'iterations')).toBe(true);
    expect(result.issues.find((i) => i.code === 'iterations')?.message).toBe(
      '--iterations must be a positive integer greater than 0',
    );
  });

  test('fails when named prompt and prompt-file path are both set (parser parity)', () => {
    const result = validateWorkflowRalphRunOptionsState(
      basePlanInput({
        prompt: '/agents/custom',
        promptFile: 'x.md',
        promptLayer: 'named',
      }),
      '',
      { requireCliTargetIds: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }
    expect(result.issues.some((i) => i.code === 'prompt_conflict')).toBe(true);
  });

  test('fails in task mode when task id is empty', () => {
    const result = validateWorkflowRalphRunOptionsState(
      baseTaskInput({ taskId: '' }),
      '',
      { requireCliTargetIds: true },
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation failure');
    }
    expect(result.issues.some((i) => i.code === 'task_required')).toBe(true);
  });
});

describe('planRunJobDetailPath', () => {
  test('encodes queue name and job id for the developer portal route', () => {
    expect(planRunJobDetailPath('ralph-orch:abc')).toBe(
      '/queues/Plans/ralph-orch%3Aabc',
    );
  });
});
