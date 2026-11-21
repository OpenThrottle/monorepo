/**
 * @description GraphQL ObjectTypes for a scheduled agent job's webhook trigger and its delivery
 * log. The token and the HMAC secret are NEVER fields of the trigger: only `tokenPrefix` is. The
 * full URL path and the secret exist solely on {@link ScheduledAgentJobWebhookTriggerCredentialsObject},
 * returned once by create and rotate.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `One payload filter of a webhook trigger. \`value\` is set for equals, not_equals and prefix; \`values\` for in; neither for exists and not_exists.`,
})
export class ScheduledAgentJobWebhookFilterObject {
  @Field(() => String, {
    description: `equals | not_equals | in | exists | not_exists | prefix.`,
  })
  op!: string;

  @Field(() => String, {
    description: `Dot path into the parsed payload (pull_request.base.ref), or header:<name> for an allow-listed header.`,
  })
  path!: string;

  @Field(() => String, { nullable: true })
  value!: string | null;

  @Field(() => [String], { nullable: true })
  values!: string[] | null;
}

@ObjectType({
  description: `The webhook trigger of a scheduled agent job. Never carries the URL token or the HMAC secret.`,
})
export class ScheduledAgentJobWebhookTriggerObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  scheduledAgentJobId!: string;

  @Field(() => String, {
    description: `First 6 characters of the URL token, to tell tokens apart. The token itself is shown once, on create and rotate.`,
  })
  tokenPrefix!: string;

  @Field(() => String, { description: `generic | github | custom.` })
  signaturePreset!: string;

  @Field(() => String, {
    description: `Request header carrying the HMAC signature.`,
  })
  signatureHeader!: string;

  @Field(() => String, { description: `hex | base64.` })
  signatureEncoding!: string;

  @Field(() => String, {
    description: `Header carrying the signed unix-seconds timestamp; null when the preset has none (github).`,
    nullable: true,
  })
  timestampHeader!: string | null;

  @Field(() => Int, {
    description: `Replay window: a delivery is rejected unless |now - timestamp| is within this many seconds (30 to 900).`,
  })
  timestampToleranceSeconds!: number;

  @Field(() => String, {
    description: `Header carrying the sender's delivery id (the dedupe key); null dedupes on the body hash.`,
    nullable: true,
  })
  deliveryIdHeader!: string | null;

  @Field(() => [ScheduledAgentJobWebhookFilterObject], {
    description: `At most 16 filters, all of which must match.`,
  })
  filters!: ScheduledAgentJobWebhookFilterObject[];

  @Field(() => Int, {
    description: `Leading-edge coalesce window in ms (0 = off, max 3600000).`,
  })
  coalesceWindowMs!: number;

  @Field(() => Int, {
    description: `Most accepted deliveries per trailing minute (1 to 120).`,
  })
  rateLimitPerMinute!: number;

  @Field(() => Int, {
    description: `Most webhook-triggered runs queued or running at once (1 to 10).`,
  })
  maxInFlight!: number;

  @Field(() => Boolean, {
    description: `Gates ingress only; the job's own enabled flag gates its schedule.`,
  })
  enabled!: boolean;

  @Field(() => Date, { nullable: true })
  rotatedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `What create and rotate return: the trigger plus the URL path and HMAC secret, shown ONCE. They are not stored in recoverable form (the token is hashed, the secret encrypted) and no query returns them again.`,
})
export class ScheduledAgentJobWebhookTriggerCredentialsObject {
  @Field(() => ScheduledAgentJobWebhookTriggerObject)
  trigger!: ScheduledAgentJobWebhookTriggerObject;

  @Field(() => String, {
    description: `The ingress path including the token, /webhooks/agent-jobs/<token>. Prepend the server origin.`,
  })
  webhookPath!: string;

  @Field(() => String, {
    description: `The HMAC-SHA256 secret the sender signs with (the string itself is the key).`,
  })
  secret!: string;
}

@ObjectType({
  description: `One request that matched a webhook trigger, accepted or rejected. Raw bodies are never stored.`,
})
export class ScheduledAgentJobWebhookDeliveryObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  triggerId!: string;

  @Field(() => ID)
  scheduledAgentJobId!: string;

  @Field(() => ID, {
    description: `The run this delivery started (accepted) or was folded into (coalesced).`,
    nullable: true,
  })
  runId!: string | null;

  @Field(() => String, {
    description: `accepted | deduplicated | filtered | coalesced | rejected | rate_limited | queue_full.`,
  })
  status!: string;

  @Field(() => String, {
    description: `For a rejected delivery: bad_signature | stale_timestamp | missing_timestamp | invalid_json | unsupported_media_type | payload_too_large.`,
    nullable: true,
  })
  rejectReason!: string | null;

  @Field(() => Int, {
    description: `The HTTP status the sender was answered with.`,
  })
  httpStatus!: number;

  @Field(() => String, { nullable: true })
  dedupeKey!: string | null;

  @Field(() => Int)
  bodyBytes!: number;

  @Field(() => String)
  bodySha256!: string;

  @Field(() => String, {
    description: `JSON-serialized allow-listed request headers (never the signature).`,
  })
  headersJson!: string;

  @Field(() => String, {
    description: `The exact prompt the run started with; null when none was rendered.`,
    nullable: true,
  })
  renderedPrompt!: string | null;

  @Field(() => Int, {
    description: `Zero-based index of the filter that excluded a filtered delivery.`,
    nullable: true,
  })
  filterIndex!: number | null;

  @Field(() => Date)
  receivedAt!: Date;
}
