import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import { AgentConversationGroup } from './agent-conversation-group.entity.ts';
import { agentConversationGroupsFactory } from './agent-conversation-groups.factory.ts';
import { AgentConversationGroupsRepository } from './agent-conversation-groups.repository.ts';

describe('AgentConversationGroupsRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const groupId = '22222222-2222-4222-8222-222222222222';
  const otherGroupId = '33333333-3333-4333-8333-333333333333';

  const isEntityTarget = (entity: unknown, target: unknown): boolean => {
    return (
      entity === target ||
      (typeof entity === 'function' &&
        typeof target === 'function' &&
        entity.name === target.name)
    );
  };

  const mockGroup = agentConversationGroupsFactory.build({
    id: groupId,
    sortOrder: 2000,
    userId,
  });

  const conversationRepository = { update: vi.fn() };
  const txGroupRepository = { delete: vi.fn(), update: vi.fn() };
  const manager = {
    getRepository: vi.fn((entity: unknown) => {
      if (isEntityTarget(entity, AgentConversation)) {
        return conversationRepository;
      }
      if (isEntityTarget(entity, AgentConversationGroup)) {
        return txGroupRepository;
      }
      throw new Error(`Unexpected entity: ${String(entity)}`);
    }),
    transaction: vi.fn(async (run: (m: unknown) => Promise<unknown>) => {
      return run(manager);
    }),
  };

  const queryBuilder = createQueryBuilderMock<AgentConversationGroup>();

  const mockRepository = {
    create: vi.fn((data: Partial<AgentConversationGroup>) => {
      return { ...mockGroup, ...data };
    }),
    createQueryBuilder: vi.fn(() => queryBuilder),
    find: vi.fn(),
    findOne: vi.fn(),
    manager,
    save: vi.fn((entity: AgentConversationGroup) => Promise.resolve(entity)),
    target: AgentConversationGroup,
  };

  let repository: AgentConversationGroupsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationGroupsRepository,
        {
          provide: getRepositoryToken(AgentConversationGroup),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = app.get(AgentConversationGroupsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.findOne.mockResolvedValue({ ...mockGroup });
  });

  describe('listGroupsForUser', () => {
    it("reads the user's groups by sort_order, then id", async () => {
      queryBuilder.getMany.mockResolvedValue([mockGroup]);

      const result = await repository.listGroupsForUser(userId);

      expect(result).toEqual([mockGroup]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'agentConversationGroup.userId = :userId',
        { userId },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'agentConversationGroup.sortOrder',
        'ASC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'agentConversationGroup.id',
        'ASC',
      );
    });
  });

  describe('createGroup', () => {
    it('appends 1000 past the current last group', async () => {
      const result = await repository.createGroup(userId, 'Work');

      expect(result.sortOrder).toBe(3000);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        order: { sortOrder: 'DESC' },
        where: { userId },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'Work',
        sortOrder: 3000,
        userId,
      });
    });

    it('starts at 1000 for the first group', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await repository.createGroup(userId, 'First');

      expect(result.sortOrder).toBe(1000);
    });
  });

  describe('renameGroup', () => {
    it('renames an owned group', async () => {
      const result = await repository.renameGroup(userId, groupId, 'New');

      expect(result.name).toBe('New');
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: groupId, userId },
      });
    });

    it('throws NotFoundException when the group is not owned', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.renameGroup(userId, groupId, 'New'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteGroup', () => {
    it('nulls its conversations and deletes the group in one transaction', async () => {
      const result = await repository.deleteGroup(userId, groupId);

      expect(result.id).toBe(groupId);
      expect(manager.transaction).toHaveBeenCalledOnce();
      expect(conversationRepository.update).toHaveBeenCalledWith(
        { groupId, userId },
        { groupId: null },
      );
      expect(txGroupRepository.delete).toHaveBeenCalledWith({
        id: groupId,
        userId,
      });
    });

    it('throws NotFoundException when the group is not owned', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.deleteGroup(userId, groupId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('reorderGroups', () => {
    beforeEach(() => {
      queryBuilder.getMany.mockResolvedValue([
        mockGroup,
        { ...mockGroup, id: otherGroupId },
      ]);
    });

    it('rewrites sort_order in the given order', async () => {
      await repository.reorderGroups(userId, [otherGroupId, groupId]);

      expect(txGroupRepository.update).toHaveBeenCalledWith(
        { id: otherGroupId, userId },
        { sortOrder: 1000 },
      );
      expect(txGroupRepository.update).toHaveBeenCalledWith(
        { id: groupId, userId },
        { sortOrder: 2000 },
      );
    });

    it('rejects a list that omits a group', async () => {
      await expect(
        repository.reorderGroups(userId, [groupId]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate id', async () => {
      await expect(
        repository.reorderGroups(userId, [groupId, groupId]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an id that is not the user's", async () => {
      await expect(
        repository.reorderGroups(userId, [groupId, 'other-user-group']),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.transaction).not.toHaveBeenCalled();
    });
  });
});
