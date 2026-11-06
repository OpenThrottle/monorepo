import { TabsContent } from '@openthrottle/react-router-shadcn';
import { FEATURE_DELTA_PREVIEW } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useParams } from 'react-router';

import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import { TaskTrajectoriesSection } from '~/routing/evals/components/TaskTrajectoriesSection';

export interface TaskTrajectoriesTabProps {
  readonly className?: string;
  /** The task's recorded runs, as the task loader fetched them. */
  readonly trajectories: readonly AgentTrajectorySummaryFragment[];
}

/**
 * @description The task page's Trajectories tab panel, paired with
 * {@link TaskTrajectoriesTabTrigger}. Plan and task ids come from the route,
 * which the task loader has already reconciled with the task's own plan.
 * Renders nothing unless `FEATURE_DELTA_PREVIEW` is on.
 */
export const TaskTrajectoriesTab = (
  props: TaskTrajectoriesTabProps,
): React.ReactElement | null => {
  const { className, trajectories } = props;

  // Hooks
  const { planId = '', taskId = '' } = useParams();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!FEATURE_DELTA_PREVIEW) {
    return null;
  }

  return (
    <TabsContent className={className} value="trajectories">
      <TaskTrajectoriesSection
        planId={planId}
        taskId={taskId}
        trajectories={trajectories}
      />
    </TabsContent>
  );
};
