/**
 * @description Tests for the driver execution engine (`runDriverSync` / `runDriverAsync`) with a
 * mocked child_process: normal exit, stdout/stderr merge, spawn-error passthrough, streaming chunk
 * ordering, timeout + abort sentinels (including a pre-spawn aborted signal), and error-event reject.
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { ChildProcess } from 'child_process';
import { spawn, spawnSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defineDriver } from '../../registry/index.ts';
import type { AgentDriver, DriverChunk } from '../../types/index.ts';
import type { DriverParsedOutput } from '../../types/index.ts';
import type { DriverRawOutput } from '../index.ts';
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
    attachesWorkspaceMcp: false,
    chatStreaming: false,
    mcpAutoApprove: false,
    permissionMode: false,
    pluginDir: false,
    reportsToolCalls: false,
    skipWorktreeSetup: false,
    supportsCustomBaseUrl: false,
    supportsModelFlag: false,
    worktree: false,
    worktreeBase: false,
  },
  id: 'echo',
  label: 'echo-driver',
  versionArgs: ['--version'],
});

const TEST_ACCOUNT_ERROR = {
  apiKeySource: 'ANTHROPIC_API_KEY',
  kind: 'billing_error',
  message: 'Credit balance is too low',
} as const;

/**
 * Stand-in structured driver: `LIMIT:<text>` marks a usage limit, `ACCOUNT:<text>` a fatal account
 * error, anything else is passthrough.
 */
const parseTestOutput = (stdout: string): DriverParsedOutput => {
  if (stdout.startsWith('LIMIT:')) {
    return {
      accountError: null,
      text: stdout.slice('LIMIT:'.length),
      usageLimit: { rateLimitType: 'five_hour', resetsAt: null },
    };
  }

  if (stdout.startsWith('ACCOUNT:')) {
    return {
      accountError: TEST_ACCOUNT_ERROR,
      text: stdout.slice('ACCOUNT:'.length),
      usageLimit: null,
    };
  }

  return { accountError: null, text: `parsed(${stdout})`, usageLimit: null };
};

const structuredDriver: AgentDriver = defineDriver({
  ...testDriver,
  id: 'structured',
  parseOutput: parseTestOutput,
});

/** Renderer double: upper-cases lines, drops `skip` lines. */
const renderTestLine = (line: string): string | null => {
  return line === 'skip' ? null : line.toUpperCase();
};

const renderingDriver: AgentDriver = defineDriver({
  ...testDriver,
  id: 'rendering',
  renderOutputLine: renderTestLine,
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

  it('builds the command from the driver and runs it with shell, no stdin, piped output', () => {
    mockReturn('done', '');
    const result = runDriverSync(testDriver, { iteration: 1, prompt: 'hi' });

    expect(result).toBe('done');
    expect(spawnSync).toHaveBeenCalledTimes(1);
    const [command, args, opts] = vi.mocked(spawnSync).mock.calls[0] ?? [];
    expect(command).toBe('echo-driver -p "hi"');
    expect(args).toEqual([]);
    expect(opts).toMatchObject({
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
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

  it('applies parseOutput to stdout before the stderr merge', () => {
    mockReturn('  raw  ', '  err  ');
    expect(runDriverSync(structuredDriver, { iteration: 1, prompt: 'x' })).toBe(
      'parsed(  raw  )\nerr',
    );
  });

  it('fires onUsageLimit with the parsed limit; no parseOutput never fires', () => {
    const onUsageLimit = vi.fn();
    mockReturn('LIMIT:stopped', '');
    expect(
      runDriverSync(
        structuredDriver,
        { iteration: 1, prompt: 'x' },
        { onUsageLimit },
      ),
    ).toBe('stopped');
    expect(onUsageLimit).toHaveBeenCalledExactlyOnceWith({
      rateLimitType: 'five_hour',
      resetsAt: null,
    });

    onUsageLimit.mockClear();
    mockReturn('LIMIT:ignored', '');
    runDriverSync(testDriver, { iteration: 1, prompt: 'x' }, { onUsageLimit });
    expect(onUsageLimit).not.toHaveBeenCalled();
  });

  it('fires onAccountError with the parsed account error (sync)', () => {
    const onAccountError = vi.fn();
    mockReturn('ACCOUNT:stopped', '');
    expect(
      runDriverSync(
        structuredDriver,
        { iteration: 1, prompt: 'x' },
        { onAccountError },
      ),
    ).toBe('stopped');
    expect(onAccountError).toHaveBeenCalledExactlyOnceWith(TEST_ACCOUNT_ERROR);
  });

  it('does not fire onUsageLimit when the child fails to launch', () => {
    const onUsageLimit = vi.fn();
    mockReturn('LIMIT:x', '', new Error('spawn ENOENT'));
    runDriverSync(
      structuredDriver,
      { iteration: 1, prompt: 'x' },
      { onUsageLimit },
    );
    expect(onUsageLimit).not.toHaveBeenCalled();
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
    // Never inherit the host's stdin: an idle inherited pipe stalls claude 3s per run.
    expect(vi.mocked(spawn).mock.calls[0]?.[2]).toMatchObject({
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  });

  describe('renderOutputLine live rendering', () => {
    const run = async (
      emit: (child: ChildProcess) => void,
      driver: AgentDriver = renderingDriver,
    ): Promise<{ chunks: DriverChunk[]; result: string }> => {
      const child = makeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const chunks: DriverChunk[] = [];
      const promise = runDriverAsync(driver, {
        iteration: 1,
        onChunk: (chunk) => chunks.push(chunk),
        prompt: 'go',
      });
      emit(child);
      child.emit('close', 0);

      return { chunks, result: await promise };
    };

    it('renders a line split across chunks exactly once, with a trailing newline', async () => {
      const { chunks } = await run((child) => {
        child.stdout?.emit('data', 'hel');
        child.stdout?.emit('data', 'lo\nwor');
        child.stdout?.emit('data', 'ld\n');
      });

      expect(chunks).toEqual([
        { data: 'HELLO\n', stream: 'stdout' },
        { data: 'WORLD\n', stream: 'stdout' },
      ]);
    });

    it('renders several lines from one chunk in order', async () => {
      const { chunks } = await run((child) => {
        child.stdout?.emit('data', 'a\nb\nc\n');
      });

      expect(chunks.map((chunk) => chunk.data)).toEqual(['A\n', 'B\n', 'C\n']);
    });

    it('flushes the trailing partial line on close', async () => {
      const { chunks } = await run((child) => {
        child.stdout?.emit('data', 'done\npartial');
      });

      expect(chunks.map((chunk) => chunk.data)).toEqual([
        'DONE\n',
        'PARTIAL\n',
      ]);
    });

    it('skips lines the renderer maps to null', async () => {
      const { chunks } = await run((child) => {
        child.stdout?.emit('data', 'a\nskip\nb\nskip');
      });

      expect(chunks.map((chunk) => chunk.data)).toEqual(['A\n', 'B\n']);
    });

    it('forwards stderr chunks unchanged and keeps the raw stdout for the result', async () => {
      const { chunks, result } = await run((child) => {
        child.stdout?.emit('data', 'out\n');
        child.stderr?.emit('data', 'raw err');
      });

      expect(chunks).toEqual([
        { data: 'OUT\n', stream: 'stdout' },
        { data: 'raw err', stream: 'stderr' },
      ]);
      expect(result).toBe('out\nraw err');
    });

    it('leaves a driver without renderOutputLine byte-identical (raw, unbuffered chunks)', async () => {
      const { chunks } = await run((child) => {
        child.stdout?.emit('data', 'hel');
        child.stdout?.emit('data', 'lo\nwor');
      }, testDriver);

      expect(chunks).toEqual([
        { data: 'hel', stream: 'stdout' },
        { data: 'lo\nwor', stream: 'stdout' },
      ]);
    });

    it('flushes a pending partial line before the timeout sentinel resolves', async () => {
      vi.useFakeTimers();
      const child = makeChild();
      child.kill = vi.fn(() => {
        queueMicrotask(() => child.emit('close', null));
        return true;
      });
      vi.mocked(spawn).mockReturnValue(child);
      const chunks: DriverChunk[] = [];

      const promise = runDriverAsync(renderingDriver, {
        iteration: 1,
        onChunk: (chunk) => chunks.push(chunk),
        prompt: 'x',
        timeoutMs: 1000,
      });
      child.stdout?.emit('data', 'half');
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(chunks.map((chunk) => chunk.data)).toEqual(['HALF\n']);
    });
  });

  it('applies parseOutput to collected stdout, streams raw chunks, and fires onUsageLimit before onExit', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const order: string[] = [];
    const chunks: DriverChunk[] = [];
    const promise = runDriverAsync(
      structuredDriver,
      {
        iteration: 1,
        onChunk: (chunk) => chunks.push(chunk),
        prompt: 'go',
      },
      {
        onExit: () => order.push('exit'),
        onUsageLimit: (limit) => order.push(`limit:${limit.rateLimitType}`),
      },
    );

    child.stdout?.emit('data', 'LIMIT:par');
    child.stdout?.emit('data', 'tial');
    child.stderr?.emit('data', 'err');
    child.emit('close', 1);

    expect(await promise).toBe('partial\nerr');
    expect(order).toEqual(['limit:five_hour', 'exit']);
    // Live chunks are the raw stdout, unmodified by parseOutput.
    expect(chunks.map((chunk) => chunk.data)).toEqual([
      'LIMIT:par',
      'tial',
      'err',
    ]);
  });

  it('fires onAccountError with the parsed error before onExit; not when there is none', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const order: string[] = [];
    const onAccountError = vi.fn((error: { readonly kind: string }) => {
      order.push(`account:${error.kind}`);
    });
    const promise = runDriverAsync(
      structuredDriver,
      { iteration: 1, prompt: 'go' },
      { onAccountError, onExit: () => order.push('exit') },
    );

    child.stdout?.emit('data', 'ACCOUNT:no credit');
    child.emit('close', 1);

    expect(await promise).toBe('no credit');
    expect(onAccountError).toHaveBeenCalledExactlyOnceWith(TEST_ACCOUNT_ERROR);
    expect(order).toEqual(['account:billing_error', 'exit']);

    const quiet = makeChild();
    vi.mocked(spawn).mockReturnValue(quiet);
    onAccountError.mockClear();
    const fine = runDriverAsync(
      structuredDriver,
      { iteration: 1, prompt: 'go' },
      { onAccountError },
    );
    quiet.stdout?.emit('data', 'fine');
    quiet.emit('close', 0);

    expect(await fine).toBe('parsed(fine)');
    expect(onAccountError).not.toHaveBeenCalled();
  });

  it('does not fire onUsageLimit when there is no limit', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);
    const onUsageLimit = vi.fn();

    const promise = runDriverAsync(
      structuredDriver,
      { iteration: 1, prompt: 'go' },
      { onUsageLimit },
    );
    child.stdout?.emit('data', 'fine');
    child.emit('close', 0);

    expect(await promise).toBe('parsed(fine)');
    expect(onUsageLimit).not.toHaveBeenCalled();
  });

  it('leaves the timeout sentinel path alone (no parse, no onUsageLimit)', async () => {
    vi.useFakeTimers();
    const child = makeChild();
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('close', null));
      return true;
    });
    vi.mocked(spawn).mockReturnValue(child);
    const onUsageLimit = vi.fn();

    const promise = runDriverAsync(
      structuredDriver,
      { iteration: 1, prompt: 'x', timeoutMs: 1000 },
      { onUsageLimit },
    );
    child.stdout?.emit('data', 'LIMIT:x');
    await vi.advanceTimersByTimeAsync(1000);

    expect(await promise).toBe(
      '<promise>ERROR</promise>\necho-driver iteration timed out after 1000ms',
    );
    expect(onUsageLimit).not.toHaveBeenCalled();
  });

  describe('onRawOutput', () => {
    const killableChild = (): ChildProcess => {
      const child = makeChild();
      child.kill = vi.fn(() => {
        queueMicrotask(() => child.emit('close', null));
        return true;
      });

      return child;
    };

    it('hands over raw stdout and stderr, before parseOutput, on a normal close', async () => {
      const child = makeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const outputs: DriverRawOutput[] = [];

      const promise = runDriverAsync(
        structuredDriver,
        { iteration: 1, prompt: 'x' },
        { onRawOutput: (output) => outputs.push(output) },
      );

      child.stdout?.emit('data', 'raw out');
      child.stderr?.emit('data', 'raw err');
      child.emit('close', 3);

      expect(await promise).toBe('parsed(raw out)\nraw err');
      expect(outputs).toEqual([
        {
          durationMs: expect.any(Number),
          exitCode: 3,
          stderr: 'raw err',
          stdout: 'raw out',
          termination: 'exited',
        },
      ]);
    });

    it('reports a timeout with no exit code', async () => {
      vi.useFakeTimers();
      const child = killableChild();
      vi.mocked(spawn).mockReturnValue(child);
      const outputs: DriverRawOutput[] = [];

      const promise = runDriverAsync(
        testDriver,
        { iteration: 1, prompt: 'x', timeoutMs: 1000 },
        { onRawOutput: (output) => outputs.push(output) },
      );

      child.stdout?.emit('data', 'partial');
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(outputs).toMatchObject([
        { exitCode: null, stdout: 'partial', termination: 'timed-out' },
      ]);
    });

    it('reports an abort with no exit code', async () => {
      const child = killableChild();
      vi.mocked(spawn).mockReturnValue(child);
      const outputs: DriverRawOutput[] = [];
      const controller = new AbortController();

      const promise = runDriverAsync(
        testDriver,
        { iteration: 1, prompt: 'x', signal: controller.signal },
        { onRawOutput: (output) => outputs.push(output) },
      );

      controller.abort();
      await promise;

      expect(outputs).toMatchObject([
        { exitCode: null, termination: 'aborted' },
      ]);
    });

    it('does not fire when the child fails to launch', async () => {
      const child = makeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const onRawOutput = vi.fn();

      const promise = runDriverAsync(
        testDriver,
        { iteration: 1, prompt: 'x' },
        { onRawOutput },
      );

      child.emit('error', new Error('ENOENT'));

      await expect(promise).rejects.toThrow('ENOENT');
      expect(onRawOutput).not.toHaveBeenCalled();
    });
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
