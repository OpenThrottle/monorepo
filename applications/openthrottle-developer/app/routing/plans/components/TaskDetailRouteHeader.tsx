import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { ListOrderedIcon } from 'lucide-react';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { parseTaskStatusColor } from '~/routing/plans/utils/parsers';

export interface TaskDetailRouteHeaderProps {
  readonly status: string;
  readonly title: string;
}

/**
 * @description Issue-style header for the task detail route: the task title and
 * a status chip that stays visible across every tab. (Navigation breadcrumbs
 * live in the global app header now.) Status reuses {@link PlanStatusBadge}
 * (task statuses are a subset of the plan-status labels), falling back to a raw
 * badge for any unmapped value. Extracted from {@link TaskDetailRoute} per
 * component-primitive-shape R6.
 */
export const TaskDetailRouteHeader = (
  props: TaskDetailRouteHeaderProps,
): React.ReactElement => {
  const { status, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading className="mb-4" icon={ListOrderedIcon} title={title} />

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        {isPlanStatusKey(status) ? (
          <PlanStatusBadge status={status} />
        ) : (
          <Badge color={parseTaskStatusColor(status)} size="xs">
            {status}
          </Badge>
        )}
      </div>
    </div>
  );
};
