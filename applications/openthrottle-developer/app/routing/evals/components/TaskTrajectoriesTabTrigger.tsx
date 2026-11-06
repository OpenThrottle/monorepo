import { cn, TabsTrigger } from '@openthrottle/react-router-shadcn';
import { FEATURE_DELTA_PREVIEW } from '@openthrottle/react-router-utils';
import { RouteIcon } from 'lucide-react';
import * as React from 'react';

import { TASK_TRAJECTORIES_COPY } from '~/routing/evals/data/data.copy';

export interface TaskTrajectoriesTabTriggerProps {
  readonly className?: string;
}

/**
 * @description The task page's Trajectories tab trigger, paired with
 * {@link TaskTrajectoriesTab}. Renders nothing unless `FEATURE_DELTA_PREVIEW` is on.
 */
export const TaskTrajectoriesTabTrigger = (
  props: TaskTrajectoriesTabTriggerProps,
): React.ReactElement | null => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!FEATURE_DELTA_PREVIEW) {
    return null;
  }

  return (
    <TabsTrigger
      className={cn('flex-0 cursor-pointer', className)}
      id="task-tab-trajectories"
      value="trajectories"
    >
      <RouteIcon />
      {TASK_TRAJECTORIES_COPY.tab}
    </TabsTrigger>
  );
};
