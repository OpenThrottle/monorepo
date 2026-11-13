import { Field, Float, InputType } from '@nestjs/graphql';

/**
 * @description GraphQL inputs for hook-ingested token usage (recordTokenUsage).
 * Token counts are Float on the wire (GraphQL Int is 32-bit) and validated as
 * non-negative safe integers server-side. The owning user is never an input:
 * it is resolved from the authenticated principal.
 */
@InputType({
  description: `The agent account (login) a hook saw the turn billed to, as the agent CLI reported it. No credential value is ever sent.`,
})
export class RecordTokenUsageAccountInput {
  @Field(() => String, {
    description: `What the turn billed: api_key, subscription or unknown. Any other value is stored as unknown.`,
  })
  credentialKind!: string;

  @Field(() => String, {
    description: `Login email the CLI reported, when it reports one.`,
    nullable: true,
  })
  email!: string | null;

  @Field(() => String, {
    description: `The provider's stable id for the login (for claude, <orgId>:<email>). The grouping key; a blank value leaves the row unattributed.`,
  })
  externalAccountId!: string;

  @Field(() => String, {
    description: `Provider organization or team id, when reported.`,
    nullable: true,
  })
  orgId!: string | null;

  @Field(() => String, {
    description: `Provider organization or team name, when reported.`,
    nullable: true,
  })
  orgName!: string | null;

  @Field(() => String, {
    description: `Subscription plan (for claude: pro, max, team, ...), when reported.`,
    nullable: true,
  })
  plan!: string | null;
}

@InputType()
export class RecordTokenUsageRowInput {
  @Field(() => RecordTokenUsageAccountInput, {
    description: `The agent account the turn was billed to, stamped by the hook at capture time. Null (or absent) leaves the row unattributed. Attribution never rejects a batch: an unusable account is ignored.`,
    nullable: true,
  })
  account!: RecordTokenUsageAccountInput | null;

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
    description: `Dollar cost of the turn when the producer priced it. When null, the server estimates it at Anthropic list price if the request can be priced exactly.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => String, {
    deprecationReason: `Absolute paths leak the home-directory layout and foreign repos now send null (child-repo-hook-telemetry-contract §3). Use repoIdentity.`,
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
    description: `Git remote of the repository the turn ran in. Re-normalized server-side with normalizeRemoteUrl; anything that does not normalize (a filesystem path included) is stored as null. Absent on older senders.`,
    nullable: true,
  })
  repoIdentity?: string | null;

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
