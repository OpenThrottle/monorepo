import * as React from 'react';
import clsx from 'clsx';
import { FolderGit2Icon } from 'lucide-react';
import {
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import type {
  AddWorkspaceFolderMutation,
  DiscoveredFolderObject,
  WorkspacePickerCapabilitiesObject,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { AddFolderDialog } from '~/routing/settings/repositories/components/AddFolderDialog';
import { AddFolderResult } from '~/routing/settings/repositories/components/AddFolderResult';
import { CloneRepoDialog } from '~/routing/settings/repositories/components/CloneRepoDialog';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import { RepositoriesTable } from '~/routing/settings/repositories/components/RepositoriesTable';
import { RepositoriesToolbar } from '~/routing/settings/repositories/components/RepositoriesToolbar';
import type { CheckoutDrift } from '~/routing/settings/utils/drift-labels';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

export interface RepositoriesSectionProps {
  actionError?: string | null;
  addedFolder?: AddWorkspaceFolderMutation['addWorkspaceFolder'] | null;
  autoExpandedIds: string[];
  className?: string;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  /** True when no repositories are registered at all, as opposed to none matching a search. */
  isUnpopulated: boolean;
  limit: number;
  page: number;
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
  refreshed?: {
    checkoutId: string;
    drift: CheckoutDrift;
    merged: boolean;
  } | null;
  rows: RepositoryCheckoutRow[];
  search: string;
  sortBy: string;
  sortOrder: string;
  totalCount: number;
}

export const RepositoriesSection = (
  props: RepositoriesSectionProps,
): React.ReactElement => {
  const {
    actionError,
    addedFolder,
    autoExpandedIds,
    className,
    discoveredFolders,
    isUnpopulated,
    limit,
    page,
    pickerCapabilities,
    refreshed,
    rows,
    search,
    sortBy,
    sortOrder,
    totalCount,
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
        <div className="mb-4 flex items-center justify-between">
          <GlobalHeading
            heading="h1"
            icon={FolderGit2Icon}
            title="Repositories"
          />
          <GlobalFeatureOnboardingTrigger />
        </div>

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

        {isUnpopulated ? (
          <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
        ) : (
          <div className="flex flex-col gap-4">
            <RepositoriesToolbar
              limit={limit}
              page={page}
              search={search}
              sortBy={sortBy}
              sortOrder={sortOrder}
            >
              <>
                <CloneRepoDialog actionError={actionError} />
                <AddFolderDialog
                  actionError={actionError}
                  discoveredFolders={discoveredFolders}
                  pickerCapabilities={pickerCapabilities}
                />
              </>
            </RepositoriesToolbar>
            <RepositoriesTable
              autoExpandedIds={autoExpandedIds}
              driftByCheckoutId={driftByCheckoutId}
              isUnpopulated={isUnpopulated}
              rows={rows}
            />
            <OpenThrottlePagination
              className="mt-8"
              limit={limit}
              page={page}
              resultLabel="repositories"
              search={search}
              sortBy={sortBy}
              sortOrder={sortOrder}
              total={totalCount}
            />
          </div>
        )}
      </section>

      <GlobalFeatureOnboardingModal content={REPOSITORIES_ONBOARDING} />
    </>
  );
};
