/**
 * @description GraphQL ObjectTypes for the agents chat surface: a single-turn result with assistant text, routed MCP tool identity, optional structured payload JSON, full tool metadata JSON, and inline validation errors.
 */

import { Field, Float, ObjectType } from '@nestjs/graphql';

/**
 * @description Outcome of one agents chat turn. When {@link AgentsChatTurnResult.errorMessage} is set, treat the turn as failed; otherwise {@link AgentsChatTurnResult.assistantText} carries MCP-facing text from the routed tool. {@link AgentsChatTurnResult.mcpTool} and {@link AgentsChatTurnResult.structuredPayloadJson} summarize the invocation; {@link AgentsChatTurnResult.toolMetadataJson} carries the full routing + args envelope.
 */
@ObjectType()
export class AgentsChatTurnResult {
  @Field(() => String, {
    description: `Assistant-visible reply text. Null when the turn failed (see errorMessage).`,
    nullable: true,
  })
  assistantText!: string | null;

  @Field(() => String, {
    description: `Echo of the client conversation id from the request input when provided; null when omitted.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => String, {
    description: `Validation or business-rule error for this turn (no throw). Null when the turn succeeded.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `MCP developer tool name selected for this turn (e.g. semantic_search, health). Null when the turn failed before routing (e.g. empty message).`,
    nullable: true,
  })
  mcpTool!: string | null;

  @Field(() => Boolean, {
    description: `True when routed write tools are not permitted unless AGENTS_CHAT_ALLOW_MUTATIONS is enabled on the server (default read-only policy).`,
  })
  readOnlyAgentsChat!: boolean;

  @Field(() => Float, {
    description: `Router confidence in [0, 1] for the selected tool; null when the turn failed before routing.`,
    nullable: true,
  })
  routingConfidence!: number | null;

  @Field(() => String, {
    description: `Router reason label (e.g. heuristic name or llm_fallback:…); null when the turn failed before routing.`,
    nullable: true,
  })
  routingReason!: string | null;

  @Field(() => String, {
    description: `JSON-encoded MCP structuredContent from the tool result when present on a successful tool call; null otherwise.`,
    nullable: true,
  })
  structuredPayloadJson!: string | null;

  @Field(() => String, {
    description: `JSON-encoded tool envelope: tool name, arguments, optional confidence and routeReason, optional structuredContent, and isError when the MCP tool reported failure.`,
    nullable: true,
  })
  toolMetadataJson!: string | null;
}
