/**
 * @description GraphQL ObjectTypes for agent-CLI discovery: an available agent
 * backend the server can spawn, and a ListResult-style envelope. Backs the
 * discoverAgentClis query (kept separate from discoverLocalModels — an agent is
 * a binary + availability, not endpoints × models).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentCliOptionObject {
  @Field(() => String, {
    description: `Backend discriminator (e.g. "cursor") used in StartConversationStreamInput.`,
  })
  backend!: string;

  @Field(() => Boolean, {
    description: `True when this driver has a wired streaming chat backend and can be offered as a chat composer backend (false for plan-run-only drivers like codex/grok).`,
  })
  chatCapable!: boolean;

  @Field(() => String, {
    description: `Human-readable label for the selector.`,
  })
  label!: string;

  @Field(() => [String], {
    description: `Models this CLI can run (empty when the CLI exposes no machine-listable models or listing failed).`,
  })
  models!: string[];

  @Field(() => Boolean, {
    description: `True when this driver can be pointed at a custom OpenAI-compatible base URL (a discovered local endpoint); gates driver×endpoint targeting in the composer. False for claude/cursor (own cloud wire protocol).`,
  })
  supportsCustomBaseUrl!: boolean;

  @Field(() => String, {
    description: `Trimmed --version output, or null when unknown.`,
    nullable: true,
  })
  version!: string | null;
}

@ObjectType()
export class DiscoverAgentClisResult {
  @Field(() => [AgentCliOptionObject], {
    description: `Allowlisted agent CLIs detected as available on the server host.`,
  })
  agents!: AgentCliOptionObject[];

  @Field(() => String, {
    description: `ISO-8601 timestamp of when this snapshot was scanned.`,
  })
  scannedAt!: string;

  @Field(() => Int, { description: `Number of available agent CLIs.` })
  totalCount!: number;
}
