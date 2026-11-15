import { Test } from '@nestjs/testing';
import {
  searchAgentAssets,
  searchAgentAssetsLexically,
} from '@openthrottle/node-client';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { EmbedderService } from '../../../services/embedder/embedder.service.ts';
import { CustomPromptTypeEnum } from '../custom-prompt.object.ts';
import { AgentAssetSearchResolver } from './agent-asset-search.resolver.ts';

vi.mock('@openthrottle/node-client', () => ({
  searchAgentAssets: vi.fn(),
  searchAgentAssetsLexically: vi.fn(),
}));

const embed = vi.fn();

function embedded(vector: number[]): unknown {
  return {
    dims: vector.length,
    model: 'nomic-embed-text-v1.5',
    ok: true,
    vectors: [vector],
  };
}

describe('AgentAssetSearchResolver', () => {
  let resolver: AgentAssetSearchResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentAssetSearchResolver,
        { provide: EmbedderService, useValue: { embed } },
      ],
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

    expect(result).toEqual({ chunks: [], mode: 'semantic', reason: null });
    expect(embed).not.toHaveBeenCalled();
  });

  test('answers lexically, with the reason, when the embedder is unconfigured', async () => {
    vi.mocked(searchAgentAssetsLexically).mockResolvedValue([]);
    embed.mockResolvedValue({
      detail: 'no weights',
      ok: false,
      reason: 'unconfigured',
    });

    const result = await resolver.searchAgentAssets({
      limit: 10,
      projectId: null,
      promptTypes: null,
      query: 'commit',
    });

    expect(result).toEqual({
      chunks: [],
      mode: 'lexical',
      reason: 'embedder_unconfigured',
    });
    expect(embed).toHaveBeenCalledWith(['commit'], 'query');
    expect(searchAgentAssetsLexically).toHaveBeenCalledWith(
      'commit',
      expect.any(Number),
      expect.any(Array),
      null,
    );
    expect(searchAgentAssets).not.toHaveBeenCalled();
  });

  test('defaults to skills/rules/personas when promptTypes omitted', async () => {
    embed.mockResolvedValue(embedded([0.1, 0.2]));
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
      'nomic-embed-text-v1.5',
    );
  });

  test('passes through explicit promptTypes and projectId, clamps limit to 50', async () => {
    embed.mockResolvedValue(embedded([0.1]));
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
      'nomic-embed-text-v1.5',
    );
  });

  test('maps chunks to AgentAssetChunk shape', async () => {
    embed.mockResolvedValue(embedded([0.1]));
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
