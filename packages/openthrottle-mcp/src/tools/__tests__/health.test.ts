import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setActiveToolsets } from '../../config/toolsets.ts';
import { healthToolHandler } from '../health.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
}));

describe('healthToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
  });

  describe('when GraphQL returns server health', () => {
    it('returns structured health content', async () => {
      vi.mocked(executeGraphql).mockResolvedValue({
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      });

      const result = await healthToolHandler({});

      expect(result).toMatchObject({
        content: [
          {
            text: expect.stringContaining('api: ok'),
            type: 'text',
          },
        ],
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

  describe('when only the default toolsets are active', () => {
    it('reports the disabled toolsets and how to enable them', async () => {
      setActiveToolsets(new Set(['core']));
      vi.mocked(executeGraphql).mockResolvedValue({
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      });

      const result = await healthToolHandler({});

      expect(result).toMatchObject({
        structuredContent: {
          toolsets: {
            disabled: [{ name: 'admin' }, { name: 'agents' }, { name: 'blog' }],
            enableWith: expect.stringContaining('OPENTHROTTLE_MCP_TOOLSETS'),
            enabled: ['core'],
          },
        },
      });
    });
  });

  describe('when every toolset is active', () => {
    it('reports none disabled', async () => {
      setActiveToolsets(new Set(['admin', 'agents', 'blog', 'core']));
      vi.mocked(executeGraphql).mockResolvedValue({
        serverHealth: {
          api: 'ok',
          database: 'ok',
          redis: 'ok',
          websocket: 'ok',
        },
      });

      const result = await healthToolHandler({});

      expect(result).toMatchObject({
        structuredContent: { toolsets: { disabled: [] } },
      });
      setActiveToolsets(new Set(['core']));
    });
  });

  describe('when GraphQL returns no server health', () => {
    it('returns an error result', async () => {
      vi.mocked(executeGraphql).mockResolvedValue({ serverHealth: null });

      const result = await healthToolHandler({});

      expect(result).toEqual({
        content: [{ text: 'health returned no result', type: 'text' }],
        isError: true,
      });
    });
  });

  describe('when GraphQL throws', () => {
    it('returns a sanitized error result without leaking backend detail', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(executeGraphql).mockRejectedValue(
        new Error('network down: connect ECONNREFUSED 127.0.0.1:6020'),
      );

      const result = await healthToolHandler({});

      expect(result).toMatchObject({ isError: true });
      const [content] = result.content;
      if (content === undefined) {
        throw new Error('expected tool result content');
      }
      expect(content.text).toBe(
        'health failed: Could not reach the OpenThrottle (OT) server. Confirm the server is running and reachable, then retry.',
      );
      expect(content.text).not.toContain('127.0.0.1');
      expect(content.text).not.toContain('ECONNREFUSED');
    });
  });
});
