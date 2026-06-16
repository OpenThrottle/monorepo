import {
  embedQuery,
  searchAgentAssets,
} from '@openthrottle/ai-mcp/src/cortex-server';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { AgentAssetSearchResolver } from './agent-asset-search.resolver';
import { CustomPromptTypeEnum } from './custom-prompt.object';

vi.mock('@openthrottle/ai-mcp/src/cortex-server', () => ({
  embedQuery: vi.fn(),
  searchAgentAssets: vi.fn(),
}));

describe('AgentAssetSearchResolver', () => {
  let resolver: AgentAssetSearchResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AgentAssetSearchResolver],
    }).compile();

    resolver = app.get<AgentAssetSearchResolver>(AgentAssetSearchResolver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns empty chunks when query is empty after trim', async () => {
    const result = await resolver.searchAgentAssets({
      limit: null,
      projectId: null,
      promptTypes: null,
      query: '   ',
    });

    expect(result).toEqual({ chunks: [] });
    expect(embedQuery).not.toHaveBeenCalled();
  });

  test('returns empty chunks when embedQuery returns undefined', async () => {
    vi.mocked(embedQuery).mockResolvedValue(undefined);

    const result = await resolver.searchAgentAssets({
      limit: 10,
      projectId: null,
      promptTypes: null,
      query: 'commit',
    });

    expect(result).toEqual({ chunks: [] });
    expect(embedQuery).toHaveBeenCalledWith('commit');
    expect(searchAgentAssets).not.toHaveBeenCalled();
  });

  test('defaults to skills/rules/personas when promptTypes omitted', async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);
    vi.mocked(searchAgentAssets).mockResolvedValue([]);

    await resolver.searchAgentAssets({
      limit: null,
      projectId: null,
      promptTypes: null,
      query: 'how to commit',
    });

    expect(searchAgentAssets).toHaveBeenCalledWith(
      [0.1, 0.2],
      20,
      [
        CustomPromptTypeEnum.SKILLS,
        CustomPromptTypeEnum.RULES,
        CustomPromptTypeEnum.PERSONAS,
      ],
      null,
    );
  });

  test('passes through explicit promptTypes and projectId, clamps limit to 50', async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1]);
    vi.mocked(searchAgentAssets).mockResolvedValue([]);

    await resolver.searchAgentAssets({
      limit: 100,
      projectId: 'project-uuid',
      promptTypes: [CustomPromptTypeEnum.SKILLS],
      query: 'ralph',
    });

    expect(searchAgentAssets).toHaveBeenCalledWith(
      [0.1],
      50,
      [CustomPromptTypeEnum.SKILLS],
      'project-uuid',
    );
  });

  test('maps chunks to AgentAssetChunk shape', async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1]);
    vi.mocked(searchAgentAssets).mockResolvedValue([
      {
        content: 'Run /github/commit after each task.',
        customPromptId: 'cp-uuid',
        description: 'Commit guidance',
        filePath: '.agents/skills/git-commit/SKILL.md',
        id: 'chunk-uuid',
        labels: ['git', 'commit'],
        projectId: null,
        promptType: 'skills',
        similarity: 0.91,
        title: 'git-commit',
      },
    ]);

    const result = await resolver.searchAgentAssets({
      limit: 5,
      projectId: null,
      promptTypes: null,
      query: 'commit',
    });

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toMatchObject({
      content: 'Run /github/commit after each task.',
      customPromptId: 'cp-uuid',
      description: 'Commit guidance',
      filePath: '.agents/skills/git-commit/SKILL.md',
      id: 'chunk-uuid',
      labels: ['git', 'commit'],
      promptType: CustomPromptTypeEnum.SKILLS,
      similarity: 0.91,
      title: 'git-commit',
    });
  });
});
