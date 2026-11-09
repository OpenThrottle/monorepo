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
import { WorktreeDiscoveryStatus } from '~/routing/settings/repositories/components/WorktreeDiscoveryStatus';
import { WorktreeRemovalOutcome } from '~/routing/settings/repositories/components/WorktreeRemovalOutcome';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';
import type {
  DiscoveredFolder,
  DiscoveredWorktreesResult,
  PruneWorktreeCheckoutResult,
  RefreshedCheckout,
  RemovePlanRunWorktreeResult,
  RepositoriesDiscoveryStatus,
  RepositoriesView,
} from '~/routing/settings/repositories/types';

export interface RepositoriesSectionProps {
  actionError?: string | null;
  addedFolder?: AddWorkspaceFolderMutation['addWorkspaceFolder'] | null;
  className?: string;
  /** Empty until the deferred scan resolves; see {@link discoveryStatus}. */
  discoveredFolders: readonly DiscoveredFolder[];
  /** Null until the deferred scan has resolved once (or when it failed with nothing to show). */
  discoveredWorktrees: DiscoveredWorktreesResult | null;
  discoveryStatus: RepositoriesDiscoveryStatus;
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
  /** Per-id outcomes from the last `pruneWorktreeCheckouts`, when that was the last action. */
  pruned?: readonly PruneWorktreeCheckoutResult[] | null;
  refreshed?: RefreshedCheckout | null;
  removal?: RemovePlanRunWorktreeResult | null;
  /** The rows and URL params for this page — see `buildRepositoriesView`. */
  view: RepositoriesView;
}

export const RepositoriesSection = (
  props: RepositoriesSectionProps,
): React.ReactElement => {
  const {
    actionError,
    addedFolder,
    className,
    discoveredFolders,
    discoveredWorktrees,
    discoveryStatus,
    pickerCapabilities,
    pruned,
    refreshed,
    removal,
    view,
  } = props;
  const {
    autoExpandedIds,
    isUnpopulated,
    limit,
    page,
    rows,
    search,
    showMissing,
    sortBy,
    sortOrder,
    totalCount,
  } = view;

  // Hooks

  // Setup
  const driftByCheckoutId = refreshed
    ? { [refreshed.checkoutId]: refreshed.drift }
    : undefined;
  const missingCheckouts = discoveredWorktrees?.missingCheckouts ?? [];
  const missingCheckoutIds = missingCheckouts.map(({ checkoutId }) => {
    return checkoutId;
  });
  const isDiscoveringFolders = discoveryStatus === 'pending';

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
      isDiscoveringFolders={isDiscoveringFolders}
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
            isDiscoveringFolders={isDiscoveringFolders}
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
      <WorktreeDiscoveryStatus
        discoveredWorktrees={discoveredWorktrees}
        status={discoveryStatus}
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
        {removal ? <WorktreeRemovalOutcome result={removal} /> : null}

        {refreshed?.merged ? mergedNotice : null}

        {actionError && !addedFolder ? errorAlert : null}

        {isUnpopulated ? emptyState : populatedBody}
      </section>

      <GlobalFeatureOnboardingModal content={REPOSITORIES_ONBOARDING} />
    </>
  );
};
