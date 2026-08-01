import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ListXIcon, SearchAlertIcon } from 'lucide-react';
import {
  PLAN_TASKS_EMPTY_COPY,
  PLANS_INDEX_EMPTY_COPY,
} from '~/routing/plans/data/data.copy';

export interface PlanTasksEmptyProps {
  className?: string;
  /**
   * Plans variant only: true when an active search/filter yielded no rows, so
   * the message points at clearing filters rather than onboarding.
   */
  filtered?: boolean;
  /**
   * `plans` (default) — the /plans index list. `tasks` — a plan's Tasks tab
   * with no tasks; uses task-specific copy instead of the plans onboarding copy.
   */
  variant?: 'plans' | 'tasks';
}

export const PlanTasksEmpty = (
  props: PlanTasksEmptyProps,
): React.ReactElement => {
  const { className, filtered = false, variant = 'plans' } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  if (variant === 'tasks') {
    return (
      <Empty className={clsx('', className)}>
        <EmptyMedia variant="icon">
          <ListXIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{PLAN_TASKS_EMPTY_COPY.title}</EmptyTitle>
        <EmptyDescription>{PLAN_TASKS_EMPTY_COPY.description}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <Empty className={clsx('', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {filtered
          ? PLANS_INDEX_EMPTY_COPY.filteredTitle
          : PLANS_INDEX_EMPTY_COPY.emptyTitle}
      </EmptyTitle>
      <EmptyDescription>
        {filtered
          ? PLANS_INDEX_EMPTY_COPY.filteredDescription
          : PLANS_INDEX_EMPTY_COPY.emptyDescription}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {filtered ? (
          <Link to="/plans">{PLANS_INDEX_EMPTY_COPY.filteredAction}</Link>
        ) : (
          <Link to="/plans/create">{PLANS_INDEX_EMPTY_COPY.emptyAction}</Link>
        )}
      </Button>
    </Empty>
  );
};
