import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { discoverAgentClisToolHandler } from '../agent-discovery.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
}));

const AUTH_STATE = { detail: null, status: 'unknown' };
const CAPABILITIES = {
  approvals: false,
  editApprovals: false,
  imageInput: false,
  mcpInjection: false,
  replaysFullHistory: false,
  resume: true,
  steering: false,
};

describe('discoverAgentClisToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
  });

  it('returns structured discovery content with mapped agents + models', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverAgentClis: {
        agents: [
          {
            auth: null,
            authState: AUTH_STATE,
            backend: 'cursor',
            capabilities: CAPABILITIES,
            chatCapable: true,
            label: 'cursor-agent',
            models: ['auto', 'gpt-5.2'],
            version: '2026.07.23',
          },
          {
            auth: null,
            authState: AUTH_STATE,
            backend: 'codex',
            capabilities: CAPABILITIES,
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
            capabilities: CAPABILITIES,
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
    if (content === undefined) {
      throw new Error('expected tool result content');
    }
    expect(content.text).toContain('plan-run only');
  });

  it('exposes the claude auth report and prints the override warning', async () => {
    const auth = {
      accountEmail: 'dev@example.com',
      activeCredential: 'apiKey',
      apiKeyOverridesSubscription: true,
      authMethod: 'claude.ai',
      loggedIn: true,
      organizationName: 'Example Org',
      subscriptionType: 'team',
      warning: `ANTHROPIC_API_KEY is set, so Claude runs bill the API key, not your team subscription. Unset it to use the subscription.`,
    };
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverAgentClis: {
        agents: [
          {
            auth,
            authState: AUTH_STATE,
            backend: 'claude',
            capabilities: CAPABILITIES,
            chatCapable: true,
            label: 'Claude Code',
            models: ['opus'],
            version: '2.1.270',
          },
        ],
        scannedAt: '2026-07-28T00:00:00.000Z',
        totalCount: 1,
      },
    });

    const result = await discoverAgentClisToolHandler({});

    expect(result).toMatchObject({
      structuredContent: { agents: [{ auth, backend: 'claude' }] },
    });
    const [content] = result.content;
    if (content === undefined) {
      throw new Error('expected tool result content');
    }
    expect(content.text).toContain('dev@example.com, team');
    expect(content.text).toContain('WARNING (Claude Code)');
    expect(content.text).toContain(auth.warning);
  });

  it('maps authState and capabilities into the structured output', async () => {
    const authState = {
      detail: 'Logged in as dev@example.com',
      status: 'authenticated',
    };
    const capabilities = {
      approvals: true,
      editApprovals: false,
      imageInput: true,
      mcpInjection: true,
      replaysFullHistory: false,
      resume: true,
      steering: false,
    };
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverAgentClis: {
        agents: [
          {
            auth: null,
            authState,
            backend: 'cursor',
            capabilities,
            chatCapable: true,
            label: 'cursor-agent',
            models: [],
            version: '1',
          },
        ],
        scannedAt: '2026-07-28T00:00:00.000Z',
        totalCount: 1,
      },
    });

    const result = await discoverAgentClisToolHandler({});

    expect(result).toMatchObject({
      structuredContent: { agents: [{ authState, capabilities }] },
    });
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
