import { Test } from '@nestjs/testing';
import { McpDeveloperMcpSurface } from '@openthrottle/nestjs-mcp-developer';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { AgentsResolver } from './agents.resolver';

describe('AgentsResolver', () => {
  let resolver: AgentsResolver;
  let semanticSearch: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    semanticSearch = vi.fn();

    const app = await Test.createTestingModule({
      providers: [
        AgentsResolver,
        {
          provide: McpDeveloperMcpSurface,
          useValue: { semanticSearch },
        },
      ],
    }).compile();

    resolver = app.get(AgentsResolver);
  });

  describe('agentsRunChatTurn', () => {
    test('returns validation result when message is empty after trim', async () => {
      const out = await resolver.agentsRunChatTurn(
        { req: { headers: {} } },
        { conversationId: null, message: '   ' },
      );

      expect(out).toMatchObject({
        assistantText: null,
        errorMessage: 'Message is required.',
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
      expect(out.assistantText).toBe('Search hits…');
      const meta = JSON.parse(out.toolMetadataJson ?? '{}');
      expect(meta.tool).toBe('semantic_search');
      expect(meta.arguments).toEqual({
        conversationId: 'c1',
        query: 'What is OT?',
      });
      expect(meta.structuredContent).toEqual({ ok: true });
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
    });

    test('maps auth token errors to a GraphQL-safe message', async () => {
      semanticSearch.mockRejectedValueOnce(
        new Error(
          'Auth token required for OpenThrottle (OT) GraphQL. Set MCP_DEVELOPER_AUTH_TOKEN.',
        ),
      );

      const out = await resolver.agentsRunChatTurn(
        { req: {} },
        { conversationId: null, message: 'hello' },
      );

      expect(out.assistantText).toBeNull();
      expect(out.errorMessage).toContain('Bearer token');
      expect(out.errorMessage).toContain('MCP_DEVELOPER_AUTH_TOKEN');
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
  });
});
