/**
 * @description GraphQL ObjectTypes for the conversation streaming surface: the
 * per-token chunk emitted over the subscription, and the start-stream mutation
 * result. The chunk fields mirror {@link ConversationStreamChunkPayload} so a
 * published payload resolves directly against this type.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ConversationStreamChunkObject {
  @Field(() => String)
  conversationId!: string;

  @Field(() => String, {
    description: `Incremental assistant text for this chunk (empty on the terminal chunk).`,
  })
  delta!: string;

  @Field(() => Boolean, {
    description: `True exactly once, on the terminal chunk of the stream.`,
  })
  done!: boolean;

  @Field(() => String, {
    description: `Error message when the stream failed; null otherwise.`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => String, {
    description: `Unique id for this chunk (subscription dedupe / cursor).`,
  })
  id!: string;

  @Field(() => String, {
    description: `Assistant message id the deltas accumulate into.`,
  })
  messageId!: string;

  @Field(() => Int, {
    description: `Monotonic index within the stream.`,
  })
  sortOrder!: number;
}

/**
 * @description Result of {@link startConversationStream}. On success the ids are
 * set and {@link StartConversationStreamResult.errorMessage} is null; on an
 * expected validation failure errorMessage is set and the ids are null.
 */
@ObjectType()
export class StartConversationStreamResult {
  @Field(() => String, {
    description: `Pre-allocated assistant message id the streamed deltas accumulate into. Null when the request failed.`,
    nullable: true,
  })
  assistantMessageId!: string | null;

  @Field(() => String, {
    description: `Resolved (or newly created) conversation id. Null when the request failed.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => String, {
    description: `Validation or business-rule error (no throw). Null on success.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `Persisted user message id for this turn. Null when the request failed.`,
    nullable: true,
  })
  userMessageId!: string | null;
}
