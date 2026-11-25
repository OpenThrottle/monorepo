import * as React from 'react';

import type { ScheduleWebhookTriggerFragment } from '~/__generated__/graphql';
import { ScheduleWebhookCredentials } from '~/routing/schedule/components/ScheduleWebhookCredentials';
import { ScheduleWebhookForm } from '~/routing/schedule/components/ScheduleWebhookForm';
import { ScheduleWebhookStatusBar } from '~/routing/schedule/components/ScheduleWebhookStatusBar';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import type { WebhookCredentials } from '~/routing/schedule/utils/getWebhookCredentials';

export interface ScheduleWebhookTabProps {
  /** One-time URL path and secret to reveal; undefined once dismissed or never created. */
  readonly credentials: WebhookCredentials | undefined;
  readonly error: string | undefined;
  readonly jobId: string;
  readonly onDismissCredentials: () => void;
  /** The job's webhook trigger, or null when none has been set up. */
  readonly trigger: ScheduleWebhookTriggerFragment | null;
}

/**
 * @description The Webhook tab on the schedule detail route. A trigger is created for an existing
 * job, so setup lives on the detail page rather than the create form. With no trigger it offers
 * setup; with one it shows its state (token prefix only, never the token), the edit form, the
 * delivery-log link, and rotate / delete behind a confirm. The threat-model guidance is always
 * visible, because a webhook feeds untrusted text to an agent that can run commands.
 */
export const ScheduleWebhookTab = (
  props: ScheduleWebhookTabProps,
): React.ReactElement => {
  const { credentials, error, jobId, onDismissCredentials, trigger } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-4" data-testid="ScheduleWebhookTab">
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_WEBHOOK_COPY.intro}
      </p>

      <div className="bg-muted/50 rounded-md border p-3 text-sm">
        <h3 className="mb-1 font-medium">
          {SCHEDULE_WEBHOOK_COPY.threatHeading}
        </h3>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          {SCHEDULE_WEBHOOK_COPY.threatPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      {credentials !== undefined && (
        <ScheduleWebhookCredentials
          credentials={credentials}
          onDismiss={onDismissCredentials}
        />
      )}
      {trigger !== null && (
        <ScheduleWebhookStatusBar jobId={jobId} trigger={trigger} />
      )}

      <ScheduleWebhookForm
        error={error}
        key={trigger?.id ?? 'new'}
        trigger={trigger ?? undefined}
      />
      <p className="text-muted-foreground text-xs">
        {SCHEDULE_WEBHOOK_COPY.disabledScheduleHint}
      </p>
    </div>
  );
};
