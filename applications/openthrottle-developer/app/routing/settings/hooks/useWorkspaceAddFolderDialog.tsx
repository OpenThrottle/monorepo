import * as React from 'react';
import { useFetcher, useNavigation } from 'react-router';

/** A single directory entry returned by the `browseDirectory` action intent. */
export interface WorkspaceBrowseEntry {
  name: string;
  path: string;
}

export interface WorkspaceAddFolderDialogOptions {}

export interface UseWorkspaceAddFolderDialogResult {
  browseEntries: WorkspaceBrowseEntry[] | null;
  browseFetcher: ReturnType<
    typeof useFetcher<{
      browse?: { entries: WorkspaceBrowseEntry[]; path: string };
    }>
  >;
  browsePath: string | null;
  handleBrowse: (path: string) => void;
  handleBrowseSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  handleToggleManualPath: () => void;
  isAdding: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showManualPath: boolean;
}

/**
 * @description Dialog open state, directory-browse fetcher wiring, and submit
 * handlers for the workspace add-folder dialog. Extracted from
 * WorkspaceAddFolderDialog per component-primitive-shape R6/R7.
 */
export const useWorkspaceAddFolderDialog = (
  _options: WorkspaceAddFolderDialogOptions = {},
): UseWorkspaceAddFolderDialogResult => {
  // Hooks
  const [open, setOpen] = React.useState(false);
  const [showManualPath, setShowManualPath] = React.useState(false);
  const browseFetcher = useFetcher<{
    browse?: { entries: WorkspaceBrowseEntry[]; path: string };
  }>();
  const navigation = useNavigation();

  // Setup
  const isAdding =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'addFolder';
  const browseEntries = browseFetcher.data?.browse?.entries ?? null;
  const browsePath = browseFetcher.data?.browse?.path ?? null;

  // Handlers
  const handleBrowse = (path: string): void => {
    browseFetcher.submit(
      { intent: 'browseDirectory', path },
      { method: 'post' },
    );
  };

  const handleBrowseSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('path');
    if (typeof value === 'string' && value.trim() !== '') {
      handleBrowse(value.trim());
    }
  };

  const handleToggleManualPath = (): void => {
    setShowManualPath((current) => !current);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    browseEntries,
    browseFetcher,
    browsePath,
    handleBrowse,
    handleBrowseSubmit,
    handleToggleManualPath,
    isAdding,
    open,
    setOpen,
    showManualPath,
  };
};
