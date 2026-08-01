import * as React from 'react';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ListOrderedIcon } from 'lucide-react';
import { Link } from 'react-router';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import { parseTaskStatusColor } from '~/routing/plans/utils/parsers';

export interface TaskDetailRouteHeaderProps {
  readonly planId: string;
  readonly planTitle: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @description Issue-style header for the task detail route: a breadcrumb
 * (Plans → Plan → Task), the task title, and a status chip that stays visible
 * across every tab. Status reuses {@link PlanStatusBadge} (task statuses are a
 * subset of the plan-status labels), falling back to a raw badge for any
 * unmapped value. Extracted from {@link TaskDetailRoute} per
 * component-primitive-shape R6.
 */
export const TaskDetailRouteHeader = (
  props: TaskDetailRouteHeaderProps,
): React.ReactElement => {
  const { planId, planTitle, status, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild={true}>
              <Link to="/plans" viewTransition={true}>
                Plans
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild={true}>
              <Link to={`/plans/${planId}`} viewTransition={true}>
                {planTitle}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
