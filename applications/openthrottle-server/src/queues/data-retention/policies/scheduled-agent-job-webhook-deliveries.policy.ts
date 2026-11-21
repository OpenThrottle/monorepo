/**
 * @description Retention policy for `scheduled_agent_job_webhook_deliveries` — the log of every
 * webhook request that matched a trigger.
 *
 * Seven days, and the window is load-bearing: the partial unique index on
 * (trigger_id, dedupe_key) over accepted and coalesced rows IS the 7-day replay defence, so
 * deleting a row is what lets its delivery id be accepted again. Do not shorten it without
 * revisiting docs/openthrottle/webhook-triggered-agent-jobs.md (Dedupe). Nothing references a
 * delivery row, so a plain age delete is safe.
 */

import { createAgeRetentionPolicy } from './policies.utils.ts';

export const scheduledAgentJobWebhookDeliveriesPolicy =
  createAgeRetentionPolicy({
    column: 'created_at',
    days: 7,
    name: 'scheduled-agent-job-webhook-deliveries',
    rationale: `the 7-day dedupe replay window: a purged row frees its delivery id, so this is also how long a captured delivery stays unreplayable`,
    table: 'scheduled_agent_job_webhook_deliveries',
  });
