import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import { agentConversationsFactory } from '../agent-conversations/agent-conversations.factory.ts';
import { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import { AGENT_CONVERSATION_MESSAGE_ROLES } from './agent-conversation-messages.constants.ts';
import { agentConversationMessagesFactory } from './agent-conversation-messages.factory.ts';
import { AgentConversationMessagesRepository } from './agent-conversation-messages.repository.ts';

describe('AgentConversationMessagesRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const conversationId = '22222222-2222-4222-8222-222222222222';

  const isEntityTarget = (
    entity: unknown,
    target: typeof AgentConversation | typeof AgentConversationMessage,
  ): boolean => {
    return (
      entity === target ||
      (typeof entity === 'function' && entity.name === target.name)
    );
  };

  const mockConversation = agentConversationsFactory.build({
    id: conversationId,
    userId,
  });

  const conversationRepository = { exists: vi.fn() };

  const mockMessageRepository = {
    count: vi.fn(),
    find: vi.fn(),
    manager: {
      getRepository: vi.fn((entity: unknown) => {
        if (isEntityTarget(entity, AgentConversation)) {
          return conversationRepository;
        }
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: vi.fn(),
    },
    target: AgentConversationMessage,
  };

  let repository: AgentConversationMessagesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationMessagesRepository,
        {
          provide: getRepositoryToken(AgentConversationMessage),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    repository = app.get(AgentConversationMessagesRepository);
  });

  describe('listMessagesForConversation', () => {
    it('loads messages ordered by sort_order after the ownership check', async () => {
      const messages = [
        agentConversationMessagesFactory.build({ sortOrder: 1 }),
        agentConversationMessagesFactory.build({ sortOrder: 2 }),
      ];

      conversationRepository.exists.mockResolvedValue(true);
      mockMessageRepository.find.mockResolvedValue(messages);

      const result = await repository.listMessagesForConversation(
        userId,
        conversationId,
      );

      expect(result).toBe(messages);
      expect(conversationRepository.exists).toHaveBeenCalledWith({
        where: { id: conversationId, userId },
      });
      expect(mockMessageRepository.find).toHaveBeenCalledWith({
        order: { sortOrder: 'ASC' },
        skip: 0,
        take: 100,
        where: { conversationId },
      });
    });

    it('throws NotFoundException when the conversation is not live or not owned', async () => {
      conversationRepository.exists.mockResolvedValue(false);

      await expect(
        repository.listMessagesForConversation(userId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('countMessagesForConversation', () => {
    it('counts the conversation messages', async () => {
      mockMessageRepository.count.mockResolvedValue(7);

      await expect(
        repository.countMessagesForConversation(conversationId),
      ).resolves.toBe(7);
      expect(mockMessageRepository.count).toHaveBeenCalledWith({
        where: { conversationId },
      });
    });
  });

  describe('appendMessages', () => {
    beforeEach(() => {
      vi.mocked(mockMessageRepository.manager.transaction).mockReset();
    });

    it('appends with consecutive sort_order and honors an explicit id', async () => {
      const savedMessages: AgentConversationMessage[] = [];
      const messageRepoInTx = {
        create: vi.fn((data: Partial<AgentConversationMessage>) => data),
        createQueryBuilder: vi.fn(() => ({
          getRawOne: vi.fn().mockResolvedValue({ max: '4' }),
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })),
        save: vi.fn(async (entities: AgentConversationMessage[]) => {
          const saved = entities.map((entity, offset) => ({
            ...entity,
            id: entity.id ?? fakerId(savedMessages.length + offset),
          }));
          savedMessages.push(...saved);
          return saved;
        }),
      };
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue({ ...mockConversation }),
      };

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        async (callback) =>
          callback({
            getRepository: (entity: unknown) => {
              if (isEntityTarget(entity, AgentConversation)) {
                return conversationRepoInTx;
              }
              if (isEntityTarget(entity, AgentConversationMessage)) {
                return messageRepoInTx;
              }
              throw new Error(`Unexpected entity: ${String(entity)}`);
            },
          }),
      );

      const result = await repository.appendMessages(userId, conversationId, [
        {
          content: 'streamed reply',
          id: 'assistant-fixed-id',
          role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.sortOrder).toBe(5);
      expect(result[0]?.id).toBe('assistant-fixed-id');
      expect(result[0]?.role).toBe(AGENT_CONVERSATION_MESSAGE_ROLES.assistant);
    });

    it('throws NotFoundException when conversation is not owned', async () => {
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        async (callback) =>
          callback({
            getRepository: (entity: unknown) => {
              if (isEntityTarget(entity, AgentConversation)) {
                return conversationRepoInTx;
              }
              return { createQueryBuilder: vi.fn() };
            },
          }),
      );

      await expect(
        repository.appendMessages(userId, conversationId, [
          { content: 'x', role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('appendTurn', () => {
    beforeEach(() => {
      vi.mocked(mockMessageRepository.manager.transaction).mockReset();
    });

    it('writes consecutive sort_order values in a transaction', async () => {
      const savedMessages: AgentConversationMessage[] = [];
      const messageRepoInTx = {
        create: vi.fn((data: Partial<AgentConversationMessage>) => data),
        createQueryBuilder: vi.fn(() => ({
          getRawOne: vi.fn().mockResolvedValue({ max: '2' }),
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })),
        save: vi.fn(async (entity: AgentConversationMessage) => {
          const saved = {
            ...entity,
            id: fakerId(savedMessages.length),
          };
          savedMessages.push(saved);
          return saved;
        }),
      };
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue({ ...mockConversation }),
        save: vi.fn(async (entity: AgentConversation) => entity),
      };

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        async (callback) =>
          callback({
            getRepository: (entity: unknown) => {
              if (isEntityTarget(entity, AgentConversation)) {
                return conversationRepoInTx;
              }
              if (isEntityTarget(entity, AgentConversationMessage)) {
                return messageRepoInTx;
              }
              throw new Error(`Unexpected entity: ${String(entity)}`);
            },
          }),
      );

      const result = await repository.appendTurn(userId, conversationId, {
        assistantContent: 'Hi there',
        routingModel: 'router-model',
        routingTier: 'fast',
        userContent: 'Hello',
      });

      expect(result.userMessage.sortOrder).toBe(3);
      expect(result.assistantMessage.sortOrder).toBe(4);
      expect(result.userMessage.role).toBe(
        AGENT_CONVERSATION_MESSAGE_ROLES.user,
      );
      expect(result.assistantMessage.role).toBe(
        AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
      );
      expect(result.assistantMessage.routingTier).toBe('fast');
    });

    it('throws NotFoundException when conversation is not owned', async () => {
      const messageRepoInTx = {
        createQueryBuilder: vi.fn(),
      };
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        async (callback) =>
          callback({
            getRepository: (entity: unknown) => {
              if (isEntityTarget(entity, AgentConversation)) {
                return conversationRepoInTx;
              }
              if (isEntityTarget(entity, AgentConversationMessage)) {
                return messageRepoInTx;
              }
              throw new Error(`Unexpected entity: ${String(entity)}`);
            },
          }),
      );

      await expect(
        repository.appendTurn(userId, conversationId, {
          assistantContent: 'Hi',
          userContent: 'Hello',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // Guards the P1 sort_order race: appendTurn/appendMessages must row-lock the
  // parent conversation before reading MAX(sort_order) so concurrent appends to
  // the same conversation serialize. The lock is the only thing that prevents
  // two writers from computing the same currentMax and assigning duplicate
  // sort_order values (rejected by the (conversation_id, sort_order) unique
  // index with a 23505 rollback). These tests assert the lock is acquired and
  // that serialized appends produce strictly increasing, non-overlapping
  // sort_order ranges.
  describe('concurrent append ordering (sort_order race)', () => {
    beforeEach(() => {
      vi.mocked(mockMessageRepository.manager.transaction).mockReset();
    });

    /**
     * Builds a transaction stub backed by a shared in-memory message store so
     * that a second append observes the first append's committed MAX(sort_order)
     * — modeling the serialization the pessimistic_write lock guarantees.
     */
    const buildSerializedTransaction = (
      store: AgentConversationMessage[],
      findOneSpy: ReturnType<typeof vi.fn>,
    ): ((
      callback: (manager: unknown) => Promise<unknown>,
    ) => Promise<unknown>) => {
      const messageRepoInTx = {
        create: vi.fn((data: Partial<AgentConversationMessage>) => data),
        createQueryBuilder: vi.fn(() => ({
          getRawOne: vi.fn().mockImplementation(async () => {
            const max = store.reduce(
              (acc, message) => Math.max(acc, message.sortOrder),
              0,
            );
            return { max: max === 0 ? null : String(max) };
          }),
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        })),
        save: vi.fn(
          async (
            input: AgentConversationMessage | AgentConversationMessage[],
          ) => {
            const entities = Array.isArray(input) ? input : [input];
            const saved = entities.map((entity, offset) => ({
              ...entity,
              id: entity.id ?? fakerId(store.length + offset),
            }));
            store.push(...saved);
            return Array.isArray(input) ? saved : saved[0];
          },
        ),
      };
      const conversationRepoInTx = {
        findOne: findOneSpy,
        save: vi.fn(async (entity: AgentConversation) => entity),
      };

      return async (callback) =>
        callback({
          getRepository: (entity: unknown) => {
            if (isEntityTarget(entity, AgentConversation)) {
              return conversationRepoInTx;
            }
            if (isEntityTarget(entity, AgentConversationMessage)) {
              return messageRepoInTx;
            }
            throw new Error(`Unexpected entity: ${String(entity)}`);
          },
        });
    };

    it('row-locks the conversation with pessimistic_write before reading MAX(sort_order)', async () => {
      const store: AgentConversationMessage[] = [];
      const findOneSpy = vi.fn().mockResolvedValue({ ...mockConversation });

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        buildSerializedTransaction(store, findOneSpy),
      );

      await repository.appendTurn(userId, conversationId, {
        assistantContent: 'Hi',
        userContent: 'Hello',
      });

      expect(findOneSpy).toHaveBeenCalledWith({
        lock: { mode: 'pessimistic_write' },
        where: { id: conversationId, userId },
      });
    });

    it('serialized appendTurns yield non-overlapping, strictly increasing sort_order', async () => {
      const store: AgentConversationMessage[] = [];
      const findOneSpy = vi.fn().mockResolvedValue({ ...mockConversation });

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        buildSerializedTransaction(store, findOneSpy),
      );

      const first = await repository.appendTurn(userId, conversationId, {
        assistantContent: 'A1',
        userContent: 'U1',
      });
      const second = await repository.appendTurn(userId, conversationId, {
        assistantContent: 'A2',
        userContent: 'U2',
      });

      expect(first.userMessage.sortOrder).toBe(1);
      expect(first.assistantMessage.sortOrder).toBe(2);
      expect(second.userMessage.sortOrder).toBe(3);
      expect(second.assistantMessage.sortOrder).toBe(4);

      const allSortOrders = store.map((message) => message.sortOrder);
      expect(new Set(allSortOrders).size).toBe(allSortOrders.length);
      expect(allSortOrders).toEqual([...allSortOrders].sort((a, b) => a - b));
    });

    it('appendMessages following an appendTurn continues the sort_order sequence without collision', async () => {
      const store: AgentConversationMessage[] = [];
      const findOneSpy = vi.fn().mockResolvedValue({ ...mockConversation });

      vi.mocked(mockMessageRepository.manager.transaction).mockImplementation(
        buildSerializedTransaction(store, findOneSpy),
      );

      await repository.appendTurn(userId, conversationId, {
        assistantContent: 'A1',
        userContent: 'U1',
      });
      const appended = await repository.appendMessages(userId, conversationId, [
        { content: 'm3', role: AGENT_CONVERSATION_MESSAGE_ROLES.user },
        { content: 'm4', role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant },
      ]);

      expect(
        appended.map((message: AgentConversationMessage) => message.sortOrder),
      ).toEqual([3, 4]);

      const allSortOrders = store.map((message) => message.sortOrder);
      expect(new Set(allSortOrders).size).toBe(allSortOrders.length);
      expect(findOneSpy).toHaveBeenCalledWith({
        lock: { mode: 'pessimistic_write' },
        where: { id: conversationId, userId },
      });
    });
  });
});

const fakerId = (index: number): string => {
  return `44444444-4444-4444-8444-4444444444${index.toString().padStart(2, '0')}`.slice(
    0,
    36,
  );
};
