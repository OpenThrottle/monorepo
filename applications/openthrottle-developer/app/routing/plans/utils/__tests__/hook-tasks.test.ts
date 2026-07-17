import { describe, expect, test } from 'vitest';
import { filterOutHookTasks, isHookTask } from '../hook-tasks';

describe('isHookTask', () => {
  test('is true when hookRole is set', () => {
    expect(isHookTask({ hookRole: 'before' })).toBe(true);
    expect(isHookTask({ hookRole: 'after' })).toBe(true);
  });

  test('is false when hookRole is null or undefined', () => {
    expect(isHookTask({ hookRole: null })).toBe(false);
    expect(isHookTask({})).toBe(false);
  });
});

describe('filterOutHookTasks', () => {
  test('keeps regular tasks and drops hook tasks', () => {
    const tasks = [
      { hookRole: null, id: 'regular-1' },
      { hookRole: 'before', id: 'hook-1' },
      { hookRole: null, id: 'regular-2' },
      { hookRole: 'after', id: 'hook-2' },
    ];

    expect(filterOutHookTasks(tasks).map((task) => task.id)).toEqual([
      'regular-1',
      'regular-2',
    ]);
  });

  test('returns all tasks when none are hooks', () => {
    const tasks = [{ id: 'a' }, { id: 'b' }];

    expect(filterOutHookTasks(tasks)).toHaveLength(2);
  });
});
