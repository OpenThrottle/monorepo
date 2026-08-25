import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { NotebookTextIcon } from 'lucide-react';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import type { PlanStatusKey } from '~/routing/plans/types';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export interface PlanDetailRouteHeaderProps {
  readonly plan: NonNullable<Route.ComponentProps['loaderData']['plan']>;
  readonly status: PlanStatusKey;
}

/**
 * @description Issue-style heading for the plan detail route: the plan title,
 * then a metadata row (status badge linking to the filtered list,
 * author→assignee, tags, created/updated). Navigation breadcrumbs live in the
 * global app header now. Primary run/lifecycle actions stay in the sibling
 * {@link PlanToolbar}. Extracted from {@link PlanDetailRoute} per
 * component-primitive-shape R6.
 */
export const PlanDetailRouteHeader = (
  props: PlanDetailRouteHeaderProps,
): React.ReactElement => {
  const { plan, status } = props;

  // Hooks

  // Setup
  const title = plan.title ?? 'Untitled';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading className="mb-4" icon={NotebookTextIcon} title={title} />

      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <PlanStatusBadge status={status} to={`/plans?status=${status}`} />
          {plan.author ? (
            <span aria-label={`Author: ${plan.author}`}>
              {plan.assignee
                ? `${plan.author} → ${plan.assignee}`
                : plan.author}
            </span>
          ) : plan.assignee ? (
            <span aria-label={`Assignee: ${plan.assignee}`}>
              Assignee: {plan.assignee}
            </span>
          ) : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span aria-hidden={true}>&bull;</span>
          <span>Created {formatPlanDate(plan.createdAt)}</span>

          <span aria-hidden={true}>&bull;</span>
          <span>Updated {formatPlanDate(plan.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
