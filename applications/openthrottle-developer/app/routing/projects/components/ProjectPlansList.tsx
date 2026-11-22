import { Badge, cn } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import type { ProjectPlanRowFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import {
  PROJECT_PLANS_COPY,
  PROJECT_RUN_COPY,
} from '~/routing/projects/data/data.copy';

export interface ProjectPlansListProps {
  readonly className?: string;
  /** The plan an active project run is on; marked in its row. */
  readonly currentPlanId?: string | null;
  /** Position of the first row in the project's full order (the page offset). */
  readonly offset: number;
  /** One page of the project's plans, in project order. */
  readonly plans: readonly ProjectPlanRowFragment[];
  /** The plan a stopped project run stopped at; marked in its row. */
  readonly stoppedByPlanId?: string | null;
  /** Live plans in the project across every page. */
  readonly totalCount: number;
}

/**
 * @description One page of the project's plans in project order, each row with
 * its absolute position, status, task progress, a link to the plan, the newest
 * pull request its runs recorded (linked out to the forge, with its state) and a
 * GlobalPopover with Move up / Move down / Remove. A move posts only the plan
 * and a direction (`moveProjectPlan`); the server swaps it with its neighbour in
 * the full order, so the first row of a page can move onto the previous page.
 */
export const ProjectPlansList = (
  props: ProjectPlansListProps,
): React.ReactElement => {
  const {
    className,
    currentPlanId = null,
    offset,
    plans,
    stoppedByPlanId = null,
    totalCount,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const buildActions = (
    plan: ProjectPlanRowFragment,
    index: number,
  ): GlobalPopoverAction[] => {
    const position = offset + index;
    const moveFields = (direction: 'DOWN' | 'UP'): Record<string, string> => {
      return { direction, intent: 'moveProjectPlan', planId: plan.id };
    };

    return [
      {
        id: `open-${plan.id}`,
        kind: 'link',
        label: PROJECT_PLANS_COPY.openPlan,
        to: `/plans/${plan.id}`,
      },
      {
        disabled: position === 0,
        fields: moveFields('UP'),
        id: `up-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.moveUp,
        navigate: false,
        separatorBefore: true,
      },
      {
        disabled: position === totalCount - 1,
        fields: moveFields('DOWN'),
        id: `down-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.moveDown,
        navigate: false,
      },
      {
        destructive: true,
        fields: { intent: 'removePlanFromProject', planId: plan.id },
        id: `remove-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.remove,
        navigate: false,
        separatorBefore: true,
      },
    ];
  };

  // Markup
  const renderStatus = (status: string): React.ReactNode => {
    if (isPlanStatusKey(status)) {
      return <PlanStatusBadge status={status} />;
    }
    return status;
  };

  const renderPullRequest = (plan: ProjectPlanRowFragment): React.ReactNode => {
    const pullRequest = plan.latestPullRequest;
    if (pullRequest == null) {
      return null;
    }
    const state = pullRequest.state ?? '';
    const label = `${PROJECT_PLANS_COPY.pullRequestAriaLabelPrefix} #${pullRequest.number} ${state}`;

    return (
      <a
        aria-label={label.trim()}
        className="hover:text-primary text-xs tabular-nums underline-offset-2 hover:underline"
        href={pullRequest.url}
        rel="noreferrer"
        target="_blank"
      >
        <Badge variant="outline">
          {PROJECT_PLANS_COPY.pullRequestPrefix}
          {pullRequest.number}
          {state === '' ? null : ` · ${state}`}
        </Badge>
      </a>
    );
  };

  const renderRunMarker = (planId: string): React.ReactNode => {
    if (planId === currentPlanId) {
      return <Badge>{PROJECT_RUN_COPY.currentPlanLabel}</Badge>;
    }
    if (planId === stoppedByPlanId) {
      return (
        <Badge variant="destructive">{PROJECT_RUN_COPY.stoppedLabel}</Badge>
      );
    }
    return null;
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (plans.length === 0) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="ProjectPlansList"
      >
        {PROJECT_PLANS_COPY.empty}
      </p>
    );
  }

  return (
    <ol
      className={cn('ui-border divide-y rounded-lg border', className)}
      data-testid="ProjectPlansList"
    >
      {plans.map((plan, index) => (
        <li
          className="flex items-center justify-between gap-3 p-3"
          key={plan.id}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-muted-foreground w-6 text-right text-xs tabular-nums">
              {offset + index + 1}
            </span>
            <div className="min-w-0">
              <Link
                className="hover:text-primary truncate text-sm font-medium underline-offset-2 hover:underline"
                to={`/plans/${plan.id}`}
              >
                {plan.title}
              </Link>
              <p className="text-muted-foreground text-xs">
                {plan.tasksCompletedCount}/{plan.taskCount} tasks
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {renderRunMarker(plan.id)}
            {renderPullRequest(plan)}
            {renderStatus(plan.status)}
            <GlobalPopover
              actions={buildActions(plan, index)}
              ariaLabel={`${PROJECT_PLANS_COPY.menuAriaLabelPrefix} ${plan.title}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};
