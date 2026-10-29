import { Field, Float, InputType } from '@nestjs/graphql';

/**
 * @description GraphQL inputs for hook-ingested token usage (recordTokenUsage).
 * Token counts are Float on the wire (GraphQL Int is 32-bit) and validated as
 * non-negative safe integers server-side. The owning user is never an input:
 * it is resolved from the authenticated principal.
 */
@InputType()
export class RecordTokenUsageRowInput {
  @Field(() => Float, {
    description: `Cache-read tokens for the turn, when reported.`,
    nullable: true,
  })
  cacheReadTokens!: number | null;

  @Field(() => Float, {
    description: `Cache-creation (cache-write) tokens for the turn, when reported.`,
    nullable: true,
  })
  cacheWriteTokens!: number | null;

  @Field(() => Float, {
    description: `Dollar cost of the turn when the producer priced it; null when unknown.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => String, {
    description: `Working directory the harness reported.`,
    nullable: true,
  })
  cwd!: string | null;

  @Field(() => String, {
    description: `Git branch the harness reported.`,
    nullable: true,
  })
  gitBranch!: string | null;

  @Field(() => Float, {
    description: `Input/prompt tokens for the turn, when reported.`,
    nullable: true,
  })
  inputTokens!: number | null;

  @Field(() => String, {
    description: `Model the usage is attributed to. Must not be blank.`,
  })
  model!: string;

  // ISO-8601 String rather than DateTime: the zod codegen types a DateTime
  // nested inside a list input as optional `any`, which fails the strictest
  // consumers' typecheck. The resolver validates it as a date instead.
  @Field(() => String, {
    description: `When the turn happened, as an ISO-8601 timestamp (the transcript timestamp). Stored as created_at, so a late JSONL drain lands on the day the turn actually ran.`,
  })
  occurredAt!: string;

  @Field(() => Float, {
    description: `Output/completion tokens for the turn, when reported.`,
    nullable: true,
  })
  outputTokens!: number | null;

  @Field(() => String, {
    description: `Provider identity (for example claude). Must not be blank.`,
  })
  provider!: string;

  @Field(() => String, {
    description: `The raw provider usage payload, JSON-serialized (repo convention: no JSON scalar). Must parse to a JSON object; null to omit.`,
    nullable: true,
  })
  rawUsageJson!: string | null;

  @Field(() => Float, {
    description: `Reasoning tokens for the turn, when reported separately.`,
    nullable: true,
  })
  reasoningTokens!: number | null;

  @Field(() => String, {
    description: `Provider API request id. With source and sessionId it is the idempotency key: a re-sent row is skipped. A row without one is never deduplicated.`,
    nullable: true,
  })
  requestId!: string | null;

  @Field(() => String, {
    description: `The agent harness's own session id.`,
    nullable: true,
  })
  sessionId!: string | null;

  @Field(() => String, {
    description: `Producer id of the capturing tool (for example claude-code). Free text; must not be blank.`,
  })
  source!: string;

  @Field(() => Float, {
    description: `Total tokens for the turn, when reported.`,
    nullable: true,
  })
  totalTokens!: number | null;
}

@InputType()
export class RecordTokenUsageInput {
  @Field(() => [RecordTokenUsageRowInput], {
    description: `Usage rows to ingest, at most 500 per call. The whole batch is rejected (BAD_REQUEST, naming the row index) if any row is invalid.`,
  })
  rows!: RecordTokenUsageRowInput[];
}
