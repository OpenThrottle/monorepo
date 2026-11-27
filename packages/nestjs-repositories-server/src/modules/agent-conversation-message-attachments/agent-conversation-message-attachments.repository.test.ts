import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull, LessThan } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import { AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES } from './agent-conversation-message-attachments.constants.ts';
import { agentConversationMessageAttachmentsFactory } from './agent-conversation-message-attachments.factory.ts';
import { AgentConversationMessageAttachmentsRepository } from './agent-conversation-message-attachments.repository.ts';

describe('AgentConversationMessageAttachmentsRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const messageId = '33333333-3333-4333-8333-333333333333';

  const mockRepository = {
    create: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    target: AgentConversationMessageAttachment,
    update: vi.fn(),
  };

  let repository: AgentConversationMessageAttachmentsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationMessageAttachmentsRepository,
        {
          provide: getRepositoryToken(AgentConversationMessageAttachment),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = app.get(AgentConversationMessageAttachmentsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('saves an unlinked row for the uploading user', async () => {
      const saved = agentConversationMessageAttachmentsFactory.build();
      const input = {
        byteSize: 1234,
        height: 20,
        mimeType: AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.png,
        originalName: 'shot.png',
        sha256: 'a'.repeat(64),
        userId,
        width: 10,
      };

      mockRepository.create.mockImplementation((entity: unknown) => entity);
      mockRepository.save.mockResolvedValue(saved);

      const result = await repository.create(input);

      expect(result).toBe(saved);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...input,
        messageId: null,
      });
    });
  });

  describe('findOwnedById', () => {
    it('scopes the lookup to the owner and returns the row', async () => {
      const row = agentConversationMessageAttachmentsFactory.build({ userId });

      mockRepository.findOne.mockResolvedValue(row);

      await expect(repository.findOwnedById(row.id, userId)).resolves.toBe(row);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: row.id, userId },
      });
    });

    it('returns null when no owned row matches', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(repository.findOwnedById('x', userId)).resolves.toBeNull();
    });
  });

  describe('findOwnedByIds', () => {
    it('returns an empty list without a query for empty input', async () => {
      await expect(repository.findOwnedByIds([], userId)).resolves.toEqual([]);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('queries by id list and owner', async () => {
      const rows = agentConversationMessageAttachmentsFactory.buildList(2, {
        userId,
      });

      mockRepository.find.mockResolvedValue(rows);

      const ids = rows.map((row) => row.id);

      await expect(repository.findOwnedByIds(ids, userId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { id: In(ids), userId },
      });
    });
  });

  describe('linkToMessage', () => {
    it('returns 0 without a query for empty input', async () => {
      await expect(
        repository.linkToMessage([], messageId, userId),
      ).resolves.toBe(0);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('links only unlinked rows owned by the user and returns the count', async () => {
      mockRepository.update.mockResolvedValue({ affected: 2 });

      await expect(
        repository.linkToMessage(['a', 'b', 'c'], messageId, userId),
      ).resolves.toBe(2);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: In(['a', 'b', 'c']), messageId: IsNull(), userId },
        { messageId },
      );
    });

    it('treats a missing affected count as 0', async () => {
      mockRepository.update.mockResolvedValue({});

      await expect(
        repository.linkToMessage(['a'], messageId, userId),
      ).resolves.toBe(0);
    });
  });

  describe('listByMessageIds', () => {
    it('returns an empty list without a query for empty input', async () => {
      await expect(repository.listByMessageIds([])).resolves.toEqual([]);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('loads the rows linked to the messages, oldest first', async () => {
      const rows = [
        agentConversationMessageAttachmentsFactory.build({ messageId }),
      ];

      mockRepository.find.mockResolvedValue(rows);

      await expect(repository.listByMessageIds([messageId])).resolves.toBe(
        rows,
      );
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', id: 'ASC' },
        where: { messageId: In([messageId]) },
      });
    });
  });

  describe('deleteUnlinkedOlderThan', () => {
    it('deletes unlinked rows created before the cutoff and returns the count', async () => {
      const cutoff = new Date('2026-01-01T00:00:00Z');

      mockRepository.delete.mockResolvedValue({ affected: 3 });

      await expect(repository.deleteUnlinkedOlderThan(cutoff)).resolves.toBe(3);
      expect(mockRepository.delete).toHaveBeenCalledWith({
        createdAt: LessThan(cutoff),
        messageId: IsNull(),
      });
    });

    it('treats a missing affected count as 0', async () => {
      mockRepository.delete.mockResolvedValue({});

      await expect(
        repository.deleteUnlinkedOlderThan(new Date('2026-01-01T00:00:00Z')),
      ).resolves.toBe(0);
    });
  });

  describe('isShaReferenced', () => {
    it.each([true, false])(
      'returns %s from the existence check',
      async (exists) => {
        mockRepository.exists.mockResolvedValue(exists);

        await expect(repository.isShaReferenced('b'.repeat(64))).resolves.toBe(
          exists,
        );
        expect(mockRepository.exists).toHaveBeenCalledWith({
          where: { sha256: 'b'.repeat(64) },
        });
      },
    );
  });
});
