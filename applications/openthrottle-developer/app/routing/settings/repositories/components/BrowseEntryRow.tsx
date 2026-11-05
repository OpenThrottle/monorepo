import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, FolderIcon } from 'lucide-react';
import * as React from 'react';
import { Form } from 'react-router';

import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceBrowseEntry } from '~/routing/settings/repositories/types';

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
  const { addEntryButton, addingLabel, alreadyRegisteredBadge, gitRepoBadge } =
    WORKSPACE_FOLDERS_COPY;
  const addLabel = isAdding ? addingLabel : addEntryButton;

  // Handlers

  // Markup
  const gitBadge = <Badge variant="outline">{gitRepoBadge}</Badge>;
  const registeredBadge = (
    <Badge variant="secondary">{alreadyRegisteredBadge}</Badge>
  );
  const addForm = (
    <Form method="post">
      <input name="intent" type="hidden" value="addFolder" />
      <input name="path" type="hidden" value={entry.path} />
      <Button disabled={isAdding} size="sm" type="submit" variant="outline">
        {addLabel}
      </Button>
    </Form>
  );

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
        {entry.isGitRepo ? gitBadge : null}
        {entry.alreadyRegistered ? registeredBadge : addForm}
      </div>
    </li>
  );
};
