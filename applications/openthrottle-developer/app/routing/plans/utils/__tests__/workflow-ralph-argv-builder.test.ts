import { describe, expect, test } from 'vitest';
import type { WorkflowRalphRunOptionsInput } from '../workflow-ralph-config';
import { getDefaultWorkflowRalphRunOptionsInput } from '../workflow-ralph-config';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  planRunJobDetailPath,
  resolveWorkflowRalphWorktreeArgvValue,
} from '../workflow-ralph-argv-builder';

const baseInput = (
  overrides: Partial<WorkflowRalphRunOptionsInput> = {},
): WorkflowRalphRunOptionsInput => ({
  ...getDefaultWorkflowRalphRunOptionsInput({ planId: 'plan-1' }),
  ...overrides,
});

describe('resolveWorkflowRalphWorktreeArgvValue', () => {
  test('returns the flag-only sentinel for flag-only mode', () => {
    const value = resolveWorkflowRalphWorktreeArgvValue(
      baseInput({ worktreeCli: 'flag-only' }),
    );

    expect(value).toBe('');
  });

  test('returns the trimmed name for named mode', () => {
    const value = resolveWorkflowRalphWorktreeArgvValue(
      baseInput({ worktreeCli: 'named', worktreeName: '  my-worktree  ' }),
    );

    expect(value).toBe('my-worktree');
  });

  test('returns undefined for named mode with a blank name', () => {
    const value = resolveWorkflowRalphWorktreeArgvValue(
      baseInput({ worktreeCli: 'named', worktreeName: '   ' }),
    );

    expect(value).toBeUndefined();
  });

  test('returns undefined for omit mode', () => {
    const value = resolveWorkflowRalphWorktreeArgvValue(
      baseInput({ worktreeCli: 'omit' }),
    );

    expect(value).toBeUndefined();
  });
});

describe('buildWorkflowRalphOptionArgs', () => {
  test('builds minimal args for a default plan-target input', () => {
    const args = buildWorkflowRalphOptionArgs(baseInput());

    expect(args).toEqual(['--plan', 'plan-1']);
  });

  test('builds task target when targetMode is task', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ targetMode: 'task', taskId: 'task-1' }),
    );

    expect(args).toEqual(['--task', 'task-1']);
  });

  test('adds --backend when execution backend differs from the default', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ executionBackend: 'claude' }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--backend', 'claude']);
  });

  test('adds --prompt-file when promptLayer is file and non-empty', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ promptFile: 'prompts/custom.md', promptLayer: 'file' }),
    );

    expect(args).toEqual([
      '--plan',
      'plan-1',
      '--prompt-file',
      'prompts/custom.md',
    ]);
  });

  test('omits --prompt-file when promptLayer is file but blank', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ promptFile: '   ', promptLayer: 'file' }),
    );

    expect(args).toEqual(['--plan', 'plan-1']);
  });

  test('adds --prompt when prompt differs from the default', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ prompt: '/custom-prompt' }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--prompt', '/custom-prompt']);
  });

  test('omits --prompt when it matches the CLI default', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ prompt: '/agents-ralph' }),
    );

    expect(args).toEqual(['--plan', 'plan-1']);
  });

  test('adds --iterations when it differs from the default', () => {
    const args = buildWorkflowRalphOptionArgs(baseInput({ iterations: 5 }));

    expect(args).toEqual(['--plan', 'plan-1', '--iterations', '5']);
  });

  test('adds --iteration-timeout when set and floors fractional seconds', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ iterationTimeoutSeconds: 12.9 }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--iteration-timeout', '12']);
  });

  test('omits --iteration-timeout when below 1', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ iterationTimeoutSeconds: 0 }),
    );

    expect(args).toEqual(['--plan', 'plan-1']);
  });

  test('adds --model when it differs from the default', () => {
    const args = buildWorkflowRalphOptionArgs(baseInput({ model: 'gpt-5' }));

    expect(args).toEqual(['--plan', 'plan-1', '--model', 'gpt-5']);
  });

  test('adds --project when non-empty', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ project: 'openthrottle-server' }),
    );

    expect(args).toEqual([
      '--plan',
      'plan-1',
      '--project',
      'openthrottle-server',
    ]);
  });

  test('adds --debug for debug mode', () => {
    const args = buildWorkflowRalphOptionArgs(baseInput({ debugCli: 'debug' }));

    expect(args).toEqual(['--plan', 'plan-1', '--debug']);
  });

  test('adds --verbose for verbose mode', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ debugCli: 'verbose' }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--verbose']);
  });

  test('adds --worktree flag-only', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ worktreeCli: 'flag-only' }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--worktree']);
  });

  test('adds --worktree with a name', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({ worktreeCli: 'named', worktreeName: 'my-worktree' }),
    );

    expect(args).toEqual(['--plan', 'plan-1', '--worktree', 'my-worktree']);
  });

  test('adds cursor-only worktree-base and skip-worktree-setup for cursor backend', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({
        executionBackend: 'cursor',
        skipWorktreeSetup: true,
        worktreeBase: 'main',
        worktreeCli: 'flag-only',
      }),
    );

    expect(args).toEqual([
      '--plan',
      'plan-1',
      '--worktree',
      '--worktree-base',
      'main',
      '--skip-worktree-setup',
    ]);
  });

  test('omits cursor-only worktree flags for a non-cursor backend', () => {
    const args = buildWorkflowRalphOptionArgs(
      baseInput({
        executionBackend: 'claude',
        skipWorktreeSetup: true,
        worktreeBase: 'main',
        worktreeCli: 'flag-only',
      }),
    );

    expect(args).toEqual([
      '--plan',
      'plan-1',
      '--backend',
      'claude',
      '--worktree',
    ]);
  });
});

describe('formatWorkflowRalphCommandLine', () => {
  test('returns the bare command when there are no args', () => {
    expect(formatWorkflowRalphCommandLine([])).toBe('pnpm exec workflow-ralph');
  });

  test('joins args unquoted when they need no quoting', () => {
    expect(formatWorkflowRalphCommandLine(['--plan', 'plan-1'])).toBe(
      'pnpm exec workflow-ralph --plan plan-1',
    );
  });

  test('quotes args containing whitespace', () => {
    expect(formatWorkflowRalphCommandLine(['--prompt', 'do the thing'])).toBe(
      "pnpm exec workflow-ralph --prompt 'do the thing'",
    );
  });

  test('quotes and escapes args containing single quotes', () => {
    expect(formatWorkflowRalphCommandLine(["it's here"])).toBe(
      `pnpm exec workflow-ralph 'it'\\''s here'`,
    );
  });

  test('quotes an empty-string arg', () => {
    expect(formatWorkflowRalphCommandLine([''])).toBe(
      "pnpm exec workflow-ralph ''",
    );
  });
});

describe('planRunJobDetailPath', () => {
  test('builds an encoded queue job detail path', () => {
    expect(planRunJobDetailPath('job-1')).toBe('/queues/Plans/job-1');
  });

  test('trims and encodes the job id', () => {
    expect(planRunJobDetailPath('  job with space  ')).toBe(
      '/queues/Plans/job%20with%20space',
    );
  });
});
