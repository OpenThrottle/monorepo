import * as React from 'react';
import { Form } from 'react-router';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, FolderIcon } from 'lucide-react';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceBrowseEntry } from '~/routing/settings/repositories/hooks/useAddFolderDialog';

export interface BrowseEntryRowProps {
  entry: WorkspaceBrowseEntry;
  isAdding: boolean;
  onOpen: (path: string) => void;
}

/**
 * @description One subdirectory row in the in-app picker: a folder button that
 * opens the directory, git-repo / already-registered badges, and an Add submit
 * (suppressed when already registered). Split out of the picker per
 * component-primitive-shape R6.
 */
export const BrowseEntryRow = (
  props: BrowseEntryRowProps,
): React.ReactElement => {
  const { entry, isAdding, onOpen } = props;

  // Hooks

  // Setup
  const Icon = entry.isGitRepo ? FolderGit2Icon : FolderIcon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
      <button
        className="flex min-w-0 items-center gap-2 text-left text-sm"
        onClick={() => onOpen(entry.path)}
        type="button"
      >
        <Icon aria-hidden={true} className="size-4 shrink-0" />
        <span className="truncate">{entry.name}</span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {entry.isGitRepo ? (
          <Badge variant="outline">{WORKSPACE_FOLDERS_COPY.gitRepoBadge}</Badge>
        ) : null}
        {entry.alreadyRegistered ? (
          <Badge variant="secondary">
            {WORKSPACE_FOLDERS_COPY.alreadyRegisteredBadge}
          </Badge>
        ) : (
          <Form method="post">
            <input name="intent" type="hidden" value="addFolder" />
            <input name="path" type="hidden" value={entry.path} />
            <Button
              disabled={isAdding}
              size="sm"
              type="submit"
              variant="outline"
            >
              {isAdding
                ? WORKSPACE_FOLDERS_COPY.addingLabel
                : WORKSPACE_FOLDERS_COPY.addEntryButton}
            </Button>
          </Form>
        )}
      </div>
    </li>
  );
};
