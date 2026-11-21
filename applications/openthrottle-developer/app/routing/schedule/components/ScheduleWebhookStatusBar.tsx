import { Badge, Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { ScheduleWebhookTriggerFragment } from '~/__generated__/graphql';
import { ScheduleWebhookConfirmAction } from '~/routing/schedule/components/ScheduleWebhookConfirmAction';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { formatWhen } from '~/routing/schedule/utils/formatWhen';

export interface ScheduleWebhookStatusBarProps {
  readonly jobId: string;
  readonly trigger: ScheduleWebhookTriggerFragment;
}

/**
 * @description The state line of an existing webhook trigger: on or off, which URL token it is (the
 * first six characters only, since the token is never shown again), when it was last rotated, the
 * delivery-log link, and rotate / delete, each behind a confirm.
 */
export const ScheduleWebhookStatusBar = (
  props: ScheduleWebhookStatusBarProps,
): React.ReactElement => {
  const { jobId, trigger } = props;

  // Hooks

  // Setup
  const stateLabel = trigger.enabled
    ? SCHEDULE_WEBHOOK_COPY.statusEnabled
    : SCHEDULE_WEBHOOK_COPY.statusDisabled;

  // Handlers

  // Markup
  const rotatedNote = (
    <span className="text-muted-foreground">
      {SCHEDULE_WEBHOOK_COPY.rotatedLabel} {formatWhen(trigger.rotatedAt)}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-3 text-sm"
      data-testid="ScheduleWebhookStatusBar"
    >
      <Badge color={trigger.enabled ? 'green' : 'yellow'} size="xs">
        {stateLabel}
      </Badge>
      <span className="text-muted-foreground">
        {SCHEDULE_WEBHOOK_COPY.tokenPrefixLabel}{' '}
        <code className="font-mono">{trigger.tokenPrefix}…</code>
      </span>
      {trigger.rotatedAt ? rotatedNote : null}
      <Button asChild={true} size="xs" variant="outline">
        <Link to={`/schedule/${jobId}/deliveries`}>
          {SCHEDULE_WEBHOOK_COPY.deliveriesAction}
        </Link>
      </Button>
      <ScheduleWebhookConfirmAction
        confirmLabel={SCHEDULE_WEBHOOK_COPY.rotateConfirm}
        description={SCHEDULE_WEBHOOK_COPY.rotateDescription}
        intent="webhook-rotate"
        title={SCHEDULE_WEBHOOK_COPY.rotateTitle}
        triggerLabel={SCHEDULE_WEBHOOK_COPY.rotateAction}
        variant="outline"
      />
      <ScheduleWebhookConfirmAction
        confirmLabel={SCHEDULE_WEBHOOK_COPY.deleteConfirm}
        description={SCHEDULE_WEBHOOK_COPY.deleteDescription}
        intent="webhook-delete"
        title={SCHEDULE_WEBHOOK_COPY.deleteTitle}
        triggerLabel={SCHEDULE_WEBHOOK_COPY.deleteAction}
        variant="destructive"
      />
    </div>
  );
};
