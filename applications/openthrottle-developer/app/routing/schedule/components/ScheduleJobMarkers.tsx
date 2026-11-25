import { Badge } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/copy';

export interface ScheduleJobMarkersProps {
  readonly job: Pick<ScheduledJobCardFragment, 'approvalState' | 'createdVia'>;
}

/**
 * @description The small badges that say where a schedule came from and whether it may run yet:
 * "Agent-created" for a job an agent made through the MCP scheduling tools, and "Awaiting approval"
 * while it is stored disabled until a person approves it. Renders nothing for an ordinary job.
 */
export const ScheduleJobMarkers = (
  props: ScheduleJobMarkersProps,
): React.ReactElement | null => {
  const { job } = props;

  // Hooks

  // Setup
  const isAgentCreated = job.createdVia === 'mcp';
  const isPending = job.approvalState === 'pending';

  // Handlers

  // Markup
  const agentBadge = (
    <Badge
      color="violet"
      size="xs"
      title={SCHEDULE_APPROVAL_COPY.agentCreatedHint}
    >
      {SCHEDULE_APPROVAL_COPY.agentCreatedBadge}
    </Badge>
  );
  const pendingBadge = (
    <Badge color="amber" size="xs">
      {SCHEDULE_APPROVAL_COPY.awaitingBadge}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!isAgentCreated && !isPending) {
    return null;
  }

  return (
    <span
      className="inline-flex flex-wrap items-center gap-1"
      data-testid="ScheduleJobMarkers"
    >
      {isAgentCreated ? agentBadge : null}
      {isPending ? pendingBadge : null}
    </span>
  );
};
