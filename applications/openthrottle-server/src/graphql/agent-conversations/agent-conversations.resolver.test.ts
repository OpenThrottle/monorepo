import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import type {
  AgentConversation,
  AgentConversationMessage,
} from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_CONVERSATION_STATUSES,
  AgentConversationMessagesRepository,
  AgentConversationsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createAgentConversationMessagesRepositoryMock,
  createAgentConversationsRepositoryMock,
  createRolesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentConversationsResolver } from './agent-conversations.resolver.ts';

describe('AgentConversationsResolver', () => {
  let resolver: AgentConversationsResolver;

  const humanPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-id',
  };

  const serviceAccountPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
    sub: 'sa-id',
  };

  const mockConversation: AgentConversation = {
    createdAt: new Date('2026-06-07T10:00:00.000Z'),
    deletedAt: null,
    groupId: null,
    id: '11111111-1111-4111-8111-111111111111',
    metadata: null,
    modelName: null,
    modelProvider: null,
    pinned: false,
    planId: null,
    projectId: null,
    status: AGENT_CONVERSATION_STATUSES.active,
    title: 'Hello world',
    updatedAt: new Date('2026-06-07T10:05:00.000Z'),
    userId: humanPrincipal.sub,
  };

  const mockMessage: AgentConversationMessage = {
    content: 'Hi',
    conversationId: mockConversation.id,
    createdAt: new Date('2026-06-07T10:01:00.000Z'),
    id: '22222222-2222-4222-8222-222222222222',
    role: 'user',
    routingConfidence: null,
    routingModel: null,
    routingReason: null,
    routingTier: null,
    sortOrder: 1,
    toolMetadata: null,
  };

  const agentConversationsRepository = createAgentConversationsRepositoryMock();
  const agentConversationMessagesRepository =
    createAgentConversationMessagesRepositoryMock();

  const mockRolesRepository = createRolesRepositoryMock();
  mockRolesRepository.getPermissionsForUser.mockResolvedValue([
    'settings:read',
    'settings:write',
  ]);

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationsResolver,
        {
          provide: AgentConversationsRepository,
          useValue: agentConversationsRepository,
        },
        {
          provide: AgentConversationMessagesRepository,
          useValue: agentConversationMessagesRepository,
        },
        { provide: RolesRepository, useValue: mockRolesRepository },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(AgentConversationsResolver);
  });

  describe('listAgentConversations', () => {
    test('returns conversations for human principal', async () => {
      vi.mocked(
        agentConversationsRepository.listConversationsForUser,
      ).mockResolvedValue([mockConversation]);
      agentConversationsRepository.countConversationsForUser.mockResolvedValue(
        1,
      );

      const result = await resolver.listAgentConversations(humanPrincipal, {
        limit: 20,
        offset: 0,
        status: 'active',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(mockConversation.id);
      expect(result.totalCount).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });

    test('rejects a limit above 100 as BAD_USER_INPUT', async () => {
      await expect(
        resolver.listAgentConversations(humanPrincipal, {
          limit: 101,
          offset: null,
          status: null,
        }),
      ).rejects.toThrow('limit must be between 1 and 100');
    });

    test('rejects service account principal', async () => {
      await expect(
        resolver.listAgentConversations(serviceAccountPrincipal, null),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAgentConversation', () => {
    test('returns conversation when owned', async () => {
      vi.mocked(
        agentConversationsRepository.getConversationForUser,
      ).mockResolvedValue(mockConversation);

      const result = await resolver.getAgentConversation(
        humanPrincipal,
        mockConversation.id,
      );

      expect(result?.id).toBe(mockConversation.id);
    });

    test('returns null when not found', async () => {
      vi.mocked(
        agentConversationsRepository.getConversationForUser,
      ).mockRejectedValue(new NotFoundException());

      const result = await resolver.getAgentConversation(
        humanPrincipal,
        mockConversation.id,
      );

      expect(result).toBeNull();
    });
  });

  describe('getAgentConversationMessages', () => {
    test('returns messages and total count', async () => {
      vi.mocked(
        agentConversationMessagesRepository.listMessagesForConversation,
      ).mockResolvedValue([mockMessage]);
      agentConversationMessagesRepository.countMessagesForConversation.mockResolvedValue(
        1,
      );

      const result = await resolver.getAgentConversationMessages(
        humanPrincipal,
        {
          conversationId: mockConversation.id,
          limit: 100,
          offset: 0,
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.sortOrder).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('createAgentConversation', () => {
    test('creates conversation for human principal', async () => {
      vi.mocked(
        agentConversationsRepository.createConversation,
      ).mockResolvedValue(mockConversation);

      const result = await resolver.createAgentConversation(humanPrincipal, {
        metadataJson: null,
        planId: null,
        projectId: null,
        title: 'Hello world',
      });

      expect(result.id).toBe(mockConversation.id);
      expect(
        agentConversationsRepository.createConversation,
      ).toHaveBeenCalledWith(humanPrincipal.sub, {
        metadata: null,
        planId: null,
        projectId: null,
        title: 'Hello world',
      });
    });
  });

  describe('archiveAgentConversation', () => {
    test('delegates to service', async () => {
      const archived = {
        ...mockConversation,
        status: AGENT_CONVERSATION_STATUSES.archived,
      };

      vi.mocked(
        agentConversationsRepository.archiveConversation,
      ).mockResolvedValue(archived);

      const result = await resolver.archiveAgentConversation(humanPrincipal, {
        conversationId: mockConversation.id,
      });

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.archived);
    });
  });

  describe('deleteAgentConversation', () => {
    test('soft-deletes an owned conversation via the service', async () => {
      const deleted = {
        ...mockConversation,
        status: AGENT_CONVERSATION_STATUSES.deleted,
      };

      vi.mocked(
        agentConversationsRepository.softDeleteConversation,
      ).mockResolvedValue(deleted);

      const result = await resolver.deleteAgentConversation(humanPrincipal, {
        conversationId: mockConversation.id,
      });

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.deleted);
      expect(
        agentConversationsRepository.softDeleteConversation,
      ).toHaveBeenCalledWith(humanPrincipal.sub, mockConversation.id);
    });

    test('propagates when the conversation is not owned', async () => {
      vi.mocked(
        agentConversationsRepository.softDeleteConversation,
      ).mockRejectedValue(new Error('Agent conversation not found'));

      await expect(
        resolver.deleteAgentConversation(humanPrincipal, {
          conversationId: 'not-mine',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('restoreAgentConversation', () => {
    test('restores an owned conversation via the repository', async () => {
      vi.mocked(
        agentConversationsRepository.restoreConversation,
      ).mockResolvedValue(mockConversation);

      const result = await resolver.restoreAgentConversation(humanPrincipal, {
        conversationId: mockConversation.id,
      });

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.active);
      expect(
        agentConversationsRepository.restoreConversation,
      ).toHaveBeenCalledWith(humanPrincipal.sub, mockConversation.id);
    });

    test('propagates when the conversation is not owned', async () => {
      vi.mocked(
        agentConversationsRepository.restoreConversation,
      ).mockRejectedValue(new Error('Agent conversation not found'));

      await expect(
        resolver.restoreAgentConversation(humanPrincipal, {
          conversationId: 'not-mine',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('updateAgentConversationTitle', () => {
    test('delegates to service', async () => {
      const updated = { ...mockConversation, title: 'Renamed' };

      vi.mocked(
        agentConversationsRepository.updateConversationTitle,
      ).mockResolvedValue(updated);

      const result = await resolver.updateAgentConversationTitle(
        humanPrincipal,
        {
          conversationId: mockConversation.id,
          title: 'Renamed',
        },
      );

      expect(result.title).toBe('Renamed');
    });
  });

  describe('setAgentConversationPinned', () => {
    test('pins scoped to the caller and maps pinned', async () => {
      agentConversationsRepository.setConversationPinned.mockResolvedValueOnce({
        ...mockConversation,
        pinned: true,
      });

      const result = await resolver.setAgentConversationPinned(humanPrincipal, {
        conversationId: mockConversation.id,
        pinned: true,
      });

      expect(
        agentConversationsRepository.setConversationPinned,
      ).toHaveBeenCalledWith(humanPrincipal.sub, mockConversation.id, true);
      expect(result.pinned).toBe(true);
    });

    test('rejects a service account', async () => {
      await expect(
        resolver.setAgentConversationPinned(serviceAccountPrincipal, {
          conversationId: mockConversation.id,
          pinned: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    test("propagates NotFoundException for a conversation that is not the caller's", async () => {
      await expect(
        resolver.setAgentConversationPinned(humanPrincipal, {
          conversationId: mockConversation.id,
          pinned: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('moveAgentConversationToGroup', () => {
    const groupId = '33333333-3333-4333-8333-333333333333';

    test('moves into a group scoped to the caller', async () => {
      agentConversationsRepository.moveConversationToGroup.mockResolvedValueOnce(
        { ...mockConversation, groupId },
      );

      const result = await resolver.moveAgentConversationToGroup(
        humanPrincipal,
        { conversationId: mockConversation.id, groupId },
      );

      expect(
        agentConversationsRepository.moveConversationToGroup,
      ).toHaveBeenCalledWith(humanPrincipal.sub, mockConversation.id, groupId);
      expect(result.groupId).toBe(groupId);
    });

    test('ungroups with a null groupId', async () => {
      agentConversationsRepository.moveConversationToGroup.mockResolvedValueOnce(
        mockConversation,
      );

      const result = await resolver.moveAgentConversationToGroup(
        humanPrincipal,
        { conversationId: mockConversation.id, groupId: null },
      );

      expect(
        agentConversationsRepository.moveConversationToGroup,
      ).toHaveBeenCalledWith(humanPrincipal.sub, mockConversation.id, null);
      expect(result.groupId).toBeNull();
    });
  });
});
