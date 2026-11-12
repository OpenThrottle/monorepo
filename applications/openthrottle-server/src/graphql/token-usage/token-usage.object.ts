import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * @description GraphQL ObjectTypes for the user-scoped tokenUsage query: one
 * per-turn row, a summed totals object, and the result envelope (rows + totals).
 * Token/cost fields are Float — GraphQL Int is 32-bit and summed totals overflow.
 */
@ObjectType()
export class TokenUsageRowObject {
  @Field(() => ID, {
    description: `Agent account (login) the turn was billed to, stamped when the row was written. Null when it could not be identified, and for rows written before accounts were recorded.`,
    nullable: true,
  })
  agentAccountId!: string | null;

  @Field(() => Float, {
    description: `Cache-read tokens for the turn, when reported.`,
    nullable: true,
  })
  cacheReadTokens!: number | null;

  @Field(() => Float, {
    description: `Cache-write tokens for the turn, when reported.`,
    nullable: true,
  })
  cacheWriteTokens!: number | null;

  @Field(() => ID, {
    description: `Source conversation id, when the usage came from chat; null otherwise.`,
    nullable: true,
  })
  conversationId!: string | null;

  @Field(() => Float, {
    description: `Dollar cost of the turn: reported by the producer, or an estimate at Anthropic list price for an unpriced Claude request. Null when it cannot be priced.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Date, { description: `Turn completion timestamp.` })
  createdAt!: Date;

  @Field(() => ID, { description: `Usage row id.` })
  id!: string;

  @Field(() => Float, {
    description: `Input/prompt tokens for the turn, when reported.`,
    nullable: true,
  })
  inputTokens!: number | null;

  @Field(() => String, {
    description: `Model the usage is attributed to, when known.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => Float, {
    description: `Output/completion tokens for the turn, when reported.`,
    nullable: true,
  })
  outputTokens!: number | null;

  @Field(() => String, {
    description: `Provider identity (driver id: antigravity|claude|codex|cursor|grok|opencode|openai).`,
  })
  provider!: string;

  @Field(() => Float, {
    description: `Reasoning tokens for the turn, when reported separately.`,
    nullable: true,
  })
  reasoningTokens!: number | null;

  @Field(() => String, {
    description: `Producer of the row: openthrottle-chat (in-app chat) or claude-code (Claude Code hooks). Null for legacy rows written before sources were recorded, which are chat.`,
    nullable: true,
  })
  source!: string | null;

  @Field(() => Float, {
    description: `Total tokens for the turn, when reported.`,
    nullable: true,
  })
  totalTokens!: number | null;
}

@ObjectType()
export class TokenUsageTotalsObject {
  @Field(() => Float, {
    description: `Summed cache-read tokens over the range.`,
  })
  cacheReadTokens!: number;

  @Field(() => Float, {
    description: `Summed cache-write tokens over the range.`,
  })
  cacheWriteTokens!: number;

  @Field(() => Float, { description: `Summed dollar cost over the range.` })
  costUsd!: number;

  @Field(() => Float, { description: `Summed input tokens over the range.` })
  inputTokens!: number;

  @Field(() => Float, { description: `Summed output tokens over the range.` })
  outputTokens!: number;

  @Field(() => Float, {
    description: `Summed reasoning tokens over the range.`,
  })
  reasoningTokens!: number;

  @Field(() => Float, { description: `Summed total tokens over the range.` })
  totalTokens!: number;

  @Field(() => Int, {
    description: `Number of turns (usage rows) contributing to the totals.`,
  })
  turnCount!: number;
}

@ObjectType({
  description: `An agent-CLI login that usage was billed to (a subscription seat or an API key), as the CLI reported it.`,
})
export class TokenUsageAccountObject {
  @Field(() => String, {
    description: `What the account's runs bill: api_key, subscription or unknown. Subscription costs are list-price estimates, not invoiced dollars.`,
  })
  credentialKind!: string;

  @Field(() => String, {
    description: `Login email, when the CLI reports one (codex is identified by account id only).`,
    nullable: true,
  })
  email!: string | null;

  @Field(() => ID, { description: `Agent account id.` })
  id!: string;

  @Field(() => Date, {
    description: `When a usage row was last stamped with this account.`,
  })
  lastSeenAt!: Date;

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

  @Field(() => String, { description: `Driver id the account belongs to.` })
  provider!: string;
}

@ObjectType({
  description: `Usage over the range for one agent account on one provider. A null account is that provider's unattributed bucket.`,
})
export class TokenUsageByAccountObject {
  @Field(() => TokenUsageAccountObject, {
    description: `The account, or null for usage no account was stamped on (rows from before accounts were recorded, and drivers that report no identity).`,
    nullable: true,
  })
  account!: TokenUsageAccountObject | null;

  @Field(() => String, { description: `Provider (driver id) of the bucket.` })
  provider!: string;

  @Field(() => TokenUsageTotalsObject, {
    description: `Summed usage + turn count for the bucket.`,
  })
  totals!: TokenUsageTotalsObject;
}

@ObjectType()
export class TokenUsageResultObject {
  @Field(() => [TokenUsageByAccountObject], {
    description: `The same filtered range summed per agent account and provider, costliest first, with an unattributed bucket per provider.`,
  })
  byAccount!: TokenUsageByAccountObject[];

  @Field(() => [TokenUsageRowObject], {
    description: `Per-turn usage rows in the range, newest first.`,
  })
  items!: TokenUsageRowObject[];

  @Field(() => TokenUsageTotalsObject, {
    description: `Summed usage + turn count over the same filtered range.`,
  })
  totals!: TokenUsageTotalsObject;
}

@ObjectType()
export class RecordTokenUsageResultObject {
  @Field(() => Int, {
    description: `Rows written by this call.`,
  })
  inserted!: number;

  @Field(() => Int, {
    description: `Rows skipped because (source, sessionId, requestId) was already recorded.`,
  })
  skipped!: number;
}
