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

  @Field(() => String, {
    description: `Human-readable label for the selector.`,
  })
  label!: string;

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
