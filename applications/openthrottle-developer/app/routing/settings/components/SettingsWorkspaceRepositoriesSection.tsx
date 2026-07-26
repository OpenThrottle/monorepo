import * as React from 'react';
import clsx from 'clsx';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { FolderGit2Icon } from 'lucide-react';
import type {
  AddWorkspaceFolderMutation,
  DiscoveredFolderObject,
  WorkspaceRepositoryFieldsFragment,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { WorkspaceAddFolderDialog } from '~/routing/settings/components/WorkspaceAddFolderDialog';
import { WorkspaceAddFolderResult } from '~/routing/settings/components/WorkspaceAddFolderResult';
import { WorkspaceRepositoryCard } from '~/routing/settings/components/WorkspaceRepositoryCard';
import type { CheckoutDrift } from '~/routing/settings/components/WorkspaceRepositoryCard';
import type { ProjectOption } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';

export interface SettingsWorkspaceRepositoriesSectionProps {
  actionError?: string | null;
  addedFolder?: AddWorkspaceFolderMutation['addWorkspaceFolder'] | null;
  className?: string;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  projects: ProjectOption[];
  refreshed?: {
    checkoutId: string;
    drift: CheckoutDrift;
    merged: boolean;
  } | null;
  repositories: WorkspaceRepositoryFieldsFragment[];
}

export const SettingsWorkspaceRepositoriesSection = (
  props: SettingsWorkspaceRepositoriesSectionProps,
): React.ReactElement => {
  const {
    actionError,
    addedFolder,
    className,
    discoveredFolders,
    projects,
    refreshed,
    repositories,
  } = props;

  // Hooks

  // Setup
  const driftByCheckoutId = refreshed
    ? { [refreshed.checkoutId]: refreshed.drift }
    : undefined;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={FolderGit2Icon}
      id="local-repositories"
      legend="Repositories"
    >
      <section
        className={clsx('space-y-4 md:space-y-6', className)}
        data-testid="SettingsWorkspaceRepositoriesSection"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground max-w-prose text-sm">
            {WORKSPACE_FOLDERS_COPY.sectionDescription}
          </p>
          <WorkspaceAddFolderDialog
            actionError={actionError}
            discoveredFolders={discoveredFolders}
          />
        </div>

        {addedFolder ? (
          <WorkspaceAddFolderResult payload={addedFolder} />
        ) : null}

        {refreshed?.merged ? (
          <p className="text-muted-foreground text-sm" role="status">
            {WORKSPACE_FOLDERS_COPY.mergedNotice}
          </p>
        ) : null}

        {actionError && !addedFolder ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        {repositories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {WORKSPACE_FOLDERS_COPY.repositoriesEmpty}
          </p>
        ) : (
          <ul className="space-y-4">
            {repositories.map((repository) => (
              <li key={repository.id}>
                <WorkspaceRepositoryCard
                  driftByCheckoutId={driftByCheckoutId}
                  projects={projects}
                  repository={repository}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </OpenThrottleFieldset>
  );
};
