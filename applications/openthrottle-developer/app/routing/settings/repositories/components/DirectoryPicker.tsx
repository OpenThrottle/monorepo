import { Badge, Button } from '@openthrottle/react-router-shadcn';
import {
  ChevronRightIcon,
  CornerLeftUpIcon,
  FolderGit2Icon,
  HardDriveIcon,
} from 'lucide-react';
import * as React from 'react';

import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { BrowseEntryRow } from '~/routing/settings/repositories/components/BrowseEntryRow';
import type {
  WorkspaceBreadcrumbSegment,
  WorkspaceBrowseEntry,
} from '~/routing/settings/repositories/types';
import { deriveBrowseListState } from '~/routing/settings/repositories/utils/deriveBrowseListState';

export interface DirectoryPickerProps {
  breadcrumbs: WorkspaceBreadcrumbSegment[];
  browseError: string | null;
  currentIsGitRepo: boolean;
  currentPath: string | null;
  entries: WorkspaceBrowseEntry[];
  isAdding: boolean;
  isBrowsing: boolean;
  onAddCurrent: () => void;
  onBrowseRoots: () => void;
  onNavigateTo: (path: string) => void;
  onOpen: (path: string) => void;
  onUp: () => void;
  parentPath: string | null;
}

/**
 * @description The in-app server-side directory picker: a breadcrumb of the
 * current path (clickable within the roots), an Up control, an "add this
 * folder" action for the current directory, and the annotated subdirectory
 * list. Presentation for the useAddFolderDialog controller.
 */
export const DirectoryPicker = (
  props: DirectoryPickerProps,
): React.ReactElement => {
  const {
    breadcrumbs,
    browseError,
    currentIsGitRepo,
    currentPath,
    entries,
    isAdding,
    isBrowsing,
    onAddCurrent,
    onBrowseRoots,
    onNavigateTo,
    onOpen,
    onUp,
    parentPath,
  } = props;

  // Hooks

  // Setup
  const listState = deriveBrowseListState({
    browseError,
    entryCount: entries.length,
    isBrowsing,
  });

  // Handlers
  const renderCrumbLabel = (
    segment: WorkspaceBreadcrumbSegment,
  ): React.ReactElement => {
    if (segment.navigable) {
      return (
        <button
          className="hover:text-foreground truncate"
          onClick={() => onNavigateTo(segment.path)}
          type="button"
        >
          {segment.label}
        </button>
      );
    }

    return (
      <span className="text-muted-foreground truncate">{segment.label}</span>
    );
  };

  // Markup
  const gitRepoBadge = (
    <Badge variant="outline">
      <FolderGit2Icon aria-hidden={true} className="mr-1 size-3" />
      {WORKSPACE_FOLDERS_COPY.gitRepoBadge}
    </Badge>
  );
  const currentPathBar = (
    <div className="flex items-center justify-between gap-2 border-b pb-2">
      <p className="text-muted-foreground min-w-0 truncate font-mono text-xs">
        {currentPath}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {currentIsGitRepo ? gitRepoBadge : null}
        <Button
          disabled={isAdding}
          onClick={onAddCurrent}
          size="sm"
          type="button"
        >
          {WORKSPACE_FOLDERS_COPY.addThisFolder}
        </Button>
      </div>
    </div>
  );
  const listBodies = {
    empty: (
      <p className="text-muted-foreground text-sm">
        {WORKSPACE_FOLDERS_COPY.browseEmpty}
      </p>
    ),
    entries: (
      <ul className="max-h-56 space-y-0.5 overflow-y-auto">
        {entries.map((entry) => (
          <BrowseEntryRow
            entry={entry}
            isAdding={isAdding}
            key={entry.path}
            onOpen={onOpen}
          />
        ))}
      </ul>
    ),
    error: (
      <p className="text-destructive text-sm" role="alert">
        {browseError}
      </p>
    ),
    loading: (
      <p className="text-muted-foreground text-sm">
        {WORKSPACE_FOLDERS_COPY.pickerLoading}
      </p>
    ),
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="space-y-2 rounded-md border p-3"
      data-testid="DirectoryPicker"
    >
      <div className="flex items-center gap-1">
        <nav
          aria-label={WORKSPACE_FOLDERS_COPY.breadcrumbAriaLabel}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-xs"
        >
          <button
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={onBrowseRoots}
            type="button"
          >
            <HardDriveIcon aria-hidden={true} className="size-3.5" />
            {WORKSPACE_FOLDERS_COPY.browseRootsLabel}
          </button>
          {breadcrumbs.map((segment) => (
            <span className="flex items-center gap-0.5" key={segment.path}>
              <ChevronRightIcon
                aria-hidden={true}
                className="text-muted-foreground size-3"
              />
              {renderCrumbLabel(segment)}
            </span>
          ))}
        </nav>
        <Button
          aria-label={WORKSPACE_FOLDERS_COPY.upLabel}
          disabled={parentPath === null && currentPath === null}
          onClick={onUp}
          size="sm"
          type="button"
          variant="ghost"
        >
          <CornerLeftUpIcon aria-hidden={true} className="size-4" />
          {WORKSPACE_FOLDERS_COPY.upLabel}
        </Button>
      </div>

      {currentPath ? currentPathBar : null}

      {listBodies[listState]}
    </div>
  );
};
