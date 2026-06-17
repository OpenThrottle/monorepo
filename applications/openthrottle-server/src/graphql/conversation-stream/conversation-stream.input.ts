/**
 * @description GraphQL input for starting a streamed conversation turn. The
 * baseUrl + modelId are validated server-side against discoverLocalModels so a
 * client cannot point the server at an arbitrary URL (SSRF guard).
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class StartConversationStreamInput {
  @Field(() => String, {
    description: `OpenAI-compatible base URL of a discovered local endpoint, e.g. http://localhost:11434/v1.`,
  })
  baseUrl!: string;

  @Field(() => ID, {
    description: `Existing conversation to continue; omit to start a new conversation.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => String, {
    description: `User message text for this turn.`,
  })
  message!: string;

  @Field(() => String, {
    description: `Model id to complete with, as advertised by the discovered endpoint.`,
  })
  modelId!: string;
}
