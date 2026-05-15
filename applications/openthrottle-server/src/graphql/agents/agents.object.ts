/**
 * @description GraphQL ObjectTypes for the agents chat surface: a single-turn result with assistant text, optional tool metadata (JSON string), and inline validation errors.
 */

import { Field, ObjectType } from '@nestjs/graphql';

/**
 * @description Outcome of one agents chat turn. When {@link AgentsChatTurnResult.errorMessage} is set, treat the turn as failed; otherwise {@link AgentsChatTurnResult.assistantText} carries the model reply (possibly empty until MCP delegation is implemented).
 */
@ObjectType()
export class AgentsChatTurnResult {
  @Field(() => String, {
    description: `Assistant-visible reply text. Null when the turn failed (see errorMessage).`,
    nullable: true,
  })
  assistantText!: string | null;

  @Field(() => String, {
    description: `Validation or business-rule error for this turn (no throw). Null when the turn succeeded.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `Optional JSON-encoded structured tool metadata from the MCP developer surface (e.g. tool names and arguments). Null when absent.`,
    nullable: true,
  })
  toolMetadataJson!: string | null;
}
