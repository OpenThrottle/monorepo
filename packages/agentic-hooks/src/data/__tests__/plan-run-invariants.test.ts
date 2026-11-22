import { describe, expect, it } from 'vitest';

import {
  committedTaskIdsOf,
  lookupInProgressTaskIds,
} from '../plan-run-invariants.ts';

describe('committedTaskIdsOf', () => {
  it('collects Task-Id footers from git commit commands only', () => {
    const ids = committedTaskIdsOf([
      'git commit -m "x" -m "Task-Id: aaa-1"',
      `git -C /repo commit -q -F - <<'EOF'\nTask-Id: bbb-2\nTask-Id: ccc-3\nEOF`,
      'echo "Task-Id: ddd-4"',
      'git log --grep "Task-Id: eee-5"',
    ]);
    expect([...ids]).toEqual(['aaa-1', 'bbb-2', 'ccc-3']);
  });
});

describe('lookupInProgressTaskIds', () => {
  it('returns the ids OT reports IN_PROGRESS', async () => {
    const ids = await lookupInProgressTaskIds({
      authToken: 'tok',
      fetchImpl: async () => {
        return {
          json: async () => ({
            data: {
              tasksByPlanId: [
                { id: 't1', status: 'IN_PROGRESS' },
                { id: 't2', status: 'COMPLETED' },
                { id: 3, status: 'IN_PROGRESS' },
              ],
            },
          }),
          ok: true,
          status: 200,
        };
      },
      graphqlUrl: 'http://example.test/graphql',
      planId: 'plan-1',
      timeoutMs: 100,
    });
    expect(ids).toEqual(['t1']);
  });

  it('is null, never a throw, when OT is down', async () => {
    const ids = await lookupInProgressTaskIds({
      authToken: '',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      planId: 'plan-1',
      timeoutMs: 100,
    });
    expect(ids).toBeNull();
  });
});
