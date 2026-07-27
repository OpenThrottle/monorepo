import { describe, expect, test } from 'vitest';
import { managedTaskIdsFromRuleApplications } from '~/routing/plans/utils/managed-tasks';

describe('managedTaskIdsFromRuleApplications', () => {
  test('collects task ids of applied applications only', () => {
    const managed = managedTaskIdsFromRuleApplications([
      { state: 'applied', taskId: 'task-1' },
      { state: 'applied', taskId: 'task-2' },
      { state: 'pre-satisfied', taskId: 'task-3' },
      { state: 'flagged', taskId: 'task-4' },
      { state: 'orphaned', taskId: 'task-5' },
    ]);

    expect([...managed].sort()).toEqual(['task-1', 'task-2']);
  });

  test('ignores applied rows with no task id (deleted injected task)', () => {
    const managed = managedTaskIdsFromRuleApplications([
      { state: 'applied', taskId: null },
      { state: 'applied' },
    ]);

    expect(managed.size).toBe(0);
  });

  test('returns an empty set for no applications', () => {
    expect(managedTaskIdsFromRuleApplications([]).size).toBe(0);
  });
});
