/**
 * @description GraphQL ObjectTypes for the work ledger. Mirror the work_sessions / work_session_subjects
 * / work_artifacts entities from @openthrottle/nestjs-repositories. JSONB payload is exposed as a
 * JSON-serialized String (payloadJson), per the repo convention (no GraphQLJSON scalar).
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WorkSessionObject {
  @Field(() => String, { nullable: true })
  actorServiceAccountId!: string | null;

  @Field(() => String, { nullable: true })
  actorUserId!: string | null;

  @Field(() => String, {
    description: `How the session closed: explicit (after real work) | instant (no span) | sweeper (abandoned past TTL); null while open`,
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

/**
 * @description A plan the ledger knows has git work, and whether that work is *truthfully*
 * recorded. See WorkLedgerCompletenessResult for what "truthfully" means here.
 */
@ObjectType()
export class WorkLedgerPlanCompletenessObject {
  @Field(() => Int, {
    description: `git_commit artifacts linked to this plan, truthful or not`,
  })
  artifactCount!: number;

  @Field(() => ID)
  planId!: string;

  @Field(() => String)
  planStatus!: string;

  @Field(() => String)
  planTitle!: string;

  @Field(() => Boolean, {
    description: `True when at least one linked git_commit carries a verifier-confirmed landedSha`,
  })
  recorded!: boolean;
}

/**
 * @description Ledger completeness under the **strict** definition: a plan counts as recorded only
 * when it has a git_commit artifact the verifier confirmed reachable on the repo's default branch,
 * evidenced by a stored `payload.landedSha`.
 *
 * The loose definition — "has any git_commit artifact" — is what makes this worth a query. It reads
 * near-complete while being almost entirely wrong, because the legacy backfill stamped ~1k rows
 * `verified` + `landed` without checking and not one of their shas is on the default branch. Those
 * rows have no `landedSha`, which is exactly what separates them from the truthful ones.
 *
 * **Denominator caveat.** `totalCount` counts plans the ledger *already knows* have git work, i.e.
 * plans with at least one linked git_commit artifact. A plan whose commits landed on the default
 * branch but which was never recorded at all is invisible here until the trailer harvest adopts it.
 * So this reports completeness of what the ledger has seen; the harvest is what makes the
 * denominator match reality.
 */
@ObjectType()
export class WorkLedgerCompletenessResult {
  @Field(() => [WorkLedgerPlanCompletenessObject], {
    description: `Plans with git work but no verifier-confirmed commit; worst-known first`,
  })
  owed!: WorkLedgerPlanCompletenessObject[];

  @Field(() => Int, { description: `Plans with git work and nothing truthful` })
  owedCount!: number;

  @Field(() => Int, {
    description: `Plans with at least one verifier-confirmed landed commit`,
  })
  recordedCount!: number;

  @Field(() => Int, {
    description: `Plans the ledger knows have git work (see the denominator caveat)`,
  })
  totalCount!: number;
}
