import {
  executeGraphql,
  executeGraphqlWithAuth,
} from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpDeveloperMcpSurface } from './openthrottle-mcp-mcp-surface.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
  executeGraphqlWithAuth: vi.fn(),
}));

describe('McpDeveloperMcpSurface', () => {
  const surface = new McpDeveloperMcpSurface();

  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
    vi.mocked(executeGraphqlWithAuth).mockReset();
  });

  describe('health', () => {
    it('delegates to the shared health tool handler', async () => {
      vi.mocked(executeGraphql).mockResolvedValue({
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      });

      const result = await surface.health({});

      expect(result).toMatchObject({
        structuredContent: {
          serverHealth: {
            api: 'ok',
            database: 'ok',
            redis: 'ok',
            websocket: 'ok',
          },
        },
      });
    });
  });

  describe('agentConversationList', () => {
    beforeEach(() => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    });

    afterEach(() => {
      delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
    });

    it('delegates to the shared agent conversation list handler', async () => {
      const conversations = [
        {
          createdAt: '2026-06-01T12:00:00.000Z',
          id: 'conv-1',
          metadataJson: null,
          modelName: null,
          modelProvider: null,
          planId: null,
          projectId: null,
          status: 'active',
          title: null,
          updatedAt: '2026-06-01T12:00:00.000Z',
          userId: 'user-1',
        },
      ];
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listAgentConversations: { conversations, totalCount: 1 },
      });

      const result = await surface.agentConversationList({});

      expect(result).toMatchObject({
        structuredContent: { conversations, totalCount: 1 },
      });
    });
  });
});
