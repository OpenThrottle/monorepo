import { cn } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import type { ProjectPlanRowFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/data.copy';
import { moveProjectPlanId } from '~/routing/projects/utils/projectPlans';

export interface ProjectPlansListProps {
  readonly className?: string;
  readonly plans: readonly ProjectPlanRowFragment[];
}

/**
 * @description The project's plans in project order, each row with its status,
 * task progress, a link to the plan (its PR lives on the plan's runs, so the
 * plan page is the PR entry point) and a GlobalPopover with Move up / Move down
 * / Remove. Every move posts the full new order (`reorderProjectPlans`).
 */
export const ProjectPlansList = (
  props: ProjectPlansListProps,
): React.ReactElement => {
  const { className, plans } = props;

  // Hooks

  // Setup
  const planIds = plans.map((plan) => plan.id);

  // Handlers
  const buildActions = (
    plan: ProjectPlanRowFragment,
    index: number,
  ): GlobalPopoverAction[] => {
    const reorderFields = (
      direction: 'down' | 'up',
    ): Record<string, string> => {
      return {
        intent: 'reorderProjectPlans',
        planIds: moveProjectPlanId(planIds, plan.id, direction).join(','),
      };
    };

    return [
      {
        id: `open-${plan.id}`,
        kind: 'link',
        label: PROJECT_PLANS_COPY.openPlan,
        to: `/plans/${plan.id}`,
      },
      {
        disabled: index === 0,
        fields: reorderFields('up'),
        id: `up-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.moveUp,
        navigate: false,
        separatorBefore: true,
      },
      {
        disabled: index === plans.length - 1,
        fields: reorderFields('down'),
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
              {index + 1}
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
