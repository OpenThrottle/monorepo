import * as React from 'react';
import { useFetcher, useNavigation, useSubmit } from 'react-router';

/** A single directory entry returned by the enriched `browseDirectory`. */
export interface WorkspaceBrowseEntry {
  alreadyRegistered: boolean;
  isGitRepo: boolean;
  name: string;
  path: string;
}

/** The rich listing payload the `browseDirectory` action returns. */
export interface WorkspaceBrowseListing {
  entries: WorkspaceBrowseEntry[];
  isGitRepo: boolean;
  parentPath: string | null;
  path: string | null;
}

/** One clickable breadcrumb segment for the current path. */
export interface WorkspaceBreadcrumbSegment {
  label: string;
  navigable: boolean;
  path: string;
}

export interface AddFolderDialogOptions {
  /**
   * The latest add-folder action error, threaded from the route. Used to keep
   * the dialog open on a failed add while auto-closing it on success.
   */
  actionError?: string | null;
  canUseNativeDialog: boolean;
  defaultBrowsePath: string;
  roots: string[];
}

export interface UseAddFolderDialogResult {
  breadcrumbs: WorkspaceBreadcrumbSegment[];
  browseError: string | null;
  canUseNativeDialog: boolean;
  currentIsGitRepo: boolean;
  currentPath: string | null;
  entries: WorkspaceBrowseEntry[];
  handleAddCurrent: () => void;
  handleBrowse: (path?: string | null) => void;
  handleClearPickedPath: () => void;
  handleNavigateTo: (path: string) => void;
  handleOpen: (entryPath: string) => void;
  handlePickNative: () => void;
  handleToggleManualPath: () => void;
  handleUp: () => void;
  hasListing: boolean;
  isAdding: boolean;
  isBrowsing: boolean;
  isPicking: boolean;
  open: boolean;
  parentPath: string | null;
  pickError: string | null;
  pickedPath: string | null;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showManualPath: boolean;
}

/** Cumulative POSIX breadcrumb segments, marking those still under a root. */
const buildBreadcrumbs = (
  path: string,
  roots: string[],
): WorkspaceBreadcrumbSegment[] => {
  const parts = path.split('/').filter((part) => part !== '');
  const isNavigable = (candidate: string): boolean =>
    roots.some(
      (root) => candidate === root || candidate.startsWith(`${root}/`),
    );

  let accumulated = '';
  return parts.map((part) => {
    accumulated = `${accumulated}/${part}`;
    return {
      label: part,
      navigable: isNavigable(accumulated),
      path: accumulated,
    };
  });
};

/**
 * @description Controller for the workspace add-folder picker: dialog open
 * state, the directory-browse fetcher (seeded from defaultBrowsePath on open,
 * with breadcrumb + up navigation), the native-dialog pick fetcher, and the
 * add-current / add-folder submit wiring. Presentation-free per
 * component-primitive-shape R6/R7 — the dialog component renders from this.
 */
export const useAddFolderDialog = (
  options: AddFolderDialogOptions,
): UseAddFolderDialogResult => {
  const { actionError, canUseNativeDialog, defaultBrowsePath, roots } = options;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const [showManualPath, setShowManualPath] = React.useState(false);
  const [pickDismissed, setPickDismissed] = React.useState(false);
  const seededRef = React.useRef(false);
  const wasAddingRef = React.useRef(false);
  const browseFetcher = useFetcher<{
    browse?: WorkspaceBrowseListing;
    error?: string;
  }>();
  const pickFetcher = useFetcher<{
    error?: string;
    picked?: { path: string };
  }>();
  const navigation = useNavigation();
  const submit = useSubmit();

  // Setup
  const listing = browseFetcher.data?.browse ?? null;
  const currentPath = listing?.path ?? null;
  const parentPath = listing?.parentPath ?? null;
  const entries = listing?.entries ?? [];
  const currentIsGitRepo = listing?.isGitRepo ?? false;
  const breadcrumbs =
    currentPath === null ? [] : buildBreadcrumbs(currentPath, roots);
  const isBrowsing = browseFetcher.state !== 'idle';
  const isPicking = pickFetcher.state !== 'idle';
  const isAdding =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'addFolder';
  const browseError = browseFetcher.data?.error ?? null;
  const pickError = pickFetcher.data?.error ?? null;
  const pickedPath = pickDismissed
    ? null
    : (pickFetcher.data?.picked?.path ?? null);

  // Handlers
  const handleBrowse = (path?: string | null): void => {
    browseFetcher.submit(
      { intent: 'browseDirectory', path: path ?? '' },
      { method: 'post' },
    );
  };

  const handleOpen = (entryPath: string): void => {
    handleBrowse(entryPath);
  };

  const handleUp = (): void => {
    handleBrowse(parentPath ?? '');
  };

  const handleNavigateTo = (path: string): void => {
    handleBrowse(path);
  };

  const handleAddCurrent = (): void => {
    if (currentPath === null) return;
    void submit({ intent: 'addFolder', path: currentPath }, { method: 'post' });
  };

  const handlePickNative = (): void => {
    setPickDismissed(false);
    pickFetcher.submit({ intent: 'pickFolderNative' }, { method: 'post' });
  };

  const handleClearPickedPath = (): void => {
    setPickDismissed(true);
  };

  const handleToggleManualPath = (): void => {
    setShowManualPath((current) => !current);
  };

  // Life Cycle
  // Seed the picker once per open with no typing (defaultBrowsePath, else roots).
  React.useEffect(() => {
    if (open && !seededRef.current) {
      seededRef.current = true;
      handleBrowse(defaultBrowsePath);
    }
    if (!open) {
      seededRef.current = false;
      setPickDismissed(false);
    }
    // handleBrowse is stable enough for a seed-on-open effect.
  }, [open, defaultBrowsePath]);

  // Close the dialog on the addFolder submit's true→false edge, but only on a
  // successful add — a failed add (actionError present) stays open so the error
  // remains visible. The result card renders on the page from loader data, so
  // closing here never wipes it.
  React.useEffect(() => {
    if (wasAddingRef.current && !isAdding && actionError == null) {
      setOpen(false);
    }
    wasAddingRef.current = isAdding;
  }, [actionError, isAdding]);

  // 🔌 Short Circuit

  return {
    breadcrumbs,
    browseError,
    canUseNativeDialog,
    currentIsGitRepo,
    currentPath,
    entries,
    handleAddCurrent,
    handleBrowse,
    handleClearPickedPath,
    handleNavigateTo,
    handleOpen,
    handlePickNative,
    handleToggleManualPath,
    handleUp,
    hasListing: listing !== null,
    isAdding,
    isBrowsing,
    isPicking,
    open,
    parentPath,
    pickError,
    pickedPath,
    setOpen,
    showManualPath,
  };
};
