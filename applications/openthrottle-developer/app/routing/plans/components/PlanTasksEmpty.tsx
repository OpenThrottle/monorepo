import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SearchAlertIcon } from 'lucide-react';

export interface PlanTasksEmptyProps {
  className?: string;
  search?: string;
}

export const PlanTasksEmpty = (props: PlanTasksEmptyProps) => {
  const { className, search } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={classnames('my-8', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {search ? 'No plans match your filters' : 'No plans yet'}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all plans.'
          : 'Create your first plan to get started.'}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/plans">Clear filters</Link>
        ) : (
          <Link to="/plans/create">New plan</Link>
        )}
      </Button>
    </Empty>
  );
};
