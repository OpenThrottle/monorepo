import * as React from 'react';
import { Link } from 'react-router';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { PROJECT_NOT_FOUND_COPY } from '~/routing/projects/data/data.copy';

export interface ProjectNotFoundProps {}

export const ProjectNotFound = (
  _props: ProjectNotFoundProps,
): React.ReactElement => {
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
          <EmptyTitle>{PROJECT_NOT_FOUND_COPY.title}</EmptyTitle>
          <EmptyDescription>
            {PROJECT_NOT_FOUND_COPY.description}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </GlobalScreen>
  );
};
