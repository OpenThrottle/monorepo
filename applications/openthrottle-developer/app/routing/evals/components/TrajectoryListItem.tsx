import { Badge, Button, cn } from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import {
  TASK_TRAJECTORIES_COPY,
  TRAJECTORY_SUMMARY_COPY,
} from '~/routing/evals/data/data.copy';
import { formatTrajectorySource } from '~/routing/evals/utils/formatters';
import { buildTrajectorySummaryFacts } from '~/routing/evals/utils/summaries';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';

export interface TrajectoryListItemProps {
  readonly className?: string;
  /** The viewer route for this trajectory. */
  readonly href: string;
  readonly trajectory: AgentTrajectorySummaryFragment;
}

/**
 * @description One recorded run on the task page: how it was captured,
 * driver and model, outcome, the run facts, when it was recorded, badges when
 * it is truncated or incomplete, and a link to read it in the viewer.
 */
export const TrajectoryListItem = (
  props: TrajectoryListItemProps,
): React.ReactElement => {
  const { className, href, trajectory } = props;

  // Hooks

  // Setup
  const copy = TRAJECTORY_SUMMARY_COPY;
  const facts = buildTrajectorySummaryFacts(trajectory);
  const isSession = trajectory.source === 'session_upload';

  // Handlers

  // Markup
  const truncated = (
    <Badge color="amber" size="xs">
      {copy.truncated}
    </Badge>
  );
  const incomplete = (
    <Badge color="amber" size="xs">
      {copy.incomplete}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn(
        'bg-card border-card-border flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center',
        className,
      )}
      data-testid="TrajectoryListItem"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={isSession ? 'violet' : 'sky'} size="xs">
            {formatTrajectorySource(trajectory.source)}
          </Badge>
          <span className="font-medium">{trajectory.driver}</span>
          <span className="text-muted-foreground font-mono text-xs">
            {trajectory.model ?? copy.noModel}
          </span>
          <Badge color="slate" size="xs">
            {trajectory.outcome ?? copy.noOutcome}
          </Badge>
          {trajectory.truncated ? truncated : null}
          {trajectory.incomplete ? incomplete : null}
        </div>
        <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {facts.map((fact) => {
            return (
              <div className="flex gap-1" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd className="text-foreground font-mono tabular-nums">
                  {fact.value}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <PlanRunTime
          className="text-muted-foreground text-xs"
          value={String(trajectory.createdAt)}
        />
        <Button asChild={true} size="sm" variant="outline">
          <Link to={href}>
            {TASK_TRAJECTORIES_COPY.open}
            <ChevronRightIcon />
          </Link>
        </Button>
      </div>
    </li>
  );
};
