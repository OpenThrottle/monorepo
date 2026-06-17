import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import {
  type AgentConversation,
  type AgentConversationMessage,
  AgentConversationsService,
} from '@openthrottle/nestjs-repositories';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationStreamResolver } from './conversation-stream.resolver';
import { ConversationStreamService } from './conversation-stream.service';

const human: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };
const serviceAccount: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-1',
};

const discovery: DiscoveryResult = {
  endpoints: [
    {
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3'],
      port: 11434,
      provider: 'ollama',
    },
  ],
  scannedAt: '2026-06-17T00:00:00.000Z',
  scannedHosts: ['localhost'],
};

const conversation = { id: 'conv-1', userId: 'user-1' } as AgentConversation;
const userMessage = {
  id: 'user-msg-1',
  role: 'user',
} as AgentConversationMessage;

function build(): {
  conversations: AgentConversationsService;
  modelDiscovery: NestjsModelDiscoveryService;
  resolver: ConversationStreamResolver;
  streamService: ConversationStreamService;
} {
  const conversations = createMock<AgentConversationsService>({
    appendMessages: vi.fn().mockResolvedValue([userMessage]),
    createConversation: vi.fn().mockResolvedValue(conversation),
    getConversationForUser: vi.fn().mockResolvedValue(conversation),
    listMessagesForConversation: vi.fn().mockResolvedValue([userMessage]),
  });
  const modelDiscovery = createMock<NestjsModelDiscoveryService>({
    discover: vi.fn().mockResolvedValue(discovery),
  });
  const streamService = createMock<ConversationStreamService>({
    cancel: vi.fn().mockReturnValue(true),
    start: vi.fn(),
  });
  const resolver = new ConversationStreamResolver(
    conversations,
    modelDiscovery,
    streamService,
  );
  return { conversations, modelDiscovery, resolver, streamService };
}

describe('ConversationStreamResolver.startConversationStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a conversation, persists the user message, and starts the stream', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(human, {
      baseUrl: 'http://localhost:11434/v1',
      conversationId: null,
      message: 'hello',
      modelId: 'llama3',
    });

    expect(result.errorMessage).toBeNull();
    expect(result.conversationId).toBe('conv-1');
    expect(result.userMessageId).toBe('user-msg-1');
    expect(result.assistantMessageId).toEqual(expect.any(String));
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessageId: result.assistantMessageId,
        baseUrl: 'http://localhost:11434/v1',
        conversationId: 'conv-1',
        model: 'llama3',
        provider: 'ollama',
        userId: 'user-1',
      }),
    );
  });

  it('rejects an unauthenticated (non-human) caller', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(serviceAccount, {
      baseUrl: 'http://localhost:11434/v1',
      conversationId: null,
      message: 'hello',
      modelId: 'llama3',
    });

    expect(result.errorMessage).toBe('Human authentication required.');
    expect(result.conversationId).toBeNull();
    expect(streamService.start).not.toHaveBeenCalled();
  });

  it('rejects a model/endpoint not present in discovery (SSRF guard)', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(human, {
      baseUrl: 'http://evil.example.com/v1',
      conversationId: null,
      message: 'hello',
      modelId: 'llama3',
    });

    expect(result.errorMessage).toContain('Unknown model or endpoint');
    expect(streamService.start).not.toHaveBeenCalled();
  });

  it('rejects an empty message', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(human, {
      baseUrl: 'http://localhost:11434/v1',
      conversationId: null,
      message: '   ',
      modelId: 'llama3',
    });

    expect(result.errorMessage).toBe('Message is required.');
    expect(streamService.start).not.toHaveBeenCalled();
  });
});

describe('ConversationStreamResolver.cancelConversationStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels for an owned conversation', async () => {
    const { resolver, streamService } = build();

    await expect(
      resolver.cancelConversationStream(human, 'conv-1'),
    ).resolves.toBe(true);
    expect(streamService.cancel).toHaveBeenCalledWith('conv-1');
  });

  it('returns false for a non-human caller', async () => {
    const { resolver, streamService } = build();

    await expect(
      resolver.cancelConversationStream(serviceAccount, 'conv-1'),
    ).resolves.toBe(false);
    expect(streamService.cancel).not.toHaveBeenCalled();
  });
});
