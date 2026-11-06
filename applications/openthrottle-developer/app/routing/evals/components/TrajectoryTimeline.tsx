import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { TrajectoryStep } from '~/routing/evals/components/TrajectoryStep';
import { TrajectorySubagent } from '~/routing/evals/components/TrajectorySubagent';
import { TRAJECTORY_STEP_BATCH_SIZE } from '~/routing/evals/config/defaults';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import { useTrajectoryStepWindow } from '~/routing/evals/hooks/useTrajectoryStepWindow';
import type { TrajectoryTimelineView } from '~/routing/evals/types';

export interface TrajectoryTimelineProps {
  readonly className?: string;
  readonly timeline: TrajectoryTimelineView;
}

/**
 * @description Every step of a trajectory in order, rendered in batches of
 * {@link TRAJECTORY_STEP_BATCH_SIZE} with "show more" / "show all" controls.
 * Subagents that no tool call's result mentions follow in their own section,
 * so none is dropped. Subagent timelines reuse this component.
 */
export const TrajectoryTimeline = (
  props: TrajectoryTimelineProps,
): React.ReactElement => {
  const { className, timeline } = props;
  const { steps, unplacedSubagents } = timeline;

  // Hooks
  const { hasMore, onShowAll, onShowMore, visibleCount } =
    useTrajectoryStepWindow({
      batchSize: TRAJECTORY_STEP_BATCH_SIZE,
      total: steps.length,
    });

  // Setup
  const copy = TRAJECTORY_TIMELINE_COPY;
  const visibleSteps = steps.slice(0, visibleCount);

  // Handlers

  // Markup
  const more = (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <span className="text-muted-foreground text-xs tabular-nums">
        {`${visibleCount} ${copy.stepsShown} ${steps.length}`}
      </span>
      <Button onClick={onShowMore} size="sm" type="button" variant="outline">
        {copy.showMoreSteps}
      </Button>
      <Button onClick={onShowAll} size="sm" type="button" variant="ghost">
        {copy.showAllSteps}
      </Button>
    </div>
  );
  const subagents = (
    <section className="flex flex-col gap-2 pt-4">
      <h3 className="text-sm font-medium">{copy.subagentsHeading}</h3>
      <p className="text-muted-foreground text-xs">{copy.subagentsHint}</p>
      {unplacedSubagents.map((subagent, index) => {
        return (
          <TrajectorySubagent
            key={subagent.trajectory_id ?? `subagent-${index}`}
            subagent={subagent}
          />
        );
      })}
    </section>
  );
  const empty = <p className="text-muted-foreground text-sm">{copy.noSteps}</p>;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col', className)}
      data-testid="TrajectoryTimeline"
    >
      {steps.length === 0 ? empty : null}
      <ol className="flex flex-col">
        {visibleSteps.map((view, index) => {
          return (
            <TrajectoryStep key={`${view.step.step_id}-${index}`} view={view} />
          );
        })}
      </ol>
      {hasMore ? more : null}
      {unplacedSubagents.length > 0 ? subagents : null}
    </div>
  );
};
