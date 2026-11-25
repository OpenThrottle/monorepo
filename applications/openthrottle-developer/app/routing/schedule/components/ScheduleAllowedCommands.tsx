import * as React from 'react';

import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleAllowedCommandsProps {
  readonly job: Pick<ScheduledJobCardFragment, 'allowedCommands'>;
}

/**
 * @description The shell commands a schedule's headless run may execute without a permission
 * prompt. Shown on the detail page and inside the approval notice, so a person approving an
 * agent-created job sees exactly what it may run. Renders nothing for an empty list.
 */
export const ScheduleAllowedCommands = (
  props: ScheduleAllowedCommandsProps,
): React.ReactElement | null => {
  const { job } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (job.allowedCommands.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1" data-testid="ScheduleAllowedCommands">
      <p className="text-muted-foreground text-sm">
        {SCHEDULE_APPROVAL_COPY.allowedCommandsLabel}
      </p>
      <ul
        aria-label={SCHEDULE_APPROVAL_COPY.allowedCommandsLabel}
        className="flex flex-col gap-1"
      >
        {job.allowedCommands.map((command) => {
          return (
            <li key={command}>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                {command}
              </code>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
