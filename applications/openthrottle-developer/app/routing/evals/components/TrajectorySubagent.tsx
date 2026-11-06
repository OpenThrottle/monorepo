import {
  Badge,
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon, WorkflowIcon } from 'lucide-react';
import * as React from 'react';

import { TrajectoryErrors } from '~/routing/evals/components/TrajectoryErrors';
import { TrajectoryTimeline } from '~/routing/evals/components/TrajectoryTimeline';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import type { AtifTrajectory } from '~/routing/evals/types';
import {
  buildTrajectoryTimeline,
  readTrajectoryErrors,
} from '~/routing/evals/utils/timeline';

export interface TrajectorySubagentProps {
  readonly className?: string;
  readonly subagent: AtifTrajectory;
}

/**
 * @description An embedded subagent trajectory, collapsed by default. Its
 * timeline is built and rendered only once opened, with the same step
 * components as the parent, so a run with many subagents stays cheap.
 */
export const TrajectorySubagent = (
  props: TrajectorySubagentProps,
): React.ReactElement => {
  const { className, subagent } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const timeline = React.useMemo(() => {
    return open ? buildTrajectoryTimeline(subagent) : null;
  }, [open, subagent]);

  // Setup
  const copy = TRAJECTORY_TIMELINE_COPY;
  const errors = readTrajectoryErrors(subagent);
  const name = subagent.trajectory_id ?? subagent.agent.name;
  const stepCount = subagent.steps.length;

  // Handlers

  // Markup
  const errorsBlock = <TrajectoryErrors errors={errors} />;
  const body = (
    <div className="flex flex-col gap-3 pt-3">
      {errors.length > 0 ? errorsBlock : null}
      {timeline ? <TrajectoryTimeline timeline={timeline} /> : null}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className={cn(
        'bg-muted/30 rounded-md border border-dashed p-2',
        className,
      )}
      data-testid="TrajectorySubagent"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger asChild={true}>
        <Button className="w-full justify-start" type="button" variant="ghost">
          <ChevronRightIcon
            className={cn('transition-transform', open && 'rotate-90')}
          />
          <WorkflowIcon />
          <span className="font-medium">{copy.subagent}</span>
          <code className="truncate font-mono text-xs">{name}</code>
          <Badge color="slate" size="xs">
            {`${stepCount} ${copy.steps}`}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{body}</CollapsibleContent>
    </Collapsible>
  );
};
