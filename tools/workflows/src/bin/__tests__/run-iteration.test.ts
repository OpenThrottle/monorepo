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
      /^claude --bare --permission-mode acceptEdits -p "/,
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
      /^claude --bare --permission-mode acceptEdits -p "/,
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
});
