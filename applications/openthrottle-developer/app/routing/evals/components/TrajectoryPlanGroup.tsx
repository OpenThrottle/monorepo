import { fillTemplate } from '@openthrottle/nodejs-utils';
import {
  Badge,
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Progress,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { AgentTrajectoryPlanGroupRowFragment } from '~/__generated__/graphql';
import { TrajectoryPlanGroupRow } from '~/routing/evals/components/TrajectoryPlanGroupRow';
import { EVAL_TRAJECTORIES_COPY } from '~/routing/evals/data/copy';
import { trajectoryPlanGroupAnchor } from '~/routing/evals/utils/hrefs';

export interface TrajectoryPlanGroupProps {
  /** Rendered beside the progress, e.g. the group's "Start scoring" action. */
  readonly actions: React.ReactNode;
  readonly className?: string;
  readonly group: AgentTrajectoryPlanGroupRowFragment;
}

/**
 * @description One plan's trajectories: the plan (linked), its status, your
 * "k of N scored" progress and pass/fail counts, then a collapsible table of
 * the rows the filter kept. Its DOM id is the anchor the viewer links back to.
 */
export const TrajectoryPlanGroup = (
  props: TrajectoryPlanGroupProps,
): React.ReactElement => {
  const { actions, className, group } = props;

  // Hooks
  const [isOpen, setIsOpen] = React.useState(true);

  // Setup
  const copy = EVAL_TRAJECTORIES_COPY;
  const columns = copy.columns;
  const anchor = trajectoryPlanGroupAnchor(group.planId ?? null);
  const headingId = `${anchor}-heading`;
  const title = group.planTitle ?? copy.unknownPlan;
  const progress = fillTemplate(copy.scoredProgress, {
    scored: String(group.scoredCount),
    total: String(group.trajectoryCount),
  });
  const isEmpty = group.trajectoryCount === 0;
  const percent = isEmpty
    ? 0
    : (group.scoredCount / group.trajectoryCount) * 100;
  const ToggleIcon = isOpen ? ChevronDownIcon : ChevronRightIcon;

  // Handlers

  // Markup
  const planLink = (
    <Link
      className="underline-offset-4 hover:underline"
      to={`/plans/${group.planId}`}
    >
      {title}
    </Link>
  );
  const status = (
    <Badge color="slate" size="xs">
      {group.planStatus}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby={headingId}
      className={cn('bg-card border-card-border rounded-lg border', className)}
      data-testid="TrajectoryPlanGroup"
      id={anchor}
    >
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <header className="flex flex-wrap items-center gap-3 p-4">
          <CollapsibleTrigger asChild={true}>
            <Button
              aria-label={copy.toggleGroup}
              size="icon-sm"
              variant="ghost"
            >
              <ToggleIcon />
            </Button>
          </CollapsibleTrigger>
          <h2 className="min-w-0 truncate font-medium" id={headingId}>
            {group.planId ? planLink : title}
          </h2>
          {group.planStatus ? status : null}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground tabular-nums">
              {progress}
            </span>
            <Progress aria-label={progress} className="w-24" value={percent} />
            <span className="tabular-nums">
              {fillTemplate(copy.passCount, { count: String(group.passCount) })}
            </span>
            <span className="tabular-nums">
              {fillTemplate(copy.failCount, { count: String(group.failCount) })}
            </span>
            {actions}
          </div>
        </header>
        <CollapsibleContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.trajectory}</TableHead>
                <TableHead>{columns.source}</TableHead>
                <TableHead>{columns.cost}</TableHead>
                <TableHead>{columns.duration}</TableHead>
                <TableHead>{columns.recorded}</TableHead>
                <TableHead>{columns.verdict}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.trajectories.map((item) => {
                return <TrajectoryPlanGroupRow item={item} key={item.id} />;
              })}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};
