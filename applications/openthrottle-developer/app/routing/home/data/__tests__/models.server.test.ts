// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  DiscoverRemoteModelsDocument,
} = await import('~/__generated__/graphql');
const { loadComposerModels, loadRepositories } =
  await import('../models.server');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

/** One local ollama endpoint exposing a single model. */
const LOCAL_PAYLOAD = {
  discoverLocalModels: {
    endpoints: [
      {
        baseUrl: 'http://localhost:11434/v1',
        host: 'localhost',
        models: ['llama3'],
        port: 11434,
        provider: 'ollama',
      },
    ],
    scannedAt: '2026-06-19T00:00:00.000Z',
    scannedHosts: ['localhost'],
  },
};

/** One chat-capable, base-URL-capable driver so the driver×endpoint join fires. */
const AGENT_PAYLOAD = {
  discoverAgentClis: {
    agents: [
      {
        backend: 'cursor',
        chatCapable: true,
        enabled: true,
        label: 'Cursor Agent',
        models: ['gpt-5.2'],
        supportsCustomBaseUrl: true,
        version: '2026.06.15',
      },
    ],
    scannedAt: '2026-06-19T00:00:00.000Z',
  },
};

/** One configured gateway catalog entry so the remote group contributes a row. */
const REMOTE_PAYLOAD = {
  discoverRemoteModels: {
    configured: true,
    models: [
      {
        contextLength: 200_000,
        id: 'anthropic/claude-sonnet-5',
        name: 'Anthropic: Claude Sonnet 5',
        provider: 'openrouter',
      },
    ],
    provider: 'openrouter',
    totalCount: 1,
  },
};

const BOTH_PAYLOAD = { ...AGENT_PAYLOAD, ...LOCAL_PAYLOAD, ...REMOTE_PAYLOAD };

const request = (): Request => new Request('http://localhost/');

/** The GraphQL documents used across the two discovery fetches. */
function calledDocuments(): unknown[] {
  return mockExecute.mock.calls.map((call) => call[1]);
}

describe('loadComposerModels', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('issues each discovery query exactly once and derives all four lists', async () => {
    mockExecute.mockResolvedValue(BOTH_PAYLOAD);

    const models = await loadComposerModels(request());

    // The whole point of the dedup: one fetch per query — NOT the pre-dedup
    // four (local ×2, agent ×2), and the remote catalog rides the SAME
    // Promise.all rather than adding a round trip elsewhere.
    expect(mockExecute).toHaveBeenCalledTimes(3);
    const documents = calledDocuments();
    expect(documents).toContain(DiscoverAgentClisDocument);
    expect(documents).toContain(DiscoverLocalModelsDocument);
    expect(documents).toContain(DiscoverRemoteModelsDocument);

    // local (1) + agent (1) + driver×endpoint (1) + remote (1), in that order.
    expect(models).toHaveLength(4);
    expect(models[0].description).toBe('ollama'); // local endpoint model
    expect(models[1].subLabel).toBe('Cursor Agent'); // agent CLI model
    expect(models[1].label).toBe('gpt-5.2');
    expect(models[2].subLabel).toBe('Cursor Agent'); // driver × local endpoint
    expect(models[2].description).toContain('(local)');
    expect(models[2].label).toBe('llama3');
    expect(models[3].groupId).toBe('openrouter'); // remote gateway catalog
    expect(models[3].subLabel).toBe('anthropic/claude-sonnet-5');
  });

  test('degrades the openrouter group away when the catalog query fails', async () => {
    // Promise.all order: agent, local, remote.
    mockExecute
      .mockResolvedValueOnce(AGENT_PAYLOAD)
      .mockResolvedValueOnce(LOCAL_PAYLOAD)
      .mockRejectedValueOnce(new Error('gateway unreachable'));

    const models = await loadComposerModels(request());

    // Everything else still renders — a gateway outage must not cost the page.
    expect(models).toHaveLength(3);
    expect(models.some((model) => model.groupId === 'openrouter')).toBe(false);
  });

  test('degrades to just local models when agent discovery fails', async () => {
    // Promise.all order: agent, local, remote.
    mockExecute
      .mockRejectedValueOnce(new Error('agent scan failed'))
      .mockResolvedValueOnce(LOCAL_PAYLOAD)
      .mockRejectedValueOnce(new Error('gateway unreachable'));

    const models = await loadComposerModels(request());

    expect(mockExecute).toHaveBeenCalledTimes(3);
    // No agent options and no driver×endpoint join (both need the agent payload).
    expect(models).toHaveLength(1);
    expect(models[0].description).toBe('ollama');
  });

  test('returns an empty list when both discovery queries fail', async () => {
    mockExecute.mockRejectedValue(new Error('everything failed'));

    const models = await loadComposerModels(request());

    expect(models).toEqual([]);
  });
});

describe('loadRepositories', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('carries the identity fields the picker disambiguates on', async () => {
    mockExecute.mockResolvedValue({
      workspaceLocalRepositories: [
        {
          displayName: 'monorepo',
          filesystemPath: '/Users/matt/Development/openthrottle',
          gitDefaultBranch: 'main',
          gitRemoteUrl: 'git@github.com:openthrottle/monorepo.git',
          id: 'repo-a',
          project: { name: 'OpenThrottle' },
        },
      ],
    });

    expect(await loadRepositories(request())).toEqual([
      {
        branch: 'main',
        displayName: 'monorepo',
        filesystemPath: '/Users/matt/Development/openthrottle',
        id: 'repo-a',
        projectName: 'OpenThrottle',
        remoteUrl: 'git@github.com:openthrottle/monorepo.git',
      },
    ]);
  });

  test('normalizes the nullable fields to undefined for a local-only checkout', async () => {
    mockExecute.mockResolvedValue({
      workspaceLocalRepositories: [
        {
          displayName: 'scratch',
          filesystemPath: '/tmp/scratch',
          gitDefaultBranch: null,
          gitRemoteUrl: null,
          id: 'repo-b',
          project: null,
        },
      ],
    });

    expect(await loadRepositories(request())).toEqual([
      {
        branch: undefined,
        displayName: 'scratch',
        filesystemPath: '/tmp/scratch',
        id: 'repo-b',
        projectName: undefined,
        remoteUrl: undefined,
      },
    ]);
  });

  test('returns an empty list when the query fails', async () => {
    mockExecute.mockRejectedValue(new Error('unauthorized'));

    expect(await loadRepositories(request())).toEqual([]);
  });
});
