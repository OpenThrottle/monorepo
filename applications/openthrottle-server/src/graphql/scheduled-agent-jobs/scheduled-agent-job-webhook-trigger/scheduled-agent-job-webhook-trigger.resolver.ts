/**
 * @description GraphQL resolver for a scheduled agent job's webhook trigger: read the trigger and
 * its recent deliveries, create / update / rotate / delete it. Same permissions as the schedule
 * mutations (settings:read for reads, settings:write for writes) plus the same owner check. The
 * token and secret appear only in the payload of create and rotate, once.
 */
import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsGraphqlService } from '../scheduled-agent-jobs.service.ts';
import { assertScheduledAgentJobOwner } from '../scheduled-agent-jobs.utils.ts';
import {
  CreateScheduledAgentJobWebhookTriggerInputType,
  UpdateScheduledAgentJobWebhookTriggerInputType,
} from './scheduled-agent-job-webhook-trigger.input.ts';
import {
  toScheduledAgentJobWebhookDeliveryObject,
  toScheduledAgentJobWebhookTriggerCredentialsObject,
  toScheduledAgentJobWebhookTriggerObject,
} from './scheduled-agent-job-webhook-trigger.mapper.ts';
import {
  ScheduledAgentJobWebhookDeliveryObject,
  ScheduledAgentJobWebhookTriggerCredentialsObject,
  ScheduledAgentJobWebhookTriggerObject,
} from './scheduled-agent-job-webhook-trigger.object.ts';
import { ScheduledAgentJobWebhookTriggerService } from './scheduled-agent-job-webhook-trigger.service.ts';
import type { WebhookTriggerConfigDraft } from './scheduled-agent-job-webhook-trigger.types.ts';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobWebhookTriggerResolver {
  constructor(
    private readonly jobs: ScheduledAgentJobsGraphqlService,
    private readonly service: ScheduledAgentJobWebhookTriggerService,
  ) {}

  @Query(() => ScheduledAgentJobWebhookTriggerObject, {
    description: `The webhook trigger of a scheduled agent job, or null. Never returns the URL token or the secret, only tokenPrefix.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobWebhookTrigger(
    @Args('scheduledAgentJobId', { type: () => ID })
    scheduledAgentJobId: string,
  ): Promise<ScheduledAgentJobWebhookTriggerObject | null> {
    const trigger = await this.service.get(scheduledAgentJobId);

    return trigger === null
      ? null
      : toScheduledAgentJobWebhookTriggerObject(trigger);
  }

  @Query(() => [ScheduledAgentJobWebhookDeliveryObject], {
    description: `Recent webhook deliveries for a scheduled agent job, newest first, rejections included. Default 50, at most 200. Rows are kept for 7 days.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async scheduledAgentJobWebhookDeliveries(
    @Args('scheduledAgentJobId', { type: () => ID })
    scheduledAgentJobId: string,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ): Promise<ScheduledAgentJobWebhookDeliveryObject[]> {
    const deliveries = await this.service.listDeliveries(
      scheduledAgentJobId,
      limit,
    );

    return deliveries.map(toScheduledAgentJobWebhookDeliveryObject);
  }

  @Mutation(() => ScheduledAgentJobWebhookTriggerCredentialsObject, {
    description: `Create the webhook trigger of a scheduled agent job (owner only; one per job). Returns the URL path and the HMAC secret ONCE. Fails when WEBHOOK_SECRET_ENCRYPTION_KEY is not configured.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createScheduledAgentJobWebhookTrigger(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', {
      type: () => CreateScheduledAgentJobWebhookTriggerInputType,
    })
    input: CreateScheduledAgentJobWebhookTriggerInputType,
  ): Promise<ScheduledAgentJobWebhookTriggerCredentialsObject> {
    await this.assertOwner(input.scheduledAgentJobId, principal);
    const reveal = await this.service.create(
      input.scheduledAgentJobId,
      toDraft(input),
    );

    return toScheduledAgentJobWebhookTriggerCredentialsObject(
      reveal.trigger,
      reveal.token,
      reveal.secret,
    );
  }

  @Mutation(() => ScheduledAgentJobWebhookTriggerObject, {
    description: `Update a webhook trigger's configuration (owner only). The token and secret are untouched; omitted fields keep their value.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateScheduledAgentJobWebhookTrigger(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', {
      type: () => UpdateScheduledAgentJobWebhookTriggerInputType,
    })
    input: UpdateScheduledAgentJobWebhookTriggerInputType,
  ): Promise<ScheduledAgentJobWebhookTriggerObject> {
    await this.assertOwner(input.scheduledAgentJobId, principal);
    const trigger = await this.service.update(
      input.scheduledAgentJobId,
      toDraft(input),
    );

    return toScheduledAgentJobWebhookTriggerObject(trigger);
  }

  @Mutation(() => ScheduledAgentJobWebhookTriggerCredentialsObject, {
    description: `Rotate a webhook trigger (owner only): the token and secret are replaced together and the old URL stops working immediately. Returns the new URL path and secret ONCE.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async rotateScheduledAgentJobWebhookTrigger(
    @CurrentUser() principal: AuthPrincipal,
    @Args('scheduledAgentJobId', { type: () => ID })
    scheduledAgentJobId: string,
  ): Promise<ScheduledAgentJobWebhookTriggerCredentialsObject> {
    await this.assertOwner(scheduledAgentJobId, principal);
    const reveal = await this.service.rotate(scheduledAgentJobId);

    return toScheduledAgentJobWebhookTriggerCredentialsObject(
      reveal.trigger,
      reveal.token,
      reveal.secret,
    );
  }

  @Mutation(() => Boolean, {
    description: `Delete a job's webhook trigger and its delivery log (owner only). Returns whether one existed.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteScheduledAgentJobWebhookTrigger(
    @CurrentUser() principal: AuthPrincipal,
    @Args('scheduledAgentJobId', { type: () => ID })
    scheduledAgentJobId: string,
  ): Promise<boolean> {
    await this.assertOwner(scheduledAgentJobId, principal);

    return this.service.delete(scheduledAgentJobId);
  }

  private async assertOwner(
    scheduledAgentJobId: string,
    principal: AuthPrincipal,
  ): Promise<void> {
    const job = await this.jobs.get(scheduledAgentJobId);

    assertScheduledAgentJobOwner(job, scheduledAgentJobId, principal);
  }
}

const toDraft = (
  input: CreateScheduledAgentJobWebhookTriggerInputType,
): WebhookTriggerConfigDraft => {
  return {
    coalesceWindowMs: input.coalesceWindowMs,
    deliveryIdHeader: input.deliveryIdHeader,
    enabled: input.enabled,
    filters: input.filters?.map((filter) => {
      return {
        op: filter.op,
        path: filter.path,
        value: filter.value,
        values: filter.values,
      };
    }),
    maxInFlight: input.maxInFlight,
    rateLimitPerMinute: input.rateLimitPerMinute,
    signatureEncoding: input.signatureEncoding,
    signatureHeader: input.signatureHeader,
    signaturePreset: input.signaturePreset,
    timestampHeader: input.timestampHeader,
    timestampToleranceSeconds: input.timestampToleranceSeconds,
  };
};
