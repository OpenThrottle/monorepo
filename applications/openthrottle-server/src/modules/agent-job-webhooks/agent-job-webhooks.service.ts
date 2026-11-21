import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJob,
  ScheduledAgentJobWebhookDeliveryStatus,
  ScheduledAgentJobWebhookRejectReason,
  ScheduledAgentJobWebhookTrigger,
} from '@openthrottle/nestjs-repositories-server';
import {
  ScheduledAgentJobRunsRepository,
  ScheduledAgentJobsRepository,
  ScheduledAgentJobWebhookDeliveriesRepository,
  ScheduledAgentJobWebhookTriggersRepository,
} from '@openthrottle/nestjs-repositories-server';

import { ScheduledAgentJobRunEnqueueService } from '../../queues/scheduled-agent-jobs/run-enqueue/run-enqueue.service.ts';
import {
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_RATE_WINDOW_MS,
} from './agent-job-webhooks.constants.ts';
import type {
  WebhookIngressRequest,
  WebhookIngressResponse,
} from './agent-job-webhooks.types.ts';
import { evaluateWebhookFilters } from './filters/filters.utils.ts';
import { renderWebhookPrompt } from './render-prompt/render-prompt.utils.ts';
import {
  isJsonContentType,
  parseWebhookJson,
  pickAllowedHeaders,
  resolveDedupeKey,
  sha256Hex,
} from './request/request.utils.ts';
import {
  decryptWebhookSecret,
  resolveWebhookEncryptionKey,
} from './secret-crypto/secret-crypto.utils.ts';
import {
  checkWebhookTimestamp,
  resolveSignatureRules,
  verifyWebhookSignature,
} from './signature/signature.utils.ts';
import { hashWebhookToken, tokenHashesEqual } from './token/token.utils.ts';

/** The one answer for an unknown token, a disabled trigger and a disabled job: a probe learns nothing. */
const NOT_FOUND: WebhookIngressResponse = {
  body: { status: 'not_found' },
  httpStatus: 404,
};

/** What one delivery row records beyond the request facts every row shares. */
interface DeliveryOutcome {
  readonly dedupeKey: string | null;
  readonly filterIndex: number | null;
  readonly httpStatus: number;
  readonly rejectReason: ScheduledAgentJobWebhookRejectReason | null;
  readonly renderedPrompt: string | null;
  readonly runId: string | null;
  readonly status: ScheduledAgentJobWebhookDeliveryStatus;
}

/** A trigger that matched the URL token, with its live job. */
interface TriggerMatch {
  readonly job: ScheduledAgentJob;
  readonly trigger: ScheduledAgentJobWebhookTrigger;
}

const outcome = (
  status: ScheduledAgentJobWebhookDeliveryStatus,
  httpStatus: number,
  overrides: Partial<DeliveryOutcome> = {},
): DeliveryOutcome => {
  return {
    dedupeKey: null,
    filterIndex: null,
    httpStatus,
    rejectReason: null,
    renderedPrompt: null,
    runId: null,
    status,
    ...overrides,
  };
};

/**
 * @description The webhook ingress pipeline, in the order of the design's "Shape" diagram: body
 * cap, token lookup, timestamp window, HMAC, JSON parse, dedupe, filters, rate cap, queue cap,
 * coalesce, then render, pre-create the run and enqueue. Every request that matched a trigger writes
 * one delivery row; an unknown token is only logged. Admission reads DB state only, so a restart
 * cannot reset a cap or reopen a coalesce window. See docs/openthrottle/webhook-triggered-agent-jobs.md.
 */
@Injectable()
export class AgentJobWebhooksService {
  constructor(
    private readonly deliveries: ScheduledAgentJobWebhookDeliveriesRepository,
    private readonly enqueue: ScheduledAgentJobRunEnqueueService,
    private readonly jobs: ScheduledAgentJobsRepository,
    private readonly logger: LoggerService,
    private readonly runs: ScheduledAgentJobRunsRepository,
    private readonly triggers: ScheduledAgentJobWebhookTriggersRepository,
  ) {}

  /** @description Runs one inbound request through the pipeline and returns the answer for the sender. */
  async handle(
    request: WebhookIngressRequest,
  ): Promise<WebhookIngressResponse> {
    const match = await this.lookup(request.token);
    const rawBody = request.rawBody ?? Buffer.alloc(0);
    const bodySha256 = sha256Hex(rawBody);

    const envelope = this.checkEnvelope(request, rawBody);
    if (envelope !== null) {
      if (match !== null) {
        const headers = pickAllowedHeaders(request.headers, []);
        await this.record(
          match,
          { bodySha256, headers, rawBody },
          outcome('rejected', envelope.httpStatus, {
            rejectReason: envelope.reason,
          }),
        );
      }

      return {
        body: { reason: envelope.reason, status: 'rejected' },
        httpStatus: envelope.httpStatus,
      };
    }

    if (match === null) {
      this.logger.warn(
        `Webhook ingress: no active trigger for the presented token`,
        AgentJobWebhooksService.name,
      );

      return NOT_FOUND;
    }

    return this.admit(match, request, rawBody, bodySha256);
  }

  /**
   * @description Token lookup by sha256, re-compared in constant time; null for an unknown token,
   * a disabled trigger, a deleted job or a job still awaiting approval (firing it would sidestep the
   * approval; threat model T10). The job's own `enabled` gates only its schedule, so a webhook-only
   * job can leave its schedule off and still be fired here.
   */
  private async lookup(token: string): Promise<TriggerMatch | null> {
    const tokenHash = hashWebhookToken(token);
    const trigger = await this.triggers.findTriggerByTokenHash(tokenHash);

    if (
      trigger === null ||
      !tokenHashesEqual(trigger.tokenHash, tokenHash) ||
      !trigger.enabled
    ) {
      return null;
    }

    const job = await this.jobs.findJobById(trigger.scheduledAgentJobId);

    if (job === null || job.approvalState === 'pending') {
      return null;
    }

    return { job, trigger };
  }

  /** @description Body cap (413) and media type (415), checked before anything else about the request. */
  private checkEnvelope(
    request: WebhookIngressRequest,
    rawBody: Buffer,
  ): {
    readonly httpStatus: number;
    readonly reason: ScheduledAgentJobWebhookRejectReason;
  } | null {
    if (rawBody.length > WEBHOOK_MAX_BODY_BYTES) {
      return { httpStatus: 413, reason: 'payload_too_large' };
    }

    if (!isJsonContentType(request.contentType)) {
      return { httpStatus: 415, reason: 'unsupported_media_type' };
    }

    return null;
  }

  /** @description Everything after the token matched: verification, then admission. */
  private async admit(
    match: TriggerMatch,
    request: WebhookIngressRequest,
    rawBody: Buffer,
    bodySha256: string,
  ): Promise<WebhookIngressResponse> {
    const { trigger } = match;
    const rules = resolveSignatureRules(trigger);
    const headers = pickAllowedHeaders(request.headers, [
      rules.deliveryIdHeader,
      rules.timestampHeader,
    ]);
    const facts = { bodySha256, headers, rawBody };

    const keyResult = resolveWebhookEncryptionKey(process.env);
    if (!keyResult.ok) {
      this.logger.error(`Webhook ingress unavailable: ${keyResult.message}`, undefined, AgentJobWebhooksService.name); // prettier-ignore
      return { body: { status: 'unavailable' }, httpStatus: 503 };
    }

    const decrypted = decryptWebhookSecret(
      trigger.secretCiphertext,
      keyResult.key,
    );
    if (!decrypted.ok) {
      this.logger.error(`Webhook ingress unavailable for trigger ${trigger.id}: ${decrypted.message}`, undefined, AgentJobWebhooksService.name); // prettier-ignore
      return { body: { status: 'unavailable' }, httpStatus: 503 };
    }

    let signedTimestamp: string | null = null;

    if (rules.timestampHeader !== null) {
      const timestamp = checkWebhookTimestamp({
        header: request.headers[rules.timestampHeader.toLowerCase()],
        nowMs: Date.now(),
        toleranceSeconds: trigger.timestampToleranceSeconds,
      });

      if (!timestamp.ok) {
        return this.reject(match, facts, timestamp.reason);
      }

      signedTimestamp = timestamp.timestamp;
    }

    const signature = verifyWebhookSignature({
      providedSignature: request.headers[rules.signatureHeader.toLowerCase()],
      rawBody,
      rules,
      secret: decrypted.secret,
      timestamp: signedTimestamp,
    });

    if (!signature.ok) {
      return this.reject(match, facts, signature.reason);
    }

    const parsed = parseWebhookJson(rawBody);

    if (!parsed.ok) {
      return this.reject(match, facts, 'invalid_json', 400);
    }

    const dedupeKey = resolveDedupeKey({
      bodySha256,
      deliveryIdHeader: rules.deliveryIdHeader,
      headers: request.headers,
    });

    return this.admitVerified(match, facts, parsed.payload, dedupeKey);
  }

  /** @description Admission of a verified, parsed delivery: dedupe, filters, caps, coalesce, accept. */
  private async admitVerified(
    match: TriggerMatch,
    facts: DeliveryFacts,
    payload: unknown,
    dedupeKey: string,
  ): Promise<WebhookIngressResponse> {
    const { job, trigger } = match;

    if (await this.deliveries.hasDedupeKey(trigger.id, dedupeKey)) {
      return this.answer(
        match,
        facts,
        outcome('deduplicated', 200, { dedupeKey }),
      );
    }

    const filtered = evaluateWebhookFilters(trigger.filters, {
      headers: facts.headers,
      payload,
    });

    if (!filtered.matched) {
      return this.answer(
        match,
        facts,
        outcome('filtered', 202, {
          dedupeKey,
          filterIndex: filtered.failedIndex,
        }),
      );
    }

    const acceptedRecently = await this.deliveries.countAcceptedSince(
      trigger.id,
      new Date(Date.now() - WEBHOOK_RATE_WINDOW_MS),
    );

    if (acceptedRecently >= trigger.rateLimitPerMinute) {
      return this.answer(
        match,
        facts,
        outcome('rate_limited', 429, { dedupeKey }),
      );
    }

    const inFlight = await this.runs.countInFlightRunsForTrigger(
      job.id,
      'webhook',
    );

    if (inFlight >= trigger.maxInFlight) {
      return this.answer(
        match,
        facts,
        outcome('queue_full', 429, { dedupeKey }),
      );
    }

    if (trigger.coalesceWindowMs > 0) {
      const leading = await this.deliveries.findLatestAcceptedSince(
        trigger.id,
        new Date(Date.now() - trigger.coalesceWindowMs),
      );

      if (leading !== null) {
        return this.answer(
          match,
          facts,
          outcome('coalesced', 202, { dedupeKey, runId: leading.runId }),
        );
      }
    }

    return this.accept(match, facts, payload, dedupeKey);
  }

  /**
   * @description Accepts the delivery. The accepted row is written FIRST: it claims the dedupe key
   * through the partial unique index, so two identical deliveries racing past the dedupe check
   * cannot both start a run. Then the run is pre-created and enqueued, and the row is pointed at it;
   * if the enqueue fails the claim is released so the sender's retry can succeed.
   */
  private async accept(
    match: TriggerMatch,
    facts: DeliveryFacts,
    payload: unknown,
    dedupeKey: string,
  ): Promise<WebhookIngressResponse> {
    const { job, trigger } = match;
    const rendered = renderWebhookPrompt({
      headers: facts.headers,
      payload,
      template: job.prompt,
    });

    const recorded = await this.deliveries.recordDelivery({
      ...this.baseRow(match, facts),
      ...outcome('accepted', 202, {
        dedupeKey,
        renderedPrompt: rendered.renderedPrompt,
      }),
    });

    if (recorded.kind === 'duplicate') {
      return this.answer(
        match,
        facts,
        outcome('deduplicated', 200, { dedupeKey }),
      );
    }

    try {
      const run = await this.enqueue.enqueueRun({
        job,
        prompt: rendered.prompt,
        trigger: 'webhook',
      });
      await this.deliveries.attachRun(recorded.delivery.id, run.id);

      return { body: { runId: run.id, status: 'accepted' }, httpStatus: 202 };
    } catch (error) {
      await this.deliveries.deleteDelivery(recorded.delivery.id);
      this.logger.error(`Webhook trigger ${trigger.id} accepted a delivery but could not enqueue its run`, error instanceof Error ? error.stack : String(error), AgentJobWebhooksService.name); // prettier-ignore
      throw error;
    }
  }

  /** @description A 401 (or the given status) rejection that is recorded on the delivery log. */
  private async reject(
    match: TriggerMatch,
    facts: DeliveryFacts,
    reason: ScheduledAgentJobWebhookRejectReason,
    httpStatus = 401,
  ): Promise<WebhookIngressResponse> {
    await this.record(
      match,
      facts,
      outcome('rejected', httpStatus, { rejectReason: reason }),
    );

    return { body: { reason, status: 'rejected' }, httpStatus };
  }

  /** @description Records a non-accepted delivery and builds the sender's answer from it. */
  private async answer(
    match: TriggerMatch,
    facts: DeliveryFacts,
    result: DeliveryOutcome,
  ): Promise<WebhookIngressResponse> {
    const recorded = await this.record(match, facts, result);

    // A coalesced row holds the dedupe key like an accepted one: a lost race is a duplicate.
    if (recorded === 'duplicate') {
      return { body: { status: 'deduplicated' }, httpStatus: 200 };
    }

    if (result.status === 'coalesced') {
      return {
        body: { runId: result.runId, status: 'coalesced' },
        httpStatus: 202,
      };
    }

    if (
      result.status === 'deduplicated' ||
      result.status === 'filtered' ||
      result.status === 'queue_full' ||
      result.status === 'rate_limited'
    ) {
      // prettier-ignore
      return { body: { status: result.status }, httpStatus: result.httpStatus };
    }

    return { body: { status: 'unavailable' }, httpStatus: 503 };
  }

  private baseRow(
    match: TriggerMatch,
    facts: DeliveryFacts,
  ): {
    readonly bodyBytes: number;
    readonly bodySha256: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly scheduledAgentJobId: string;
    readonly triggerId: string;
  } {
    return {
      bodyBytes: facts.rawBody.length,
      bodySha256: facts.bodySha256,
      headers: facts.headers,
      scheduledAgentJobId: match.job.id,
      triggerId: match.trigger.id,
    };
  }

  private async record(
    match: TriggerMatch,
    facts: DeliveryFacts,
    result: DeliveryOutcome,
  ): Promise<'duplicate' | 'recorded'> {
    const recorded = await this.deliveries.recordDelivery({
      ...this.baseRow(match, facts),
      ...result,
    });

    return recorded.kind;
  }
}

/** The request facts every delivery row carries. */
interface DeliveryFacts {
  readonly bodySha256: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly rawBody: Buffer;
}
