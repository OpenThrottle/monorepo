import { Badge, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { AgentTrajectoryLabelRowFragment } from '~/__generated__/graphql';
import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';

export interface TrajectoryLabelListProps {
  readonly className?: string;
  /** Other raters' labels, most recently updated first (server order). */
  readonly labels: readonly AgentTrajectoryLabelRowFragment[];
}

/**
 * @description Every other rater's verdict, failure type and note on this
 * trajectory, so disagreements between raters are visible while you label.
 */
export const TrajectoryLabelList = (
  props: TrajectoryLabelListProps,
): React.ReactElement => {
  const { className, labels } = props;

  // Hooks

  // Setup
  const copy = TRAJECTORY_LABEL_COPY;

  // Handlers

  // Markup
  const empty = (
    <p className="text-muted-foreground text-sm">{copy.noOtherLabels}</p>
  );
  const rows = labels.map((label) => {
    const isPass = label.verdict === 'pass';
    const verdictLabel = isPass ? copy.pass : copy.fail;
    const failureType = (
      <code className="font-mono text-xs">{label.failureType}</code>
    );
    const note = (
      <p className="text-sm break-words whitespace-pre-wrap">{label.note}</p>
    );

    return (
      <li
        className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0"
        data-testid="TrajectoryLabelListItem"
        key={label.id}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label.rater}</span>
          <Badge color={isPass ? 'green' : 'red'} size="xs">
            {verdictLabel}
          </Badge>
          {label.failureType ? failureType : null}
        </div>
        {label.note ? note : null}
        <span className="text-muted-foreground text-xs">
          {`${copy.updated} `}
          <PlanRunTime value={String(label.updatedAt)} />
        </span>
      </li>
    );
  });

  const list = <ul className="flex flex-col gap-3">{rows}</ul>;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-testid="TrajectoryLabelList"
    >
      <h3 className="text-sm font-medium">{copy.otherLabels}</h3>
      {labels.length === 0 ? empty : list}
    </div>
  );
};
