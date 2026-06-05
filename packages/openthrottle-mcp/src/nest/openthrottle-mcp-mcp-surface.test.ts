import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpDeveloperMcpSurface } from './openthrottle-mcp-mcp-surface.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
}));

describe('McpDeveloperMcpSurface', () => {
  const surface = new McpDeveloperMcpSurface();

  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
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
});
