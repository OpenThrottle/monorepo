/**
 * @description GraphQL inputs for webhook-trigger mutations. Create and update share the same
 * configuration fields; neither can set the token or the secret (the server mints them).
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ScheduledAgentJobWebhookFilterInputType {
  @Field(() => String, {
    description: `equals | not_equals | in | exists | not_exists | prefix. There is no regex op, by design.`,
  })
  op!: string;

  @Field(() => String, {
    description: `Dot path into the parsed payload, or header:<name> for an allow-listed header (e.g. header:x-github-event).`,
  })
  path!: string;

  @Field(() => String, {
    description: `Value for equals, not_equals and prefix.`,
    nullable: true,
  })
  value?: string;

  @Field(() => [String], {
    description: `Values for in (1 to 32).`,
    nullable: true,
  })
  values?: string[];
}

@InputType()
export class CreateScheduledAgentJobWebhookTriggerInputType {
  @Field(() => ID)
  scheduledAgentJobId!: string;

  @Field(() => String, {
    description: `generic (default) | github | custom. generic and github fix their own headers; custom uses the ones given here.`,
    nullable: true,
  })
  signaturePreset?: string;

  @Field(() => String, {
    description: `custom only: the header carrying the signature.`,
    nullable: true,
  })
  signatureHeader?: string;

  @Field(() => String, {
    description: `custom only: hex (default) | base64.`,
    nullable: true,
  })
  signatureEncoding?: string;

  @Field(() => String, {
    description: `custom only: the header carrying a signed unix-seconds timestamp; omit for none.`,
    nullable: true,
  })
  timestampHeader?: string;

  @Field(() => String, {
    description: `custom only: the header carrying the sender's delivery id; omit to dedupe on the body hash.`,
    nullable: true,
  })
  deliveryIdHeader?: string;

  @Field(() => Int, {
    description: `Replay window in seconds, 30 to 900 (default 300).`,
    nullable: true,
  })
  timestampToleranceSeconds?: number;

  @Field(() => [ScheduledAgentJobWebhookFilterInputType], {
    description: `At most 16 filters, all of which must match.`,
    nullable: true,
  })
  filters?: ScheduledAgentJobWebhookFilterInputType[];

  @Field(() => Int, {
    description: `Leading-edge coalesce window in ms, 0 to 3600000 (default 0 = off).`,
    nullable: true,
  })
  coalesceWindowMs?: number;

  @Field(() => Int, {
    description: `Most accepted deliveries per minute, 1 to 120 (default 30).`,
    nullable: true,
  })
  rateLimitPerMinute?: number;

  @Field(() => Int, {
    description: `Most webhook-triggered runs in flight, 1 to 10 (default 3).`,
    nullable: true,
  })
  maxInFlight?: number;

  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;
}

@InputType({
  description: `Config-only update: every field is optional and an omitted field keeps its value. The token and secret are untouched (use rotate).`,
})
export class UpdateScheduledAgentJobWebhookTriggerInputType extends CreateScheduledAgentJobWebhookTriggerInputType {}
