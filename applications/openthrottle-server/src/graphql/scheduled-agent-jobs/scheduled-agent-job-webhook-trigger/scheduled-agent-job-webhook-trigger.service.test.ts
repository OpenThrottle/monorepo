import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  ScheduledAgentJobWebhookDeliveriesRepository,
  ScheduledAgentJobWebhookTriggersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createScheduledAgentJobWebhookDeliveriesRepositoryMock,
  createScheduledAgentJobWebhookTriggersRepositoryMock,
  scheduledAgentJobWebhookTriggersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decryptWebhookSecret } from '../../../modules/agent-job-webhooks/secret-crypto/secret-crypto.utils.ts';
import { hashWebhookToken } from '../../../modules/agent-job-webhooks/token/token.utils.ts';
import { ScheduledAgentJobWebhookTriggerService } from './scheduled-agent-job-webhook-trigger.service.ts';
import type { WebhookTriggerConfigDraft } from './scheduled-agent-job-webhook-trigger.types.ts';

const KEY = randomBytes(32);
const draft: WebhookTriggerConfigDraft = {
  coalesceWindowMs: undefined,
  deliveryIdHeader: undefined,
  enabled: undefined,
  filters: undefined,
  maxInFlight: undefined,
  rateLimitPerMinute: undefined,
  signatureEncoding: undefined,
  signatureHeader: undefined,
  signaturePreset: undefined,
  timestampHeader: undefined,
  timestampToleranceSeconds: undefined,
};

describe('ScheduledAgentJobWebhookTriggerService', () => {
  let triggers: ReturnType<
    typeof createScheduledAgentJobWebhookTriggersRepositoryMock
  >;
  let deliveries: ReturnType<
    typeof createScheduledAgentJobWebhookDeliveriesRepositoryMock
  >;
  let service: ScheduledAgentJobWebhookTriggerService;

  beforeEach(() => {
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = KEY.toString('base64');
    triggers = createScheduledAgentJobWebhookTriggersRepositoryMock();
    deliveries = createScheduledAgentJobWebhookDeliveriesRepositoryMock();
    service = new ScheduledAgentJobWebhookTriggerService(
      asMock<ScheduledAgentJobWebhookDeliveriesRepository>(deliveries),
      asMock<ScheduledAgentJobWebhookTriggersRepository>(triggers),
    );
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;
  });

  describe('create', () => {
    it('stores the token as sha256 and the secret encrypted, and reveals both once', async () => {
      const reveal = await service.create('job-1', draft);

      const [input] = triggers.createTrigger.mock.calls[0] ?? [];
      expect(input?.tokenHash).toStrictEqual(hashWebhookToken(reveal.token));
      expect(input?.tokenPrefix).toBe(reveal.token.slice(0, 6));
      expect(input?.secretCiphertext.includes(reveal.secret)).toBe(false);
      expect(
        decryptWebhookSecret(input?.secretCiphertext ?? Buffer.alloc(0), KEY),
      ).toStrictEqual({ ok: true, secret: reveal.secret });
      expect(JSON.stringify(input)).not.toContain(reveal.token);
    });

    it('fails with a clear 503 when the encryption key is not configured, creating nothing', async () => {
      delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;

      await expect(service.create('job-1', draft)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.create('job-1', draft)).rejects.toThrow(
        /WEBHOOK_SECRET_ENCRYPTION_KEY is not set/,
      );
      expect(triggers.createTrigger).not.toHaveBeenCalled();
    });

    it('fails when the key is malformed', async () => {
      process.env.WEBHOOK_SECRET_ENCRYPTION_KEY = 'short';

      await expect(service.create('job-1', draft)).rejects.toThrow(/32 bytes/);
    });

    it('conflicts when the job already has a trigger', async () => {
      triggers.findTriggerByJobId.mockResolvedValue(
        scheduledAgentJobWebhookTriggersFactory.build(),
      );

      await expect(service.create('job-1', draft)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects an invalid config as a bad request', async () => {
      await expect(
        service.create('job-1', { ...draft, maxInFlight: 99 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates configuration only, never the token or secret', async () => {
      const existing = scheduledAgentJobWebhookTriggersFactory.build({
        maxInFlight: 5,
      });
      triggers.findTriggerByJobId.mockResolvedValue(existing);
      triggers.updateTriggerConfig.mockResolvedValue(existing);

      await service.update('job-1', { ...draft, enabled: false });

      expect(triggers.updateTriggerConfig).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ enabled: false, maxInFlight: 5 }),
      );
      expect(triggers.rotateTrigger).not.toHaveBeenCalled();
    });

    it('is not found when the job has no trigger', async () => {
      await expect(service.update('job-1', draft)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rotate', () => {
    it('replaces token and secret together and reveals the new pair', async () => {
      const existing = scheduledAgentJobWebhookTriggersFactory.build();
      triggers.findTriggerByJobId.mockResolvedValue(existing);
      triggers.rotateTrigger.mockResolvedValue(existing);

      const reveal = await service.rotate('job-1');

      const [id, credentials] = triggers.rotateTrigger.mock.calls[0] ?? [];
      expect(id).toBe(existing.id);
      expect(credentials?.tokenHash).toStrictEqual(
        hashWebhookToken(reveal.token),
      );
      expect(
        decryptWebhookSecret(
          credentials?.secretCiphertext ?? Buffer.alloc(0),
          KEY,
        ),
      ).toStrictEqual({ ok: true, secret: reveal.secret });
    });

    it('fails without a key and rotates nothing', async () => {
      delete process.env.WEBHOOK_SECRET_ENCRYPTION_KEY;

      await expect(service.rotate('job-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(triggers.rotateTrigger).not.toHaveBeenCalled();
    });

    it('is not found when the job has no trigger', async () => {
      await expect(service.rotate('job-1')).rejects.toThrow(NotFoundException);
    });
  });

  it('delete removes the job trigger', async () => {
    triggers.deleteTriggerForJob.mockResolvedValue(true);

    await expect(service.delete('job-1')).resolves.toBe(true);
    expect(triggers.deleteTriggerForJob).toHaveBeenCalledWith('job-1');
  });

  describe('listDeliveries', () => {
    it.each([
      [undefined, 50],
      [null, 50],
      [10, 10],
      [5000, 200],
      [0, 1],
    ])('limit %s asks the repository for %i', async (limit, expected) => {
      await service.listDeliveries('job-1', limit);

      expect(deliveries.listDeliveriesForJob).toHaveBeenCalledWith(
        'job-1',
        expected,
      );
    });
  });
});
