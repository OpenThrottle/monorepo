import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { NotebookTextIcon } from 'lucide-react';
import { Link } from 'react-router';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import type { PlanStatusKey } from '~/routing/plans/types';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export interface PlanDetailRouteHeaderProps {
  readonly plan: NonNullable<Route.ComponentProps['loaderData']['plan']>;
  readonly status: PlanStatusKey;
}

/**
 * @description Heading block for the plan detail route: title, status badge
 * (linking to the filtered plans list), project badge/link, and last-updated
 * date. Extracted from {@link PlanDetailRoute} per component-primitive-shape
 * R6.
 */
export const PlanDetailRouteHeader = (
  props: PlanDetailRouteHeaderProps,
): React.ReactElement => {
  const { plan, status } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        icon={NotebookTextIcon}
        title={plan.title ?? 'Untitled'}
      />
      <div className="text-muted-foreground line-clamp-3 flex items-center gap-2 text-sm">
        <PlanStatusBadge status={status} to={`/plans?status=${status}`} />
        <span>&bull;</span>
        {plan.projectRelation?.id != null ? (
          <Badge asChild={true} color="slate" size="xs">
            <Link
              to={`/projects/${plan.projectRelation.id}`}
              viewTransition={true}
            >
              {plan.projectRelation.name}
            </Link>
          </Badge>
        ) : (
          <Badge color="slate" size="xs">
            {plan.projectRelation?.name
              ? plan.projectRelation.name
              : plan.project}
          </Badge>
        )}
        <span>&bull;</span>
        <span>Last updated</span>
        <span>&bull;</span>
        <span className="font-medium">{formatPlanDate(plan.updatedAt)}</span>
      </div>
    </div>
  );
};
