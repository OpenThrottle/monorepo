import * as React from 'react';
import clsx from 'clsx';
import { FolderGit2Icon } from 'lucide-react';
import {
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import type {
  AddWorkspaceFolderMutation,
  DiscoveredFolderObject,
  WorkspacePickerCapabilitiesObject,
  WorkspaceRepositoryFieldsFragment,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { AddFolderDialog } from '~/routing/settings/repositories/components/AddFolderDialog';
import { AddFolderResult } from '~/routing/settings/repositories/components/AddFolderResult';
import { CloneRepoDialog } from '~/routing/settings/repositories/components/CloneRepoDialog';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import { RepositoryCard } from '~/routing/settings/repositories/components/RepositoryCard';
import type { CheckoutDrift } from '~/routing/settings/repositories/components/RepositoryCard';

export interface RepositoriesSectionProps {
  actionError?: string | null;
  addedFolder?: AddWorkspaceFolderMutation['addWorkspaceFolder'] | null;
  className?: string;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
  refreshed?: {
    checkoutId: string;
    drift: CheckoutDrift;
    merged: boolean;
  } | null;
  repositories: WorkspaceRepositoryFieldsFragment[];
}

export const RepositoriesSection = (
  props: RepositoriesSectionProps,
): React.ReactElement => {
  const {
    actionError,
    addedFolder,
    className,
    discoveredFolders,
    pickerCapabilities,
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
    <>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <GlobalHeading
            className="mb-4 flex-1"
            heading="h1"
            icon={FolderGit2Icon}
            title="Repositories"
          />

          <div className="flex items-center space-x-2">
            <GlobalFeatureOnboardingTrigger />
            <CloneRepoDialog actionError={actionError} />
            <AddFolderDialog
              actionError={actionError}
              discoveredFolders={discoveredFolders}
              pickerCapabilities={pickerCapabilities}
            />
          </div>
        </div>

        <GlobalFeatureOnboardingModal content={REPOSITORIES_ONBOARDING} />

        <p className="text-muted-foreground text-sm">
          {WORKSPACE_FOLDERS_COPY.sectionDescription}
        </p>
      </div>

      <section
        className={clsx('space-y-4 md:space-y-6', className)}
        data-testid="RepositoriesSection"
      >
        {addedFolder ? <AddFolderResult payload={addedFolder} /> : null}

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
          <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
        ) : (
          <ul className="space-y-4">
            {repositories.map((repository) => (
              <li key={repository.id}>
                <RepositoryCard
                  driftByCheckoutId={driftByCheckoutId}
                  repository={repository}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};
