import { Button, cn } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { ProjectRepositoryRowFragment } from '~/__generated__/graphql';
import { PROJECT_REPOSITORIES_COPY } from '~/routing/projects/data/data.copy';

export interface ProjectRepositoriesProps {
  readonly available: readonly ProjectRepositoryRowFragment[];
  readonly className?: string;
  readonly linked: readonly ProjectRepositoryRowFragment[];
}

/**
 * @description Repositories linked to a project (many-to-many), with a picker
 * to link another and a per-row unlink action. Both post `intent` forms to the
 * project detail route action.
 */
export const ProjectRepositories = (
  props: ProjectRepositoriesProps,
): React.ReactElement => {
  const { available, className, linked } = props;

  // Hooks
  const fetcher = useFetcher();
  const [selectedId, setSelectedId] = React.useState('');

  // Setup
  const isPending = fetcher.state !== 'idle';
  const hasLinked = linked.length > 0;

  // Handlers
  const handleLink = (): void => {
    if (selectedId === '') return;
    fetcher.submit(
      { intent: 'linkProjectRepository', repositoryId: selectedId },
      { method: 'post' },
    );
    setSelectedId('');
  };

  // Markup
  const rowsMarkup = (
    <ul className="ui-border divide-y rounded-lg border">
      {linked.map((repository) => {
        const actions: GlobalPopoverAction[] = [
          {
            destructive: true,
            fields: {
              intent: 'unlinkProjectRepository',
              repositoryId: repository.id,
            },
            id: `unlink-${repository.id}`,
            kind: 'submit',
            label: PROJECT_REPOSITORIES_COPY.unlink,
            navigate: false,
          },
        ];

        return (
          <li
            className="flex items-center justify-between gap-3 p-3"
            key={repository.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{repository.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {repository.normalizedRemoteUrl ?? repository.defaultBranch}
              </p>
            </div>
            <GlobalPopover
              actions={actions}
              ariaLabel={`${PROJECT_REPOSITORIES_COPY.menuAriaLabelPrefix} ${repository.name}`}
            />
          </li>
        );
      })}
    </ul>
  );
  const emptyMarkup = (
    <p className="text-muted-foreground text-sm">
      {PROJECT_REPOSITORIES_COPY.empty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby="project-repositories-heading"
      className={cn('space-y-3', className)}
      data-testid="ProjectRepositories"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg" id="project-repositories-heading">
          {PROJECT_REPOSITORIES_COPY.heading}
        </h2>
        <div className="flex items-center gap-1">
          <select
            aria-label={PROJECT_REPOSITORIES_COPY.addLabel}
            className="border-input bg-background h-7 rounded-md border px-2 text-xs"
            onChange={(event) => setSelectedId(event.target.value)}
            value={selectedId}
          >
            <option value="">{PROJECT_REPOSITORIES_COPY.addPlaceholder}</option>
            {available.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.name}
              </option>
            ))}
          </select>
          <Button
            disabled={isPending || selectedId === ''}
            onClick={handleLink}
            size="xs"
            type="button"
            variant="outline"
          >
            {PROJECT_REPOSITORIES_COPY.addButton}
          </Button>
        </div>
      </div>
      {hasLinked ? rowsMarkup : emptyMarkup}
    </section>
  );
};
