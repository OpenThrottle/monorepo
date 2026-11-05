import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanOutputStreamChunk } from '../plan-output-stream/plan-output-stream.entity.ts';
import { Plan } from '../plans/plan.entity.ts';
import { PlanMessage } from './plan-message.entity.ts';
import { planMessageFactory } from './plan-message.factory.ts';
import {
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
} from './plan-messages.constants.ts';
import { PlanMessagesService } from './plan-messages.service.ts';

describe('PlanMessagesService', () => {
  const planId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const planRunId = 'b1b2b3b4-0000-4000-8000-000000000002';
  const taskId = 'c1c2c3c4-0000-4000-8000-000000000003';

  const isEntityTarget = (entity: unknown, target: unknown): boolean => {
    return (
      entity === target ||
      (typeof entity === 'function' &&
        typeof target === 'function' &&
        entity.name === target.name)
    );
  };

  const planRepository = { exists: vi.fn() };

  const mockRepository = {
    create: vi.fn((data: Partial<PlanMessage>) =>
      planMessageFactory.build(data),
    ),
    find: vi.fn(),
    findOne: vi.fn(),
    manager: {
      getRepository: vi.fn((entity: unknown) => {
        if (isEntityTarget(entity, Plan)) return planRepository;
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: vi.fn(),
    },
    save: vi.fn((entity: PlanMessage) => Promise.resolve(entity)),
    update: vi.fn(),
  };

  let service: PlanMessagesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanMessagesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(PlanMessage),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = app.get(PlanMessagesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('postMessage', () => {
    it('refuses a plan that does not exist', async () => {
      planRepository.exists.mockResolvedValue(false);

      const result = await service.postMessage({
        author: 'visormatt',
        body: 'Use the shared helper',
        kind: PLAN_MESSAGE_KIND.STEER,
        planId,
        taskId: null,
      });

      expect(result).toEqual({ ok: false, reason: 'PLAN_NOT_FOUND' });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('creates STEER and QUEUE messages PENDING', async () => {
      planRepository.exists.mockResolvedValue(true);

      const result = await service.postMessage({
        author: 'visormatt',
        body: 'Also add a test',
        kind: PLAN_MESSAGE_KIND.QUEUE,
        planId,
        taskId,
      });

      expect(result.ok).toBe(true);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: PLAN_MESSAGE_KIND.QUEUE,
          status: PLAN_MESSAGE_STATUS.PENDING,
          taskId,
        }),
      );
    });

    it('creates FEEDBACK messages RECORDED so they are never claimed', async () => {
      planRepository.exists.mockResolvedValue(true);

      await service.postMessage({
        author: 'visormatt',
        body: 'The run went well',
        kind: PLAN_MESSAGE_KIND.FEEDBACK,
        planId,
        taskId: null,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PLAN_MESSAGE_STATUS.RECORDED }),
      );
    });
  });

  describe('withdrawPendingMessage', () => {
    it('withdraws a PENDING message', async () => {
      const message = planMessageFactory.build({
        status: PLAN_MESSAGE_STATUS.WITHDRAWN,
      });
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(message);

      const result = await service.withdrawPendingMessage(message.id);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: message.id, status: PLAN_MESSAGE_STATUS.PENDING },
        { status: PLAN_MESSAGE_STATUS.WITHDRAWN },
      );
      expect(result).toEqual({ message, ok: true });
    });

    it('reports NOT_PENDING for a message that was already delivered', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });
      mockRepository.findOne.mockResolvedValue(
        planMessageFactory.build({ status: PLAN_MESSAGE_STATUS.DELIVERED }),
      );

      const result = await service.withdrawPendingMessage('m-1');

      expect(result).toEqual({ ok: false, reason: 'NOT_PENDING' });
    });

    it('reports NOT_FOUND for an unknown id', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.withdrawPendingMessage('missing');

      expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' });
    });
  });

  describe('claimPendingMessages', () => {
    const buildTransaction = (pending: readonly PlanMessage[]) => {
      const messageRepoInTx = {
        find: vi
          .fn()
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(
            pending.map((message) => ({
              ...message,
              status: PLAN_MESSAGE_STATUS.DELIVERED,
            })),
          ),
        update: vi.fn().mockResolvedValue({ affected: pending.length }),
      };
      const chunkRepoInTx = {
        create: vi.fn((data: Partial<PlanOutputStreamChunk>) => data),
        save: vi.fn((data: Partial<PlanOutputStreamChunk>) =>
          Promise.resolve({ ...data, id: 'chunk-1' }),
        ),
      };

      mockRepository.manager.transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) =>
          callback({
            getRepository: (entity: unknown) => {
              if (isEntityTarget(entity, PlanMessage)) return messageRepoInTx;
              if (isEntityTarget(entity, PlanOutputStreamChunk)) {
                return chunkRepoInTx;
              }
              throw new Error(`Unexpected entity: ${String(entity)}`);
            },
          }),
      );

      return { chunkRepoInTx, messageRepoInTx };
    };

    it('returns nothing and writes no audit chunk when the inbox is empty', async () => {
      const { chunkRepoInTx, messageRepoInTx } = buildTransaction([]);

      const result = await service.claimPendingMessages({
        planId,
        planRunId,
        taskId,
      });

      expect(result).toEqual({ auditChunk: null, messages: [] });
      expect(messageRepoInTx.update).not.toHaveBeenCalled();
      expect(chunkRepoInTx.save).not.toHaveBeenCalled();
    });

    it('locks the pending rows it reads', async () => {
      const { messageRepoInTx } = buildTransaction([]);

      await service.claimPendingMessages({ planId, planRunId, taskId });

      expect(messageRepoInTx.find).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
          where: expect.objectContaining({
            planId,
            status: PLAN_MESSAGE_STATUS.PENDING,
          }),
        }),
      );
    });

    it('marks messages delivered, STEERs first, and records one audit chunk', async () => {
      const queue = planMessageFactory.build({
        author: 'alice',
        body: 'Also update the README',
        createdAt: new Date('2026-11-01T00:00:00Z'),
        kind: PLAN_MESSAGE_KIND.QUEUE,
        planId,
      });
      const steer = planMessageFactory.build({
        author: 'bob',
        body: 'Stop, use the existing helper',
        createdAt: new Date('2026-11-02T00:00:00Z'),
        kind: PLAN_MESSAGE_KIND.STEER,
        planId,
      });
      const { chunkRepoInTx, messageRepoInTx } = buildTransaction([
        queue,
        steer,
      ]);

      const result = await service.claimPendingMessages({
        planId,
        planRunId,
        taskId,
      });

      expect(messageRepoInTx.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deliveredAt: expect.any(Date),
          deliveredToTaskId: taskId,
          planRunId,
          status: PLAN_MESSAGE_STATUS.DELIVERED,
        }),
      );
      expect(result.messages.map((message) => message.kind)).toEqual([
        PLAN_MESSAGE_KIND.STEER,
        PLAN_MESSAGE_KIND.QUEUE,
      ]);
      expect(chunkRepoInTx.save).toHaveBeenCalledTimes(1);

      const content = chunkRepoInTx.create.mock.calls[0]?.[0]?.content ?? '';

      expect(chunkRepoInTx.create).toHaveBeenCalledWith(
        expect.objectContaining({ planId, taskId }),
      );
      expect(content.indexOf('[inbox:STEER from @bob]')).toBeGreaterThan(-1);
      expect(content.indexOf('[inbox:STEER from @bob]')).toBeLessThan(
        content.indexOf('[inbox:QUEUE from @alice]'),
      );
      expect(result.auditChunk).toMatchObject({ id: 'chunk-1' });
    });
  });
});
