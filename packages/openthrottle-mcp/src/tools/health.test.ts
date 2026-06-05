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
    it('returns an error result with the message', async () => {
      vi.mocked(executeGraphql).mockRejectedValue(new Error('network down'));

      const result = await healthToolHandler({});

      expect(result).toEqual({
        content: [{ text: 'health failed: network down', type: 'text' }],
        isError: true,
      });
    });
  });
});
