/**
 * @description GraphQL ObjectTypes for agent-asset semantic search: AgentAssetSearchResult wrapper
 * and AgentAssetChunk (custom_prompt match with display metadata and similarity).
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

import type { SearchMode } from '../search/search.types.ts';
import type { CustomPromptTypeValue } from './custom-prompt.object.ts';
import { CUSTOM_PROMPT_TYPE } from './custom-prompt.object.ts';

@ObjectType({
  description: `A ranked agent-asset match from semantic search over custom_prompt embeddings.`,
})
export class AgentAssetChunk {
  @Field(() => String, {
    description: 'Embedding chunk UUID (custom_prompt_embeddings id).',
  })
  id!: string;

  @Field(() => String, { description: 'Parent custom_prompt UUID.' })
  customPromptId!: string;

  @Field(() => String, { description: 'Asset title.' })
  title!: string;

  @Field(() => CUSTOM_PROMPT_TYPE, {
    description: 'Prompt type (skills, rules, personas, …).',
  })
  promptType!: CustomPromptTypeValue;

  @Field(() => String, {
    description: 'Repo-relative file path on disk (SSOT), if known.',
    nullable: true,
  })
  filePath!: string | null;

  @Field(() => String, {
    description: 'Owning project id, if scoped.',
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: 'Asset description / summary.',
    nullable: true,
  })
  description!: string | null;

  @Field(() => [String], { description: 'Asset labels.' })
  labels!: string[];

  @Field(() => String, { description: 'Matched embedding chunk content.' })
  content!: string;

  @Field(() => Float, {
    description: 'Cosine similarity (0–1, higher is more relevant).',
  })
  similarity!: number;
}

@ObjectType({ description: 'Result wrapper for agent-asset semantic search.' })
export class AgentAssetSearchResult {
  @Field(() => [AgentAssetChunk], {
    description: 'Ranked agent-asset matches by similarity.',
  })
  chunks!: AgentAssetChunk[];

  @Field(() => String, {
    description: `How the result was ranked: "semantic" (vector similarity with the configured embedding model) or "lexical" (Postgres full-text search, used when semantic search is unavailable).`,
  })
  mode!: SearchMode;

  @Field(() => String, {
    description: `Why the result is lexical, or null when it is semantic: embedder_unconfigured | embedder_dimension_mismatch | embedder_provider_error | embedder_busy | no_embeddings.`,
    nullable: true,
  })
  reason!: string | null;
}
