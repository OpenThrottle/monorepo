import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { healthToolHandler } from './health.js';

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
      expect(content.text).toBe(
        'health failed: Could not reach the OpenThrottle (OT) server. Confirm the server is running and reachable, then retry.',
      );
      expect(content.text).not.toContain('127.0.0.1');
      expect(content.text).not.toContain('ECONNREFUSED');
    });
  });
});
