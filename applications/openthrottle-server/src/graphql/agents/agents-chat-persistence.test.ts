import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, test, vi } from 'vitest';
import {
  PERSISTED_CONVERSATION_NOT_FOUND_ERROR,
  parseAgentsChatTurnToolMetadata,
  persistSuccessfulAgentsChatTurn,
  resolveHumanUserForPersist,
  resolvePersistedConversation,
} from './agents-chat-persistence';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import {
  agentConversationMessagesFactory,
  agentConversationsFactory,
} from '@openthrottle/nestjs-repositories';
import type { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { AgentsChatTurnResult } from './agents.object';

describe('agents-chat-persistence', () => {
  describe('resolveHumanUserForPersist', () => {
    test('returns human principal', () => {
      expect(
        resolveHumanUserForPersist({
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: 'user-1',
        }),
      ).toEqual({ kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' });
    });

    test('returns null for service account', () => {
      expect(
        resolveHumanUserForPersist({
          kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
          sub: 'sa-1',
        }),
      ).toBeNull();
    });
  });

  describe('resolvePersistedConversation', () => {
    test('creates a conversation when conversationId is omitted', async () => {
      const createConversation = vi
        .fn()
        .mockResolvedValue(
          agentConversationsFactory.build({ id: 'new-conversation-id' }),
        );
      const service = createMock<AgentConversationsService>({
        createConversation,
        getConversationForUser: vi.fn(),
      });

      const result = await resolvePersistedConversation(service, {
        conversationId: null,
        message: 'Hello there',
        userId: 'user-1',
      });

      expect(result).toEqual({
        conversationId: 'new-conversation-id',
        ok: true,
      });
      expect(createConversation).toHaveBeenCalledWith('user-1', {
        title: 'Hello there',
      });
    });

    test('returns not found when conversation is not owned', async () => {
      const service = createMock<AgentConversationsService>({
        createConversation: vi.fn(),
        getConversationForUser: vi
          .fn()
          .mockRejectedValue(new NotFoundException()),
      });

      const result = await resolvePersistedConversation(service, {
        conversationId: 'missing-id',
        message: 'Hello',
        userId: 'user-1',
      });

      expect(result).toEqual({
        errorMessage: PERSISTED_CONVERSATION_NOT_FOUND_ERROR,
        ok: false,
      });
    });
  });

  describe('parseAgentsChatTurnToolMetadata', () => {
    test('parses JSON objects', () => {
      expect(parseAgentsChatTurnToolMetadata('{"tool":"health"}')).toEqual({
        tool: 'health',
      });
    });

    test('returns null for empty input', () => {
      expect(parseAgentsChatTurnToolMetadata(null)).toBeNull();
    });
  });

  describe('persistSuccessfulAgentsChatTurn', () => {
    test('appends turn with routing metadata', async () => {
      const appendTurn = vi.fn().mockResolvedValue({
        assistantMessage: agentConversationMessagesFactory.build(),
        userMessage: agentConversationMessagesFactory.build(),
      });
      const service = createMock<AgentConversationsService>({ appendTurn });
      const turn = new AgentsChatTurnResult();

      turn.assistantText = 'Done';
      turn.errorMessage = null;
      turn.toolMetadataJson = JSON.stringify({ tool: 'health' });

      await persistSuccessfulAgentsChatTurn({
        agentConversationsService: service,
        conversationId: 'conv-1',
        llmRouterUsed: true,
        message: 'health',
        route: {
          args: {},
          confidence: 0.9,
          reason: 'llm_fallback:mock',
          tool: 'health',
        },
        routerModelSnapshot: {
          modelName: 'gpt-4o-mini',
          modelProvider: 'openai',
        },
        turn,
        userId: 'user-1',
      });

      expect(appendTurn).toHaveBeenCalledWith('user-1', 'conv-1', {
        assistantContent: 'Done',
        modelName: 'gpt-4o-mini',
        modelProvider: 'openai',
        routingConfidence: 0.9,
        routingModel: 'gpt-4o-mini',
        routingReason: 'llm_fallback:mock',
        routingTier: 'llm',
        toolMetadata: { tool: 'health' },
        userContent: 'health',
      });
    });
  });
});
