/**
 * @description Tests for the webhook ingress pipeline: every rejection path, every admission
 * outcome, and the happy path of each signature preset. Repositories are the shared in-memory
 * mocks; signatures are computed with real HMAC over real bytes.
 */

import { createHmac, randomBytes } from 'node:crypto';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJob,
  ScheduledAgentJobRun,
  ScheduledAgentJobRunsRepository,
  ScheduledAgentJobsRepository,
  ScheduledAgentJobWebhookDeliveriesRepository,
  ScheduledAgentJobWebhookTrigger,
  ScheduledAgentJobWebhookTriggersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createScheduledAgentJobRunsRepositoryMock,
  createScheduledAgentJobsRepositoryMock,
  createScheduledAgentJobWebhookDeliveriesRepositoryMock,
  createScheduledAgentJobWebhookTriggersRepositoryMock,
  scheduledAgentJobsFactory,
  scheduledAgentJobWebhookDeliveriesFactory,
  scheduledAgentJobWebhookTriggersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobRunEnqueueService } from '../../queues/scheduled-agent-jobs/run-enqueue/run-enqueue.service.ts';
import { AgentJobWebhooksService } from './agent-job-webhooks.service.ts';
import type { WebhookIngressRequest } from './agent-job-webhooks.types.ts';
import { encryptWebhookSecret } from './secret-crypto/secret-crypto.utils.ts';
import { generateWebhookToken } from './token/token.utils.ts';

const KEY = randomBytes(32);
const SECRET = 'whsec_test_secret';
const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = '1700000000';
const BODY = JSON.stringify({
  action: 'opened',
  number: 12,
  pull_request: { base: { ref: 'main' } },
});

const hmacHex = (signed: string): string => {
  return createHmac('sha256', SECRET).update(signed).digest('hex');
};

describe('AgentJobWebhooksService', () => {
  const minted = generateWebhookToken();
  let triggers: ReturnType<
    typeof createScheduledAgentJobWebhookTriggersRepositoryMock
  >;
  let deliveries: ReturnType<
    typeof createScheduledAgentJobWebhookDeliveriesRepositoryMock
  >;
  let jobs: ReturnType<typeof createScheduledAgentJobsRepositoryMock>;
  let runs: ReturnType<typeof createScheduledAgentJobRunsRepositoryMock>;
  let enqueue: { enqueueRun: ReturnType<typeof vi.fn> };
  let logger: LoggerService;
  let service: AgentJobWebhooksService;
  let trigger: ScheduledAgentJobWebhookTrigger;
  let job: ScheduledAgentJob;

  const buildTrigger = (
    overrides: Partial<ScheduledAgentJobWebhookTrigger> = {},
  ): ScheduledAgentJobWebhookTrigger => {
    return scheduledAgentJobWebhookTriggersFactory.build({
      deliveryIdHeader: 'X-OT-Webhook-Id',
      scheduledAgentJobId: job.id,
      secretCiphertext: encryptWebhookSecret(SECRET, KEY),
      signatureHeader: 'X-OT-Signature',
      signaturePreset: 'generic',
      timestampHeader: 'X-OT-Timestamp',
      tokenHash: minted.tokenHash,
      ...overrides,
    });
  };

  /** A correctly signed generic-preset request; override any piece to break it. */
  const genericRequest = (
    overrides: Partial<WebhookIngressRequest> = {},
    body = BODY,
  ): WebhookIngressRequest => {
    return {
      contentType: 'application/json',
      headers: {
        'x-ot-signature': hmacHex(`${NOW_SECONDS}.${body}`),
        'x-ot-timestamp': NOW_SECONDS,
        'x-ot-webhook-id': 'delivery-1',
      },
      rawBody: Buffer.from(body),
      token: minted.token,
      ...overrides,
    };
  };

  const useTrigger = (next: ScheduledAgentJobWebhookTrigger): void => {
    trigger = next;
    triggers.findTriggerByTokenHash.mockResolvedValue(next);
  };

  /** Every delivery row written, in order. */
  const rows = () => {
    return deliveries.recordDelivery.mock.calls.map(([input]) => input);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = KEY.toString('base64');

    job = scheduledAgentJobsFactory.build({
      enabled: true,
      prompt: 'Review the PR',
    });
    jobs = createScheduledAgentJobsRepositoryMock();
    jobs.findJobById.mockResolvedValue(job);
    triggers = createScheduledAgentJobWebhookTriggersRepositoryMock();
    deliveries = createScheduledAgentJobWebhookDeliveriesRepositoryMock();
    runs = createScheduledAgentJobRunsRepositoryMock();
    enqueue = {
      enqueueRun: vi
        .fn()
        .mockResolvedValue(createMock<ScheduledAgentJobRun>({ id: 'run-1' })),
    };
    logger = createMock<LoggerService>();
    service = new AgentJobWebhooksService(
      asMock<ScheduledAgentJobWebhookDeliveriesRepository>(deliveries),
      asMock<ScheduledAgentJobRunEnqueueService>(enqueue),
      asMock<ScheduledAgentJobsRepository>(jobs),
      logger,
      asMock<ScheduledAgentJobRunsRepository>(runs),
      asMock<ScheduledAgentJobWebhookTriggersRepository>(triggers),
    );
    useTrigger(buildTrigger());
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  });

  describe('token lookup', () => {
    const NOT_FOUND = { body: { status: 'not_found' }, httpStatus: 404 };

    it('answers 404 for an unknown token, logs a warning and stores no row', async () => {
      triggers.findTriggerByTokenHash.mockResolvedValue(null);

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual(NOT_FOUND);
      expect(logger.warn).toHaveBeenCalled();
      expect(deliveries.recordDelivery).not.toHaveBeenCalled();
    });

    it('answers the identical 404 for a disabled trigger', async () => {
      useTrigger(buildTrigger({ enabled: false }));

      expect(await service.handle(genericRequest())).toStrictEqual(NOT_FOUND);
      expect(deliveries.recordDelivery).not.toHaveBeenCalled();
    });

    it('still admits a job whose schedule is disabled (webhook-only job)', async () => {
      jobs.findJobById.mockResolvedValue(
        scheduledAgentJobsFactory.build({ enabled: false }),
      );

      expect(await service.handle(genericRequest())).not.toStrictEqual(
        NOT_FOUND,
      );
    });

    it('answers the identical 404 for a deleted job', async () => {
      jobs.findJobById.mockResolvedValue(null);

      expect(await service.handle(genericRequest())).toStrictEqual(NOT_FOUND);
    });

    it('answers the identical 404 for a job still awaiting approval, and enqueues nothing', async () => {
      jobs.findJobById.mockResolvedValue(
        scheduledAgentJobsFactory.build({
          approvalState: 'pending',
          enabled: false,
        }),
      );

      expect(await service.handle(genericRequest())).toStrictEqual(NOT_FOUND);
      expect(deliveries.recordDelivery).not.toHaveBeenCalled();
    });

    it('answers 404 when the stored hash does not match the presented token', async () => {
      useTrigger(buildTrigger({ tokenHash: generateWebhookToken().tokenHash }));

      expect(await service.handle(genericRequest())).toStrictEqual(NOT_FOUND);
    });

    it('looks the trigger up by sha256 of the token, never the token itself', async () => {
      await service.handle(genericRequest());

      expect(triggers.findTriggerByTokenHash).toHaveBeenCalledWith(
        minted.tokenHash,
      );
    });
  });

  describe('envelope', () => {
    it('answers 413 for an oversize body and records payload_too_large', async () => {
      const answer = await service.handle(
        genericRequest({ rawBody: Buffer.alloc(1_048_577, 'a') }),
      );

      expect(answer).toStrictEqual({
        body: { reason: 'payload_too_large', status: 'rejected' },
        httpStatus: 413,
      });
      expect(rows()).toMatchObject([
        {
          httpStatus: 413,
          rejectReason: 'payload_too_large',
          status: 'rejected',
        },
      ]);
    });

    it('accepts a body of exactly 1 MiB past the cap', async () => {
      const answer = await service.handle(
        genericRequest({ rawBody: Buffer.alloc(1_048_576, 'a') }),
      );

      expect(answer.httpStatus).not.toBe(413);
    });

    it('answers 413 for an unknown token too, without storing a row', async () => {
      triggers.findTriggerByTokenHash.mockResolvedValue(null);

      const answer = await service.handle(
        genericRequest({ rawBody: Buffer.alloc(1_048_577) }),
      );

      expect(answer.httpStatus).toBe(413);
      expect(deliveries.recordDelivery).not.toHaveBeenCalled();
    });

    it('answers 415 for a non-JSON content type and records unsupported_media_type', async () => {
      const answer = await service.handle(
        genericRequest({ contentType: 'text/plain' }),
      );

      expect(answer).toStrictEqual({
        body: { reason: 'unsupported_media_type', status: 'rejected' },
        httpStatus: 415,
      });
      expect(rows()).toMatchObject([
        { httpStatus: 415, rejectReason: 'unsupported_media_type' },
      ]);
    });

    it('answers 415 for a missing content type', async () => {
      expect(
        (await service.handle(genericRequest({ contentType: undefined })))
          .httpStatus,
      ).toBe(415);
    });
  });

  describe('503: encryption key', () => {
    it.each([
      ['missing', undefined],
      ['malformed', 'not-32-bytes'],
    ])(
      'answers 503 when the key is %s, before any signature work, and stores no row',
      async (_label, value) => {
        if (value === undefined) {
          delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
        } else {
          process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = value;
        }

        const answer = await service.handle(genericRequest());

        expect(answer).toStrictEqual({
          body: { status: 'unavailable' },
          httpStatus: 503,
        });
        expect(deliveries.recordDelivery).not.toHaveBeenCalled();
        expect(enqueue.enqueueRun).not.toHaveBeenCalled();
      },
    );

    it('answers 503 when the stored secret was encrypted under another key', async () => {
      useTrigger(
        buildTrigger({
          secretCiphertext: encryptWebhookSecret(SECRET, randomBytes(32)),
        }),
      );

      expect((await service.handle(genericRequest())).httpStatus).toBe(503);
    });
  });

  describe('timestamp window (generic)', () => {
    it('answers 401 for a missing timestamp', async () => {
      const request = genericRequest();
      const { 'x-ot-timestamp': _dropped, ...headers } = request.headers;

      const answer = await service.handle({ ...request, headers });

      expect(answer).toStrictEqual({
        body: { reason: 'missing_timestamp', status: 'rejected' },
        httpStatus: 401,
      });
      expect(rows()).toMatchObject([
        {
          httpStatus: 401,
          rejectReason: 'missing_timestamp',
          status: 'rejected',
        },
      ]);
    });

    it('answers 401 for a stale timestamp, even with a valid signature over it', async () => {
      const stale = String(Number(NOW_SECONDS) - 301);
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: {
          ...request.headers,
          'x-ot-signature': hmacHex(`${stale}.${BODY}`),
          'x-ot-timestamp': stale,
        },
      });

      expect(answer).toStrictEqual({
        body: { reason: 'stale_timestamp', status: 'rejected' },
        httpStatus: 401,
      });
      expect(rows()).toMatchObject([{ rejectReason: 'stale_timestamp' }]);
    });

    it('answers 401 for a future timestamp beyond the tolerance', async () => {
      const future = String(Number(NOW_SECONDS) + 301);
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: {
          ...request.headers,
          'x-ot-signature': hmacHex(`${future}.${BODY}`),
          'x-ot-timestamp': future,
        },
      });

      expect(answer.httpStatus).toBe(401);
    });

    it('honours the trigger tolerance', async () => {
      useTrigger(buildTrigger({ timestampToleranceSeconds: 30 }));
      const old = String(Number(NOW_SECONDS) - 60);
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: {
          ...request.headers,
          'x-ot-signature': hmacHex(`${old}.${BODY}`),
          'x-ot-timestamp': old,
        },
      });

      expect(answer.httpStatus).toBe(401);
    });
  });

  describe('signature', () => {
    it('answers 401 for a missing signature', async () => {
      const request = genericRequest();
      const { 'x-ot-signature': _dropped, ...headers } = request.headers;

      const answer = await service.handle({ ...request, headers });

      expect(answer).toStrictEqual({
        body: { reason: 'bad_signature', status: 'rejected' },
        httpStatus: 401,
      });
      expect(rows()).toMatchObject([
        { httpStatus: 401, rejectReason: 'bad_signature', status: 'rejected' },
      ]);
    });

    it('answers 401 for a signature made with the wrong secret', async () => {
      const request = genericRequest();
      const forged = createHmac('sha256', 'wrong')
        .update(`${NOW_SECONDS}.${BODY}`)
        .digest('hex');

      const answer = await service.handle({
        ...request,
        headers: { ...request.headers, 'x-ot-signature': forged },
      });

      expect(answer.httpStatus).toBe(401);
    });

    it('answers 401 for a wrong-length signature without throwing', async () => {
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: { ...request.headers, 'x-ot-signature': 'abcd' },
      });

      expect(answer).toStrictEqual({
        body: { reason: 'bad_signature', status: 'rejected' },
        httpStatus: 401,
      });
    });

    it('answers 401 when the body was altered after signing', async () => {
      const answer = await service.handle(
        genericRequest({ rawBody: Buffer.from(`${BODY} `) }),
      );

      expect(answer.httpStatus).toBe(401);
    });

    it('answers 401 for an empty body that was never signed', async () => {
      expect(
        (await service.handle(genericRequest({ rawBody: undefined })))
          .httpStatus,
      ).toBe(401);
    });

    it('never stores the signature header on the row', async () => {
      await service.handle(genericRequest());

      expect(JSON.stringify(rows())).not.toContain(
        hmacHex(`${NOW_SECONDS}.${BODY}`),
      );
    });
  });

  describe('JSON parse', () => {
    it('answers 400 for a correctly signed body that is not JSON', async () => {
      const body = '{not json';
      const answer = await service.handle(
        genericRequest({
          headers: {
            'x-ot-signature': hmacHex(`${NOW_SECONDS}.${body}`),
            'x-ot-timestamp': NOW_SECONDS,
          },
          rawBody: Buffer.from(body),
        }),
      );

      expect(answer).toStrictEqual({
        body: { reason: 'invalid_json', status: 'rejected' },
        httpStatus: 400,
      });
      expect(rows()).toMatchObject([
        { httpStatus: 400, rejectReason: 'invalid_json' },
      ]);
    });

    it('verifies the signature BEFORE parsing: unsigned invalid JSON is 401, not 400', async () => {
      const answer = await service.handle(
        genericRequest({ rawBody: Buffer.from('{not json') }),
      );

      expect(answer.httpStatus).toBe(401);
    });
  });

  describe('dedupe', () => {
    it('answers 200 deduplicated for an already-held delivery id and records it', async () => {
      deliveries.hasDedupeKey.mockResolvedValue(true);

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { status: 'deduplicated' },
        httpStatus: 200,
      });
      expect(deliveries.hasDedupeKey).toHaveBeenCalledWith(
        trigger.id,
        'delivery-1',
      );
      expect(rows()).toMatchObject([
        { dedupeKey: 'delivery-1', httpStatus: 200, status: 'deduplicated' },
      ]);
      expect(enqueue.enqueueRun).not.toHaveBeenCalled();
    });

    it('falls back to the body hash when no delivery id header is sent', async () => {
      deliveries.hasDedupeKey.mockResolvedValue(true);
      const request = genericRequest();
      const { 'x-ot-webhook-id': _dropped, ...headers } = request.headers;

      await service.handle({ ...request, headers });

      expect(deliveries.hasDedupeKey).toHaveBeenCalledWith(
        trigger.id,
        rows()[0]?.bodySha256,
      );
    });

    it('answers deduplicated when two identical deliveries race past the check', async () => {
      deliveries.recordDelivery.mockResolvedValueOnce({ kind: 'duplicate' });

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { status: 'deduplicated' },
        httpStatus: 200,
      });
      expect(enqueue.enqueueRun).not.toHaveBeenCalled();
    });
  });

  describe('filters', () => {
    it('answers 202 filtered with the failing index when a filter does not match', async () => {
      useTrigger(
        buildTrigger({
          filters: [
            { op: 'equals', path: 'action', value: 'opened' },
            { op: 'equals', path: 'pull_request.base.ref', value: 'release' },
          ],
        }),
      );

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { status: 'filtered' },
        httpStatus: 202,
      });
      expect(rows()).toMatchObject([
        { filterIndex: 1, httpStatus: 202, status: 'filtered' },
      ]);
      expect(enqueue.enqueueRun).not.toHaveBeenCalled();
    });

    it.each([
      ['equals', { op: 'equals', path: 'action', value: 'closed' }],
      ['not_equals', { op: 'not_equals', path: 'action', value: 'opened' }],
      ['in', { op: 'in', path: 'action', value: ['closed'] }],
      ['exists', { op: 'exists', path: 'missing', value: undefined }],
      ['not_exists', { op: 'not_exists', path: 'action', value: undefined }],
      ['prefix', { op: 'prefix', path: 'action', value: 'cl' }],
    ] as const)('filters on a failing %s', async (_op, filter) => {
      useTrigger(buildTrigger({ filters: [filter] }));

      expect((await service.handle(genericRequest())).body).toStrictEqual({
        status: 'filtered',
      });
    });

    it('filters on an allow-listed header', async () => {
      useTrigger(
        buildTrigger({
          filters: [
            { op: 'equals', path: 'header:x-github-event', value: 'push' },
          ],
        }),
      );
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: { ...request.headers, 'x-github-event': 'ping' },
      });

      expect(answer.body).toStrictEqual({ status: 'filtered' });
    });

    it('lets a delivery through when every filter matches', async () => {
      useTrigger(
        buildTrigger({
          filters: [{ op: 'in', path: 'action', value: ['opened'] }],
        }),
      );

      expect((await service.handle(genericRequest())).httpStatus).toBe(202);
      expect(enqueue.enqueueRun).toHaveBeenCalled();
    });
  });

  describe('caps', () => {
    it('answers 429 rate_limited at the per-minute cap, counting a trailing 60 seconds', async () => {
      useTrigger(buildTrigger({ rateLimitPerMinute: 5 }));
      deliveries.countAcceptedSince.mockResolvedValue(5);

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { status: 'rate_limited' },
        httpStatus: 429,
      });
      expect(deliveries.countAcceptedSince).toHaveBeenCalledWith(
        trigger.id,
        new Date(NOW_MS - 60_000),
      );
      expect(rows()).toMatchObject([
        { httpStatus: 429, status: 'rate_limited' },
      ]);
    });

    it('admits a delivery just under the rate cap', async () => {
      useTrigger(buildTrigger({ rateLimitPerMinute: 5 }));
      deliveries.countAcceptedSince.mockResolvedValue(4);

      expect((await service.handle(genericRequest())).httpStatus).toBe(202);
    });

    it('answers 429 queue_full when the in-flight webhook runs reach the cap', async () => {
      useTrigger(buildTrigger({ maxInFlight: 2 }));
      runs.countInFlightRunsForTrigger.mockResolvedValue(2);

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { status: 'queue_full' },
        httpStatus: 429,
      });
      expect(runs.countInFlightRunsForTrigger).toHaveBeenCalledWith(
        job.id,
        'webhook',
      );
      expect(rows()).toMatchObject([{ httpStatus: 429, status: 'queue_full' }]);
      expect(enqueue.enqueueRun).not.toHaveBeenCalled();
    });

    it('checks the rate cap before the queue cap', async () => {
      deliveries.countAcceptedSince.mockResolvedValue(999);
      runs.countInFlightRunsForTrigger.mockResolvedValue(999);

      expect((await service.handle(genericRequest())).body).toStrictEqual({
        status: 'rate_limited',
      });
    });
  });

  describe('coalesce', () => {
    it('answers 202 coalesced inside the window, linked to the leading run', async () => {
      useTrigger(buildTrigger({ coalesceWindowMs: 60_000 }));
      deliveries.findLatestAcceptedSince.mockResolvedValue(
        scheduledAgentJobWebhookDeliveriesFactory.build({
          runId: 'run-leading',
        }),
      );

      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { runId: 'run-leading', status: 'coalesced' },
        httpStatus: 202,
      });
      expect(deliveries.findLatestAcceptedSince).toHaveBeenCalledWith(
        trigger.id,
        new Date(NOW_MS - 60_000),
      );
      expect(rows()).toMatchObject([
        { dedupeKey: 'delivery-1', httpStatus: 202, status: 'coalesced' },
      ]);
      expect(enqueue.enqueueRun).not.toHaveBeenCalled();
    });

    it('lets the first delivery of a window (the leading edge) run', async () => {
      useTrigger(buildTrigger({ coalesceWindowMs: 60_000 }));
      deliveries.findLatestAcceptedSince.mockResolvedValue(null);

      expect((await service.handle(genericRequest())).body).toStrictEqual({
        runId: 'run-1',
        status: 'accepted',
      });
    });

    it('does not consult the window when coalescing is off', async () => {
      await service.handle(genericRequest());

      expect(deliveries.findLatestAcceptedSince).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('claims the delivery, pre-creates and enqueues the run, then links them', async () => {
      const answer = await service.handle(genericRequest());

      expect(answer).toStrictEqual({
        body: { runId: 'run-1', status: 'accepted' },
        httpStatus: 202,
      });
      expect(enqueue.enqueueRun).toHaveBeenCalledWith({
        job,
        prompt: expect.stringMatching(
          /^The blocks tagged[\s\S]*\n\nReview the PR$/,
        ),
        trigger: 'webhook',
      });
      expect(rows()).toMatchObject([
        {
          bodyBytes: BODY.length,
          dedupeKey: 'delivery-1',
          httpStatus: 202,
          renderedPrompt: expect.stringContaining('\n\nReview the PR'),
          scheduledAgentJobId: job.id,
          status: 'accepted',
          triggerId: trigger.id,
        },
      ]);
      expect(deliveries.attachRun).toHaveBeenCalledWith(
        expect.any(String),
        'run-1',
      );
    });

    it('stores only allow-listed headers', async () => {
      const request = genericRequest();

      await service.handle({
        ...request,
        headers: {
          ...request.headers,
          authorization: 'Bearer x',
          'x-ot-event': 'build',
        },
      });

      expect(rows()[0]?.headers).toStrictEqual({
        'x-ot-event': 'build',
        'x-ot-timestamp': NOW_SECONDS,
        'x-ot-webhook-id': 'delivery-1',
      });
    });

    it('releases the claim and rethrows when the enqueue fails, so a retry can succeed', async () => {
      enqueue.enqueueRun.mockRejectedValue(new Error('redis down'));

      await expect(service.handle(genericRequest())).rejects.toThrow(
        'redis down',
      );
      expect(deliveries.deleteDelivery).toHaveBeenCalled();
    });

    it('accepts a GitHub delivery: sha256= signature over the body, no timestamp', async () => {
      useTrigger(
        buildTrigger({
          deliveryIdHeader: 'X-GitHub-Delivery',
          signatureHeader: 'X-Hub-Signature-256',
          signaturePreset: 'github',
          timestampHeader: null,
        }),
      );

      const answer = await service.handle({
        contentType: 'application/json; charset=utf-8',
        headers: {
          'x-github-delivery': 'gh-1',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': `sha256=${hmacHex(BODY)}`,
        },
        rawBody: Buffer.from(BODY),
        token: minted.token,
      });

      expect(answer).toStrictEqual({
        body: { runId: 'run-1', status: 'accepted' },
        httpStatus: 202,
      });
      expect(deliveries.hasDedupeKey).toHaveBeenCalledWith(trigger.id, 'gh-1');
    });

    it('rejects a GitHub delivery with a bad signature', async () => {
      useTrigger(buildTrigger({ signaturePreset: 'github' }));

      const answer = await service.handle({
        contentType: 'application/json',
        headers: { 'x-hub-signature-256': `sha256=${'0'.repeat(64)}` },
        rawBody: Buffer.from(BODY),
        token: minted.token,
      });

      expect(answer.httpStatus).toBe(401);
    });

    it('accepts a custom delivery: configured header, base64, ts-prefixed string', async () => {
      useTrigger(
        buildTrigger({
          deliveryIdHeader: 'X-Event-Id',
          signatureEncoding: 'base64',
          signatureHeader: 'X-My-Sig',
          signaturePreset: 'custom',
          timestampHeader: 'X-My-Ts',
        }),
      );
      const signature = createHmac('sha256', SECRET)
        .update(`${NOW_SECONDS}.${BODY}`)
        .digest('base64');

      const answer = await service.handle({
        contentType: 'application/json',
        headers: {
          'x-event-id': 'evt-9',
          'x-my-sig': signature,
          'x-my-ts': NOW_SECONDS,
        },
        rawBody: Buffer.from(BODY),
        token: minted.token,
      });

      expect(answer).toStrictEqual({
        body: { runId: 'run-1', status: 'accepted' },
        httpStatus: 202,
      });
      expect(deliveries.hasDedupeKey).toHaveBeenCalledWith(trigger.id, 'evt-9');
    });

    it('accepts a custom delivery without a timestamp over the body alone', async () => {
      useTrigger(
        buildTrigger({
          signatureHeader: 'X-My-Sig',
          signaturePreset: 'custom',
          timestampHeader: null,
        }),
      );

      const answer = await service.handle({
        contentType: 'application/json',
        headers: { 'x-my-sig': hmacHex(BODY) },
        rawBody: Buffer.from(BODY),
        token: minted.token,
      });

      expect(answer.httpStatus).toBe(202);
    });
  });

  describe('check order', () => {
    it('does a stale timestamp before touching the signature: a stale delivery with a bad signature reports stale', async () => {
      const request = genericRequest();

      const answer = await service.handle({
        ...request,
        headers: {
          ...request.headers,
          'x-ot-signature': 'bad',
          'x-ot-timestamp': '1',
        },
      });

      expect(answer.body).toStrictEqual({
        reason: 'stale_timestamp',
        status: 'rejected',
      });
    });

    it('runs dedupe before filters', async () => {
      deliveries.hasDedupeKey.mockResolvedValue(true);
      useTrigger(
        buildTrigger({
          filters: [{ op: 'equals', path: 'action', value: 'nope' }],
        }),
      );

      expect((await service.handle(genericRequest())).body).toStrictEqual({
        status: 'deduplicated',
      });
    });
  });
});
