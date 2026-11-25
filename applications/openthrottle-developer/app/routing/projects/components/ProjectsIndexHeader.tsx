import { Button, cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { FolderGit2Icon, FolderPlusIcon, FoldersIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { PROJECTS_INDEX_COPY } from '~/routing/projects/data/copy';

export interface ProjectsIndexHeaderProps {
  readonly className?: string;
}

/**
 * @description Projects index heading with its page actions: start a new
 * project (primary) and register another repository to link.
 */
export const ProjectsIndexHeader = (
  props: ProjectsIndexHeaderProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="ProjectsIndexHeader">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <GlobalHeading
          heading="h1"
          icon={FoldersIcon}
          title={PROJECTS_INDEX_COPY.heading}
        />

        <div className="flex items-center gap-2">
          <Button asChild={true} className="gap-2" size="xs" variant="ghost">
            <Link prefetch="intent" to="/settings/repositories">
              <FolderGit2Icon aria-hidden={true} className="size-4" />
              {PROJECTS_INDEX_COPY.addRepository}
            </Link>
          </Button>
          <Button asChild={true} className="gap-2" size="xs" variant="outline">
            <Link prefetch="intent" to="/projects/create">
              <FolderPlusIcon aria-hidden={true} className="size-4" />
              {PROJECTS_INDEX_COPY.newProject}
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {PROJECTS_INDEX_COPY.description}
      </p>
    </div>
  );
};
