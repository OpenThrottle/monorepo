/**
 * @description Tests for `runAgentPrompt` — the generic run-once entrypoint — driven through the real
 * engine + real drivers with a mocked `child_process`. Covers: dispatch across every DRIVER_ID,
 * exit-code → status classification (incl. non-zero ⇒ failed), timeout/abort/spawn-error statuses,
 * partial-output buffering on timeout, onChunk pass-through, and typed capability-mismatch errors.
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDriver } from '../../drivers/index.ts';
import {
  DriverCapabilityError,
  UnknownDriverError,
} from '../../errors/index.ts';
import { DRIVER_IDS } from '../../registry/index.ts';
import type { DriverChunk } from '../../types/index.ts';
import { RUN_AGENT_STATUS, runAgentPrompt } from '../index.ts';

function asChildProcess(value: EventEmitter): ChildProcess;
function asChildProcess(value: EventEmitter): unknown {
  return value;
}

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawn: vi.fn(), spawnSync: vi.fn() };
});

const makeChild = (): ChildProcess => {
  const child = asChildProcess(new EventEmitter());
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => true);
  Object.assign(child, { killed: false });
  return child;
};

/** Kill double that closes the child (as a real SIGTERM would), enabling timeout/abort paths. */
const makeKillableChild = (): ChildProcess => {
  const child = makeChild();
  child.kill = vi.fn(() => {
    queueMicrotask(() => child.emit('close', null));
    return true;
  });
  return child;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('runAgentPrompt — dispatch across every driver', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  for (const driverId of DRIVER_IDS) {
    it(`runs the ${driverId} driver and returns ok on a zero exit`, async () => {
      const child = makeChild();
      vi.mocked(spawn).mockReturnValue(child);

      const promise = runAgentPrompt({ driverId, prompt: 'hello world' });
      child.stdout?.emit('data', 'result');
      child.emit('close', 0);

      const result = await promise;
      expect(result.status).toBe(RUN_AGENT_STATUS.ok);
      expect(result.exitCode).toBe(0);
      expect(result.driverId).toBe(driverId);
      expect(result.output).toBe('result');

      const command = vi.mocked(spawn).mock.calls[0]?.[0];
      expect(command).toContain(getDriver(driverId).binary);
      expect(command).toContain('hello world');
    });
  }
});

describe('runAgentPrompt — status classification', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  it('maps a non-zero exit to failed and carries the exit code', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({ driverId: 'claude', prompt: 'x' });
    child.stderr?.emit('data', 'boom');
    child.emit('close', 1);

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.failed);
    expect(result.exitCode).toBe(1);
    expect(result.output).toBe('boom');
  });

  it('classifies a timeout and preserves partial output buffered before the kill', async () => {
    vi.useFakeTimers();
    const child = makeKillableChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({
      driverId: 'cursor',
      prompt: 'x',
      timeoutMs: 1000,
    });
    child.stdout?.emit('data', 'partial-before-timeout');
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.timeout);
    expect(result.exitCode).toBeNull();
    expect(result.output).toBe('partial-before-timeout');
    expect(result.output).not.toContain('<promise>ERROR</promise>');
  });

  it('classifies an abort as cancelled', async () => {
    const child = makeKillableChild();
    vi.mocked(spawn).mockReturnValue(child);

    const controller = new AbortController();
    const promise = runAgentPrompt({
      driverId: 'grok',
      prompt: 'x',
      signal: controller.signal,
    });
    controller.abort();

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.cancelled);
    expect(result.exitCode).toBeNull();
  });

  it('classifies a spawn failure as spawn_error', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({ driverId: 'opencode', prompt: 'x' });
    child.emit('error', new Error('spawn ENOENT'));

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.spawnError);
    expect(result.exitCode).toBeNull();
  });

  it('passes chunks through to the caller onChunk and buffers output', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const seen: DriverChunk[] = [];
    const promise = runAgentPrompt({
      driverId: 'codex',
      onChunk: (chunk) => seen.push(chunk),
      prompt: 'x',
    });
    child.stdout?.emit('data', 'a');
    child.stderr?.emit('data', 'b');
    child.emit('close', 0);

    const result = await promise;
    expect(seen).toEqual([
      { data: 'a', stream: 'stdout' },
      { data: 'b', stream: 'stderr' },
    ]);
    expect(result.output).toBe('ab');
  });
});

describe('runAgentPrompt — claude stream-json', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  const ndjson = (...events: readonly object[]): string =>
    `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;

  it('returns the parsed result text (not NDJSON) and a null usageLimit on success', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({ driverId: 'claude', prompt: 'x' });
    child.stdout?.emit(
      'data',
      ndjson(
        { subtype: 'init', type: 'system' },
        {
          is_error: false,
          result: 'done\n<promise>COMPLETE</promise>',
          type: 'result',
        },
      ),
    );
    child.emit('close', 0);

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.ok);
    expect(result.output).toBe('done\n<promise>COMPLETE</promise>');
    expect(result.usageLimit).toBeNull();
  });

  it('surfaces the usage limit but keeps the exit-code status (failed)', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({ driverId: 'claude', prompt: 'x' });
    child.stdout?.emit(
      'data',
      ndjson(
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
      ),
    );
    child.emit('close', 1);

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.failed);
    expect(result.output).toBe('limit reached');
    expect(result.usageLimit).toEqual({
      rateLimitType: 'five_hour',
      resetsAt: new Date(1_793_594_400_000).toISOString(),
    });
  });

  it('streams rendered (not NDJSON) chunks to onChunk and keeps the parsed output', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const seen: DriverChunk[] = [];
    const promise = runAgentPrompt({
      driverId: 'claude',
      onChunk: (chunk) => seen.push(chunk),
      prompt: 'x',
    });
    child.stdout?.emit(
      'data',
      ndjson(
        { subtype: 'init', type: 'system' },
        {
          message: { content: [{ text: 'working', type: 'text' }] },
          type: 'assistant',
        },
        { is_error: false, result: 'working', type: 'result' },
      ),
    );
    child.emit('close', 0);

    const result = await promise;
    expect(seen).toEqual([{ data: 'working\n', stream: 'stdout' }]);
    expect(result.output).toBe('working');
  });

  it('returns the partial rendered text when a claude run times out', async () => {
    vi.useFakeTimers();
    const child = makeKillableChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({
      driverId: 'claude',
      prompt: 'x',
      timeoutMs: 1000,
    });
    child.stdout?.emit(
      'data',
      ndjson({
        message: { content: [{ text: 'half way', type: 'text' }] },
        type: 'assistant',
      }),
    );
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.status).toBe(RUN_AGENT_STATUS.timeout);
    expect(result.output).toBe('half way');
  });

  it('has a null usageLimit for drivers without parseOutput', async () => {
    const child = makeChild();
    vi.mocked(spawn).mockReturnValue(child);

    const promise = runAgentPrompt({ driverId: 'codex', prompt: 'x' });
    child.stdout?.emit('data', 'out');
    child.emit('close', 1);

    expect((await promise).usageLimit).toBeNull();
  });
});

describe('runAgentPrompt — input validation', () => {
  it('throws UnknownDriverError for an unknown driver id', async () => {
    await expect(
      runAgentPrompt({ driverId: 'bogus', prompt: 'x' }),
    ).rejects.toBeInstanceOf(UnknownDriverError);
  });

  it('throws DriverCapabilityError for an endpoint on a driver without custom base URL', async () => {
    await expect(
      runAgentPrompt({
        driverId: 'claude', // supportsCustomBaseUrl: false
        prompt: 'x',
        settings: { endpoint: { baseUrl: 'http://localhost:11434/v1' } },
      }),
    ).rejects.toBeInstanceOf(DriverCapabilityError);
  });

  it('throws DriverCapabilityError for worktree options on a driver without worktree support', async () => {
    await expect(
      runAgentPrompt({
        driverId: 'codex', // worktree: false
        prompt: 'x',
        settings: { worktree: { worktree: 'feature-branch' } },
      }),
    ).rejects.toBeInstanceOf(DriverCapabilityError);
  });
});
