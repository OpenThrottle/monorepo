import { cn } from '@openthrottle/react-router-shadcn';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import {
  GlobalFeatureOnboardingModal,
  GlobalFeatureOnboardingTrigger,
  GlobalHeading,
} from '@openthrottle/react-router-ui-global';
import { FolderGit2Icon } from 'lucide-react';
import * as React from 'react';

import type {
  AddWorkspaceFolderMutation,
  DiscoveredFolderObject,
  WorkspacePickerCapabilitiesObject,
} from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { AddFolderDialog } from '~/routing/settings/repositories/components/AddFolderDialog';
import { AddFolderResult } from '~/routing/settings/repositories/components/AddFolderResult';
import { CloneRepoDialog } from '~/routing/settings/repositories/components/CloneRepoDialog';
import { MissingWorktreesToggle } from '~/routing/settings/repositories/components/MissingWorktreesToggle';
import { PruneMissingWorktreesButton } from '~/routing/settings/repositories/components/PruneMissingWorktreesButton';
import { PruneWorktreesOutcome } from '~/routing/settings/repositories/components/PruneWorktreesOutcome';
import { RepositoriesEmptyState } from '~/routing/settings/repositories/components/RepositoriesEmptyState';
import { RepositoriesTable } from '~/routing/settings/repositories/components/RepositoriesTable';
import { RepositoriesToolbar } from '~/routing/settings/repositories/components/RepositoriesToolbar';
import { WorktreeDiscoveryNotice } from '~/routing/settings/repositories/components/WorktreeDiscoveryNotice';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import type {
  DiscoveredWorktreesResult,
  PruneWorktreeCheckoutResult,
  RepositoryCheckoutRow,
} from '~/routing/settings/repositories/types';
import type { CheckoutDrift } from '~/routing/settings/utils/drift-labels';

export interface RepositoriesSectionProps {
  actionError?: string | null;
  addedFolder?: AddWorkspaceFolderMutation['addWorkspaceFolder'] | null;
  autoExpandedIds: string[];
  className?: string;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  discoveredWorktrees: DiscoveredWorktreesResult;
  /** True when no repositories are registered at all, as opposed to none matching a search. */
  isUnpopulated: boolean;
  limit: number;
  page: number;
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
  /** Per-id outcomes from the last `pruneWorktreeCheckouts`, when that was the last action. */
  pruned?: readonly PruneWorktreeCheckoutResult[] | null;
  refreshed?: {
    checkoutId: string;
    drift: CheckoutDrift;
    merged: boolean;
  } | null;
  rows: RepositoryCheckoutRow[];
  search: string;
  /** Whether registered worktrees missing from disk are listed. */
  showMissing: boolean;
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
    discoveredWorktrees,
    isUnpopulated,
    limit,
    page,
    pickerCapabilities,
    pruned,
    refreshed,
    rows,
    search,
    showMissing,
    sortBy,
    sortOrder,
    totalCount,
  } = props;

  // Hooks

  // Setup
  const driftByCheckoutId = refreshed
    ? { [refreshed.checkoutId]: refreshed.drift }
    : undefined;
  const missingCheckoutIds = discoveredWorktrees.missingCheckouts.map(
    (missing) => missing.checkoutId,
  );

  // Handlers

  // Markup
  const mergedNotice = (
    <p className="text-muted-foreground text-sm" role="status">
      {WORKSPACE_FOLDERS_COPY.mergedNotice}
    </p>
  );
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {actionError}
    </p>
  );
  const emptyState = (
    <RepositoriesEmptyState
      actionError={actionError}
      discoveredFolders={discoveredFolders}
      pickerCapabilities={pickerCapabilities}
    />
  );
  const populatedBody = (
    <div className="flex flex-col gap-4">
      <RepositoriesToolbar
        limit={limit}
        page={page}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      >
        <>
          <MissingWorktreesToggle
            count={missingCheckoutIds.length}
            showMissing={showMissing}
          />
          <PruneMissingWorktreesButton checkoutIds={missingCheckoutIds} />
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
        // className="bg-card"
        driftByCheckoutId={driftByCheckoutId}
        isUnpopulated={isUnpopulated}
        rows={rows}
      />
      <WorktreeDiscoveryNotice discoveredWorktrees={discoveredWorktrees} />
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
  );

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
        className={cn('space-y-4 md:space-y-6', className)}
        data-testid="RepositoriesSection"
      >
        {addedFolder ? <AddFolderResult payload={addedFolder} /> : null}

        {pruned ? <PruneWorktreesOutcome results={pruned} /> : null}

        {refreshed?.merged ? mergedNotice : null}

        {actionError && !addedFolder ? errorAlert : null}

        {isUnpopulated ? emptyState : populatedBody}
      </section>

      <GlobalFeatureOnboardingModal content={REPOSITORIES_ONBOARDING} />
    </>
  );
};
