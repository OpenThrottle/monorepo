import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  AgentTrajectoryLabelRowFragment,
  AgentTrajectorySummaryFragment,
} from '~/__generated__/graphql';
import { TrajectoryErrors } from '~/routing/evals/components/TrajectoryErrors';
import { TrajectoryFinalMetrics } from '~/routing/evals/components/TrajectoryFinalMetrics';
import { TrajectoryHeader } from '~/routing/evals/components/TrajectoryHeader';
import { TrajectoryLabelPanel } from '~/routing/evals/components/TrajectoryLabelPanel';
import { TrajectoryTimeline } from '~/routing/evals/components/TrajectoryTimeline';
import { TRAJECTORY_VIEWER_COPY } from '~/routing/evals/data/data.copy';
import type { AtifTrajectory } from '~/routing/evals/types';
import {
  buildTrajectoryTimeline,
  readTrajectoryErrors,
} from '~/routing/evals/utils/timeline';

export interface TrajectoryViewerRouteProps {
  readonly className?: string;
  readonly labels: {
    readonly mine: AgentTrajectoryLabelRowFragment | null;
    readonly others: readonly AgentTrajectoryLabelRowFragment[];
  };
  readonly planId: string;
  readonly summary: AgentTrajectorySummaryFragment;
  readonly taskId: string;
  /** The parsed ATIF document; `null` when it could not be read. */
  readonly trajectory: AtifTrajectory | null;
}

/**
 * @description The trajectory viewer body: header, run errors, the step
 * timeline and final metrics on the left; the label panel beside it (below
 * it on narrow screens). The route module delegates its happy path here.
 */
export const TrajectoryViewerRoute = (
  props: TrajectoryViewerRouteProps,
): React.ReactElement => {
  const { className, labels, planId, summary, taskId, trajectory } = props;

  // Hooks
  const timeline = React.useMemo(() => {
    return trajectory ? buildTrajectoryTimeline(trajectory) : null;
  }, [trajectory]);

  // Setup
  const copy = TRAJECTORY_VIEWER_COPY;
  const errors = trajectory ? readTrajectoryErrors(trajectory) : [];
  const taskHref = `/plans/${planId}/tasks/${taskId}?tab=trajectories`;

  // Handlers

  // Markup
  const unreadable = (
    <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
      {copy.unreadable}
    </p>
  );
  const steps = (
    <section aria-labelledby="trajectory-timeline-heading">
      <h2 className="mb-1 text-sm font-medium" id="trajectory-timeline-heading">
        {copy.timelineHeading}
      </h2>
      {timeline ? <TrajectoryTimeline timeline={timeline} /> : null}
    </section>
  );
  const metrics = (
    <TrajectoryFinalMetrics finalMetrics={trajectory?.final_metrics} />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className={cn('flex w-full flex-col gap-6 p-4 md:p-8 lg:p-12', className)}
    >
      <TrajectoryHeader
        summary={summary}
        taskHref={taskHref}
        trajectory={trajectory}
      />

      <div
        className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]"
        data-testid="TrajectoryViewerRoute"
      >
        <div className="flex min-w-0 flex-col gap-6">
          {errors.length > 0 ? <TrajectoryErrors errors={errors} /> : null}
          {trajectory ? steps : unreadable}
          {trajectory ? metrics : null}
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <TrajectoryLabelPanel labels={labels} />
        </aside>
      </div>
    </GlobalScreen>
  );
};
