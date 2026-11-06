import { Badge, Button, cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ChevronLeftIcon, RouteIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { AgentTrajectorySummaryFragment } from '~/__generated__/graphql';
import {
  TRAJECTORY_SUMMARY_COPY,
  TRAJECTORY_VIEWER_COPY,
} from '~/routing/evals/data/data.copy';
import type { AtifTrajectory } from '~/routing/evals/types';
import {
  formatTrajectoryAgent,
  formatTrajectorySource,
} from '~/routing/evals/utils/formatters';
import { buildTrajectorySummaryFacts } from '~/routing/evals/utils/summaries';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';

export interface TrajectoryHeaderProps {
  readonly className?: string;
  readonly summary: AgentTrajectorySummaryFragment;
  /** The task page's Trajectories tab, for the back link. */
  readonly taskHref: string;
  /** The parsed document; `null` when it could not be read, so the summary stands alone. */
  readonly trajectory: AtifTrajectory | null;
}

/**
 * @description The viewer header: the agent (name and version from the
 * document, else the driver), model, how it was captured, outcome, the run
 * facts, and badges when the record is truncated or incomplete.
 */
export const TrajectoryHeader = (
  props: TrajectoryHeaderProps,
): React.ReactElement => {
  const { className, summary, taskHref, trajectory } = props;

  // Hooks

  // Setup
  const copy = TRAJECTORY_SUMMARY_COPY;
  const agent = trajectory?.agent;
  const title = formatTrajectoryAgent(agent, summary.driver);
  const model = agent?.model_name ?? summary.model ?? copy.noModel;
  const facts = buildTrajectorySummaryFacts(summary);

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
    <header
      className={cn('flex flex-col gap-4', className)}
      data-testid="TrajectoryHeader"
    >
      <div>
        <Button asChild={true} size="sm" variant="outline">
          <Link to={taskHref}>
            <ChevronLeftIcon />
            {TRAJECTORY_VIEWER_COPY.backToTask}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <GlobalHeading heading="h1" icon={RouteIcon} title={title} />
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono">{model}</span>
          <span aria-hidden={true}>·</span>
          <span>{formatTrajectorySource(summary.source)}</span>
          <span aria-hidden={true}>·</span>
          <PlanRunTime value={String(summary.createdAt)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="slate" size="xs">
            {summary.outcome ?? copy.noOutcome}
          </Badge>
          {summary.truncated ? truncated : null}
          {summary.incomplete ? incomplete : null}
        </div>
      </div>

      <dl className="bg-card border-card-border grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map((fact) => {
          return (
            <div className="flex min-w-0 flex-col gap-0.5" key={fact.label}>
              <dt className="text-muted-foreground text-xs">{fact.label}</dt>
              <dd className="font-mono text-sm break-words tabular-nums">
                {fact.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </header>
  );
};
