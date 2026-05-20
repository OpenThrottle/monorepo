import * as React from 'react';
import { Link } from 'react-router';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';

export interface ProjectNotFoundProps {}

export const ProjectNotFound = (_props: ProjectNotFoundProps) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
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
    </GlobalScreen>
  );
};
