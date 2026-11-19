import { GlobalFeatureOnboarding } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  GetSettingsRepositoriesDiscoveryQuery,
  GetSettingsRepositoriesQuery,
} from '~/__generated__/graphql';
import { AddFolderDialog } from '~/routing/settings/repositories/components/AddFolderDialog';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';

export interface RepositoriesEmptyStateProps {
  actionError?: string | null;
  discoveredFolders: readonly GetSettingsRepositoriesDiscoveryQuery['discoveredFolders'][number][];
  /** The workspace-root scan is still streaming in, so an empty list means "not yet", not "none". */
  isDiscoveringFolders: boolean;
  pickerCapabilities: GetSettingsRepositoriesQuery['workspacePickerCapabilities'];
}

/**
 * @description The no-repositories-registered body: the add-folder gesture and
 * the feature onboarding. Split out of RepositoriesSection for its line cap.
 */
export const RepositoriesEmptyState = (
  props: RepositoriesEmptyStateProps,
): React.ReactElement => {
  const {
    actionError,
    discoveredFolders,
    isDiscoveringFolders,
    pickerCapabilities,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <AddFolderDialog
        actionError={actionError}
        discoveredFolders={discoveredFolders}
        isDiscoveringFolders={isDiscoveringFolders}
        pickerCapabilities={pickerCapabilities}
      />
      <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
    </>
  );
};
