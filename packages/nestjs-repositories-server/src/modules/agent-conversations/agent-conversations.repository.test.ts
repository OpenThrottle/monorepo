import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Plan } from '../plans/plan.entity.ts';
import { Project } from '../projects/project.entity.ts';
import { AgentConversation } from './agent-conversation.entity.ts';
import { AGENT_CONVERSATION_STATUSES } from './agent-conversations.constants.ts';
import { agentConversationsFactory } from './agent-conversations.factory.ts';
import { AgentConversationsRepository } from './agent-conversations.repository.ts';

describe('AgentConversationsRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const conversationId = '22222222-2222-4222-8222-222222222222';
  const planId = '33333333-3333-4333-8333-333333333333';

  const isEntityTarget = (entity: unknown, target: unknown): boolean => {
    return (
      entity === target ||
      (typeof entity === 'function' &&
        typeof target === 'function' &&
        entity.name === target.name)
    );
  };

  const mockConversation = agentConversationsFactory.build({
    id: conversationId,
    userId,
  });

  const planRepository = { exists: vi.fn() };
  const projectRepository = { exists: vi.fn() };

  const mockRepository = {
    count: vi.fn(),
    create: vi.fn((data: Partial<AgentConversation>) => {
      return { ...mockConversation, ...data };
    }),
    find: vi.fn(),
    findOne: vi.fn(),
    manager: {
      getRepository: vi.fn((entity: unknown) => {
        if (isEntityTarget(entity, Plan)) return planRepository;
        if (isEntityTarget(entity, Project)) return projectRepository;
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
    },
    save: vi.fn((entity: AgentConversation) => Promise.resolve(entity)),
    target: AgentConversation,
    update: vi.fn(),
  };

  let repository: AgentConversationsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationsRepository,
        {
          provide: getRepositoryToken(AgentConversation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = app.get(AgentConversationsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.findOne.mockResolvedValue({ ...mockConversation });
  });

  describe('createConversation', () => {
    it('creates an active conversation for the user', async () => {
      const result = await repository.createConversation(userId, {
        title: 'My chat',
      });

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.active);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AGENT_CONVERSATION_STATUSES.active,
          title: 'My chat',
          userId,
        }),
      );
    });

    it('checks a given plan exists among live plans', async () => {
      planRepository.exists.mockResolvedValue(true);

      await repository.createConversation(userId, { planId });

      expect(planRepository.exists).toHaveBeenCalledWith({
        where: { id: planId },
      });
    });

    it('throws NotFoundException when the plan does not exist', async () => {
      planRepository.exists.mockResolvedValue(false);

      await expect(
        repository.createConversation(userId, { planId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the project does not exist', async () => {
      projectRepository.exists.mockResolvedValue(false);

      await expect(
        repository.createConversation(userId, { projectId: planId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getConversationForUser', () => {
    it('reads the conversation scoped to its owner', async () => {
      await repository.getConversationForUser(userId, conversationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: conversationId, userId },
      });
    });

    it('throws NotFoundException when it is missing, deleted or not owned', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.getConversationForUser(userId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listConversationsForUser', () => {
    it('queries with the default active status and clamped limit', async () => {
      mockRepository.find.mockResolvedValue([mockConversation]);

      const result = await repository.listConversationsForUser(userId);

      expect(result).toEqual([mockConversation]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { updatedAt: 'DESC' },
        skip: 0,
        take: 20,
        where: { status: AGENT_CONVERSATION_STATUSES.active, userId },
      });
    });
  });

  describe('countConversationsForUser', () => {
    it('counts the user conversations in one status', async () => {
      mockRepository.count.mockResolvedValue(3);

      await expect(
        repository.countConversationsForUser(
          userId,
          AGENT_CONVERSATION_STATUSES.archived,
        ),
      ).resolves.toBe(3);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { status: AGENT_CONVERSATION_STATUSES.archived, userId },
      });
    });
  });

  describe('archiveConversation', () => {
    it('sets status to archived for an owned conversation', async () => {
      const result = await repository.archiveConversation(
        userId,
        conversationId,
      );

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.archived);
    });
  });

  describe('softDeleteConversation', () => {
    it('sets status to deleted and stamps deleted_at in one update', async () => {
      const deletedAt = new Date('2026-11-18T00:00:00.000Z');

      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockConversation })
        .mockResolvedValueOnce({
          ...mockConversation,
          deletedAt,
          status: AGENT_CONVERSATION_STATUSES.deleted,
        });

      const result = await repository.softDeleteConversation(
        userId,
        conversationId,
      );

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: conversationId, userId },
        {
          deletedAt: expect.any(Date),
          status: AGENT_CONVERSATION_STATUSES.deleted,
        },
      );
      expect(mockRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: conversationId },
        withDeleted: true,
      });
      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.deleted);
      expect(result.deletedAt).toBe(deletedAt);
    });

    it('throws when the conversation is not owned or already deleted', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.softDeleteConversation(userId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('restoreConversation', () => {
    it('sets a deleted conversation back to active and clears deleted_at', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({
          ...mockConversation,
          deletedAt: new Date('2026-11-18T00:00:00.000Z'),
          status: AGENT_CONVERSATION_STATUSES.deleted,
        })
        .mockResolvedValueOnce({
          ...mockConversation,
          deletedAt: null,
          status: AGENT_CONVERSATION_STATUSES.active,
        });

      const result = await repository.restoreConversation(
        userId,
        conversationId,
      );

      expect(mockRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: conversationId, userId },
        withDeleted: true,
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: conversationId, userId },
        { deletedAt: null, status: AGENT_CONVERSATION_STATUSES.active },
      );
      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.active);
    });

    it('returns a non-deleted conversation unchanged without writing', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockConversation,
        status: AGENT_CONVERSATION_STATUSES.archived,
      });

      const result = await repository.restoreConversation(
        userId,
        conversationId,
      );

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.archived);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws when the conversation does not exist or is not owned', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.restoreConversation(userId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateConversationTitle', () => {
    it('updates the title of an owned conversation', async () => {
      const result = await repository.updateConversationTitle(
        userId,
        conversationId,
        'Renamed',
      );

      expect(result.title).toBe('Renamed');
    });
  });

  describe('updateModelSnapshot', () => {
    it('updates the model provider and name', async () => {
      const result = await repository.updateModelSnapshot(conversationId, {
        modelName: 'gpt-4.1',
        modelProvider: 'openai',
      });

      expect(result.modelProvider).toBe('openai');
      expect(result.modelName).toBe('gpt-4.1');
    });

    it('throws NotFoundException for a missing or deleted conversation', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateModelSnapshot(conversationId, {
          modelName: null,
          modelProvider: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateMetadata', () => {
    it('shallow-merges the patch into existing metadata', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockConversation,
        metadata: { keep: 1, replace: 'old' },
      });

      const result = await repository.updateMetadata(conversationId, {
        added: true,
        replace: 'new',
      });

      expect(result.metadata).toEqual({ added: true, keep: 1, replace: 'new' });
    });
  });
});
