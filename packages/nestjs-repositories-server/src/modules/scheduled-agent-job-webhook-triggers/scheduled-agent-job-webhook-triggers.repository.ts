import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { ScheduledAgentJobWebhookTrigger } from './scheduled-agent-job-webhook-trigger.entity.ts';
import type {
  CreateScheduledAgentJobWebhookTriggerInput,
  ScheduledAgentJobWebhookTriggerConfig,
  ScheduledAgentJobWebhookTriggerCredentials,
} from './scheduled-agent-job-webhook-triggers.types.ts';

/**
 * @description Data access for the openthrottle `scheduled_agent_job_webhook_triggers` table on the
 * default connection: the `BaseRepository` CRUD plus the lookups ingress and the GraphQL surface
 * need. Typed persistence only; secret encryption, validation and admission live in the server.
 * @public
 */
@Injectable()
export class ScheduledAgentJobWebhookTriggersRepository extends BaseRepository<
  ScheduledAgentJobWebhookTrigger,
  CreateModelInput<ScheduledAgentJobWebhookTrigger>
> {
  protected readonly tableName = 'scheduled_agent_job_webhook_triggers';

  constructor(
    @InjectRepository(ScheduledAgentJobWebhookTrigger)
    repository: Repository<ScheduledAgentJobWebhookTrigger>,
  ) {
    super(repository);
  }

  /** @description Insert a trigger. A second trigger for one job violates the unique key. */
  async createTrigger(
    input: CreateScheduledAgentJobWebhookTriggerInput,
  ): Promise<ScheduledAgentJobWebhookTrigger> {
    const draft = this.repository.create({
      coalesceWindowMs: input.coalesceWindowMs,
      deliveryIdHeader: input.deliveryIdHeader,
      enabled: input.enabled,
      filters: input.filters,
      maxInFlight: input.maxInFlight,
      rateLimitPerMinute: input.rateLimitPerMinute,
      scheduledAgentJobId: input.scheduledAgentJobId,
      secretCiphertext: input.secretCiphertext,
      signatureEncoding: input.signatureEncoding,
      signatureHeader: input.signatureHeader,
      signaturePreset: input.signaturePreset,
      timestampHeader: input.timestampHeader,
      timestampToleranceSeconds: input.timestampToleranceSeconds,
      tokenHash: input.tokenHash,
      tokenPrefix: input.tokenPrefix,
    });

    return this.repository.save(draft);
  }

  /** @description Remove a job's trigger (its deliveries cascade). Returns whether a row was removed. */
  async deleteTriggerForJob(scheduledAgentJobId: string): Promise<boolean> {
    const result = await this.repository.delete({ scheduledAgentJobId });

    return (result.affected ?? 0) > 0;
  }

  /** @description The trigger of a job, or null. */
  async findTriggerByJobId(
    scheduledAgentJobId: string,
  ): Promise<ScheduledAgentJobWebhookTrigger | null> {
    return this.findOne({ where: { scheduledAgentJobId } });
  }

  /** @description The trigger whose URL token hashes to `tokenHash`, or null. */
  async findTriggerByTokenHash(
    tokenHash: Buffer,
  ): Promise<ScheduledAgentJobWebhookTrigger | null> {
    return this.findOne({ where: { tokenHash } });
  }

  /**
   * @description Replace the token and secret together; the old URL stops working immediately.
   * Returns the refreshed row, or null when the trigger no longer exists.
   */
  async rotateTrigger(
    id: string,
    credentials: ScheduledAgentJobWebhookTriggerCredentials,
  ): Promise<ScheduledAgentJobWebhookTrigger | null> {
    await this.repository.update(
      { id },
      {
        rotatedAt: new Date(),
        secretCiphertext: credentials.secretCiphertext,
        tokenHash: credentials.tokenHash,
        tokenPrefix: credentials.tokenPrefix,
      },
    );

    return this.findOne({ where: { id } });
  }

  /** @description Overwrite a trigger's configuration (never its token or secret). */
  async updateTriggerConfig(
    id: string,
    config: ScheduledAgentJobWebhookTriggerConfig,
  ): Promise<ScheduledAgentJobWebhookTrigger | null> {
    await this.repository.update(
      { id },
      {
        coalesceWindowMs: config.coalesceWindowMs,
        deliveryIdHeader: config.deliveryIdHeader,
        enabled: config.enabled,
        filters: config.filters,
        maxInFlight: config.maxInFlight,
        rateLimitPerMinute: config.rateLimitPerMinute,
        signatureEncoding: config.signatureEncoding,
        signatureHeader: config.signatureHeader,
        signaturePreset: config.signaturePreset,
        timestampHeader: config.timestampHeader,
        timestampToleranceSeconds: config.timestampToleranceSeconds,
      },
    );

    return this.findOne({ where: { id } });
  }
}
