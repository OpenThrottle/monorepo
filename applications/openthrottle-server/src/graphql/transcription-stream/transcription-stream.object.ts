/**
 * @description GraphQL ObjectTypes for the streaming transcription surface: the
 * snapshot chunk emitted over the subscription, and the start-session mutation
 * result. The chunk fields mirror {@link TranscriptionStreamChunkPayload} so a
 * published payload resolves directly against this type.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TranscriptionStreamChunkObject {
  @Field(() => Boolean, {
    description: `True exactly once, on the terminal chunk (stop, idle reap, or hard cap).`,
  })
  done!: boolean;

  @Field(() => String, {
    description: `Error message when the session failed or was reaped; null otherwise.`,
    nullable: true,
  })
  error!: string | null;

  @Field(() => String)
  sessionId!: string;

  @Field(() => Int, {
    description: `Monotonic index within the stream; clients replace state with the highest-sortOrder snapshot.`,
  })
  sortOrder!: number;

  @Field(() => String, {
    description: `Full transcript so far (snapshot-replace: completed segments plus the current revising tail — never a delta).`,
  })
  transcript!: string;
}

/**
 * @description Result of {@link startTranscriptionStream}. On success sessionId is
 * set and errorMessage is null; on an expected failure (transcription not
 * configured, service unreachable) errorMessage is set and sessionId is null.
 */
@ObjectType()
export class StartTranscriptionStreamResult {
  @Field(() => String, {
    description: `Validation or availability error (no throw). Null on success.`,
    nullable: true,
  })
  errorMessage!: string | null;

  @Field(() => String, {
    description: `Minted transcription session id to send audio chunks to and subscribe on. Null when the request failed.`,
    nullable: true,
  })
  sessionId!: string | null;
}
