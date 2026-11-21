/**
 * @description GraphQL resolver for semantic search over agent-asset (custom_prompt) embeddings.
 * Accepts a text query, optional prompt-type filter, project scope, and limit; returns ranked,
 * de-duped agent-asset matches (skills, rules, personas, …). When the embedder is unavailable the
 * result is a Postgres full-text answer (`mode: 'lexical'` plus a `reason`) rather than empty.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import type { AgentAssetSearchChunk } from '@openthrottle/node-client';
import {
  searchAgentAssets as runAgentAssetSearch,
  searchAgentAssetsLexically,
} from '@openthrottle/node-client';

import { EffectiveUserResolutionService } from '../../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { EmbedderService } from '../../../services/embedder/embedder.service.ts';
import { searchWithFallback } from '../../search/search.utils.ts';
import { AgentAssetSearchInput } from '../agent-asset-search.input.ts';
import {
  AgentAssetChunk,
  AgentAssetSearchResult,
} from '../agent-asset-search.object.ts';
import { CustomPromptTypeEnum } from '../custom-prompt.object.ts';

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
// Results are scoped to the caller's own prompts plus system prompts (`user_id IS NULL`).
@Resolver()
export class AgentAssetSearchResolver {
  constructor(
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly embedder: EmbedderService,
  ) {}

  @Query(() => AgentAssetSearchResult, {
    description: `Semantic search over agent-asset (custom_prompt) embeddings. Embeds the query and returns ranked, de-duped assets (skills, rules, personas by default) using the server embedder (local nomic-embed-text-v1.5 by default); when it is unavailable or nothing is embedded yet, answers with Postgres full-text search instead — see mode and reason.`,
  })
  async searchAgentAssets(
    @Args('input', { type: () => AgentAssetSearchInput })
    input: AgentAssetSearchInput,
    @CurrentUser('sub') sub?: string,
  ): Promise<AgentAssetSearchResult> {
    const limit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const query = input.query?.trim() ?? '';
    if (!query) {
      return { chunks: [], mode: 'semantic', reason: null };
    }

    let promptTypes = [...DEFAULT_PROMPT_TYPES];
    if (input.promptTypes && input.promptTypes.length > 0) {
      promptTypes = input.promptTypes;
    }

    const projectId = input.projectId ?? null;
    // Only the caller's own prompts plus system prompts are searchable. A service
    // account resolves to the user it acts as; one with no user sees system rows only.
    const viewerUserId =
      await this.effectiveUserResolutionService.resolveEffectiveUserId(sub);
    const found = await searchWithFallback({
      embed: () => {
        return this.embedder.embed([query], 'query');
      },
      lexical: () => {
        return searchAgentAssetsLexically(
          query,
          limit,
          promptTypes,
          projectId,
          viewerUserId,
        );
      },
      semantic: (vector, model) => {
        return runAgentAssetSearch(
          vector,
          limit,
          promptTypes,
          projectId,
          model,
          viewerUserId,
        );
      },
    });
    const result = new AgentAssetSearchResult();

    result.chunks = found.chunks.map(mapChunk);
    result.mode = found.mode;
    result.reason = found.reason;

    return result;
  }
}
