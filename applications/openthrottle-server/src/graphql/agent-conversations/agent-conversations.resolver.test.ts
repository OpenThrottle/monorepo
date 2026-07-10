import type {
  AgentConversation,
  AgentConversationMessage,
} from '@openthrottle/nestjs-repositories';
import {
  AGENT_CONVERSATION_STATUSES,
  AgentConversationsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { AgentConversationsResolver } from './agent-conversations.resolver';

describe('AgentConversationsResolver', () => {
  let resolver: AgentConversationsResolver;
  let agentConversationsService: AgentConversationsService;

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
    id: '11111111-1111-4111-8111-111111111111',
    metadata: null,
    modelName: null,
    modelProvider: null,
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

  const mockConversationRepository = {
    count: vi.fn(),
  };

  const mockMessageRepository = {
    count: vi.fn(),
  };

  const mockAgentConversationsService = createMock<AgentConversationsService>({
    getConversationRepository: vi
      .fn()
      .mockReturnValue(mockConversationRepository),
    getMessageRepository: vi.fn().mockReturnValue(mockMessageRepository),
  });

  const mockRolesService = createMock<RolesService>({
    getPermissionsForUser: vi
      .fn()
      .mockResolvedValue(['settings:read', 'settings:write']),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationsResolver,
        {
          provide: AgentConversationsService,
          useValue: mockAgentConversationsService,
        },
        { provide: RolesService, useValue: mockRolesService },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(AgentConversationsResolver);
    agentConversationsService = app.get(AgentConversationsService);
  });

  describe('listAgentConversations', () => {
    test('returns conversations for human principal', async () => {
      vi.mocked(
        agentConversationsService.listConversationsForUser,
      ).mockResolvedValue([mockConversation]);
      mockConversationRepository.count.mockResolvedValue(1);

      const result = await resolver.listAgentConversations(humanPrincipal, {
        limit: 20,
        offset: 0,
        status: 'active',
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0]?.id).toBe(mockConversation.id);
      expect(result.totalCount).toBe(1);
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
        agentConversationsService.getConversationForUser,
      ).mockResolvedValue(mockConversation);

      const result = await resolver.getAgentConversation(
        humanPrincipal,
        mockConversation.id,
      );

      expect(result?.id).toBe(mockConversation.id);
    });

    test('returns null when not found', async () => {
      vi.mocked(
        agentConversationsService.getConversationForUser,
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
        agentConversationsService.listMessagesForConversation,
      ).mockResolvedValue([mockMessage]);
      mockMessageRepository.count.mockResolvedValue(1);

      const result = await resolver.getAgentConversationMessages(
        humanPrincipal,
        {
          conversationId: mockConversation.id,
          limit: 100,
          offset: 0,
        },
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.sortOrder).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('createAgentConversation', () => {
    test('creates conversation for human principal', async () => {
      vi.mocked(agentConversationsService.createConversation).mockResolvedValue(
        mockConversation,
      );

      const result = await resolver.createAgentConversation(humanPrincipal, {
        metadataJson: null,
        planId: null,
        projectId: null,
        title: 'Hello world',
      });

      expect(result.id).toBe(mockConversation.id);
      expect(agentConversationsService.createConversation).toHaveBeenCalledWith(
        humanPrincipal.sub,
        {
          metadata: null,
          planId: null,
          projectId: null,
          title: 'Hello world',
        },
      );
    });
  });

  describe('archiveAgentConversation', () => {
    test('delegates to service', async () => {
      const archived = {
        ...mockConversation,
        status: AGENT_CONVERSATION_STATUSES.archived,
      };

      vi.mocked(
        agentConversationsService.archiveConversation,
      ).mockResolvedValue(archived);

      const result = await resolver.archiveAgentConversation(humanPrincipal, {
        conversationId: mockConversation.id,
      });

      expect(result.status).toBe(AGENT_CONVERSATION_STATUSES.archived);
    });
  });

  describe('updateAgentConversationTitle', () => {
    test('delegates to service', async () => {
      const updated = { ...mockConversation, title: 'Renamed' };

      vi.mocked(
        agentConversationsService.updateConversationTitle,
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
});
