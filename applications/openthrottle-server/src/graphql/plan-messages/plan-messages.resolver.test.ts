import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PUB_SUB } from '@openthrottle/nestjs-graphql';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type {
  PlanMessage,
  PlanOutputStreamChunk,
} from '@openthrottle/nestjs-repositories-server';
import {
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
  PlanMessagesRepository,
} from '@openthrottle/nestjs-repositories-server';
import { createPlanMessagesRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PlanMessagesResolver } from './plan-messages.resolver.ts';

const planId = 'c70fc1ea-c7de-4fe8-9722-44781ad80415';
const taskId = '2f1e7d4c-1b43-4a4c-9e3a-6bb1f3b4c001';
const planRunId = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

const buildMessage = (overrides: Partial<PlanMessage> = {}): PlanMessage => {
  return {
    author: 'visormatt',
    body: 'Use the shared helper',
    createdAt: new Date('2026-11-03T08:00:00.000Z'),
    deliveredAt: null,
    deliveredToTaskId: null,
    id: 'f1f2f3f4-0000-4000-8000-000000000001',
    kind: PLAN_MESSAGE_KIND.STEER,
    planId,
    planRunId: null,
    status: PLAN_MESSAGE_STATUS.PENDING,
    taskId: null,
    updatedAt: new Date('2026-11-03T08:00:00.000Z'),
    ...overrides,
  };
};

const mockPubSub = {
  asyncIterator: vi.fn().mockReturnValue({ next: vi.fn() }),
  publish: vi.fn().mockResolvedValue(undefined),
};

const planMessagesRepository = createPlanMessagesRepositoryMock();

const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

describe('PlanMessagesResolver', () => {
  let resolver: PlanMessagesResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPubSub.publish.mockResolvedValue(undefined);

    const app = await Test.createTestingModule({
      providers: [
        PlanMessagesResolver,
        { provide: PlanMessagesRepository, useValue: planMessagesRepository },
        { provide: GlobalClsService, useValue: mockCls },
        { provide: PUB_SUB, useValue: mockPubSub },
      ],
    }).compile();

    resolver = app.get(PlanMessagesResolver);
  });

  describe('planMessages', () => {
    test('passes omitted filters through as null', async () => {
      planMessagesRepository.listMessages.mockResolvedValue([buildMessage()]);

      const result = await resolver.planMessages({
        kinds: null,
        planId,
        statuses: null,
      });

      expect(planMessagesRepository.listMessages).toHaveBeenCalledWith({
        kinds: null,
        planId,
        statuses: null,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('postPlanMessage', () => {
    test('trims the body, keeps an explicit author and publishes the message', async () => {
      const message = buildMessage();
      planMessagesRepository.postMessage.mockResolvedValue({
        message,
        ok: true,
      });

      const result = await resolver.postPlanMessage(
        {
          author: 'alice',
          body: '  Use the shared helper  ',
          kind: PLAN_MESSAGE_KIND.STEER,
          planId,
          taskId,
        },
        undefined,
      );

      expect(planMessagesRepository.postMessage).toHaveBeenCalledWith({
        author: 'alice',
        body: 'Use the shared helper',
        kind: PLAN_MESSAGE_KIND.STEER,
        planId,
        taskId,
      });
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `plan:${planId}:messages`,
        { planMessageChanged: message },
      );
      expect(result).toBe(message);
    });

    test('stamps the author from the request identity when none is passed', async () => {
      vi.mocked(mockCls.get).mockReturnValue({
        displayName: 'visormatt',
        email: 'visormatt@example.com',
        isDeleted: false,
        roles: [],
        uuid: 'u1',
      });
      planMessagesRepository.postMessage.mockResolvedValue({
        message: buildMessage(),
        ok: true,
      });

      await resolver.postPlanMessage(
        {
          author: null,
          body: 'Also add a test',
          kind: PLAN_MESSAGE_KIND.QUEUE,
          planId,
          taskId: null,
        },
        undefined,
      );

      expect(planMessagesRepository.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'visormatt' }),
      );
    });

    test('rejects a blank body', async () => {
      await expect(
        resolver.postPlanMessage(
          {
            author: 'alice',
            body: '   ',
            kind: PLAN_MESSAGE_KIND.QUEUE,
            planId,
            taskId: null,
          },
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(planMessagesRepository.postMessage).not.toHaveBeenCalled();
    });

    test('rejects a call with no resolvable author', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await expect(
        resolver.postPlanMessage(
          {
            author: null,
            body: 'Hello',
            kind: PLAN_MESSAGE_KIND.QUEUE,
            planId,
            taskId: null,
          },
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps an unknown plan to NotFound', async () => {
      planMessagesRepository.postMessage.mockResolvedValue({
        ok: false,
        reason: 'PLAN_NOT_FOUND',
      });

      await expect(
        resolver.postPlanMessage(
          {
            author: 'alice',
            body: 'Hello',
            kind: PLAN_MESSAGE_KIND.QUEUE,
            planId,
            taskId: null,
          },
          undefined,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('withdrawPlanMessage', () => {
    test('returns and publishes the withdrawn message', async () => {
      const message = buildMessage({ status: PLAN_MESSAGE_STATUS.WITHDRAWN });
      planMessagesRepository.withdrawPendingMessage.mockResolvedValue({
        message,
        ok: true,
      });

      const result = await resolver.withdrawPlanMessage({ id: message.id });

      expect(result).toBe(message);
      expect(mockPubSub.publish).toHaveBeenCalledTimes(1);
    });

    test('maps NOT_FOUND to NotFound', async () => {
      planMessagesRepository.withdrawPendingMessage.mockResolvedValue({
        ok: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        resolver.withdrawPlanMessage({ id: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('maps NOT_PENDING to BadRequest', async () => {
      planMessagesRepository.withdrawPendingMessage.mockResolvedValue({
        ok: false,
        reason: 'NOT_PENDING',
      });

      await expect(
        resolver.withdrawPlanMessage({ id: 'delivered' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updatePlanMessage', () => {
    test('edits a pending message with the trimmed body', async () => {
      const message = buildMessage({ body: 'Edited' });
      planMessagesRepository.editPendingMessage.mockResolvedValue({
        message,
        ok: true,
      });

      const result = await resolver.updatePlanMessage({
        body: ' Edited ',
        id: message.id,
      });

      expect(planMessagesRepository.editPendingMessage).toHaveBeenCalledWith({
        body: 'Edited',
        id: message.id,
      });
      expect(result).toBe(message);
    });
  });

  describe('claimPlanMessages', () => {
    test('publishes nothing when the inbox was empty', async () => {
      planMessagesRepository.claimPendingMessages.mockResolvedValue({
        auditChunk: null,
        messages: [],
      });

      const result = await resolver.claimPlanMessages({
        planId,
        planRunId,
        taskId,
      });

      expect(result.messages).toEqual([]);
      expect(mockPubSub.publish).not.toHaveBeenCalled();
    });

    test('publishes each delivered message and the audit chunk', async () => {
      const delivered = buildMessage({
        deliveredAt: new Date('2026-11-03T09:00:00.000Z'),
        deliveredToTaskId: taskId,
        planRunId,
        status: PLAN_MESSAGE_STATUS.DELIVERED,
      });
      const auditChunk = createMock<PlanOutputStreamChunk>({
        content: '[inbox] Delivered 1 human message',
        id: 'chunk-1',
        planId,
        taskId,
      });
      planMessagesRepository.claimPendingMessages.mockResolvedValue({
        auditChunk,
        messages: [delivered],
      });

      await resolver.claimPlanMessages({ planId, planRunId, taskId });

      expect(planMessagesRepository.claimPendingMessages).toHaveBeenCalledWith({
        planId,
        planRunId,
        taskId,
      });
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `plan:${planId}:messages`,
        { planMessageChanged: delivered },
      );
      expect(mockPubSub.publish).toHaveBeenCalledWith(`plan:${planId}:output`, {
        planOutputChunkAdded: auditChunk,
      });
    });
  });

  describe('planMessageChanged', () => {
    test('rejects an unauthenticated connection', () => {
      expect(() => resolver.planMessageChanged(planId, {})).toThrow();
    });

    test('subscribes to the plan messages topic', () => {
      resolver.planMessageChanged(planId, { userId: 'u1' });

      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith(
        `plan:${planId}:messages`,
      );
    });
  });
});
