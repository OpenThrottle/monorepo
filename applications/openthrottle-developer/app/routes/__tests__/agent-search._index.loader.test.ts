// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import type { AgentAssetResult } from '~/routing/agent-search/types';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/agent-search._index';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/agent-search/data/disk-fallback.server', () => ({
  diskFallbackSearch: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { diskFallbackSearch } =
  await import('~/routing/agent-search/data/disk-fallback.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { loader } = await import('../agent-search._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockDiskFallback = vi.mocked(diskFallbackSearch);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const buildArgs = (path: string): Route.LoaderArgs => {
  const request = new Request(`http://localhost${path}`);
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/agent-search',
    request,
    url: new URL(request.url),
  };
};

const dbChunk = (
  overrides: Partial<{
    customPromptId: string;
    id: string;
    promptType: CustomPromptType;
    similarity: number;
    title: string;
  }> = {},
) => ({
  content: 'chunk content',
  customPromptId: overrides.customPromptId ?? 'cp-1',
  description: 'desc',
  filePath: '.agents/skills/foo/SKILL.md',
  id: overrides.id ?? 'chunk-1',
  labels: ['a'],
  projectId: null,
  promptType: overrides.promptType ?? CustomPromptType.Skills,
  similarity: overrides.similarity ?? 0.9,
  title: overrides.title ?? 'foo',
});

describe('routes/agent-search._index loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockDiskFallback.mockReset();
    mockGetMonorepoRoot.mockReset();
  });

  test('returns empty result and skips GraphQL when query is blank', async () => {
    const result = await loader(buildArgs('/agent-search?q=%20%20'));

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
    expect(result.counts).toEqual({ all: 0, personas: 0, rules: 0, skills: 0 });
    expect(result.usedDiskFallback).toBe(false);
  });

  test('maps DB chunks, computes per-type counts, source db', async () => {
    mockExecute.mockResolvedValue({
      searchAgentAssets: {
        chunks: [
          dbChunk({ id: 'c1', promptType: CustomPromptType.Skills }),
          dbChunk({
            customPromptId: 'cp-2',
            id: 'c2',
            promptType: CustomPromptType.Rules,
            title: 'bar',
          }),
        ],
      },
    });

    const result = await loader(buildArgs('/agent-search?q=commit'));

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockDiskFallback).not.toHaveBeenCalled();
    expect(result.usedDiskFallback).toBe(false);
    expect(result.counts).toEqual({ all: 2, personas: 0, rules: 1, skills: 1 });
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      promptType: 'skills',
      source: 'db',
      title: 'foo',
    });
  });

  test('filters visible results to the active tab', async () => {
    mockExecute.mockResolvedValue({
      searchAgentAssets: {
        chunks: [
          dbChunk({ id: 'c1', promptType: CustomPromptType.Skills }),
          dbChunk({
            customPromptId: 'cp-2',
            id: 'c2',
            promptType: CustomPromptType.Rules,
          }),
        ],
      },
    });

    const result = await loader(buildArgs('/agent-search?q=commit&type=rules'));

    expect(result.tab).toBe('rules');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].promptType).toBe('rules');
    // counts still reflect all types for tab labels
    expect(result.counts.all).toBe(2);
  });

  test('falls back to disk scan when DB returns no chunks', async () => {
    mockExecute.mockResolvedValue({ searchAgentAssets: { chunks: [] } });
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    const diskResults: AgentAssetResult[] = [
      {
        content: 'on-disk match',
        customPromptId: null,
        description: 'a rule',
        filePath: '.agents/rules/foo.mdc',
        id: 'disk:rules:.agents/rules/foo.mdc',
        labels: [],
        promptType: 'rules',
        similarity: null,
        source: 'disk',
        title: 'foo-rule',
      },
    ];
    mockDiskFallback.mockReturnValue(diskResults);

    const result = await loader(buildArgs('/agent-search?q=foo'));

    expect(mockDiskFallback).toHaveBeenCalledWith(
      'foo',
      ['skills', 'rules', 'personas'],
      50,
      '/workspace/openthrottle',
    );
    expect(result.usedDiskFallback).toBe(true);
    expect(result.results[0]).toMatchObject({
      source: 'disk',
      title: 'foo-rule',
    });
    expect(result.counts).toEqual({ all: 1, personas: 0, rules: 1, skills: 0 });
  });
});
