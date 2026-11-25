import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';

export interface ScheduleWebhookRenderedPromptProps {
  /** The exact prompt the run started with; null when none was rendered. */
  readonly prompt: string | null | undefined;
}

/**
 * @description The rendered prompt of one webhook delivery, collapsed by default and expanded on
 * demand. Monospace with whitespace preserved, because the prompt carries the nonce-tagged payload
 * blocks exactly as the agent received them. The prompt is already redacted by the server.
 */
export const ScheduleWebhookRenderedPrompt = (
  props: ScheduleWebhookRenderedPromptProps,
): React.ReactElement => {
  const { prompt } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const toggleLabel = open
    ? SCHEDULE_WEBHOOK_COPY.deliveriesPromptHide
    : SCHEDULE_WEBHOOK_COPY.deliveriesPromptShow;

  // Handlers

  // Markup
  const none = (
    <span className="text-muted-foreground text-xs">
      {SCHEDULE_WEBHOOK_COPY.deliveriesNoPrompt}
    </span>
  );
  const promptBlock = (
    <pre
      className="bg-muted mt-2 max-h-96 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap"
      data-testid="ScheduleWebhookRenderedPromptText"
    >
      {prompt}
    </pre>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (prompt == null) {
    return none;
  }

  return (
    <div data-testid="ScheduleWebhookRenderedPrompt">
      <Button
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        size="xs"
        type="button"
        variant="outline"
      >
        {toggleLabel}
      </Button>
      {open ? promptBlock : null}
    </div>
  );
};
