import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';

export interface ProjectNotFoundProps {
  readonly className?: string;
}

export const ProjectNotFound = (props: ProjectNotFoundProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main
      className={classnames(
        'p-12 relative h-full max-w-7xl mx-auto w-full',
        className,
      )}
      data-testid="ProjectNotFound"
    >
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link
          className="hover:text-foreground"
          to="/projects"
          viewTransition={true}
        >
          Projects
        </Link>
      </nav>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>
            The project you’re looking for doesn’t exist or was removed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
};
