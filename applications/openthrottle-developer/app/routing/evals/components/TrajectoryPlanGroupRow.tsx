import {
  Badge,
  cn,
  TableCell,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { AgentTrajectoryPlanGroupItemRowFragment } from '~/__generated__/graphql';
import { TRAJECTORY_VERDICT_BADGE_COLOR } from '~/routing/evals/config/defaults';
import {
  EVAL_TRAJECTORIES_COPY,
  TRAJECTORY_SUMMARY_COPY,
} from '~/routing/evals/data/copy';
import {
  formatTrajectoryCost,
  formatTrajectoryDuration,
  formatTrajectorySource,
} from '~/routing/evals/utils/formatters';
import { buildTrajectoryViewerHref } from '~/routing/evals/utils/hrefs';
import { parseTrajectoryVerdict } from '~/routing/evals/utils/parsers';
import { formatEvalTimestamp } from '~/routing/evals/utils/report-format';

export interface TrajectoryPlanGroupRowProps {
  readonly className?: string;
  readonly item: AgentTrajectoryPlanGroupItemRowFragment;
}

/**
 * @description One trajectory in a plan group: what it worked on (a task, or
 * the plan as a whole), how it was captured, cost, duration, when it was
 * recorded and your verdict. The title opens it in the viewer.
 */
export const TrajectoryPlanGroupRow = (
  props: TrajectoryPlanGroupRowProps,
): React.ReactElement => {
  const { className, item } = props;

  // Hooks

  // Setup
  const copy = EVAL_TRAJECTORIES_COPY;
  const verdict = parseTrajectoryVerdict(item.verdict);
  const isSession = item.source === 'session_upload';
  const title = item.taskTitle ?? copy.planLevel;
  const verdictKey = verdict ?? 'unscored';

  // Handlers

  // Markup
  const truncated = (
    <Badge color="amber" size="xs">
      {TRAJECTORY_SUMMARY_COPY.truncated}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow className={cn(className)} data-testid="TrajectoryPlanGroupRow">
      <TableCell className="max-w-80">
        <div className="flex items-center gap-2">
          <Link
            className="truncate font-medium underline-offset-4 hover:underline"
            to={buildTrajectoryViewerHref(item.id)}
          >
            {title}
          </Link>
          {item.truncated ? truncated : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge color={isSession ? 'violet' : 'sky'} size="xs">
          {formatTrajectorySource(item.source)}
        </Badge>
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {formatTrajectoryCost(item.costUsd)}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {formatTrajectoryDuration(item.durationMs)}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatEvalTimestamp(String(item.recordedAt))}
      </TableCell>
      <TableCell>
        <Badge
          color={TRAJECTORY_VERDICT_BADGE_COLOR[verdictKey]}
          data-verdict={verdictKey}
          size="xs"
        >
          {copy.verdicts[verdictKey]}
        </Badge>
      </TableCell>
    </TableRow>
  );
};
