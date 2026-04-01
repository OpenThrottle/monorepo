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
    <div>
      <Empty
        className={classnames('my-8', className)}
        data-testid="ProjectEmpty"
      >
        <EmptyMedia variant="icon">
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.25 12.75V12a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v.75m-8.01-4.5l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l2.25-2.25m2.25 2.25l-2.25 2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
            <Link to="/projects/new">New project</Link>
          )}
        </Button>
      </Empty>
    </div>
  );
};
