import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LoopTask } from '@openthrottle/openthrottle-agentic-loop';
import { prepareResultDir } from '@openthrottle/openthrottle-agentic-loop';
import type {
  DriverInvocationConfig,
  RunDriverOptions,
} from '@openthrottle/openthrottle-drivers';
import { getDriver } from '@openthrottle/openthrottle-drivers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  OtLoopRunDriver,
  PlanOutputChunk,
  PlanOutputWriter,
} from './ot-loop.types.ts';
import { buildWorkerEnv } from './ot-loop.utils.ts';
import { createOtLoopWorkerRunner } from './ot-loop-worker-runner.factory.ts';

const task: LoopTask = {
  category: 'implementation',
  createdAt: '2026-11-09T00:00:00.000Z',
  description: 'Implement the parser and its tests, then report.',
  id: 'task-1',
  requirements: ['parses a result file'],
  sortOrder: 1000,
  status: 'IN_PROGRESS',
  title: 'Parser',
};

const GOOD_RESULT = JSON.stringify({
  commitMessage: 'feat(x): parse',
  followUps: [],
  reason: 'Implemented it.',
  status: 'done',
  version: 1,
});

describe('createOtLoopWorkerRunner', () => {
  let cwd: string;
  const written: PlanOutputChunk[] = [];
  const output: PlanOutputWriter = {
    settled: async () => undefined,
    write: (chunk) => {
      written.push(chunk);
    },
  };
  const onUsageLimit = vi.fn();
  let seen: DriverInvocationConfig | undefined;

  const build = (runDriver: OtLoopRunDriver) => {
    return createOtLoopWorkerRunner({
      cwd,
      driver: getDriver('claude'),
      effort: 'high',
      env: buildWorkerEnv(),
      onUsageLimit,
      output,
      runDriver,
      timeoutMs: 5000,
    });
  };
  const input = (signal: AbortSignal = new AbortController().signal) => {
    return {
      attempt: 3,
      guidance: ['skip nothing'],
      model: 'sonnet',
      previousFailure: undefined,
      signal,
      task,
    };
  };
  /** A driver that records its config and runs `behave` as the CLI would. */
  const driverThat = (
    behave: (
      config: DriverInvocationConfig,
      options: RunDriverOptions,
    ) => Promise<string> | string,
  ): OtLoopRunDriver => {
    return async (_driver, config, options) => {
      seen = config;

      return behave(config, options);
    };
  };

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'ot-loop-runner-'));
    await prepareResultDir(cwd);
    written.length = 0;
    seen = undefined;
    onUsageLimit.mockClear();
  });

  afterEach(async () => {
    await rm(cwd, { force: true, recursive: true });
  });

  it('runs the driver in the worktree with the routed model, the signal and an env that blanks the OT credentials', async () => {
    const controller = new AbortController();
    const runner = build(
      driverThat(async (_config, options) => {
        options.onExit?.(0);
        await writeFile(join(cwd, '.ot-loop', 'result.json'), GOOD_RESULT);

        return 'done';
      }),
    );

    await runner.run(input(controller.signal));

    expect(seen).toMatchObject({
      cwd,
      effort: 'high',
      model: 'sonnet',
      signal: controller.signal,
      timeoutMs: 5000,
    });
    expect(seen?.env).toEqual({
      OPENTHROTTLE_MCP_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: '',
      OT_MCP_AUTH_TOKEN_ENV_FILE: '',
    });
    expect(seen?.prompt).toContain('# Task\nParser');
    expect(seen?.prompt).toContain('skip nothing');
  });

  it('returns the parsed result file', async () => {
    const runner = build(
      driverThat(async (_config, options) => {
        options.onExit?.(0);
        await writeFile(join(cwd, '.ot-loop', 'result.json'), GOOD_RESULT);

        return 'done';
      }),
    );

    expect(await runner.run(input())).toMatchObject({
      kind: 'ok',
      result: { commitMessage: 'feat(x): parse', status: 'done' },
    });
  });

  it('deletes a stale result file before the attempt so it can never be read as this one', async () => {
    await writeFile(join(cwd, '.ot-loop', 'result.json'), GOOD_RESULT);
    const runner = build(
      driverThat((_config, options) => {
        options.onExit?.(0);

        return 'finished without writing a result';
      }),
    );

    expect(await runner.run(input())).toEqual({ kind: 'missing' });
  });

  it('reports a malformed result file', async () => {
    const runner = build(
      driverThat(async (_config, options) => {
        options.onExit?.(0);
        await writeFile(join(cwd, '.ot-loop', 'result.json'), '{nope');

        return 'done';
      }),
    );

    expect(await runner.run(input())).toMatchObject({ kind: 'malformed' });
  });

  it('streams driver output to plan output, tagged with the task', async () => {
    const runner = build(
      driverThat((config, options) => {
        config.onChunk?.({ data: 'hello ', stream: 'stdout' });
        config.onChunk?.({ data: 'world', stream: 'stderr' });
        options.onExit?.(0);

        return 'done';
      }),
    );

    await runner.run(input());

    expect(written).toEqual([
      { attempt: 3, kind: 'worker', taskId: 'task-1', text: 'hello world' },
    ]);
  });

  it('writes tool runs and prose as separate chunks, in order, losslessly', async () => {
    const batch = 'thinking\n→ Read a.ts\n→ Bash ls\n\ndone\n';
    const runner = build(
      driverThat((config, options) => {
        config.onChunk?.({ data: batch, stream: 'stdout' });
        options.onExit?.(0);

        return 'done';
      }),
    );

    await runner.run(input());

    expect(written.map((chunk) => chunk.kind)).toEqual([
      'worker',
      'tool',
      'worker',
    ]);
    expect(written.map((chunk) => chunk.text).join('')).toBe(batch);
    expect(written.every((chunk) => chunk.attempt === 3)).toBe(true);
  });

  it('strips colour codes from driver output, including a code split across chunks', async () => {
    const esc = String.fromCharCode(27);
    const runner = build(
      driverThat((config, options) => {
        config.onChunk?.({ data: `${esc}[32mok${esc}[`, stream: 'stdout' });
        config.onChunk?.({ data: '39m done', stream: 'stdout' });
        options.onExit?.(0);

        return 'done';
      }),
    );

    await runner.run(input());

    expect(written).toEqual([
      { attempt: 3, kind: 'worker', taskId: 'task-1', text: 'ok done' },
    ]);
  });

  it('classifies an aborted attempt as aborted even when the driver also printed its error sentinel', async () => {
    const controller = new AbortController();
    const runner = build(
      driverThat(() => {
        controller.abort();

        return '<promise>ERROR</promise>\nclaude-code iteration was cancelled';
      }),
    );

    expect(await runner.run(input(controller.signal))).toEqual({
      kind: 'aborted',
    });
  });

  it('classifies a driver that rejects after an abort as aborted, not an error', async () => {
    const controller = new AbortController();
    const runner = build(
      driverThat(() => {
        controller.abort();

        return Promise.reject(new Error('spawn killed'));
      }),
    );

    expect(await runner.run(input(controller.signal))).toEqual({
      kind: 'aborted',
    });
  });

  it('reports a usage limit and hands its reset to the service', async () => {
    const limit = {
      rateLimitType: 'five_hour',
      resetsAt: '2026-11-09T20:00:00Z',
    };
    const runner = build(
      driverThat((_config, options) => {
        options.onUsageLimit?.(limit);
        options.onExit?.(0);

        return 'limited';
      }),
    );

    expect(await runner.run(input())).toEqual({ kind: 'usage_limited' });
    expect(onUsageLimit).toHaveBeenCalledWith(limit);
  });

  it('reports the driver error sentinel as an error carrying the output tail', async () => {
    const runner = build(
      driverThat(
        () => '<promise>ERROR</promise>\nclaude-code iteration timed out',
      ),
    );

    expect(await runner.run(input())).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('timed out'),
    });
  });

  it('reports a non-zero exit as an error', async () => {
    const runner = build(
      driverThat((_config, options) => {
        options.onExit?.(2);

        return 'crashed';
      }),
    );

    expect(await runner.run(input())).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('exited with code 2'),
    });
  });

  it('reports a driver that fails to launch as an error', async () => {
    const runner = build(driverThat(() => Promise.reject(new Error('ENOENT'))));

    expect(await runner.run(input())).toEqual({
      kind: 'error',
      message: 'ENOENT',
    });
  });

  it('numbers its invocations for log attribution', async () => {
    const iterations: number[] = [];
    const runner = build(
      driverThat((config, options) => {
        iterations.push(config.iteration);
        options.onExit?.(0);

        return 'x';
      }),
    );

    await runner.run(input());
    await runner.run(input());

    expect(iterations).toEqual([1, 2]);
  });

  it('never leaves the result file behind once read', async () => {
    const runner = build(
      driverThat(async (_config, options) => {
        options.onExit?.(0);
        await mkdir(join(cwd, '.ot-loop'), { recursive: true });
        await writeFile(join(cwd, '.ot-loop', 'result.json'), GOOD_RESULT);

        return 'done';
      }),
    );

    await runner.run(input());

    await expect(
      readFile(join(cwd, '.ot-loop', 'result.json'), 'utf8'),
    ).rejects.toThrow();
  });
});
