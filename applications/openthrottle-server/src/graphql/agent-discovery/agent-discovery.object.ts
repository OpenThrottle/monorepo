/**
 * @description GraphQL ObjectTypes for agent-CLI discovery: an available agent
 * backend the server can spawn, and a ListResult-style envelope. Backs the
 * discoverAgentClis query (kept separate from discoverLocalModels — an agent is
 * a binary + availability, not endpoints × models).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentCliModelOption {
  @Field(() => String, {
    description: `Opaque driver-supplied model id as returned by discoverAgentClis (e.g. "gpt-5.2").`,
  })
  model!: string;

  @Field(() => Boolean, {
    description: `Effective per-user enablement of this model: false when the user disabled this model OR disabled the whole agent (an agent-level OFF hard-overrides every model). Disabled models are hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request.`,
  })
  enabled!: boolean;

  @Field(() => Boolean, {
    description: `Whether the current user has favorited this model. Favorites float to the top of / are highlighted in chat/model pickers and run selection; favoriting is orthogonal to enablement. Defaults to false for an unauthenticated request.`,
  })
  favorite!: boolean;
}

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

  @Field(() => Boolean, {
    description: `Per-user enablement: true unless the current user has disabled this agent on /settings/agents. A disabled agent is hidden from chat/model pickers and rejected when starting new runs. Defaults to true for an unauthenticated request.`,
  })
  enabled!: boolean;

  @Field(() => String, {
    description: `Human-readable label for the selector.`,
  })
  label!: string;

  @Field(() => [String], {
    deprecationReason: `Use modelOptions, which carries per-user enabled + favorite state per model.`,
    description: `Models this CLI can run (empty when the CLI exposes no machine-listable models or listing failed). Returns ALL discovered model ids, unfiltered by per-user preferences.`,
  })
  models!: string[];

  @Field(() => [AgentCliModelOption], {
    description: `Models this CLI can run, each with the current user's per-model enabled + favorite state overlaid. Empty when the CLI exposes no machine-listable models. Prefer this over the deprecated \`models\` list.`,
  })
  modelOptions!: AgentCliModelOption[];

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
