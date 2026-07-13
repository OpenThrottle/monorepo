/**
 * @description GraphQL ObjectTypes for the work ledger. Mirror the work_sessions / work_session_subjects
 * / work_artifacts entities from @openthrottle/nestjs-repositories. JSONB payload is exposed as a
 * JSON-serialized String (payloadJson), per the repo convention (no GraphQLJSON scalar).
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WorkSessionObject {
  @Field(() => String, { nullable: true })
  actorServiceAccountId!: string | null;

  @Field(() => String, { nullable: true })
  actorUserId!: string | null;

  @Field(() => String, {
    description: `How the session closed: explicit | sweeper; null while open`,
    nullable: true,
  })
  closedBy!: string | null;

  @Field(() => String, { nullable: true })
  conversationId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  endedAt!: Date | null;

  @Field(() => String, { nullable: true })
  externalRef!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  model!: string | null;

  @Field(() => String, { nullable: true })
  onBehalfOfUserId!: string | null;

  @Field(() => Boolean)
  onBehalfOfVerified!: boolean;

  @Field(() => String, { nullable: true })
  planRunId!: string | null;

  @Field(() => Date)
  startedAt!: Date;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  toolName!: string;

  @Field(() => String, { nullable: true })
  toolVersion!: string | null;
}

@ObjectType()
export class WorkSessionSubjectObject {
  @Field(() => Date)
  attachedAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  sessionId!: string;

  @Field(() => String, { nullable: true })
  taskId!: string | null;
}

@ObjectType()
export class WorkArtifactObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  externalKey!: string;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  lifecycle!: string | null;

  @Field(() => String, { nullable: true })
  message!: string | null;

  @Field(() => String, {
    description: `JSON-serialized per-type payload (parse client-side)`,
  })
  payloadJson!: string;

  @Field(() => Date)
  producedAt!: Date;

  @Field(() => String)
  sessionId!: string;

  @Field(() => String)
  source!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String, {
    description: `Claims-vs-facts state: unverified | verified | orphaned`,
  })
  verification!: string;

  @Field(() => Date, { nullable: true })
  verifiedAt!: Date | null;
}

/** @description ListResult-style envelope for work sessions. */
@ObjectType()
export class WorkSessionListResult {
  @Field(() => [WorkSessionObject])
  sessions!: WorkSessionObject[];

  @Field(() => Int)
  totalCount!: number;
}

/** @description ListResult-style envelope for work artifacts. */
@ObjectType()
export class WorkArtifactListResult {
  @Field(() => [WorkArtifactObject])
  artifacts!: WorkArtifactObject[];

  @Field(() => Int)
  totalCount!: number;
}
