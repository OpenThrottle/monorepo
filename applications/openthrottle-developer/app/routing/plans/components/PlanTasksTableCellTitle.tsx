import type { DataTableRow } from '@openthrottle/react-router-shadcn';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanManagedTaskBadge } from '~/routing/plans/components/PlanManagedTaskBadge';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';
import { MOBILE_CARD_TITLE_CLASS } from '~/routing/plans/data/data.mobile-card';
import { getRequirementsCount } from '~/routing/plans/utils/formatters';

export interface PlanTasksTableCellTitleProps {
  /** True when a waiting STEER message is about this in-flight task. */
  hasSteerPending?: boolean;
  /** True when a tag→action rule manages this task's placement. */
  isManaged?: boolean;
  row: DataTableRow<PlanTaskRowFragment>;
}

export const PlanTasksTableCellTitle = (
  props: PlanTasksTableCellTitleProps,
): React.ReactElement => {
  const { hasSteerPending = false, isManaged = false, row } = props;

  // Hooks

  // Setup
  const task = row.original;
  const anchor = `/plans/${task.planId}/tasks/${task.id}`;

  const title = task.title ?? 'Untitled';
  const category = task.category?.trim() ?? '';
  const requirementsCount = getRequirementsCount(task.requirementsJson);
  const hasMeta = category !== '' || requirementsCount > 0;

  // Handlers

  // Markup
  const steerPendingBadge = (
    <Badge
      className="shrink-0"
      color="violet"
      data-testid="PlanSteerPendingBadge"
      size="xs"
    >
      {PLAN_INBOX_COPY.steerPendingBadge}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  // The whole cell is one link to the task. Its badges are non-interactive
  // (the managed badge's tooltip trigger is a span), so nothing nests an <a>.
  return (
    <Link
      aria-label={`Scroll to task: ${title}`}
      className="hover:text-primary block space-y-2 overflow-hidden max-sm:contents max-sm:space-y-0"
      to={anchor}
      viewTransition={true}
    >
      <div className={cn('flex items-center gap-2', MOBILE_CARD_TITLE_CLASS)}>
        <h2 className="line-clamp-2 min-w-0 text-sm font-medium text-ellipsis">
          {row.index + 1}. <span>{title}</span>
        </h2>

        {isManaged ? <PlanManagedTaskBadge className="shrink-0" /> : null}
        {hasSteerPending ? steerPendingBadge : null}
      </div>

      {hasMeta && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs max-sm:contents">
          {category !== '' && (
            <Badge
              aria-label={`Category: ${category}`}
              className="max-sm:order-2"
              color="slate"
              size="xs"
            >
              {category}
            </Badge>
          )}

          {requirementsCount > 0 && (
            <span
              aria-label={`${requirementsCount} requirements`}
              className="tabular-nums max-sm:order-3"
            >
              {requirementsCount}{' '}
              {requirementsCount === 1 ? 'requirement' : 'requirements'}
            </span>
          )}
        </div>
      )}
    </Link>
  );
};
