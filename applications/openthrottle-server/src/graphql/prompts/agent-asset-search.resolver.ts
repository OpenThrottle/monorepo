/**
 * @description GraphQL resolver for semantic search over agent-asset (custom_prompt) embeddings.
 * Accepts a text query, optional prompt-type filter, project scope, and limit; returns ranked,
 * de-duped agent-asset matches (skills, rules, personas, …). Requires Cortex Postgres and embedding
 * (OPENAI_API_KEY or Ollama). When embedding is unavailable the result is empty; consumers may fall
 * back to a live disk scan.
 */

import {
  embedQuery,
  searchAgentAssets as runAgentAssetSearch,
} from '@openthrottle/ai-mcp/src/cortex-server';
import type { AgentAssetSearchChunk } from '@openthrottle/ai-mcp/src/cortex-server';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AgentAssetSearchInput } from './agent-asset-search.input';
import {
  AgentAssetChunk,
  AgentAssetSearchResult,
} from './agent-asset-search.object';
import { CustomPromptTypeEnum } from './custom-prompt.object';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const DEFAULT_PROMPT_TYPES: readonly CustomPromptTypeEnum[] = [
  CustomPromptTypeEnum.SKILLS,
  CustomPromptTypeEnum.RULES,
  CustomPromptTypeEnum.PERSONAS,
];

/** Maps a stored prompt_type string back to the enum without an `as` cast. */
const PROMPT_TYPE_BY_VALUE: Record<string, CustomPromptTypeEnum> =
  Object.fromEntries(
    Object.values(CustomPromptTypeEnum).map((value) => [value, value]),
  );

function mapChunk(chunk: AgentAssetSearchChunk): AgentAssetChunk {
  const obj = new AgentAssetChunk();

  obj.content = chunk.content;
  obj.customPromptId = chunk.customPromptId;
  obj.description = chunk.description;
  obj.filePath = chunk.filePath;
  obj.id = chunk.id;
  obj.labels = [...chunk.labels];
  obj.projectId = chunk.projectId;
  obj.promptType =
    PROMPT_TYPE_BY_VALUE[chunk.promptType] ?? CustomPromptTypeEnum.SKILLS;
  obj.similarity = chunk.similarity;
  obj.title = chunk.title;

  return obj;
}

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver()
export class AgentAssetSearchResolver {
  @Query(() => AgentAssetSearchResult, {
    description: `Semantic search over agent-asset (custom_prompt) embeddings. Embeds the query and returns ranked, de-duped assets (skills, rules, personas by default). Requires Cortex Postgres and embedding (OPENAI_API_KEY or Ollama).`,
  })
  async searchAgentAssets(
    @Args('input', { type: () => AgentAssetSearchInput })
    input: AgentAssetSearchInput,
  ): Promise<AgentAssetSearchResult> {
    const limit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const query = input.query?.trim() ?? '';
    if (!query) {
      return { chunks: [] };
    }

    const embedding = await embedQuery(query);
    if (!embedding || embedding.length === 0) {
      return { chunks: [] };
    }

    const promptTypes =
      input.promptTypes && input.promptTypes.length > 0
        ? input.promptTypes
        : [...DEFAULT_PROMPT_TYPES];

    const chunks = await runAgentAssetSearch(
      embedding,
      limit,
      promptTypes,
      input.projectId ?? null,
    );

    const result = new AgentAssetSearchResult();

    result.chunks = chunks.map(mapChunk);

    return result;
  }
}
