import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ListOrderedIcon } from 'lucide-react';

export interface QueuesIntroductionProps {
  className?: string;
}

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
      <GlobalHeading heading="h1" icon={ListOrderedIcon} title="Queues">
        {/* <QueuesToolbar queues={queues} /> */}
      </GlobalHeading>
      <p
        className="text-muted-foreground mt-4 text-sm"
        data-testid="queues-operational-hint"
      >
        Worker queues (BullMQ). Open a queue to browse jobs; open a job for full
        payload JSON, correlation id, retry when failed, cancel plan run when
        the payload includes a plan id, and a copyable support bundle.
      </p>
    </div>
  );
};
