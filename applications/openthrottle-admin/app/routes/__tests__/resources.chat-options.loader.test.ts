// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.chat-options';

vi.mock('~/routing/chat/data/models.server', () => ({
  loadAgentClis: vi.fn(),
  loadDiscoveredModels: vi.fn(),
  loadPersonas: vi.fn(),
  loadRepositories: vi.fn(),
}));

const { loadAgentClis, loadDiscoveredModels, loadPersonas, loadRepositories } =
  await import('~/routing/chat/data/models.server');
const { loader } = await import('../resources.chat-options');

const mockAgentClis = vi.mocked(loadAgentClis);
const mockDiscoveredModels = vi.mocked(loadDiscoveredModels);
const mockPersonas = vi.mocked(loadPersonas);
const mockRepositories = vi.mocked(loadRepositories);

const loaderArgs = (): Route.LoaderArgs =>
  createLoaderArgs<Route.LoaderArgs>({
    url: 'http://localhost/resources/chat-options',
  });

describe('routes/resources.chat-options loader (admin)', () => {
  beforeEach(() => {
    mockAgentClis.mockReset();
    mockDiscoveredModels.mockReset();
    mockPersonas.mockReset();
    mockRepositories.mockReset();
  });

  test('merges discovered models + agent CLIs and passes personas/repositories through', async () => {
    mockDiscoveredModels.mockResolvedValue([
      {
        description: 'ollama',
        groupId: 'openai:ollama',
        id: 'ep::m',
        label: 'm',
      },
    ]);
    mockAgentClis.mockResolvedValue([
      { description: 'cursor-agent', groupId: 'cursor', id: 'cursor', label: 'cursor-agent', subLabel: 'cursor-agent' }, // prettier-ignore
    ]);
    mockRepositories.mockResolvedValue([{ displayName: 'Repo', id: 'r1' }]);
    mockPersonas.mockResolvedValue([{ id: 'p1', label: 'Persona One' }]);

    const loaded = await loader(loaderArgs());

    expect(loaded).toEqual({
      models: [
        {
          description: 'ollama',
          groupId: 'openai:ollama',
          id: 'ep::m',
          label: 'm',
        },
        { description: 'cursor-agent', groupId: 'cursor', id: 'cursor', label: 'cursor-agent', subLabel: 'cursor-agent' }, // prettier-ignore
      ],
      personas: [{ id: 'p1', label: 'Persona One' }],
      repositories: [{ displayName: 'Repo', id: 'r1' }],
    });
  });

  test('degrades to empty arrays when discovery yields nothing', async () => {
    mockDiscoveredModels.mockResolvedValue([]);
    mockAgentClis.mockResolvedValue([]);
    mockRepositories.mockResolvedValue([]);
    mockPersonas.mockResolvedValue([]);

    const loaded = await loader(loaderArgs());

    expect(loaded).toEqual({ models: [], personas: [], repositories: [] });
  });
});
