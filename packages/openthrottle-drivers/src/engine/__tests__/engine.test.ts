/**
 * @description Tests for the driver execution engine (`runDriverSync` / `runDriverAsync`) with a
 * mocked child_process: normal exit, stdout/stderr merge, spawn-error passthrough, streaming chunk
 * ordering, timeout + abort sentinels (including a pre-spawn aborted signal), and error-event reject.
 */

import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentDriver, DriverChunk } from '../../types/index.ts';
import { defineDriver } from '../../registry/index.ts';
import { runDriverAsync, runDriverSync } from '../index.ts';

/**
 * @description Presents a bare EventEmitter as a ChildProcess test double without a cast.
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

const testDriver: AgentDriver = defineDriver({
  binary: 'echo-driver',
  buildShellCommand: (config) => `echo-driver -p "${config.prompt}"`,
  capabilities: {
    chatStreaming: false,
    permissionMode: false,
    skipWorktreeSetup: false,
    supportsModelFlag: false,
    worktree: false,
    worktreeBase: false,
  },
  id: 'echo',
  label: 'echo-driver',
  versionArgs: ['--version'],
});

describe('runDriverSync', () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockReturn = (stdout: string, stderr: string, error?: Error): void => {
    vi.mocked(spawnSync).mockReturnValue({
      error,
      output: [stdout],
      pid: 0,
      signal: null,
      status: error ? null : 0,
      stderr,
      stdout,
    });
  };

  it('builds the command from the driver and runs it with shell + piped stdio', () => {
    mockReturn('done', '');
    const result = runDriverSync(testDriver, { iteration: 1, prompt: 'hi' });

    expect(result).toBe('done');
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const [command, args, opts] = vi.mocked(spawnSync).mock.calls[0] ?? [];
    expect(command).toBe('echo-driver -p "hi"');
    expect(args).toEqual([]);
    expect(opts).toMatchObject({
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
  });

  it('merges trimmed stdout and stderr with a newline', () => {
    mockReturn('  out  ', '  err  ');
    expect(runDriverSync(testDriver, { iteration: 1, prompt: 'x' })).toBe(
      'out\nerr',
    );
  });

  it('returns just stdout when stderr is empty', () => {
    mockReturn('only-out', '');
    expect(runDriverSync(testDriver, { iteration: 1, prompt: 'x' })).toBe(
      'only-out',
    );
  });

  it('returns the spawn-error message when the child fails to launch', () => {
    mockReturn('', '', new Error('spawn ENOENT'));
    const logger = { debug: vi.fn(), verbose: vi.fn() };
    const result = runDriverSync(
      testDriver,
      { iteration: 3, prompt: 'x' },
      { logger },
    );

    expect(result).toBe('spawn ENOENT');
    expect(logger.debug).toHaveBeenCalledWith(
      'runDriverSync: spawn error',
      expect.objectContaining({ runnerLabel: 'echo-driver' }),
    );
  });
});

describe('runDriverAsync', () => {
  const makeChild = (): ChildProcess => {
    const child = asChildProcess(new EventEmitter());
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = vi.fn(() => true);
    Object.assign(child, { killed: false });
    return child;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('resolves with merged output and streams chunks in order', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const chunks: DriverChunk[] = [];
    const promise = runDriverAsync(testDriver, {
      iteration: 1,
      onChunk: (chunk) => chunks.push(chunk),
      prompt: 'go',
    });

    child.stdout?.emit('data', 'out');
    child.stderr?.emit('data', 'err');
    child.emit('close', 0);

    expect(await promise).toBe('out\nerr');
    expect(chunks).toEqual([
      { data: 'out', stream: 'stdout' },
      { data: 'err', stream: 'stderr' },
    ]);
    expect(vi.mocked(spawn).mock.calls[0]?.[0]).toBe('echo-driver -p "go"');
  });

  it('resolves with a timeout sentinel and kills the child', async () => {
    vi.useFakeTimers();
    const child = makeChild();
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('close', null));
      return true;
    });
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runDriverAsync(testDriver, {
      iteration: 1,
      prompt: 'x',
      timeoutMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(await promise).toBe(
      '<promise>ERROR</promise>\necho-driver iteration timed out after 1000ms',
    );
  });

  it('resolves with a cancelled sentinel when the signal aborts', async () => {
    const child = makeChild();
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('close', null));
      return true;
    });
    vi.mocked(spawn).mockReturnValue(child);

    const controller = new AbortController();
    const promise = runDriverAsync(testDriver, {
      iteration: 1,
      prompt: 'x',
      signal: controller.signal,
    });

    controller.abort();

    expect(await promise).toBe(
      '<promise>ERROR</promise>\necho-driver iteration was cancelled',
    );
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('cancels immediately when the signal is already aborted before spawn', async () => {
    const child = makeChild();
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('close', null));
      return true;
    });
    vi.mocked(spawn).mockReturnValue(child);

    const controller = new AbortController();
    controller.abort();

    const result = await runDriverAsync(testDriver, {
      iteration: 1,
      prompt: 'x',
      signal: controller.signal,
    });

    expect(result).toBe(
      '<promise>ERROR</promise>\necho-driver iteration was cancelled',
    );
  });

  it('rejects when the child emits an error event', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runDriverAsync(testDriver, { iteration: 1, prompt: 'x' });
    child.emit('error', new Error('boom'));

    await expect(promise).rejects.toThrow('boom');
  });
});
