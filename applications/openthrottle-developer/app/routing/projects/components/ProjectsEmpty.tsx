import { Button, cn } from '@openthrottle/react-router-shadcn';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { SearchAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

export interface ProjectsEmptyProps {
  className?: string;
}

export const ProjectsEmpty = (
  props: ProjectsEmptyProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>No projects yet</EmptyTitle>
      <EmptyDescription>
        Create your first project to get started.
      </EmptyDescription>
      <Link to="/projects/create">
        <Button variant="secondary">New project</Button>
      </Link>
    </Empty>
  );
};
