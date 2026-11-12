import { asMock } from '@openthrottle/nestjs-testing';
import { AppendPlanOutputDocument } from '@openthrottle/openthrottle-agentic-ralph';
import { describe, expect, it, vi } from 'vitest';

import type { OtLoopExecuteGraphql } from './ot-loop.types.ts';
import { createPlanOutputWriter } from './plan-output-writer.factory.ts';

describe('createPlanOutputWriter', () => {
  it('sends kind and the attempt as iteration, omitting both ids when unset', async () => {
    const execute = vi.fn(async () => ({}));
    const writer = createPlanOutputWriter({
      executeGraphqlV2: asMock<OtLoopExecuteGraphql>(execute),
      planId: 'plan-1',
    });

    writer.write({
      attempt: 2,
      kind: 'worker',
      taskId: 't1',
      text: 'hi',
    });
    writer.write({
      attempt: undefined,
      kind: 'loop',
      taskId: undefined,
      text: 'plan line',
    });
    await writer.settled();

    expect(execute).toHaveBeenNthCalledWith(1, AppendPlanOutputDocument, {
      input: {
        content: 'hi',
        iteration: 2,
        kind: 'worker',
        planId: 'plan-1',
        taskId: 't1',
      },
    });
    expect(execute).toHaveBeenNthCalledWith(2, AppendPlanOutputDocument, {
      input: { content: 'plan line', kind: 'loop', planId: 'plan-1' },
    });
  });
});
