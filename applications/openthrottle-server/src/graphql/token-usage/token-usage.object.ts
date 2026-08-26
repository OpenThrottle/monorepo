import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * @description GraphQL ObjectTypes for the user-scoped tokenUsage query: one
 * per-turn row, a summed totals object, and the result envelope (rows + totals).
 * Token/cost fields are Float — GraphQL Int is 32-bit and summed totals overflow.
 */
@ObjectType()
export class TokenUsageRowObject {
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
    description: `Reported dollar cost of the turn, when priced.`,
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
    description: `Provider identity (driver id: claude|codex|cursor|gemini|grok|opencode|openai).`,
  })
  provider!: string;

  @Field(() => Float, {
    description: `Reasoning tokens for the turn, when reported separately.`,
    nullable: true,
  })
  reasoningTokens!: number | null;

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

@ObjectType()
export class TokenUsageResultObject {
  @Field(() => [TokenUsageRowObject], {
    description: `Per-turn usage rows in the range, newest first.`,
  })
  items!: TokenUsageRowObject[];

  @Field(() => TokenUsageTotalsObject, {
    description: `Summed usage + turn count over the same filtered range.`,
  })
  totals!: TokenUsageTotalsObject;
}
