import { describe, expect, it, vi } from 'vitest';

import {
  decidePlanAutoClose,
  lookupTaskPlan,
  type TaskPlanLookup,
} from '../plan-auto-close.ts';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const PLAN_ID = '586bcff7-dbef-4e2c-ae22-d3f9210b2a39';

const lookupReturning = (result: TaskPlanLookup | null) => {
  return vi.fn(async (_id: string): Promise<TaskPlanLookup | null> => result);
};

const planWith = (planStatus: string): TaskPlanLookup => {
  return { planId: PLAN_ID, planStatus, taskTitle: 'Ship it' };
};

describe('decidePlanAutoClose', () => {
  it('reports a completed last task that closed the plan', async () => {
    const message = await decidePlanAutoClose({
      lookup: lookupReturning(planWith('COMPLETED')),
      status: 'completed',
      taskId: TASK_ID,
    });
    expect(message).toContain(PLAN_ID);
    expect(message).toContain('Ship it');
    expect(message).toContain('update_plan IN_PROGRESS');
  });

  it('says nothing when the plan is still open', async () => {
    const message = await decidePlanAutoClose({
      lookup: lookupReturning(planWith('IN_PROGRESS')),
      status: 'COMPLETED',
      taskId: TASK_ID,
    });
    expect(message).toBeNull();
  });

  it('says nothing for a BLOCKED status, without a lookup', async () => {
    const lookup = lookupReturning(planWith('COMPLETED'));
    const message = await decidePlanAutoClose({
      lookup,
      status: 'BLOCKED',
      taskId: TASK_ID,
    });
    expect(message).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('says nothing when the lookup fails', async () => {
    const message = await decidePlanAutoClose({
      lookup: lookupReturning(null),
      status: 'COMPLETED',
      taskId: TASK_ID,
    });
    expect(message).toBeNull();
  });

  it('says nothing without a task id', async () => {
    const message = await decidePlanAutoClose({
      lookup: lookupReturning(planWith('COMPLETED')),
      status: 'COMPLETED',
      taskId: null,
    });
    expect(message).toBeNull();
  });
});

describe('lookupTaskPlan', () => {
  const run = (fetchImpl: typeof globalThis.fetch, graphqlUrl = 'http://x') => {
    return lookupTaskPlan({
      authToken: 't',
      fetchImpl,
      graphqlUrl,
      taskId: TASK_ID,
      timeoutMs: 100,
    });
  };

  it('maps a clean response', async () => {
    const body = {
      data: {
        task: {
          id: TASK_ID,
          plan: { id: PLAN_ID, status: 'COMPLETED' },
          planId: PLAN_ID,
          title: 'Ship it',
        },
      },
    };
    const result = await run(async () => new Response(JSON.stringify(body)));
    expect(result).toEqual(planWith('COMPLETED'));
  });

  it('is null without an endpoint', async () => {
    expect(await run(vi.fn(), '')).toBeNull();
  });

  it('is null on an HTTP error, a throw, or a missing task', async () => {
    expect(
      await run(async () => new Response('{}', { status: 500 })),
    ).toBeNull();
    expect(
      await run(async () => {
        throw new Error('boom');
      }),
    ).toBeNull();
    expect(
      await run(
        async () => new Response(JSON.stringify({ data: { task: null } })),
      ),
    ).toBeNull();
  });
});
