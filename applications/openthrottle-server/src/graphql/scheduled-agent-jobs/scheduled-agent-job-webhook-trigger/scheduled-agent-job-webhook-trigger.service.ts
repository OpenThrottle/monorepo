import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  isUniqueViolation,
  resolvePagination,
} from '@openthrottle/nestjs-postgres';
import type {
  ScheduledAgentJobWebhookDelivery,
  ScheduledAgentJobWebhookTrigger,
} from '@openthrottle/nestjs-repositories-server';
import {
  ScheduledAgentJobWebhookDeliveriesRepository,
  ScheduledAgentJobWebhookTriggersRepository,
} from '@openthrottle/nestjs-repositories-server';

import {
  WEBHOOK_DELIVERIES_DEFAULT_LIMIT,
  WEBHOOK_DELIVERIES_MAX_LIMIT,
} from '../../../modules/agent-job-webhooks/agent-job-webhooks.constants.ts';
import {
  encryptWebhookSecret,
  generateWebhookSecret,
  resolveWebhookEncryptionKey,
} from '../../../modules/agent-job-webhooks/secret-crypto/secret-crypto.utils.ts';
import { generateWebhookToken } from '../../../modules/agent-job-webhooks/token/token.utils.ts';
import type {
  WebhookTriggerConfigDraft,
  WebhookTriggerReveal,
} from './scheduled-agent-job-webhook-trigger.types.ts';
import { resolveWebhookTriggerConfig } from './scheduled-agent-job-webhook-trigger.utils.ts';

/**
 * @description Webhook-trigger administration for the GraphQL surface: create, config update,
 * rotate and delete a job's trigger, plus reading it and its delivery log. Mints the URL token and
 * HMAC secret (stored hashed and AES-256-GCM encrypted) and hands the plaintext back exactly once.
 * With no valid `WEBHOOK_SECRET_ENCRYPTION_KEY` it refuses to create or rotate, so a secret is
 * never stored in plaintext. Ownership is checked by the resolver.
 */
@Injectable()
export class ScheduledAgentJobWebhookTriggerService {
  constructor(
    private readonly deliveries: ScheduledAgentJobWebhookDeliveriesRepository,
    private readonly triggers: ScheduledAgentJobWebhookTriggersRepository,
  ) {}

  get(
    scheduledAgentJobId: string,
  ): Promise<ScheduledAgentJobWebhookTrigger | null> {
    return this.triggers.findTriggerByJobId(scheduledAgentJobId);
  }

  listDeliveries(
    scheduledAgentJobId: string,
    limit: number | null | undefined,
  ): Promise<ScheduledAgentJobWebhookDelivery[]> {
    const { take: bounded } = resolvePagination(
      { limit },
      {
        defaultLimit: WEBHOOK_DELIVERIES_DEFAULT_LIMIT,
        max: WEBHOOK_DELIVERIES_MAX_LIMIT,
      },
    );

    return this.deliveries.listDeliveriesForJob(scheduledAgentJobId, bounded);
  }

  /** @description Create the job's trigger (at most one per job). */
  async create(
    scheduledAgentJobId: string,
    draft: WebhookTriggerConfigDraft,
  ): Promise<WebhookTriggerReveal> {
    const key = this.requireKey();

    if (
      (await this.triggers.findTriggerByJobId(scheduledAgentJobId)) !== null
    ) {
      throw new ConflictException(`This job already has a webhook trigger. Update or rotate it instead.`); // prettier-ignore
    }

    const resolved = resolveWebhookTriggerConfig(draft, null);

    if (!resolved.ok) {
      throw new BadRequestException(resolved.message);
    }

    const minted = generateWebhookToken();
    const secret = generateWebhookSecret();

    try {
      const trigger = await this.triggers.createTrigger({
        ...resolved.config,
        scheduledAgentJobId,
        secretCiphertext: encryptWebhookSecret(secret, key),
        tokenHash: minted.tokenHash,
        tokenPrefix: minted.tokenPrefix,
      });

      return { secret, token: minted.token, trigger };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`This job already has a webhook trigger. Update or rotate it instead.`); // prettier-ignore
      }

      throw error;
    }
  }

  /** @description Update configuration only; the token and secret are untouched. */
  async update(
    scheduledAgentJobId: string,
    draft: WebhookTriggerConfigDraft,
  ): Promise<ScheduledAgentJobWebhookTrigger> {
    const existing = await this.requireTrigger(scheduledAgentJobId);
    const resolved = resolveWebhookTriggerConfig(draft, existing);

    if (!resolved.ok) {
      throw new BadRequestException(resolved.message);
    }

    const updated = await this.triggers.updateTriggerConfig(
      existing.id,
      resolved.config,
    );

    if (updated === null) {
      throw new NotFoundException(
        `Webhook trigger for job ${scheduledAgentJobId} not found`,
      );
    }

    return updated;
  }

  /** @description Replace the token and secret together; the old URL stops working immediately. */
  async rotate(scheduledAgentJobId: string): Promise<WebhookTriggerReveal> {
    const key = this.requireKey();
    const existing = await this.requireTrigger(scheduledAgentJobId);
    const minted = generateWebhookToken();
    const secret = generateWebhookSecret();

    const trigger = await this.triggers.rotateTrigger(existing.id, {
      secretCiphertext: encryptWebhookSecret(secret, key),
      tokenHash: minted.tokenHash,
      tokenPrefix: minted.tokenPrefix,
    });

    if (trigger === null) {
      throw new NotFoundException(
        `Webhook trigger for job ${scheduledAgentJobId} not found`,
      );
    }

    return { secret, token: minted.token, trigger };
  }

  /** @description Delete the job's trigger and its delivery log. Returns whether one existed. */
  delete(scheduledAgentJobId: string): Promise<boolean> {
    return this.triggers.deleteTriggerForJob(scheduledAgentJobId);
  }

  /** @description The encryption key, or a clear 503 when it is missing or malformed (fail closed). */
  private requireKey(): Buffer {
    const result = resolveWebhookEncryptionKey(process.env);

    if (!result.ok) {
      throw new ServiceUnavailableException(
        `Webhook triggers are unavailable: ${result.message}`,
      );
    }

    return result.key;
  }

  private async requireTrigger(
    scheduledAgentJobId: string,
  ): Promise<ScheduledAgentJobWebhookTrigger> {
    const trigger = await this.triggers.findTriggerByJobId(scheduledAgentJobId);

    if (trigger === null) {
      throw new NotFoundException(
        `Job ${scheduledAgentJobId} has no webhook trigger`,
      );
    }

    return trigger;
  }
}
