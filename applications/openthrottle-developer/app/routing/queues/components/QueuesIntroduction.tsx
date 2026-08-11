import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ListOrderedIcon } from 'lucide-react';

export interface QueuesIntroductionProps {
  className?: string;
}

/**
 * @description Queues dashboard header: title, a one-line description, and the live ops toolbar (search + refresh + create).
 */
export const QueuesIntroduction = (
  props: QueuesIntroductionProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className}>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={ListOrderedIcon}
        title="Queues"
      />
      <p
        className="text-muted-foreground text-sm"
        data-testid="queues-operational-hint"
      >
        Live view of your background worker queues — backlog, in-flight work,
        and failures at a glance. Open a queue to browse its jobs, or a job for
        its full payload, timeline, and recovery actions.
      </p>
    </div>
  );
};
