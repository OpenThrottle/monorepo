import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import type { Row } from '@tanstack/react-table';
import * as React from 'react';
import { Link } from 'react-router';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanManagedTaskBadge } from '~/routing/plans/components/PlanManagedTaskBadge';
import {
  MOBILE_CARD_BLOCK_CLASS,
  MOBILE_CARD_TITLE_CLASS,
} from '~/routing/plans/data/data.mobile-card';
import { getRequirementsCount } from '~/routing/plans/utils/formatters';

export interface PlanTasksTableCellTitleProps {
  /** True when a tag→action rule manages this task's placement. */
  isManaged?: boolean;
  row: Row<PlanTaskRowFragment>;
}

export const PlanTasksTableCellTitle = (
  props: PlanTasksTableCellTitleProps,
): React.ReactElement => {
  const { isManaged = false, row } = props;

  // Hooks

  // Setup
  const task = row.original;
  const anchor = `/plans/${task.planId}/tasks/${task.id}`;

  const title = task.title ?? 'Untitled';
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';
  const category = task.category?.trim() ?? '';
  const requirementsCount = getRequirementsCount(task.requirementsJson);
  const hasMeta =
    category !== '' || requirementsCount > 0 || task.assignee != null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4 overflow-hidden max-sm:contents max-sm:space-y-0">
      <div className={cn('flex items-center gap-2', MOBILE_CARD_TITLE_CLASS)}>
        <h2 className="line-clamp-2 min-w-0 text-sm font-medium text-ellipsis">
          {row.index + 1}.{' '}
          <Link
            aria-label={`Scroll to task: ${title}`}
            className="hover:text-primary underline underline-offset-2"
            to={anchor}
            viewTransition={true}
          >
            {title}
          </Link>
        </h2>

        {isManaged ? <PlanManagedTaskBadge className="shrink-0" /> : null}
      </div>

      {hasMeta ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs max-sm:contents">
          {category !== '' ? (
            <Badge
              aria-label={`Category: ${category}`}
              className="max-sm:order-2"
              color="slate"
              size="xs"
            >
              {category}
            </Badge>
          ) : null}

          {requirementsCount > 0 ? (
            <span
              aria-label={`${requirementsCount} requirements`}
              className="tabular-nums max-sm:order-3"
            >
              {requirementsCount}{' '}
              {requirementsCount === 1 ? 'requirement' : 'requirements'}
            </span>
          ) : null}
          {task.assignee ? (
            <span className="max-sm:order-3">Assigned to {task.assignee}</span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'pre-wrap flex flex-col gap-2 overflow-hidden',
          MOBILE_CARD_BLOCK_CLASS.description,
        )}
      >
        <MarkdownRenderer
          className="line-clamp-5 overflow-hidden [&_p]:!mb-0 [&_p]:!text-xs"
          source={description || summary}
          // className="!whitespace-wrap m-0 line-clamp-2 overflow-hidden [&_p]:!mb-0"
          // source={summary || description}
        />
      </div>
    </div>
  );
};
