/**
 * @description GraphQL input types for agents chat mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

/**
 * @description User message and optional client thread id for one server-side agents chat turn.
 */
@InputType()
export class AgentsRunChatTurnInput {
  @Field(() => String, {
    description: `Opaque client thread id echoed on AgentsChatTurnResult.conversationId for correlation; omit for stateless turns.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => String, {
    description: `User message text for this turn.`,
  })
  message!: string;
}
