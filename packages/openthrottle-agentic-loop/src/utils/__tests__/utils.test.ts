import { describe, expect, it } from 'vitest';

import { clampMaxRetries } from '../clampMaxRetries.ts';
import { closePlan } from '../closePlan.ts';
import { isThinTask } from '../isThinTask.ts';
import { selectNextTask } from '../selectNextTask.ts';
import { makeTask } from './loop-fakes.ts';

describe('closePlan', () => {
  it('errors when a task is still open', () => {
    const outcome = closePlan(
      [makeTask('1', { status: 'QUEUED' })],
      undefined,
      [],
    );

    expect(outcome.kind).toBe('failed');
  });

  it('prefers BLOCKED over COMPLETED', () => {
    const outcome = closePlan(
      [
        makeTask('1', { status: 'COMPLETED' }),
        makeTask('2', { status: 'BLOCKED' }),
      ],
      undefined,
      ['1'],
    );

    expect(outcome).toEqual({ blockedTaskIds: ['2'], kind: 'tasks_blocked' });
  });

  it('completes when everything is terminal', () => {
    const outcome = closePlan(
      [
        makeTask('1', { status: 'COMPLETED' }),
        makeTask('2', { status: 'SKIPPED' }),
      ],
      undefined,
      ['1'],
    );

    expect(outcome).toEqual({ completedTaskIds: ['1'], kind: 'complete' });
  });
});

describe('clampMaxRetries', () => {
  it.each([
    [undefined, 2],
    [Number.NaN, 2],
    [-3, 0],
    [3.9, 3],
    [99, 5],
  ])('maps %s to %s', (input, expected) => {
    expect(clampMaxRetries(input)).toBe(expected);
  });
});

describe('isThinTask', () => {
  it('is thin only when short AND without requirements', () => {
    expect(isThinTask(makeTask('1', { description: '', title: 'x' }))).toBe(
      true,
    );
    expect(
      isThinTask(
        makeTask('1', { description: '', requirements: ['a'], title: 'x' }),
      ),
    ).toBe(false);
    expect(
      isThinTask(makeTask('1', { description: 'x'.repeat(60), title: '' })),
    ).toBe(false);
  });
});

describe('selectNextTask', () => {
  it('ignores terminal tasks', () => {
    expect(
      selectNextTask([makeTask('1', { status: 'BLOCKED' })], undefined),
    ).toBeUndefined();
  });
});
