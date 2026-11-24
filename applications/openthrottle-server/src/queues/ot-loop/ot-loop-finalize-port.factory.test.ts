import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it, vi } from 'vitest';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  GetTasksByPlanIdDocument,
} from '../../__generated__/graphql.ts';
import type { OtLoopExecuteGraphql } from './ot-loop.types.ts';
import { createOtLoopFinalizePort } from './ot-loop-finalize-port.factory.ts';

const PLAN_ID = 'plan-1';

describe('createOtLoopFinalizePort', () => {
  it('appends the content to the plan output without a kind, task or iteration', async () => {
    const execute = vi.fn(async () => ({}));
    const port = createOtLoopFinalizePort({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
    });

    await port.appendOutput({ content: 'finalize: pushed', planId: PLAN_ID });

    expect(execute).toHaveBeenCalledWith(AppendPlanOutputDocument, {
      input: { content: 'finalize: pushed', planId: PLAN_ID },
    });
  });

  it('reads the plan row by id', async () => {
    const plan = { description: 'd', summary: null, title: 'Plan' };
    const execute = vi.fn(async () => ({ plan }));
    const port = createOtLoopFinalizePort({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
    });

    await expect(port.readPlan(PLAN_ID)).resolves.toBe(plan);
    expect(execute).toHaveBeenCalledWith(GetPlanDocument, { id: PLAN_ID });
  });

  it('reads the plan tasks by plan id', async () => {
    const tasksByPlanId = [
      {
        createdAt: '2026-11-01T00:00:00.000Z',
        id: 't1',
        sortOrder: 1000,
        status: 'COMPLETED',
        summary: null,
        title: 'Task',
      },
    ];
    const execute = vi.fn(async () => ({ tasksByPlanId }));
    const port = createOtLoopFinalizePort({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
    });

    await expect(port.readTasks(PLAN_ID)).resolves.toBe(tasksByPlanId);
    expect(execute).toHaveBeenCalledWith(GetTasksByPlanIdDocument, {
      input: { planId: PLAN_ID },
    });
  });

  it('lets a rejected GraphQL call reject, for the loop package to treat as best effort', async () => {
    const execute = vi.fn(async () => {
      throw new Error('offline');
    });
    const port = createOtLoopFinalizePort({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
    });

    await expect(port.readPlan(PLAN_ID)).rejects.toThrow('offline');
  });
});
