import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { PlanMessage } from './plan-message.entity.ts';
import type { PlanMessagesRepository } from './plan-messages.repository.ts';
import type { PlanMessagesRepositoryMock } from './plan-messages.types.ts';

/**
 * @description Builds a {@link PlanMessagesRepositoryMock} that starts as an empty `plan_messages`
 * table with no plans (see `createBaseRepositoryMock`): `listMessages` resolves no messages,
 * `postMessage` reports `PLAN_NOT_FOUND`, the PENDING-guarded edit and withdraw report
 * `NOT_FOUND`, and a claim delivers nothing. Provide it in place of `PlanMessagesRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createPlanMessagesRepositoryMock(): PlanMessagesRepositoryMock {
  return {
    ...createBaseRepositoryMock<PlanMessage, CreateModelInput<PlanMessage>>(
      'plan_messages',
    ),
    claimPendingMessages: vi.fn(async () => {
      return { auditChunk: null, messages: [] };
    }),
    editPendingMessage: vi.fn<PlanMessagesRepository['editPendingMessage']>(
      async () => {
        return { ok: false, reason: 'NOT_FOUND' };
      },
    ),
    listMessages: vi.fn(async () => {
      return [];
    }),
    postMessage: vi.fn<PlanMessagesRepository['postMessage']>(async () => {
      return { ok: false, reason: 'PLAN_NOT_FOUND' };
    }),
    withdrawPendingMessage: vi.fn<
      PlanMessagesRepository['withdrawPendingMessage']
    >(async () => {
      return { ok: false, reason: 'NOT_FOUND' };
    }),
  };
}
