import { cn } from '@openthrottle/react-router-shadcn';
import { Inbox } from 'lucide-react';
import * as React from 'react';

import type {
  PlanInboxMessageFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';
import { PlanInboxComposer } from '~/routing/plans/components/PlanInboxComposer';
import { PlanInboxMessageRow } from '~/routing/plans/components/PlanInboxMessageRow';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';

export interface PlanInboxPanelProps {
  readonly className?: string;
  /** True while a run is queued or in progress — the only time the composer shows. */
  readonly isLive: boolean;
  readonly messages: readonly PlanInboxMessageFragment[];
  readonly planId: string;
  readonly tasks: readonly PlanTaskRowFragment[];
}

/**
 * @description The plan's inbox for live runs: a composer to steer or queue a
 * message while a run is live, and every message sent with its delivery status.
 * Hidden entirely on a plan that is not running and has never been messaged,
 * so idle plans carry no extra chrome.
 */
export const PlanInboxPanel = (
  props: PlanInboxPanelProps,
): React.ReactElement | null => {
  const { className, isLive, messages, planId, tasks } = props;

  // Hooks
  const taskTitleById = React.useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title])),
    [tasks],
  );

  // Setup
  const hasMessages = messages.length > 0;

  // Handlers

  // Markup
  const messageList = (
    <ul aria-label={PLAN_INBOX_COPY.heading} className="flex flex-col">
      {messages.map((message) => (
        <PlanInboxMessageRow
          deliveredToTaskTitle={
            message.deliveredToTaskId != null
              ? taskTitleById.get(message.deliveredToTaskId)
              : undefined
          }
          key={message.id}
          message={message}
          planId={planId}
        />
      ))}
    </ul>
  );
  const emptyHint = (
    <p className="text-muted-foreground text-xs">{PLAN_INBOX_COPY.emptyLive}</p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!isLive && !hasMessages) {
    return null;
  }

  return (
    <section
      aria-labelledby="plan-inbox-heading"
      className={cn(
        'bg-card border-card-border flex flex-col gap-3 rounded-lg border p-4',
        className,
      )}
      data-testid="PlanInboxPanel"
    >
      <header className="flex flex-col gap-1">
        <h2
          className="flex items-center gap-2 text-sm font-semibold"
          id="plan-inbox-heading"
        >
          <Inbox aria-hidden={true} className="size-4" />
          {PLAN_INBOX_COPY.heading}
        </h2>
        <p className="text-muted-foreground text-xs">
          {isLive ? PLAN_INBOX_COPY.description : PLAN_INBOX_COPY.notLiveHint}
        </p>
      </header>
      {isLive ? <PlanInboxComposer planId={planId} tasks={tasks} /> : null}
      {hasMessages ? messageList : emptyHint}
    </section>
  );
};
