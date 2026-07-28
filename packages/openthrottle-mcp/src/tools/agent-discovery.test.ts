import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { discoverAgentClisToolHandler } from './agent-discovery.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
}));

describe('discoverAgentClisToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
  });

  it('returns structured discovery content with mapped agents + models', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverAgentClis: {
        agents: [
          {
            backend: 'cursor',
            chatCapable: true,
            label: 'cursor-agent',
            models: ['auto', 'gpt-5.2'],
            version: '2026.07.23',
          },
          {
            backend: 'codex',
            chatCapable: false,
            label: 'codex',
            models: [],
            version: 'codex-cli 0.145.0',
          },
        ],
        scannedAt: '2026-07-28T00:00:00.000Z',
        totalCount: 2,
      },
    });

    const result = await discoverAgentClisToolHandler({});

    expect(result).toMatchObject({
      content: [
        {
          text: expect.stringContaining('cursor'),
          type: 'text',
        },
      ],
      structuredContent: {
        agents: [
          {
            backend: 'cursor',
            chatCapable: true,
            models: ['auto', 'gpt-5.2'],
            version: '2026.07.23',
          },
          { backend: 'codex', chatCapable: false, models: [] },
        ],
        totalCount: 2,
      },
    });
    // Plan-run-only drivers are annotated in the text summary.
    const [content] = result.content;
    expect(content.text).toContain('plan-run only');
  });

  it('reports no agent CLIs found for an empty result', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverAgentClis: {
        agents: [],
        scannedAt: '2026-07-28T00:00:00.000Z',
        totalCount: 0,
      },
    });

    const result = await discoverAgentClisToolHandler({});

    expect(result).toMatchObject({
      content: [
        {
          text: expect.stringContaining('No agent CLIs found'),
          type: 'text',
        },
      ],
      structuredContent: { totalCount: 0 },
    });
  });

  it('returns an error result when GraphQL returns nothing', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({ discoverAgentClis: null });

    const result = await discoverAgentClisToolHandler({});

    expect(result).toEqual({
      content: [
        { text: 'discover_agent_clis returned no result', type: 'text' },
      ],
      isError: true,
    });
  });
});
