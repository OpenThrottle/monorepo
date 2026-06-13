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

/**
 * User-facing copy for this not-found state, single-sourced so a wording change
 * updates the rendered string and its spec in one place (specs import this
 * instead of duplicating the literal).
 *
 * @publicApi
 */
export const PROJECT_NOT_FOUND_COPY = {
  description: 'The project you’re looking for doesn’t exist or was removed.',
  title: 'Project not found',
} as const;

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
