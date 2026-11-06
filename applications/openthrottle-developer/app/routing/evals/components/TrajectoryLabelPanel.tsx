import { Badge, cn, Separator } from '@openthrottle/react-router-shadcn';
import { TagIcon } from 'lucide-react';
import * as React from 'react';

import type { AgentTrajectoryLabelRowFragment } from '~/__generated__/graphql';
import { TrajectoryLabelForm } from '~/routing/evals/components/TrajectoryLabelForm';
import { TrajectoryLabelList } from '~/routing/evals/components/TrajectoryLabelList';
import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';

export interface TrajectoryLabelPanelProps {
  readonly className?: string;
  readonly labels: {
    readonly mine: AgentTrajectoryLabelRowFragment | null;
    readonly others: readonly AgentTrajectoryLabelRowFragment[];
  };
}

/**
 * @description The labelling side panel: your current label and the form to
 * record or replace it, then other raters' labels. Labels are the ground
 * truth automated judges are later calibrated against.
 */
export const TrajectoryLabelPanel = (
  props: TrajectoryLabelPanelProps,
): React.ReactElement => {
  const { className, labels } = props;
  const { mine, others } = labels;

  // Hooks

  // Setup
  const copy = TRAJECTORY_LABEL_COPY;
  // Remount the form whenever the stored label changes, so its fields reset to it.
  const formKey = mine ? `${mine.id}-${String(mine.updatedAt)}` : 'unlabelled';
  const isPass = mine?.verdict === 'pass';

  // Handlers

  // Markup
  const currentLabel = (
    <p
      className="flex items-center gap-2 text-sm"
      data-testid="TrajectoryCurrentLabel"
    >
      <span className="text-muted-foreground">{copy.currentLabel}</span>
      <Badge color={isPass ? 'green' : 'red'} size="xs">
        {isPass ? copy.pass : copy.fail}
      </Badge>
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="trajectory-label-heading"
      className={cn(
        'bg-card border-card-border flex flex-col gap-4 rounded-lg border p-4',
        className,
      )}
      data-testid="TrajectoryLabelPanel"
    >
      <h2
        className="flex items-center gap-2 text-base font-semibold"
        id="trajectory-label-heading"
      >
        <TagIcon className="size-4" />
        {copy.heading}
      </h2>
      {mine ? currentLabel : null}
      <TrajectoryLabelForm current={mine} key={formKey} />
      <Separator />
      <TrajectoryLabelList labels={others} />
    </section>
  );
};
