import * as React from 'react';

import { SCHEDULE_WEBHOOK_SIGNING_COPY } from '~/routing/schedule/data/copy';

interface SigningGuide {
  readonly heading: string;
  readonly steps: readonly string[];
}

export interface ScheduleWebhookSigningGuideProps {
  /** The selected preset: `generic`, `github` or `custom`. */
  readonly preset: string;
}

/**
 * @description What the sender must do to produce a signature the server accepts, for the selected
 * preset: which header carries it, what is signed, and what stops a replay. Every webhook requires an
 * HMAC-SHA256 signature; there is no unsigned mode.
 */
export const ScheduleWebhookSigningGuide = (
  props: ScheduleWebhookSigningGuideProps,
): React.ReactElement => {
  const { preset } = props;

  // Hooks

  // Setup
  const guides: Record<string, SigningGuide> = SCHEDULE_WEBHOOK_SIGNING_COPY;
  const guide = guides[preset] ?? SCHEDULE_WEBHOOK_SIGNING_COPY.generic;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="bg-muted/50 rounded-md border p-3 text-sm"
      data-testid="ScheduleWebhookSigningGuide"
    >
      <h3 className="mb-1 font-medium">{guide.heading}</h3>
      <ol className="text-muted-foreground list-decimal space-y-1 pl-5">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
};
