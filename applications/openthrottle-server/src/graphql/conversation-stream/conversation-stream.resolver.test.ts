import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  agentConversationMessagesFactory,
  agentConversationsFactory,
  AgentConversationsService,
  CustomPromptsService,
  WorkspaceLocalRepositoriesService,
} from '@openthrottle/nestjs-repositories';
import type {
  CustomPrompt,
  WorkspaceLocalRepository,
} from '@openthrottle/nestjs-repositories';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationStreamResolver } from './conversation-stream.resolver';
import { ConversationStreamService } from './conversation-stream.service';

const { createCursorAgentSessionMock } = vi.hoisted(() => ({
  createCursorAgentSessionMock: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/openthrottle-agentic-utils')
  >()),
  createCursorAgentSession: createCursorAgentSessionMock,
}));

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

const conversation = agentConversationsFactory.build({
  id: 'conv-1',
  userId: 'user-1',
});
const userMessage = agentConversationMessagesFactory.build({
  id: 'user-msg-1',
  role: 'user',
});

function build(): {
  conversations: AgentConversationsService;
  modelDiscovery: NestjsModelDiscoveryService;
  personaFindOne: ReturnType<typeof vi.fn>;
  repositories: WorkspaceLocalRepositoriesService;
  resolver: ConversationStreamResolver;
  streamService: ConversationStreamService;
} {
  const conversations = createMock<AgentConversationsService>({
    appendMessages: vi.fn().mockResolvedValue([userMessage]),
    createConversation: vi.fn().mockResolvedValue(conversation),
    getConversationForUser: vi.fn().mockResolvedValue(conversation),
    listMessagesForConversation: vi.fn().mockResolvedValue([userMessage]),
    updateMetadata: vi.fn().mockResolvedValue(conversation),
  });
  const personaFindOne = vi.fn().mockResolvedValue(null);
  const customPrompts = createMock<CustomPromptsService>({
    getRepository: () =>
      createMock<Repository<CustomPrompt>>({ findOne: personaFindOne }),
  });
  const modelDiscovery = createMock<NestjsModelDiscoveryService>({
    discover: vi.fn().mockResolvedValue(discovery),
  });
  const repositories = createMock<WorkspaceLocalRepositoriesService>({
    findByIdForUser: vi.fn().mockResolvedValue(null),
  });
  const streamService = createMock<ConversationStreamService>({
    cancel: vi.fn().mockReturnValue(true),
    start: vi.fn(),
    subscribe: vi.fn().mockReturnValue({ next: vi.fn() }),
  });
  const logger = createMock<LoggerService>({
    debug: vi.fn(),
    warn: vi.fn(),
  });
  const resolver = new ConversationStreamResolver(
    conversations,
    customPrompts,
    logger,
    modelDiscovery,
    repositories,
    streamService,
  );
  return {
    conversations,
    modelDiscovery,
    personaFindOne,
    repositories,
    resolver,
    streamService,
  };
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

  it('routes a cursor backend: resolves the repo cwd, mints a session, starts the cursor stream', async () => {
    const { repositories, resolver, streamService } = build();
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<WorkspaceLocalRepository>({
        filesystemPath: '/repo/checkout',
      }),
    );
    createCursorAgentSessionMock.mockResolvedValue('cursor-sess-1');

    const result = await resolver.startConversationStream(human, {
      backend: 'cursor',
      baseUrl: null,
      conversationId: null,
      message: 'do the thing',
      modelId: null,
      personaId: 'architect',
      repositoryId: 'repo-1',
    });

    expect(result.errorMessage).toBeNull();
    expect(createCursorAgentSessionMock).toHaveBeenCalledWith({
      cwd: '/repo/checkout',
    });
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'cursor',
        cwd: '/repo/checkout',
        provider: 'cursor',
        sessionId: 'cursor-sess-1',
        systemPrompt: expect.stringContaining('Architect'),
      }),
    );
  });

  it('resolves a cursor persona system prompt from the custom_prompts registry by id', async () => {
    const { personaFindOne, repositories, resolver, streamService } = build();
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<WorkspaceLocalRepository>({
        filesystemPath: '/repo/checkout',
      }),
    );
    createCursorAgentSessionMock.mockResolvedValue('cursor-sess-1');
    personaFindOne.mockResolvedValue(
      createMock<CustomPrompt>({ content: 'You are the registry persona.' }),
    );
    const personaId = '11111111-1111-4111-8111-111111111111';

    await resolver.startConversationStream(human, {
      backend: 'cursor',
      baseUrl: null,
      conversationId: null,
      message: 'hi',
      modelId: null,
      personaId,
      repositoryId: 'repo-1',
    });

    expect(personaFindOne).toHaveBeenCalledWith({
      where: { id: personaId, promptType: 'personas' },
    });
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: 'You are the registry persona.',
      }),
    );
  });

  it('routes a claude backend: mints a UUID session (no create round-trip), resumeSession false', async () => {
    const { conversations, repositories, resolver, streamService } = build();
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<WorkspaceLocalRepository>({
        filesystemPath: '/repo/checkout',
      }),
    );

    const result = await resolver.startConversationStream(human, {
      backend: 'claude',
      baseUrl: null,
      conversationId: null,
      message: 'do the thing',
      modelId: null,
      personaId: 'architect',
      repositoryId: 'repo-1',
    });

    expect(result.errorMessage).toBeNull();
    // claude does not use cursor's create-chat round-trip.
    expect(createCursorAgentSessionMock).not.toHaveBeenCalled();
    expect(conversations.updateMetadata).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ claudeSessionId: expect.any(String) }),
    );
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'claude',
        cwd: '/repo/checkout',
        provider: 'claude',
        resumeSession: false,
        sessionId: expect.any(String),
        systemPrompt: expect.stringContaining('Architect'),
      }),
    );
  });

  it('routes an opencode backend: no session id up front (opencode mints it), resumeSession false', async () => {
    const { conversations, repositories, resolver, streamService } = build();
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<WorkspaceLocalRepository>({
        filesystemPath: '/repo/checkout',
      }),
    );

    const result = await resolver.startConversationStream(human, {
      backend: 'opencode',
      baseUrl: null,
      conversationId: null,
      message: 'do the thing',
      modelId: null,
      personaId: null,
      repositoryId: 'repo-1',
    });

    expect(result.errorMessage).toBeNull();
    expect(createCursorAgentSessionMock).not.toHaveBeenCalled();
    // Only the repository id is persisted up front; opencode mints the session.
    expect(conversations.updateMetadata).toHaveBeenCalledWith('conv-1', {
      opencodeRepositoryId: 'repo-1',
    });
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'opencode',
        cwd: '/repo/checkout',
        provider: 'opencode',
        resumeSession: false,
        sessionId: null,
      }),
    );
  });

  it('resumes an existing CLI session from conversation metadata without re-minting', async () => {
    const { conversations, repositories, resolver, streamService } = build();
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<WorkspaceLocalRepository>({
        filesystemPath: '/repo/checkout',
      }),
    );
    vi.mocked(conversations.getConversationForUser).mockResolvedValue(
      agentConversationsFactory.build({
        id: 'conv-1',
        metadata: { claudeSessionId: 'uuid-existing' },
        userId: 'user-1',
      }),
    );

    await resolver.startConversationStream(human, {
      backend: 'claude',
      baseUrl: null,
      conversationId: 'conv-1',
      message: 'again',
      modelId: null,
      personaId: null,
      repositoryId: 'repo-1',
    });

    expect(conversations.updateMetadata).not.toHaveBeenCalled();
    expect(streamService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'claude',
        resumeSession: true,
        sessionId: 'uuid-existing',
      }),
    );
  });

  it('rejects a cursor backend when the repository is not owned/found', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(human, {
      backend: 'cursor',
      baseUrl: null,
      conversationId: 'conv-1',
      message: 'hi',
      modelId: null,
      personaId: null,
      repositoryId: 'missing-repo',
    });

    expect(result.errorMessage).toBe('Repository not found.');
    expect(streamService.start).not.toHaveBeenCalled();
  });

  it('rejects an unsupported backend (allowlist enforcement)', async () => {
    const { resolver, streamService } = build();

    const result = await resolver.startConversationStream(human, {
      backend: 'rm-rf-backend',
      baseUrl: null,
      conversationId: null,
      message: 'hi',
      modelId: null,
      personaId: null,
      repositoryId: null,
    });

    expect(result.errorMessage).toContain('Unsupported backend');
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

describe('ConversationStreamResolver.conversationStreamChunkAdded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes (with replay) for an authenticated owner', async () => {
    const { conversations, resolver, streamService } = build();

    await resolver.conversationStreamChunkAdded('conv-1', { userId: 'user-1' });

    expect(conversations.getConversationForUser).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
    );
    expect(streamService.subscribe).toHaveBeenCalledWith('conv-1');
  });

  it('throws when the connection is unauthenticated', async () => {
    const { resolver, streamService } = build();

    await expect(
      resolver.conversationStreamChunkAdded('conv-1', {}),
    ).rejects.toThrow('authenticated connection');
    expect(streamService.subscribe).not.toHaveBeenCalled();
  });

  it('rejects when the caller does not own the conversation', async () => {
    const { conversations, resolver, streamService } = build();
    vi.mocked(conversations.getConversationForUser).mockRejectedValueOnce(
      new Error('Agent conversation not found'),
    );

    await expect(
      resolver.conversationStreamChunkAdded('conv-1', { userId: 'user-1' }),
    ).rejects.toThrow('not found');
    expect(streamService.subscribe).not.toHaveBeenCalled();
  });
});
