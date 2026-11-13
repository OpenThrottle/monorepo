import { describe, expect, it } from 'vitest';

import { runOtLoop } from '../runOtLoop.ts';
import type { FakeWorld } from './loop-fakes.ts';
import { done, makeTask, makeWorld, statusOf } from './loop-fakes.ts';

const run = (
  world: FakeWorld,
  extra: { maxRetries?: number; taskId?: string } = {},
) => {
  return runOtLoop({
    deps: world.deps,
    maxRetries: extra.maxRetries,
    planId: 'plan',
    taskId: extra.taskId,
  });
};

const red = {
  command: 'pnpm nx lint',
  exitCode: 1,
  kind: 'red',
  tail: 'boom',
} as const;

describe('runOtLoop happy path', () => {
  it('completes tasks in sortOrder and reports complete', async () => {
    const world = makeWorld({ tasks: [makeTask('2'), makeTask('1')] });
    const outcome = await run(world);

    expect(outcome).toEqual({ completedTaskIds: ['1', '2'], kind: 'complete' });
    expect(world.log.filter((entry) => entry.startsWith('work:'))).toEqual([
      'work:1',
      'work:2',
    ]);
    expect(world.violations).toEqual([]);
  });

  it('resumes an IN_PROGRESS task first and never has two IN_PROGRESS', async () => {
    const world = makeWorld({
      tasks: [
        makeTask('1'),
        makeTask('2', { sortOrder: 5, status: 'IN_PROGRESS' }),
        makeTask('3'),
      ],
    });

    await run(world);

    expect(world.log.filter((entry) => entry.startsWith('work:'))[0]).toBe(
      'work:2',
    );
    expect(world.violations).toEqual([]);
    expect(['1', '2', '3'].map((id) => statusOf(world, id))).toEqual([
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
    ]);
  });

  it('opens a per-task session with the routed model and ends only the previous one', async () => {
    const world = makeWorld({
      tasks: [makeTask('1', { category: 'hard' }), makeTask('2')],
    });

    await run(world);

    expect(world.sessions.map((session) => session.model)).toEqual([
      'big-model',
      'small-model',
    ]);
    expect(world.log.filter((entry) => entry.includes('session'))).toEqual([
      'start-session:s1:1',
      'end-session:s1',
      'start-session:s2:2',
      'end-session:s2',
    ]);
  });

  it('breaks sortOrder ties by createdAt', async () => {
    const world = makeWorld({
      tasks: [
        makeTask('1', { createdAt: '2026-01-02', sortOrder: 1 }),
        makeTask('2', { createdAt: '2026-01-01', sortOrder: 1 }),
      ],
    });

    await run(world);

    expect(world.log.filter((entry) => entry.startsWith('work:'))).toEqual([
      'work:2',
      'work:1',
    ]);
  });

  it('creates follow-ups after the commit and BEFORE the last task COMPLETED flip', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: () =>
        done({
          followUps: [{ category: null, description: 'd', title: 'next' }],
        }),
    });

    await run(world);

    const commit = world.log.indexOf('commit');
    const followUps = world.log.indexOf('followups:next');
    const completed = world.log.indexOf('task:1:COMPLETED');

    expect(commit).toBeLessThan(followUps);
    expect(followUps).toBeLessThan(completed);
  });

  it('restricts selection to the task in task-centric mode', async () => {
    const world = makeWorld({ tasks: [makeTask('1'), makeTask('2')] });
    const outcome = await run(world, { taskId: '2' });

    expect(outcome).toEqual({ completedTaskIds: ['2'], kind: 'complete' });
    expect(statusOf(world, '1')).toBe('PENDING');
  });

  it('fails task-centric mode for an unknown task', async () => {
    const world = makeWorld({ tasks: [makeTask('1')] });

    expect((await run(world, { taskId: 'nope' })).kind).toBe('failed');
  });
});

describe('runOtLoop three-way close', () => {
  it('reports tasks_blocked when any task ends BLOCKED and still continues', async () => {
    const world = makeWorld({
      tasks: [makeTask('1'), makeTask('2')],
      worker: (input) =>
        input.task.id === '1' ? done({ status: 'blocked' }) : done(),
    });
    const outcome = await run(world);

    expect(outcome).toEqual({ blockedTaskIds: ['1'], kind: 'tasks_blocked' });
    expect(statusOf(world, '2')).toBe('COMPLETED');
    expect(world.log).toContain('discard:1');
  });

  it('reports complete when nothing is blocked', async () => {
    const world = makeWorld({
      tasks: [makeTask('1', { status: 'COMPLETED' })],
    });

    expect((await run(world)).kind).toBe('complete');
  });

  it('treats a pre-existing BLOCKED task as blocking the plan', async () => {
    const world = makeWorld({ tasks: [makeTask('1', { status: 'BLOCKED' })] });

    expect(await run(world)).toEqual({
      blockedTaskIds: ['1'],
      kind: 'tasks_blocked',
    });
  });
});

describe('runOtLoop thin tasks', () => {
  it('blocks a thin task without invoking the worker', async () => {
    const world = makeWorld({
      tasks: [makeTask('1', { description: 'x', title: 'y' })],
    });
    const outcome = await run(world);

    expect(world.workerInputs).toHaveLength(0);
    expect(statusOf(world, '1')).toBe('BLOCKED');
    expect(outcome.kind).toBe('tasks_blocked');
  });

  it('delegates a short task that has requirements', async () => {
    const world = makeWorld({
      tasks: [
        makeTask('1', { description: 'x', requirements: ['do z'], title: 'y' }),
      ],
    });

    await run(world);

    expect(world.workerInputs).toHaveLength(1);
  });
});

describe('runOtLoop retries', () => {
  it('re-invokes the worker with the failure and completes on green', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      validations: [red, red],
    });
    const outcome = await run(world);

    expect(outcome.kind).toBe('complete');
    expect(world.workerInputs).toHaveLength(3);
    expect(world.workerInputs[1]?.previousFailure).toEqual({
      command: 'pnpm nx lint',
      exitCode: 1,
      kind: 'validation',
      tail: 'boom',
    });
  });

  it('blocks after the last red attempt and continues to the next task', async () => {
    const world = makeWorld({
      tasks: [makeTask('1'), makeTask('2')],
      validations: [red, red, red],
    });
    const outcome = await run(world);

    expect(world.workerInputs.filter((i) => i.task.id === '1')).toHaveLength(3);
    expect(statusOf(world, '1')).toBe('BLOCKED');
    expect(statusOf(world, '2')).toBe('COMPLETED');
    expect(outcome.kind).toBe('tasks_blocked');
  });

  it('honours maxRetries 0 and clamps above 5', async () => {
    const none = makeWorld({ tasks: [makeTask('1')], validations: [red] });

    await run(none, { maxRetries: 0 });
    expect(none.workerInputs).toHaveLength(1);

    const many = makeWorld({
      tasks: [makeTask('1')],
      validations: Array.from({ length: 20 }, () => red),
    });

    await run(many, { maxRetries: 99 });
    expect(many.workerInputs).toHaveLength(6);
  });

  it.each([
    ['missing', { kind: 'missing' }],
    ['malformed', { error: 'bad', kind: 'malformed' }],
    ['error', { kind: 'error', message: 'exit 1' }],
  ] as const)(
    'treats %s as a failed attempt that consumes a retry',
    async (_name, result) => {
      const world = makeWorld({ tasks: [makeTask('1')], worker: () => result });

      await run(world);

      expect(world.workerInputs).toHaveLength(3);
      expect(statusOf(world, '1')).toBe('BLOCKED');
    },
  );

  it('discards follow-ups from failed attempts', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      validations: [red],
      worker: () =>
        done({
          followUps: [{ category: null, description: 'd', title: 'dup' }],
        }),
    });

    await run(world, { maxRetries: 1 });

    // Attempt 1 is red (discarded); attempt 2 is green and creates its follow-ups once.
    expect(world.log.filter((entry) => entry.startsWith('followups:'))).toEqual(
      ['followups:dup'],
    );
  });

  it('blocks a blocked result without validation or retry, keeping its follow-ups', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: () =>
        done({
          followUps: [{ category: null, description: 'd', title: 'unblock' }],
          status: 'blocked',
        }),
    });

    await run(world);

    expect(world.workerInputs).toHaveLength(1);
    expect(world.log).not.toContain('validate');
    expect(world.log).toContain('followups:unblock');
    expect(statusOf(world, '1')).toBe('BLOCKED');
  });
});

describe('runOtLoop skipped results', () => {
  it('honours skipped only when the attempt carried operator guidance', async () => {
    const world = makeWorld({
      inbox: [['skip the UI task']],
      tasks: [makeTask('1')],
      worker: () => done({ status: 'skipped' }),
    });

    await run(world);

    expect(statusOf(world, '1')).toBe('SKIPPED');
  });

  it('treats skipped without guidance as blocked', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: () => done({ status: 'skipped' }),
    });

    await run(world);

    expect(statusOf(world, '1')).toBe('BLOCKED');
  });
});

describe('runOtLoop commit failures', () => {
  it('gives one commit-fix attempt outside maxRetries, then re-validates and commits', async () => {
    const world = makeWorld({
      commitResults: [{ kind: 'failed', output: 'hook said no' }],
      tasks: [makeTask('1')],
    });
    const outcome = await run(world, { maxRetries: 0 });

    expect(outcome.kind).toBe('complete');
    expect(world.workerInputs[1]?.previousFailure).toEqual({
      kind: 'commit',
      output: 'hook said no',
    });
    expect(world.log.filter((entry) => entry === 'validate')).toHaveLength(2);
  });

  it('blocks on a second commit failure and creates no follow-ups', async () => {
    const world = makeWorld({
      commitResults: [
        { kind: 'failed', output: 'one' },
        { kind: 'failed', output: 'two' },
      ],
      tasks: [makeTask('1')],
      worker: () =>
        done({ followUps: [{ category: null, description: 'd', title: 'f' }] }),
    });

    await run(world);

    expect(statusOf(world, '1')).toBe('BLOCKED');
    expect(world.log).toContain('discard:1');
  });

  it('accepts nothing_to_commit', async () => {
    const world = makeWorld({
      commitResults: [{ kind: 'nothing_to_commit' }],
      tasks: [makeTask('1')],
    });

    expect((await run(world)).kind).toBe('complete');
  });
});

describe('runOtLoop cancel', () => {
  it('stops at a task boundary and reports cancelled without touching later tasks', async () => {
    const world = makeWorld({ tasks: [makeTask('1'), makeTask('2')] });

    world.cancelAfterPolls = 1;

    const outcome = await run(world);

    expect(outcome.kind).toBe('cancelled');
    expect(statusOf(world, '1')).toBe('COMPLETED');
    expect(statusOf(world, '2')).toBe('PENDING');
  });

  it('cancels before any task when already cancelled', async () => {
    const world = makeWorld({ tasks: [makeTask('1')] });

    world.cancelAfterPolls = 0;

    expect(await run(world)).toEqual({ kind: 'cancelled', taskId: undefined });
    expect(world.workerInputs).toHaveLength(0);
  });

  it('returns the current task to PENDING (not BLOCKED) when the signal aborts mid-attempt', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: (_input, w) => {
        w.abort.abort();

        return { kind: 'aborted' };
      },
    });
    const outcome = await run(world);

    expect(outcome).toEqual({ kind: 'cancelled', taskId: '1' });
    expect(statusOf(world, '1')).toBe('PENDING');
    expect(world.log).toContain('discard:1');
    expect(world.log).toContain('end-session:s1');
  });

  it('cancels between attempts', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      validations: [red, red],
    });

    world.cancelAfterPolls = 1;

    const outcome = await run(world);

    expect(outcome.kind).toBe('cancelled');
    expect(statusOf(world, '1')).toBe('PENDING');
    expect(world.workerInputs).toHaveLength(1);
  });
});

describe('runOtLoop usage limit', () => {
  it('returns the task to PENDING with the worktree untouched', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: () => ({ kind: 'usage_limited' }),
    });
    const outcome = await run(world);

    expect(outcome).toEqual({ kind: 'usage_limited', taskId: '1' });
    expect(statusOf(world, '1')).toBe('PENDING');
    expect(world.log.some((entry) => entry.startsWith('discard'))).toBe(false);
  });
});

describe('runOtLoop inbox', () => {
  it('accumulates claimed messages and passes the whole list to every later worker', async () => {
    const world = makeWorld({
      inbox: [['first'], [], ['second']],
      tasks: [makeTask('1'), makeTask('2'), makeTask('3')],
    });

    await run(world);

    expect(world.workerInputs.map((input) => input.guidance)).toEqual([
      ['first'],
      ['first'],
      ['first', 'second'],
    ]);
  });
});

describe('runOtLoop worker guards', () => {
  it('restores HEAD and the branch when the worker moved them', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: (_input, w) => {
        w.head = { branch: 'other', sha: 'moved' };

        return done();
      },
    });

    await run(world);

    expect(world.log).toContain('restore:start');
  });

  it('restores task and plan to IN_PROGRESS when the worker flips them', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: (_input, w) => {
        w.tasks.set('1', { ...makeTask('1'), status: 'COMPLETED' });
        w.planStatus = 'COMPLETED';

        return done();
      },
    });

    await run(world);

    expect(world.log).toContain('plan:IN_PROGRESS');
    expect(
      world.log.filter((entry) => entry === 'task:1:IN_PROGRESS'),
    ).toHaveLength(2);
    expect(statusOf(world, '1')).toBe('COMPLETED');
  });
});

describe('runOtLoop failure containment', () => {
  it('returns failed and puts the current task back to PENDING when a dependency throws', async () => {
    const world = makeWorld({ tasks: [makeTask('1')] });
    const outcome = await runOtLoop({
      deps: {
        ...world.deps,
        validator: {
          validate: () => Promise.reject(new Error('validator down')),
        },
      },
      maxRetries: undefined,
      planId: 'plan',
      taskId: undefined,
    });

    expect(outcome).toEqual({ kind: 'failed', reason: 'validator down' });
    expect(statusOf(world, '1')).toBe('PENDING');
  });

  it('treats a throwing worker as a failed attempt', async () => {
    const world = makeWorld({
      tasks: [makeTask('1')],
      worker: () => {
        throw new Error('spawn failed');
      },
    });

    await run(world);

    expect(statusOf(world, '1')).toBe('BLOCKED');
    expect(world.workerInputs).toHaveLength(3);
  });
});
