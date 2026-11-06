import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import { TrajectoryListItem } from '~/routing/evals/components/TrajectoryListItem';
import { TASK_TRAJECTORIES_COPY } from '~/routing/evals/data/data.copy';
import { sortTrajectoriesNewestFirst } from '~/routing/evals/utils/summaries';

export interface TaskTrajectoriesSectionProps {
  readonly className?: string;
  readonly planId: string;
  readonly taskId: string;
  /** The task's recorded runs, in server order (oldest first). */
  readonly trajectories: readonly AgentTrajectorySummaryFragment[];
}

/**
 * @description The task page's Trajectories tab (behind
 * `FEATURE_DELTA_PREVIEW`): every recorded run on this task, newest first,
 * each linking to the trajectory viewer. Empty until a run iteration finishes.
 */
export const TaskTrajectoriesSection = (
  props: TaskTrajectoriesSectionProps,
): React.ReactElement => {
  const { className, planId, taskId, trajectories } = props;

  // Hooks

  // Setup
  const ordered = sortTrajectoriesNewestFirst(trajectories);
  const basePath = `/plans/${planId}/tasks/${taskId}/trajectories`;

  // Handlers

  // Markup
  const empty = (
    <p
      className="text-muted-foreground text-sm"
      data-testid="TaskTrajectoriesEmpty"
    >
      {TASK_TRAJECTORIES_COPY.empty}
    </p>
  );
  const list = (
    <ul className="flex flex-col gap-3">
      {ordered.map((trajectory) => {
        return (
          <TrajectoryListItem
            href={`${basePath}/${trajectory.id}`}
            key={trajectory.id}
            trajectory={trajectory}
          />
        );
      })}
    </ul>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="task-trajectories-heading"
      className={cn('flex flex-col gap-4', className)}
      data-testid="TaskTrajectoriesSection"
    >
      <h2 className="text-lg font-semibold" id="task-trajectories-heading">
        {TASK_TRAJECTORIES_COPY.heading}
      </h2>
      {ordered.length === 0 ? empty : list}
    </section>
  );
};
