import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import type {
  ScheduleClock,
  SpawnCommand,
  ValidationChunk,
} from '../../contract/index.ts';
import { createCommandValidator } from '../create-command-validator.ts';
import { runOtLoop } from '../run-ot-loop.ts';
import { spawnShellCommand } from '../spawn-shell-command.ts';
import { systemScheduleClock } from '../system-schedule-clock.ts';
import { done, makeTask, makeWorld, statusOf } from './loop-fakes.ts';

interface FakeScript {
  readonly exitCode: number;
  /** When true the command only ends once killed. */
  readonly hang: boolean;
  readonly output: string;
}

const ok = (output = ''): FakeScript => {
  return { exitCode: 0, hang: false, output };
};

const fail = (exitCode: number, output: string): FakeScript => {
  return { exitCode, hang: false, output };
};

const hang: FakeScript = { exitCode: 0, hang: true, output: '' };

const makeSpawn = (scripts: Record<string, FakeScript>) => {
  const started: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const spawn: SpawnCommand = ({ command, onOutput }) => {
    const script = scripts[command] ?? ok();
    let finish: (code: number | null) => void = () => {
      return undefined;
    };
    const doneP = new Promise<{ exitCode: number | null }>((resolve) => {
      finish = (code) => {
        inFlight -= 1;
        resolve({ exitCode: code });
      };
    });

    started.push(command);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);

    if (script.output !== '') {
      onOutput(script.output);
    }

    if (script.hang) {
      return { done: doneP, kill: () => finish(null) };
    }

    setTimeout(() => finish(script.exitCode), 5);

    return { done: doneP, kill: () => finish(null) };
  };

  return { maxInFlight: () => maxInFlight, spawn, started };
};

const TASK = makeTask('1');

const input = (signal: AbortSignal = new AbortController().signal) => {
  return { signal, task: TASK, taskStartSha: `ab'c` };
};

const build = (
  commands: readonly string[],
  spawn: SpawnCommand,
  extra: {
    clock?: ScheduleClock;
    cwd?: string;
    onChunk?: (chunk: ValidationChunk) => void;
    timeoutMs?: number;
  } = {},
) => {
  return createCommandValidator({
    clock: extra.clock ?? systemScheduleClock,
    commands,
    cwd: extra.cwd ?? '/wt',
    onChunk: extra.onChunk,
    spawn,
    timeoutMs: extra.timeoutMs ?? 60_000,
  });
};

describe('createCommandValidator sequencing', () => {
  it('runs commands strictly one at a time and is green', async () => {
    const fake = makeSpawn({});
    const result = await build(['a', 'b', 'c'], fake.spawn).validate(input());

    expect(result).toEqual({ kind: 'green' });
    expect(fake.started).toEqual(['a', 'b', 'c']);
    expect(fake.maxInFlight()).toBe(1);
  });

  it('stops at the first non-zero exit and returns the tail', async () => {
    const fake = makeSpawn({ b: fail(2, '\u001b[31mboom\u001b[0m\n') });
    const result = await build(['a', 'b', 'c'], fake.spawn).validate(input());

    expect(fake.started).toEqual(['a', 'b']);
    expect(result).toEqual({
      command: 'b',
      exitCode: 2,
      kind: 'red',
      tail: 'boom\n',
    });
  });

  it('substitutes the shell-escaped task start sha', async () => {
    const fake = makeSpawn({});

    await build(['git diff {taskStartSha}'], fake.spawn).validate(input());
    expect(fake.started).toEqual([`git diff 'ab'\\''c'`]);
  });

  it('refuses an empty command list rather than passing', async () => {
    const result = await build([], makeSpawn({}).spawn).validate(input());

    expect(result.kind).toBe('red');
  });
});

describe('createCommandValidator abort and timeout', () => {
  it('kills the running child and reports aborted, never red', async () => {
    const fake = makeSpawn({ a: hang });
    const abort = new AbortController();
    const pending = build(['a', 'b'], fake.spawn).validate(input(abort.signal));

    abort.abort();

    expect(await pending).toEqual({ kind: 'aborted' });
    expect(fake.started).toEqual(['a']);
  });

  it('does not spawn when already aborted', async () => {
    const fake = makeSpawn({});
    const abort = new AbortController();

    abort.abort();

    expect(
      await build(['a'], fake.spawn).validate(input(abort.signal)),
    ).toEqual({ kind: 'aborted' });
    expect(fake.started).toEqual([]);
  });

  it('turns a timeout into red with exit code 124', async () => {
    const fake = makeSpawn({ a: hang });
    const result = await build(['a', 'b'], fake.spawn, {
      timeoutMs: 20,
    }).validate(input());

    expect(result).toMatchObject({ command: 'a', exitCode: 124, kind: 'red' });
    expect(result.kind === 'red' && result.tail).toContain('timed out');
    expect(fake.started).toEqual(['a']);
  });
});

const makeFakeClock = (stepMs: number): ScheduleClock => {
  let now = 0;

  return {
    now: () => {
      now += stepMs;

      return now - stepMs;
    },
    schedule: systemScheduleClock.schedule,
  };
};

describe('createCommandValidator output streaming', () => {
  it('streams a start line and exactly one summary line for a green command, never its output', async () => {
    const fake = makeSpawn({ a: ok('noisy [local cache] lines\n') });
    const chunks: ValidationChunk[] = [];

    await build(['a'], fake.spawn, {
      clock: makeFakeClock(46_000),
      onChunk: (chunk) => chunks.push(chunk),
    }).validate(input());

    expect(chunks).toEqual([
      { command: 'a', taskId: '1', text: '$ a\n' },
      { command: 'a', taskId: '1', text: 'a ✔ · 46s\n' },
    ]);
  });

  it('labels an nx target run by its targets', async () => {
    const fake = makeSpawn({});
    const chunks: ValidationChunk[] = [];

    await build(
      ['pnpm nx affected -t lint --base=x --parallel=1'],
      fake.spawn,
      {
        clock: makeFakeClock(1000),
        onChunk: (chunk) => chunks.push(chunk),
      },
    ).validate(input());

    expect(chunks[1]?.text).toBe('lint ✔ · 1s\n');
  });

  it('streams the summary line and the ANSI-free tail on red, and returns the same tail', async () => {
    const fake = makeSpawn({ b: fail(2, '\u001b[31mboom\u001b[0m\n') });
    const chunks: ValidationChunk[] = [];
    const result = await build(['b'], fake.spawn, {
      clock: makeFakeClock(54_000),
      onChunk: (chunk) => chunks.push(chunk),
    }).validate(input());

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      '$ b\n',
      'b ✗ exit 2 · 54s\nboom\n\n',
    ]);
    expect(chunks.map((chunk) => chunk.text).join('')).not.toContain('\u001b');
    expect(result).toMatchObject({ kind: 'red', tail: 'boom\n' });
  });

  it('says timed out in the summary line', async () => {
    const fake = makeSpawn({ a: hang });
    const chunks: ValidationChunk[] = [];

    await build(['a'], fake.spawn, {
      onChunk: (chunk) => chunks.push(chunk),
      timeoutMs: 20,
    }).validate(input());

    expect(chunks[1]?.text).toMatch(/^a ✗ timed out · \d+s\n/);
  });
});

describe('createCommandValidator with the real shell', () => {
  const real = (command: string) => {
    return build([command], spawnShellCommand, { cwd: tmpdir() });
  };

  it('is green for exit 0 and red with the exit code otherwise', async () => {
    expect(await real('echo hi').validate(input())).toEqual({ kind: 'green' });
    expect(await real('echo oops >&2; exit 3').validate(input())).toEqual({
      command: 'echo oops >&2; exit 3',
      exitCode: 3,
      kind: 'red',
      tail: 'oops\n',
    });
  });

  it('kills a long-running command on abort', async () => {
    const abort = new AbortController();
    const pending = real('sleep 30').validate(input(abort.signal));

    setTimeout(() => abort.abort(), 50);

    expect(await pending).toEqual({ kind: 'aborted' });
  });
});

describe('runOtLoop wired to the command validator', () => {
  it('blocks the task after N red attempts and never completes it', async () => {
    const fake = makeSpawn({ lint: fail(1, 'lint failed\n') });
    const world = makeWorld({ tasks: [makeTask('1')], worker: () => done() });
    const outcome = await runOtLoop({
      deps: {
        ...world.deps,
        validator: build(['lint', 'test'], fake.spawn),
      },
      maxRetries: 2,
      planId: 'plan',
      taskId: undefined,
    });

    expect(world.workerInputs).toHaveLength(3);
    expect(world.workerInputs[2]?.previousFailure).toEqual({
      command: 'lint',
      exitCode: 1,
      kind: 'validation',
      tail: 'lint failed\n',
    });
    expect(statusOf(world, '1')).toBe('BLOCKED');
    expect(outcome.kind).toBe('tasks_blocked');
    expect(fake.started).toEqual(['lint', 'lint', 'lint']);
    expect(fake.maxInFlight()).toBe(1);
  });
});
