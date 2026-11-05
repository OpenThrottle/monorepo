import { GlobalFeatureOnboarding } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  DiscoveredFolderObject,
  WorkspacePickerCapabilitiesObject,
} from '~/__generated__/graphql';
import { AddFolderDialog } from '~/routing/settings/repositories/components/AddFolderDialog';
import { REPOSITORIES_ONBOARDING } from '~/routing/settings/repositories/data/data.copy';

export interface RepositoriesEmptyStateProps {
  actionError?: string | null;
  discoveredFolders: Pick<
    DiscoveredFolderObject,
    'alreadyRegistered' | 'name' | 'path'
  >[];
  pickerCapabilities: Pick<
    WorkspacePickerCapabilitiesObject,
    'canUseNativeDialog' | 'defaultBrowsePath' | 'roots'
  >;
}

/**
 * @description The no-repositories-registered body: the add-folder gesture and
 * the feature onboarding. Split out of RepositoriesSection for its line cap.
 */
export const RepositoriesEmptyState = (
  props: RepositoriesEmptyStateProps,
): React.ReactElement => {
  const { actionError, discoveredFolders, pickerCapabilities } = props;

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
        pickerCapabilities={pickerCapabilities}
      />
      <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
    </>
  );
};
