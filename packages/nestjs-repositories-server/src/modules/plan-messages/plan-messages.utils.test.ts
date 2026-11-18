import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PLAN_MESSAGE_KIND } from './plan-messages.constants.ts';
import { createPlanMessagesRepositoryMock } from './plan-messages.utils.ts';

describe('createPlanMessagesRepositoryMock', () => {
  it('starts as an empty plan_messages table with no plans', async () => {
    const repository = createPlanMessagesRepositoryMock();

    await expect(
      repository.listMessages({ kinds: null, planId: 'p', statuses: null }),
    ).resolves.toEqual([]);
    await expect(
      repository.postMessage({
        author: 'a',
        body: 'b',
        kind: PLAN_MESSAGE_KIND.QUEUE,
        planId: 'p',
        taskId: null,
      }),
    ).resolves.toEqual({ ok: false, reason: 'PLAN_NOT_FOUND' });
    await expect(repository.withdrawPendingMessage('m')).resolves.toEqual({
      ok: false,
      reason: 'NOT_FOUND',
    });
    await expect(
      repository.claimPendingMessages({
        planId: 'p',
        planRunId: null,
        taskId: null,
      }),
    ).resolves.toEqual({ auditChunk: null, messages: [] });
  });

  it('names the plan_messages table in inherited not-found errors', async () => {
    const repository = createPlanMessagesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'plan_messages record with ID "a" not found',
    );
  });
});
