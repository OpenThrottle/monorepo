import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { McpDeveloperMcpSurface } from '@openthrottle/nestjs-openthrottle-mcp';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import type { AgentsMcpRouteDecision } from './agents-mcp-router';
import { AgentsMcpRouter } from './agents-mcp-router';
import { AgentsMcpRouterLlmService } from './agents-mcp-router-llm.service';
import { AgentsResolver } from './agents.resolver';

const createConfigStub = (): ConfigService =>
  ({
    get: () => undefined,
  }) as unknown as ConfigService;

/**
 * @description MCP surface stub covering every tool the agents MCP dispatch layer may call; uncalled paths reject.
 */
const createRoutedMcpSurfaceMock = (handlers: {
  readonly health?: ReturnType<typeof vi.fn>;
  readonly listSources?: ReturnType<typeof vi.fn>;
  readonly semanticSearch: ReturnType<typeof vi.fn>;
}): McpDeveloperMcpSurface => {
  const unexpected = vi.fn(() =>
    Promise.reject(new Error('unexpected MCP surface call')),
  );

  return {
    getActivityByDate: unexpected,
    getDocument: unexpected,
    getLastActivity: unexpected,
    getPlan: unexpected,
    getPlanOutput: unexpected,
    getRemainingTasksForPlan: unexpected,
    getTask: unexpected,
    getTasksByPlanId: unexpected,
    health: handlers.health ?? unexpected,
    listNotes: unexpected,
    listPlansByStatus: unexpected,
    listSources: handlers.listSources ?? unexpected,
    listTasksByCategory: unexpected,
    semanticSearch: handlers.semanticSearch,
  } as unknown as McpDeveloperMcpSurface;
};

const createLlmRouterStub = (): {
  readonly refineRoute: ReturnType<typeof vi.fn>;
  readonly shouldAttemptLlmRefinement: ReturnType<typeof vi.fn>;
} => ({
  refineRoute: vi.fn(async () => null),
  shouldAttemptLlmRefinement: vi.fn(() => false),
});

describe('AgentsResolver', () => {
  let resolver: AgentsResolver;
  let semanticSearch: ReturnType<typeof vi.fn>;
  const llmRouterStub = createLlmRouterStub();

  beforeAll(async () => {
    semanticSearch = vi.fn();

    const app = await Test.createTestingModule({
      providers: [
        AgentsResolver,
        AgentsMcpRouter,
        {
          provide: ConfigService,
          useValue: createConfigStub(),
        },
        {
          provide: AgentsMcpRouterLlmService,
          useValue: llmRouterStub,
        },
        {
          provide: McpDeveloperMcpSurface,
          useValue: createRoutedMcpSurfaceMock({ semanticSearch }),
        },
      ],
    }).compile();

    resolver = app.get(AgentsResolver);
  });

  describe('agentsRunChatTurn', () => {
    test('returns validation result when message is empty after trim', async () => {
      const out = await resolver.agentsRunChatTurn(
        { req: { headers: {} } },
        { conversationId: 'thread-a', message: '   ' },
      );

      expect(out).toMatchObject({
        assistantText: null,
        conversationId: 'thread-a',
        errorMessage: 'Message is required.',
        mcpTool: null,
        readOnlyAgentsChat: true,
        routingConfidence: null,
        routingReason: null,
        structuredPayloadJson: null,
        toolMetadataJson: null,
      });
      expect(semanticSearch).not.toHaveBeenCalled();
    });

    test('delegates to semanticSearch and maps assistant output', async () => {
      semanticSearch.mockResolvedValueOnce({
        content: [{ text: 'Search hits…' }],
        structuredContent: { ok: true },
      });

      const out = await resolver.agentsRunChatTurn(
        { req: { headers: { authorization: 'Bearer jwt-token' } } },
        { conversationId: 'c1', message: 'What is OT?' },
      );

      expect(semanticSearch).toHaveBeenCalledWith({ query: 'What is OT?' });
      expect(out.errorMessage).toBeNull();
      expect(out.conversationId).toBe('c1');
      expect(out.readOnlyAgentsChat).toBe(true);
      expect(out.routingConfidence).toBeGreaterThanOrEqual(0);
      expect(out.routingReason).toBe('default_semantic_search');
      expect(out.assistantText).toBe('Search hits…');
      expect(out.mcpTool).toBe('semantic_search');
      expect(out.structuredPayloadJson).toBe(JSON.stringify({ ok: true }));
      const meta = JSON.parse(out.toolMetadataJson ?? '{}');
      expect(meta.tool).toBe('semantic_search');
      expect(meta.routeReason).toBe('default_semantic_search');
      expect(typeof meta.confidence).toBe('number');
      expect(meta.arguments).toEqual({
        conversationId: 'c1',
        query: 'What is OT?',
      });
      expect(meta.structuredContent).toEqual({ ok: true });
    });

    test('routes health to the health tool and maps output', async () => {
      const health = vi.fn().mockResolvedValue({
        content: [{ text: 'Server health…' }],
        structuredContent: { serverHealth: { api: 'up' } },
      });
      const semantic = vi.fn();

      const app = await Test.createTestingModule({
        providers: [
          AgentsResolver,
          AgentsMcpRouter,
          {
            provide: ConfigService,
            useValue: createConfigStub(),
          },
          {
            provide: AgentsMcpRouterLlmService,
            useValue: createLlmRouterStub(),
          },
          {
            provide: McpDeveloperMcpSurface,
            useValue: createRoutedMcpSurfaceMock({
              health,
              semanticSearch: semantic,
            }),
          },
        ],
      }).compile();

      const r = app.get(AgentsResolver);
      const out = await r.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'health' },
      );

      expect(health).toHaveBeenCalledWith({});
      expect(semantic).not.toHaveBeenCalled();
      expect(out.errorMessage).toBeNull();
      expect(out.assistantText).toBe('Server health…');
      expect(out.mcpTool).toBe('health');
      expect(out.structuredPayloadJson).toBe(
        JSON.stringify({ serverHealth: { api: 'up' } }),
      );
      const meta = JSON.parse(out.toolMetadataJson ?? '{}');
      expect(meta.tool).toBe('health');
      expect(meta.routeReason).toBe('exact_health_ping');
    });

    test('returns mapped error when MCP reports isError', async () => {
      semanticSearch.mockResolvedValueOnce({
        content: [{ text: 'No embedding service' }],
        isError: true,
      });

      const out = await resolver.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'hello' },
      );

      expect(out.assistantText).toBeNull();
      expect(out.errorMessage).toBe('No embedding service');
      expect(out.mcpTool).toBe('semantic_search');
      expect(out.structuredPayloadJson).toBeNull();
    });

    test('maps auth token errors to a GraphQL-safe message', async () => {
      semanticSearch.mockRejectedValueOnce(
        new Error(
          'Auth token required for OpenThrottle (OT) GraphQL. Set OPENTHROTTLE_MCP_AUTH_TOKEN.',
        ),
      );

      const out = await resolver.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'hello' },
      );

      expect(out.assistantText).toBeNull();
      expect(out.errorMessage).toContain('Bearer token');
      expect(out.errorMessage).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN');
    });

    test('maps other MCP errors to errorMessage without throwing', async () => {
      semanticSearch.mockRejectedValueOnce(new Error('Upstream timeout'));

      const out = await resolver.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'hello' },
      );

      expect(out.errorMessage).toBe('Upstream timeout');
    });

    test('maps non-Error rejections', async () => {
      semanticSearch.mockRejectedValueOnce('string failure');

      const out = await resolver.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'hello' },
      );

      expect(out.errorMessage).toBe('string failure');
    });

    test('uses LLM-refined route when stub opts in and refineRoute returns a decision', async () => {
      const llm = createLlmRouterStub();
      llm.shouldAttemptLlmRefinement.mockImplementation(
        (d: AgentsMcpRouteDecision) =>
          d.tool === 'semantic_search' && d.confidence < 0.55,
      );
      llm.refineRoute.mockResolvedValue({
        args: {},
        confidence: 0.78,
        reason: 'mock_classifier',
        tool: 'list_sources',
      });

      const listSources = vi.fn().mockResolvedValue({
        content: [{ text: 'KB sources listed' }],
        structuredContent: { ok: true },
      });
      const semantic = vi.fn();

      const app = await Test.createTestingModule({
        providers: [
          AgentsResolver,
          AgentsMcpRouter,
          {
            provide: ConfigService,
            useValue: createConfigStub(),
          },
          {
            provide: AgentsMcpRouterLlmService,
            useValue: llm,
          },
          {
            provide: McpDeveloperMcpSurface,
            useValue: createRoutedMcpSurfaceMock({
              listSources,
              semanticSearch: semantic,
            }),
          },
        ],
      }).compile();

      const r = app.get(AgentsResolver);
      const out = await r.agentsRunChatTurn(
        { req: { headers: { authorization: 'Bearer jwt' } } },
        { conversationId: null, message: 'hello' },
      );

      expect(listSources).toHaveBeenCalledWith({});
      expect(semantic).not.toHaveBeenCalled();
      expect(out.errorMessage).toBeNull();
      expect(out.mcpTool).toBe('list_sources');
      expect(out.assistantText).toBe('KB sources listed');
      const meta = JSON.parse(out.toolMetadataJson ?? '{}');
      expect(meta.routeReason).toBe('llm_fallback:mock_classifier');
    });
  });
});
