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

export interface ProjectEmptyProps {
  className?: string;
  search?: string;
}

export const ProjectEmpty = (props: ProjectEmptyProps) => {
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
        {search ? 'No projects match your filters' : 'No projects yet'}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all projects.'
          : 'Create your first project to get started.'}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/projects">Clear filters</Link>
        ) : (
          <Link to="/projects/create">New project</Link>
        )}
      </Button>
    </Empty>
  );
};
