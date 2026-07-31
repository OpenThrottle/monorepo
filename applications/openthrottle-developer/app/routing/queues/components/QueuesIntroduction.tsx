import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { ListOrderedIcon, PlusIcon } from 'lucide-react';
import { QueueOpsToolbar } from '~/routing/queues/components/QueueOpsToolbar';

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
      <GlobalHeading heading="h1" icon={ListOrderedIcon} title="Queues" />
      <p
        className="text-muted-foreground mt-2 mb-4 text-sm"
        data-testid="queues-operational-hint"
      >
        Live view of your background worker queues — backlog, in-flight work,
        and failures at a glance. Open a queue to browse its jobs, or a job for
        its full payload, timeline, and recovery actions.
      </p>
      <QueueOpsToolbar
        actions={
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/queues/create">
              <PlusIcon className="h-4 w-4" /> Create queue
            </Link>
          </Button>
        }
        searchAriaLabel="Search queues"
        searchPlaceholder="Search queues"
      />
    </div>
  );
};
