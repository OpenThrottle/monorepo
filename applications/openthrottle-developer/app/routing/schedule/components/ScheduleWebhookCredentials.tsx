import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import { buildWebhookUrl } from '~/routing/schedule/utils/buildWebhookUrl';
import type { WebhookCredentials } from '~/routing/schedule/utils/getWebhookCredentials';

export interface ScheduleWebhookCredentialsProps {
  readonly credentials: WebhookCredentials;
  readonly onDismiss: () => void;
}

/**
 * @description The one-time reveal of a webhook's URL and signing secret, shown right after create
 * or rotate. The server returns the URL path and the secret exactly once, so this is the only place
 * they are ever visible: each has a copy button, and a warning says they will not be shown again.
 * The full URL is the API's public origin (`window.env.API_URL_EXTERNAL`) plus the returned path.
 */
export const ScheduleWebhookCredentials = (
  props: ScheduleWebhookCredentialsProps,
): React.ReactElement => {
  const { credentials, onDismiss } = props;

  // Hooks

  // Setup
  const origin =
    typeof window === 'undefined' ? undefined : window.env?.API_URL_EXTERNAL;
  const url = buildWebhookUrl(origin, credentials.webhookPath);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Alert data-testid="ScheduleWebhookCredentials" role="alert">
      <AlertTitle>{SCHEDULE_WEBHOOK_COPY.revealHeading}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{SCHEDULE_WEBHOOK_COPY.revealWarning}</p>

        <div className="flex flex-col gap-1">
          <Label htmlFor="webhook-reveal-url">
            {SCHEDULE_WEBHOOK_COPY.revealUrlLabel}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              className="font-mono text-xs"
              id="webhook-reveal-url"
              readOnly={true}
              value={url}
            />
            <OpenThrottleClipboard
              label={`${SCHEDULE_WEBHOOK_COPY.copyAction} URL`}
              text={url}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="webhook-reveal-secret">
            {SCHEDULE_WEBHOOK_COPY.revealSecretLabel}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              className="font-mono text-xs"
              id="webhook-reveal-secret"
              readOnly={true}
              value={credentials.secret}
            />
            <OpenThrottleClipboard
              label={`${SCHEDULE_WEBHOOK_COPY.copyAction} secret`}
              text={credentials.secret}
            />
          </div>
        </div>

        <div>
          <Button onClick={onDismiss} size="xs" type="button" variant="outline">
            {SCHEDULE_WEBHOOK_COPY.revealDismiss}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
