import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentConversationMessage } from './agent-conversation-message.entity';
import {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  AGENT_CONVERSATION_STATUSES,
} from './agent-conversation.constants';
import { AgentConversation } from './agent-conversation.entity';
import { AgentConversationsService } from './agent-conversations.service';
import { agentConversationsFactory } from './agent-conversations.factory';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';

describe('AgentConversationsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const conversationId = '22222222-2222-4222-8222-222222222222';

  const isEntityTarget = (
    entity: unknown,
    target: typeof AgentConversation | typeof AgentConversationMessage,
  ): boolean =>
    entity === target ||
    (typeof entity === 'function' && entity.name === target.name);

  const mockConversation = agentConversationsFactory.build({
    id: conversationId,
    userId,
  });

  const mockConversationRepository = {
    create: vi.fn((data: Partial<AgentConversation>) => ({
      ...mockConversation,
      ...data,
    })),
    find: vi.fn(),
    findOne: vi.fn(),
    manager: {
      transaction: vi.fn(),
    },
    save: vi.fn((entity: AgentConversation) => Promise.resolve(entity)),
  };

  const mockMessageRepository = {
    find: vi.fn(),
  };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(),
    })),
  });

  const mockProjectsService = createMock<ProjectsService>({
    findById: vi.fn(),
  });

  let service: AgentConversationsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(AgentConversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(AgentConversationMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = app.get(AgentConversationsService);
  });

  describe('createConversation', () => {
    it('creates an active conversation for the user', async () => {
      vi.mocked(mockConversationRepository.save).mockResolvedValue(
        mockConversation,
      );

      const result = await service.createConversation(userId, {
        title: 'My chat',
      });

      expect(result).toBe(mockConversation);
      expect(mockConversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AGENT_CONVERSATION_STATUSES.active,
          title: 'My chat',
          userId,
        }),
      );
    });

    it('throws NotFoundException when planId does not exist', async () => {
      const planId = '33333333-3333-4333-8333-333333333333';
      vi.mocked(mockPlansService.getRepository).mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      } as never);

      await expect(
        service.createConversation(userId, { planId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getConversationForUser', () => {
    it('throws NotFoundException when conversation is not owned', async () => {
      vi.mocked(mockConversationRepository.findOne).mockResolvedValue(null);

      await expect(
        service.getConversationForUser(userId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listConversationsForUser', () => {
    it('queries with default active status and clamped limit', async () => {
      vi.mocked(mockConversationRepository.find).mockResolvedValue([
        mockConversation,
      ]);

      const result = await service.listConversationsForUser(userId);

      expect(result).toEqual([mockConversation]);
      expect(mockConversationRepository.find).toHaveBeenCalledWith({
        order: { updatedAt: 'DESC' },
        skip: 0,
        take: 20,
        where: { status: AGENT_CONVERSATION_STATUSES.active, userId },
      });
    });
  });

  describe('listMessagesForConversation', () => {
    it('loads messages ordered by sort_order after ownership check', async () => {
      const messages = [
        { id: 'a', sortOrder: 1 },
        { id: 'b', sortOrder: 2 },
      ] as AgentConversationMessage[];

      vi.mocked(mockConversationRepository.findOne).mockResolvedValue(
        mockConversation,
      );
      vi.mocked(mockMessageRepository.find).mockResolvedValue(messages);

      const result = await service.listMessagesForConversation(
        userId,
        conversationId,
      );

      expect(result).toBe(messages);
      expect(mockMessageRepository.find).toHaveBeenCalledWith({
        order: { sortOrder: 'ASC' },
        skip: 0,
        take: 100,
        where: { conversationId },
      });
    });
  });

  describe('archiveConversation', () => {
    it('sets status to archived for an owned conversation', async () => {
      vi.mocked(mockConversationRepository.findOne).mockResolvedValue({
        ...mockConversation,
      });
      vi.mocked(mockConversationRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.archiveConversation(userId, conversationId);

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.archived);
    });
  });

  describe('updateConversationTitle', () => {
    it('updates title for an owned conversation', async () => {
      vi.mocked(mockConversationRepository.findOne).mockResolvedValue({
        ...mockConversation,
      });
      vi.mocked(mockConversationRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.updateConversationTitle(
        userId,
        conversationId,
        'Renamed',
      );

      expect(result.title).toBe('Renamed');
    });
  });

  describe('updateModelSnapshot', () => {
    it('updates model provider and name on the conversation row', async () => {
      vi.mocked(mockConversationRepository.findOne).mockResolvedValue({
        ...mockConversation,
      });
      vi.mocked(mockConversationRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.updateModelSnapshot(conversationId, {
        modelName: 'gpt-4.1',
        modelProvider: 'openai',
      });

      expect(result.modelProvider).toBe('openai');
      expect(result.modelName).toBe('gpt-4.1');
    });
  });

  describe('appendMessages', () => {
    beforeEach(() => {
      vi.mocked(mockConversationRepository.manager.transaction).mockReset();
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
          const saved = entities.map(
            (entity, offset) =>
              ({
                ...entity,
                id: entity.id ?? fakerId(savedMessages.length + offset),
              }) as AgentConversationMessage,
          );
          savedMessages.push(...saved);
          return saved;
        }),
      };
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue({ ...mockConversation }),
      };

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(async (callback) =>
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
        } as never),
      );

      const result = await service.appendMessages(userId, conversationId, [
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

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(async (callback) =>
        callback({
          getRepository: (entity: unknown) => {
            if (isEntityTarget(entity, AgentConversation)) {
              return conversationRepoInTx;
            }
            return { createQueryBuilder: vi.fn() };
          },
        } as never),
      );

      await expect(
        service.appendMessages(userId, conversationId, [
          { content: 'x', role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('appendTurn', () => {
    beforeEach(() => {
      vi.mocked(mockConversationRepository.manager.transaction).mockReset();
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
          } as AgentConversationMessage;
          savedMessages.push(saved);
          return saved;
        }),
      };
      const conversationRepoInTx = {
        findOne: vi.fn().mockResolvedValue({ ...mockConversation }),
        save: vi.fn(async (entity: AgentConversation) => entity),
      };

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(async (callback) =>
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
        } as never),
      );

      const result = await service.appendTurn(userId, conversationId, {
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

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(async (callback) =>
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
        } as never),
      );

      await expect(
        service.appendTurn(userId, conversationId, {
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
      vi.mocked(mockConversationRepository.manager.transaction).mockReset();
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
            const saved = entities.map(
              (entity, offset) =>
                ({
                  ...entity,
                  id: entity.id ?? fakerId(store.length + offset),
                }) as AgentConversationMessage,
            );
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
        } as never);
    };

    it('row-locks the conversation with pessimistic_write before reading MAX(sort_order)', async () => {
      const store: AgentConversationMessage[] = [];
      const findOneSpy = vi.fn().mockResolvedValue({ ...mockConversation });

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(buildSerializedTransaction(store, findOneSpy));

      await service.appendTurn(userId, conversationId, {
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

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(buildSerializedTransaction(store, findOneSpy));

      const first = await service.appendTurn(userId, conversationId, {
        assistantContent: 'A1',
        userContent: 'U1',
      });
      const second = await service.appendTurn(userId, conversationId, {
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

      vi.mocked(
        mockConversationRepository.manager.transaction,
      ).mockImplementation(buildSerializedTransaction(store, findOneSpy));

      await service.appendTurn(userId, conversationId, {
        assistantContent: 'A1',
        userContent: 'U1',
      });
      const appended = await service.appendMessages(userId, conversationId, [
        { content: 'm3', role: AGENT_CONVERSATION_MESSAGE_ROLES.user },
        { content: 'm4', role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant },
      ]);

      expect(appended.map((message) => message.sortOrder)).toEqual([3, 4]);

      const allSortOrders = store.map((message) => message.sortOrder);
      expect(new Set(allSortOrders).size).toBe(allSortOrders.length);
      expect(findOneSpy).toHaveBeenCalledWith({
        lock: { mode: 'pessimistic_write' },
        where: { id: conversationId, userId },
      });
    });
  });
});

const fakerId = (index: number): string =>
  `44444444-4444-4444-8444-4444444444${index.toString().padStart(2, '0')}`.slice(
    0,
    36,
  );
