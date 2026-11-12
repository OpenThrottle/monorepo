import { describe, expect, it } from 'vitest';

import { runOtLoop } from '../run-ot-loop.ts';
import { done, makeTask, makeWorld } from './loop-fakes.ts';

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

const redOnce = {
  command: 'pnpm nx affected --target=lint,test',
  exitCode: 1,
  kind: 'red',
  tail: 'warming up\nsrc/a.ts: error TS2322: nope\nmore',
} as const;

describe('attempt numbers and failure reasons in loop lines', () => {
  it('numbers attempts 1 then 2 across a retry and leaves plan-scoped lines bare', async () => {
    const taskId = '1f0c2d3e-0000-4000-8000-000000000001';
    const world = makeWorld({
      tasks: [makeTask(taskId, { sortOrder: 1, title: 'Wire the thing' })],
      validations: [redOnce],
    });

    await runOtLoop({
      deps: world.deps,
      maxRetries: 2,
      planId: 'plan',
      taskId: undefined,
    });

    expect(world.workerInputs.map((input) => input.attempt)).toEqual([1, 2]);
    expect(world.validatorAttempts).toEqual([1, 2]);

    const scoped = world.narrations.filter((entry) => entry.taskId === taskId);

    expect(scoped.length).toBeGreaterThan(2);
    expect(
      scoped
        .filter((entry) => entry.message !== 'task started: Wire the thing')
        .map((entry) => entry.attempt),
    ).toEqual(expect.arrayContaining([1, 2]));
    expect(scoped.every((entry) => entry.attempt !== undefined)).toBe(true);
    expect(
      world.narrations
        .filter((entry) => entry.taskId === undefined)
        .every((entry) => entry.attempt === undefined),
    ).toBe(true);
  });

  it('names the failing command and its first error in the attempt-failed line', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      validations: [redOnce],
    });

    await runOtLoop({
      deps: world.deps,
      maxRetries: 2,
      planId: 'plan',
      taskId: undefined,
    });

    expect(world.narrations.map((entry) => entry.message)).toContain(
      'attempt 1 failed: lint,test exited 1: src/a.ts: error TS2322: nope; retrying',
    );
  });

  it('counts the commit-fix attempt and reports the commit output', async () => {
    const world = makeWorld({
      commitResults: [{ kind: 'failed', output: 'subject too long\nmore' }],
      tasks: [makeTask('1')],
    });

    await runOtLoop({
      deps: world.deps,
      maxRetries: 2,
      planId: 'plan',
      taskId: undefined,
    });

    expect(world.workerInputs.map((input) => input.attempt)).toEqual([1, 2]);
  });

  it('puts titles, not ids, in the warning about other tasks changing', async () => {
    const ids = [
      '2a0c2d3e-0000-4000-8000-000000000001',
      '2a0c2d3e-0000-4000-8000-000000000002',
    ];
    const world = makeWorld({
      tasks: [
        makeTask(ids[0] ?? '', { sortOrder: 1, title: 'First' }),
        makeTask(ids[1] ?? '', { sortOrder: 2, title: 'Second one' }),
      ],
      worker: (input, w) => {
        const other = w.tasks.get(ids[1] ?? '');

        if (other !== undefined && input.task.id === ids[0]) {
          w.tasks.set(other.id, { ...other, status: 'SKIPPED' });
        }

        return done();
      },
    });

    await runOtLoop({
      deps: world.deps,
      maxRetries: 0,
      planId: 'plan',
      taskId: undefined,
    });

    const warning = world.narrations.find((entry) =>
      entry.message.includes('other task statuses changed'),
    );

    expect(warning?.message).toContain('"Second one" SKIPPED');
    expect(warning?.message).not.toMatch(UUID_PATTERN);
  });
});
